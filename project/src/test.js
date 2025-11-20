/**
 * Supreme Tuning - DVX Scraper (Playwright + Cheerio)
 * 
 * Fast, stable, Cloudflare-resistant scraper for DVX Performance.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import HttpsProxyAgent from "https-proxy-agent";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OPTIONAL PROXY (BrightData, Oxylabs, etc.)
const PROXY = process.env.PROXY || null;

const axiosClient = axios.create({
  timeout: 30000,
  httpsAgent: PROXY ? new HttpsProxyAgent(PROXY) : undefined,
});

class DVXScraper {
  constructor() {
    this.browser = null;
    this.page = null;

    this.data = {
      brands: [],
      models: [],
      types: [],
      engines: [],
      stages: []
    };

    this.ids = {
      brand: 1,
      model: 1,
      type: 1,
      engine: 1,
      stage: 1
    };
  }

  // ----------------------------
  // 1. INIT PLAYWRIGHT
  // ----------------------------
  async init() {
    this.browser = await chromium.launch({
      headless: true,
      proxy: PROXY ? { server: PROXY } : undefined,
    });

    this.page = await this.browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    });

    console.log("✅ Playwright initialized");
  }

  // ----------------------------
  // 2. LOAD PAGE (dynamic content)
  // ----------------------------
  async loadDynamic(url) {
    console.log("🌐 Loading:", url);

    try {
      await this.page.goto(url, { waitUntil: "networkidle" });
      await this.page.waitForTimeout(1200);
      return await this.page.content();
    } catch (err) {
      console.warn("⚠️ Dynamic load failed, retrying static:", url);
      return await this.loadStatic(url);
    }
  }

  // ----------------------------
  // 3. LOAD PAGE (static Axios)
  // ----------------------------
  async loadStatic(url) {
    try {
      const res = await axiosClient.get(url);
      return res.data;
    } catch (err) {
      console.error("❌ Static request failed:", url);
      return null;
    }
  }

  // ----------------------------
  // 4. SCRAPE BRANDS
  // ----------------------------
  async scrapeBrands() {
    const html = await this.loadDynamic("https://dvxperformance.com/dvxsteenokkerzeel/reprogramming");
    const $ = cheerio.load(html);

    const brands = [];

    $("a.brand-item").each((i, el) => {
      brands.push({
        id: this.ids.brand++,
        name: $(el).text().trim(),
        url: $(el).attr("href")
      });
    });

    this.data.brands = brands;
    console.log("📦 Brands:", brands.length);
    return brands;
  }

  // ----------------------------
  // 5. SCRAPE MODELS
  // ----------------------------
  async scrapeModels(brand) {
    const html = await this.loadDynamic(brand.url);
    const $ = cheerio.load(html);

    const models = [];

    $("a.model-item").each((i, el) => {
      models.push({
        id: this.ids.model++,
        brandId: brand.id,
        name: $(el).text().trim(),
        url: $(el).attr("href")
      });
    });

    this.data.models.push(...models);
    console.log(`📘 Found ${models.length} models for ${brand.name}`);
    return models;
  }

  // ----------------------------
  // 6. SCRAPE TYPES
  // ----------------------------
  async scrapeTypes(model) {
    const html = await this.loadDynamic(model.url);
    const $ = cheerio.load(html);

    const types = [];

    $("a.type-item").each((i, el) => {
      types.push({
        id: this.ids.type++,
        modelId: model.id,
        name: $(el).text().trim(),
        url: $(el).attr("href")
      });
    });

    this.data.types.push(...types);
    console.log(`📗 Found ${types.length} types for ${model.name}`);
    return types;
  }

  // ----------------------------
  // 7. SCRAPE ENGINES
  // ----------------------------
  async scrapeEngines(type) {
    const html = await this.loadDynamic(type.url);
    const $ = cheerio.load(html);

    const engines = [];

    $("a.engine-item").each((i, el) => {
      const spans = $(el).find("span");
      engines.push({
        id: this.ids.engine++,
        typeId: type.id,
        name: spans.eq(0).text().trim(),
        power: spans.eq(1).text().trim(),
        url: $(el).attr("href")
      });
    });

    this.data.engines.push(...engines);
    console.log(`🔧 Found ${engines.length} engines for ${type.name}`);
    return engines;
  }

  // ----------------------------
  // 8. SCRAPE STAGE DATA
  // ----------------------------
  async scrapeStage(engine) {
    const html = await this.loadDynamic(engine.url);
    const $ = cheerio.load(html);

    const parseHP = text => parseInt((text.match(/(\d+)\s*(HP|PK)/i) || [])[1] || 0);
    const parseNM = text => parseInt((text.match(/(\d+)\s*Nm/i) || [])[1] || 0);

    const stages = [];

    $(".progress-row").each((i, row) => {
      const label = $(row).find(".label").text().trim();
      const bar = $(row).find(".progress-bar").text();

      let stageName = null;
      if (/stock|origineel/i.test(label)) stageName = "Stock";
      if (/stage\s*1/i.test(label)) stageName = "Stage 1";
      if (/stage\s*2/i.test(label)) stageName = "Stage 2";

      if (stageName) {
        stages.push({
          id: this.ids.stage++,
          engineId: engine.id,
          name: stageName,
          hp: parseHP(bar),
          nm: parseNM(bar)
        });
      }
    });

    this.data.stages.push(...stages);
    console.log(`⚙️ Stages extracted: ${stages.length} for ${engine.name}`);
    return stages;
  }

  // ----------------------------
  // 9. MAIN SCRAPER
  // ----------------------------
  async run() {
    await this.init();

    const brands = await this.scrapeBrands();

    for (const brand of brands) {
      const models = await this.scrapeModels(brand);

      for (const model of models) {
        const types = await this.scrapeTypes(model);

        for (const type of types) {
          const engines = await this.scrapeEngines(type);

          for (const engine of engines) {
            await this.scrapeStage(engine);
          }
        }
      }
    }

    await this.save();
    await this.browser.close();

    console.log("\n🎉 Done!");
  }

  // ----------------------------
  // 10. SAVE OUTPUT
  // ----------------------------
  async save() {
    const out = path.join(__dirname, "supreme-tuning-master.json");
    fs.writeFileSync(out, JSON.stringify(this.data, null, 2), "utf8");
    console.log("💾 Saved:", out);
  }
}

// Run
const scraper = new DVXScraper();
scraper.run();

export default DVXScraper;
