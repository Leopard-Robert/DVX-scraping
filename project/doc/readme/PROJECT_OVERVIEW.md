# 🎯 Supreme Tuning - DVX Scraper Project

## 📋 Quick Overview

**Project:** DVX Performance Web Scraper  
**Client:** Supreme Tuning Platform  
**Milestone:** 1 of 3 - DVX Scraper + JSON Database  
**Status:** ✅ COMPLETE  
**Technology:** JavaScript, Node.js, Puppeteer  
**Output:** `supreme-tuning-master.json`

---

## 🎬 What This Project Does

This scraper extracts automotive tuning data from DVX Performance website and generates a structured JSON database with intelligent business rules for BMW and Mercedes-AMG vehicles.

### Input
- DVX Performance website (https://dvxperformance.com/dvxsteenokkerzeel/reprogramming)
- 12 target brands (Audi, BMW, Mercedes, VW, Porsche, etc.)

### Process
1. Navigate through multi-step wizard (Brand → Model → Type → Engine → Stage)
2. Extract Stock, Stage 1, and Stage 2 HP/Nm values
3. Generate Stage 1+ and Stage 2+ as editable copies
4. Apply BMW MG1/MD1 ECU unlock detection (post-June 2020)
5. Apply AMG M177/M178 CPC upgrade detection (2018+)

### Output
- `supreme-tuning-master.json` with relational structure
- ~8,000-12,000 tuning stages
- ~2,000-3,000 engines
- ~300-500 models
- ~12 brands

---

## 🚀 Getting Started (3 Steps)

### 1️⃣ Install
```bash
npm install
```

### 2️⃣ Test
```bash
npm run test
```

### 3️⃣ Run
```bash
npm run scrape
```

**That's it!** The scraper will run for 30-60 minutes and generate `data/supreme-tuning-master.json`.

---

## 📚 Documentation Guide

### For Quick Setup
👉 **Start here:** `QUICKSTART.md`
- 3-step installation
- Configuration tips
- Troubleshooting

### For Understanding the Code
👉 **Read:** `ARCHITECTURE.md`
- System architecture diagrams
- Data flow visualization
- Decision trees
- Module breakdown

### For Project Details
👉 **Read:** `PROJECT_SUMMARY.md`
- Complete feature list
- Technical implementation
- Business logic details
- Expected results

### For Delivery Verification
👉 **Read:** `DELIVERY_CHECKLIST.md`
- All deliverables
- Acceptance criteria
- File inventory
- Sign-off checklist

### For General Information
👉 **Read:** `README.md`
- Project description
- Features
- Usage instructions
- Troubleshooting

---

## 🏗️ Project Structure

```
supreme-tuning-dvx-scraper/
│
├── 📄 Documentation
│   ├── README.md                    # Main documentation
│   ├── QUICKSTART.md                # Quick setup guide
│   ├── PROJECT_SUMMARY.md           # Project overview
│   ├── ARCHITECTURE.md              # Architecture diagrams
│   ├── DELIVERY_CHECKLIST.md        # Delivery checklist
│   └── PROJECT_OVERVIEW.md          # This file
│
├── 💻 Source Code
│   ├── src/scraper.js               # Main scraper (531 lines)
│   ├── src/config.js                # Configuration (70 lines)
│   ├── src/bmw-rules.js             # BMW logic (240 lines)
│   ├── src/amg-rules.js             # AMG logic (150 lines)
│   └── src/test-scraper.js          # Test suite (180 lines)
│
├── 📊 Data
│   └── data/sample-output.json      # Sample output structure
│
├── 📋 Requirements (Client Provided)
│   ├── requirement/SUPREME_TUNING_DEVELOPER_BRIEF.md
│   ├── requirement/data_structure_reference.md
│   ├── requirement/scraper_overview.md
│   └── ... (more requirement docs)
│
├── 🌐 HTML Samples (For Testing)
│   ├── html/DVX brands.html
│   ├── html/DVX models- BMW.html
│   ├── html/DVX engines - BMW.html
│   └── ... (more HTML samples)
│
└── ⚙️ Configuration
    ├── package.json                 # Dependencies & scripts
    └── .gitignore                   # Git ignore rules
```

---

## 🎯 Key Features

### ✅ Complete Data Extraction
- Scrapes all brands, models, types, engines, and stages
- Extracts Stock, Stage 1, and Stage 2 HP/Nm values
- Generates Stage 1+ and Stage 2+ as copies for admin editing

### ✅ BMW MG1/MD1 Detection
- Automatically detects BMW vehicles requiring ECU unlock
- Rule: Production date > June 2020 → ECU unlock required
- Engine code extraction and inference
- Platform detection (G-series, late F-series)

### ✅ AMG CPC Detection
- Identifies Mercedes-AMG M177/M178 V8 engines
- Rule: M177/M178 engines ≥2018 → CPC upgrade required
- Model pattern matching (E63, AMG GT, etc.)
- Year extraction from type strings

### ✅ Robust & Reliable
- Label-based selectors (not positional)
- Multiple extraction strategies
- Comprehensive error handling
- Retry logic for failed navigations
- Detailed logging

---

## 🔧 Business Rules Explained

### BMW MG1/MD1 ECU Lock

**What:** BMW introduced anti-tuning protection (MG1/MD1) after June 2020.

**Rule:** All BMW vehicles with production date > June 2020 require ECU unlock.

**How it works:**
1. Extract engine code (B48, B58, S58, etc.)
2. Check against MG1/MD1 engine database
3. Verify platform (G-series = locked)
4. Apply ECU unlock flag if conditions met

**Example:**
```json
{
  "ecuUnlock": {
    "required": true,
    "fromDate": "2020-06-01",
    "extraCost": null,
    "note": "BMW MG1/MD1 protection requires ECU unlock"
  }
}
```

### Mercedes-AMG CPC Upgrade

**What:** AMG models with M177/M178 V8 engines require CPC upgrade.

**Rule:** All AMG with M177/M178 V8 engines from ≥2018 require CPC upgrade.

**How it works:**
1. Detect M177/M178 engine code
2. Identify AMG model (C63, E63, AMG GT, etc.)
3. Check production year ≥ 2018
4. Apply CPC upgrade flag if conditions met

**Example:**
```json
{
  "cpcUpgrade": {
    "required": true,
    "note": "Mercedes-AMG M177/M178 V8 requires CPC upgrade"
  }
}
```

---

## 📊 Sample Output

```json
{
  "brands": [
    { "id": 1, "name": "BMW" }
  ],
  "models": [
    { "id": 1, "brandId": 1, "name": "M3" }
  ],
  "engines": [
    { "id": 1, "modelId": 1, "code": "S58", "name": "M3 Competition 510 PK" }
  ],
  "stages": [
    {
      "id": 1,
      "engineId": 1,
      "stageName": "Stage 1",
      "stockHp": 510,
      "stockNm": 650,
      "tunedHp": 600,
      "tunedNm": 750,
      "ecuUnlock": { "required": true, ... },
      "cpcUpgrade": null
    }
  ]
}
```

---

## 🎓 For Developers

### Understanding the Code
1. Start with `src/config.js` - See all configuration
2. Read `src/scraper.js` - Main orchestration logic
3. Review `src/bmw-rules.js` - BMW business rules
4. Review `src/amg-rules.js` - AMG business rules
5. Check `ARCHITECTURE.md` - Visual diagrams

### Testing
```bash
npm run test        # Test business rules
npm run scrape      # Run full scraper
npm run clean       # Clean output files
```

### Customization
- Edit `src/config.js` to change brands, wait times, selectors
- Edit `src/bmw-rules.js` to add new BMW engines
- Edit `src/amg-rules.js` to add new AMG models

---

## 🎯 Next Steps

This scraper is **Milestone 1** of a 3-milestone project:

### ✅ Milestone 1: DVX Scraper + JSON Database (COMPLETE)
- Puppeteer scraper
- BMW/AMG business rules
- JSON output

### 🔜 Milestone 2: Backend API + Admin Panel
- Node.js/Express API
- REST endpoints
- Admin editing interface
- Save functionality

### 🔜 Milestone 3: Public Calculator + Deployment
- React calculator UI
- Brand/Model/Engine/Stage selection
- Live deployment

---

## 📞 Support

**Questions?** Check these docs in order:
1. `QUICKSTART.md` - Setup issues
2. `README.md` - General questions
3. `ARCHITECTURE.md` - Technical details
4. `DELIVERY_CHECKLIST.md` - Acceptance criteria

---

## ✅ Project Status

**Milestone 1:** ✅ COMPLETE  
**All Acceptance Criteria:** ✅ MET  
**Documentation:** ✅ COMPLETE  
**Testing:** ✅ PASSED  
**Ready for Delivery:** ✅ YES

---

**Built with ❤️ for Supreme Tuning Platform**

