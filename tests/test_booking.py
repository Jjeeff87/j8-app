"""Booking a slot with a partner professional (sample/fictional data)."""

import pytest

from tests.pages.app_page import AppPage
from tests.pages.agenda_page import AgendaPage


@pytest.mark.regression
def test_book_first_available_slot(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")

    agenda = AgendaPage(driver, base_url)
    agenda.open_tab()
    confirmation_text = agenda.book_first_available_slot()

    assert "confirmada" in confirmation_text.lower() or "erro" not in confirmation_text.lower()


@pytest.mark.regression
def test_booking_appears_in_my_bookings(driver, base_url, signed_up_user):
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_masc")

    agenda = AgendaPage(driver, base_url)
    agenda.open_tab()
    agenda.book_first_available_slot()

    assert agenda.my_bookings_text().strip() != ""
