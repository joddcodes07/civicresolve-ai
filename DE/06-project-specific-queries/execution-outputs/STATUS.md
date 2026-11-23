# Execution status

Pending execution. No database operation was attempted because the configured DATABASE_URL / DIRECT_URL target was not verified as a separate test database. No sample output is fabricated.

To capture evidence, provision a disposable PostgreSQL database, independently verify host/database/owner, apply the project's migrations there, then run the read-only queries and rollback-wrapped DML statements from ../queries.sql. Save genuine psql output here without connection strings.
