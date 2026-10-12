# .github/workflows — automatic checks

*Written 2026-10-12.*

GitHub Actions reads the `.yml` files in this folder. There is one: `ci.yml`.

## `ci.yml`

Runs on every push to `main` and on every pull request. It has two jobs that run side by
side, one per half of the project, so a failure says at once which half broke.

| Job | Steps |
| --- | --- |
| Backend (Go) | `gofmt` check, `go vet ./...`, `go build ./...`, `go test ./...` |
| Frontend (React) | `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build` |

These are the same commands a developer runs by hand; CI only makes sure nobody forgets.

## Choices and their reasons

- **The backend job starts a real PostgreSQL 17** as a service container, the same major
  version as `docker-compose.yml`. 21 of the backend tests run real SQL, including the two
  that prove a seat cannot be sold twice. A fake database could not prove that.
- **A skipped test fails the run.** The database tests skip themselves when no database
  answers. That is right on a laptop, but in CI a skipped test would look like a passing one,
  so a last step fails the job if any test was skipped.
- **The Go version comes from `backend/go.mod`**, so CI and the code cannot disagree about it.
- **`npm ci`, not `npm install`**: it installs exactly what `package-lock.json` says and fails
  if the lock file is out of step.
- **`permissions: contents: read`**: the workflow only needs to read the code, so that is all
  it is given.
- **A newer push cancels the older run** on the same branch, to not spend minutes on a commit
  that has already been replaced.
- The database password in the file is for the container that lives only during the run. It
  is not a secret and opens nothing else.

## Not done yet

- No frontend tests exist, so the frontend job cannot run any.
- Nothing is deployed from here.
