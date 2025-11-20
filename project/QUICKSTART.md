# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies

```bash
npm install
```

This will install Puppeteer and all required dependencies.

### 2. Test the Business Rules

Before running the full scraper, test that BMW and AMG detection logic works:

```bash
npm run test
```

Expected output:
```
🧪 Testing BMW MG1/MD1 Rules...

BMW M3 G80 (2021) - Should require ECU unlock
  ✅ ECU Unlock Required
  Note: Alle BMW's met productiedatum ná 06/2020 hebben anti-tuning protection...

BMW 320d F30 (2015) - Should NOT require ECU unlock
  ❌ No ECU Unlock

🧪 Testing AMG CPC Rules...

Mercedes E63 S W213 (2018) - Should require CPC
  ✅ CPC Upgrade Required
  Note: Alle Mercedes-AMG modellen met M177/M178 V8 motoren (2018 en later)...
```

### 3. Run the Scraper

```bash
npm run scrape
```

This will:
- Open a browser window (headless: false by default)
- Navigate through DVX Performance website
- Extract all tuning data
- Apply BMW/AMG business rules
- Save to `data/supreme-tuning-master.json`

**⏱️ Expected Duration:** 30-60 minutes depending on network speed

## 📊 Monitor Progress

The scraper provides real-time console output:

```
🎯 Supreme Tuning - DVX Scraper
================================

🚀 Initializing Puppeteer...
✅ Browser initialized

📋 Scraping brands...
✅ Found 12 target brands

🏷️  Processing brand: BMW
  📂 Scraping models for BMW...
  ✅ Found 25 models
  
  📦 Processing model: 3-Serie
    📋 Processing type: F30 - 2012 -> 2019
      🔧 Scraping engines for F30...
      ✅ Found 8 engines
      
      🔧 Processing engine: 320d 184 PK
        ⚙️  Scraping stage data...
        ✅ Extracted stage data
        ✅ Created Stage 1: 184→230 HP
        ✅ Created Stage 1+: 184→230 HP
        ✅ Created Stage 2: 184→250 HP
        ✅ Created Stage 2+: 184→250 HP
```

## 🎛️ Configuration

### Change to Headless Mode

Edit `src/config.js`:

```javascript
puppeteer: {
  headless: true,  // Change to true for production
  ...
}
```

### Adjust Wait Times

If scraper is too fast/slow, adjust in `src/config.js`:

```javascript
waitTimes: {
  navigation: 3000,    // Wait after page load
  shortDelay: 500,     // Short pause
  mediumDelay: 1000,   // Medium pause
  longDelay: 2000      // Long pause
}
```

### Limit Brands

To test with fewer brands, edit `src/config.js`:

```javascript
targetBrands: [
  'BMW',
  'Mercedes'
  // Comment out others for testing
],
```

## 📁 Output

After successful scraping, you'll find:

```
data/
└── supreme-tuning-master.json
```

### Sample Output Structure

```json
{
  "brands": [
    { "id": 1, "name": "BMW" },
    { "id": 2, "name": "Mercedes" }
  ],
  "models": [
    { "id": 1, "brandId": 1, "name": "3-Serie" },
    { "id": 2, "brandId": 1, "name": "M3" }
  ],
  "engines": [
    {
      "id": 1,
      "modelId": 1,
      "code": "B47",
      "name": "320d 184 PK"
    }
  ],
  "stages": [
    {
      "id": 1,
      "engineId": 1,
      "stageName": "Stage 1",
      "stockHp": 184,
      "stockNm": 380,
      "tunedHp": 230,
      "tunedNm": 470,
      "price": null,
      "currency": "EUR",
      "hardwareMods": [],
      "ecuUnlock": null,
      "cpcUpgrade": null,
      "gearboxLimitNm": null,
      "recommendedGearboxTune": false,
      "notes": ""
    }
  ]
}
```

## 🐛 Troubleshooting

### "Cannot find module 'puppeteer'"

```bash
npm install
```

### Scraper hangs or times out

1. Increase wait times in `src/config.js`
2. Check internet connection
3. Verify DVX website is accessible

### Missing data in output

- Check console for warnings
- Some engines may not have Stage 2 data
- DVX may be missing data for certain models

### Browser crashes

- Close other applications
- Increase system resources
- Run in headless mode

## 🎯 Next Steps

After scraping:

1. **Verify Output**: Check `data/supreme-tuning-master.json`
2. **Validate Data**: Ensure BMW/AMG rules are applied correctly
3. **Backend Integration**: Use this JSON as the database for the API
4. **Admin Panel**: Import into admin system for editing

## 📞 Support

If you encounter issues:

1. Check console output for error messages
2. Review `src/config.js` settings
3. Test with a single brand first
4. Enable headless: false to see browser actions

## ✅ Acceptance Criteria

- [x] Scrapes all target brands (Audi, BMW, Mercedes, VW, Porsche, etc.)
- [x] Extracts Stage 1 and Stage 2 HP/Nm values
- [x] Generates Stage 1+ and Stage 2+ as copies
- [x] Applies BMW MG1/MD1 ECU unlock rule (post-June 2020)
- [x] Applies AMG M177/M178 CPC upgrade rule (2018+)
- [x] Outputs to `supreme-tuning-master.json`
- [x] Relational structure with IDs (brands → models → engines → stages)
- [x] Robust error handling and logging

