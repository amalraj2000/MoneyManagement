# MoneyManagement

Private, offline-first personal money tracker. Single-page Next.js PWA (App Router, TypeScript, Tailwind, Recharts, IndexedDB). No login, no backend, no analytics.

## Run

```bash
npm install --legacy-peer-deps   # if peer-dependency errors appear
npm run dev          # http://localhost:3000 (service worker is disabled in dev)
npm run build && npm start   # production build – use this to test PWA/offline
npm run lint
npm run typecheck
npm test
```

## What works (in the browser)
- Opening balance, add/edit/delete income & expenses, balance = opening + income − expenses (integer paise)
- Month selector, monthly summary, budget / savings / income-target progress, over-budget warning
- Search, type/category/month filters, sort, details, load-more pagination
- Charts: income vs expenses, spending by category, daily spending, savings trend, largest expenses
- **Manual bank-SMS import**: paste messages → preview/edit → confirm. Detects credit/debit, amount (INR/Rs/₹), date, time, bank, account digits, merchant, reference. Ignores OTPs (never stored), declined, balance, limit and promotional messages. Ambiguous messages go to a review list without touching the balance. Duplicates are flagged "Already imported".
- Export / import JSON backup, clear-all with typed confirmation, optional demo data
- Installable PWA with offline app shell; data stored locally in IndexedDB (versioned schema)

## What does NOT work / needs native work
- A browser or PWA **cannot read SMS** on Android or iPhone. Use paste-import. `lib/sms-parser/adapter.ts` defines the interface a future native Android wrapper (explicit READ_SMS consent, Play policy review) could implement.
- No bank API integration.
- Data is per-device: iPhone and Android keep separate databases; move data with Export/Import backup.

## Test the PWA
Service workers need HTTPS (or localhost). Deploy (below) or use `npm run build && npm start` and a tunnel such as `ngrok http 3000`.
- **Android (Chrome):** ⋮ menu → Install app.
- **iPhone (Safari):** Share → Add to Home Screen.
Then enable airplane mode and reopen: the app and local transactions still work.

## Deploy
Any static/Node HTTPS host works, e.g. Vercel: push to GitHub, import the repo at vercel.com, keep defaults (framework: Next.js), deploy. Netlify and Cloudflare Pages also work.

## Structure
`app/` page + layout · `components/` UI · `lib/finance` money & calculations · `lib/sms-parser` parser, duplicates, adapter · `lib/db` storage abstraction (IndexedDB) & backup · `hooks/useStore.ts` state · `tests/` unit tests
