# Smart Study Session Planner

A full-stack web application that helps students plan study sessions tailored
to their energy level, available time, and subject difficulty.
Built for Project-II (Web App Dev — CTE204), Royal University of Bhutan.

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: SQLite (sql.js)

## Project Structure

```
smart-study-session-planner/
├── src/
│   ├── routes/
│   │   ├── sessions.js
│   │   └── questions.js
│   ├── controllers/
│   │   ├── sessionsController.js
│   │   └── questionsController.js
│   ├── models/
│   │   └── db.js
│   └── middleware/
│       ├── errorHandler.js
│       └── validate.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── server.js
├── package.json
├── .env
├── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### Installation

```bash
git clone https://github.com/yourusername/smart-study-session-planner.git
cd smart-study-session-planner
npm install
```

### Environment Variables

Create a `.env` file in the root folder (use `.env.example` as a template):

```
PORT=3000
DB_PATH=./database.sqlite
```

### Running the Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# Production mode
npm start
```

Server runs at: http://localhost:3000

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/sessions | Get all sessions |
| GET | /api/sessions/:id | Get one session |
| POST | /api/sessions | Create a new session |
| PUT | /api/sessions/:id | Update notes / mark complete |
| DELETE | /api/sessions/:id | Delete a session |
| GET | /api/sessions/:id/questions | Get questions for a session |
| POST | /api/sessions/:id/questions | Save questions for a session |
| DELETE | /api/questions/:id | Delete a single question |
| GET | /api/health | Health check |

## Features

- Create study sessions with subject, difficulty, energy level, and duration
- Auto-calculates focus score and recommended study intervals
- Take notes during a session
- Generate review questions from keywords in your notes
- Mark sessions as complete with an effectiveness score
- View all past sessions and overall stats
- Delete sessions and their questions
