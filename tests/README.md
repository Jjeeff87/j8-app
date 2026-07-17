# J8 — automated test suite (Python / Selenium / Pytest)

End-to-end tests that drive a real browser against a running instance of the app — same approach used across the other test-automation repos in this profile.

See [`TEST_PLAN.md`](TEST_PLAN.md) for the full test case matrix (ID, type — positive/negative/boundary —, preconditions, input, expected output, and the exact automated function for every case below).

## What's covered

- `test_auth.py` — sign up, log in, log out; negative cases (wrong password, unregistered e-mail, duplicate e-mail); boundary cases on the 6-character password minimum (5 chars rejected, 6 chars accepted)
- `test_api_errors.py` — API-level input/output checks directly against `server.js`, including the regression case for [GitHub Issue #1](https://github.com/Jjeeff87/j8-app/issues/1) (malformed JSON must return `400`, not `500`), an empty-body boundary case, invalid-e-mail validation, and a positive well-formed-request sanity check
- `test_category_flow.py` — the post-login category picker (Hair-Women / Hair-Men / Makeup / Skincare), persistence across reload, the real Makeup and Skincare catalogs (5 products each, with embedded video tutorials), switching categories without losing the cart
- `test_cart_persistence.py` — cart survives reload, cart is cleared on logout, the gamification badge unlocks when the full protocol is selected, and the cart total is shared correctly across Makeup + Skincare
- `test_booking.py` — booking a slot with a sample partner professional, the booking shows up under "my bookings", and a negative/boundary case confirming the server rejects a second booking on an already-taken slot

Page objects live in `tests/pages/` (`login_page.py`, `app_page.py`, `agenda_page.py`) to keep locators out of the test files.

## Setup

```bash
pip install -r tests/requirements.txt
```

Requires a matching `chromedriver` on your `PATH` (or set `CHROME_BINARY` to a specific Chrome/Chromium binary). Selenium Manager, bundled with recent `selenium` versions, will normally download the right driver automatically.

## Running

Start the app first (in one terminal):

```bash
node server.js
```

Then, in another terminal:

```bash
pytest
```

By default tests run headless against `http://localhost:3000`. To point at the deployed Render instance instead:

```bash
BASE_URL=https://j8-app.onrender.com pytest
```

To watch the browser while debugging:

```bash
HEADLESS=0 pytest -k test_category_flow -s
```

Markers: `pytest -m smoke` for the fast critical-path subset, `pytest -m regression` for the rest.

## Notes

- Each test that needs a logged-in user signs up a fresh, random account (`unique_credentials` / `signed_up_user` fixtures in `conftest.py`) rather than reusing one shared login — keeps tests independent and safe to run in parallel.
- Most tests drive the UI through Selenium; a few (`test_api_errors.py`, and the double-booking case in `test_booking.py`) call `fetch()` directly from inside the authenticated browser session to exercise server-side validation and edge cases that aren't reachable purely through clicks (a malformed request body, a race on the same booking slot) — still an in-browser, session-authenticated call, not a separate HTTP client.
- This sandbox that produced this suite couldn't install Selenium/Pytest from PyPI (network access to the package index is blocked here), so every test case in `TEST_PLAN.md` was independently verified against a locally running `node server.js` — via equivalent Playwright scripts for the UI flows and direct `curl` calls for the API cases — before being committed. Running `pytest` in a normal environment (where `pip install -r tests/requirements.txt` works) exercises the exact same assertions.
