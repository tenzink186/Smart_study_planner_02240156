// public/script.js
// Frontend logic for the Smart Study Session Planner.
// All data is now fetched from and persisted to the Express REST API
// instead of localStorage.

// Base URL for all API calls — empty string means same origin as the page
const API_BASE = '/api';

// Tracks the id of the session currently being worked on
let currentSessionId = null;

// ── Initialisation ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    setupEventListeners();
    updateRangeDisplays();
    await refreshView();   // load sessions and stats from the backend
}

// ── Event Listeners ───────────────────────────────────────────────────────────

/** Attaches all DOM event listeners once on page load */
function setupEventListeners() {
    document.getElementById('sessionForm').addEventListener('submit', handleSessionSubmit);
    document.getElementById('difficulty').addEventListener('input', updateRangeDisplays);
    document.getElementById('energy').addEventListener('input', updateRangeDisplays);
    document.getElementById('generateQuestions').addEventListener('click', generateReviewQuestions);
    document.getElementById('completeSession').addEventListener('click', completeCurrentSession);
}

/** Keeps the range slider value labels in sync with the slider positions */
function updateRangeDisplays() {
    document.getElementById('difficultyValue').textContent = document.getElementById('difficulty').value;
    document.getElementById('energyValue').textContent     = document.getElementById('energy').value;
}

// ── Form Handling ─────────────────────────────────────────────────────────────

/** Handles the Create Session form submit event */
async function handleSessionSubmit(e) {
    e.preventDefault();

    const formData = validateSessionForm();
    if (!formData.isValid) {
        showValidationErrors(formData.errors);
        return;
    }

    clearValidationErrors();

    try {
        // POST the new session to the backend API
        const session = await apiRequest('POST', '/sessions', formData.data);

        clearForm();
        await refreshView();          // re-render the session list and stats
        showActiveSession(session.id); // open the note-taking panel
    } catch (err) {
        alert(`Could not create session: ${err.message}`);
    }
}

/** Client-side validation — mirrors the backend rules so the user gets instant feedback */
function validateSessionForm() {
    const errors   = [];
    const subject  = document.getElementById('subject').value.trim();
    const duration = parseInt(document.getElementById('duration').value, 10);

    if (subject.length < 2) {
        errors.push('Subject must be at least 2 characters');
    }
    if (isNaN(duration) || duration < 15 || duration > 240) {
        errors.push('Duration must be between 15 and 240 minutes');
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: {
            subject,
            difficulty: parseInt(document.getElementById('difficulty').value, 10),
            energy:     parseInt(document.getElementById('energy').value, 10),
            duration,
        },
    };
}

// ── Active Session Panel ──────────────────────────────────────────────────────

/**
 * Reveals the active session panel and pre-fills any previously saved notes.
 * @param {number} sessionId
 */
async function showActiveSession(sessionId) {
    currentSessionId = sessionId;

    try {
        const session = await apiRequest('GET', `/sessions/${sessionId}`);

        // Pre-fill notes if the session already has some
        document.getElementById('sessionNotes').value = session.notes || '';

        // Re-render any saved questions
        renderQuestions(session.questions || []);

        document.getElementById('activeSession').classList.remove('hidden');
        document.getElementById('sessionNotes').focus();
    } catch (err) {
        alert(`Could not load session: ${err.message}`);
    }
}

/**
 * Generates review questions from the current notes using keyword extraction,
 * then persists them to the backend.
 */
async function generateReviewQuestions() {
    const notes = document.getElementById('sessionNotes').value.trim();

    if (!notes) {
        alert('Please add some notes first!');
        return;
    }

    // Extract keywords and build question strings (same algorithm as Project-I)
    const keywords  = extractKeywords(notes);
    const questions = keywords.slice(0, 5).map(kw => `What is the definition/importance of "${kw}"?`);

    try {
        // Save notes first so they are persisted alongside questions
        await apiRequest('PUT', `/sessions/${currentSessionId}`, { notes });

        // Persist the generated questions to the backend
        await apiRequest('POST', `/sessions/${currentSessionId}/questions`, { questions });

        renderQuestions(questions);
    } catch (err) {
        alert(`Could not save questions: ${err.message}`);
    }
}

/**
 * Marks the current session as completed, saves the final notes, and hides the panel.
 */
async function completeCurrentSession() {
    const notes = document.getElementById('sessionNotes').value;

    try {
        await apiRequest('PUT', `/sessions/${currentSessionId}`, {
            notes,
            completed:     true,
            effectiveness: Math.round(Math.random() * 90 + 10), // Simulated score
        });

        document.getElementById('activeSession').classList.add('hidden');
        currentSessionId = null;

        await refreshView();
    } catch (err) {
        alert(`Could not complete session: ${err.message}`);
    }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

/**
 * Fetches all sessions from the API, then re-renders the session cards and stats.
 */
async function refreshView() {
    try {
        const sessions = await apiRequest('GET', '/sessions');
        renderSessions(sessions);
        renderStats(sessions);
    } catch (err) {
        console.error('Could not refresh view:', err.message);
    }
}

/** Builds session cards and injects them into the sessions grid */
function renderSessions(sessions) {
    const container = document.getElementById('sessionsList');
    container.innerHTML = '';

    if (sessions.length === 0) {
        container.innerHTML = '<p class="empty-state">No sessions yet — create your first one above!</p>';
        return;
    }

    sessions.forEach(session => {
        container.appendChild(createSessionElement(session));
    });
}

/** Creates a single session card DOM element */
function createSessionElement(session) {
    const card = document.createElement('article');
    card.className = 'session-card';

    const title = document.createElement('h3');
    title.textContent = session.subject;
    card.appendChild(title);

    const details = document.createElement('div');
    details.className = 'session-details';
    details.innerHTML = `
        <p>Focus: ${session.focus_score}/5 | ${session.duration} min</p>
        ${session.completed
            ? `<p class="completed">✅ Completed ${new Date(session.completed_at).toLocaleDateString()}</p>`
            : '<p class="pending">⏳ Pending</p>'
        }
    `;
    card.appendChild(details);

    // Show Resume button only for incomplete sessions
    if (!session.completed) {
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'btn btn-secondary btn-sm';
        resumeBtn.textContent = '▶ Resume';
        resumeBtn.addEventListener('click', () => showActiveSession(session.id));
        card.appendChild(resumeBtn);
    }

    // Delete button — available on all sessions
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.textContent = '🗑 Delete';
    deleteBtn.addEventListener('click', () => handleDeleteSession(session.id));
    card.appendChild(deleteBtn);

    return card;
}

/** Asks for confirmation and deletes a session via the API */
async function handleDeleteSession(sessionId) {
    if (!confirm('Delete this session and its questions?')) return;

    try {
        await apiRequest('DELETE', `/sessions/${sessionId}`);
        await refreshView();
    } catch (err) {
        alert(`Could not delete session: ${err.message}`);
    }
}

/** Renders the generated review questions into the questions panel */
function renderQuestions(questions) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    questions.forEach(question => {
        const qEl = document.createElement('div');
        qEl.className = 'question';
        qEl.innerHTML = `<strong>Q:</strong> ${question}`;
        container.appendChild(qEl);
    });
}

/** Renders aggregated stats below the session list */
function renderStats(sessions) {
    const completed        = sessions.filter(s => s.completed).length;
    const total            = sessions.length;
    const effectiveSessions = sessions.filter(s => s.effectiveness !== null && s.effectiveness !== undefined);
    const avgEffectiveness = effectiveSessions.length
        ? Math.round(effectiveSessions.reduce((sum, s) => sum + s.effectiveness, 0) / effectiveSessions.length)
        : 0;

    document.getElementById('statsSummary').innerHTML = `
        <h3>📊 Your Stats</h3>
        <p>Completed: ${completed}/${total} sessions</p>
        <p>Avg Effectiveness: ${avgEffectiveness}%</p>
    `;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Extracts the most-frequent meaningful keywords from a block of notes text.
 * Words shorter than 5 characters are filtered out to avoid common filler words.
 *
 * @param {string} notes
 * @returns {string[]} keywords sorted by frequency, descending
 */
function extractKeywords(notes) {
    const words = notes
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4);

    const freq = {};
    words.forEach(word => { freq[word] = (freq[word] || 0) + 1; });

    return Object.keys(freq)
        .sort((a, b) => freq[b] - freq[a])
        .slice(0, 10);
}

/** Resets the Create Session form and range displays */
function clearForm() {
    document.getElementById('sessionForm').reset();
    updateRangeDisplays();
}

/** Shows inline validation error messages on the relevant form fields */
function showValidationErrors(errors) {
    clearValidationErrors();
    errors.forEach((error, index) => {
        const errorEls = document.querySelectorAll('.error-message');
        if (errorEls[index]) {
            errorEls[index].textContent = error;
            const input = errorEls[index].previousElementSibling;
            if (input) input.classList.add('error');
        }
    });
}

/** Clears all validation error messages and error CSS classes */
function clearValidationErrors() {
    document.querySelectorAll('.error-message').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('input.error').forEach(el => { el.classList.remove('error'); });
}

// ── API Helper ────────────────────────────────────────────────────────────────

/**
 * Sends a JSON request to the backend API and returns the parsed data payload.
 * Throws an Error with the server's message if the response is not OK.
 *
 * @param {string} method  HTTP method ('GET', 'POST', 'PUT', 'DELETE')
 * @param {string} endpoint  Path relative to API_BASE, e.g. '/sessions'
 * @param {object|null} body  Request body (will be JSON-stringified)
 * @returns {Promise<any>} The `data` field from the JSON response
 */
async function apiRequest(method, endpoint, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const json     = await response.json();

    if (!response.ok) {
        // Use the server's error message, or fall back to the HTTP status text
        throw new Error(json.message || response.statusText);
    }

    return json.data ?? json;
}
