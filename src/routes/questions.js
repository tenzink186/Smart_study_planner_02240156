// routes/questions.js
// Provides a direct route to act on individual review_question rows by id.
// Nested question creation/listing lives under routes/sessions.js.

const express = require('express');
const router = express.Router();

const { deleteQuestion } = require('../controllers/questionsController');

// DELETE /api/questions/:id  → delete one review question by its own id
router.delete('/:id', deleteQuestion);

module.exports = router;
