# Status page — how to publish

> The status page now exists as a self-contained static file: `status/index.html`.
> Deploy it to GitHub Pages (zero build, zero config) or any static host.

## Quick deploy (GitHub Pages, ~5 min)

1. Repo → Settings → Pages → Source: `main` / folder: `/status`.
2. Visit `https://<org>.github.io/<repo>/` → it serves `status/index.html`.
3. Edit `API_HOST` in `status/index.html` (default `https://api.findmedi.in`).
4. Optional: set `INCIDENT_FEED_URL` to a JSON file with recent incidents.
5. Smoke: open the page, confirm "All systems operational" renders green.
6. Replace `status@findmedi.in` footer with the real address once published.

## What it checks
- `API_HOST + /api/health` every 30 s (components: API / Booking / Payments / Records — all map to the health endpoint today; split when per-service health lands).

## Ownership
- **Publishing decision:** product/ops. **Content:** DPO/grievance for incident wording policy. **Monitoring:** on-call + `uptime.yml`.

## Notes
- The page is self-contained; it does not read cookies or send tokens.
- CORS: if the API and Pages origin differ, `/health` must allow the Pages origin (or map this page onto the same origin as the app, e.g. `https://findmedi.in/status`).
- Until the page is hosted, keep `badge` on repo README pointing at `uptime.yml` workflow status.
