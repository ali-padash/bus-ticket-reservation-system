# backend/internal

*Written 2026-10-12.*

All the backend's own packages. Go refuses to let code outside this module import anything
under a folder named `internal`, so these packages can change freely.

| Package | Job | May import |
| --- | --- | --- |
| [`config`](config/config.doc.md) | Settings from the environment. | nothing of ours |
| [`domain`](domain/domain.doc.md) | Shared types and named errors. | nothing of ours |
| [`store`](store/store.doc.md) | SQL. | `domain`, `migrations` |
| [`service`](service/service.doc.md) | Rules. | `domain` |
| [`httpapi`](httpapi/httpapi.doc.md) | Routes and JSON. | `domain` |
| [`seed`](seed/seed.doc.md) | Demo data. | `domain` |

## The import rule

`service` does not import `store`, and `httpapi` does not import `service`. Each one declares
a small interface for what it needs (`service.TripStore`, `httpapi.TripService`), and
`cmd/api/main.go` plugs the real thing in. That is why each layer can be tested with a fake.

Only `cmd/api` imports everything.
