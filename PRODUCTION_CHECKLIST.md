# Production Checklist

## Secrets

- Rotate every API key that appeared in chat or local logs before any real deployment.
- Generate strong unique values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Store secrets in the deploy platform secret manager, not in committed files.
- Keep real `.env` files untracked. Commit only `.env.example` and `.env.test.example`.

## Environment

- Set `NODE_ENV=production`.
- Set `MONGODB_URI` to the production MongoDB cluster.
- Set `CORS_ORIGIN` to the exact production frontend domain.
- Set frontend `VITE_API_BASE_URL` to the production backend `/api/v1` URL.
- Keep frontend sample fallback off in production. Production builds do this by default; set `VITE_STRICT_API=true` explicitly for staging smoke if needed.
- Set `REDIS_ENABLED=true` only after Redis is provisioned and monitored.
- Set `EMAIL_ENABLED=true` only after SMTP is verified.

## Academic Sources

- Configure `OPENALEX_MAILTO` and `CROSSREF_MAILTO` with a real maintainer email.
- Verify Semantic Scholar, IEEE, and Exa keys in `/api/v1/admin/data-sources/check`.
- Treat IEEE health failures as external key/quota/permission issues unless the backend logs show an app exception.
- Keep `EXTERNAL_API_TIMEOUT_MS` high enough for slow source APIs, currently `90000`.

## Email

- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`.
- Smoke test password reset, follow instant email, and daily/weekly digest in staging.
- Confirm SPF/DKIM/DMARC for the sending domain.

## Tests

- Backend unit: `cd web/backend && npm run test:unit`.
- Backend integration with Mongo running: `cd web/backend && npm run test:integration`.
- Backend all: `cd web/backend && npm run test:all`.
- Frontend build: `cd web/frontend && npm run build`.
- E2E with local stack running: `cd web/frontend && npm run test:e2e`.

## Docker Smoke

- Run `docker compose up --build`.
- Open `http://localhost:5173`.
- Login as seeded Student and Admin.
- Search, save a paper, update library note/status, check workspace, check admin source health.

## Security Follow-Up

- Current v1 logout clears client tokens. Add refresh-token blacklist or logout-all-devices before high-risk production.
- Review rate limits for auth, AI, search, and admin endpoints under staging traffic.
- Confirm no PII is sent to Gemini beyond public metadata or public abstracts.

## Release Gate

- CI passes on the target branch.
- Mongo backups and restore drill are documented.
- Error logs are visible to maintainers.
- Admin can disable a broken data source without redeploy.
- Rollback path is documented for frontend and backend images.

## Handoff Remaining Work

- Start Docker Desktop or a local MongoDB instance, then rerun integration and E2E tests.
- Create real deployment `.env` files from:
  - `web/backend/.env.example`
  - `web/backend/.env.test.example`
  - `web/frontend/.env.example`
- Rotate all exposed keys before sharing or deploying.
- Replace Docker local JWT placeholders with strong secrets in the deploy platform.
- Verify external source health from Admin after real keys are configured.
- Configure SMTP only in staging/production, then smoke test instant follow email and digest email.
- Decide whether v1 client-side logout is enough for the handoff scope. For higher security, add refresh-token blacklist/logout-all-devices.
- Document the production domain and set `CORS_ORIGIN` plus `VITE_API_BASE_URL` together.
