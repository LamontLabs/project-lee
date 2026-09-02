---
name: macOS PostgreSQL runtime closure
description: Bundled PostgreSQL must be architecture-matched and independent of Homebrew or builder paths.
---

macOS desktop releases must stage a complete PostgreSQL native-library closure inside the app resources, rewrite non-system Mach-O dependencies to private loader-relative paths, and verify the expected Intel or Apple Silicon architecture.

**Why:** Homebrew prefixes and native library locations differ by Mac architecture and are not present on installed machines, so a package can pass build-time checks while failing on first launch.

**How to apply:** Keep architecture-aware staging and packaged-app verification in both macOS release jobs; reject absolute non-system dependencies, unresolved private rpaths, and mismatched Mach-O architectures before publishing.