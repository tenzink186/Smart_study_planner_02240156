let studySessions = [];
let currentSessionId = null;

document.addEventListener("DOMContentLoaded", initializeWeb);

function initializeWeb() {
    loadFromLocalStorage();
    setupEventListeners();
    updateRangeDisplays();
    renderSessions();
    renderStats(); // ✅ FIXED: This was missing
}

function setupEventListeners() {
    const form = document.getElementById("sessionForm");
    const difficulty = document.getElementById("difficulty");
    const energy = document.getElementById("energy");
    const generateBtn = document.getElementById("generateQuestions");
    const completeBtn = document.getElementById("completeSession");

    if (form) form.addEventListener("submit", handleFormSubmit);
    if (difficulty) difficulty.addEventListener("input", updateRangeDisplays);
    if (energy) energy.addEventListener("input", updateRangeDisplays);
    if (generateBtn) generateBtn.addEventListener("click", generateReviewQuestions);
    if (completeBtn) completeBtn.addEventListener("click", completeCurrentSession);
}

function updateRangeDisplays() {
    const diffValue = document.getElementById("difficultyvalue");
    const energyValue = document.getElementById("energyvalue");
    const diffSlider = document.getElementById("difficulty");
    const energySlider = document.getElementById("energy");
    
    if (diffValue && diffSlider) {
        diffValue.textContent = diffSlider.value;
    }
    if (energyValue && energySlider) {
        energyValue.textContent = energySlider.value;
    }
}

function handleFormSubmit(e) {
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
    resetForm();
    showActiveSession(session.id);
    clearValidationErrors();
}

function validateSessionForm() {
    const errors = [];
    const subject = document.getElementById("subject")?.value.trim() || '';
    const duration = parseInt(document.getElementById("duration")?.value || 0);

    if (subject.length < 2) {
        errors.push("Subject must be module name or module code.");
    }
    if (duration < 15 || duration > 240) {
        errors.push("Duration must be between 15 to 240 minutes.");
    }
    return {
        isValid: errors.length === 0,
        errors,
        data: {
            subject,
            duration,
            difficulty: parseInt(document.getElementById("difficulty")?.value || 3),
            energy: parseInt(document.getElementById("energy")?.value || 3)
        }
    };
}

function createStudySession(formData) {
    const {subject, duration, difficulty, energy} = formData.data;

    const focusScore = (difficulty + energy) / 2;
    const baseInterval = Math.max(25, Math.min(50, 40 - (difficulty - 3) * 5));
    const numIntervals = Math.ceil(duration / baseInterval);
    return {
        id: Date.now(),
        subject,
        duration,
        difficulty,
        energy,
        focusScore: Math.round(focusScore * 10) / 10,
        intervals: Array(numIntervals).fill(baseInterval),
        notes: "",
        questions: [],
        completed: false,
        completedAt: null,
        effectiveness: null
    };
}

// ✅ FIXED: Better validation error handling
function showValidationErrors(errors) {
    clearValidationErrors();
    
    errors.forEach(error => {
        // Create error message if doesn't exist
        let errorDiv = document.querySelector('.error-messages');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-messages';
            errorDiv.style.cssText = 'color: red; margin: 10px 0; font-size: 14px;';
            document.getElementById('sessionForm').prepend(errorDiv);
        }
        errorDiv.innerHTML += `<div class="error-message">${error}</div>`;
    });
}

function clearValidationErrors() {
    const errorContainer = document.querySelector('.error-messages');
    if (errorContainer) {
        errorContainer.remove();
    }
    document.querySelectorAll('input.error, select.error').forEach(el => {
        el.classList.remove('error');
    });
}

function resetForm() {
    const form = document.getElementById('sessionForm');
    if (form) {
        form.reset();
        updateRangeDisplays();
    }
}

function renderSessions() {
    const container = document.getElementById('sessionlist');
    if (!container) return;
    
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
        const resumeBtn = document.createElement("button");
        resumeBtn.className = "btn btn-secondary btn-sm";
        resumeBtn.textContent = "Resume";
        resumeBtn.addEventListener("click", () => showActiveSession(session.id));
        card.appendChild(resumeBtn);
    }
    
    return card;
}

function showActiveSession(sessionId) {
    // ✅ FIXED: Reload from storage first
    loadFromLocalStorage();
    
    currentSessionId = sessionId;
    const session = studySessions.find(s => s.id === sessionId);
    
    if (!session) {
        alert('Session not found!');
        return;
    }
    
    const activeSessionEl = document.getElementById('activeSession');
    const notesField = document.getElementById('sessionNotes');
    
    if (activeSessionEl) {
        activeSessionEl.classList.remove('hidden');
        document.querySelector('.session-title')?.textContent = session.subject;
    }
    
    if (notesField) {
        notesField.value = session.notes || '';
        notesField.focus();
    }
    
    // Render questions if they exist
    if (session.questions && session.questions.length > 0) {
        renderQuestions();
    }
}

function generateReviewQuestions() {
    const notesField = document.getElementById('sessionNotes');
    if (!notesField) return;
    
    const notes = notesField.value;
    const session = studySessions.find(s => s.id === currentSessionId);
    
    if (!notes.trim()) {
        alert('Please add some notes first!');
        return;
    }
    
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
    if (!container) return;
    
    container.innerHTML = '';
    
    const session = studySessions.find(s => s.id === currentSessionId);
    if (!session?.questions?.length) return;
    
    session.questions.forEach(question => {
        const qEl = document.createElement('div');
        qEl.className = 'question';
        qEl.innerHTML = `<strong>Q:</strong> ${question}`;
        container.appendChild(qEl);
    });
}

function completeCurrentSession() {
    const session = studySessions.find(s => s.id === currentSessionId);
    const notesField = document.getElementById('sessionNotes');
    
    if (!session) return;
    
    session.notes = notesField ? notesField.value : '';
    session.completed = true;
    session.completedAt = Date.now();
    session.effectiveness = Math.round(Math.random() * 90 + 10);

    const activeSessionEl = document.getElementById('activeSession');
    if (activeSessionEl) {
        activeSessionEl.classList.add('hidden');
    }
    
    currentSessionId = null;
    
    saveToLocalStorage();
    renderSessions();
    renderStats();
}

function saveToLocalStorage() {
    localStorage.setItem('studySessions', JSON.stringify(studySessions));
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('studySessions');
        if (saved) {
            studySessions = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        studySessions = [];
    }
}

function renderStats() {
    const statsEl = document.getElementById('statsSummary');
    if (!statsEl) return;
    
    const completed = studySessions.filter(s => s.completed).length;
    const total = studySessions.length;
    const completedSessions = studySessions.filter(s => s.effectiveness !== null);
    const avgEffectiveness = completedSessions.length > 0 
        ? Math.round(completedSessions.reduce((sum, s) => sum + s.effectiveness, 0) / completedSessions.length)
        : 0;
    
    statsEl.innerHTML = `
        <h3>Your Stats</h3>
        <p>Completed: ${completed}/${total} sessions</p>
        <p>Avg Effectiveness: ${avgEffectiveness}%</p>
    `;
}