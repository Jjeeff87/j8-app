"""Page object for app.html — category picker, quiz, cart, gamification."""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class AppPage:
    LOGOUT_BTN = (By.ID, "logoutBtn")

    CATEGORY_PANEL = (By.ID, "painelCategoria")
    CATEGORY_GRID = (By.ID, "categoriaGrid")
    CATEGORY_CARD = (By.CSS_SELECTOR, ".category-card[data-cat='{key}']")
    CATEGORY_BAR = (By.ID, "categoriaBar")
    CATEGORY_PILL = (By.CSS_SELECTOR, "#categoriaBar .category-pill[data-cat='{key}']")

    APP_MAIN = (By.ID, "appMain")
    EM_BREVE_PANEL = (By.ID, "painelEmBreve")
    VOLTAR_CABELO_BTN = (By.ID, "voltarCabeloBtn")

    GAMIFY_BAR = (By.ID, "gamifyBar")
    BADGE_CHIPS = (By.CSS_SELECTOR, ".badge-chip")
    LOCKED_BADGES = (By.CSS_SELECTOR, ".badge-chip.locked")

    QUIZ_FORM = (By.ID, "quizForm")
    OBJETIVO_OPT = (By.CSS_SELECTOR, '.options[data-group="objetivo"] .opt[data-value="{value}"]')
    GENERO_OPT = (By.CSS_SELECTOR, '.options[data-group="genero"] .opt[data-value="{value}"]')
    SUBTOM_OPT = (By.CSS_SELECTOR, '.options[data-group="subtom"] .opt[data-value="{value}"]')
    QUIZ_SUBMIT = (By.CSS_SELECTOR, "#quizForm button[type=submit]")

    RESULTADO = (By.ID, "resultado")
    FASE_CHECKBOX = (By.CSS_SELECTOR, ".fase-check")
    PRODUCT_CARD = (By.CSS_SELECTOR, ".product-card")
    BRAND_PILL = (By.CSS_SELECTOR, ".brand-pill")
    CART_TOTAL_BOX = (By.ID, "carrinhoTotalBox")

    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)

    # ---------- categoria ----------

    def category_panel_visible(self):
        return self.driver.find_element(*self.CATEGORY_PANEL).is_displayed()

    def choose_category(self, key):
        locator = (By.CSS_SELECTOR, self.CATEGORY_CARD[1].format(key=key))
        self.wait.until(EC.element_to_be_clickable(locator)).click()
        self.wait.until(EC.visibility_of_element_located(self.APP_MAIN))

    def switch_category(self, key):
        locator = (By.CSS_SELECTOR, self.CATEGORY_PILL[1].format(key=key))
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def go_back_to_hair(self):
        self.driver.find_element(*self.VOLTAR_CABELO_BTN).click()

    def em_breve_visible(self):
        return self.driver.find_element(*self.EM_BREVE_PANEL).is_displayed()

    # ---------- quiz ----------

    def fill_and_submit_quiz(self, objetivo="frizz", genero=None, subtom="neutro"):
        self.driver.find_element(By.CSS_SELECTOR, self.OBJETIVO_OPT[1].format(value=objetivo)).click()
        if genero:
            self.driver.find_element(By.CSS_SELECTOR, self.GENERO_OPT[1].format(value=genero)).click()
        self.driver.find_element(By.CSS_SELECTOR, self.SUBTOM_OPT[1].format(value=subtom)).click()
        self.driver.find_element(*self.QUIZ_SUBMIT).click()
        self.wait.until(EC.visibility_of_element_located(self.RESULTADO))

    def check_all_phases(self):
        for cb in self.driver.find_elements(*self.FASE_CHECKBOX):
            if not cb.is_selected():
                cb.click()

    def cart_total_text(self):
        return self.driver.find_element(*self.CART_TOTAL_BOX).text

    def locked_badge_count(self):
        return len(self.driver.find_elements(*self.LOCKED_BADGES))

    def brand_pill_texts(self):
        return [el.text for el in self.driver.find_elements(*self.BRAND_PILL)]

    def logout(self):
        self.driver.find_element(*self.LOGOUT_BTN).click()
        self.wait.until(EC.url_contains("index.html"))
