# ER diagrams

Diagrams were reconstructed from checked-in Prisma schema and migration history, not a live catalog. Existing ERD reflects the initial migration; final conceptual and physical ERDs reflect current Prisma models and later migrations. Crow's Foot cardinalities are encoded in Mermaid sources.

| Diagram | Editable source | Exports |
|---|---|---|
| Existing | `existing-erd.mmd`, `existing-erd.dbml` | `existing-erd.svg`, `existing-erd.png` |
| Final conceptual | `final-conceptual-erd.mmd` | `final-conceptual-erd.svg`, `final-conceptual-erd.png` |
| Final physical | `final-physical-erd.mmd`, `final-physical-erd.dbml`, `final-erd.drawio` | `final-physical-erd.svg`, `final-physical-erd.png` |

There are one-to-many links for department-to-category and complaint-to-event records, and one-to-one links for a department head (nullable unique FK) and feedback. The schema has no M:N junction table; many complaints can refer to one issue.
