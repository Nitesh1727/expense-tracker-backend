# Expense Tracker — Backend

Node.js + Express + MongoDB API for the Expense Tracker app.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the code is
layered, [`docs/DATABASE.md`](docs/DATABASE.md) for the schema, and
[`docs/API.md`](docs/API.md) for the endpoint reference. The root
`../CLAUDE.md` and `../STATUS.md` (one level up) have the cross-project
picture and current progress.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values
npm run dev              # nodemon, auto-restart on change
```

## Environment variables

See `.env.example` for the full list. At minimum you need a MongoDB
connection string (`MONGODB_URI`) and a JWT signing secret (`JWT_SECRET`).

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Start with nodemon (auto-reload). |
| `npm start` | Start normally (production). |

(Scripts will be finalized once `src/server.js` replaces the current empty
`src/index.js` entry point — see `docs/ARCHITECTURE.md`.)
