# Antigravity Execution Plan

## Why Antigravity

Google Antigravity is designed as an agentic development environment where agents can work across the editor, terminal and browser, create plans/artifacts, and verify implementations. Antigravity 2.0 can also orchestrate multiple agents in parallel. citeturn1search0turn1search5

We will use that capability deliberately rather than asking one agent to blindly generate the whole application.

## Rule

**Plan → Build → Run → Inspect → Test → Fix → Approve → Next phase**

Never skip browser verification for a visual feature.

## Agent roles

### Agent 1 — Architect
Responsibilities:
- inspect repository
- convert these markdown requirements into implementation plan
- establish folders
- establish data model
- identify risks

### Agent 2 — Visual Designer
Responsibilities:
- build design tokens
- typography
- theme system
- creator shell
- recipient shell
- animation language

### Agent 3 — Frontend Builder
Responsibilities:
- implement creator flow
- implement live preview
- implement recipient experience
- connect state

### Agent 4 — Backend Builder
Responsibilities:
- database schema
- storage
- secure password verification
- publish flow
- server actions/API

### Agent 5 — QA Agent
Responsibilities:
- browser tests
- mobile viewport tests
- accessibility checks
- broken states
- refresh/deep-link tests
- visual regression checks

If parallel agents are used, each must have a clearly isolated responsibility and must not overwrite another agent's active work.

## Phase 0 — Repository reconnaissance

### Agent task
Inspect the repository before changing anything.

Produce:
- current stack
- existing dependencies
- existing routes
- existing design system
- existing database/backend
- deployment setup
- risks

### Gate
Do not write application code until the repository is understood.

---

## Phase 1 — Foundation

Build:
- project structure
- design tokens
- typography
- theme configuration
- base layout
- reusable animation primitives
- error/loading states

### Verification
Run the application and inspect:
- desktop
- mobile
- light/dark constraints if relevant

---

## Phase 2 — Creator wizard

Build:
- step navigation
- autosave
- validation
- theme picker
- media upload
- message editor
- security field
- live preview

### Gate
A fake in-memory draft must successfully flow from first step to preview.

---

## Phase 3 — Recipient experience

Build:
- locked screen
- PIN verification
- cinematic intro
- name reveal
- memories
- message/letter
- cake/candle moment
- finale

### Gate
Use one seeded birthday experience and test the complete journey in the browser.

---

## Phase 4 — Persistence

Build:
- Supabase schema
- storage
- draft persistence
- publish operation
- unique slug
- secure unlock

### Gate
Create a real experience, close/reload the browser, and open the published URL from a clean browser context.

---

## Phase 5 — Sharing

Build:
- share URL
- QR code
- copy link
- mobile share API where supported
- WhatsApp share helper

### Gate
Scan QR code using a phone and complete the recipient journey.

---

## Phase 6 — Art direction pass

This is a separate phase.

Do not treat visual polish as an afterthought.

Improve:
- typography
- spacing
- image cropping
- scene transitions
- grain
- lighting
- particles
- micro-interactions
- theme-specific personality
- loading transitions

### Gate
Compare every major screen against the product vision, not against generic UI conventions.

---

## Phase 7 — QA

Run:
- functional tests
- browser tests
- mobile viewport tests
- keyboard tests
- reduced-motion tests
- invalid PIN tests
- missing media tests
- empty message tests
- slow network tests
- direct-link tests
- refresh tests

---

## Phase 8 — Release

Only after QA:
- production environment
- storage policies
- security rules
- metadata
- noindex private pages
- error monitoring
- final performance check

## Antigravity prompt strategy

Do not send:

> Build the entire birthday website.

Instead send milestone prompts such as:

> Read all project markdown files. Do not code yet. Inspect the repository and produce an implementation plan that maps the existing project to the requirements. Identify conflicts and ask only essential questions.

Then:

> Implement Phase 1 only. After implementation, run the app, inspect the browser result, test responsive behavior, and report what changed and what remains.

Then:

> Implement Phase 2 only. Reuse the existing design system. Do not redesign unrelated areas. Verify the complete creator flow in the browser.

Continue one phase at a time.

## Artifact requirements

Every Antigravity milestone should produce:
- implementation summary
- files changed
- tests run
- browser verification
- known issues
- next recommended action

## Immediate next action

Open the project in Antigravity and give it the Phase 0 prompt above. Do not ask it to build the application yet.
