# AGENTS (Repo Entry Point)

This file is the **entrypoint** for any AI agent or subagent working in this repo.

## Read order (required)

1) **WORKSPACE_LIVING_DOC.md** (single source of truth: architecture, workflow, decisions)
2) **.github/copilot-instructions.md** (agent guardrails / repo rules)
3) Any relevant product/design notes (PRD, backlog, UI notes) referenced in the task

> If these sources conflict with anything else you see, **they win**.

## Repo non-negotiables

- **Do not modify or create `.env`.** If environment variables must change, document them only.
- **Keep changes atomic.** Prefer small, reviewable PRs and avoid broad refactors unless explicitly required.
- **Follow existing patterns.** Match current routing, component conventions, data access patterns, and styling.
- **Verify your work.** If you change behavior, run the relevant checks and report results.
- **No scope creep.** If you discover adjacent issues, log them as follow-ups instead of expanding the current change.

## Where to record decisions

If you make material changes (schema/endpoints/auth/permissions/workflow/automation), append a concise note to the **Session Log** in `WORKSPACE_LIVING_DOC.md`:

- what changed
- why
- risks/mitigations
- follow-ups

## Where custom agents live

- Workspace custom agents: `.github/agents/`
- If VS Code does not discover them automatically, add `.vscode/settings.json` with `chat.agentFilesLocations` pointing to `.github/agents`

---

## Standard Subagent Roles (KISS)

Use these role names in prompts. Each role has strict scope.

### 1) SCOUT (Read-only discovery)

**Purpose:** Find relevant files, current patterns, and constraints.  
**Must output:** primary/secondary file list + current behavior summary.  
**Must NOT:** edit files or run commands.

### 2) PLANNER (Acceptance criteria + phased plan)

**Purpose:** Turn findings into a small, testable plan.  
**Must output:** acceptance criteria + 3–7 phases + verification steps.  
**Must NOT:** implement code changes.

### 3) IMPLEMENTER (Make the smallest safe diff)

**Purpose:** Implement one approved phase at a time.  
**Must output:** files changed + what changed + commands run + results.  
**Must NOT:** expand scope, refactor broadly, or improvise requirements.  
**If blocked/ambiguous:** STOP and report open question + options + recommendation.

### 4) REVIEWER (Approve or block)

**Purpose:** Validate against acceptance criteria and repo standards.  
**Must output:** APPROVED / NEEDS_REVISION / FAILED + blocking issues.  
**Must NOT:** bikeshed style or request scope creep.

### 5) DESIGNER (UI/UX polish and layout review)

**Purpose:** Review and refine layout, spacing, hierarchy, readability, accessibility, and responsiveness.  
**Must output:** UI diagnosis + minimum effective change set + rationale.  
**Must NOT:** take ownership of business logic or redesign the product without being asked.
