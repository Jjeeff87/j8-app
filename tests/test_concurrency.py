"""
Real concurrency checks — two independent, already-authenticated browser
sessions (each its own cookie jar, simulating two different people on two
different devices) firing requests genuinely at the same time via
ThreadPoolExecutor, not one after another.

This is different from test_booking.py::test_double_booking_same_slot_is_rejected,
which proves the server rejects a *second* request from the *same* session
after the first already succeeded — a real double-click, but from one person.
The tests here are the scenario that comes up most often in real interviews:
"what happens when two different people click 'book' on the same slot at
the same instant?" Both fire together; only one may win.
"""

import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from tests.pages.login_page import LoginPage
from tests.pages.app_page import AppPage
from tests.pages.agenda_page import AgendaPage


def _fresh_credentials(tag):
    stamp = uuid.uuid4().hex[:10]
    return {
        "nome": "QA Concurrent %s" % tag,
        "email": "qa-concurrent-%s-%s@example.com" % (tag, stamp),
        "password": "senha123",
    }


def _sign_up(drv, base_url, creds):
    login_page = LoginPage(drv, base_url).open()
    login_page.go_to_signup_tab()
    login_page.sign_up(creds["nome"], creds["email"], creds["password"])


def _open_agenda_first_slot(drv, base_url):
    AppPage(drv, base_url).choose_category("cabelo_fem")
    agenda = AgendaPage(drv, base_url)
    agenda.open_tab()
    profs = drv.find_elements(*agenda.PROF_CARD)
    assert profs, "expected at least one sample professional"
    profs[0].click()
    WebDriverWait(drv, 10).until(EC.visibility_of_element_located(agenda.SLOT_BTN))
    slot_el = drv.find_elements(*agenda.SLOT_BTN)[0]
    profissional_id = profs[0].get_attribute("data-prof")
    horario_iso = slot_el.get_attribute("data-horario")
    return profissional_id, horario_iso


def _post_marcar_async(drv, profissional_id, horario_iso, servico="Teste QA concorrência"):
    """Fires the booking fetch() from inside the given browser session.
    Called from a worker thread — Selenium's remote-end HTTP call blocks
    that thread while the real browser request is in flight, which is what
    lets two of these run genuinely overlapping via ThreadPoolExecutor."""
    return drv.execute_async_script(
        """
        var profissionalId = arguments[0];
        var horarioISO = arguments[1];
        var servico = arguments[2];
        var done = arguments[3];
        fetch('/api/agenda/marcar', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: 'same-origin',
          body: JSON.stringify({profissionalId: profissionalId, horarioISO: horarioISO, servico: servico})
        }).then(function (r) { return r.json().then(function (d) { done({status: r.status, body: d}); }); })
          .catch(function (e) { done({status: -1, body: {error: String(e)}}); });
        """,
        profissional_id,
        horario_iso,
        servico,
    )


def _post_signup_async(drv, base_url, email, password, nome):
    return drv.execute_async_script(
        """
        var done = arguments[3];
        fetch(arguments[0], {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          credentials: 'same-origin',
          body: JSON.stringify({email: arguments[1], password: arguments[2], nome: 'Race Signup'})
        }).then(function (r) { return r.json().then(function (d) { done({status: r.status, body: d}); }); })
          .catch(function (e) { done({status: -1, body: {error: String(e)}}); });
        """,
        base_url + "/api/signup",
        email,
        password,
    )


@pytest.mark.regression
def test_two_different_users_double_click_same_slot_only_one_wins(driver, second_driver, base_url):
    """The most commonly asked real-world race condition: two different
    people (two separate accounts, two separate browser sessions) click
    'book' on the exact same slot at effectively the same instant. Exactly
    one must win (200, ok:true); the other must be cleanly rejected (409
    'já foi reservado por outra pessoa'), never both silently succeeding."""
    creds_a = _fresh_credentials("a")
    creds_b = _fresh_credentials("b")
    _sign_up(driver, base_url, creds_a)
    _sign_up(second_driver, base_url, creds_b)

    prof_a, slot_a = _open_agenda_first_slot(driver, base_url)
    prof_b, slot_b = _open_agenda_first_slot(second_driver, base_url)
    # Both users must be looking at the same professional/slot for this to
    # actually exercise the race — confirms the fixture setup is valid.
    assert (prof_a, slot_a) == (prof_b, slot_b)

    with ThreadPoolExecutor(max_workers=2) as pool:
        future_a = pool.submit(_post_marcar_async, driver, prof_a, slot_a)
        future_b = pool.submit(_post_marcar_async, second_driver, prof_b, slot_b)
        result_a = future_a.result()
        result_b = future_b.result()

    outcomes = [result_a, result_b]
    successes = [r for r in outcomes if r["status"] == 200 and r["body"].get("ok") is True]
    failures = [r for r in outcomes if r not in successes]

    assert len(successes) == 1, "expected exactly one winner, got: %s" % outcomes
    assert len(failures) == 1, "expected exactly one rejection, got: %s" % outcomes
    assert failures[0]["status"] >= 400 or "error" in failures[0]["body"]


@pytest.mark.regression
def test_two_different_users_booking_different_slots_both_succeed(driver, second_driver, base_url):
    """Positive counterpart to the test above: two different people booking
    two DIFFERENT slots for the same professional at the same instant must
    both succeed — proves the server's race guard locks on the specific
    (profissionalId, horarioISO) pair, not the whole professional/calendar."""
    creds_a = _fresh_credentials("c")
    creds_b = _fresh_credentials("d")
    _sign_up(driver, base_url, creds_a)
    _sign_up(second_driver, base_url, creds_b)

    AppPage(driver, base_url).choose_category("cabelo_fem")
    agenda_a = AgendaPage(driver, base_url)
    agenda_a.open_tab()
    profs_a = driver.find_elements(*agenda_a.PROF_CARD)
    profs_a[0].click()
    WebDriverWait(driver, 10).until(EC.visibility_of_element_located(agenda_a.SLOT_BTN))
    slots_a = driver.find_elements(*agenda_a.SLOT_BTN)
    assert len(slots_a) >= 2, "need at least two distinct available slots for this test"
    prof_id = profs_a[0].get_attribute("data-prof")
    slot_1 = slots_a[0].get_attribute("data-horario")
    slot_2 = slots_a[1].get_attribute("data-horario")
    assert slot_1 != slot_2

    AppPage(second_driver, base_url).choose_category("cabelo_fem")
    agenda_b = AgendaPage(second_driver, base_url)
    agenda_b.open_tab()
    profs_b = second_driver.find_elements(*agenda_b.PROF_CARD)
    profs_b[0].click()
    WebDriverWait(second_driver, 10).until(EC.visibility_of_element_located(agenda_b.SLOT_BTN))

    with ThreadPoolExecutor(max_workers=2) as pool:
        future_a = pool.submit(_post_marcar_async, driver, prof_id, slot_1)
        future_b = pool.submit(_post_marcar_async, second_driver, prof_id, slot_2)
        result_a = future_a.result()
        result_b = future_b.result()

    for label, result in (("A/slot_1", result_a), ("B/slot_2", result_b)):
        assert result["status"] == 200 and result["body"].get("ok") is True, (
            "%s should have succeeded (different slots must not block each other): %s" % (label, result)
        )


@pytest.mark.regression
def test_two_concurrent_signups_same_email_only_one_succeeds(driver, second_driver, base_url):
    """Real-world race: two signup requests for the exact same email fired
    at the same instant (e.g. a double-submitted form, or two tabs). The
    server must accept exactly one and reject the other as a duplicate —
    never create two accounts for the same email."""
    stamp = uuid.uuid4().hex[:10]
    email = "qa-race-signup-%s@example.com" % stamp
    password = "senha123"

    driver.get(base_url + "/index.html")
    second_driver.get(base_url + "/index.html")

    with ThreadPoolExecutor(max_workers=2) as pool:
        future_a = pool.submit(_post_signup_async, driver, base_url, email, password, "Race A")
        future_b = pool.submit(_post_signup_async, second_driver, base_url, email, password, "Race B")
        result_a = future_a.result()
        result_b = future_b.result()

    outcomes = [result_a, result_b]
    successes = [r for r in outcomes if r["status"] == 200 and r["body"].get("ok") is True]
    failures = [r for r in outcomes if r not in successes]

    assert len(successes) == 1, "expected exactly one account to be created, got: %s" % outcomes
    assert len(failures) == 1, "expected exactly one duplicate rejection, got: %s" % outcomes
    assert failures[0]["status"] >= 400
