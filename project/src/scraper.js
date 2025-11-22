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

import axios from "axios";

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
      types: [],
      engines: [],
      stages: [],
    };

    this.counters = {
      brandId: 1,
      typeId: 1,
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

  /** Query Python FastAPI server for engine code */
  async queryPythonEngine(queryText) {
    try {
      const response = await axios.post("http://127.0.0.1:8000/query", {
        text: queryText,
      });
      const results = response.data.results;
      if (results && results.length > 0) {
        // return top 1 result
        return results[0];
      }
      return null;
    } catch (err) {
      console.error("❌ Error querying Python:", err.message);
      return null;
    }
  }

  /**NOMALIZE ENGINE TYPE */
  async nomalizeString(str) {
    return str.replace(/JUST ADDED!|DEVELOPMENT/gi, "").trim();
  }

  /** Navigate safely */
  async navigateTo(url, waitTime = CONFIG.waitTimes.navigation) {
    try {
      await this.page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 500000,
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



    return await this.page.evaluate((sel, typeSel) => {
      return [...document.querySelectorAll(sel)].map((el) => {
        const typeMap = {
          "Diesel": "Diesel",
          "Benzine": "petrol",
          "Hybride": "hybrid"
        };
        const spans = el.querySelectorAll("div span");
        const engineType = el.closest(".col-md-6")?.querySelector(typeSel);
        return {
          name: spans[spans.length - 2]?.textContent.trim() || "",
          power: spans[spans.length - 1]?.textContent.trim().replace("PK", "HP") || "",
          url: el.href,
          type: engineType?.textContent.trim() || "",
        };
      });
    }, CONFIG.selectors.engines, CONFIG.selectors.engineType);
  }

  /** SCRAPE STAGE PAGE */
  async scrapeStageData(engineUrl, engineName, maxStage = null, fillMissingStages = false) {
    console.log(`        ⚙️ Scraping stages for ${engineName}...`);

    const extractStage = async (url, stageNumber) => {
      if (!await this.navigateTo(url)) {
        console.warn(`        ⚠️ Failed to load stage ${stageNumber} for ${engineName}`);
        return null;
      }

      await delay(1000);

      return await this.page.evaluate((selectors) => {
        const output = {};

        // HP Extraction
        const hpBars = document.querySelectorAll(selectors.hpBars);
        if (hpBars.length >= 2) {
          const stockHp = parseInt(hpBars[0].innerText.replace(/[^0-9]/g, ""));
          const tunedHp = parseInt(hpBars[1].innerText.replace(/[^0-9]/g, ""));
          output.hp = { stockHp, tunedHp, hpGain: tunedHp - stockHp };
        }

        // Nm Extraction
        const nmBars = document.querySelectorAll(selectors.nmBars);
        if (nmBars.length >= 4) {
          const stockNm = parseInt(nmBars[2].innerText.replace(/[^0-9]/g, ""));
          const tunedNm = parseInt(nmBars[3].innerText.replace(/[^0-9]/g, ""));
          output.nm = { stockNm, tunedNm, nmGain: tunedNm - stockNm };
        }

        // Price Extraction
        const oldPriceEl = document.querySelector(selectors.oldPrice);
        const newPriceEl = document.querySelector(selectors.newPrice);
        output.price = {
          oldPrice: oldPriceEl?.innerText.trim() || null,
          newPrice: newPriceEl?.innerText.trim() || null,
        };

        // Engine name
        const engineNameEl = document.querySelector(selectors.engineName);
        output.engineName = engineNameEl?.innerText.trim() || null;

        return output;
      }, CONFIG.selectors);
    };

    const stages = [];
    let stageNumber = 1;
    let lastValidStage = null;

    while (true) {
      if (maxStage && stageNumber > maxStage) break;

      // Construct stage URL dynamically
      let stageUrl = engineUrl.replace(/\/\d+\/?$/, `/${stageNumber}`);
      const stageData = await extractStage(stageUrl, stageNumber);

      if (!stageData || (!stageData.hp && !stageData.nm && !stageData.price)) {
        if (fillMissingStages && lastValidStage) {
          // Copy last valid stage
          stages.push({ ...lastValidStage, copiedFromStage: stageNumber - 1 });
        } else {
          break; // stop scraping
        }
      } else {
        stages.push(stageData);
        lastValidStage = stageData;
      }

      stageNumber++;
    }

    console.log(`        📊 Extracted ${stages.length} stage(s) for ${engineName}`);
    return stages;
  }

  /** Generate Stage1+, Stage2+ ...*/
  generatePlusStages(stageData) {
    const result = [];

    if (!stageData || stageData.length === 0) return result;

    for (const stage of stageData) {
      if (stage?.hp) {
        result.push({ stageName: `Stage ${stageData.indexOf(stage) + 1}`, ...stage });
        result.push({ stageName: `Stage ${stageData.indexOf(stage) + 1}+`, ...stage });
      }
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
    if (!amgRules.isAMGModel(data.modelName)) return null;
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
            const type = {
              id: this.counters.typeId++,
              modelId: model.id,
              brandId: brand.id,
              brandName: brand.name,
              modelName: model.name,
              name: t.name,
            };
            this.data.types.push(type);

            const engines = await this.scrapeEngines(t.url, t.name);

            for (const e of engines) {

              const engine = {
                id: this.counters.engineId++,
                typeId: type.id,
                modelId: model.id,
                code: null,
                name: `${e.name}`.trim(),
                startYear: null,
                endYear: null,
                type: e.type
              };

              // --- Python integration ---
              const queryText = `${brand.name} | ${model.name} | ${type.name} | ${engine.name} | ${e.power} | ${e.type}`;
              console.log(queryText);
              const topPythonResult = await this.queryPythonEngine(queryText);

              if (topPythonResult) {
                engine.code = topPythonResult.engine_code;
              }

              // engine.name = await this.nomalizeString(engine.name);

              // Match period formats: "YYYY - YYYY", "YYYY->YYYY", or single year "YYYY"
              const fullPeriodMatch = type.name.match(/(\d{4}).*?(\d{4})/); // e.g., 2010-2015
              const endYearMatch = type.name.match(/->\s*(\d{4})/);           // e.g., -> 2022
              const singleYearMatch = type.name.match(/(\d{4})/);             // any single year

              if (fullPeriodMatch) {
                engine.startYear = fullPeriodMatch[1];
                engine.endYear = fullPeriodMatch[2];
              } else if (endYearMatch) {
                engine.startYear = null;
                engine.endYear = endYearMatch[1];
              } else if (singleYearMatch) {
                engine.startYear = singleYearMatch[1];
                engine.endYear = "now";
              } else {
                engine.startYear = null;
                engine.endYear = "now";
              }

              this.data.engines.push(engine);

              const stageData = await this.scrapeStageData(e.url, engine.name, 2);

              // if (!stageData || !stageData.stock) continue;

              const plusStages = this.generatePlusStages(stageData);

              const ruleData = {
                engineCode: engine.code,
                modelName: model.name,
                engineName: engine.name,
                type: t.name,

                year: amgRules.extractYearFromType(t.name),
              };

              const ecuUnlock = this.applyBMWRules(ruleData, brand.name);
              const cpcUpgrade = this.applyAMGRules(ruleData, brand.name);

              console.log(`        Engine: ${engine.code} `);

              console.log(ecuUnlock ? "     🔒 ECU Unlock required" : "   🔓ECU Unlock not required");
              console.log(cpcUpgrade ? "     🚗 CPC Upgrade required" : "   🚗CPC Upgrade not required");

              console.log(ecuUnlock);
              console.log(cpcUpgrade);

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
                  oldPrice: s.price.oldPrice || null,
                  newPrice: s.price.newPrice || null,
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
