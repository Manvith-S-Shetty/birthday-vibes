# Experience Architecture

## Product surfaces

### Public
- `/`
- `/create`
- `/create/:draftId`
- `/preview/:draftId`
- `/g/:slug`
- `/g/:slug/unlock`

### Creator application
- onboarding
- creator wizard
- media manager
- theme selector
- message editor
- interactive-moment selector
- live preview
- publish/share screen

### Recipient application
- locked cover
- unlock
- cinematic intro
- main birthday scene
- memories
- letter
- interactive moments
- finale

## State machine

```text
CREATE
  ↓
RECIPIENT
  ↓
THEME
  ↓
MEMORIES
  ↓
MESSAGE
  ↓
MUSIC
  ↓
SECURITY
  ↓
PREVIEW
  ↓
PUBLISH
  ↓
SHARE
```

Recipient:

```text
LOCKED
  ↓ valid PIN
REVEAL
  ↓
WELCOME
  ↓
MEMORIES
  ↓
LETTER
  ↓
INTERACTIVE MOMENT
  ↓
FINALE
```

## Creator page layout

Desktop:
- left: stage/navigation
- center: form/editor
- right: live phone preview

Mobile:
- form occupies screen
- preview opens as a bottom sheet/full-screen mode

## Recipient layout

Use an immersive viewport rather than traditional website navigation.

Sections should snap or smoothly transition:
1. Cover
2. Welcome
3. Memory
4. Letter
5. Interactive birthday moment
6. Finale

## Navigation principles

Do not force the recipient through every section if they want to explore.

Use:
- subtle progress dots
- scroll
- optional "continue" affordances
- replay button after completion

## Live preview

The preview must use the same rendering components as the final recipient experience.

Do not build a separate fake preview.

Data flow:

```text
Creator Form
    ↓
Draft State
    ↓
Experience Renderer
    ↓
Live Preview
```

Published experience:

```text
Database + Media
    ↓
Experience Renderer
    ↓
Recipient
```

This prevents preview/published inconsistencies.

## Immediate next action
Define the visual system and interaction language in `03-DESIGN-SYSTEM.md`.
