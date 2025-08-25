# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: FastAPI service (`main.py`), REST routes (`api/routes.py`), trading logic (`trading/`), env file `backend/.env`.
- `frontend/`: Next.js + TypeScript app (`app/`, `components/`, `contexts/`, `utils/`).
- Root: `docker-compose.yml`, `requirements.txt`, `start.sh`, repo-level `README.md`.
- Environment: copy `backend/.env.example -> backend/.env` and `frontend/.env.example -> frontend/.env.local` (do not commit secrets).

## Build, Test, and Development Commands
- One-time setup: `bash setup.sh` — prepares env files (if examples exist) and installs backend/frontend dependencies.
- Run locally: `bash start.sh` — starts API on `:8000` and web on `:3000`.
- Docker: `docker-compose up --build` — builds and runs frontend + backend.
- Backend only: `pip install -r requirements.txt && (cd backend && uvicorn main:app --reload)`.
- Frontend only: `(cd frontend && npm run dev)`; lint via `(cd frontend && npm run lint)`.

## Coding Style & Naming Conventions
- Python: PEP 8, 4-space indent, type hints. Files/modules `snake_case.py`; classes `PascalCase`; functions/vars `snake_case`.
- TypeScript/React: components `PascalCase` (`PriceChart.tsx`), hooks/utils `camelCase`. Co-locate UI in `components/`; pages in `app/`.
- Imports: absolute within each package when reasonable; keep API paths under `/api/*` and websocket at `/ws`.

## Testing Guidelines
- Current status: no test suites included.
- Backend: add `pytest` tests under `backend/tests/`; prefer async tests for FastAPI endpoints.
- Frontend: add `__tests__/` with Jest/Vitest + React Testing Library. Keep components pure and test with mock API responses.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat: add /api/trading/status endpoint`, `fix: handle empty balance`).
- PRs: include scope/summary, linked issues, run steps, screenshots for UI, and note required env vars. Keep changes focused and small.

## Security & Configuration Tips
- Env vars: `BYBIT_API_KEY`, `BYBIT_API_SECRET`, `BYBIT_TESTNET` (backend); `NEXT_PUBLIC_API_URL` (frontend). Never commit keys.
- CORS: backend allows `http://localhost:3000` by default; update if deploying elsewhere.
- Secrets in CI/CD: use environment providers, not files; verify logs don’t print credentials.
