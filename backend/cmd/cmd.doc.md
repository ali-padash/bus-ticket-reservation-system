# backend/cmd

*Written 2026-10-12.*

Holds the programs this module can build, one folder each. This is the usual Go layout: code
that can be run lives in `cmd/`, code that is only imported lives in `internal/`.

| Folder | Program | Doc |
| --- | --- | --- |
| `api/` | The backend API, plus its `migrate` and `seed` commands. | [api.doc.md](api/api.doc.md) |
