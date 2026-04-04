# Subagent Task Orchestration (Repo Standard)

Use this playbook to break down work into safe subtasks and execute them with subagents.

## Workflow (always)

1) SCOUT → 2) PLAN → 3) IMPLEMENT (phased) → 4) REVIEW (per phase)

## Optional branch for UI-heavy work

- Insert a DESIGNER pass after planning or after implementation when the task involves layout, hierarchy, spacing, accessibility, responsiveness, or polish.

## Read first

- `AGENTS.md`
- `WORKSPACE_LIVING_DOC.md`
- `.github/copilot-instructions.md`

## Rules

- No `.env` edits
- Atomic changes
- Verify with repo checks
- Stop on ambiguity with options + recommendation
