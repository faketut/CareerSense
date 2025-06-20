# CareerSense - AI Job Recommendation System

A modern, AI-powered job recommendation system with two intelligent approaches to help users find their perfect career opportunities.

## 🌟 Features

### Two Recommendation Systems

1. **PDF Resume Analysis System**
   - Upload your resume in PDF format
   - AI extracts and analyzes your skills and experience
   - Provides personalized job recommendations based on your profile
   - Shows extracted resume text for verification

2. **Smart Text-Based Search System**
   - Natural language job search queries
   - AI understands context and preferences
   - Intelligent filtering by location, job title, company, or job type
   - Example queries: "Software developer in New York", "Remote marketing jobs"

### Modern Web Interface

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Beautiful UI**: Modern gradient design with smooth animations
- **Interactive Elements**: Drag-and-drop file upload, real-time search, modal job details
- **User-Friendly**: Intuitive navigation with tabbed interface

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Hugging Face API key

### Installation

1. **Clone or download the project**
   ```bash
   cd CareerSense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```
   HF_API_KEY=your_hugging_face_api_key_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
CareerSense/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML interface
│   ├── styles.css         # Modern CSS styling
│   └── script.js          # Frontend JavaScript
├── uploads/               # Temporary PDF uploads
├── server.js              # Express.js server
├── jobPostings.js         # Job database
├── smartRecommendationSystem.js  # Original PDF system
├── jobRecommendationSystem.js    # Original text system
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🔧 How It Works

### PDF Resume Analysis

1. **Upload**: Drag and drop or select your resume PDF
2. **Processing**: AI extracts text and generates embeddings
3. **Matching**: Compares your profile with job database using similarity search
4. **Results**: Shows top 5 matching jobs with relevance scores

### Text-Based Search

1. **Query**: Enter natural language search (e.g., "Software developer in San Francisco")
2. **Analysis**: AI classifies your query to understand preferences
3. **Filtering**: Applies intelligent filters based on detected criteria
4. **Matching**: Finds jobs using semantic similarity search
5. **Results**: Displays filtered and ranked job recommendations

## 🛠️ Technical Stack

### Backend
- **Node.js** with Express.js server
- **ChromaDB** for vector database and similarity search
- **Hugging Face Inference API** for embeddings and text classification
- **PDF-parse** for resume text extraction
- **Multer** for file upload handling

### Frontend
- **Vanilla JavaScript** for dynamic interactions
- **Modern CSS** with Flexbox and Grid
- **Font Awesome** icons
- **Google Fonts** (Inter) for typography
- **Responsive design** with mobile-first approach

### AI/ML Components
- **Sentence Transformers** (all-MiniLM-L6-v2) for text embeddings
- **Zero-shot Classification** (facebook/bart-large-mnli) for query understanding
- **Vector Similarity Search** for job matching

## 🎯 Usage Examples

### PDF Resume Analysis
1. Click on "PDF Resume Analysis" tab
2. Upload your resume PDF file
3. Click "Analyze Resume & Get Recommendations"
4. View extracted text and job recommendations
5. Click on any job to see detailed information

### Text-Based Search
1. Click on "Text-Based Search" tab
2. Enter your search query or click example tags
3. Click "Search" or press Enter
4. View detected criteria and job recommendations
5. Explore job details in the modal

### Example Queries
- "Software developer in New York"
- "Remote marketing specialist"
- "Data scientist at Google"
- "Full-time project manager"
- "UX designer in Austin"

## 🔍 API Endpoints

### GET `/api/jobs`
Returns all available job postings

### POST `/api/recommendations/pdf`
Upload PDF resume and get job recommendations
- **Body**: FormData with PDF file
- **Response**: Job recommendations and extracted text

### POST `/api/recommendations/text`
Search jobs using text query
- **Body**: `{ "query": "search string" }`
- **Response**: Job recommendations and filter criteria

### GET `/api/init`
Initialize ChromaDB collections with job embeddings

## 🎨 Design Features

### Visual Design
- **Gradient Background**: Beautiful purple-blue gradient
- **Glass Morphism**: Semi-transparent cards with backdrop blur
- **Smooth Animations**: Hover effects and transitions
- **Modern Typography**: Clean, readable Inter font

### User Experience
- **Drag & Drop**: Intuitive file upload
- **Loading States**: Visual feedback during processing
- **Error Handling**: User-friendly error messages
- **Responsive**: Works on all screen sizes
- **Accessibility**: Keyboard navigation and screen reader support

### Interactive Elements
- **Tab Navigation**: Easy switching between systems
- **Modal Dialogs**: Detailed job information
- **Real-time Search**: Instant feedback
- **Example Tags**: Quick search suggestions

## 🔧 Configuration

### Environment Variables
- `HF_API_KEY`: Your Hugging Face API key
- `PORT`: Server port (default: 3000)

### Customization
- Modify `jobPostings.js` to add your own job database
- Adjust CSS variables in `styles.css` for branding
- Update AI models in `server.js` for different embeddings

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Hugging Face for AI models and API
- ChromaDB for vector database
- Font Awesome for icons
- Google Fonts for typography

## 📞 Support

For questions or issues, please open an issue in the repository or contact the development team.

---

**CareerSense** - Making job search intelligent and intuitive! 🚀
