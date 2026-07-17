"""
API-level input/output checks against server.js — regression coverage for
GitHub Issue #1 (malformed JSON was returning 500 instead of 400) plus a
few adjacent negative/boundary cases on the same endpoints.

These hit /api/signup directly with fetch() from inside the browser
(no UI interaction needed, since readBody() runs before any auth check),
so a plain page load is enough context to run them from.
"""

import pytest


def _post_json_raw(driver, base_url, path, raw_body):
    """POST a raw string body (not JSON.stringify'd) with a JSON content
    type, so we can send deliberately malformed JSON and read back the
    real HTTP status + parsed response body."""
    return driver.execute_async_script(
        """
        var path = arguments[0];
        var rawBody = arguments[1];
        var done = arguments[2];
        fetch(path, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: 'same-origin',
          body: rawBody
        }).then(function (r) {
          return r.text().then(function (text) {
            var parsed = null;
            try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
            done({status: r.status, text: text, json: parsed});
          });
        }).catch(function (e) { done({status: -1, text: String(e), json: null}); });
        """,
        base_url + path,
        raw_body,
    )


@pytest.mark.regression
def test_malformed_json_returns_400_not_500(driver, base_url):
    """Regression test for Issue #1: a syntactically invalid JSON body
    (e.g. a trailing comma) must be treated as a client error (400), not
    surface as an unhandled server error (500)."""
    driver.get(base_url + "/index.html")

    result = _post_json_raw(driver, base_url, "/api/signup", '{"email": "a@b.com",}')

    assert result["status"] == 400, "expected 400 for malformed JSON, got %s: %s" % (
        result["status"],
        result["text"],
    )
    assert result["json"] is not None and "error" in result["json"]


@pytest.mark.regression
def test_empty_body_on_signup_returns_400(driver, base_url):
    """Boundary case: a completely empty request body (0 bytes) must also
    be treated as a client error, not crash the JSON.parse call."""
    driver.get(base_url + "/index.html")

    result = _post_json_raw(driver, base_url, "/api/signup", "")

    assert result["status"] == 400
    assert result["json"] is not None and "error" in result["json"]


@pytest.mark.regression
def test_signup_rejects_invalid_email_format(driver, base_url):
    """Negative case: an email without an '@'/domain must be rejected by
    isValidEmail() with 400, before any account is created."""
    driver.get(base_url + "/index.html")

    result = _post_json_raw(
        driver, base_url, "/api/signup",
        '{"email": "not-an-email", "password": "senha123", "nome": "QA"}',
    )

    assert result["status"] == 400
    assert "inv" in result["json"]["error"].lower() or "email" in result["json"]["error"].lower()


@pytest.mark.regression
def test_well_formed_valid_signup_returns_200(driver, base_url, unique_credentials):
    """Positive case (input/output sanity check): a well-formed, valid
    signup payload returns 200 with the expected echoed fields."""
    driver.get(base_url + "/index.html")

    payload = (
        '{"email": "%s", "password": "%s", "nome": "%s"}'
        % (unique_credentials["email"], unique_credentials["password"], unique_credentials["nome"])
    )
    result = _post_json_raw(driver, base_url, "/api/signup", payload)

    assert result["status"] == 200
    assert result["json"]["ok"] is True
    assert result["json"]["email"] == unique_credentials["email"].lower()
