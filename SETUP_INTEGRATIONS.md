# Integration setup

Set these in Vercel (Project → Settings → Environment Variables) for
Production and Preview. Locally, put them in `.env.local` (git-ignored).

| Variable                          | Required | Exposed to browser | Purpose |
|-----------------------------------|----------|--------------------|---------|
| `DISCORD_LEADS_WEBHOOK_URL`       | yes      | no                 | Contact form leads are posted here as a Discord embed. Without it the form answers 503 and shows the email fallback. |
| `TURNSTILE_SECRET_KEY`            | no       | no                 | Enables Cloudflare Turnstile verification on `/api/contact`. Set together with the site key. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`  | no       | yes                | Renders the Turnstile widget and allows its origin in the CSP. Read at build time: redeploy after changing it. |

Nothing is stored server-side: no database, no lead or analytics files.
Content (projects, testimonials, copy) lives in `content/*.json`; see
`content/README.md`.

## Contact API (`POST /api/contact`)

- JSON only, body ≤ 8 KB, same-origin.
- Fields: `name` (≤ 100), `email` (≤ 254), `service` (one of
  `contactServices` in `content/site.json`), `message` (10–4000),
  `startedAt` (ms timestamp when the form loaded), `website` (honeypot,
  must be empty), optional `turnstileToken`.
- Honeypot filled or submitted < 3 s after load: responds 200, sends nothing.
- Rate limit: 5 requests / 10 min per IP, in memory. Best effort on
  Vercel (per warm instance); enable Turnstile if spam gets through.

## Security headers

Defined in `next.config.mjs`. The main CSP allows `'unsafe-inline'`
scripts because the statically rendered App Router page streams its data in
inline scripts and cannot use a per-request nonce. `/lab` and `/lab/*`
(static homelab viewer in `public/lab/`) get a stricter CSP with no inline
code and `connect-src 'self' https://api.github.com`.
