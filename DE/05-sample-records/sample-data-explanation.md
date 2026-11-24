# Sample records

sample-records.sql uses invented names, a reserved .test email and a fictional complaint. It uses actual schema tables and columns, inserts parent rows before foreign-key children, relies on defaults where possible, and rolls back. The example coordinates are only numeric demo values and are not tied to a real person.

`sample-records.sql` is a rollback-only alternative and was not executed in this review. `demo-fixtures.sql` is a separate fictional fixture set intended for the local DE database and commits its rows so the read-only demonstrations have data. Its associated query capture contains matching demo categories, wards, complaints, histories and transfer counts. The user manually verified `civicresolve_de_test` at `127.0.0.1:5432`; the fixture and query transcripts do not contain that identity preflight. Never use the deployed database.

The fixtures contain no credentials or real personal information. The `co_demo_003` transfer now routes from Demo Sanitation to its current department, Demo Public Works, and the Issue `reportCount` values match the number of linked complaints. The fixture remains fictional demonstration data, not a record of application transactions.
