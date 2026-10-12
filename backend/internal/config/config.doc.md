# backend/internal/config

*Written 2026-10-12.*

Reads the settings. One file, `config.go`, and its test.

`Load()` is called once, at start-up. It is the **only** place in the backend that reads
environment variables, so the full list of settings is in one struct:

| Field | Variable | Default |
| --- | --- | --- |
| `DatabaseURL` | `DATABASE_URL` | none; `Load` returns an error without it |
| `APIAddr` | `API_ADDR` | `localhost:8080` |
| `CORSOrigin` | `CORS_ORIGIN` | `http://localhost:5173` |

Before reading, it loads `.env` from the current folder and from the folder above, if they
exist. A real environment variable always wins over the file.

## Tests

2 tests: `Load` fails without `DATABASE_URL`; defaults and overrides work.
