// middleware/validate.js
// Reusable request-body validators.
// Each function checks the relevant fields and calls next() on success,
// or passes a 400 error to the global error handler on failure.

/**
 * Validates the body for POST /api/sessions.
 * Required fields: subject, difficulty, energy, duration.
 */
function validateSession(req, res, next) {
    const errors = [];
    const { subject, difficulty, energy, duration } = req.body;

    // subject must be a non-empty string of at least 2 characters
    if (!subject || typeof subject !== 'string' || subject.trim().length < 2) {
        errors.push('subject must be at least 2 characters');
    }

    // difficulty must be an integer between 1 and 5
    if (difficulty === undefined || !Number.isInteger(Number(difficulty)) ||
        Number(difficulty) < 1 || Number(difficulty) > 5) {
        errors.push('difficulty must be an integer between 1 and 5');
    }

    // energy must be an integer between 1 and 5
    if (energy === undefined || !Number.isInteger(Number(energy)) ||
        Number(energy) < 1 || Number(energy) > 5) {
        errors.push('energy must be an integer between 1 and 5');
    }

    // duration must be an integer between 15 and 240 minutes
    if (duration === undefined || !Number.isInteger(Number(duration)) ||
        Number(duration) < 15 || Number(duration) > 240) {
        errors.push('duration must be an integer between 15 and 240 minutes');
    }

    if (errors.length > 0) {
        // Create a 400 error and pass to the global error handler
        const err = new Error('Validation failed');
        err.status = 400;
        err.details = errors;
        return next(err);
    }

    next();
}

/**
 * Validates the body for POST /api/sessions/:id/questions.
 * Required field: questions (non-empty array of strings).
 */
function validateQuestions(req, res, next) {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
        const err = new Error('questions must be a non-empty array of strings');
        err.status = 400;
        return next(err);
    }

    const allStrings = questions.every(q => typeof q === 'string' && q.trim().length > 0);
    if (!allStrings) {
        const err = new Error('Each question must be a non-empty string');
        err.status = 400;
        return next(err);
    }

    next();
}

module.exports = { validateSession, validateQuestions };
