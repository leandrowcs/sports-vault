# AGENTS.md

## Project Agent

Use the `caveman-dev` profile for this repository.

- Role: Senior Full-Stack Engineer specialized in Progressive Web Apps.
- Stack: React, Vite, Firebase, Google Cloud, Vercel, FastAPI.
- Output style: direct, minimal, same language as the user.
- Prefer code and concrete changes over long explanations.
- Write clean, modern, production-ready code.
- Handle loading, error, empty, and edge states.
- Use TypeScript strict-mode patterns.
- Use Conventional Commits for commit messages.
- Update `.env.example` whenever adding environment variables.

## Repository Shape

- `frontend/`: React + Vite PWA.
- `backend/`: FastAPI backend.
- `api/`: Vercel serverless API routes.
- `docs/`: project documentation.
- `.github/agents/`: source agent profiles.
- `.github/prompts/`: reusable prompts.
- `.github/skills/`: on-demand skill instructions.

## Commands

Frontend:

```powershell
cd frontend
npm install
npm run dev
npm run build
```

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn --app-dir backend app.main:app --reload --host 0.0.0.0 --port 8000
```

## General Engineering Rules

- Prefer readability and maintainability over clever one-liners.
- Keep changes scoped to the user's request.
- Reuse existing patterns before adding abstractions.
- Do not hardcode credentials, tokens, API keys, or secrets.
- Do not persist secrets system-wide.
- Keep environment-specific values in runtime env files or deployment settings.
- Never commit `.env`, auth state, generated reports, screenshots, traces, or local caches.
- When adding env vars, update the relevant `.env.example`.
- Use structured APIs and typed models instead of ad hoc string parsing when practical.

## React + Vite Skill

Use `.github/skills/react-vite/SKILL.md` when creating, modifying, or reviewing React components, hooks, state management, or Vite config.

- Functional components only.
- Prefer hooks over HOCs.
- Extract reusable logic into custom hooks.
- Use `import.meta.env` for frontend env vars, never `process.env`.
- Use TanStack Query for server state when introduced.
- Use Zustand or Context for client state when needed.
- Use Tailwind CSS only if the project adopts it or the user requests it.
- Use `React.lazy` and `Suspense` for code splitting where useful.
- Always cover loading, error, and empty states.

## Firebase Skill

Use `.github/skills/firebase/SKILL.md` when working with Firebase, Firestore, Authentication, Cloud Functions, Storage, or Firebase config.

- Use Firebase v9+ modular SDK only.
- Never use the compat layer.
- Use `onSnapshot` for real-time Firestore reads.
- Use `getDocs` for one-time Firestore reads.
- Security Rules must be explicit.
- Never use `allow read, write: if true`.
- Use `onAuthStateChanged` inside `useEffect` with cleanup.
- Cloud Functions must be TypeScript and validate input with `zod`.
- Storage access must use signed URLs.
- Never expose buckets directly.

## PWA Skill

Use `.github/skills/pwa/SKILL.md` when configuring service workers, manifests, offline support, caching, or install prompts.

- Prefer `vite-plugin-pwa` with Workbox.
- Use `CacheFirst` for static assets.
- Use `NetworkFirst` for API calls.
- Manifest must include `name`, `short_name`, `icons`, `start_url`, `display: standalone`, and `theme_color`.
- Design offline-first behavior deliberately.
- Handle sync conflicts explicitly.
- Test service worker behavior from a production build, not dev mode.

## Google Cloud Skill

Use `.github/skills/google-cloud/SKILL.md` when working with Cloud Run, Cloud Storage, Secret Manager, Pub/Sub, IAM, or Google Cloud deployment concerns.

- Use Cloud Run for containerized services.
- Use multi-stage Dockerfiles.
- Use signed URLs for Cloud Storage.
- Never expose buckets publicly.
- Store sensitive values in Secret Manager.
- Use Pub/Sub for async event-driven workflows.
- Apply least privilege IAM.
- Do not use default service accounts in production.

## Vercel Skill

Use `.github/skills/vercel/SKILL.md` when configuring Vercel deployments, serverless routes, edge functions, env vars, rewrites, redirects, or headers.

- Use `vercel.json` for rewrites, redirects, and headers.
- Configure deployment env vars in the Vercel dashboard.
- Do not commit deployment secrets.
- Use Edge Functions for low-latency middleware such as auth guards and redirects.
- Use preview deployments for PR branches.
- Update `.env.example` when adding new env vars.

## Testing And Validation

- Run the smallest useful verification for the touched area.
- For frontend changes, prefer:

```powershell
cd frontend
npm run build
```

- For backend changes, prefer targeted Python tests when available:

```powershell
python -m pytest backend/tests
```

- Do not add arbitrary sleeps to tests.
- Prefer user-facing locators and assertions in UI tests.
- Keep tests deterministic and isolated.

## Response Style

- Reply in the same language as the user.
- Keep explanations short.
- Avoid pleasantries and long introductions.
- Summarize changed files and verification performed.
- Mention any command that could not be run.
