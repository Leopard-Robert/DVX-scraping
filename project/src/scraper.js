/**
 * Supreme Tuning - DVX Performance Scraper
 * Puppeteer v24 Compatible Version
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import CONFIG from "./config.js";
import bmwRules from "./bmw-rules.js";
import amgRules from "./amg-rules.js";

// Puppeteer v24 removed page.waitForTimeout() → use this instead
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DVXScraper {
  constructor() {
    this.browser = null;
    this.page = null;

    this.data = {
      brands: [],
      models: [],
      engines: [],
      stages: [],
    };

    this.counters = {
      brandId: 1,
      modelId: 1,
      engineId: 1,
      stageId: 1,
    };
  }

  /** Initialize Puppeteer */
  async init() {
    console.log("🚀 Initializing Puppeteer...");

    this.browser = await puppeteer.launch({
      headless: true, // ensure NO UI opens
      ...CONFIG.puppeteer,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        ...(CONFIG.puppeteer.args || []),
      ],
    });

    this.page = await this.browser.newPage();

    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    console.log("✅ Browser initialized");
  }

  /** Navigate safely */
  async navigateTo(url, waitTime = CONFIG.waitTimes.navigation) {
    try {
      await this.page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await delay(waitTime);
      return true;
    } catch (e) {
      console.error(`❌ Navigation failed: ${url}`, e.message);
      return false;
    }
  }

  /** Wait for selector with fallback */
  async waitForSelector(selector, timeout = 8000) {
    try {
      await delay(200); // fallback small wait
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (err) {
      console.warn(`⚠️ Selector not found: ${selector}`);
      return false;
    }
  }

  /** SCRAPE BRANDS */
  async scrapeBrands() {
    console.log("\n📋 Scraping brands...");

    if (!await this.navigateTo(CONFIG.baseUrl))
      throw new Error("Failed to load main page");

    if (!await this.waitForSelector(CONFIG.selectors.brands))
      throw new Error("Brands not found on page");

    const brands = await this.page.evaluate((sel) => {
      return [...document.querySelectorAll(sel)].map((el) => ({
        name: el.textContent.trim(),
        url: el.href,
      }));
    }, CONFIG.selectors.brands);

    const filtered = brands.filter((b) =>
      CONFIG.targetBrands.some((t) =>
        b.name.toLowerCase().includes(t.toLowerCase())
      )
    );

    console.log(`✅ Found ${filtered.length} target brands`);
    return filtered;
  }

  /** SCRAPE MODELS */
  async scrapeModels(url, brandName) {
    console.log(`\n  📂 Scraping models for ${brandName}...`);

    if (!await this.navigateTo(url)) return [];

    if (!await this.waitForSelector(CONFIG.selectors.models)) return [];

    return await this.page.evaluate((sel) => {
      return [...document.querySelectorAll(sel)].map((el) => ({
        name: el.textContent.trim(),
        url: el.href,
      }));
    }, CONFIG.selectors.models);
  }

  /** SCRAPE TYPES */
  async scrapeTypes(url, modelName) {
    console.log(`    📁 Scraping types for ${modelName}...`);

    if (!await this.navigateTo(url)) return [];
    if (!await this.waitForSelector(CONFIG.selectors.types)) return [];

    return await this.page.evaluate((sel) => {
      return [...document.querySelectorAll(sel)].map((el) => ({
        name: el.textContent.trim(),
        url: el.href,
      }));
    }, CONFIG.selectors.types);
  }

  /** SCRAPE ENGINES */
  async scrapeEngines(url, typeName) {
    console.log(`      🔧 Scraping engines for ${typeName}...`);

    if (!await this.navigateTo(url)) return [];
    if (!await this.waitForSelector(CONFIG.selectors.engines)) return [];

    return await this.page.evaluate((sel) => {
      return [...document.querySelectorAll(sel)].map((el) => {
        const spans = el.querySelectorAll("div span");
        return {
          name: spans[0]?.textContent.trim() || "",
          power: spans[1]?.textContent.trim() || "",
          url: el.href,
        };
      });
    }, CONFIG.selectors.engines);
  }

  /** SCRAPE STAGE PAGE */
async scrapeStageData(engineUrl, engineName) {
  console.log(`        ⚙️ Scraping stages for ${engineName}...`);

  const extractStage = async (url, stageLabel) => {
    if (!await this.navigateTo(url)) {
      console.warn(`        ⚠️ Failed to load ${stageLabel} for ${engineName}`);
      return null;
    }

    await delay(1000);

    return await this.page.evaluate(() => {
      const output = {};

      /* -------------------------------
        HP Extraction
      --------------------------------*/
      function extractHP() {
        const hpBars = document.querySelectorAll(
          "h2 + .improvement + .progress .progress-bar span"
        );

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
        Nm Extraction
      --------------------------------*/
      function extractNm() {
        const nmBars = document.querySelectorAll(
          "h2 + .improvement + .progress .progress-bar span"
        );

        if (nmBars.length >= 4) {
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
        Price Extraction
      --------------------------------*/
      function extractPrice() {
        const oldPrice = document.querySelector(".old-price");
        const newPrice = document.querySelector(".new-price");

        return {
          oldPrice: oldPrice ? oldPrice.innerText.trim() : null,
          newPrice: newPrice ? newPrice.innerText.trim() : null,
        };
      }

      /* -------------------------------
        Engine Name
      --------------------------------*/
      const engineNameEl = document.querySelector(".pricing-table .value");

      output.engineName = engineNameEl?.innerText.trim() || null;
      output.hp = extractHP();
      output.nm = extractNm();
      output.price = extractPrice();

      return output;
    });
  };

  /* ---------------------------------------
    EXTRACT STAGE 1
  ----------------------------------------*/
  const stage1 = await extractStage(engineUrl, "stage 1");

  /* ---------------------------------------
    CONSTRUCT STAGE 2 URL
    Replace last /1 with /2
  ----------------------------------------*/
  let stage2Url = null;

  if (/\/1$/.test(engineUrl)) {
    stage2Url = engineUrl.replace(/\/1$/, "/2");
  }

  // Some URLs end with /1/ (trailing slash)
  if (/\/1\/$/.test(engineUrl)) {
    stage2Url = engineUrl.replace(/\/1\/$/, "/2/");
  }

  /* ---------------------------------------
    EXTRACT STAGE 2 (optional)
  ----------------------------------------*/
  let stage2 = null;
  if (stage2Url) {
    stage2 = await extractStage(stage2Url, "stage 2");

    // If stage2 fails to load, set as null
    if (!stage2 || !stage2.hp) {
      stage2 = null;
    }
  }

  /* ---------------------------------------
    RETURN RESULT
  ----------------------------------------*/
  const result = {
    stage1,
    stage2,
  };

  console.log("        📊 Extracted stage data:", result);
  return result;
}

  /** Generate Stage1+, Stage2+ */
  generatePlusStages(stage1, stage2) {
    const result = [];

    if (stage1?.hp) {
      result.push({ stageName: "Stage 1", ...stage1 });
      result.push({ stageName: "Stage 1+", ...stage1 });
    }
    if (stage2?.hp) {
      result.push({ stageName: "Stage 2", ...stage2 });
      result.push({ stageName: "Stage 2+", ...stage2 });
    }

    return result;
  }

  /** APPLY RULES */
  applyBMWRules(data, brand) {
    if (brand.toLowerCase() !== "bmw") return null;
    return bmwRules.requiresECUUnlock(data)
      ? bmwRules.generateECUUnlockInfo(true)
      : null;
  }

  applyAMGRules(data, brand) {
    if (brand.toLowerCase() !== "mercedes") return null;
    return amgRules.requiresCPCUpgrade(data)
      ? amgRules.generateCPCUpgradeInfo(true)
      : null;
  }

  /** MAIN SCRAPE flow */
  async scrape() {
    try {
      await this.init();

      const brands = await this.scrapeBrands();

      for (const b of brands) {
        const brand = { id: this.counters.brandId++, name: b.name };
        this.data.brands.push(brand);

        const models = await this.scrapeModels(b.url, b.name);

        for (const m of models) {
          const model = {
            id: this.counters.modelId++,
            brandId: brand.id,
            name: m.name,
          };
          this.data.models.push(model);

          const types = await this.scrapeTypes(m.url, m.name);

          for (const t of types) {
            const engines = await this.scrapeEngines(t.url, t.name);

            for (const e of engines) {
              const engine = {
                id: this.counters.engineId++,
                modelId: model.id,
                code:
                  bmwRules.extractEngineCode(e.name) ||
                  amgRules.extractAMGEngineCode(e.name) ||
                  "UNKNOWN",
                name: `${e.name} ${e.power}`.trim(),
              };

              this.data.engines.push(engine);

              const stageData = await this.scrapeStageData(e.url, engine.name);
              // if (!stageData || !stageData.stock) continue;

              const plusStages = this.generatePlusStages(
                stageData.stage1,
                stageData.stage2
              );

              const ruleData = {
                engineCode: engine.code,
                modelName: model.name,
                engineName: engine.name,
                type: t.name,
                year: amgRules.extractYearFromType(t.name),
              };

              // const ecuUnlock = this.applyBMWRules(ruleData, brand.name);
              // const cpcUpgrade = this.applyAMGRules(ruleData, brand.name);

              for (const s of plusStages) {
                this.data.stages.push({
                  id: this.counters.stageId++,
                  engineId: engine.id,
                  stageName: s.stageName,
                  stockHp: s.hp.stockHp || 0,
                  stockNm: s.nm.stockNm || 0,
                  tunedHp: s.hp.tunedHp || 0,
                  tunedNm: s.nm.tunedNm || 0,
                  gainHp: s.hp.hpGain || 0,
                  gainNm: s.nm.nmGain || 0,
                  price: null,
                  currency: "EUR",
                  hardwareMods: [],
                  // ecuUnlock,
                  // cpcUpgrade,
                  gearboxLimitNm: null,
                  recommendedGearboxTune: false,
                  notes: "",
                });
              }
            }
            await this.save(); // Save after each engine
          }
        }
      }

      console.log("\n✅ Scraping completed successfully!");

    } catch (err) {
      console.error("❌ Scraping failed:", err);
      throw err;
    } finally {
      if (this.browser) await this.browser.close();
    }
  }

  /** SAVE TO JSON */


  async save() {
    const dir = path.dirname(CONFIG.outputPath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(this.data, null, 2));
    console.log(`💾 Data saved to ${CONFIG.outputPath}`);
  }

  async run() {
    console.log("🎯 Supreme Tuning - DVX Scraper\n==============================\n");

    try {
      await this.scrape();
      await this.save();
      console.log("🎉 All done!");
    } catch (err) {
      console.error("💥 Fatal error:", err);
      process.exit(1);
    }
  }
}

// RUN IMMEDIATELY
const scraper = new DVXScraper();
scraper.run();

export default DVXScraper;
