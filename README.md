# Revenue Verify UI

Frontend for [revenue-verify-api](../revenue-verify-api): the merchant connect flow and the
lender dashboard. React + Vite + Tailwind. A pure client of the public API — no privileged
backdoors.

## Routes

- `/link/{token}` — merchant connect page: consent screen → Stripe OAuth
- `/link/complete` — where the OAuth callback lands (`?outcome=connected|failed|invalid`)
- `/dashboard` — lender dashboard: merchants, statements, transactions, invitations.
  Sign in with the organization's API key.

## Develop

```bash
npm install
npm run dev            # http://localhost:5173, expects the API on http://localhost:8000
```

Set `VITE_API_BASE_URL` to point elsewhere. Note it is baked in at build time (Vite).

## Run with Docker

```bash
docker compose up --build          # serves on http://localhost:5173 via nginx
# or directly:
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t revenue-verify-ui .
docker run -p 5173:80 revenue-verify-ui
```
# revenue-verify-ui
