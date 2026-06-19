---
name: smart-merge-resolve
description: 'Help integrator resolve Git conflicts by reading both sides of the code, inferring each developer intent, proposing a combined resolution, and explaining step by step why the merge preserves both behaviors. Use for merge conflicts beyond Current Change vs Incoming Change.'
argument-hint: 'Describe the conflicted files, branches, conflict markers, or merge scenario that should be resolved intelligently.'
user-invocable: true
---

# Smart Merge Resolve

Use this skill when `integrator` encounters a Git conflict and needs to do more than choose `Current Change` or `Incoming Change`.

## Outcome
- Read both conflicting versions of the code.
- Infer what each developer was trying to achieve.
- Propose a combined resolution that preserves the valid logic from both sides whenever possible.
- Explain step by step why the merged code was built that way.
- Apply the merged resolution by default when the context is clear, the result is safe, and edit tools are available.
- Reduce regressions caused by simplistic conflict resolution.

## When to Use
- Git conflict markers appear in a file.
- A merge, rebase, or cherry-pick has conflicting code paths.
- The change cannot be resolved safely with `ours` or `theirs`.
- `integrator` needs to merge two valid behaviors into one coherent implementation.
- A text conflict hides a deeper logic conflict.

## Non-Negotiable Rules
- Never resolve a conflict by blindly choosing `Current Change` or `Incoming Change`.
- Always inspect the intent of both sides before proposing merged code.
- Prefer composition of valid behaviors over replacement when both sides matter.
- Use the merge base when available to distinguish additive changes from conflicting rewrites.
- If one side is clearly broken, obsolete, or incompatible, explain why it should not survive the merge.
- Do not invent behavior that is unsupported by either side or by surrounding repository context.
- If the conflict cannot be resolved safely from available evidence, stop and state what is missing.

## Primary Inputs
Gather as much of this as possible:
- The conflict block itself
- The surrounding function, class, or module context
- The `Current Change` version
- The `Incoming Change` version
- The common base version when available
- Relevant tests, types, interfaces, or call sites that clarify expected behavior

## Merge Heuristics
Use these rules in order:
1. Preserve behavior that both sides still require.
2. If one side adds a fix and the other adds a feature, merge both unless they are incompatible.
3. If one side renames or restructures while the other changes logic, port the logic into the new structure.
4. If contracts changed, prefer the version aligned with the broader repository and create a compatibility bridge only when necessary.
5. If one side introduces risk without benefit, reject it explicitly rather than silently blending it in.

## Procedure
1. Identify the exact conflict scope: file, function, module, or contract.
2. Extract the conflicting sections and enough surrounding code to understand behavior.
3. Reconstruct what `Current Change` intended to accomplish.
4. Reconstruct what `Incoming Change` intended to accomplish.
5. If available, compare both sides with the merge base to see what changed independently.
6. Decide whether the right resolution is:
   - combination of both sides
   - one side plus selected logic from the other
   - staged compatibility solution
   - rejection of one side with clear justification
7. Write the proposed combined code.
8. Validate the merged logic against nearby types, tests, interfaces, and expected behavior.
9. Explain step by step why each part of the final code came from one side, the other side, or the surrounding repository context.
10. If the merged result is well justified and edit tools are available, apply the resolution directly.

## Decision Branches
- If both sides solve different problems in the same block, combine them.
- If both sides solve the same problem differently, choose the version more consistent with repository contracts and explain why.
- If one side depends on schema, API, or interface changes elsewhere, inspect those dependencies before finalizing the merge.
- If no safe combined code is possible, return a blocked resolution with the exact reason.

## What To Check Before Finalizing
- The merged code still compiles logically within the local context.
- No variable, import, type, or helper used by the final code is missing.
- The merged behavior does not drop an important fix, guard, or validation from either side.
- The result matches the broader repository direction better than a raw text choice would.

## Output Format
Always return the result in this structure:

- `Conflict Scope`: file and code region being resolved
- `Current Intent`: what the current branch was trying to do
- `Incoming Intent`: what the incoming branch was trying to do
- `Resolution Strategy`: combine, adapt, prefer-current, prefer-incoming, or block
- `Merged Code`: the exact proposed combined code block
- `Step-by-Step Rationale`: numbered explanation of why the final code was merged that way
- `Applied`: yes or no, with a short reason
- `Residual Risks`: anything still uncertain, unvalidated, or dependent on broader branch context

## Completion Checks
Before returning the resolution, verify all of the following:
- Both sides were analyzed, not just the conflict markers.
- Intent was reconstructed for each side.
- The chosen strategy was named explicitly.
- The proposed code is internally coherent.
- The explanation shows why the merge respects the logic of both developers where appropriate.
- If the resolution was applied, the reason it was safe enough to apply is explicit.
- Any unresolved uncertainty is stated clearly.

## Example Invocation Triggers
- `Use smart-merge-resolve on this conflicted file.`
- `Resolve this Git conflict without choosing Current or Incoming blindly.`
- `Read both versions and propose a combined merge with rationale.`
- `Help integrator merge these two implementations into one coherent block.`