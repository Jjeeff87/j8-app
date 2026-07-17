"""Page object for the 'Agenda & Pedidos' tab inside app.html."""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class AgendaPage:
    AGENDA_TAB = (By.CSS_SELECTOR, '#mainTabs .tab[data-tab="agenda"]')
    PROF_CARD = (By.CSS_SELECTOR, ".prof-card")
    SLOT_BTN = (By.CSS_SELECTOR, ".slot-btn")
    MARCAR_MSG = (By.ID, "marcarMsg")
    MINHAS_MARCACOES = (By.ID, "minhasMarcacoes")

    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)

    def open_tab(self):
        self.driver.find_element(*self.AGENDA_TAB).click()
        self.wait.until(EC.visibility_of_element_located(self.PROF_CARD))

    def book_first_available_slot(self):
        profs = self.driver.find_elements(*self.PROF_CARD)
        assert profs, "expected at least one sample professional"
        profs[0].click()

        self.wait.until(EC.visibility_of_element_located(self.SLOT_BTN))
        slots = self.driver.find_elements(*self.SLOT_BTN)
        assert slots, "expected at least one available slot"
        slots[0].click()

        self.wait.until(
            lambda d: d.find_element(*self.MARCAR_MSG).text.strip() != ""
        )
        return self.driver.find_element(*self.MARCAR_MSG).text

    def my_bookings_text(self):
        return self.driver.find_element(*self.MINHAS_MARCACOES).text
