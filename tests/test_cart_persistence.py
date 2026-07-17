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


@pytest.mark.regression
def test_cart_is_shared_across_makeup_and_skincare(driver, base_url, signed_up_user):
    """Positive case: Makeup (mk1, EUR 34) and Skincare (sk1, EUR 24) share
    one cart with Hair, tied to the account — adding an item in one category
    must be reflected in the combined total shown in the other."""
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")

    app_page.switch_category("maquilhagem")
    app_page.check_first_item("maquilhagemGrid")
    total_makeup_only = app_page.cart_total_maquilhagem_text()
    assert "34" in total_makeup_only

    app_page.switch_category("skincare")
    total_before_skincare_add = app_page.cart_total_skincare_text()
    assert "34" in total_before_skincare_add  # makeup item carried over

    app_page.check_first_item("skincareGrid")
    combined_total = app_page.cart_total_skincare_text()
    assert "58" in combined_total  # 34 + 24
