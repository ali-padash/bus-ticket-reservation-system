# Safar724 — project overview

A bus ticket search site, built as a learning project. It copies the look and flow of the
Iranian site Safar724. You pick an origin city, a destination city and a date, and you get a list
of bus trips. You can open a trip and see which seats are taken.

This doc describes the project **as it is today**, including what is broken. It was written in
October 2026 from a full read of the code, and last updated on 2026-10-12.

## The two halves

| Folder | What it is | Doc |
| --- | --- | --- |
| `backend/` | Go API in three layers (web, rules, SQL). Gin, GORM, PostgreSQL in Docker. | [backend.doc.md](backend/backend.doc.md) |
| `devs/` | The website. React 18, TypeScript, Vite, React Router. | [devs.doc.md](devs/devs.doc.md) |

Other root files:

- `README.md` — the public description. Several claims in it are not true (see below).
- `Safar724.drawio.png` — the **old** database diagram. The schema has since changed; see
  [migrations.doc.md](backend/migrations/migrations.doc.md).
- `docker-compose.yml` — starts the local PostgreSQL database.
- `.env.example` — the settings to copy into `.env`.

## Run it

```bash
cp .env.example .env
docker compose up -d db
cd backend && go run ./cmd/api seed    # tables + demo data
go run ./cmd/api                       # API on http://localhost:8080
```

Then in another terminal: `cd devs && npm install && npm run dev`.

Demo trips exist between Tehran, Mashhad, Esfahan, Shiraz, Tabriz, Rasht, Ahvaz and Yazd, for the
next 14 days from when the seed was run.

## How a search works, end to end

1. The home page (`/`) shows a form. The website fetches the 915-city list once from
   `GET /api/v1/cities` and the city boxes autocomplete from it in the browser.
2. On submit, the site moves to `/services?from=<cityId>&to=<cityId>&date=YYYY-MM-DD`. The search
   lives in the address, so refresh, back/forward and a shared link all repeat it.
3. The services page calls `GET /api/v1/trips?from=…&to=…&date=…`.
4. In the Go server the request passes through three layers: the web layer checks the input,
   the service checks that both cities exist, and the store runs one SQL query that joins
   services, companies, bus types and terminals and works out how many seats are free.
5. The page lists the trips. You can sort by time or price, and filter by company or terminal.
6. Clicking "view and buy" on a trip calls `/trips/{id}/seats` and `/trips/{id}/availability`,
   then draws the bus seat map.

7. "خرید" opens the booking pages: choose seats, enter one passenger per seat, review with a
   10-minute countdown, a demo bank page, and the issued ticket (2026-10-12).

Seats are held for 10 minutes while the buyer reviews and pays, and released if they do not.
There is no login and no real payment: the bank page is a demo.

## What works and what does not

Checked by actually running the tools:

| Check | Result |
| --- | --- |
| `go vet ./...` (backend) | Clean. |
| `go test ./...` (backend) | 65 tests pass (2026-10-12). 20 of them need the database running. |
| `npx tsc --noEmit` (frontend) | Clean (was 13 errors). |
| `npm run lint` (frontend) | Clean (was 29 errors, 16 warnings). |
| `npm run build` (frontend) | Passes. |
| Frontend tests | None. |
| Can someone else run it? | Yes: Docker database, migrations, seed, API and website all start from the steps above. |

## Problems to know about

### Old secrets in git history

- Database passwords for two old Vercel/Neon databases are in the git history
  (`addCitiesJsonToDatabase.py`, an old `.env` file, old versions of `db.go`). **Those databases
  have been deleted**, so the passwords open nothing. The Python script is still in the tree and
  should be removed; the Go seed replaces it.

### The README says things that are not true

- It lists **Tailwind CSS**. Tailwind is not installed. Styling is 30 hand-written CSS files.
- It lists "searching by date" and a normalized database as features, which is fair, but the
  feature list reads as if booking exists. It does not.
- The frontend folder tree in the README is missing the `src/` level.

### It uses Safar724's own files

Mimicking Safar724 is the purpose of the project, and that is fine. The design, the flow and the
name can stay. The issue is narrower: some of their actual property is committed to a public repo.

- Safar724's logos, marketing text, phone number and "11,332,785 customers" line are copied in.
- The IRANSans font files are a paid font.
- If the site is ever deployed, it could be mistaken for the real one.

### Code quality (short version; details are in each folder's doc)

- Many spelling mistakes in names: `MainChoces`, `CardWithIconVerticall`, `setDistinationState`,
  `alertMassage`, `calender`.

## Refactor plan

Suggested order. Each step leaves the project in a better, working state.

1. **Make it safe and honest.** Rotate the database password. Remove the Python script's
   credentials. Fix the README so it only claims what exists.
2. **Make it run for a stranger.** *Done for the backend:* `.env.example`, Docker Compose with
   Postgres, migrations, and a working seed. Still to do: the frontend build, and a README that
   explains the steps.
3. **Make it build.** *Done 2026-10-12:* 13 type errors and 29 lint errors fixed, the build
   passes. Still to do: CI that runs `go vet`, `go test`, `tsc` and `eslint`.
4. **Swap out the borrowed files.** Keep the design and the name. Replace the logo, use a free
   font (for example Vazirmatn), and rewrite the copied marketing text and phone number.
   Keep "inspired by Safar724" in the README, and add a "demo project, not affiliated" banner
   if it is deployed.
5. **Clean the frontend data flow.** *Done 2026-10-12:* the search is in the URL, the 18
   `querySelector` calls are gone, and `setTimeout` went from 22 to 5 (animation waits only).
   Still open: consider TanStack Query.
6. **Clean the backend.** *Done 2026-10-12:* split into web / service / store layers, one config
   package, one error shape, 30 tests. The API now serves the city list from the database,
   cached in memory, and the website loads it from there (its script went from 481 KB to 219 KB).
7. **Finish one real feature: booking a seat.** *Backend done 2026-10-12* (hold for 10 minutes,
   then pay; a test proves 20 buyers cannot get one seat twice), *and the website's five booking
   screens*. This is the piece that makes the project
   interesting, because two people must not be able to book the same seat. A database
   transaction plus a test that proves it is worth more on a CV than any amount of tidying.
8. **Add tests and deploy it.** A live link and a green CI badge at the top of the README.

Steps 1 to 4 are small and give most of the benefit. Step 7 is the one worth talking about in an interview.
