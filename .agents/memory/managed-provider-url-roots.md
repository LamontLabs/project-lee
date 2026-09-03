---
name: Managed provider URL roots
description: Replit-managed AI provider base URLs already identify the provider API root.
---

Use the managed provider base URL as supplied; do not append a second version prefix based on public-provider examples. The Gemini base URL expects model calls directly beneath its root.

**Why:** Adding an extra `/v1beta` segment caused managed Gemini requests to fail with a 400 even though credentials and the model were valid.

**How to apply:** Prefer the provisioned SDK clients; if an adapter must use HTTP, inspect the managed base URL contract and append only the provider operation path.