/**
 * Supreme Tuning - DVX Performance Scraper
 * 
 * Scrapes tuning data from DVX Performance website and generates
 * supreme-tuning-master.json with BMW/AMG business rules applied.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CONFIG from './config.js';
import bmwRules from './bmw-rules.js';
import amgRules from './amg-rules.js';

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
      stages: []
    };
    this.counters = {
      brandId: 1,
      modelId: 1,
      engineId: 1,
      stageId: 1
    };
  }

  /**
   * Initialize browser and page
   */
  async init() {
    console.log('🚀 Initializing Puppeteer...');
    this.browser = await puppeteer.launch(CONFIG.puppeteer);
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid detection
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    console.log('✅ Browser initialized');
  }

  /**
   * Navigate to URL with retry logic
   */
  async navigateTo(url, waitTime = CONFIG.waitTimes.navigation) {
    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      await this.page.waitForTimeout(waitTime);
      return true;
    } catch (error) {
      console.error(`❌ Navigation failed: ${url}`, error.message);
      return false;
    }
  }

  /**
   * Wait for selector with timeout
   */
  async waitForSelector(selector, timeout = 10000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.warn(`⚠️  Selector not found: ${selector}`);
      return false;
    }
  }

  /**
   * Extract brands from the main page
   */
  async scrapeBrands() {
    console.log('\n📋 Scraping brands...');
    
    if (!await this.navigateTo(CONFIG.baseUrl)) {
      throw new Error('Failed to load main page');
    }

    // Wait for brands to load
    if (!await this.waitForSelector(CONFIG.selectors.brands)) {
      throw new Error('Brands not found on page');
    }

    const brands = await this.page.evaluate((selector) => {
      const brandElements = document.querySelectorAll(selector);
      return Array.from(brandElements).map(el => ({
        name: el.textContent.trim(),
        url: el.href
      }));
    }, CONFIG.selectors.brands);

    // Filter to target brands only
    const filteredBrands = brands.filter(brand => 
      CONFIG.targetBrands.some(target => 
        brand.name.toLowerCase().includes(target.toLowerCase())
      )
    );

    console.log(`✅ Found ${filteredBrands.length} target brands`);
    return filteredBrands;
  }

  /**
   * Scrape models for a brand
   */
  async scrapeModels(brandUrl, brandName) {
    console.log(`\n  📂 Scraping models for ${brandName}...`);
    
    if (!await this.navigateTo(brandUrl)) {
      console.warn(`  ⚠️  Failed to load models for ${brandName}`);
      return [];
    }

    if (!await this.waitForSelector(CONFIG.selectors.models, 5000)) {
      console.warn(`  ⚠️  No models found for ${brandName}`);
      return [];
    }

    const models = await this.page.evaluate((selector) => {
      const modelElements = document.querySelectorAll(selector);
      return Array.from(modelElements).map(el => ({
        name: el.textContent.trim(),
        url: el.href
      }));
    }, CONFIG.selectors.models);

    console.log(`  ✅ Found ${models.length} models`);
    return models;
  }

  /**
   * Scrape types for a model
   */
  async scrapeTypes(modelUrl, modelName) {
    console.log(`    📁 Scraping types for ${modelName}...`);
    
    if (!await this.navigateTo(modelUrl)) {
      console.warn(`    ⚠️  Failed to load types for ${modelName}`);
      return [];
    }

    if (!await this.waitForSelector(CONFIG.selectors.types, 5000)) {
      console.warn(`    ⚠️  No types found for ${modelName}`);
      return [];
    }

    const types = await this.page.evaluate((selector) => {
      const typeElements = document.querySelectorAll(selector);
      return Array.from(typeElements).map(el => ({
        name: el.textContent.trim(),
        url: el.href
      }));
    }, CONFIG.selectors.types);

    console.log(`    ✅ Found ${types.length} types`);
    return types;
  }

  /**
   * Continue in next part...
   */
}

export default DVXScraper;

