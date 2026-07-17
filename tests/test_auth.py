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
    login_page = LoginPage(driver, base_url).open()
    login_page.go_to_signup_tab()
    login_page.sign_up(unique_credentials["nome"], unique_credentials["email"], "123")

    # Should stay on index.html and show a validation error, not silently fail.
    assert "app.html" not in driver.current_url
    assert login_page.error_text() != ""


@pytest.mark.regression
def test_logout_redirects_to_login(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.logout()
    assert "index.html" in driver.current_url
