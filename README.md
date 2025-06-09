# Job Recommendation System

## Introduction

This project implements a job recommendation system leveraging text embeddings and similarity search. It utilizes Hugging Face's HfInference for generating text embeddings and a vector database for storing and querying these embeddings. The system provides job recommendations based on user queries, such as specific job titles or locations.

Additionally, the system allows candidates to upload their resumes in PDF format. It extracts relevant information from the resume, generates embeddings based on skills and experience, and finds matching job postings from the database to provide personalized recommendations.

## Features

*   Generate text embeddings using Hugging Face models.
*   Store and query vector embeddings in a database.
*   Recommend job postings based on text queries.
*   Extract text from PDF resumes.
*   Provide job recommendations based on resume content.

## Learning Objectives (for developers)

This project can serve as a learning resource for understanding:

*   Developing recommendation systems with vector databases and embedding models.
*   Using pretrained NLP models for tasks like feature extraction and similarity search.
*   Implementing recommendation algorithms based on vector similarity.
*   Handling PDF document processing for text extraction.

## Prerequisites

*   Node.js and npm installed.
*   Basic understanding of Hugging Face tools.
*   Intermediate knowledge of databases that store vector data.

## Setup and Usage

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd jobRecommendationSystem
    ```
    (Replace `<repository_url>` with the actual repository URL if this project is hosted on GitHub).

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the `jobRecommendationSystem` directory with your Hugging Face API key:
    ```
    HF_API_KEY=your_hugging_face_api_key
    ```
    Replace `your_hugging_face_api_key` with your actual API key.

4.  **Run the application:**
    ```bash
    npm start
    ```
    The application will load the job postings, store embeddings in the Chroma DB, and then prompt you to enter the path to a resume PDF. After processing the PDF, it will display recommended job postings based on the resume content.
