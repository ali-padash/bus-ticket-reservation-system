// Package migrations carries the SQL files inside the compiled program,
// so the binary can bring a database up to date without any files next to it.
package migrations

import "embed"

//go:embed *.sql
var Files embed.FS
