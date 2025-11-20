# Supreme Tuning – DVX Scraper Overview

The scraper uses Puppeteer to extract Stage 1 & Stage 2 HP/Nm values from DVX Steenokkerzeel.

URL:
https://dvxperformance.com/dvxsteenokkerzeel/reprogramming

### Scraper Steps
1. Load DVX wizard
2. Loop target brands (Audi, BMW, Mercedes, VW, Porsche…)
3. Loop models, types, engines
4. Extract Stage 1 & Stage 2 values
5. Generate Stage 1+ and Stage 2+ (copies)
6. Apply business rules (BMW/AMG)
7. Output to `data/supreme-tuning-master.json`
