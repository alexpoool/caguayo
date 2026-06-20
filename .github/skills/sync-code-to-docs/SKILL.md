---
name: sync-code-to-docs
description: 'Synchronize code changes with docs markdown files after a feature is finished. Use for analyzing modified code, locating the correct docs/*.md file to update, and generating exact markdown changes without inventing APIs, endpoints, or behavior not present in source code.'
argument-hint: 'Describe the completed feature, changed files, or diff that should be reflected in docs/. '
user-invocable: true
---

# Sync Code To Docs

Use this skill after a functionality is finished to keep documentation synchronized with the actual repository state.

## Outcome
- Inspect recently modified code or an explicit change set.
- Identify which `.md` file in `docs/` should be updated.
- Generate the exact markdown modifications needed to keep documentation aligned with the code.
- Create a new focused markdown document by default when no suitable docs target exists and shipped behavior would otherwise remain undocumented.
- Avoid inventing APIs, endpoints, payloads, workflows, or behavior that do not exist in source.

## When to Use
- A feature was completed and documentation may now be stale.
- A bug fix changed behavior and docs must reflect the new reality.
- API handlers, services, hooks, or user-facing flows were modified.
- `doc-specialist` or another agent needs a disciplined post-implementation documentation sync.

## Non-Negotiable Rules
- Use the actual changed code as the source of truth.
- Never document endpoints, fields, responses, options, or side effects that cannot be verified in code.
- Prefer updating an existing domain doc in `docs/` over creating redundant new files.
- Make the smallest documentation change that restores accuracy.
- If the repository evidence is incomplete, state the exact gap instead of filling it with assumptions.
- If no suitable documentation file exists, identify that explicitly and create the smallest sensible new markdown file by default to avoid undocumented shipped behavior.

## Primary Inputs
Collect as many of these as possible:
- Changed files from Git diff, PR, branch, or explicit user list
- Relevant routes, services, hooks, components, schemas, and types
- Existing docs in the matching domain folder under `docs/`
- Any current README or implementation guide already covering the feature

## Documentation Mapping Rules
Map code to docs using the nearest domain first:
- `app/api/**`, `src/services/**`, database functions, or contract changes
  - Check `docs/database/`, then the relevant feature folder
- `app/services/**`, `src/components/features/services/**`, `src/hooks/useService*`, service booking logic
  - Check `docs/services/`
- `app/products/**`, product catalog logic, `src/components/features/products/**`
  - Check `docs/products/` or `docs/cart-catalog/`
- `app/events/**`, ticketing, reservations, event flows
  - Check `docs/events/` or `docs/tickets/`
- Auth, guest mode, login, register, security
  - Check `docs/auth/`
- Payment, wallet, checkout, currency, order payment flows
  - Check `docs/payments/` or `docs/wallet/`
- UI-only shared behavior or loading patterns
  - Check `docs/ui-components/`
- Cross-cutting architectural or implementation summaries
  - Check `docs/README.md`, `docs/planning/`, or the smallest relevant root-level doc

If multiple docs could apply:
1. Update the most specific domain doc first.
2. Update a higher-level summary only if the change materially affects it.
3. Do not duplicate the same detail across many docs unless the repo already uses that pattern.

## Procedure
1. Identify the exact code changes to synchronize.
2. Read the changed files and surrounding code until the implemented behavior is clear.
3. Extract only the verified deltas: behavior, API surface, configuration, user flow, constraints, or implementation notes that changed.
4. Search `docs/` for the most specific existing markdown file that already covers that area.
5. Decide whether the correct action is:
   - update an existing doc
   - update multiple docs with clearly different purposes
  - create one new small doc because no current file covers the shipped behavior
6. Write the exact markdown changes needed.
7. Apply the documentation update if edit tools are available and the target is unambiguous.
8. Report what was updated and what evidence justified each modification.

## What To Extract From Code
- Added, removed, or changed endpoints
- Updated request or response shapes
- New validations or constraints
- New services, hooks, or feature flows
- Changed user-visible behavior
- Important operational notes or setup steps now required by the implementation

## What Not To Infer
- Future roadmap items
- Planned but unimplemented endpoints
- Example payloads not backed by code
- Error cases that are not observable in implementation
- Security guarantees not explicitly enforced in code

## Update Style
- Keep docs precise and operational.
- Prefer patching the exact affected section instead of rewriting the whole file.
- Preserve the repository's documentation tone and structure.
- If a section becomes inaccurate, replace it instead of appending contradictory notes.

## Output Format
Always return the result in this structure:

- `Changed Code Scope`: the files or feature area analyzed
- `Target Docs`: the markdown file or files selected in `docs/`
- `Verified Deltas`: the exact behavior or interface changes confirmed in code
- `Markdown Changes`: the exact markdown content to add, replace, or remove
- `Applied`: yes or no, with a short reason
- `Residual Gaps`: anything still undocumented, ambiguous, or unsupported by code evidence

## Completion Checks
Before ending, verify all of the following:
- The code change was inspected directly.
- At least one concrete `docs/*.md` target was evaluated.
- No undocumented API or endpoint was invented.
- The markdown changes are exact enough to apply without reinterpretation.
- The selected doc location is the most specific sensible place for the update.
- Any unresolved ambiguity is stated explicitly.

## Example Invocation Triggers
- `Sync the docs after finishing this feature.`
- `Analyze these changed files and update the correct docs markdown.`
- `Keep docs/ synchronized with this implementation.`
- `Find which docs file should change after this new API or feature.`