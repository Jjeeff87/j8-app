"""
Cart must survive page reloads / re-navigation, and must be cleared on
logout so the next person on a shared computer doesn't see someone else's
selections. Backed by localStorage on the client (see public/app.js).
"""

import pytest

from tests.pages.login_page import LoginPage
from tests.pages.app_page import AppPage


@pytest.mark.smoke
def test_cart_persists_after_reload(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.fill_and_submit_quiz(objetivo="frizz", subtom="neutro")
    app_page.check_all_phases()

    stored_before = driver.execute_script("return window.localStorage.getItem('j8_carrinho_v1');")
    assert stored_before is not None

    driver.get(base_url + "/app.html")

    stored_after = driver.execute_script("return window.localStorage.getItem('j8_carrinho_v1');")
    assert stored_after == stored_before


@pytest.mark.regression
def test_cart_cleared_on_logout(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.fill_and_submit_quiz(objetivo="frizz", subtom="neutro")
    app_page.check_all_phases()

    app_page.logout()

    stored_after_logout = driver.execute_script("return window.localStorage.getItem('j8_carrinho_v1');")
    assert stored_after_logout is None


def test_full_protocol_unlocks_completion_badge(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.fill_and_submit_quiz(objetivo="frizz", subtom="neutro")

    app_page.check_all_phases()

    assert app_page.locked_badge_count() == 0
