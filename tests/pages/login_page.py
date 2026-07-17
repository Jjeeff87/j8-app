"""Page object for index.html (login / sign up)."""

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
        self.driver.find_element(*self.SIGNUP_PASSWORD).send_keys(password)
        self.driver.find_element(*self.SIGNUP_SUBMIT).click()
        self.wait.until(EC.url_contains("app.html"))

    def log_in(self, email, password):
        self.driver.find_element(*self.LOGIN_EMAIL).send_keys(email)
        self.driver.find_element(*self.LOGIN_PASSWORD).send_keys(password)
        self.driver.find_element(*self.LOGIN_SUBMIT).click()

    def wait_for_app(self):
        self.wait.until(EC.url_contains("app.html"))

    def error_text(self):
        return self.driver.find_element(*self.ERROR_BOX).text
