# J8 — automated test suite (Python / Selenium / Pytest)

End-to-end tests that drive a real browser against a running instance of the app — same approach used across the other test-automation repos in this profile.

## What's covered

- `test_auth.py` — sign up, log in, log out, invalid password, short-password validation
- `test_category_flow.py` — the post-login category picker (Hair-Women / Hair-Men / Makeup / Skincare), persistence across reload, switching categories without losing the cart
- `test_cart_persistence.py` — cart survives reload, cart is cleared on logout, gamification badge unlocks when the full protocol is selected
- `test_booking.py` — booking a slot with a sample partner professional

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
- This suite exercises the real app end-to-end through the browser; it does not replace the manual API-level checks documented in [GitHub Issue #1](https://github.com/Jjeeff87/j8-app/issues/1), which covered validation, auth/session lifecycle, path traversal and a concurrent-booking race condition directly against the HTTP API.
