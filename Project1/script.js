
let studySessions = [];
let currentSessionId = null;

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    loadFromLocalStorage();
    setupEventListeners();
    updateRangeDisplays();
    renderSessions();
    renderStats();
}

/* Sets up all event listeners for user interactions. Handles form submission, buttons, range sliders*/
function setupEventListeners() {
    // Form submission with validation
    document.getElementById('sessionForm').addEventListener('submit', handleSessionSubmit);
    
    // Range slider displays
    document.getElementById('difficulty').addEventListener('input', updateRangeDisplays);
    document.getElementById('energy').addEventListener('input', updateRangeDisplays);
    
    // Active session controls
    document.getElementById('generateQuestions').addEventListener('click', generateReviewQuestions);
    document.getElementById('completeSession').addEventListener('click', completeCurrentSession);
}

/* Updates range slider value displays in real-time */
function updateRangeDisplays() {
    document.getElementById('difficultyValue').textContent = 
        document.getElementById('difficulty').value;
    document.getElementById('energyValue').textContent = 
        document.getElementById('energy').value;
}

/* Handles form submission */
function handleSessionSubmit(e) {
    e.preventDefault();
    
    const formData = validateSessionForm();
    
    if (!formData.isValid) {
        showValidationErrors(formData.errors);
        return;
    }
    
    const session = createStudySession(formData);
    studySessions.push(session);
    
    saveToLocalStorage();
    renderSessions();
    renderStats();
    clearForm();
    showActiveSession(session.id);
    
    clearValidationErrors();
}


function validateSessionForm() {
    const errors = [];
    const subject = document.getElementById('subject').value.trim();
    const duration = parseInt(document.getElementById('duration').value);
    
    if (subject.length < 2) {
        errors.push('Subject must be at least 2 characters');
    }
    
    if (duration < 15 || duration > 240) {
        errors.push('Duration must be between 15-240 minutes');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        data: {
            subject,
            difficulty: parseInt(document.getElementById('difficulty').value),
            energy: parseInt(document.getElementById('energy').value),
            duration
        }
    };
}

function createStudySession(formData) {
    const { subject, difficulty, energy, duration } = formData.data;
    
    const focusScore = (difficulty + energy) / 2;
    const baseInterval = Math.max(25, Math.min(50, 40 - (difficulty - 3) * 5));
    const numIntervals = Math.ceil(duration / baseInterval);
    
    return {
        id: Date.now(),
        subject,
        difficulty,
        energy,
        focusScore: Math.round(focusScore * 10) / 10,
        duration,
        intervals: Array(numIntervals).fill(baseInterval),
        notes: '',
        questions: [],
        completed: false,
        completedAt: null,
        effectiveness: null
    };
}

function showValidationErrors(errors) {
    clearValidationErrors();
    
    errors.forEach((error, index) => {
        const errorEl = document.querySelectorAll('.error-message')[index] || 
                       document.querySelector('.error-message');
        errorEl.textContent = error;
        errorEl.parentElement.querySelector('input').classList.add('error');
    });
}

function clearValidationErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
    document.querySelectorAll('input.error').forEach(el => {
        el.classList.remove('error');
    });
}

function clearForm() {
    document.getElementById('sessionForm').reset();
    updateRangeDisplays();
}

function renderSessions() {
    const container = document.getElementById('sessionsList');
    
    // Clear existing sessions
    container.innerHTML = '';
    
    studySessions.forEach(session => {
        const sessionEl = createSessionElement(session);
        container.appendChild(sessionEl);
    });
}

function createSessionElement(session) {
    const card = document.createElement('article');
    card.className = 'session-card';
    
    const title = document.createElement('h3');
    title.textContent = session.subject;
    card.appendChild(title);
    
    const details = document.createElement('div');
    details.className = 'session-details';
    details.innerHTML = `
        <p>Focus: ${session.focusScore}/5 | ${session.duration}min</p>
        ${session.completed ? 
            `<p class="completed"> Completed ${new Date(session.completedAt).toLocaleDateString()}</p>` : 
            '<p class="pending"> Pending</p>'
        }
    `;
    card.appendChild(details);
    
    if (!session.completed) {
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'btn btn-secondary btn-sm';
        resumeBtn.textContent = ' Resume';
        resumeBtn.addEventListener('click', () => showActiveSession(session.id));
        card.appendChild(resumeBtn);
    }
    
    return card;
}

function showActiveSession(sessionId) {
    currentSessionId = sessionId;
    const session = studySessions.find(s => s.id === sessionId);
    
    document.getElementById('activeSession').classList.remove('hidden');
    document.getElementById('sessionNotes').focus();
}

function generateReviewQuestions() {
    const notes = document.getElementById('sessionNotes').value;
    const session = studySessions.find(s => s.id === currentSessionId);
    
    if (!notes.trim()) {
        alert('Please add some notes first!');
        return;
    }
    
    // Simple keyword-based question generation
    const keywords = extractKeywords(notes);
    session.questions = keywords.slice(0, 5).map(keyword => 
        `What is the definition/importance of "${keyword}"?`
    );
    
    renderQuestions();
    saveToLocalStorage();
}


function extractKeywords(notes) {
    const words = notes.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4);
    
    const keywordCount = {};
    words.forEach(word => {
        keywordCount[word] = (keywordCount[word] || 0) + 1;
    });
    
    return Object.keys(keywordCount)
        .sort((a, b) => keywordCount[b] - keywordCount[a])
        .slice(0, 10);
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    const session = studySessions.find(s => s.id === currentSessionId);
    session.questions.forEach(question => {
        const qEl = document.createElement('div');
        qEl.className = 'question';
        qEl.innerHTML = `<strong>Q:</strong> ${question}`;
        container.appendChild(qEl);
    });
}

function completeCurrentSession() {
    const session = studySessions.find(s => s.id === currentSessionId);
    session.notes = document.getElementById('sessionNotes').value;
    session.completed = true;
    session.completedAt = Date.now();
    session.effectiveness = Math.round(Math.random() * 90 + 10); // Simulated
    
    document.getElementById('activeSession').classList.add('hidden');
    currentSessionId = null;
    
    saveToLocalStorage();
    renderSessions();
    renderStats();
}

/* Saves sessions to localStorage for persistence */
function saveToLocalStorage() {
    localStorage.setItem('studySessions', JSON.stringify(studySessions));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('studySessions');
    if (saved) {
        studySessions = JSON.parse(saved);
    }
}

function renderStats() {
    const completed = studySessions.filter(s => s.completed).length;
    const total = studySessions.length;
    const avgEffectiveness = studySessions
        .filter(s => s.effectiveness)
        .reduce((sum, s) => sum + s.effectiveness, 0) / 
        studySessions.filter(s => s.effectiveness).length || 0;
    
    document.getElementById('statsSummary').innerHTML = `
        <h3> Your Stats</h3>
        <p>Completed: ${completed}/${total} sessions</p>
        <p>Avg Effectiveness: ${Math.round(avgEffectiveness)}%</p>
    `;
}