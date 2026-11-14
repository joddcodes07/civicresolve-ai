# Taste
- Wants distinctive, custom UI/UX — explicitly rejects "generic AI slop" design; expects intentional visual craft rather than templated output. Confidence: 0.75
- When asked a direct yes/no status question, wants a direct answer first ("just answer the question") — no extra tool runs, verification passes, or re-explaining the task. Confidence: 0.6
- Expects a complete, actually working end-to-end deliverable — frontend, backend, and database all functional — not partial stubs or a demo-only layer. Confidence: 0.7
- Expects changes to be verified against the live/running app (sign-in, submissions, real endpoints), not just passing unit tests — complains loudly when the app stops working after a task ("nothing is working now") and wants it fully restored and re-checked. Confidence: 0.55
- Wants minimal, tightly scoped diffs: do not reformat or refactor surrounding code, and leave changes uncommitted for their review. Confidence: 0.6
- Expects the README/docs to be updated whenever a feature or API behavior changes ("did you update the readme when you added…"), not just the code and tests. Confidence: 0.65
