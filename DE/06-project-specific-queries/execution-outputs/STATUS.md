# Execution status

`query-results.txt` already contains a psql capture for Q1–Q14. Q12, Q13, and Q14 each end with ROLLBACK. Results align with the fictional data in `../../05-sample-records/demo-fixtures.sql`.

The user manually verified the target as `civicresolve_de_test` at `127.0.0.1:5432`. The capture itself does not include `current_database()`, `inet_server_addr()`, or `inet_server_port()`, so that identity preflight is not part of the original transcript. No query SQL was rerun in this review. Keep any supplementary preflight record free of connection strings and passwords.
