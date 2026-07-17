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
    PAINEL_AVALIACAO = (By.ID, "painelAvaliacao")
    PAINEL_MAQUILHAGEM = (By.ID, "painelMaquilhagem")
    PAINEL_SKINCARE = (By.ID, "painelSkincare")
    MAIN_TABS = (By.ID, "mainTabs")
    MAQUILHAGEM_GRID = (By.ID, "maquilhagemGrid")
    SKINCARE_GRID = (By.ID, "skincareGrid")
    ITEM_CHECKBOX = (By.CSS_SELECTOR, "#{container} .item-check")
    FT_TOGGLE = (By.CSS_SELECTOR, "#{container} .ft-toggle")
    VIDEO_IFRAME = (By.CSS_SELECTOR, "#{container} .video-embed iframe")

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
    CART_TOTAL_BOX_MAQUILHAGEM = (By.ID, "carrinhoTotalBoxMaquilhagem")
    CART_TOTAL_BOX_SKINCARE = (By.ID, "carrinhoTotalBoxSkincare")

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

    def go_back_to_hair(self, key="cabelo_fem"):
        """Categories switch via the pill bar now (the old dedicated 'voltar'
        button was removed once Makeup/Skincare became real catalogs)."""
        self.switch_category(key)
        self.wait.until(EC.visibility_of_element_located(self.PAINEL_AVALIACAO))

    def maquilhagem_visible(self):
        self.wait.until(EC.visibility_of_element_located(self.PAINEL_MAQUILHAGEM))
        return self.driver.find_element(*self.PAINEL_MAQUILHAGEM).is_displayed()

    def skincare_visible(self):
        self.wait.until(EC.visibility_of_element_located(self.PAINEL_SKINCARE))
        return self.driver.find_element(*self.PAINEL_SKINCARE).is_displayed()

    def main_tabs_hidden(self):
        el = self.driver.find_element(*self.MAIN_TABS)
        return el.value_of_css_property("display") == "none"

    def product_cards_in(self, container_id):
        locator = (By.CSS_SELECTOR, "#{0} .product-card".format(container_id))
        self.wait.until(EC.visibility_of_element_located(locator))
        return self.driver.find_elements(*locator)

    def check_first_item(self, container_id):
        locator = (By.CSS_SELECTOR, self.ITEM_CHECKBOX[1].format(container=container_id))
        self.driver.find_elements(*locator)[0].click()

    def expand_first_ficha(self, container_id):
        locator = (By.CSS_SELECTOR, self.FT_TOGGLE[1].format(container=container_id))
        self.driver.find_elements(*locator)[0].click()

    def video_iframe_src(self, container_id):
        locator = (By.CSS_SELECTOR, self.VIDEO_IFRAME[1].format(container=container_id))
        self.wait.until(EC.presence_of_element_located(locator))
        return self.driver.find_element(*locator).get_attribute("src")

    def cart_total_maquilhagem_text(self):
        return self.driver.find_element(*self.CART_TOTAL_BOX_MAQUILHAGEM).text

    def cart_total_skincare_text(self):
        return self.driver.find_element(*self.CART_TOTAL_BOX_SKINCARE).text

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
