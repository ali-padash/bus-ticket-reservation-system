# backend

*Rewritten 2026-10-12 after the restructure into layers.*

The Go API. It serves trip search, seat maps with the bus layout, the city list, and **ticket
booking**: seats are held for 10 minutes, then paid or released.

## The layers

A request passes through three layers. Each one knows only the layer below it, and only
through a small interface.

```
browser
   |
httpapi   reads the URL, checks the input, writes JSON          (knows: service)
   |
service   the rules: what a search means, what is an error      (knows: a store interface)
   |
store     the SQL                                               (knows: PostgreSQL)
```

`domain` sits beside them: the plain types (`Trip`, `Seat`, `City`) and the named errors
(`ErrTripNotFound`) that all three layers pass around. It imports none of them.

**Why it is split this way**

- **Each layer can be tested alone.** The web layer is tested with a fake service, the rules
  with a fake store, and the SQL against a real database. None of these tests needs the others.
- **A change stays in one place.** A new JSON field touches `httpapi` only. A new index or a
  different database library touches `store` only.
- **Nothing is global.** `cmd/api/main.go` creates the store, hands it to the service, and hands
  the service to the web layer. Every dependency is visible there, in about ten lines.

## Layout

| Path | Job | Doc |
| --- | --- | --- |
| `cmd/api/` | The program: reads the command, builds the parts, starts and stops the server. | [api.doc.md](cmd/api/api.doc.md) |
| `internal/config/` | Reads the settings from the environment, once. | [config.doc.md](internal/config/config.doc.md) |
| `internal/domain/` | The shared types and errors. | [domain.doc.md](internal/domain/domain.doc.md) |
| `internal/httpapi/` | Routes, input checks, JSON. **Holds the API contract.** | [httpapi.doc.md](internal/httpapi/httpapi.doc.md) |
| `internal/service/` | The rules. | [service.doc.md](internal/service/service.doc.md) |
| `internal/store/` | The SQL queries. | [store.doc.md](internal/store/store.doc.md) |
| `internal/seed/` | Loads demo data. | [seed.doc.md](internal/seed/seed.doc.md) |
| `migrations/` | SQL files that create and change the tables. | [migrations.doc.md](migrations/migrations.doc.md) |
| `go.mod`, `go.sum` | Dependency list. | — |

`internal/` is a Go rule, not just a name: code outside this module cannot import what is in it.

## How to run it

From the repo root, once:

```bash
cp .env.example .env
docker compose up -d db
```

Then from `backend/`:

```bash
go run ./cmd/api seed     # create the tables and load demo data
go run ./cmd/api          # start the API
```

| Command | Does |
| --- | --- |
| `go run ./cmd/api` or `go run ./cmd/api serve` | Runs pending migrations, then starts the API. Ctrl+C stops it cleanly. |
| `go run ./cmd/api migrate` | Runs pending migrations and exits. |
| `go run ./cmd/api seed [path/to/cities.json]` | Runs migrations, then **wipes all tables** and loads demo data. |

## Tests

```bash
go vet ./...
go test ./...
```

65 tests in 6 packages (2026-10-12):

| Package | Tests | Needs a database? |
| --- | --- | --- |
| `internal/config` | 2 | No |
| `internal/domain` | 1 | No |
| `internal/seed` | 2 | No |
| `internal/service` | 21 | No, uses a fake store |
| `internal/httpapi` | 19 | No, uses a fake service |
| `internal/store` | 20 | **Yes.** Skipped when `DATABASE_URL` is not set or the database is down. |

The store tests run inside a transaction that is rolled back, so they are safe to run against
the local demo database. Two of them (20 buyers racing for one seat, and overlapping purchases)
need real commits; they create their own test trip and delete it afterwards.

## Settings

Read from the environment, or from a `.env` file in this folder or the repo root.

| Name | Needed? | Default | Meaning |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | Postgres connection string. |
| `API_ADDR` | No | `localhost:8080` | Where the API listens. |
| `CORS_ORIGIN` | No | `http://localhost:5173` | The website address allowed to call the API. |

The Docker database listens on port **15432** on your computer, not 5432, so it does not clash
with a Postgres that is already installed.

### If a port is "forbidden" on Windows

Windows sometimes reserves blocks of ports for Docker and Hyper-V. The error is
"An attempt was made to access a socket in a way forbidden by its access permissions".
Pick another port with `API_ADDR` (for example `localhost:18080`) or `DB_PORT`. To see the
reserved blocks: `netsh interface ipv4 show excludedportrange protocol=tcp`.

## Module name

The Go module is `github.com/ali-padash/bus-ticket-reservation-system/backend`, so imports
inside the project start with that path.

## Main libraries

- **Gin** — routing and JSON responses.
- **GORM** with the Postgres driver — database access. Used only inside `store` and `seed`.
- **goose** — runs the SQL migrations.
- **rs/cors** — allows the frontend's origin.
- **godotenv** — reads the `.env` file.
- **bcrypt** (`x/crypto`) — hashes the demo users' password in the seed.
- **log/slog** (standard library) — logs, one line per request.

## Things still to improve

- A paid ticket cannot be cancelled or refunded, and there is no "my tickets" page yet.
- Payment is faked: one route marks a hold as paid. There is no bank.
- Nothing limits how many holds one visitor can make.
- Go's race detector was not run: it needs a C compiler, which this PC does not have.
- No OpenAPI file.
- No CI yet, so the tests only run when someone runs them.
- Clean shutdown on Ctrl+C is written but was not tried by hand on Windows.
- `go.mod` says Go 1.22. Dependencies are pinned to versions that work with it.
