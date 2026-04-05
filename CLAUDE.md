# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Platziflix** — A Netflix-like online courses platform built as a Platzi course demonstrating Cursor IDE capabilities. Full-stack project with three sub-applications:

- `Backend/` — Python FastAPI REST API
- `Frontend/` — Next.js 15 (App Router) with TypeScript and SASS
- `Mobile/` — iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose)

## Commands

### Backend

```bash
cd Backend

# Start dev server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
uv run pytest app/test_main.py

# Run a single test
uv run pytest app/test_main.py::test_function_name

# Database migrations
uv run alembic upgrade head

# Seed / clear data
uv run python -m app.db.seed
uv run python -m app.db.seed clear

# Start with Docker (API + PostgreSQL)
docker-compose up --build
```

Requires Python 3.11+. Uses `uv` (Astral) as the package manager.

### Frontend

```bash
cd Frontend

npm run dev       # Dev server with Turbopack (port 3000)
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Vitest (all tests)
npx vitest run src/components/Course  # Run a single test file/directory
```

## Architecture

### Backend

FastAPI app entry point is `app/main.py`. Key layers:

- **Models** (`app/models/`) — SQLAlchemy ORM. All models extend `BaseModel` (`models/base.py`) which adds `created_at`, `updated_at`, `deleted_at` (soft delete) timestamps.
- **Services** (`app/services/`) — Business logic. `CourseService` is injected via FastAPI's `Depends()`.
- **DB** (`app/db/`) — SQLAlchemy engine/session in `base.py`, seed utilities in `seed.py`.
- **Migrations** (`app/alembic/`) — Alembic manages schema changes.

Data model: Course ↔ Teacher (many-to-many via `course_teachers`), Course → Lesson (one-to-many, cascade delete). Slugs are unique and indexed; `email` on Teacher is unique.

API routes (all in `main.py`):
- `GET /` — welcome
- `GET /health` — health check with DB status
- `GET /courses` — list all courses
- `GET /courses/{slug}` — course detail with teachers and lessons

### Frontend

Next.js App Router. Pages fetch data server-side (async/await in page components). Components receive data as props — minimal client-side state.

- `src/app/` — route pages: home (`page.tsx`), course detail (`course/[slug]/`), video player (`classes/[class_id]/`)
- `src/components/` — `Course/`, `CourseDetail/`, `VideoPlayer/`
- `src/types/index.ts` — shared TypeScript interfaces (`Course`, `Class`, `CourseDetail`, etc.)
- `src/styles/` — global SCSS; `vars.scss` is auto-prepended to all SASS files (configured in `next.config.ts`)
- Path alias `@/*` maps to `./src/*`

The frontend currently hardcodes `http://localhost:8000` as the API base URL.

### Testing

**Backend** — pytest with FastAPI `TestClient`. Tests use `unittest.mock` and FastAPI dependency overrides to mock `CourseService`. All tests are in `app/test_main.py`.

**Frontend** — Vitest + React Testing Library with jsdom. Setup in `src/test/setup.ts` (extends jest-dom matchers, auto-cleanup). Test files follow `**/*.{test,spec}.{ts,tsx}` pattern and are co-located with components or in `__test__/` subdirectories.

### FastAPI Development Guidelines (from `.cursor/rules/fastapi.mdc`)

- Prefer functional components and pure functions; avoid classes where possible.
- Use type hints throughout; Pydantic models for all request/response shapes.
- Use async/await for I/O-bound operations; prefer `async def` route handlers.
- Apply guard clauses and early returns for error handling — avoid deep nesting.
- Use FastAPI's `Depends()` for dependency injection (DB sessions, services).
- Lazy-load heavy resources; use caching for repeated reads.
