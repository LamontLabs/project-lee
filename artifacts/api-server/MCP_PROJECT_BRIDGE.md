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
    "capabilities": ["inspect", "read", "preview", "apply", "check"]
  }
]
```

`tokenEnv` is the name of an environment variable, not the credential itself. Set each project key as a Replit Secret. `adapter` may be:

- `auto` (default): try the companion contract first and use the standard contract only when the companion inspect route returns 404.
- `project-agent`: use the existing `/api/project-bridge/*` contract.
- `replit-standard`: use common Replit routes under `/api/inspect`, `/api/files/read`, `/api/changes/preview`, `/api/changes/apply`, and `/api/checks/run`.

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

For `replit-standard`, use the equivalent routes listed in the adapter configuration above. Both route sets must enforce the same credential header, workspace-relative path restrictions, bounded file sizes, safe check allowlist, preview-before-apply flow, and HMAC confirmation behavior.

The project key is accepted only in `X-Project-Bridge-Key` or a Bearer authorization header. File operations are workspace-relative and reject absolute paths, traversal, `.git`, and `.env` paths. Checks are limited to the registered package typecheck/build/test commands.

## MCP tools

- `projects_list`
- `project_inspect`
- `project_file_read`
- `project_change_preview`
- `project_change_apply`
- `project_check_run`
- `multi_project_work` (including explicitly confirmed `apply` steps)

Changes must be previewed first. Applying changes requires the exact preview payload, an unexpired confirmation token, and a matching HMAC signature at the receiving project. `multi_project_work` supports dependent inspect/read/preview/check steps and reports successful, failed, and skipped steps separately.

This initial bridge intentionally does not expose deployment, deletion, arbitrary shell, secret access, or silent synchronization. Any future consequential write tool must pass the existing governance and CerbaSeal boundaries.