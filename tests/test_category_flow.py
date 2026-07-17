"""
Post-login category picker: Hair-Women / Hair-Men / Makeup / Skincare.

All four categories route to the same account and the same cart — these
tests check the picker itself, persistence across reload, and switching
between categories (including the "coming soon" stub for Makeup/Skincare).
"""

import pytest

from tests.pages.app_page import AppPage


@pytest.mark.smoke
def test_category_picker_shown_on_first_login(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    assert app_page.category_panel_visible()


@pytest.mark.smoke
def test_choosing_hair_women_opens_main_app(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    assert not app_page.category_panel_visible()


def test_category_choice_persists_across_reload(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_masc")

    driver.get(base_url + "/app.html")
    app_page = AppPage(driver, base_url)
    assert not app_page.category_panel_visible()


def test_switching_to_makeup_shows_coming_soon_stub(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.switch_category("maquilhagem")
    assert app_page.em_breve_visible()


def test_switching_back_from_stub_restores_hair_flow(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.switch_category("skincare")
    assert app_page.em_breve_visible()

    app_page.go_back_to_hair()
    assert not app_page.em_breve_visible()


@pytest.mark.regression
def test_cart_survives_category_switch(driver, base_url, signed_up_user):
    """Regression guard for the core requirement: switching categories must
    never lose items already placed in the cart, because all categories
    share one cart tied to the account."""
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.fill_and_submit_quiz(objetivo="frizz", subtom="neutro")
    app_page.check_all_phases()
    total_before = app_page.cart_total_text()

    app_page.switch_category("maquilhagem")
    app_page.go_back_to_hair()

    total_after = app_page.cart_total_text()
    assert total_before == total_after
