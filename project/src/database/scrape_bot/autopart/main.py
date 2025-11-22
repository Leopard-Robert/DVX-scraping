import requests
from bs4 import BeautifulSoup
import json
import time
import sys

BASE = "https://www.autoparts-24.com"

headers = {
    "User-Agent": "Mozilla/5.0 (Python scraper)"
}

# ------------------------
# SCRAPE SINGLE ENGINE PAGE
# ------------------------
def scrape_engine_page(url):
    print("Scraping engine:", url)
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")

    data = {}

    content = soup.find("div", class_="-m-ph-small -m-pv-small box--m-w100p")
    # print(content)

    # ----------------------------
    # 1) PARSE ENGINE INFORMATION
    # ----------------------------
    engine_info = {}
    cols = content.select(".engine_code_stats td")

    for i in range(0,len(cols),2) :
        key = cols[i].get_text(strip=True).replace(":", "")
        val = cols[i+1].get_text(strip=True)

        engine_info[key] = val
    print(engine_info)
    # ----------------------------
    # 2) PARSE CARS / COMPATIBILITY
    # ----------------------------
       
    models_table = soup.find("table", id="models")
    models = []

    current_category = None
    current_group = None

    if models_table:
        for tr in models_table.find_all("tr"):
            # Category row
            cat_div = tr.find("div", class_="faq__category")
            if cat_div:
                current_category = cat_div.get_text(strip=True)
                continue

            tds = tr.find_all("td")
            if not tds:
                continue

            # Group row
            h4 = tds[0].find("h4") if tds[0] else None
            if h4:
                current_group = h4.get_text(strip=True)
                model_name = tds[1].get_text(strip=True) if len(tds) > 1 else ""
                years = tds[2].get_text(strip=True) if len(tds) > 2 else ""
                models.append({
                    "category": current_category,
                    "group": current_group,
                    "model": model_name,
                    "years": years
                })
            # Additional model row
            elif len(tds) >= 2:
                model_name = tds[0].get_text(strip=True) if len(tds) > 1 else ""
                years = tds[1].get_text(strip=True) if len(tds) > 1 else ""
                models.append({
                    "category": current_category,
                    "group": current_group,
                    "model": model_name,
                    "years": years
                })


    # ----------------------------
    # OUTPUT STRUCTURED DATA
    # ----------------------------
    result = {
        "engine_info": engine_info,
        "cars": models
    }
    print(result)
    return result


# ------------------------
# SCRAPE ALL ENGINE LINKS
# ------------------------
def scrape_engine_list(start_url):
    print("Fetching engine list:", start_url)
    r = requests.get(start_url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")

    links = []

    # All engine link elements
    for a in soup.select("div.link-grid a"):
        href = a.get("href")
        if href and href.startswith("/engine/code/"):
            full_url = BASE + href
            links.append(full_url)

    return list(set(links))  # remove duplicates


# ------------------------
# MAIN SCRAPER
# ------------------------
def run(arg):
    start_url = "https://www.autoparts-24.com/engine/code/"+arg
    engine_links = scrape_engine_list(start_url)

    print(f"Found {len(engine_links)} engine pages.")

    all_data = []

    for url in engine_links:
        try:
            data = scrape_engine_page(url)
            all_data.append(data)

            time.sleep(1)  # be polite
        except Exception as e:
            print("Error:", e)

    # SAVE OUTPUT
    with open(arg+"_engines.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)

    print("Scraping completed! Data saved to audi_engines.json")

# start_url = "https://www.autoparts-24.com/engine/code/audi/"

if len(sys.argv) < 2:
    print("Please provide an argument!")
    sys.exit(1)

arg = sys.argv[1]  # first argument


# if __name__ == "__main__":
#     run(arg)


scrape_engine_page(arg)