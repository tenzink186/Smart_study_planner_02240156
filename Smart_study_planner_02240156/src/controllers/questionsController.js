// controllers/questionsController.js
// Handles saving and retrieving review_questions for a given session.

/** GET /api/sessions/:id/questions — all questions for a session */
function getQuestionsBySession(req, res, next) {
    try {
        const db      = req.app.locals.db;
        const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id);

        if (!session) {
            const err = new Error(`Session ${req.params.id} not found`);
            err.status = 404;
            return next(err);
        }

        const questions = db.prepare(
            'SELECT * FROM review_questions WHERE session_id = ? ORDER BY created_at ASC'
        ).all(req.params.id);

        res.json({ success: true, data: questions });
    } catch (err) { next(err); }
}

/**
 * POST /api/sessions/:id/questions
 * Replaces all existing questions for a session with the new array.
 * Body: { questions: ["Q1?", ...] }
 */
function saveQuestions(req, res, next) {
    try {
        const db      = req.app.locals.db;
        const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(req.params.id);

        if (!session) {
            const err = new Error(`Session ${req.params.id} not found`);
            err.status = 404;
            return next(err);
        }

        const { questions } = req.body;

        // Delete existing questions then insert the new ones
        db.prepare('DELETE FROM review_questions WHERE session_id = ?').run(req.params.id);

        const insert = db.prepare('INSERT INTO review_questions (session_id, question) VALUES (?, ?)');
        questions.forEach(q => insert.run(req.params.id, q.trim()));

        const saved = db.prepare(
            'SELECT * FROM review_questions WHERE session_id = ? ORDER BY created_at ASC'
        ).all(req.params.id);

        res.status(201).json({ success: true, data: saved });
    } catch (err) { next(err); }
}

/** DELETE /api/questions/:id — remove a single question by id */
function deleteQuestion(req, res, next) {
    try {
        const db       = req.app.locals.db;
        const question = db.prepare('SELECT id FROM review_questions WHERE id = ?').get(req.params.id);

        if (!question) {
            const err = new Error(`Question ${req.params.id} not found`);
            err.status = 404;
            return next(err);
        }

        db.prepare('DELETE FROM review_questions WHERE id = ?').run(req.params.id);

        res.json({ success: true, message: `Question ${req.params.id} deleted` });
    } catch (err) { next(err); }
}

module.exports = { getQuestionsBySession, saveQuestions, deleteQuestion };
