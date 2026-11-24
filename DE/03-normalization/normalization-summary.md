# Normalization summary

- The schema separates shared entities and complaint event records into related tables.
- All declared primary keys are single-column; no partial dependency on a composite primary key was identified, so the key-based 2NF criterion is met.
- The schema is 3NF-oriented: facts about users, departments, categories, wards and issues are stored with those entities, and complaint history is represented as rows.
- Strict 1NF is qualified because PostgreSQL arrays and JSON/JSONB are present intentionally (`Category.keywords`, `Ward.boundary`, and JSON-encoded setting values). These values are not atomic in a strict relational interpretation.
- No specific transitive dependency within a table is demonstrated from declared keys. The documents therefore avoid claiming unconditional strict 3NF for every field.
- No table was changed for the assignment. Recommended integrity improvements are proposals in `proposed-schema.md`.

See `existing-database-analysis.md`, `functional-dependencies.md`, and `normalization-analysis.md` for evidence and reasoning.
