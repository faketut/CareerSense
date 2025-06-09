const fs = require("fs");
const pdf = require("pdf-parse");
const { HfInference } = require("@huggingface/inference");
const readline = require("readline");
const { ChromaClient } = require("chromadb");
require('dotenv').config();

// Initialize the Hugging Face inference client. Be sure to use your own API key.
const hf = new HfInference(process.env.HF_API_KEY);
// Initialize Chroma DB
const chroma = new ChromaClient();
const collectionName = "job_postings";

// Load the food dataset (Assuming 'FoodDataSet.js' exists)
const jobPostings = require('./jobPostings');

// ASSUMPTION extractFromPDF() and extractTextFromPDF() are suppose to be the same thing?
// Part 2 Task 4-B extractFromPDF()
// no other mention of extractFromPDF() in instructions
// Part 3 Task 3-A extractTextFromPDF()
// Function to extract text from a PDF file
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

// Part 2 Task 3-B
// Function to convert text to embeddings using Hugging Face embeddings
const generateEmbeddings = async (text) => {
    try {
      const result = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: text,
      });
      // console.log("Embedding API result:", result); // Log the entire result
  return result
    } catch (err) {
      console.error("Error converting text to embeddings:", err);
      throw err;
    }
  };

// Part 2 Task 4-A
// Function to read user input
const promptUserInput = (query) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) =>
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
      })
    );
  };






// Part 2 Task 5
// Function to store embeddings in Chroma DB
const storeEmbeddings = async (pJobPostings) => {
  const jobEmbeddings = [];
  const metadatas = jobPostings.map(() => ({})); // Empty metadata objects

  for (const job of jobPostings) {
    const embedding = await generateEmbeddings(job.jobDescription.toLowerCase());
    jobEmbeddings.push(embedding);
    // console.log(job.jobDescription);
  }
  const ids = jobPostings.map((_, index) => index.toString());
  //console.log("ids: ",ids);
  const jobTexts = jobPostings.map(job => job.jobTitle);
  //console.log("jobTexts: ",jobTexts);
  try {
    const collection = await chroma.getOrCreateCollection({ name: collectionName });

    await collection.add({
      ids: ids,
      documents: jobTexts,
      embeddings: jobEmbeddings,
      metadatas: metadatas,
    });
    console.log("Stored embeddings in Chroma DB.");
  } catch (error) {
    console.error("Error storing embeddings in Chroma DB:", error);
    throw error;
  }
};

// Main function to run the extraction, embedding generation, and job recommendation process
const main = async () => {
    try {
      await storeEmbeddings(jobPostings);

      // Extract and process the recipe PDF
      const filePath = await promptUserInput("Enter the path to the recipe PDF: ");
      const text = await extractTextFromPDF(filePath);

      // Generate embedding for the extracted TODOingredients
      const resumeEmbedding = await generateEmbeddings(text);

      // Query Chroma DB for similar job postings
      const collection = await chroma.getCollection({ name: collectionName });
      const results = await collection.query({
        queryEmbeddings: [resumeEmbedding],
        nResults: 5, // Get top 5 similar items
      });

      //console.log("Chroma DB Query Results:", results);

      if (results.ids.length > 0 && results.ids[0].length > 0) {
        console.log("Recommended Jobs:");
        results.ids[0].forEach((id, index) => {
          const recommendedItem = jobPostings[parseInt(id)];
          console.log(`Top ${index + 1} Recommended Job ==> ${recommendedItem.jobTitle}`);
        });
      } else {
        console.log("No similar jobs found.");
      }
    } catch (err) {
      console.error("An error occurred:", err);
    }
  };


// Run the main function
main();
