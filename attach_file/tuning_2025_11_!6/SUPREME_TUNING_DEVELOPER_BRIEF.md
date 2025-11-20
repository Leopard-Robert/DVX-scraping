# Supreme Tuning – Full Developer Brief

This document serves as the complete technical specification for the **Supreme Tuning Platform**, including the tuning calculator, admin panel, backend API, and DVX scraping system.

---

# 1. PROJECT OVERVIEW

You will build a complete automotive tuning platform based on:

- **React (Vite)** → Frontend (Calculator + Admin)
- **Node.js / Express** → Backend API
- **JSON File Storage** → Primary tuning database
- **Puppeteer Scraper** → One-time seed import from DVX Performance
- **Custom Business Rules** → BMW + AMG detection logic

The client will maintain tuning values via the Admin UI.

---

# 2. CORE FEATURES

## A. Public Tuning Calculator
Interactive flow:
1. Brand →  
2. Model →  
3. Engine →  
4. Stage →  
5. Show results

Displays:
- Stock HP/Nm
- Tuned HP/Nm
- Gains
- Price
- Hardware mods
- Notes
- ECU Unlock (BMW)
- CPC Upgrade (AMG)

---

## B. Admin Panel (secured)
Allows the client to edit:
- stockHp, stockNm  
- tunedHp, tunedNm  
- price, currency  
- hardwareMods  
- ecuUnlock (required, cost, note)  
- cpcUpgrade (required, note)  
- gearboxLimitNm  
- recommendedGearboxTune  
- notes  

Changes save to:  
`/backend/data/supreme-tuning-master.json`

JSON backups stored in `/data/backups/`.

---

# 3. BUSINESS LOGIC

## BMW Anti-Tuning Rule (MG1/MD1)
**All BMW vehicles with a production date > June 2020 require ECU unlock.**

Set:

```
"ecuUnlock": {
  "required": true,
  "fromDate": "2020-06-01",
  "extraCost": null,
  "note": "Alle BMW's met productiedatum ná 06/2020 hebben anti-tuning protection..."
}
```

---

## Mercedes-AMG CPC Rule
**All AMG with M177/M178 V8 engines from ≥2018 require CPC upgrade.**

Set:

```
"cpcUpgrade": {
  "required": true,
  "note": "Alle Mercedes-AMG modellen met M177/M178 V8 motoren (2018 en later) hebben een CPC-upgrade nodig..."
}
```

Applies to:
- E63 / E63S  
- G63  
- AMG GT, GT S, GT C, GT R  
- GT 4-door  
- S63  
- GLS63  
- GLE63  
- C63 (M177 facelift models)

---

# 4. SCRAPER REQUIREMENTS (DVX)

Source:  
**https://dvxperformance.com/dvxsteenokkerzeel/reprogramming**

Scrape all German brands:
- Audi  
- BMW  
- Mercedes  
- Volkswagen  
- Porsche  
- Cupra  
- Skoda  
- Seat  
- Mini  

Plus:
- Lamborghini  
- Bentley  
- Aston Martin  

Scrape:
- Stage 1 hp/nm
- Stage 2 hp/nm  
- Generate Stage 1+ (copy 1)  
- Generate Stage 2+ (copy 2)

Populate:
brands → models → engines → stages

Write to:
`data/supreme-tuning-master.json`

---

# 5. BACKEND ENDPOINTS

```
GET /api/supreme/brands
GET /api/supreme/models?brandId=
GET /api/supreme/engines?modelId=
GET /api/supreme/stages?engineId=
GET /api/supreme/power?stageId=

# Admin
GET /api/supreme/data
POST /api/supreme/save
```

---

# 6. FRONTEND REQUIREMENTS

### A. Calculator
- React/Vite
- Uses dropdowns to select brand/model/engine/stage
- Calls backend APIs
- Displays all tuning results

### B. Admin Panel
- Protected (basic auth or JWT)
- Select brand/model/engine/stage
- Edit all fields
- Save to backend JSON

---

# 7. DATA STRUCTURE EXAMPLE

```
{
  "brands": [{ "id": 1, "name": "BMW" }],
  "models": [{ "id": 101, "brandId": 1, "name": "M5 Competition" }],
  "engines": [{
    "id": 9001,
    "modelId": 101,
    "code": "S63B44T4",
    "name": "4.4 V8 Biturbo 625pk"
  }],
  "stages": [{
    "id": 1,
    "engineId": 9001,
    "stageName": "Stage 1",
    "stockHp": 625,
    "tunedHp": 720
  }]
}
```

---

# 8. DEPLOYMENT

Deliver:
- Backend running (Node)
- Frontend deployed (Vite build)
- Calculator working end to end
- Admin locked behind password

---

# 9. AFTER DELIVERY

Client should be able to:
- Adjust prices
- Modify HP/Nm
- Add notes
- Toggle BMW/AMG rules

No developer needed after setup.

