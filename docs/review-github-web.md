# GitHub web publication final review

Reviewed on 2026-10-21 against `docs/superpowers/specs/2026-10-17-github-web-design.md` and `docs/superpowers/plans/2026-10-17-github-web.md`.

**Assessment: no actionable P1/P2 findings in the inspected implementation. Approved for the planned deployment and live integration checks.** This is code review approval, not a claim that the unpublished services have passed live verification.

Reviewed the cloud API, RoomStore persistence bridge, API route, D1 schema/migration, browser identity/API/share integration, runtime configuration, static export, resource paths, and export exclusions.

- Client identity uses an independently generated private token, stored outside render state and sent in the private request header. The server atomically binds a SHA-256 token hash to the public ID and verifies subsequent requests. Only public IDs appear in room data; responses do not return tokens or hashes. SQL parameters are bound and unexpected internal errors do not expose database values.
- Room changes use an independent revision with conditional update/delete and a room-generation ID guard. Conflicts discard speculative state and rerun the original operation against persisted state. Candidate versions are rechecked, readiness updates cannot silently replace each other, and persisted `drawVersion` preserves same-round draw retry behavior. Final leave uses conditional deletion.
- CORS checks exact origins and validates preflight methods/headers. The route permits the specified GitHub origin and explicit local validation origins. JSON parsing counts streamed bytes against its limit. D1 tables and generated migration match the API queries.
- API requests use the configured HTTPS origin. Static resources/imports and the avatar are relative; sharing retains the current project pathname and removes stale query/hash before adding the room code. The private token is not included in invitations.
- Pages output uses an explicit static asset allowlist, overwrites its runtime configuration with only a public API origin, and includes `.nojekyll`. The inspected export contains exactly ten expected files, without backend code, database state, credentials, or operational documents. Output-path guards protect project sources; ignored build/runtime directories are excluded from source publication.
- Gesture model/controller, client model, and catalog are unchanged from the accepted prototype after line-ending normalization. The browser continues calling the existing authoritative draw operations; gestures do not change candidate weights.

The parent reported 87 unit/domain/HTTP/cloud/Pages checks and the native Sites build passing. Completed suites were not rerun by this reviewer. Anonymous deployed API access, applied D1 migrations, cross-origin Pages operation, project-path resource loading, shared invitations, and two independent browser members producing one durable result remain part of the parent's planned local/cloud/live integration verification.

Review was read-only except for this report. No credential material was accessed and no public state was changed.
