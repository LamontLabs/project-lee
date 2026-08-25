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
    "capabilities": ["inspect", "read", "preview", "apply", "check"]
  }
]
```

`tokenEnv` is the name of an environment variable, not the credential itself. Set each project key as a Replit Secret. The bridge rejects non-HTTPS endpoints, unknown project IDs, missing credentials, unsafe paths, oversized files, and unregistered commands.

## Enable a connected project

Run the project-agent routes in the connected project’s API service and set:

```text
PROJECT_BRIDGE_API_KEY=<project-specific secret>
MCP_PROJECT_NAME=Frontend project
MCP_PROJECT_ROOT=<optional workspace root>
```

The project-agent routes are:

- `GET /api/project-bridge/inspect`
- `POST /api/project-bridge/files/read`
- `POST /api/project-bridge/changes/preview`
- `POST /api/project-bridge/changes/apply`
- `POST /api/project-bridge/checks/run`

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