// server.js
// Entry point for the Smart Study Session Planner backend.
// Awaits database initialisation before starting the HTTP server.

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { initDb }     = require('./models/db');
const errorHandler   = require('./middleware/errorHandler');

const PORT = process.env.PORT || 3000;

async function startServer() {
    // Initialise SQLite and run schema migrations before accepting requests
    const db = await initDb();

    // Make the db wrapper available to controllers via app.locals
    const app = express();
    app.locals.db = db;

    // ── Global Middleware ───────────────────────────────────────────────────
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // ── API Routes ──────────────────────────────────────────────────────────
    // Routes are required AFTER db is on app.locals so controllers can access it
    const sessionRoutes  = require('./routes/sessions');
    const questionRoutes = require('./routes/questions');

    app.use('/api/sessions',  sessionRoutes);
    app.use('/api/questions', questionRoutes);

    // Health-check endpoint
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // SPA fallback — serve index.html for any non-API GET
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ── Global Error Handler (must be last) ─────────────────────────────────
    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`✅  Study Planner server running → http://localhost:${PORT}`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
