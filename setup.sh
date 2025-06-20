#!/bin/bash
# setup.sh - Quick setup script for the job recommendation system

echo "🚀 Setting up Job Recommendation System with Docker..."

# Create project structure
echo "📁 Creating project structure..."
mkdir -p uploads public init-db

# Create .gitkeep for uploads
touch uploads/.gitkeep

# Create package.json
echo "📦 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "job-recommendation-system",
  "version": "1.0.0",
  "description": "AI-powered job recommendation system with PDF resume analysis",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "init-db": "curl http://localhost:3000/api/init",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:clean": "docker-compose down -v --remove-orphans"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "pdf-parse": "^1.1.1",
    "@huggingface/inference": "^2.6.4",
    "pg": "^8.11.3",
    "pgvector": "^0.1.8",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": ["job", "recommendation", "ai", "ml", "pdf", "resume"],
  "author": "Your Name",
  "license": "MIT"
}
EOF

# Create .env.example
echo "🔐 Creating .env.example..."
cat > .env.example << 'EOF'
# Copy this to .env and fill in your values
HF_API_KEY=your_huggingface_api_key_here
NODE_ENV=development

# Database settings (these match docker-compose.yml)
PGUSER=jobuser
PGPASSWORD=jobpassword
PGHOST=postgres
PGDATABASE=job_recommendations
PGPORT=5432
EOF

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file (you need to add your HF_API_KEY)..."
    cp .env.example .env
fi

# Create docker-compose.yml
echo "🐳 Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL with pgvector extension
  postgres:
    image: pgvector/pgvector:pg16
    container_name: job_recommendation_db
    environment:
      POSTGRES_DB: job_recommendations
      POSTGRES_USER: jobuser
      POSTGRES_PASSWORD: jobpassword
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jobuser -d job_recommendations"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - job_network

  # Node.js Application
  app:
    build: .
    container_name: job_recommendation_app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - PGUSER=jobuser
      - PGPASSWORD=jobpassword
      - PGHOST=postgres
      - PGDATABASE=job_recommendations
      - PGPORT=5432
      - HF_API_KEY=${HF_API_KEY}
    volumes:
      - ./uploads:/app/uploads
      - ./public:/app/public
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - job_network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  job_network:
    driver: bridge
EOF

# Create Dockerfile
echo "🐳 Creating Dockerfile..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
EOF

# Create .dockerignore
echo "🚫 Creating .dockerignore..."
cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
.dockerignore
uploads/*
!uploads/.gitkeep
*.log
.nyc_output
coverage
.DS_Store
EOF

# Create database initialization script
echo "🗄️ Creating database initialization..."
cat > init-db/01-init.sql << 'EOF'
-- Initialize database with vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create job_postings table
CREATE TABLE IF NOT EXISTS job_postings (
  id SERIAL PRIMARY KEY,
  jobtitle TEXT NOT NULL,
  jobdescription TEXT,
  jobtype TEXT,
  location TEXT,
  company TEXT,
  embedding VECTOR(384),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_postings_embedding ON job_postings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON job_postings(location);
CREATE INDEX IF NOT EXISTS idx_job_postings_jobtype ON job_postings(jobtype);
CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_job_postings_updated_at 
    BEFORE UPDATE ON job_postings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
EOF

# Create basic jobPostings.js file
echo "💼 Creating sample job postings..."
cat > jobPostings.js << 'EOF'
// Sample job postings data
module.exports = [
  {
    id: 1,
    jobTitle: "Senior Software Engineer",
    company: "TechCorp Inc",
    location: "San Francisco, CA",
    jobType: "Full-time",
    jobDescription: "We are looking for a Senior Software Engineer to join our dynamic team. You will be responsible for designing, developing, and maintaining scalable web applications using modern technologies like React, Node.js, and PostgreSQL."
  },
  {
    id: 2,
    jobTitle: "Data Scientist",
    company: "DataVision",
    location: "New York, NY",
    jobType: "Full-time",
    jobDescription: "Join our data science team to work on cutting-edge machine learning projects. Experience with Python, TensorFlow, and statistical analysis required. You'll be working on predictive models and data visualization."
  },
  {
    id: 3,
    jobTitle: "Frontend Developer",
    company: "WebSolutions",
    location: "Austin, TX",
    jobType: "Contract",
    jobDescription: "Looking for a skilled Frontend Developer with expertise in React, Vue.js, and modern CSS frameworks. You'll be creating responsive web applications and collaborating with our design team."
  },
  {
    id: 4,
    jobTitle: "DevOps Engineer",
    company: "CloudFirst",
    location: "Seattle, WA",
    jobType: "Full-time",
    jobDescription: "We need a DevOps Engineer to manage our cloud infrastructure on AWS. Experience with Docker, Kubernetes, and CI/CD pipelines essential. You'll be working on automation and deployment strategies."
  },
  {
    id: 5,
    jobTitle: "Product Manager",
    company: "InnovateLab",
    location: "Remote",
    jobType: "Full-time",
    jobDescription: "Seeking an experienced Product Manager to lead our product development initiatives. You'll work closely with engineering and design teams to define product roadmaps and deliver user-centric solutions."
  }
];
EOF

# Generate package-lock.json
echo "🔒 Generating package-lock.json..."
npm install --package-lock-only

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Hugging Face API key to .env file"
echo "2. Make sure you have your server.js file"
echo "3. Run: docker-compose up --build -d"
echo "4. Wait 30 seconds, then run: curl http://localhost:3000/api/init"
echo ""
echo "Your application will be available at: http://localhost:3000"