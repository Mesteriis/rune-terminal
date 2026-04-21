package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

//go:embed migrations/*.sql
var embeddedMigrations embed.FS

type migration struct {
	Version int
	Name    string
	SQL     string
}

type Migrator struct {
	fs fs.FS
}

func NewMigrator() *Migrator {
	return &Migrator{fs: embeddedMigrations}
}

func NewMigratorWithFS(migrationFS fs.FS) *Migrator {
	return &Migrator{fs: migrationFS}
}

func (m *Migrator) Migrate(ctx context.Context, dbConn *sql.DB) error {
	if err := ensureMigrationTable(ctx, dbConn); err != nil {
		return err
	}
	rows, err := dbConn.QueryContext(ctx, `SELECT version FROM schema_migrations ORDER BY version`)
	if err != nil {
		return fmt.Errorf("read applied migrations: %w", err)
	}
	defer rows.Close()

	applied := map[int]struct{}{}
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return err
		}
		applied[version] = struct{}{}
	}
	if rows.Err() != nil {
		return rows.Err()
	}

	migrations, err := m.loadEmbeddedMigrations(ctx)
	if err != nil {
		return err
	}

	for _, item := range migrations {
		if _, ok := applied[item.Version]; ok {
			continue
		}
		if err := applyMigration(ctx, dbConn, item); err != nil {
			return err
		}
	}
	return nil
}

func (m *Migrator) loadEmbeddedMigrations(_ context.Context) ([]migration, error) {
	entries, err := fs.ReadDir(m.fs, "migrations")
	if err != nil {
		return nil, fmt.Errorf("read migrations directory: %w", err)
	}
	migrations := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if filepath.Ext(name) != ".sql" {
			continue
		}
		version, err := parseMigrationVersion(name)
		if err != nil {
			return nil, err
		}
		raw, err := fs.ReadFile(m.fs, filepath.ToSlash(filepath.Join("migrations", name)))
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", name, err)
		}
		migrations = append(migrations, migration{
			Version: version,
			Name:    name,
			SQL:     strings.TrimSpace(string(raw)),
		})
	}
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})
	return migrations, nil
}

func ensureMigrationTable(ctx context.Context, dbConn *sql.DB) error {
	ensureSQL := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TEXT NOT NULL
	);
	`
	if _, err := dbConn.ExecContext(ctx, ensureSQL); err != nil {
		return fmt.Errorf("ensure schema_migrations table: %w", err)
	}
	return nil
}

func applyMigration(ctx context.Context, dbConn *sql.DB, item migration) error {
	tx, err := dbConn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()
	if item.SQL != "" {
		if _, err := tx.ExecContext(ctx, item.SQL); err != nil {
			return fmt.Errorf("apply migration %s: %w", item.Name, err)
		}
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)
	`, item.Version, item.Name, time.Now().UTC().Format(time.RFC3339Nano)); err != nil {
		return fmt.Errorf("record migration %s: %w", item.Name, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", item.Name, err)
	}
	return nil
}

func parseMigrationVersion(name string) (int, error) {
	parts := strings.SplitN(name, "_", 2)
	if len(parts) == 0 {
		return 0, fmt.Errorf("invalid migration filename %q", name)
	}
	version, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid migration version %q", name)
	}
	return version, nil
}
