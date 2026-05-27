// routes/sessions.js
// Defines all routes for the /api/sessions resource.
// Validation middleware runs before the controller for write operations.

const express = require('express');
const router = express.Router();

const {
    getAllSessions,
    getSessionById,
    createSession,
    updateSession,
    deleteSession,
} = require('../controllers/sessionsController');

const {
    getQuestionsBySession,
    saveQuestions,
} = require('../controllers/questionsController');

const { validateSession, validateQuestions } = require('../middleware/validate');

// ── Session CRUD ──────────────────────────────────────────────────────────────

// GET    /api/sessions          → list all sessions
router.get('/', getAllSessions);

// GET    /api/sessions/:id      → get one session
router.get('/:id', getSessionById);

// POST   /api/sessions          → create a new session (validated)
router.post('/', validateSession, createSession);

// PUT    /api/sessions/:id      → update notes / mark completed
router.put('/:id', updateSession);

// DELETE /api/sessions/:id      → remove a session and its questions
router.delete('/:id', deleteSession);

// ── Nested questions routes ───────────────────────────────────────────────────
// Kept nested under sessions so the URL clearly shows ownership.

// GET    /api/sessions/:id/questions   → list questions for a session
router.get('/:id/questions', getQuestionsBySession);

// POST   /api/sessions/:id/questions   → save/replace questions for a session
router.post('/:id/questions', validateQuestions, saveQuestions);

module.exports = router;
