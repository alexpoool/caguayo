---
name: docs-audit-cleanup
description: >
  Audit, prune, and reorganize a cluttered docs/ folder by classifying files as
  delete / move / keep, consolidating scattered files into the correct domain
  subfolders, removing obsolete changelogs and debug logs, and rewriting
  docs/README.md as a clean index of what remains. Use when the user says docs
  are messy, scattered, or hard to navigate, or when a periodic docs cleanup is
  requested. Do NOT use for updating doc content after code changes — use
  sync-code-to-docs for that.
argument-hint: >
  Describe the docs folder location and the scope, e.g. "reorganize docs/ in the
  TenLoListo project, delete old bug fix logs and seasonal content".
user-invocable: true
---

# Docs Audit & Cleanup

Use this skill when the docs/ folder has accumulated clutter: fix logs, debug
notes, old sprint reports, seasonal content, duplicate files, or root-level files
that belong in a subdomain folder.

## What This Skill Does
1. Maps the full docs/ structure (root + all subdirectories).
2. Classifies every file as **delete**, **move**, or **keep**.
3. Consolidates scattered files into the correct domain subfolder.
4. Creates new subfolders when a sub-topic has grown to ≥3 files with no folder.
5. Deletes files that no longer carry actionable or reference value.
6. Runs the operations or generates a runnable shell script when shell tools are unavailable.
7. Rewrites `docs/README.md` as an accurate, clean index of the post-cleanup state.

## When to Use
- User says "my docs are a mess / scattered / hard to navigate"
- Regular docs debt cleanup (e.g., after sprints, after a quarter)
- Before onboarding new team members to the repo
- When docs/README.md is out of date or references files that have moved or been removed

## When NOT to Use
- A feature was completed and doc *content* needs updating → use `sync-code-to-docs`
- A new feature lacks documentation → use `sync-code-to-docs`
- Only one or two files need updating → do it directly without this skill

---

## Procedure

### Step 1 — Map the structure
1. `list_dir docs/` to get the root-level file and folder list.
2. `list_dir docs/<subfolder>/` for each subdirectory **in parallel**.
3. Record counts: files at root, files per subfolder, total files.

### Step 2 — Sample ambiguous files
For any file where the name alone is not enough to classify it:
- Read only the first 20–30 lines (enough to see title, date, status, and subject).
- Do NOT read full files unless classification is still unclear after top-of-file sampling.
- Read multiple ambiguous files in parallel.

### Step 3 — Classify every file

Apply the classification rules below. When uncertain, default to **keep** and note it.

#### DELETE — criteria (all must be true)
| Condition | Examples |
|---|---|
| Bug fix or change log for a resolved issue | `BUBBLE_CART_DESIGN_FIXES.md`, `CATEGORY_AUTO_REFRESH_FIX.md` |
| Sprint completion reports (sprint is over) | `SPRINT-1-COMPLETADO.md`, `SPRINT-2-PLAN.md` when dated >3 months ago |
| Debug scratch notes or error logs | `errores.md`, `errores feed.md`, `TICKET_QR_VALIDATION_DEBUG.md` |
| Pending/backlog lists that are clearly stale (dated, superseded by current BACKLOG.md) | `PENDIENTES-ADMIN.md`, `PENDIENTES-FRONTEND.md` |
| Seasonal / time-bounded content past its window | `navidad/` folder for Dec–Jan theme after January |
| Duplicate file (same content, two filenames) | `DYNAMIC-TICKET-TYPES-IMPLEMENTATION.md` vs `DYNAMIC_TICKET_TYPES_IMPLEMENTATION.md` |
| Implementation plan that has a paired `*_COMPLETED.md` in the same folder | `CART_CONTEXT_REFACTORING_PLAN.md` when `CART_CONTEXT_REFACTORING_COMPLETED.md` exists |
| Plain text scratch notes not formatted as documentation | `errores.md` with 2 bullet points |

**STOP — do NOT delete:**
- Any file that is the sole source of truth for current architecture or active API behavior
- Plans still actively in progress (status ≠ COMPLETADO and date ≤ 2 months ago)
- Files referenced from code, README, or BACKLOG
- Files with no clear replacement

#### MOVE — criteria
| Condition | Destination |
|---|---|
| File is in docs/ root but its subject clearly belongs to a domain subfolder | Nearest matching subfolder |
| File is in the wrong subfolder (wrong domain) | Correct domain subfolder |
| Multiple files share a sub-topic but their parent folder has no matching subdirectory | Create subfolder, move all in |

#### KEEP — criteria
- Architecture docs, implementation guides, API references, active plans: keep in place
- Files that are the canonical guide for a running system

### Step 4 — Execute operations

**If shell tools are available**: run `rm` and `mv` commands directly.

**If shell tools are NOT available**:
1. Create a `reorganize-docs.sh` script at the project root.
2. Use `set -euo pipefail` and `DOCS="$(pwd)/docs"` variable.
3. Group commands as: PART 1 — deletions, PART 2 — moves.
4. Each command followed by `&& echo "OK: <short description>"`.
5. Use `rm -f` (not bare `rm`) to avoid script abort on already-deleted files.
6. Create needed directories with `mkdir -p` before moving files into them.
7. End the script with `ls "$DOCS/"` to show the clean root.

### Step 5 — Rewrite docs/README.md

Write the clean index **reflecting the post-cleanup state**, even if the shell script
hasn't been run yet. The README should be accurate for when the cleanup is complete.

Structure:
1. Project/tech summary header (1–3 lines)
2. Navigation table: subfolder → one-line description
3. One section per subfolder (`## subfolder/`) listing every *kept* file with a one-line description
4. Root-level agile files at the end (BACKLOG, ROADMAP, SPRINT)
5. Naming conventions (what `*_DOCUMENTATION`, `*_IMPLEMENTATION`, `*_PLAN` suffixes mean)
6. Rule: no new files at root — always use the domain subfolder

**Do NOT**:
- Reference files that are being deleted
- Reference folders that don't exist (e.g., `subscriptions/` if it was never created)
- Copy the old README structure wholesale — write it fresh from the classified-keep list

---

## Domain Folder Mapping Reference

Use this to decide where a misplaced file belongs:

| File subject | Target folder |
|---|---|
| Auth, login, register, guest mode, password recovery | `auth/` |
| Business profile, catalog, map, payment methods | `business/` |
| Shopping cart, guest checkout, catalog | `cart-catalog/` |
| DB schema, Supabase functions, RPC, service layer patterns | `database/` |
| Bug fixing guides, error solutions, dev methodology | `development/` |
| Events, ticket booking, event automation | `events/` |
| Discovery feed, feed optimization, feed errors | `feed/` |
| AI/ML strategy, recommendations | `IA/` |
| Image URLs, storage paths, next/image alternatives | `image-system/` |
| Business news / novedades system | `news/` |
| Push notifications, snackbar, SMS, cron jobs for comms | `notifications/` |
| Orders, purchase history | `orders/` |
| Payment flows, wallet, WhatsApp redirect | `payments/` |
| Feature planning, roadmaps, refactoring plans | `planning/` |
| Product listing, product creation, categories | `products/` |
| User profile, profile navigation | `profile/` |
| SEO, Open Graph, metadata | `seo/` |
| Services (appointments), booking availability | `services/` |
| QR scanning, ticket types, PDF export, ticket validation | `tickets/` |
| Loading states, shared UI hooks, mobile patterns | `ui-components/` |
| Wallet module, digital currency | `wallet/` |
| Flutter / mobile API reference | `api-flutter/` |
| Cache system | `cache/` |
| Analytics, KPIs | `analytics/` |
| Manual test scripts, validation scripts | `analysis/` |

When no existing folder fits, check if ≥3 files share a sub-topic and create a subfolder.
If only 1–2 files and no good home: default to `planning/` for plans, `development/` for
guides, or create a folder only if it's a clearly expanding topic.

---

## Completion Checks

Before finishing, verify:
- [ ] No `.md` files remain at `docs/` root except `README.md`, `BACKLOG.md`, `ROADMAP.md`, `SPRINT.md`
- [ ] No duplicate filenames in any subfolder
- [ ] `docs/README.md` contains no links to deleted or non-existent files
- [ ] If a shell script was created, it is at the project root (not inside docs/)
- [ ] All `???` or blank entries in the README have been removed

---

## Residual Gaps / Known Limits

- **Seasonal content**: requires knowing the project's active date range. When uncertain, ask the user rather than deleting.
- **Plan files**: a plan dated 4+ months ago with no companion COMPLETED file may still be active. Sample the file before deciding.
- **Cross-repo references**: if a doc links to files in other repos, do not move it without verifying the link still resolves.
- **Non-markdown files in docs/**: JS scripts, shell scripts, etc. should be moved to the appropriate `scripts/` directory in the project root, not kept in `docs/`.