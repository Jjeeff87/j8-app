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


@pytest.mark.regression
def test_double_booking_same_slot_is_rejected(driver, base_url, signed_up_user):
    """Negative case: server.js (POST /api/agenda/marcar) checks for an
    existing booking with the same profissionalId + horarioISO and must
    reject a second attempt on the identical slot, rather than double
    -booking a professional. The UI itself won't offer an already-booked
    slot again, so this hits the API directly (still inside the logged-in
    browser session, reusing its cookies) to exercise the server guard."""
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")

    agenda = AgendaPage(driver, base_url)
    agenda.open_tab()
    profs = driver.find_elements(*agenda.PROF_CARD)
    assert profs, "expected at least one sample professional"
    profs[0].click()

    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    WebDriverWait(driver, 10).until(EC.visibility_of_element_located(agenda.SLOT_BTN))
    slot_el = driver.find_elements(*agenda.SLOT_BTN)[0]
    profissional_id = profs[0].get_attribute("data-prof")
    horario_iso = slot_el.get_attribute("data-horario")

    result = driver.execute_async_script(
        """
        var profissionalId = arguments[0];
        var horarioISO = arguments[1];
        var done = arguments[2];
        function marcar() {
          return fetch('/api/agenda/marcar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: JSON.stringify({profissionalId: profissionalId, horarioISO: horarioISO, servico: 'Teste QA'})
          }).then(function (r) { return r.json().then(function (d) { return {status: r.status, body: d}; }); });
        }
        marcar().then(function (first) {
          marcar().then(function (second) { done({first: first, second: second}); });
        });
        """,
        profissional_id,
        horario_iso,
    )

    assert result["first"]["status"] == 200
    assert result["first"]["body"].get("ok") is True
    assert result["second"]["status"] != 200 or result["second"]["body"].get("ok") is not True
    assert "error" in result["second"]["body"] or result["second"]["status"] >= 400
