# Job Recommendation System - Docker Setup

This guide will help you set up the complete job recommendation system using Docker, including PostgreSQL with pgvector extension.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed
- Hugging Face API key

## Quick Start

### 1. Clone and Setup

```bash
# Create project directory
mkdir job-recommendation-system
cd job-recommendation-system

# Create required directories
mkdir -p uploads public init-db

# Create .gitkeep for uploads directory
touch uploads/.gitkeep
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy from .env.example
cp .env.example .env

# Edit .env with your actual Hugging Face API key
HF_API_KEY=your_actual_huggingface_api_key_here
NODE_ENV=development
```

### 3. Start the System

```bash
# Build and start all services
docker-compose up --build -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database

Once the services are running, initialize the database:

```bash
# Wait for services to be fully ready (about 30 seconds)
sleep 30

# Initialize the database with job postings
curl http://localhost:3000/api/init

# Check health
curl http://localhost:3000/api/health
```

## Development Setup

For development with hot reload:

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up --build -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app
```

## Available Endpoints

- **Main Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Initialize DB**: http://localhost:3000/api/init
- **Get Jobs**: http://localhost:3000/api/jobs
- **PDF Recommendations**: POST http://localhost:3000/api/recommendations/pdf
- **Text Recommendations**: POST http://localhost:3000/api/recommendations/text

## Database Access

```bash
# Connect to PostgreSQL directly
docker exec -it job_recommendation_db psql -U jobuser -d job_recommendations

# View tables
\dt

# Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

# View job postings
SELECT id, jobtitle, company, location FROM job_postings LIMIT 5;
```

## Useful Commands

### Docker Management

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (complete reset)
docker-compose down -v

# View service logs
docker-compose logs app
docker-compose logs postgres

# Rebuild specific service
docker-compose build app
docker-compose up app

# Execute commands in running container
docker exec -it job_recommendation_app sh
```

### Database Management

```bash
# Backup database
docker exec job_recommendation_db pg_dump -U jobuser job_recommendations > backup.sql

# Restore database
docker exec -i job_recommendation_db psql -U jobuser job_recommendations < backup.sql

# Reset database
docker-compose down -v
docker-compose up -d
curl http://localhost:3000/api/init
```

## File Structure

```
job-recommendation-system/
├── docker-compose.yml          # Production setup
├── docker-compose.dev.yml      # Development setup
├── Dockerfile                  # Production image
├── Dockerfile.dev             # Development image
├── package.json               # Node.js dependencies
├── server.js                  # Main application file
├── jobPostings.js            # Sample job data
├── .env                      # Environment variables
├── .dockerignore             # Docker ignore file
├── init-db/
│   └── 01-init.sql           # Database initialization
├── public/
│   ├── index.html            # Frontend
│   ├── style.css             # Styles
│   └── script.js             # Frontend JavaScript
└── uploads/                  # PDF upload directory
    └── .gitkeep
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker status
docker --version
docker-compose --version

# Check if ports are available
netstat -tulpn | grep :3000
netstat -tulpn | grep :5432

# View detailed logs
docker-compose logs --tail=100
```

### Database Connection Issues

```bash
# Check if PostgreSQL is ready
docker exec job_recommendation_db pg_isready -U jobuser

# Test database connection
docker exec -it job_recommendation_db psql -U jobuser -d job_recommendations -c "SELECT version();"

# Check vector extension
docker exec -it job_recommendation_db psql -U jobuser -d job_recommendations -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Application Issues

```bash
# Check application logs
docker-compose logs app

# Restart application
docker-compose restart app

# Rebuild application
docker-compose build app
docker-compose up app
```

### Clean Restart

```bash
# Complete clean restart
docker-compose down -v --remove-orphans
docker system prune -f
docker-compose up --build -d
```

## Performance Optimization

For production use:

1. **Increase PostgreSQL shared_buffers**: Add to docker-compose.yml
   ```yaml
   postgres:
     command: postgres -c shared_buffers=256MB -c max_connections=200
   ```

2. **Use production Node.js image**: Already configured in main Dockerfile

3. **Enable PostgreSQL connection pooling**: Consider adding pgbouncer service

4. **Monitor resource usage**:
   ```bash
   docker stats
   ```

## Security Notes

- Change default passwords in production
- Use Docker secrets for sensitive data
- Enable SSL for PostgreSQL in production
- Implement rate limiting for API endpoints
- Validate and sanitize all inputs

## Next Steps

1. Add your actual job postings data to `jobPostings.js`
2. Customize the frontend in the `public/` directory
3. Add authentication if needed
4. Set up monitoring and logging
5. Configure backup strategies
6. Set up CI/CD pipeline

The system is now ready for development and testing!