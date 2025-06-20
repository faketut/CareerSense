// Global variables
let selectedFile = null;
let allJobs = [];

// DOM elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('pdfFile');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const searchQuery = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const modal = document.getElementById('jobModal');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialize the application
async function initializeApp() {
    try {
        // Initialize collections
        const response = await fetch('/api/init');
        if (response.ok) {
            console.log('Collections initialized successfully');
        }
        
        // Load all jobs
        const jobsResponse = await fetch('/api/jobs');
        if (jobsResponse.ok) {
            allJobs = await jobsResponse.json();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error initializing application', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // File upload
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Analyze button
    analyzeBtn.addEventListener('click', analyzeResume);

    // Search functionality
    searchBtn.addEventListener('click', performTextSearch);
    searchQuery.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performTextSearch();
        }
    });

    // Modal close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Tab switching functionality
function switchTab(tabName) {
    // Remove active class from all tabs and contents
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // Clear previous results
    clearResults();
}

// File upload handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (file.type !== 'application/pdf') {
        showNotification('Please select a PDF file', 'error');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';
    analyzeBtn.disabled = false;
}

function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    analyzeBtn.disabled = true;
}

// Resume analysis
async function analyzeResume() {
    if (!selectedFile) {
        showNotification('Please select a PDF file first', 'error');
        return;
    }

    const loading = document.getElementById('pdfLoading');
    const results = document.getElementById('pdfResults');
    
    loading.style.display = 'block';
    results.style.display = 'none';
    analyzeBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('pdf', selectedFile);

        const response = await fetch('/api/recommendations/pdf', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to analyze resume');
        }

        const data = await response.json();
        displayPDFResults(data);
        
    } catch (error) {
        console.error('Error analyzing resume:', error);
        showNotification('Error analyzing resume. Please try again.', 'error');
    } finally {
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

// Text search functionality
async function performTextSearch() {
    const query = searchQuery.value.trim();
    if (!query) {
        showNotification('Please enter a search query', 'error');
        return;
    }

    const loading = document.getElementById('textLoading');
    const results = document.getElementById('textResults');
    
    loading.style.display = 'block';
    results.style.display = 'none';
    searchBtn.disabled = true;

    try {
        const response = await fetch('/api/recommendations/text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error('Failed to search jobs');
        }

        const data = await response.json();
        displayTextResults(data);
        
    } catch (error) {
        console.error('Error searching jobs:', error);
        showNotification('Error searching jobs. Please try again.', 'error');
    } finally {
        loading.style.display = 'none';
        searchBtn.disabled = false;
    }
}

// Display PDF analysis results
function displayPDFResults(data) {
    const results = document.getElementById('pdfResults');
    const resumeText = document.getElementById('resumeText');
    const recommendations = document.getElementById('pdfRecommendations');

    // Display resume text
    resumeText.textContent = data.resumeText || 'No text extracted from PDF';

    // Display recommendations
    if (data.recommendations && data.recommendations.length > 0) {
        recommendations.innerHTML = data.recommendations.map((job, index) => 
            createJobCard(job, index + 1)
        ).join('');
    } else {
        recommendations.innerHTML = '<p class="no-results">No job recommendations found.</p>';
    }

    results.style.display = 'block';
}

// Display text search results
function displayTextResults(data) {
    const results = document.getElementById('textResults');
    const filterInfo = document.getElementById('filterInfo');
    const recommendations = document.getElementById('textRecommendations');

    // Display filter criteria
    if (data.filterCriteria) {
        const criteria = [];
        Object.entries(data.filterCriteria).forEach(([key, value]) => {
            if (value) {
                criteria.push(`${key}: ${Array.isArray(value) ? value.join(' ') : value}`);
            }
        });
        
        if (criteria.length > 0) {
            filterInfo.innerHTML = `<strong>Detected criteria:</strong> ${criteria.join(', ')}`;
            filterInfo.style.display = 'block';
        } else {
            filterInfo.style.display = 'none';
        }
    }

    // Display recommendations
    if (data.recommendations && data.recommendations.length > 0) {
        recommendations.innerHTML = data.recommendations.map((job, index) => 
            createJobCard(job, index + 1)
        ).join('');
    } else {
        recommendations.innerHTML = '<p class="no-results">No job recommendations found.</p>';
    }

    results.style.display = 'block';
}

// Create job card HTML
function createJobCard(job, rank) {
    const score = job.score ? Math.round((1 - job.score) * 100) : 0;
    
    return `
        <div class="job-card" onclick="showJobDetails(${job.id})">
            <div class="job-header">
                <div>
                    <div class="job-title">${job.jobTitle}</div>
                    <div class="job-company">${job.company}</div>
                </div>
                <div class="job-score">${score}% Match</div>
            </div>
            <div class="job-details">
                <div class="job-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    ${job.location}
                </div>
                <div class="job-detail">
                    <i class="fas fa-briefcase"></i>
                    ${job.jobType}
                </div>
                <div class="job-detail">
                    <i class="fas fa-dollar-sign"></i>
                    ${job.salary}
                </div>
            </div>
            <div class="job-description">${job.jobDescription}</div>
            <button class="view-details-btn" onclick="event.stopPropagation(); showJobDetails(${job.id})">
                View Details
            </button>
        </div>
    `;
}

// Show job details modal
function showJobDetails(jobId) {
    const job = allJobs.find(j => j.jobId === jobId);
    if (!job) return;

    const modalJobTitle = document.getElementById('modalJobTitle');
    const modalBody = document.getElementById('modalBody');

    modalJobTitle.textContent = job.jobTitle;
    
    modalBody.innerHTML = `
        <div class="job-detail-section">
            <h4><i class="fas fa-building"></i> Company</h4>
            <p>${job.company}</p>
        </div>
        
        <div class="job-detail-section">
            <h4><i class="fas fa-map-marker-alt"></i> Location</h4>
            <p>${job.location}</p>
        </div>
        
        <div class="job-detail-section">
            <h4><i class="fas fa-briefcase"></i> Job Type</h4>
            <p>${job.jobType}</p>
        </div>
        
        <div class="job-detail-section">
            <h4><i class="fas fa-dollar-sign"></i> Salary</h4>
            <p>${job.salary}</p>
        </div>
        
        <div class="job-detail-section">
            <h4><i class="fas fa-file-alt"></i> Description</h4>
            <p>${job.jobDescription}</p>
        </div>
        
        ${job.jobResponsibilities ? `
        <div class="job-detail-section">
            <h4><i class="fas fa-tasks"></i> Responsibilities</h4>
            <ul>
                ${job.jobResponsibilities.map(resp => `<li>${resp}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${job.preferredQualifications ? `
        <div class="job-detail-section">
            <h4><i class="fas fa-graduation-cap"></i> Preferred Qualifications</h4>
            <ul>
                ${job.preferredQualifications.map(qual => `<li>${qual}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${job.applicationDeadline ? `
        <div class="job-detail-section">
            <h4><i class="fas fa-calendar-alt"></i> Application Deadline</h4>
            <p>${job.applicationDeadline}</p>
        </div>
        ` : ''}
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Set search query from example tags
function setSearchQuery(query) {
    searchQuery.value = query;
    searchQuery.focus();
}

// Clear results
function clearResults() {
    document.getElementById('pdfResults').style.display = 'none';
    document.getElementById('textResults').style.display = 'none';
    document.getElementById('filterInfo').style.display = 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'error':
            notification.style.backgroundColor = '#ff4757';
            break;
        case 'success':
            notification.style.backgroundColor = '#2ed573';
            break;
        default:
            notification.style.backgroundColor = '#667eea';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Add some CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .no-results {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px;
    }
`;
document.head.appendChild(notificationStyles); 