# Pune reference data provenance

`pune-2022-wards.geojson`: 58 historical 2022 electoral wards, independently digitized from PMC ward PDFs by SeerMaps Technologies, commissioned by Nikhil VJ. Source: https://github.com/answerquest/pune-2022-wards (MIT; license preserved in `pune-wards-LICENSE`). The original source includes per-ward PMC PDF links. These are actual digitized geographic boundaries, **not certified current administrative wards**. Validate current PMC boundaries before a public rollout.

`pune-places.json`: named schools/hospitals downloaded from OpenStreetMap using Overpass; each row has its original OSM URL. © OpenStreetMap contributors, ODbL-1.0: https://www.openstreetmap.org/copyright . Snapshot time is in the file. May contain omissions or outdated records. Import clips the download to the historical ward polygons. Respect ODbL attribution/share-alike when redistributing a derived database.

Departments and SLA targets in `src/data/taxonomy.js` are inherited application routing choices. They are **not a verified PMC department registry or official SLA commitments**. The importer records this distinction in `Setting.referenceData` and never overwrites existing department or SLA values.

No real citizen accounts, private complaint records, or complaint photos are included. The original demo seed contains invented complaints and illustrative boundaries. It now refuses to operate on a nonempty database or in production; existing data is preserved.
