# backend/cmd/api

*Written 2026-10-12.*

The backend program. One file, `main.go`. It contains no rules and no SQL; its job is to
build the parts and connect them.

## What it does, in order

1. Reads the command: `serve` (default), `migrate` or `seed`. Anything else prints the usage.
2. Loads the settings (`internal/config`).
3. Opens the database and runs pending migrations (`internal/store`).
4. `seed`: loads the demo data and exits. `migrate`: exits.
5. `serve`: creates the trip service on top of the store, creates the web layer on top of the
   service, and starts the HTTP server.

Step 5 is the only place where the layers meet:

```go
trips := service.NewTrips(db)
handler := httpapi.NewHandler(trips, log, cfg.CORSOrigin)
```

This is called **dependency injection by constructor**: each part receives what it needs as an
argument, instead of reaching for a global variable. It is what lets the tests pass in a fake.

## Stopping

Ctrl+C (or a stop signal from Docker) does not kill the server at once. It stops accepting new
requests and gives the running ones up to 10 seconds to finish, then closes the database.
Without this, a deploy could cut a request in half.

## Logs

One logger (`log/slog`, text format, to stderr) is created here and passed down. Every request
writes one line with method, path, status and duration. A fatal start-up error is logged and
the program exits with code 1.

## Things to know

- If the port is taken or blocked, `serve` returns the error and the program exits.
- The server has a 5-second limit for reading request headers, so a client that connects and
  sends nothing cannot hold a connection open forever.
