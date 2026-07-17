"""
Shared pytest fixtures for the J8 Selenium test suite.

Runs against a live instance of the app — either the local `node server.js`
process (default, http://localhost:3000) or the deployed Render URL, via the
BASE_URL environment variable:

    BASE_URL=https://j8-app.onrender.com pytest

By default the browser runs headless (HEADLESS=1). Set HEADLESS=0 to watch
the tests run in a real window while debugging locally.
"""

import os
import time
import uuid

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000").rstrip("/")
HEADLESS = os.environ.get("HEADLESS", "1") != "0"


def pytest_addoption(parser):
    parser.addoption(
        "--base-url",
        action="store",
        default=None,
        help="Override the app URL under test (else BASE_URL env var / localhost:3000).",
    )


@pytest.fixture(scope="session")
def base_url(request):
    return request.config.getoption("--base-url") or BASE_URL


@pytest.fixture
def driver():
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")

    chrome_binary = os.environ.get("CHROME_BINARY")
    if chrome_binary:
        options.binary_location = chrome_binary

    drv = webdriver.Chrome(options=options)
    drv.implicitly_wait(5)
    yield drv
    drv.quit()


@pytest.fixture
def unique_credentials():
    """A fresh, never-used-before email + password for tests that sign up."""
    stamp = uuid.uuid4().hex[:10]
    return {
        "nome": "QA Automation",
        "email": f"qa-{stamp}@example.com",
        "password": "senha123",
    }


@pytest.fixture
def signed_up_user(driver, base_url, unique_credentials):
    """Signs up a brand-new account and leaves the browser on app.html,
    logged in — the common starting point for most flow tests."""
    from tests.pages.login_page import LoginPage

    login_page = LoginPage(driver, base_url)
    login_page.open()
    login_page.go_to_signup_tab()
    login_page.sign_up(
        unique_credentials["nome"],
        unique_credentials["email"],
        unique_credentials["password"],
    )
    # small settle delay for the app.html bootstrap fetch("/api/me")
    time.sleep(0.3)
    return unique_credentials
