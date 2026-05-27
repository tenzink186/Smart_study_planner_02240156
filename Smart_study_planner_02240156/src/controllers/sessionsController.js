// controllers/sessionsController.js
// All handler functions for the /api/sessions routes.
// db is retrieved from req.app.locals.db (set during server initialisation).

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Computes focus score and study intervals from session parameters.
 * Mirrors the algorithm used in the original Project-I frontend.
 */
function computeSessionMeta(difficulty, energy, duration) {
    const focusScore    = Math.round(((difficulty + energy) / 2) * 10) / 10;
    const baseInterval  = Math.max(25, Math.min(50, 40 - (difficulty - 3) * 5));
    const numIntervals  = Math.ceil(duration / baseInterval);
    const intervals     = Array(numIntervals).fill(baseInterval);
    return { focusScore, intervals };
}

/** Converts a raw DB row into a clean API-response object */
function formatSession(session, questions = []) {
    return {
        ...session,
        completed: Boolean(session.completed),
        intervals: computeSessionMeta(session.difficulty, session.energy, session.duration).intervals,
        questions,
    };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/** GET /api/sessions — returns all sessions newest-first, each with questions */
function getAllSessions(req, res, next) {
    try {
        const db       = req.app.locals.db;
        const sessions = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();
        const qStmt    = db.prepare('SELECT * FROM review_questions WHERE session_id = ? ORDER BY created_at ASC');

        const result = sessions.map(s =>
            formatSession(s, qStmt.all(s.id).map(q => q.question))
        );

        res.json({ success: true, data: result });
    } catch (err) { next(err); }
}

/** GET /api/sessions/:id — returns one session with its questions (404 if missing) */
function getSessionById(req, res, next) {
    try {
        const db      = req.app.locals.db;
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);

        if (!session) {
            const err = new Error(`Session ${req.params.id} not found`);
            err.status = 404;
            return next(err);
        }

        const questions = db.prepare(
            'SELECT question FROM review_questions WHERE session_id = ? ORDER BY created_at ASC'
        ).all(req.params.id).map(q => q.question);

        res.json({ success: true, data: formatSession(session, questions) });
    } catch (err) { next(err); }
}

/** POST /api/sessions — creates a session; responds 201 with the new row */
function createSession(req, res, next) {
    try {
        const db = req.app.locals.db;
        const { subject, difficulty, energy, duration } = req.body;
        const { focusScore } = computeSessionMeta(Number(difficulty), Number(energy), Number(duration));

        const info = db.prepare(
            'INSERT INTO sessions (subject, difficulty, energy, duration, focus_score) VALUES (?, ?, ?, ?, ?)'
        ).run(subject.trim(), Number(difficulty), Number(energy), Number(duration), focusScore);

        const newSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid);

        res.status(201).json({ success: true, data: formatSession(newSession, []) });
    } catch (err) { next(err); }
}

/** PUT /api/sessions/:id — partial update (notes, completed, effectiveness) */
function updateSession(req, res, next) {
    try {
        const db      = req.app.locals.db;
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);

        if (!session) {
            const err = new Error(`Session ${req.params.id} not found`);
            err.status = 404;
            return next(err);
        }

        const notes         = req.body.notes         !== undefined ? req.body.notes         : session.notes;
        const completed     = req.body.completed     !== undefined ? (req.body.completed ? 1 : 0) : session.completed;
        const completedAt   = (req.body.completed && !session.completed) ? Date.now() : session.completed_at;
        const effectiveness = req.body.effectiveness !== undefined ? req.body.effectiveness : session.effectiveness;

        db.prepare(
            'UPDATE sessions SET notes=?, completed=?, completed_at=?, effectiveness=? WHERE id=?'
        ).run(notes, completed, completedAt, effectiveness, req.params.id);

        const updated   = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
        const questions = db.prepare(
            'SELECT question FROM review_questions WHERE session_id = ? ORDER BY created_at ASC'
        ).all(req.params.id).map(q => q.question);

        res.json({ success: true, data: formatSession(updated, questions) });
    } catch (err) { next(err); }
}

/** DELETE /api/sessions/:id — removes session and its questions */
function deleteSession(req, res, next) {
    try {
        const db      = req.app.locals.db;
        const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id);

        if (!session) {
            const err = new Error(`Session ${req.params.id} not found`);
            err.status = 404;
            return next(err);
        }

        // Manually delete child questions first (sql.js doesn't enforce FK cascades)
        db.prepare('DELETE FROM review_questions WHERE session_id = ?').run(req.params.id);
        db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);

        res.json({ success: true, message: `Session ${req.params.id} deleted` });
    } catch (err) { next(err); }
}

module.exports = { getAllSessions, getSessionById, createSession, updateSession, deleteSession };
