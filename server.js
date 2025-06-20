const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { HfInference } = require('@huggingface/inference');
const { Client } = require('pg');
const pgvector = require('pgvector/pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize services
const hf = new HfInference(process.env.HF_API_KEY);
const client = new Client({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});
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

// Database connection management
const connectDB = async () => {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
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
    
    // Convert embedding to pgvector format
    const embeddingVector = pgvector.toSql(resumeEmbedding);

    // Query PostgreSQL for similar job postings using cosine distance
    const searchQuery = `
      SELECT id, jobtitle, company, location, jobtype, jobdescription, 
             embedding <=> $1 AS distance
      FROM job_postings
      ORDER BY embedding <=> $1
      LIMIT 5;
    `;
    
    const { rows } = await client.query(searchQuery, [embeddingVector]);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    const recommendations = rows.map(row => ({
      id: row.id,
      jobTitle: row.jobtitle,
      company: row.company,
      location: row.location,
      jobType: row.jobtype,
      jobDescription: row.jobdescription,
      score: parseFloat(row.distance)
    }));

    res.json({ recommendations, resumeText: text });

  } catch (error) {
    console.error('Error processing PDF:', error);
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

    if (classificationResult.scores && classificationResult.scores[0] > 0.5) {
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

    // Generate embedding for the query
    const queryEmbedding = await generateEmbeddings(query);
    const embeddingVector = pgvector.toSql(queryEmbedding);

    // Build dynamic query with proper parameterization
    let searchQuery = `
      SELECT id, jobtitle, company, location, jobtype, jobdescription,
             embedding <=> $1 AS distance
      FROM job_postings
    `;
    
    const queryParams = [embeddingVector];
    const conditions = [];
    let paramIndex = 2;

    // Add filtering conditions with proper parameterization
    if (filterCriteria.location && filterCriteria.location.length > 0) {
      const locationConditions = filterCriteria.location.map(() => `$${paramIndex++}`);
      conditions.push(`location ILIKE ANY(ARRAY[${locationConditions.join(', ')}])`);
      filterCriteria.location.forEach(loc => queryParams.push(`%${loc}%`));
    }
    
    if (filterCriteria.jobTitle && filterCriteria.jobTitle.length > 0) {
      const titleConditions = filterCriteria.jobTitle.map(() => `$${paramIndex++}`);
      conditions.push(`jobtitle ILIKE ANY(ARRAY[${titleConditions.join(', ')}])`);
      filterCriteria.jobTitle.forEach(title => queryParams.push(`%${title}%`));
    }
    
    if (filterCriteria.company && filterCriteria.company.length > 0) {
      const companyConditions = filterCriteria.company.map(() => `$${paramIndex++}`);
      conditions.push(`company ILIKE ANY(ARRAY[${companyConditions.join(', ')}])`);
      filterCriteria.company.forEach(comp => queryParams.push(`%${comp}%`));
    }
    
    if (filterCriteria.jobType && filterCriteria.jobType.length > 0) {
      const typeConditions = filterCriteria.jobType.map(() => `$${paramIndex++}`);
      conditions.push(`jobtype ILIKE ANY(ARRAY[${typeConditions.join(', ')}])`);
      filterCriteria.jobType.forEach(type => queryParams.push(`%${type}%`));
    }

    if (conditions.length > 0) {
      searchQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    searchQuery += `
      ORDER BY embedding <=> $1
      LIMIT 5;
    `;

    const { rows } = await client.query(searchQuery, queryParams);

    const recommendations = rows.map(row => ({
      id: row.id,
      jobTitle: row.jobtitle,
      company: row.company,
      location: row.location,
      jobType: row.jobtype,
      jobDescription: row.jobdescription,
      score: parseFloat(row.distance)
    }));

    res.json({
      recommendations,
      filterCriteria
    });

  } catch (error) {
    console.error('Error processing text query:', error);
    res.status(500).json({ error: 'Error processing query' });
  }
});

// Initialize database and load data on startup
app.get('/api/init', async (req, res) => {
  try {
    // Create vector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Create table with proper column names (lowercase)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS job_postings (
        id SERIAL PRIMARY KEY,
        jobtitle TEXT,
        jobdescription TEXT,
        jobtype TEXT,
        location TEXT,
        company TEXT,
        embedding VECTOR(384)
      );
    `;
    await client.query(createTableQuery);

    // Check if data already exists to avoid duplicates
    const countResult = await client.query('SELECT COUNT(*) FROM job_postings;');
    const rowCount = parseInt(countResult.rows[0].count, 10);

    if (rowCount === 0) {
      console.log('Inserting job postings into database...');
      
      const insertQuery = `
        INSERT INTO job_postings (jobtitle, jobdescription, jobtype, location, company, embedding)
        VALUES ($1, $2, $3, $4, $5, $6)`;

      for (const job of jobPostings) {
        try {
          const text = `${job.jobTitle}. ${job.jobDescription}. ${job.jobType}. ${job.location}`;
          const embedding = await generateEmbeddings(text);
          const embeddingVector = pgvector.toSql(embedding);
          
          await client.query(insertQuery, [
            job.jobTitle,
            job.jobDescription,
            job.jobType,
            job.location,
            job.company,
            embeddingVector,
          ]);
          
          console.log(`Inserted job: ${job.jobTitle}`);
        } catch (err) {
          console.error(`Error inserting job ${job.jobTitle}:`, err);
        }
      }
      console.log('Job postings insertion completed.');
    } else {
      console.log('Job postings table already contains data. Skipping insertion.');
    }

    res.json({ 
      message: 'Database initialized and data loaded successfully',
      jobCount: rowCount === 0 ? jobPostings.length : rowCount
    });
    
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({ error: 'Error initializing database', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await client.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database connection and start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Initialize database by visiting: http://localhost:3000/api/init');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await client.end();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error closing database connection:', err);
  }
  process.exit(0);
});

startServer();