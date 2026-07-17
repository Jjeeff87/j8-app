"""Sign up, log in, log out, and basic negative-path auth checks."""

import pytest

from tests.pages.login_page import LoginPage
from tests.pages.app_page import AppPage


@pytest.mark.smoke
def test_signup_lands_on_app(driver, base_url, unique_credentials):
    login_page = LoginPage(driver, base_url).open()
    login_page.go_to_signup_tab()
    login_page.sign_up(
        unique_credentials["nome"],
        unique_credentials["email"],
        unique_credentials["password"],
    )
    assert "app.html" in driver.current_url


@pytest.mark.smoke
def test_login_with_existing_account(driver, base_url, signed_up_user):
    AppPage(driver, base_url).logout()

    login_page = LoginPage(driver, base_url).open()
    login_page.log_in(signed_up_user["email"], signed_up_user["password"])
    login_page.wait_for_app()

    assert "app.html" in driver.current_url


def test_login_with_wrong_password_shows_error(driver, base_url, signed_up_user):
    AppPage(driver, base_url).logout()

    login_page = LoginPage(driver, base_url).open()
    login_page.log_in(signed_up_user["email"], "senha-errada")

    assert "app.html" not in driver.current_url
    assert login_page.error_text() != ""


def test_signup_rejects_short_password(driver, base_url, unique_credentials):
    """Negative case: password below the 6-character minimum (server.js checks
    `password.length < 6`) must be rejected, not silently truncated or accepted."""
    login_page = LoginPage(driver, base_url).open()
    login_page.go_to_signup_tab()
    login_page.sign_up(unique_credentials["nome"], unique_credentials["email"], "123")

    # Should stay on index.html and show a validation error, not silently fail.
    assert "app.html" not in driver.current_url
    assert login_page.error_text() != ""


@pytest.mark.regression
def test_signup_rejects_five_char_password_boundary(driver, base_url, unique_credentials):
    """Boundary case (negative side): exactly one character under the minimum
    (5 chars) must still be rejected — guards against an off-by-one in the
    `< 6` check ever becoming `<= 6` or similar."""
    login_page = LoginPage(driver, base_url).open()
    login_page.go_to_signup_tab()
    login_page.sign_up(unique_credentials["nome"], unique_credentials["email"], "abcde")

    assert "app.html" not in driver.current_url
    assert login_page.error_text() != ""


@pytest.mark.regression
def test_signup_accepts_six_char_password_boundary(driver, base_url, unique_credentials):
    """Boundary case (positive side): exactly the minimum length (6 chars)
    must be accepted — the documented minimum is inclusive."""
    login_page = LoginPage(driver, base_url).open()
    login_page.go_to_signup_tab()
    login_page.sign_up(unique_credentials["nome"], unique_credentials["email"], "abcdef")

    assert "app.html" in driver.current_url


@pytest.mark.regression
def test_signup_rejects_duplicate_email(driver, base_url, signed_up_user):
    """Negative case: signing up twice with the same email must be rejected
    (server.js returns 409 with a "already exists" message) rather than
    silently overwriting the existing account."""
    login_page = LoginPage(driver, base_url).open()
    login_page.go_to_signup_tab()
    login_page.sign_up("Duplicate Attempt", signed_up_user["email"], "outrapass123")

    assert "app.html" not in driver.current_url
    assert login_page.error_text() != ""


@pytest.mark.regression
def test_login_rejects_nonexistent_email(driver, base_url):
    """Negative case: logging in with an email that was never registered
    must fail with an error, not a server error or silent redirect."""
    login_page = LoginPage(driver, base_url).open()
    login_page.log_in("this-email-does-not-exist-in-db@example.com", "whatever123")

    assert "app.html" not in driver.current_url
    assert login_page.error_text() != ""


@pytest.mark.regression
def test_logout_redirects_to_login(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.logout()
    assert "index.html" in driver.current_url
