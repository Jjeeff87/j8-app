# J8 — Test Plan

End-to-end test case matrix for the automated Selenium/Pytest suite in this
folder. Written in English so it's usable outside the (Portuguese) product
copy. Every row maps to one automated test function; "Automation" gives the
exact `file.py::test_name` to run it directly.

Legend — **Type**: `Positive` (happy path), `Negative` (invalid input/state
must be rejected), `Boundary` (edge of a valid range). Some cases are
tagged with more than one when they apply.

Run everything: `pytest` (from this folder, or `pytest tests/` from the
repo root). Run one group: `pytest -m smoke` or `pytest -m regression`
(markers registered in `pytest.ini`). Target a live deployment instead of
localhost: `BASE_URL=https://j8-app.onrender.com pytest`.

## Authentication (`test_auth.py`)

| ID | Feature | Type | Preconditions | Input | Expected Output | Automation |
|---|---|---|---|---|---|---|
| AUTH-01 | Sign up | Positive | No account with this e-mail exists | Fresh name/e-mail, password ≥ 6 chars | Redirected to `app.html`, session cookie set | `test_auth.py::test_signup_lands_on_app` |
| AUTH-02 | Log in | Positive | An account already exists | Correct e-mail + password | Redirected to `app.html` | `test_auth.py::test_login_with_existing_account` |
| AUTH-03 | Log in | Negative | An account already exists | Correct e-mail, wrong password | Stays on `index.html`, visible error message | `test_auth.py::test_login_with_wrong_password_shows_error` |
| AUTH-04 | Sign up | Negative | — | Password `"123"` (3 chars, well under the 6-char minimum) | Stays on `index.html`, visible error, no account created | `test_auth.py::test_signup_rejects_short_password` |
| AUTH-05 | Sign up | Boundary (negative side) | — | Password `"abcde"` (exactly 5 chars — one under the minimum) | Rejected — guards an off-by-one in the server's `length < 6` check | `test_auth.py::test_signup_rejects_five_char_password_boundary` |
| AUTH-06 | Sign up | Boundary (positive side) | — | Password `"abcdef"` (exactly 6 chars — the documented minimum) | Accepted, lands on `app.html` — confirms the minimum is inclusive | `test_auth.py::test_signup_accepts_six_char_password_boundary` |
| AUTH-07 | Sign up | Negative | An account already exists for e-mail X | Sign up again with the same e-mail X | Rejected (server returns 409), original account untouched | `test_auth.py::test_signup_rejects_duplicate_email` |
| AUTH-08 | Log in | Negative | — | An e-mail that was never registered | Stays on `index.html`, visible error (not a 500 / silent redirect) | `test_auth.py::test_login_rejects_nonexistent_email` |
| AUTH-09 | Log out | Positive | Logged in | Click "Logout" | Redirected to `index.html`, session ended | `test_auth.py::test_logout_redirects_to_login` |

## API input/output — `server.js` (`test_api_errors.py`)

Regression coverage for **GitHub Issue #1** (a malformed JSON body was
returning `500 Internal Server Error` instead of `400 Bad Request`), plus
adjacent input-validation edge cases on the same endpoint.

| ID | Feature | Type | Input | Expected Output | Automation |
|---|---|---|---|---|---|
| API-01 | `POST /api/signup` | Negative / Regression | Syntactically invalid JSON body (trailing comma: `{"email": "a@b.com",}`) | `400 Bad Request` with a JSON `{"error": ...}` body — **not** `500` | `test_api_errors.py::test_malformed_json_returns_400_not_500` |
| API-02 | `POST /api/signup` | Boundary | Empty request body (0 bytes) | `400 Bad Request`, JSON error body, no unhandled exception | `test_api_errors.py::test_empty_body_on_signup_returns_400` |
| API-03 | `POST /api/signup` | Negative | `{"email": "not-an-email", ...}` (fails the e-mail regex) | `400 Bad Request`, error mentions the invalid e-mail | `test_api_errors.py::test_signup_rejects_invalid_email_format` |
| API-04 | `POST /api/signup` | Positive | Well-formed `{"email", "password", "nome"}`, all valid | `200 OK`, JSON body `{"ok": true, "email": <lowercased>, "nome": ...}` | `test_api_errors.py::test_well_formed_valid_signup_returns_200` |

## Category picker (`test_category_flow.py`)

Hair — Women / Hair — Men / Makeup / Skincare all share one account and one
cart. Makeup and Skincare are real 5-item catalogs (not the earlier "coming
soon" placeholder).

| ID | Feature | Type | Preconditions | Steps / Input | Expected Output | Automation |
|---|---|---|---|---|---|---|
| CAT-01 | Category picker | Positive | Just logged in, no category chosen yet | Load `app.html` | Category picker screen shown (4 cards), main app hidden | `test_category_flow.py::test_category_picker_shown_on_first_login` |
| CAT-02 | Category picker | Positive | Just logged in | Click "Hair — Women" | Main app shown, picker hidden | `test_category_flow.py::test_choosing_hair_women_opens_main_app` |
| CAT-03 | Category picker | Positive (state) | Chose "Hair — Men" | Reload `app.html` | Picker does **not** reappear — choice persisted | `test_category_flow.py::test_category_choice_persists_across_reload` |
| CAT-04 | Makeup catalog | Positive / Regression | In the app | Switch to "Makeup" via the category pill bar | Real catalog renders: exactly 5 product cards, hair-only tabs (`#mainTabs`) hidden | `test_category_flow.py::test_switching_to_makeup_shows_real_catalog` |
| CAT-05 | Skincare catalog | Positive / Regression | In the app | Switch to "Skincare" | Real "Top 5 Korean skincare" catalog renders: exactly 5 product cards | `test_category_flow.py::test_switching_to_skincare_shows_real_catalog` |
| CAT-06 | Category switching | Positive | In Skincare | Switch back to "Hair — Women" | Hair flow (and its tabs) restored | `test_category_flow.py::test_switching_back_from_makeup_restores_hair_flow` |
| CAT-07 | Product technical sheet | Positive / Regression | In Makeup | Expand the first product's "Ver descrição completa" toggle | A real YouTube embed (`youtube.com/embed/...`) is present, not a placeholder | `test_category_flow.py::test_makeup_product_ficha_has_real_video_tutorial` |
| CAT-08 | Shared cart | Positive / Regression | Hair quiz submitted, all phases checked | Switch to Makeup, then back to Hair | Cart total unchanged — nothing lost by switching categories | `test_category_flow.py::test_cart_survives_category_switch` |

## Cart & gamification (`test_cart_persistence.py`)

| ID | Feature | Type | Preconditions | Steps / Input | Expected Output | Automation |
|---|---|---|---|---|---|---|
| CART-01 | Cart persistence | Positive | Items added to cart | Reload `app.html` | `localStorage` cart contents unchanged after reload | `test_cart_persistence.py::test_cart_persists_after_reload` |
| CART-02 | Cart / logout | Positive (security) | Items added to cart | Log out | `localStorage` cart key is cleared (no leftover data for the next user on a shared machine) | `test_cart_persistence.py::test_cart_cleared_on_logout` |
| CART-03 | Gamification | Positive | Quiz submitted | Check all 5 protocol phases | 0 locked badges remain ("Protocolo completo" badge unlocks) | `test_cart_persistence.py::test_full_protocol_unlocks_completion_badge` |
| CART-04 | Shared cart total | Positive / Regression | In Makeup | Add `mk1` (€34), switch to Skincare, add `sk1` (€24) | Skincare panel's total shows the *combined* €58 immediately — cart is shared across categories, not per-category | `test_cart_persistence.py::test_cart_is_shared_across_makeup_and_skincare` |

## Booking (`test_booking.py`)

| ID | Feature | Type | Preconditions | Steps / Input | Expected Output | Automation |
|---|---|---|---|---|---|---|
| BOOK-01 | Book a slot | Positive | Agenda tab open, a professional selected | Click the first available slot | Confirmation message shown, no error | `test_booking.py::test_book_first_available_slot` |
| BOOK-02 | "My bookings" | Positive | A booking was just made | View "Minhas marcações" | The new booking is listed | `test_booking.py::test_booking_appears_in_my_bookings` |
| BOOK-03 | Double booking | Negative / Boundary | A slot was just booked for professional X | `POST /api/agenda/marcar` again with the **same** `profissionalId` + `horarioISO` | Second request rejected (`409`, JSON `error` field) — the slot cannot be double-booked | `test_booking.py::test_double_booking_same_slot_is_rejected` |

## Coverage notes

- All 28 automated cases above were executed against a local instance
  (`node server.js`) during this work: the Selenium/Pytest suite itself
  could not be *run* inside this sandbox (PyPI access is blocked here —
  see `tests/README.md`), so each one was independently verified with
  equivalent Playwright scripts and/or direct `curl` calls against the
  same running server before being committed, and the assertions in this
  document reflect those verified results, not assumptions.
- Not yet covered by an automated case (tracked as follow-up work, not
  silently skipped): file-upload flows (none exist in the app yet), rate
  limiting on login attempts (the app doesn't implement any yet — see
  README "Security notes"), and cross-browser checks (the suite currently
  targets headless Chrome only).
