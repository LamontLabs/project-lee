# Multi-Project MCP Build Bridge

This API service can act as an MCP server for coordinating development work across separately deployed Replit projects. It does not share project databases. Each project exposes a small authenticated project-agent surface, and the MCP bridge calls only the capabilities configured for that project.

## Configure the bridge

Set `MCP_BRIDGE_API_KEY` on the bridge deployment. Replit custom MCP configuration should use the deployed HTTPS endpoint:

```text
https://your-bridge.example/mcp
```

The MCP client sends `Authorization: Bearer <MCP_BRIDGE_API_KEY>`. The key is never returned by any tool.

Register remote projects with `MCP_PROJECTS_JSON`:

```json
[
  {
    "id": "frontend",
    "name": "Frontend project",
    "endpoint": "https://frontend.example",
    "tokenEnv": "FRONTEND_PROJECT_BRIDGE_KEY",
    "adapter": "auto",
    "capabilityLevel": "OBSERVE",
    "capabilities": ["inspect", "read"]
  }
]
```

`tokenEnv` is the name of an environment variable, not the credential itself. Set each project key as a Replit Secret. `capabilityLevel` is one of `OBSERVE`, `USE`, `MANAGE`, or `GOVERNED_MANAGE`; it is enforced for every bridge operation. Read access never implies modification or deployment authority. `adapter` may be:

- `auto` (default): try the companion contract first and use the standard contract only when the companion inspect route returns 404.
- `project-agent`: use the existing `/api/project-bridge/*` contract.
- `replit-standard`: use common Replit routes under `/api/inspect`, `/api/files/read`, `/api/changes/preview`, `/api/changes/apply`, and `/api/checks/run`.

Capability levels are cumulative: `OBSERVE` permits manifest, search, file, dependency, log, contract, and deployment inspection; `USE` adds bounded CI/lint/build/test/typecheck checks and change previews; `MANAGE` adds restart; `GOVERNED_MANAGE` adds approved modification. Modification still requires a fresh preview, a successful safe check, explicit owner confirmation, human confirmation, and CerbaSeal ALLOW.

The standard adapter lets an existing Replit project expose the same scoped HTTP contract without copying Lee’s internal database or runtime. Its responses and write confirmation semantics must match the contract below. The bridge rejects non-HTTPS endpoints, unknown project IDs, missing credentials, unsafe paths, oversized files, and unregistered commands. Auto-detection never treats authentication, permission, timeout, or server errors as an adapter mismatch.

## Guided Console setup

The private Lee Console Projects screen includes a compact **Connect project agents** panel. The owner can:

1. Register a project using its ID, display name, HTTPS endpoint, adapter type, and the *name* of its server-side credential secret.
2. Test that project independently. A failed test reports only that project's setup error and does not change the health state of other projects.
3. View the configured capabilities and copy the exact MCP JSON endpoint configuration.

The setup panel never accepts or returns a credential value. Projects added from the panel are available to the running bridge process; put the same sanitized project metadata in `MCP_PROJECTS_JSON` for restart-safe deployment configuration. The MCP client still supplies the bridge credential from its own secret store.

The setup panel never accepts or returns a credential value. Projects added from the panel are available to the running bridge process. The registration response includes a `persistence` object with the exact sanitized `MCP_PROJECTS_JSON` value to store in the bridge deployment for restart-safe configuration. If multiple projects are registered, preserve the complete returned array: updating one project replaces only that project ID and does not remove the others. The persisted value contains `tokenEnv` names only, never credential values. Set each referenced secret separately. The MCP client still supplies the bridge credential from its own secret store.

## Enable a connected project

Expose either the legacy project-agent routes or the standard adapter routes in the connected project’s API service, and set:

```text
PROJECT_BRIDGE_API_KEY=<project-specific secret>
MCP_PROJECT_NAME=Frontend project
MCP_PROJECT_ROOT=<optional workspace root>
```

The legacy project-agent routes are:

- `GET /api/project-bridge/inspect`
- `POST /api/project-bridge/files/read`
- `POST /api/project-bridge/changes/preview`
- `POST /api/project-bridge/changes/apply`
- `POST /api/project-bridge/checks/run`
- `POST /api/project-bridge/search`
- `GET /api/project-bridge/dependencies`
- `POST /api/project-bridge/logs`
- `POST /api/project-bridge/contract/compare`
- `GET /api/project-bridge/deployment`
- `POST /api/project-bridge/restart`

For `replit-standard`, use the equivalent routes listed in the adapter configuration above. Both route sets must enforce the same credential header, workspace-relative path restrictions, bounded file sizes, safe check allowlist, preview-before-apply flow, and HMAC confirmation behavior.

The project key is accepted only in `X-Project-Bridge-Key` or a Bearer authorization header. File operations are workspace-relative and reject absolute paths, traversal, `.git`, and `.env` paths. Checks are limited to the registered package typecheck/build/test commands.

## MCP tools

- `projects_list`
- `project_inspect`
- `project_file_read`
- `project_change_preview`
- `project_change_apply`
- `project_check_run`
- `project_search`
- `project_dependencies`
- `project_logs`
- `project_contract_compare`
- `project_deployment_inspect`
- `project_restart`
- `project_repair_create`, `project_repair_evidence`, `project_repair_request_approval`, `project_repair_execute`, `project_repair_verify`
- `multi_project_work` (including explicitly confirmed `apply` steps)

Changes must be previewed first. Applying changes requires the exact preview payload, an unexpired confirmation token, a matching HMAC signature at the receiving project, explicit owner/human confirmation, and a fresh CerbaSeal ALLOW. `multi_project_work` supports dependent operations and reports successful, failed, and skipped steps separately.

## Deterministic repair loop

`project_repair_create` persists an observation request and ordered plan. The repair lifecycle is resumable:

1. `OBSERVED` → `project_repair_evidence` captures an authenticated project inspection and available project momentum.
2. `EVIDENCE_READY` → `project_repair_request_approval` binds the governance request to the plan and evidence hashes.
3. `AWAITING_APPROVAL` → the owner resolves the linked governance request, then explicitly confirms the repair.
4. `APPROVED` → `project_repair_execute` runs one dependency-checked step at a time, recording attempts and retryable failures.
5. `VERIFYING` → `project_repair_verify` performs a fresh inspection and records PASS/FAIL evidence; no action success is treated as verification.

Interrupted running steps are returned to a retryable state on API startup. Repair evidence, approvals, attempts, verification, and audit records are persisted in PostgreSQL. No repair operation invents a diagnosis or applies a change without the authority checks above.

This initial bridge intentionally does not expose deployment, deletion, arbitrary shell, secret access, or silent synchronization. Any future consequential write tool must pass the existing governance and CerbaSeal boundaries.