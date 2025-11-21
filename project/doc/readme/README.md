# Supreme Tuning - DVX Performance Scraper

A robust Puppeteer-based web scraper that extracts automotive tuning data from DVX Performance website and generates a structured JSON database with BMW MG1/MD1 and Mercedes-AMG CPC business rules applied.

## 🎯 Features

- **Complete Data Extraction**: Scrapes brands, models, types, engines, and tuning stages
- **BMW MG1/MD1 Detection**: Automatically detects BMW vehicles requiring ECU unlock (post-June 2020)
- **AMG CPC Detection**: Identifies Mercedes-AMG M177/M178 V8 engines requiring CPC upgrade (2018+)
- **Stage Generation**: Creates Stage 1, 1+, 2, and 2+ from DVX data
- **Robust Selectors**: Label-based extraction for reliability
- **Error Handling**: Comprehensive retry logic and error recovery

## 📋 Requirements

- Node.js 18+ 
- npm or yarn

## 🚀 Installation

```bash
npm install
```

## 🏃 Usage

### Run the scraper

```bash
npm run scrape
```

This will:
1. Launch Puppeteer browser
2. Navigate through DVX Performance website
3. Extract all tuning data for target brands
4. Apply BMW and AMG business rules
5. Generate `data/supreme-tuning-master.json`

### Configuration

Edit `src/config.js` to customize:
- Target brands
- Puppeteer options (headless mode, viewport, etc.)
- Wait times
- Output path
- Selectors

## 📊 Output Structure

The scraper generates `supreme-tuning-master.json` with the following structure:

```json
{
  "brands": [
    { "id": 1, "name": "BMW" }
  ],
  "models": [
    { "id": 101, "brandId": 1, "name": "M5 Competition" }
  ],
  "engines": [
    {
      "id": 9001,
      "modelId": 101,
      "code": "S63B44T4",
      "name": "4.4 V8 Biturbo 625pk"
    }
  ],
  "stages": [
    {
      "id": 1,
      "engineId": 9001,
      "stageName": "Stage 1",
      "stockHp": 625,
      "stockNm": 750,
      "tunedHp": 720,
      "tunedNm": 900,
      "price": null,
      "currency": "EUR",
      "hardwareMods": [],
      "ecuUnlock": {
        "required": true,
        "fromDate": "2020-06-01",
        "extraCost": null,
        "note": "BMW MG1/MD1 protection requires ECU unlock"
      },
      "cpcUpgrade": null,
      "gearboxLimitNm": null,
      "recommendedGearboxTune": false,
      "notes": ""
    }
  ]
}
```

## 🔧 Business Rules

### BMW MG1/MD1 ECU Lock

All BMW vehicles with production date **after June 2020** require ECU unlock for tuning.

**Affected engines:**
- B38, B46, B48 (petrol 4-cylinder)
- B58, B58TU (petrol 6-cylinder)
- S58, S63 (M-series)
- B37, B47, B57 (diesel)

**Detection logic:**
1. Extract engine code from DVX data
2. Check against MG1/MD1 engine database
3. Verify production year/platform
4. Apply ECU unlock requirement if conditions met

### Mercedes-AMG CPC Upgrade

All AMG models with **M177/M178 V8 engines from 2018 onwards** require CPC upgrade.

**Affected models:**
- C63, E63, S63
- AMG GT (all variants)
- GT 4-door (GT 53, GT 63)
- GLE63, GLS63, G63

**Detection logic:**
1. Extract engine code (M177/M178)
2. Identify AMG model from name
3. Check production year ≥ 2018
4. Apply CPC upgrade requirement if conditions met

## 📁 Project Structure

```
supreme-tuning-dvx-scraper/
├── src/
│   ├── scraper.js          # Main scraper orchestration
│   ├── config.js           # Configuration and selectors
│   ├── bmw-rules.js        # BMW MG1/MD1 detection logic
│   └── amg-rules.js        # AMG CPC detection logic
├── data/
│   └── supreme-tuning-master.json  # Generated output
├── package.json
└── README.md
```

## 🎯 Target Brands

- Audi
- BMW
- Mercedes
- Volkswagen
- Porsche
- Cupra
- Skoda
- Seat
- Mini
- Lamborghini
- Bentley
- Aston Martin

## 🐛 Troubleshooting

### Scraper fails to find elements

1. Check if DVX website structure has changed
2. Update selectors in `src/config.js`
3. Enable headless: false to see browser actions

### Missing stage data

- DVX may not have Stage 2 for all engines
- Scraper will skip engines without valid data
- Check console output for warnings

### Browser crashes

- Increase wait times in `src/config.js`
- Reduce concurrent operations
- Check system resources

## 📝 License

MIT

## 👨‍💻 Developer

Built for Supreme Tuning Platform - Milestone 1

