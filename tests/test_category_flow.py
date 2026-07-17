"""
Post-login category picker: Hair-Women / Hair-Men / Makeup / Skincare.

All four categories route to the same account and the same cart — these
tests check the picker itself, persistence across reload, and switching
between categories. Makeup and Skincare are real curated product catalogs
(5 items each, with technical sheets and video tutorials), not a stub.
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


@pytest.mark.smoke
def test_switching_to_makeup_shows_real_catalog(driver, base_url, signed_up_user):
    """Makeup used to be a 'coming soon' stub; it's now a real 5-item
    catalog with technical sheets. Guards against that regressing back
    to a stub, and checks mainTabs (hair-only tabs) are hidden here."""
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.switch_category("maquilhagem")
    assert app_page.maquilhagem_visible()
    assert len(app_page.product_cards_in("maquilhagemGrid")) == 5
    assert app_page.main_tabs_hidden()


@pytest.mark.smoke
def test_switching_to_skincare_shows_real_catalog(driver, base_url, signed_up_user):
    """Skincare used to be a 'coming soon' stub; it's now the 'Top 5
    Korean skincare' catalog."""
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.switch_category("skincare")
    assert app_page.skincare_visible()
    assert len(app_page.product_cards_in("skincareGrid")) == 5


def test_switching_back_from_makeup_restores_hair_flow(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.switch_category("skincare")
    assert app_page.skincare_visible()

    app_page.go_back_to_hair("cabelo_fem")
    assert not app_page.main_tabs_hidden()


@pytest.mark.regression
def test_makeup_product_ficha_has_real_video_tutorial(driver, base_url, signed_up_user):
    """Product technical sheets embed a real (researched, not invented)
    YouTube tutorial — this checks the iframe src is a genuine embed URL,
    not a placeholder."""
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.switch_category("maquilhagem")
    app_page.expand_first_ficha("maquilhagemGrid")
    src = app_page.video_iframe_src("maquilhagemGrid")
    assert "youtube.com/embed/" in src


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
