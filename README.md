# J8 — Hair Diagnostic & Protocol Web App (Prototype)

Functional prototype built to validate the business logic before any investment in a real product. Covers: client accounts (login/password), hair anamnesis, harmony assessment (visagism + personal color analysis), a full protocol menu with no budget gating, an optional budget-capped quote, a technical data sheet per product (usage, ingredients, consumption plan), appointment booking with a partner professional, and product orders (no real payment processing).

Built with zero external dependencies — a single Node.js HTTP server, in-memory sessions, and a JSON file as the data store — so it runs anywhere Node is installed, with no install step and no network dependency.

## Running it

No `npm install` needed — it only uses Node.js built-in libraries (no external dependencies, by design, to avoid any network requirement while testing).

```bash
node server.js
```

Then open `http://localhost:3000` in your browser. Create an account (email + password, 6 characters minimum) and try the flow.

Requirement: Node.js 18 or later (`node -v` to check).

## Deploying a public link (Render, free tier)

1. Create a new GitHub repository (e.g. `j8-app`) and push this content to it (dragging files into GitHub's "Add file → Upload files" page works too — no command line required).
2. Go to `https://render.com/deploy?repo=<your GitHub repo URL>` — Render reads the `render.yaml` already included here and proposes the configuration automatically (free Node web service, start command pre-filled).
3. Confirm and wait ~2–3 minutes. You'll get a link like `https://j8-app-xxxx.onrender.com`.

**Important about Render's free tier:** storage isn't persistent — `data/db.json` (accounts and saved records) can be wiped whenever the service restarts or redeploys. Fine for letting friends test the flow for a few days; not yet a foundation for storing real client data long-term (a persistent disk or a proper database would be the next step for that).

## What's implemented and tested

- Sign up / log in / log out (password hashed with `scrypt`, never stored in plain text)
- Hair anamnesis using clinical language (main concern, gender, facial geometry, skin undertone, color direction)
- Harmony assessment (visagism + personal color analysis), always presented with an alternative, never a single verdict
- Full protocol menu — every phase and tier (Essential/Clinical) freely selectable, with no budget cap filtering the options
- Per-product technical sheet: description, step-by-step usage, key ingredients, benefits, contraindications "do not use if", and a consumption plan (estimated yield until the next purchase)
- Budget-capped quote — **optional**, only activates if the client asks for it, at the end of the flow
- Client record — assessment history saved per account
- Booking calendar with 3 sample professionals, available slots, booking and cancellation
- Product orders (resale) — logged as "pending", no real payment gateway

## What was deliberately left out of this version

A long list of additional features accumulated over the course of requests. To keep this prototype testable (and avoid a project that never ships), they're recorded here as next steps rather than built blindly:

- Admin dashboard (sales KPIs, profit/loss, inventory, stock shortages/surplus, alerts for difficult clients/complaints)
- Stock management with pricing, shortages and surplus
- Pickup points
- Installment payment plans
- Apple Pay / Google Pay / real payment checkout
- Insurance (unclear which type — product, service, liability — needs clarification before designing)
- Real AI engine (today the harmony/protocol responses are deterministic rules, not calls to a language model — see the DeepSeek/Qwen/Kimi/GLM/MiniMax discussion for that integration)
- Top 10 most viral TikTok content/products (Korea/Brazil) and a makeup module — market research still pending
- Real product images and videos (currently clearly-labeled visual placeholders in the technical sheet)

Each of these is a real chunk of work (most involve integrating an external service, or real money moving through the system) — worth treating as a separate request rather than another line of code in the same file.

## Security notes (prototype, not production)

- Sessions live in server memory — restarting the process ends all active sessions (fine for testing, not for production)
- The database is a local JSON file (`data/db.json`) — no encryption at rest, no automatic backup
- No HTTPS (runs on `http://localhost`) — never expose this server directly to the internet without TLS
- No login rate limiting — add this before any use beyond localhost
- See `J8_PROFESSIONAL_EDITION.md` (Sections 3–5 and 13) and `J8_FICHA_CLIENTE_IA.md` for the full LGPD/GDPR and Anvisa/INFARMED requirements before handling real client data
