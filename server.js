const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { HfInference } = require('@huggingface/inference');
const { ChromaClient } = require('chromadb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize services
const hf = new HfInference(process.env.HF_API_KEY);
const chroma = new ChromaClient();
const jobPostings = require('./jobPostings');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Initialize collections
const collectionName = "job_postings";
const collectionName2 = "job_collection";

// Utility functions
const generateEmbeddings = async (text) => {
  try {
    const result = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: text,
    });
    return result;
  } catch (err) {
    console.error("Error converting text to embeddings:", err);
    throw err;
  }
};

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text.replace(/\n/g, " ").replace(/ +/g, " ");
    return text;
  } catch (err) {
    console.error("Error extracting text from PDF:", err);
    throw err;
  }
};

const classifyText = async (text, labels) => {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/facebook/bart-large-mnli`,
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: text,
        parameters: {
          candidate_labels: labels,
        },
      }),
    }
  );
  return await response.json();
};

// API Routes

// Get all job postings
app.get('/api/jobs', (req, res) => {
  res.json(jobPostings);
});

// System 1: PDF-based job recommendation
app.post('/api/recommendations/pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Extract text from PDF
    const text = await extractTextFromPDF(req.file.path);
    
    // Generate embedding for the resume
    const resumeEmbedding = await generateEmbeddings(text);
    
    // Query Chroma DB for similar job postings
    const collection = await chroma.getCollection({ name: collectionName });
    const results = await collection.query({
      queryEmbeddings: [resumeEmbedding],
      nResults: 5,
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (results.ids.length > 0 && results.ids[0].length > 0) {
      const recommendations = results.ids[0].map((id, index) => {
        const job = jobPostings[parseInt(id)];
        return {
          id: job.jobId,
          jobTitle: job.jobTitle,
          company: job.company,
          location: job.location,
          jobType: job.jobType,
          salary: job.salary,
          jobDescription: job.jobDescription,
          score: results.distances[0][index]
        };
      });
      
      res.json({ recommendations, resumeText: text });
    } else {
      res.json({ recommendations: [], resumeText: text });
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Error processing PDF' });
  }
});

// System 2: Text-based job recommendation with filtering
app.post('/api/recommendations/text', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Extract filter criteria
    const labels = ["location", "job title", "company", "job type"];
    const classificationResult = await classifyText(query, labels);
    
    const filterCriteria = {
      location: null,
      jobTitle: null,
      jobType: null,
      company: null
    };

    if (classificationResult.scores[0] > 0.5) {
      const highestScoreLabel = classificationResult.labels[0];
      const words = query.split(" ");
      
      switch (highestScoreLabel) {
        case "location":
          filterCriteria.location = words;
          break;
        case "job title":
          filterCriteria.jobTitle = words;
          break;
        case "company":
          filterCriteria.company = words;
          break;
        case "job type":
          filterCriteria.jobType = words;
          break;
      }
    }

    // Perform similarity search
    const collection = await chroma.getCollection({ name: collectionName2 });
    const queryEmbedding = await generateEmbeddings([query]);
    
    const results = await collection.query({
      queryEmbeddings: queryEmbedding,
      nResults: 5,
    });

    if (results.ids.length > 0 && results.ids[0].length > 0) {
      const recommendations = results.ids[0].map((id, index) => {
        const job = jobPostings.find(item => item.jobId.toString() === id);
        return {
          id: job.jobId,
          jobTitle: job.jobTitle,
          company: job.company,
          location: job.location,
          jobType: job.jobType,
          salary: job.salary,
          jobDescription: job.jobDescription,
          score: results.distances[0][index]
        };
      }).filter(Boolean);
      
      res.json({ 
        recommendations: recommendations.sort((a, b) => a.score - b.score),
        filterCriteria 
      });
    } else {
      res.json({ recommendations: [], filterCriteria });
    }
  } catch (error) {
    console.error('Error processing text query:', error);
    res.status(500).json({ error: 'Error processing query' });
  }
});

// Initialize collections on startup
app.get('/api/init', async (req, res) => {
  try {
    // Initialize System 1 collection
    const collection1 = await chroma.getOrCreateCollection({ name: collectionName });
    const jobEmbeddings = [];
    const metadatas = jobPostings.map(() => ({}));

    for (const job of jobPostings) {
      const embedding = await generateEmbeddings(job.jobDescription.toLowerCase());
      jobEmbeddings.push(embedding);
    }

    await collection1.add({
      ids: jobPostings.map((_, index) => index.toString()),
      documents: jobPostings.map(job => job.jobTitle),
      embeddings: jobEmbeddings,
      metadatas: metadatas,
    });

    // Initialize System 2 collection
    const collection2 = await chroma.getOrCreateCollection({ name: collectionName2 });
    const uniqueIds = new Set();
    jobPostings.forEach((job, index) => {
      while (uniqueIds.has(job.jobId.toString())) {
        job.jobId = `${job.jobId}_${index}`;
      }
      uniqueIds.add(job.jobId.toString());
    });

    const jobTexts = jobPostings.map((job) => 
      `${job.jobTitle}. ${job.jobDescription}. ${job.jobType}. ${job.location}`
    );
    const embeddingsData = await generateEmbeddings(jobTexts);
    
    await collection2.add({
      ids: jobPostings.map((job) => job.jobId.toString()),
      documents: jobTexts,
      embeddings: embeddingsData,
    });

    res.json({ message: 'Collections initialized successfully' });
  } catch (error) {
    console.error('Error initializing collections:', error);
    res.status(500).json({ error: 'Error initializing collections' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 