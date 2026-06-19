---
name: docs-url-skill-generator
description: "Generate one or multiple reusable Copilot skills from a documentation URL by crawling the docs site, extracting repeatable workflows, checking for overlap with existing skills, and producing production-ready SKILL.md artifacts with decision branches and completion checks. Use when the user says: 'te paso una URL de docs', 'analiza esta documentación y crea skills', 'genera skills para esta tecnología/API/framework'."
argument-hint: "Provide: docs URL, target repository, desired depth (quick or deep), and whether to create new skills, update existing ones, or both."
user-invocable: true
---

# Docs URL Skill Generator

Use this skill when a user provides a documentation URL and asks to create one or multiple reusable skills for that technology, API, framework, SDK, or platform.

## Outcome
- Crawl and analyze the documentation site from the provided URL.
- Build evidence-backed workflow maps from real docs content.
- Identify repeatable workflows worth automation.
- Check overlap against existing skills before creating anything.
- Create one or multiple high-quality skill artifacts only when justified.
- Return a structured report with evidence, verdict, created artifacts, and unresolved gaps.

## When to Use
- "Te doy una URL de documentación: analiza y crea skills."
- "Necesito skills para esta API/framework a partir de sus docs."
- "Extrae procesos repetibles de esta documentación y automatízalos."
- "Convierte esta documentación técnica en skills reutilizables."

## When NOT to Use
- The user only wants a summary of docs with no automation intent.
- The source is not documentation (marketing page, blog-only post, release notes without operational workflows).
- The workflow is one-off or cannot be verified from available evidence.

## Non-Negotiable Rules
- Never invent workflow steps not present in documentation evidence.
- Do not create duplicate skills when existing skills already cover the same process.
- Preserve real branching logic, prerequisites, validation checks, and stop conditions.
- Prefer updating an existing skill over creating a near-duplicate.
- If documentation access is partial, state exact blind spots and constrain recommendations.

## Inputs Required
- Documentation root URL.
- Target repository where skill artifacts should be created.
- Depth mode:
  - `quick`: 10-30 key pages
  - `deep`: broad crawl within domain section(s)
- Output strategy:
  - `create-only`
  - `update-only`
  - `create-or-update`

## Source Acquisition Strategy
Use this order of evidence collection:
1. Docs root page and global navigation.
2. `sitemap.xml` and section indexes.
3. `llms.txt`, `openapi.json/yaml`, API references, SDK references.
4. Core guides: quickstart, auth, setup, migration, deployment, error handling.
5. Command references, CLI workflows, troubleshooting and validation guides.

If tools support shell/web fetch, collect pages with deterministic methods (e.g., curl/wget) and keep a URL evidence list.

## Procedure

### Step 1: Scope and Constraints
1. Confirm URL, depth (`quick` or `deep`), target repository, and desired output strategy.
2. Define crawl boundaries (same domain/path unless user says otherwise).
3. Define max pages/time budget to avoid runaway crawl.

### Step 2: Crawl and Evidence Map
1. Discover docs structure from nav/index/sitemap.
2. Gather representative pages per major domain topic.
3. Build an evidence map:
   - URL
   - Topic
   - Workflow clues (setup, auth, CRUD, error handling, deployment, observability)
   - Verification status

### Step 3: Extract Candidate Workflows
For each topic, extract real process sequences:
- prerequisites
- ordered steps
- branching decisions
- validation checks
- failure modes and recovery paths
- completion criteria

Discard candidates that are:
- one-off
- too vague
- purely conceptual with no executable sequence

### Step 4: Existing Skill Overlap Check
Inspect target `.github/skills/` inventory and compare each candidate against existing coverage.
Mandatory explicit check against these common overlaps:
- `smart-merge-resolve`
- `sync-code-to-docs`

Decision per candidate:
- `covered`: no new artifact
- `extend-existing`: update existing skill
- `new-skill`: create new skill

### Step 5: Skill Design
For each approved `new-skill` or `extend-existing` candidate:
1. Define skill name and trigger phrases users would actually say.
2. Write exact procedure from documentation evidence.
3. Encode decision branches and stop conditions.
4. Include validation and completion checks.
5. Define strict output format.
6. Keep scope narrow and coherent (one skill per clear workflow family).

### Step 6: Artifact Creation
Create artifacts in target repository:
- `.skills/<skill-name>/SKILL.md`

Add supporting files only when they materially improve reliability:
- `.skills/<skill-name>/references/` for source mapping tables
- `.skills/<skill-name>/assets/` for reusable templates/checklists
- `.skills/<skill-name>/scripts/` only if scriptable automation is essential

### Step 7: Quality Gate
Before finalizing:
- Confirm each skill is evidenced by specific documentation sections.
- Confirm no duplicate/overlapping skill was created unnecessarily.
- Confirm every skill has clear triggers, procedure, branches, and completion checks.
- Confirm unresolved ambiguities are explicitly documented.

## Decision Branches
- If docs are blocked by login/CAPTCHA/private portal:
  - Ask user for exported docs, access token, or selected pages.
  - Do not fabricate missing sections.
- If docs are too large for full deep crawl:
  - Prioritize architecture, quickstart, auth, API lifecycle, errors, deployment.
  - Mark non-covered sections as residual gaps.
- If candidate workflow overlaps heavily with an existing skill:
  - Update existing skill instead of creating a new one.
- If extracted process lacks repeatability:
  - Reject skill creation and explain why.

## Output Format
Return results in this structure:

- `Workflow Evidence`: URLs/sections analyzed and why they matter.
- `Repeatability Verdict`: create-skill, update-existing-skill, or no-skill (per workflow).
- `Existing Skill Check`: overlap analysis with current skill inventory.
- `Proposed Automation`: reusable workflow(s), decision points, completion checks.
- `Skill Artifact`: paths created/updated and short summary of each artifact.
- `Residual Gaps`: inaccessible docs, ambiguous areas, or evidence limitations.

## Completion Checks
- The documentation URL was analyzed directly (not inferred).
- At least one evidence map exists linking URL -> workflow extraction.
- Existing skills were checked before creating new artifacts.
- Each created skill is justified by repeatable, documented workflow evidence.
- No undocumented steps were invented.
- Residual uncertainty is explicitly reported.

## Example Invocation Triggers
- "Analiza esta URL de docs y crea las skills necesarias para esta tecnología."
- "Te paso la documentación de esta API, sácame skills reutilizables."
- "Revisa este framework en su documentación oficial y genera skills para su uso en el proyecto."
- "Convierte esta documentación en una librería de skills para el equipo."