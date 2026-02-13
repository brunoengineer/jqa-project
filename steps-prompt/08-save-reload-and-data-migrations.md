# Step 08 — Robust save/reload (and tiny migration safety)

## Goal
Ensure reopening the app always shows persisted data, and handle older/partial files gracefully.

## Deliverables
- Storage layer hardened:
  - tolerate missing/invalid files
  - stable sorting by createdAt
- Optional: a simple `schemaVersion` field in JSON metadata

## Acceptance criteria
- If an output `.md` exists but metadata is missing, it doesn’t crash the app
- Outputs sort newest-first

## Copilot prompt

Inside `qa-lobby`, harden the storage layer and project detail loading.

Requirements:
- All list functions must be resilient:
  - If a JSON file is invalid, skip it and continue
  - If an output has metadata but `.md` is missing, skip the output (or show placeholder) without crashing
- Add createdAt timestamps and sort outputs newest-first
- (Optional) add `schemaVersion` to metadata for future-proofing

No new UI features beyond minor error messages.
