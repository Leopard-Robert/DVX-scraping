
# Project Architecture (Diagram)

```
┌────────────────────────┐
│   DVX Website (Scrape) │
└─────────────┬──────────┘
              │ Puppeteer
              ▼
┌──────────────────────────────────────┐
│ supreme-tuning-master.json (Data)   │
└─────┬───────────────────────────────┘
      │ Loaded by Backend
      ▼
┌──────────────────────────────┐
│ Node/Express API             │
│ /brands /models /engines ... │
└─────┬────────────────────────┘
      │ Called by React
      ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│ Public Calculator (React)│   │ Admin Panel (React)      │
└──────────────────────────┘   └──────────────────────────┘

Admin saves → updates JSON → calculator instantly uses new data.
```
