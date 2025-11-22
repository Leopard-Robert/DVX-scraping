import puppeteer from "puppeteer";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function scrapeDVXStagePage(url) {
  console.log(`🔍 Loading DVX Stage Page: ${url}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  await delay(1000);

  const result = await page.evaluate(() => {
    const output = {};
    /* -------------------------------
       1. Extract HP Values
          Example:
          Stock: 95 PK →
          Tuned: 135 PK
    ----------------------------------*/
    function extractHP() {
      const hpBars = document.querySelectorAll("h2 + .improvement + .progress .progress-bar span");

      if (hpBars.length >= 2) {
        const stockHpText = hpBars[0].innerText.replace("→", "").trim();
        const tunedHpText = hpBars[1].innerText.trim();

        const stockHp = parseInt(stockHpText.replace(/[^0-9]/g, ""));
        const tunedHp = parseInt(tunedHpText.replace(/[^0-9]/g, ""));

        return {
          stockHp,
          tunedHp,
          hpGain: tunedHp - stockHp,
        };
      }
      return null;
    }

    /* -------------------------------
       2. Extract Nm Values
          Example:
          Stock: 160Nm →
          Tuned: 240Nm
    ----------------------------------*/
    function extractNm() {
    //   const nmBars = document.querySelectorAll("h2 + .progress + h2 + .improvement + .progress .progress-bar span");
    const nmBars = document.querySelectorAll("h2 + .improvement + .progress .progress-bar span");

      if (nmBars.length >= 2) {
        const stockNmText = nmBars[2].innerText.replace("→", "").trim();
        const tunedNmText = nmBars[3].innerText.trim();

        const stockNm = parseInt(stockNmText.replace(/[^0-9]/g, ""));
        const tunedNm = parseInt(tunedNmText.replace(/[^0-9]/g, ""));

        return {
          stockNm,
          tunedNm,
          nmGain: tunedNm - stockNm,
        };
      }
      return null;
    }

    /* -------------------------------
       3. Extract Price
          Example:
            old: € 499
            new: € 399
    ----------------------------------*/
    function extractPrice() {
      const oldPrice = document.querySelector(".old-price");
      const newPrice = document.querySelector(".new-price");

      return {
        oldPrice: oldPrice ? oldPrice.innerText.trim() : null,
        newPrice: newPrice ? newPrice.innerText.trim() : null,
      };
    }

    /* -------------------------------
       4. Extract Engine Name
          Example:
          25 TFSi - 1.0T
    ----------------------------------*/
    const engineName = document.querySelector(".pricing-table .value");
    output.engineName = engineName?.innerText.trim() || null;

    // Add extracted blocks
    output.hp = extractHP();
    output.nm = extractNm();
    output.price = extractPrice();

    return output;
  });

  await browser.close();
  return result;
}

// Test run
scrapeDVXStagePage("https://dvxperformance.com/dvxsteenokkerzeel/stage/audi/a1/gb-2018-/6915/25-tfsi-10t/1")
  .then(console.log);
