// middleware/errorHandler.js
// Global error-handling middleware.
// Must be registered LAST in server.js (after all routes) so Express routes
// errors here when next(err) is called anywhere in the application.

function errorHandler(err, req, res, next) {     // eslint-disable-line no-unused-vars
    // Use the status attached to the error object, or default to 500
    const status = err.status || 500;

    // Log the full error server-side for debugging
    console.error(`[${new Date().toISOString()}] ${status} — ${err.message}`);

    // Build a consistent JSON error response
    const response = {
        success: false,
        message: err.message || 'Internal server error',
    };

    // Include field-level validation details when available (set by validate middleware)
    if (err.details) {
        response.errors = err.details;
    }

    res.status(status).json(response);
}

module.exports = errorHandler;
