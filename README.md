# LevelUp

LevelUp is a gamified, community-driven coding platform where learners practice programming alongside peers of similar skill levels in a friendly, non-judgmental environment.

> **Current Phase**: Phase 4 — Coding Challenges and Practice Engine.  
> The challenge catalogue, submission ingestion, owner-only submission history, mock evaluation engine, and challenge practice UI are fully implemented and verified. Matchmaking, multiplayer coding, and rating systems remain out of scope until subsequent phases.

---

## Technology Stack

- **Backend**: Python 3.11+ / 3.13, FastAPI, Pydantic v2, Pydantic Settings, SQLAlchemy 2.x, Alembic, Argon2-cffi, PyJWT, Uvicorn, Pytest, HTTPX.
- **Frontend**: React 18, TypeScript (strict mode), Vite, React Router v6, Tailwind CSS, Vitest, React Testing Library.
- **Database**: SQLite (file-based MVP database at `./levelup.db`) with foreign key enforcement and Alembic batch migrations.

---

## Core Database Models

All models inherit from a shared SQLAlchemy 2.x `DeclarativeBase` in `backend/app/db/base.py` with typed `Mapped[...]` attributes and UTC timestamps.

### 1. `User` (`users` table)
- Core identity with `username`, `email`, and `hashed_password` (Argon2id).
- 1-to-1 relationships to `UserProfile` and `UserPreference`; 1-to-many to `UserSkill` and `CodeSubmission`.

### 2. `UserProfile` (`user_profiles` table)
- Optional profile attributes (`display_name`, `bio`, `avatar_url`) cascading on user deletion.

### 3. `UserSkill` (`user_skills` table)
- Self-reported skills with `skill_name` and `proficiency_level` (1–5).

### 4. `UserPreference` (`user_preferences` table)
- Matchmaking preferences (`preferred_programming_language`, `preferred_difficulty`).

### 5. `CodingChallenge` (`coding_challenges` table)
- Challenge metadata (`slug`, `title`, `description`, `difficulty`: Easy/Medium/Hard, `topic`, `input_format`, `output_format`, `constraints`, `is_published`).
- 1-to-many relationships to `ChallengeExample`, `ChallengeTestCase`, and `CodeSubmission`.

### 6. `ChallengeExample` (`challenge_examples` table)
- Public examples (`input_data`, `expected_output`, `explanation`, `display_order`) displayed to users on the problem page.

### 7. `ChallengeTestCase` (`challenge_test_cases` table)
- Hidden and sample test cases for solution evaluation. Strictly hidden from public challenge detail and submission responses.

### 8. `CodeSubmission` (`code_submissions` table)
- User submission records (`user_id`, `challenge_id`, `language`, `source_code`, `status`, `result_summary`, `execution_time_ms`, `evaluated_at`).
- Supports 8 languages: `python`, `javascript`, `typescript`, `java`, `cpp`, `c`, `go`, `rust`. Maximum source code size: 64 KiB.

---

## Core API Endpoints

### Health & Auth
- `GET /api/health` — API health check.
- `POST /api/v1/auth/register` — Register a new account.
- `POST /api/v1/auth/login` — Login and receive a JWT access token.
- `GET /api/v1/users/me` — Authenticated user profile, skills, and preferences.

### Challenges & Submissions
- `GET /api/v1/challenges` — List published challenges (paginated, search & difficulty filters).
- `GET /api/v1/challenges/{id}` — Challenge details with public examples (hidden test cases never exposed).
- `POST /api/v1/challenges/{id}/submissions` — Submit code for a challenge (authenticated, server-enforced user ID).
- `GET /api/v1/submissions/{id}` — Submission details (author only; returns 404 for other users).
- `GET /api/v1/users/me/submissions` — Current user's paginated submission history (newest first).

---

## Mock Evaluation Engine

Submissions in Phase 4 are evaluated by `MockEvaluator` (`backend/app/core/evaluator.py`).
- **Safety guarantee**: Never executes submitted code.
- Returns deterministic simulated acceptance clearly prefixed with `[SIMULATED]`.
- User interface displays visible disclaimers that code evaluation is simulated.

---

## Local Setup & Development

### 1. Database Migrations
```bash
cd backend
.\.venv\Scripts\alembic.exe upgrade head
```

### 2. Seed Challenges
```bash
cd backend
.\.venv\Scripts\python.exe scripts/seed_challenges.py
```
Seeds 5 starter challenges: Two Sum, Reverse String, Valid Parentheses, Binary Search, and Climbing Stairs.

### 3. Backend Server
```bash
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base: `http://localhost:8000`
- OpenAPI Docs: `http://localhost:8000/docs`

### 4. Frontend Application
```bash
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## Running Tests

### Backend Tests (67 tests)
```bash
cd backend
.\.venv\Scripts\pytest -v
```

### Frontend Tests (36 tests)
```bash
cd frontend
npm run typecheck
npm test -- --run
npm run build
```
