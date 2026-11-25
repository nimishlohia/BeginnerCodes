# LevelUp — Project Status

## 1. Current Phase: Phase 4 (Coding Challenges and Practice Engine)
**Status:** Completed & Fully Verified.  
**Phase 5 Status:** Unimplemented (Awaiting Explicit Approval).

---

## 2. Implemented Components

### Backend (FastAPI + SQLAlchemy 2.x + Alembic + SQLite)
- **Application Factory**: `backend/app/main.py` — FastAPI with OpenAPI docs (`/docs`, `/openapi.json`) and CORS middleware.
- **Central Configuration**: `backend/app/core/config.py` — pydantic-settings with `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`.
- **Health API Route**: `GET /api/health` — returns `status`, `app`, `version`, `environment`.
- **Database Engine & Session**: `backend/app/db/session.py` — SQLite with PRAGMA FK enforcement, `check_same_thread=False`, `get_db` generator dependency.
- **Declarative Base**: `backend/app/db/base.py`.
- **Core Models (Phases 2 & 4)**:
  - `User` — unique username, unique email, UTC timestamps, `hashed_password` column, `submissions` relationship.
  - `UserProfile` — 1-to-1, cascade delete.
  - `UserSkill` — 1-to-many, unique `(user_id, skill_name)`, proficiency 1–5.
  - `UserPreference` — 1-to-1, difficulty: `beginner` / `intermediate` / `advanced`.
  - `CodingChallenge` — slug, title, description, difficulty (`Easy`, `Medium`, `Hard`), topic, input/output formats, constraints, `is_published` flag, relationships to examples, test cases, submissions.
  - `ChallengeExample` — public examples with input, expected output, explanation, display order.
  - `ChallengeTestCase` — hidden/sample test cases with input, expected output, `is_sample` flag, display order.
  - `CodeSubmission` — user_id (FK to users), challenge_id (FK to coding_challenges), language (`python`, `javascript`, `typescript`, `java`, `cpp`, `c`, `go`, `rust`), source_code (max 64 KiB), status (`PENDING`, `RUNNING`, `ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `EVALUATION_ERROR`), sanitized result_summary, execution_time_ms, evaluated_at timestamp.
- **Alembic Migrations**:
  - `653167769234_create_core_models.py` — initial schema.
  - `95d209f8617d_add_hashed_password_to_users.py` — adds `hashed_password NOT NULL`.
  - `25d64739d964_add_challenge_and_submission_tables.py` — adds `coding_challenges`, `challenge_examples`, `challenge_test_cases`, and `code_submissions`.
  - Current head: `25d64739d964`. Applied to `backend/levelup.db`.
- **Security (`backend/app/core/security.py`)**: Argon2id password hashing (`argon2-cffi`), JWT HS256 token generation/validation (`pyjwt`).
- **Mock Evaluator (`backend/app/core/evaluator.py`)**:
  - Pluggable evaluator interface (`BaseEvaluator`) with `MockEvaluator`.
  - Clearly labelled as `[SIMULATED]` in result summaries.
  - **Never executes arbitrary user code** in the backend runtime.
  - Helper `apply_evaluation_result()` safely records evaluation outcomes.
- **Authentication & User APIs (`backend/app/api/auth.py`, `backend/app/api/users.py`)**:
  - User registration, login with JWT, profile, skills, and preferences management.
- **Challenge Catalogue API (`backend/app/api/challenges.py`)**:
  - `GET /api/v1/challenges` — paginated challenge list with search, difficulty, and topic filters. Only published challenges returned.
  - `GET /api/v1/challenges/{id}` — challenge detail view including public examples. Hidden test cases are strictly excluded.
- **Code Submission API (`backend/app/api/submissions.py`)**:
  - `POST /api/v1/challenges/{id}/submissions` — submit code (authenticated). `user_id` taken strictly from JWT. Validates language and code length (<= 64 KiB).
  - `GET /api/v1/submissions/{id}` — detail of a submission (owner-only; returns 404 for other users).
  - `GET /api/v1/users/me/submissions` — paginated submission history for the authenticated user, newest first. Full source code omitted from list items.
- **Seed Script (`backend/scripts/seed_challenges.py`)**:
  - Seeds 5 standard coding challenges (`two-sum`, `reverse-string`, `valid-parentheses`, `binary-search`, `climbing-stairs`) with public examples and hidden test cases. Fully idempotent.

### Frontend (React + TypeScript + Vite + Tailwind CSS)
- **Routing**: React Router v6 with `/`, `/login`, `/register`, `/dashboard` (protected), `/challenges`, `/challenges/:id`, `/submissions` (protected).
- **Auth Context (`frontend/src/context/AuthContext.tsx`)**: In-memory token + user state, `login()`, `logout()`, `refreshUser()`. Token is never persisted to localStorage or cookies.
- **API Client (`frontend/src/lib/api.ts`)**: Strongly typed interfaces and API helpers for auth, user profile, challenges, and submissions.
- **Pages**:
  - `ChallengesPage.tsx` — searchable and filterable challenge catalogue with pagination, difficulty tags, and empty/loading states.
  - `ChallengeDetailPage.tsx` — problem description, input/output formats, constraints, public examples, language selector, text code editor, submission action, and simulated results with clear simulation disclaimers.
  - `SubmissionsPage.tsx` — authenticated user's submission history with pagination and collapsible inspection panel showing submitted code and evaluation notes.
  - `LoginPage.tsx`, `RegisterPage.tsx`, `DashboardPage.tsx`, `HomePage.tsx`.
- **Navigation (`Layout.tsx`)**: Global header with responsive links to Challenges (public), My Submissions (authenticated), Dashboard, and Sign In/Out.

---

## 3. Architecture & Security Invariants

1. **SQLite as MVP Database**: Centralized engine and request-scoped session dependency with foreign key pragma enforcement.
2. **Server-Side Submission Ownership**: `user_id` on submissions is always extracted from the validated JWT subject, never accepted from user input.
3. **No Execution of Arbitrary Code**: Phase 4 evaluator is explicitly mocked and clearly labelled `[SIMULATED]`. No user-submitted code is ever compiled, executed, or interpreted on the host machine.
4. **Information Isolation on Hidden Tests**: `ChallengeTestCase` data is never returned by catalogue or submission endpoints.
5. **Private Submission Access**: Submissions can only be viewed by their author. Attempting to view another user's submission returns 404 Not Found to prevent submission ID probing.
6. **Isolated Test Database**: `conftest.py` uses `StaticPool` in-memory SQLite with an autouse fixture ensuring complete test isolation and zero cross-test interference.

---

## 4. Verification Results

| Target | Command | Result | Notes |
|---|---|---|---|
| Backend Test Suite | `pytest -v` | **PASS (67/67 in 4.42s)** | All model, API, auth, challenge, submission, evaluator, and migration tests passing. |
| Alembic Current Revision | `alembic current` | **PASS (`25d64739d964 (head)`)** | All 3 migrations applied cleanly to SQLite development database. |
| Seed Script | `python scripts/seed_challenges.py` | **PASS** | Idempotently verified against development database (5 seeded challenges). |
| Frontend Typecheck | `npm run typecheck` | **PASS (0 errors)** | Strict TypeScript compiler check (`tsc --noEmit`). |
| Frontend Test Suite | `npm test` | **PASS (36/36 in 7.84s)** | 8 test suites passing: ChallengesPage, ChallengeDetailPage, SubmissionsPage, DashboardPage, LoginPage, RegisterPage, HomePage, App. |
| Frontend Production Build | `npm run build` | **PASS** | Production bundle generated cleanly via `vite build`. |

---

## 5. Known Limitations

- **Simulated Code Evaluation**: The evaluator returns mock results and does not execute submitted code. Sandboxed execution (e.g. isolated containers/firejail) is scheduled for a future phase.
- **In-Memory JWT Access Token**: Token is held in React state only; page reloads require re-authenticating.
- **Single Attempt Record**: Submission status updates synchronously via mock evaluator. Async evaluation with task queues (e.g. Celery / background workers) will be needed for real multi-language sandboxes.
- **No XP / Skill Matchmaking / Leaderboards**: Intentionally deferred to Phase 5 and beyond.

---

## 6. Exact Commands for Local Verification

### Backend
```powershell
cd backend
.\.venv\Scripts\pytest -v
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\python.exe scripts\seed_challenges.py
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

### Frontend
```powershell
cd frontend
npm run typecheck
npm test -- --run
npm run build
npm run dev
```

---

## 7. Next Planned Phase

**Phase 5: [Awaiting Explicit Approval]**

*Phase 4 is complete. Phase 5 will not begin until explicit approval is given.*
