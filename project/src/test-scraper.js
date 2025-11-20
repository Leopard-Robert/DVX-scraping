/**
 * Test script for DVX Scraper
 * 
 * This script tests individual components of the scraper
 * without running the full scraping process.
 */

import puppeteer from 'puppeteer';
import CONFIG from './config.js';
import bmwRules from './bmw-rules.js';
import amgRules from './amg-rules.js';

async function testBMWRules() {
  console.log('\n🧪 Testing BMW MG1/MD1 Rules...\n');
  
  const testCases = [
    {
      name: 'BMW M3 G80 (2021) - Should require ECU unlock',
      data: {
        engineCode: 'S58',
        modelName: 'M3',
        engineName: 'S58 3.0L',
        type: 'G80 - 2021 -> ...',
        platformCode: 'G80',
        year: 2021
      }
    },
    {
      name: 'BMW 320d F30 (2015) - Should NOT require ECU unlock',
      data: {
        engineCode: 'B47',
        modelName: '3-Serie',
        engineName: '320d',
        type: 'F30 - 2012 -> 2019',
        platformCode: 'F30',
        year: 2015
      }
    },
    {
      name: 'BMW M5 F90 (2020) - Should require ECU unlock',
      data: {
        engineCode: 'S63',
        modelName: 'M5',
        engineName: 'S63 4.4 V8',
        type: 'F90 - 2018 -> ...',
        platformCode: 'F90',
        year: 2020
      }
    }
  ];
  
  testCases.forEach(test => {
    const requiresUnlock = bmwRules.requiresECUUnlock(test.data);
    const result = requiresUnlock ? '✅ ECU Unlock Required' : '❌ No ECU Unlock';
    console.log(`${test.name}`);
    console.log(`  ${result}`);
    if (requiresUnlock) {
      const unlockInfo = bmwRules.generateECUUnlockInfo(true);
      console.log(`  Note: ${unlockInfo.note.substring(0, 80)}...`);
    }
    console.log('');
  });
}

async function testAMGRules() {
  console.log('\n🧪 Testing AMG CPC Rules...\n');
  
  const testCases = [
    {
      name: 'Mercedes E63 S W213 (2018) - Should require CPC',
      data: {
        engineCode: 'M177',
        modelName: 'E-Klasse',
        engineName: 'E63 S',
        type: 'W213 - 2018 -> ...',
        year: 2018
      }
    },
    {
      name: 'Mercedes AMG GT R C190 (2019) - Should require CPC',
      data: {
        engineCode: 'M178',
        modelName: 'AMG GT',
        engineName: 'AMG GT R',
        type: 'C190 - 2015 -> ...',
        year: 2019
      }
    },
    {
      name: 'Mercedes C63 W204 (2012) - Should NOT require CPC',
      data: {
        engineCode: 'M156',
        modelName: 'C-Klasse',
        engineName: 'C63',
        type: 'W204 - 2008 -> 2014',
        year: 2012
      }
    }
  ];
  
  testCases.forEach(test => {
    const requiresCPC = amgRules.requiresCPCUpgrade(test.data);
    const result = requiresCPC ? '✅ CPC Upgrade Required' : '❌ No CPC Upgrade';
    console.log(`${test.name}`);
    console.log(`  ${result}`);
    if (requiresCPC) {
      const cpcInfo = amgRules.generateCPCUpgradeInfo(true);
      console.log(`  Note: ${cpcInfo.note.substring(0, 80)}...`);
    }
    console.log('');
  });
}

async function testSelectors() {
  console.log('\n🧪 Testing DVX Selectors...\n');
  
  const browser = await puppeteer.launch({
    ...CONFIG.puppeteer,
    headless: false
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Loading DVX homepage...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Test brand selector
    console.log('\n🔍 Testing brand selector...');
    const brands = await page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).slice(0, 5).map(el => ({
        text: el.textContent.trim(),
        href: el.href
      }));
    }, CONFIG.selectors.brands);
    
    console.log(`✅ Found ${brands.length} brands (showing first 5):`);
    brands.forEach(b => console.log(`   - ${b.text}`));
    
    // Test clicking on BMW
    const bmwBrand = brands.find(b => b.text.toLowerCase().includes('bmw'));
    if (bmwBrand) {
      console.log('\n📍 Loading BMW models...');
      await page.goto(bmwBrand.href, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
      
      const models = await page.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).slice(0, 5).map(el => ({
          text: el.textContent.trim(),
          href: el.href
        }));
      }, CONFIG.selectors.models);
      
      console.log(`✅ Found ${models.length} models (showing first 5):`);
      models.forEach(m => console.log(`   - ${m.text}`));
    }
    
    console.log('\n✅ Selector test completed!');
    
  } catch (error) {
    console.error('❌ Selector test failed:', error);
  } finally {
    await browser.close();
  }
}

async function runTests() {
  console.log('🎯 Supreme Tuning - Scraper Test Suite');
  console.log('========================================');
  
  await testBMWRules();
  await testAMGRules();
  
  console.log('\n💡 Run selector test? (This will open a browser)');
  console.log('   Uncomment the line below to test selectors:\n');
  // await testSelectors();
  
  console.log('\n✅ All tests completed!');
}

runTests();

