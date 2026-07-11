# Project Handoff

## Current Status

- `FIXLIST.md` has no remaining unchecked required tasks.
- Core backend and frontend flows are connected to real APIs.
- Production frontend builds use real API data only by default; sample fallback is disabled unless explicitly enabled.
- Docker, CI, Playwright E2E smoke tests, env examples, and production checklist have been added.

## Important Paths

- Backend: `web/backend`
- Frontend: `web/frontend`
- Main fixlist: `FIXLIST.md`
- Work log: `Minh/docs/phare.md`
- Production checklist: `PRODUCTION_CHECKLIST.md`
- Local Docker stack: `docker-compose.yml`

## Local Run

```bash
docker compose up --build
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5001/api/v1
```

Seed users:

```text
minh.thanh@uni.edu.vn / password123  Admin
lan.anh@uni.edu.vn / password123     Student
```

## Test Commands

Backend unit:

```bash
cd web/backend && npm run test:unit
```

Backend integration, requires MongoDB on `localhost:27017`:

```bash
cd web/backend && npm run test:integration
```

Frontend build:

```bash
cd web/frontend && npm run build
```

Frontend E2E, requires the local stack running:

```bash
cd web/frontend && npm run test:e2e
```

## Remaining Work For The Next Owner

1. Start Docker Desktop or MongoDB local and rerun:
   - `cd web/backend && npm run test:integration`
   - `cd web/frontend && npm run test:e2e`
2. Rotate all API keys that were ever pasted into chat or local env files.
3. Create real `.env` files from the examples, without committing them.
4. Set production `CORS_ORIGIN` and frontend `VITE_API_BASE_URL`.
5. Configure SMTP and verify follow email plus digest email in staging.
6. Verify Admin source health with real OpenAlex/Crossref/Semantic Scholar/IEEE/Exa configuration.
7. Confirm CI passes on the target branch.
8. Add refresh-token blacklist/logout-all-devices if production security requires server-side session revocation.
9. Configure MongoDB backups, monitoring, and restore procedure.

## Known Environment Blocker In This Handoff

The latest local integration run failed because MongoDB was not running on `localhost:27017`, and Docker Desktop was not active:

```text
connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

This is an environment/runtime blocker, not a known application assertion failure.

## Commit Suggestion

```bash
git add .
git commit -m "feat: complete fixlist production handoff"
```
