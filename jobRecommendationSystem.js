const { ChromaClient } = require("chromadb");
const client = new ChromaClient();
require('dotenv').config();
const { HfInference } = require("@huggingface/inference");
const hf = new HfInference(process.env.HF_API_KEY);
const API_TOKEN = process.env.HF_API_KEY;

const jobPostings = require('./jobPostings.js');

// Part 1 Task 1-E1 create the collection
const collectionName = "job_collection";
require('dotenv').config();
// Part 1 Task 2-B2 Create function to generate embeddings
async function generateEmbeddings(texts) {
    const results = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: texts,
    });
    return results;
}

// Part 1 Task 3-A Extract criteria to filter the data
// This way does not work.
//   using .request say facebook/bart-large-mnli only supports zero-shot-classification
//   using .zero-shot-classification results in Output Type Error
async function classifyTextBROKEN(text, labels) {
    const response = await hf.zeroShotClassification({
        model: "facebook/bart-large-mnli",
        inputs: text,
        parameters: { candidate_labels: labels },
    });
    return response;
}

// This HTTP POST request does work.
async function classifyText(text, labels) {
    const response0 = await fetch(
      `https://api-inference.huggingface.co/models/facebook/bart-large-mnli`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
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

    const response = await response0.json();
    console.log("response:")
    console.log(response)
    return response;
}

// Part 1 Task 3-B Extract criteria to filter the data
async function extractFilterCriteria(query) {
    const criteria = { location: null, jobTitle: null, jobType: null, company: null };
    const labels = ["location", "job title", "company", "job type"];
    const words = query.split(" ");
    const result = await classifyText(query, labels);

    const highestJobScoreLabel = result.labels[0];
    const jobScore = result.scores[0];

    // Only apply diet criteria if the score is very high (e.g., > 0.8)
    if (jobScore > 0.5) {
        switch (highestScoreLabel) {
            case "location":
                criteria.location = words;
                break;
            case "job title":
                criteria.jobTitle = words;
                break;
            case "company":
                criteria.company = words;
                break;
            case "job type":
                criteria.jobType = words;
                break;
            default:
                console.warn("Unrecognized label:", highestScoreLabel);
        }
    }
    console.log('Extracted Filter Criteria:', criteria);
    return criteria;
}
// Part 1 Task 4 Create a function to perform the similarity search
//async function performSimilaritySearch(collection, queryTerm, filterCriteria) {
async function performSimilaritySearch(collection, queryTerm, pJobPostings) {
    try {
        const queryEmbedding = await generateEmbeddings([queryTerm]);
        //console.log(filterCriteria);
        const results = await collection.query({
            collection: collectionName,
            queryEmbeddings: queryEmbedding,
            n: 3,
        });
        if (!results || results.length === 0) {
            console.log(`No job items found similar to "${queryTerm}"`);
            return [];
        }
        let topJobPostings = results.ids[0].map((id, index) => {
            return {
                id,
                score: results.distances[0][index],
                jobTitle: pJobPostings.find(item => item.jobId.toString() === id).jobTitle,
                jobType: pJobPostings.find(item => item.jobId.toString() === id).jobType,
                jobDescription: pJobPostings.find(item => item.jobId.toString() === id).jobDescription,
                company: pJobPostings.find(item => item.jobId.toString() === id).company
            };
        }).filter(Boolean);
        return topJobPostings.sort((a, b) => a.score - b.score);
    } catch (error) {
        console.error("Error during similarity search:", error);
        return [];
    }
}
//
//TODO: filterJobPostings(jobPostings,filterCriteria) ???
// Part 1 Task4: A call to filterJobPostings() with two parameters jobPostings, filterCriteria
// Only single mention of this function in Task4 Final Project deliverable, no details specified
function filterJobPostings(pJobPostings, filterCriteria) {
    console.log('filterJobPostings Filter Criteria:', filterCriteria);
}


async function main() {
    const query ="Creative Studio";
    // Part 1 Task 1-E2 create the collection
    try {
        // Part 1 Task 1-E3 create the collection
        const collection = await client.getOrCreateCollection({ name: collectionName });
        // Part 1 Task 2-A create unique IDs
        const uniqueIds = new Set();
        jobPostings.forEach((job, index) => {
            while (uniqueIds.has(job.jobId.toString())) {
                job.jobId = `${job.jobId}_${index}`;
            }
            uniqueIds.add(job.jobId.toString());
        });

        // Part 1 Task 2-A2 proecss an array of jobPostings to generate embeddings
        const jobTexts = jobPostings.map((job) => `${job.jobTitle}. ${job.jobDescription}. ${job.jobType}. ${job.location}`);
        const embeddingsData = await generateEmbeddings(jobTexts);
        await collection.add({
            ids: jobPostings.map((job) => job.jobId.toString()),
            documents: jobTexts,
            embeddings: embeddingsData,
        });

        // Part 1 Task 3-B call the extractFilterCriteria
        const filterCriteria = await extractFilterCriteria(query);

        // Part 1 Task 4 Final project deliverable
        filterJobPostings(jobPostings, filterCriteria)

        // Part 1 Task 4.7
        const initialResults = await performSimilaritySearch(collection, query, jobPostings);
        // Part 1 Task 4.8
        initialResults.slice(0, 3).forEach((item, index) => {
            console.log(`Top ${index + 1} Recommended Job \n Title: ${item.jobTitle} \n Type: ${item.jobType} \n Description: ${item.jobDescription} \n Company: ${item.company}`);
        });
    } catch (error) {
        console.error("Error:", error);
    }
}
main();