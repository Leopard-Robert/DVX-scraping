# Scraper TODO – Selector Fixes

Selectors must be updated using Chrome DevTools while inspecting DVX pages.

Areas needing adjustment:

## 1. Brand selection tiles
Common patterns:
- #brand a
- .brand a
- .col-sm-3 a

## 2. Model selection list
Patterns:
- #model a
- .model a
- .col-sm-4 a

## 3. Type selection list
Patterns:
- #type a
- .type a
- .col-sm-4 a

## 4. Engine selection
Patterns:
- #engine a
- .engine a
- .col-sm-4 a

## 5. Stage table
Look for rows containing:
- "Origineel" / "Stock"
- "Stage 1"
- "Stage 2"

You may need to adjust:
`document.querySelectorAll("table tr")`
