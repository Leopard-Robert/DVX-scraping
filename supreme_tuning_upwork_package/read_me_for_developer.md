
# Supreme Tuning – Developer README

## Getting Started

### Backend
```
cd backend
npm install
npm run dev
```

### Frontend
```
cd frontend
npm install
npm run dev
```

---

# Scraper
```
cd backend
node scripts/scraper.js
```

Outputs:
`backend/data/supreme-tuning-master.json`

---

# Admin Login
Developer must implement simple authentication:
- Basic Auth or JWT
- Protect /admin and /api/supreme/save

---

# Deployment Steps
1. Build frontend: `npm run build`
2. Deploy backend (Node)
3. Serve frontend (static hosting)
4. Configure reverse proxy (optional)
