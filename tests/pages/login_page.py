"""Page object for index.html (login / sign up)."""

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LoginPage:
    URL_PATH = "/index.html"

    SIGNUP_TAB = (By.CSS_SELECTOR, '.tab[data-tab="signup"]')
    LOGIN_TAB = (By.CSS_SELECTOR, '.tab[data-tab="login"]')

    LOGIN_EMAIL = (By.ID, "loginEmail")
    LOGIN_PASSWORD = (By.ID, "loginPassword")
    LOGIN_SUBMIT = (By.CSS_SELECTOR, "#loginForm button[type=submit]")

    SIGNUP_NOME = (By.ID, "signupNome")
    SIGNUP_EMAIL = (By.ID, "signupEmail")
    SIGNUP_PASSWORD = (By.ID, "signupPassword")
    SIGNUP_SUBMIT = (By.CSS_SELECTOR, "#signupForm button[type=submit]")

    ERROR_BOX = (By.ID, "erroBox")

    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)

    def open(self):
        self.driver.get(self.base_url + self.URL_PATH)
        self.wait.until(EC.presence_of_element_located(self.LOGIN_EMAIL))
        return self

    def go_to_signup_tab(self):
        self.driver.find_element(*self.SIGNUP_TAB).click()
        self.wait.until(EC.visibility_of_element_located(self.SIGNUP_EMAIL))
        return self

    def go_to_login_tab(self):
        self.driver.find_element(*self.LOGIN_TAB).click()
        self.wait.until(EC.visibility_of_element_located(self.LOGIN_EMAIL))
        return self

    def sign_up(self, nome, email, password):
        self.driver.find_element(*self.SIGNUP_NOME).send_keys(nome)
        self.driver.find_element(*self.SIGNUP_EMAIL).send_keys(email)
        pw_el = self.driver.find_element(*self.SIGNUP_PASSWORD)
        pw_el.send_keys(password)
        self.driver.find_element(*self.SIGNUP_SUBMIT).click()
        if not self.driver.execute_script("return arguments[0].checkValidity();", pw_el):
            # The password input has minlength="6" — the browser's own HTML5
            # constraint validation blocks the submit client-side before any
            # request reaches the server (e.g. a 3- or 5-character password).
            # No app.js/server code ran at all, so there's nothing else to
            # wait for: this IS the outcome.
            return
        self._wait_for_outcome()

    def signup_password_client_invalid(self):
        """True if the signup password field currently fails the browser's
        own HTML5 constraint validation (minlength=6) — i.e. the form was
        blocked from ever submitting, before app.js or the server saw it."""
        el = self.driver.find_element(*self.SIGNUP_PASSWORD)
        return not self.driver.execute_script("return arguments[0].checkValidity();", el)

    def log_in(self, email, password):
        self.driver.find_element(*self.LOGIN_EMAIL).send_keys(email)
        self.driver.find_element(*self.LOGIN_PASSWORD).send_keys(password)
        self.driver.find_element(*self.LOGIN_SUBMIT).click()
        self._wait_for_outcome()

    def _wait_for_outcome(self):
        """Wait for whichever happens first after a login/signup submit: a
        redirect to app.html (success) or the error banner getting text
        (failure). Using a single either/or wait — instead of only waiting
        for the redirect — means negative-path tests resolve as soon as the
        error appears instead of blocking for the full timeout, and it
        removes the race condition where an assertion on error_text() could
        run before the async fetch()/response has finished rendering it."""
        self.wait.until(lambda d: "app.html" in d.current_url or self.error_text() != "")

    def wait_for_app(self):
        self.wait.until(EC.url_contains("app.html"))

    def error_text(self):
        try:
            return self.driver.find_element(*self.ERROR_BOX).text
        except NoSuchElementException:
            return ""
