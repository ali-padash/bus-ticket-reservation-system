# Bus Ticket Reservation System

[![CI](https://github.com/ali-padash/bus-ticket-reservation-system/actions/workflows/ci.yml/badge.svg)](https://github.com/ali-padash/bus-ticket-reservation-system/actions/workflows/ci.yml)

A bus ticket website with a Go API behind it: search for trips, pick seats on a drawing of the
bus, enter the passengers, and get a ticket.

It is a practice project. The look and the steps follow the Iranian site **Safar724**, so the
website's text is Persian and right-to-left. It is not affiliated with Safar724, sells nothing,
and the payment page is a demo. It was first written in 2024 and reworked in 2026; the original
version is kept under the git tag `v1-original`.

## What it does

- **Search** by origin city, destination city and date. The search lives in the address, so a
  link, a refresh and the back button all repeat it. Results can be sorted and filtered.
- **City boxes that autocomplete** from 915 cities and their alternate spellings.
- **Seat map** drawn from a floor plan stored in the database, one per bus type.
- **Booking without an account**: choose up to 4 seats, enter one passenger per seat, review,
  pay on a demo bank page, and see the issued ticket.
- **Seats are held for 10 minutes** while the buyer reviews and pays, and released if they do not.
- **A ticket is opened with its 12-digit code and the buyer's mobile number.**

## The part worth reading: two people, one seat

Two buyers must never get the same seat. Three things make sure of it:

1. A booking runs in one database transaction that locks the chosen seat rows
   (`SELECT ... FOR UPDATE`), always in seat-number order, so two overlapping bookings cannot
   deadlock.
2. Inside the lock it checks that the seats are still free.
3. A partial unique index on the passengers table allows only one active passenger per seat, so
   the database itself refuses a double sale even if the code is wrong.

Two tests prove it against a real PostgreSQL: 20 buyers ask for the same seat at the same moment
and exactly one gets it; 24 buyers with overlapping seat choices all finish without a deadlock.

## How it is built

| Part | Technology |
| --- | --- |
| API (`backend/`) | Go 1.22, Gin, GORM, PostgreSQL 17, SQL migrations with goose |
| Website (`devs/`) | React 18, TypeScript, Vite, React Router, hand-written CSS |
| Local database | Docker Compose |

The API has three layers, each of which only knows the one below it:

```
backend/
├── cmd/api/            starts the server; also the "migrate" and "seed" commands
├── internal/
│   ├── httpapi/        reads requests, writes JSON, maps errors to status codes
│   ├── service/        the rules: validation, the 10-minute hold, the city cache
│   ├── store/          the SQL
│   ├── domain/         the plain types and named errors the layers share
│   ├── config/         settings from the environment
│   └── seed/           demo data
└── migrations/         the database schema, as numbered SQL files

devs/src/
├── pages/              one file per page
├── components/         the pieces the pages are made of
├── util/               API calls, types, validation, date helpers
└── assets/             CSS, fonts, images
```

Every folder has a `[foldername].doc.md` that explains it. Start with
[Safar724.doc.md](Safar724.doc.md). The API's routes, fields and error codes are written down in
[backend/internal/httpapi/httpapi.doc.md](backend/internal/httpapi/httpapi.doc.md).

## Run it

You need Docker, Go 1.22 or newer, and Node.js 18 or newer.

```bash
cp .env.example .env
docker compose up -d db
cd backend
go run ./cmd/api seed
go run ./cmd/api
```

`seed` creates the tables and fills them with demo data, wiping what was there. The API then
listens on `http://localhost:8080`.

In a second terminal:

```bash
cd devs
npm install
npm run dev
```

Open `http://localhost:5173`. Demo trips run between Tehran, Mashhad, Esfahan, Shiraz, Tabriz,
Rasht, Ahvaz and Yazd for 14 days from the day the seed was run.

If a port is taken, set `API_ADDR` and `CORS_ORIGIN` in `.env` (see `.env.example`), start Vite
with `npm run dev -- --port <port>`, and put the API's address in `devs/.env.local` as
`VITE_API_URL=http://localhost:<port>`.

## Checks

```bash
cd backend
go vet ./...
go test ./...
```

66 tests. 20 of them use the database and are skipped when it is not running.

```bash
cd devs
npx tsc --noEmit
npm run lint
npm run build
```

GitHub Actions runs all of these on every push, against a real PostgreSQL
(see [.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Limits

- No login, no user accounts, and no panel for bus companies. Trips come from the seed only.
- Payment is a demo page. No money moves.
- A paid ticket cannot be cancelled yet. The refund rules are shown but not applied.
- There is no limit on how many holds one visitor can open.
- The website has no automated tests.
- It is not deployed.
- The website is in Persian only.
- Some images, the font and some of the page text come from the real Safar724 site and are to
  be replaced. `Safar724.drawio.png` shows the 2024 database design, not the current one.
- Old commits contain passwords for two hosted databases. Both databases have been deleted.
