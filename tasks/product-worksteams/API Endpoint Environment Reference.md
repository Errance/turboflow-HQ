# API Endpoint Environment Reference

**Last updated:** 2026-06-03 16:05 +08

Shared cex-api-service public hosts for product workstream API documents.

| Environment | Public Host |
| --- | --- |
| SIT | `sit-api.turboflow-test.xyz` |
| UAT | `api.turboflow-test.xyz` |

## Usage

- Use these hosts in internal artifacts when drafting or reviewing product workstream API documents.
- External-facing vendor docs should expose only the UAT endpoint unless TurboFlow explicitly approves exposing another environment.
- Product-specific paths should be appended by each API document, for example `/api/v1/vendor/feed`.
- Credentials, tokens, and secrets must not be stored in this reference file.

## Progress

- [x] `2026-06-03 16:05 +08` Updated SIT public host to `sit-api.turboflow-test.xyz` and clarified that external-facing docs should expose UAT only.
- [x] `2026-06-03 16:05 +08` Updated UAT public host to `api.turboflow-test.xyz`.
- [x] `2026-05-27 14:10 +08` Added shared SIT and UAT endpoint host reference.
