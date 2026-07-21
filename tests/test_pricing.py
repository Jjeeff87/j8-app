"""
Money-correctness checks: cent/rounding precision, currency conversion, and
the "welcome discount" math (public/app.js: aplicarDesconto / fmtParDesconto).

These target the class of bug that's easy to miss in a demo but embarrassing
in production: a total that doesn't add back up once a percentage discount
is rounded for display. See the regression tests below for a real example
that was caught and fixed while writing this suite (a total of €65 used to
show "-€7" discount but "€59" total — which sum to €66, not €65).
"""

import re

import pytest

from tests.pages.app_page import AppPage


def _start_hair_quote_flow(driver, base_url):
    """Common setup shared by the pricing tests below: sign up, land on the
    Hair category, answer the quiz, and open the budget-quote panel."""
    app_page = AppPage(driver, base_url)
    app_page.choose_category("cabelo_fem")
    app_page.fill_and_submit_quiz(objetivo="frizz", subtom="neutro")
    app_page.activate_budget_quote()
    return app_page


def _parse_discount_pair(preview_text):
    """Extracts (discount_shown, total_shown) as ints from the WhatsApp
    preview text block, e.g. '... -€7' and 'Total com desconto: €59'."""
    disc_match = re.search(r"Desconto de boas-vindas[^:]*:\s*-€(\d+)", preview_text)
    total_match = re.search(r"Total com desconto:\s*€(\d+)", preview_text)
    assert disc_match and total_match, "could not find discount/total lines in:\n%s" % preview_text
    return int(disc_match.group(1)), int(total_match.group(1))


@pytest.mark.regression
@pytest.mark.parametrize("budget", [80, 180, 280, 380, 480, 580, 680, 700])
def test_welcome_discount_and_total_always_sum_back_to_original(driver, base_url, signed_up_user, budget):
    """Regression test for a real rounding bug found while writing this
    suite: the discount amount and the post-discount total used to be
    rounded to whole euros independently, so in most cases they didn't sum
    back to the original quoted total (off by €1 — e.g. €65 total showed as
    '-€7 discount' + '€59 total' = €66). Now both are derived from the same
    rounded total, so this must hold for every reachable budget value."""
    app_page = _start_hair_quote_flow(driver, base_url)
    app_page.set_budget(budget)
    app_page.generate_quote()

    total_raw = app_page.last_quote_total_eur()
    assert total_raw is not None

    discount_shown, total_shown = _parse_discount_pair(app_page.whatsapp_preview_text())

    assert discount_shown + total_shown == round(total_raw), (
        "discount (%d) + total-with-discount (%d) = %d, expected the rounded original total %d"
        % (discount_shown, total_shown, discount_shown + total_shown, round(total_raw))
    )


@pytest.mark.regression
def test_welcome_discount_is_approximately_ten_percent(driver, base_url, signed_up_user):
    """Positive case: the discount shown should be close to 10% of the
    original total (allowing only the ±1 that whole-euro rounding can
    introduce) — guards against the percentage itself silently changing."""
    app_page = _start_hair_quote_flow(driver, base_url)
    app_page.set_budget(300)
    app_page.generate_quote()

    total_raw = app_page.last_quote_total_eur()
    discount_shown, _ = _parse_discount_pair(app_page.whatsapp_preview_text())

    expected_discount = total_raw * 0.10
    assert abs(discount_shown - expected_discount) <= 1, (
        "discount shown (%d) is not ~10%% of the total (%.2f, expected ~%.2f)"
        % (discount_shown, total_raw, expected_discount)
    )


@pytest.mark.regression
def test_budget_slider_minimum_boundary_produces_no_negative_totals(driver, base_url, signed_up_user):
    """Boundary case: the lowest reachable budget (€80, the slider's `min`)
    must never produce a negative remaining balance or a negative-looking
    total in the quote output — the algorithm should gracefully fit what it
    can within the limit instead of overspending it."""
    app_page = _start_hair_quote_flow(driver, base_url)
    app_page.set_budget(80)
    app_page.generate_quote()

    preview = app_page.whatsapp_preview_text()
    total_raw = app_page.last_quote_total_eur()

    assert total_raw is not None and total_raw >= 0
    assert "-€-" not in preview and "€-" not in preview, (
        "found a negative-looking euro amount in the quote preview:\n%s" % preview
    )


@pytest.mark.regression
def test_budget_slider_maximum_boundary_still_balances(driver, base_url, signed_up_user):
    """Boundary case (upper end): the highest reachable budget (€700, the
    slider's `max`) must still produce a discount/total pair that sums back
    to the original total — the same invariant as the mid-range case, at
    the opposite edge of the allowed range."""
    app_page = _start_hair_quote_flow(driver, base_url)
    app_page.set_budget(700)
    app_page.generate_quote()

    total_raw = app_page.last_quote_total_eur()
    discount_shown, total_shown = _parse_discount_pair(app_page.whatsapp_preview_text())

    assert discount_shown + total_shown == round(total_raw)


@pytest.mark.regression
def test_no_nan_or_undefined_leaks_into_quote_preview(driver, base_url, signed_up_user):
    """Negative/defensive case: whatever the budget-fitting math does
    internally, the rendered preview text must never contain a raw 'NaN' or
    'undefined' — a common real-world symptom of an unhandled edge case in
    a discount/pricing calculation reaching production."""
    app_page = _start_hair_quote_flow(driver, base_url)
    app_page.set_budget(80)
    app_page.generate_quote()

    preview = app_page.whatsapp_preview_text()
    assert "NaN" not in preview
    assert "undefined" not in preview


@pytest.mark.regression
def test_currency_toggle_keeps_cart_and_budget_label_consistent(driver, base_url, signed_up_user):
    """Positive case: switching the currency toggle (EUR -> BRL, a fixed
    5.6x rate) must update the budget slider's live label immediately and
    consistently — both reflecting the same underlying EUR amount times the
    same FX rate, not two different stale conversions."""
    app_page = _start_hair_quote_flow(driver, base_url)
    app_page.set_budget(100)

    label_eur = app_page.budget_val_text()
    assert "€" in label_eur

    app_page.set_currency("BRL")
    label_brl = app_page.budget_val_text()
    assert "R$" in label_brl

    eur_amount = int(re.search(r"\d+", label_eur).group())
    brl_amount = int(re.search(r"\d+", label_brl).group())
    assert brl_amount == round(eur_amount * 5.6), (
        "BRL label (%s) is not EUR label (%s) x 5.6" % (label_brl, label_eur)
    )
