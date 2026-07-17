# J8 — Hair Diagnostic & Protocol Web App (Prototype)

> 🚧 **Work in progress.** Actively evolving — expect frequent changes to scope, UI and data model. Not production-ready (see Security notes below).

Functional prototype built to validate the business logic before any investment in a real product. Covers: client accounts (login/password), a post-login category picker (Hair — Women / Hair — Men / Makeup / Skincare, all sharing one account and one cart), hair anamnesis, harmony assessment (visagism + personal color analysis), a full protocol menu with no budget gating, curated Makeup and Skincare catalogs grounded in researched 2026 K-beauty trends, an optional budget-capped quote, a technical data sheet per product (usage, ingredients, consumption plan, embedded video tutorial), a lightweight gamification layer (points, progress bar, achievement badges), appointment booking with a partner professional, and product orders (no real payment processing).

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
- Post-login category picker (Hair — Women, Hair — Men, Makeup, Skincare) — all four route to the same account and the same shopping cart; switch between them anytime from the pill bar without losing anything
- Hair anamnesis using clinical language (main concern, gender, facial geometry, skin undertone, color direction) — gender is pre-filled from the chosen category but stays editable
- Harmony assessment (visagism + personal color analysis), always presented with an alternative, never a single verdict
- Full protocol menu — every phase and tier (Essential/Clinical) freely selectable, with no budget cap filtering the options
- Single placeholder brand ("HANA LAB", fictional, Korean-beauty-inspired) applied consistently across the product catalog, to keep the demo coherent until a real supplier is chosen
- Makeup catalog (5 curated items) and Skincare catalog (Top 5 Korean skincare essentials) — each grounded in real, researched 2026 K-beauty trend reporting (cited in commit messages), not invented; both are a curated starter kit rather than a full diagnostic quiz like Hair has
- Custom hand-drawn SVG product illustrations (dropper bottle, jar, cushion compact, tube, ampoule, sheet-mask sachet, cream pot) in the HANA LAB gradient style, replacing the earlier camera-emoji placeholder — this environment couldn't reach stock-photo CDNs to fetch real photographs, so illustrations were the practical path to "more visual, not a placeholder icon"
- Embedded video tutorials (real public YouTube videos, found via research — double cleansing, sheet masks, cushion foundation application, hair oiling/scalp massage, a 10-step glass-skin routine overview) on the relevant product cards
- Lightweight gamification layer — points counter, progress bar toward a complete protocol, and unlockable achievement badges (cosmetic only, doesn't change pricing)
- Per-product technical sheet: description, step-by-step usage, key ingredients, benefits, contraindications ("do not use if"), a consumption plan (estimated yield until the next purchase), a "2026 trend" callout, and (where available) a video tutorial
- Budget-capped quote — **optional**, only activates if the client asks for it, at the end of the flow
- Client record — assessment history saved per account
- Shopping cart persists across page reloads, tab navigation and re-login (`localStorage`), cleared only on logout
- Booking calendar with 3 sample professionals, available slots, booking and cancellation
- Product orders (resale) — logged as "pending", no real payment gateway
- Automated Python/Selenium/Pytest test suite covering the flows above (see `tests/`)

## What was deliberately left out of this version

A long list of additional features accumulated over the course of requests. To keep this prototype testable (and avoid a project that never ships), they're recorded here as next steps rather than built blindly:

- A real diagnostic quiz for Makeup and Skincare (today they're a curated product grid, not an anamnesis flow like Hair's)
- Admin dashboard (sales KPIs, profit/loss, inventory, stock shortages/surplus, alerts for difficult clients/complaints)
- Stock management with pricing, shortages and surplus
- Pickup points
- Installment payment plans
- Apple Pay / Google Pay / real payment checkout
- Insurance (unclear which type — product, service, liability — needs clarification before designing)
- Real AI engine (today the harmony/protocol responses are deterministic rules, not calls to a language model — see the DeepSeek/Qwen/Kimi/GLM/MiniMax discussion for that integration)
- Real product photography and a real supplier relationship (currently illustrated, under one fictional placeholder brand, "HANA LAB" — see `tests/TEST_PLAN.md` and commit history for the trend research this content is grounded in)

Each of these is a real chunk of work (most involve integrating an external service, or real money moving through the system) — worth treating as a separate request rather than another line of code in the same file.

## Security notes (prototype, not production)

- Sessions live in server memory — restarting the process ends all active sessions (fine for testing, not for production)
- The database is a local JSON file (`data/db.json`) — no encryption at rest, no automatic backup
- No HTTPS (runs on `http://localhost`) — never expose this server directly to the internet without TLS
- No login rate limiting — add this before any use beyond localhost
- See `J8_PROFESSIONAL_EDITION.md` (Sections 3–5 and 13) and `J8_FICHA_CLIENTE_IA.md` for the full LGPD/GDPR and Anvisa/INFARMED requirements before handling real client data
