# Supreme Tuning - Scraper Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DVX Performance Website                      │
│         https://dvxperformance.com/.../reprogramming            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Puppeteer Navigation
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DVX Scraper (scraper.js)                    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Navigate   │→ │   Extract    │→ │   Process    │          │
│  │   Wizard     │  │   Data       │  │   Rules      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│  Brand → Model      HP/Nm Values      BMW/AMG Rules             │
│  → Type → Engine    Stage 1/2         ECU/CPC Flags             │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Apply Business Logic
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────────┐            ┌──────────────────┐
│  BMW Rules       │            │  AMG Rules       │
│  (bmw-rules.js)  │            │  (amg-rules.js)  │
│                  │            │                  │
│  • Engine Code   │            │  • M177/M178     │
│  • Platform      │            │  • Model Match   │
│  • Year Check    │            │  • Year ≥2018    │
│  • MG1/MD1       │            │  • CPC Flag      │
└──────────────────┘            └──────────────────┘
        │                                  │
        └────────────────┬────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Data Structure Builder                          │
│                                                                   │
│  brands[] → models[] → engines[] → stages[]                      │
│                                                                   │
│  • Relational IDs                                                │
│  • Stage 1, 1+, 2, 2+ generation                                │
│  • ECU unlock flags                                              │
│  • CPC upgrade flags                                             │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ JSON Serialization
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              supreme-tuning-master.json                          │
│                                                                   │
│  {                                                                │
│    "brands": [...],                                              │
│    "models": [...],                                              │
│    "engines": [...],                                             │
│    "stages": [...]                                               │
│  }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Scraping Flow

```
START
  │
  ├─► Initialize Puppeteer
  │
  ├─► Load DVX Homepage
  │
  ├─► FOR EACH Brand (Audi, BMW, Mercedes, ...)
  │     │
  │     ├─► Navigate to Brand Page
  │     │
  │     ├─► FOR EACH Model (3-Serie, M3, ...)
  │     │     │
  │     │     ├─► Navigate to Model Page
  │     │     │
  │     │     ├─► FOR EACH Type (F30, G20, ...)
  │     │     │     │
  │     │     │     ├─► Navigate to Type Page
  │     │     │     │
  │     │     │     ├─► FOR EACH Engine (320d, 330i, ...)
  │     │     │     │     │
  │     │     │     │     ├─► Navigate to Stage Page
  │     │     │     │     │
  │     │     │     │     ├─► Extract Stock HP/Nm
  │     │     │     │     │
  │     │     │     │     ├─► Extract Stage 1 HP/Nm
  │     │     │     │     │
  │     │     │     │     ├─► Extract Stage 2 HP/Nm
  │     │     │     │     │
  │     │     │     │     ├─► Generate Stage 1+ (copy)
  │     │     │     │     │
  │     │     │     │     ├─► Generate Stage 2+ (copy)
  │     │     │     │     │
  │     │     │     │     ├─► Apply BMW Rules?
  │     │     │     │     │     ├─► Extract Engine Code
  │     │     │     │     │     ├─► Check Platform
  │     │     │     │     │     └─► Set ECU Unlock Flag
  │     │     │     │     │
  │     │     │     │     ├─► Apply AMG Rules?
  │     │     │     │     │     ├─► Detect M177/M178
  │     │     │     │     │     ├─► Check Year ≥2018
  │     │     │     │     │     └─► Set CPC Flag
  │     │     │     │     │
  │     │     │     │     └─► Save to Data Structure
  │     │     │     │
  │     │     │     └─► NEXT Engine
  │     │     │
  │     │     └─► NEXT Type
  │     │
  │     └─► NEXT Model
  │
  └─► NEXT Brand
  │
  ├─► Write JSON File
  │
END
```

## 🧩 Module Breakdown

### 1. scraper.js (Main Orchestrator)
**Responsibilities:**
- Puppeteer initialization
- Navigation logic
- Data extraction
- Orchestration of business rules
- JSON generation

**Key Methods:**
- `init()` - Initialize browser
- `scrapeBrands()` - Extract brand list
- `scrapeModels()` - Extract models for brand
- `scrapeTypes()` - Extract types for model
- `scrapeEngines()` - Extract engines for type
- `scrapeStageData()` - Extract HP/Nm values
- `generatePlusStages()` - Create Stage 1+/2+
- `applyBMWRules()` - Apply BMW logic
- `applyAMGRules()` - Apply AMG logic
- `save()` - Write JSON file

### 2. bmw-rules.js (BMW Business Logic)
**Responsibilities:**
- Engine code extraction
- Platform detection
- MG1/MD1 identification
- ECU unlock flagging

**Key Functions:**
- `extractEngineCode()` - Parse engine code from text
- `inferEngineFromModel()` - Guess engine from model name
- `isMG1Platform()` - Check if platform is affected
- `requiresECUUnlock()` - Main decision logic
- `generateECUUnlockInfo()` - Create unlock object

**Data:**
- `MG1_MD1_ENGINES` - Engine database
- `BMW_MODEL_ENGINE_MAP` - Model to engine mapping
- `MG1_PLATFORMS` - Affected platform codes

### 3. amg-rules.js (AMG Business Logic)
**Responsibilities:**
- M177/M178 detection
- AMG model identification
- Year extraction
- CPC upgrade flagging

**Key Functions:**
- `extractAMGEngineCode()` - Parse M177/M178
- `inferAMGEngine()` - Guess from model name
- `extractYearFromType()` - Parse year from type string
- `requiresCPCUpgrade()` - Main decision logic
- `generateCPCUpgradeInfo()` - Create CPC object

**Data:**
- `AMG_V8_ENGINES` - M177/M178 specs
- `AMG_MODEL_PATTERNS` - Regex patterns for models

### 4. config.js (Configuration)
**Responsibilities:**
- Central configuration
- Selector definitions
- Puppeteer options
- Wait times

**Settings:**
- `targetBrands` - Brands to scrape
- `puppeteer` - Browser options
- `waitTimes` - Delay configurations
- `selectors` - CSS selectors
- `outputPath` - JSON file path

## 📊 Data Flow

```
DVX HTML
    │
    ├─► Brand Name ──────────────────────► brands[]
    │
    ├─► Model Name ──────────────────────► models[]
    │       └─► brandId (FK)
    │
    ├─► Engine Name + Power ─────────────► engines[]
    │       ├─► modelId (FK)
    │       └─► code (extracted/inferred)
    │
    └─► Stage HP/Nm Values ──────────────► stages[]
            ├─► engineId (FK)
            ├─► stockHp, stockNm
            ├─► tunedHp, tunedNm
            ├─► ecuUnlock (from BMW rules)
            └─► cpcUpgrade (from AMG rules)
```

## 🎯 Decision Trees

### BMW ECU Unlock Decision

```
Is brand BMW?
    │
    ├─ NO ──► Skip
    │
    └─ YES ──► Extract engine code
                    │
                    ├─ Found (B48, S58, etc.)
                    │   │
                    │   └─► Check year
                    │       │
                    │       ├─ ≥2020 ──► ECU Unlock Required
                    │       └─ <2020 ──► No Unlock
                    │
                    └─ Not Found
                        │
                        └─► Check platform
                            │
                            ├─ G-series ──► ECU Unlock Required
                            └─ F-series ──► No Unlock
```

### AMG CPC Upgrade Decision

```
Is brand Mercedes?
    │
    ├─ NO ──► Skip
    │
    └─ YES ──► Extract engine code
                    │
                    ├─ M177/M178 Found
                    │   │
                    │   └─► Check year
                    │       │
                    │       ├─ ≥2018 ──► CPC Required
                    │       └─ <2018 ──► No CPC
                    │
                    └─ Not Found
                        │
                        └─► Check model name
                            │
                            ├─ AMG pattern match ──► Infer engine ──► Check year
                            └─ No match ──► No CPC
```

## 🔐 Error Handling

```
Navigation Error
    │
    ├─► Log warning
    ├─► Skip current item
    └─► Continue with next

Selector Not Found
    │
    ├─► Wait with timeout
    ├─► Log warning
    └─► Return empty array

Stage Data Missing
    │
    ├─► Log warning
    ├─► Skip engine
    └─► Continue with next

Browser Crash
    │
    ├─► Log error
    ├─► Close browser
    └─► Exit process
```

