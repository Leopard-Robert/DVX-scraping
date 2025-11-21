from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import json

target_brands = [
    'Audi', 'BMW', 'Mercedes', 'Volkswagen', 'Porsche',
    'Cupra', 'Skoda', 'Seat', 'Mini', 'Lamborghini', 
    'Bentley', 'Aston Martin'
]

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

driver.get("https://www.proxyparts.com/wiki/engine-codes/")

# --- Close cookie modal ---
try:
    close_btn = wait.until(EC.element_to_be_clickable((By.ID, "btCloseCookie")))
    close_btn.click()
    time.sleep(0.5)
except:
    pass

# --- Get all makes from <select> and filter by target_brands ---
make_select = driver.find_element(By.ID, "objmake")
all_makes = [option.get_attribute("value") for option in make_select.find_elements(By.TAG_NAME, "option") if option.get_attribute("value")]
makes = [m for m in all_makes if m in target_brands]
print("Target makes found:", makes)

engine_data = {}

# --- Loop through target makes ---
for make in makes:
    time.sleep(1)

    # Visit main page again to refresh the make/model dropdown
    driver.get("https://www.proxyparts.com/wiki/engine-codes/")
    try:
        close_btn = driver.find_element(By.ID, "btCloseCookie")
        close_btn.click()
        time.sleep(0.5)
    except:
        pass

    # Select make in <select> to populate models
    make_select = driver.find_element(By.ID, "objmake")
    for option in make_select.find_elements(By.TAG_NAME, "option"):
        if option.get_attribute("value") == make:
            option.click()
            break
    time.sleep(2)  # Wait for models to populate

    model_select = driver.find_element(By.ID, "objmodel")
    models = [option.get_attribute("value") for option in model_select.find_elements(By.TAG_NAME, "option") if option.get_attribute("value")]

    print(f"{make} models:", models)

    # --- Loop through models and scrape engine codes ---
    for model in models:
        url = f"https://www.proxyparts.com/wiki/engine-codes/make/{make.lower()}/model/{model.lower()}/"
        driver.get(url)
        time.sleep(1)

        try:
            driver.find_element(By.ID, "btCloseCookie").click()
            time.sleep(1)
        except:
            pass

        page_soup = BeautifulSoup(driver.page_source, "html.parser")
        codes_div = page_soup.find("div", class_="codes")
        if not codes_div:
            continue

        result = {}
        for code_header in codes_div.find_all("h2"):
            engine_code = code_header.get("id")
            table = code_header.find_next_sibling("table")
            if not table:
                continue
            cars_list = []
            for row in table.find_all("tr", class_="data"):
                tds = row.find_all("td")
                make_td = tds[0].get_text(strip=True)
                year_td = tds[1]
                year_rows = [div.span.get_text(strip=True) for div in year_td.find_all("div", class_="row")]
                years_text = ", ".join([y for y in year_rows if y])
                cars_list.append({
                    "category": make_td,
                    "group": make_td,
                    "model": make_td,
                    "years": years_text if years_text else "-"
                })

            result[engine_code.upper()] = {
                "engine_info": {
                    "Enginecode": engine_code.upper(),
                    "Motortype": None,
                    "Cylinder": None,
                    "Valves": None,
                    "Cylindercapacity CCM": None,
                    "Horsepower (HP)": None
                },
                "cars": cars_list,
                "tokens": {
                    "model": [c["model"].replace(" ","").lower() for c in cars_list],
                    "year": [c["years"] for c in cars_list],
                    "engine_type": None,
                    "engine_name": engine_code.lower()
                }
            }
            print(result)


driver.quit()

# --- Save to JSON ---
with open("engine_codes.json", "w", encoding="utf-8") as f:
    json.dump(engine_data, f, indent=4, ensure_ascii=False)

print("Done! Total engine codes:", len(engine_data))
