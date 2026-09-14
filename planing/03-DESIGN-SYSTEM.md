# Design System

## Creative direction

The design should feel closer to:
- luxury editorial
- cinematic title sequence
- premium digital invitation
- beautifully art-directed photo album

It should NOT feel like:
- a generic birthday template marketplace
- a children's party website
- a SaaS dashboard

## Base palette

Use semantic tokens rather than hard-coded colors.

```text
ink: #0A0A0A
paper: #F5F1E8
warm-white: #FFFDF8
champagne: #C9A96E
muted-gold: #8F7447
smoke: #171717
mist: #D8D2C6
```

Theme-specific palettes override these tokens.

## Typography

Display:
- elegant serif such as Cormorant Garamond / DM Serif Display / similar

UI/body:
- Inter / Geist / Manrope / similar

Rules:
- oversized display type for recipient name
- restrained uppercase labels
- generous line height
- short paragraphs
- avoid more than two font families

## Motion

Motion should have three levels.

### Micro
100–250ms:
- hover
- button press
- focus
- card lift

### Scene
400–900ms:
- section transition
- image reveal
- text entrance

### Hero
900–1800ms:
- opening reveal
- gift animation
- finale

Use spring/ease curves consistently.

Respect:

```text
prefers-reduced-motion: reduce
```

## Visual effects

Use sparingly:
- film grain
- blur
- soft bloom
- vignette
- particles
- subtle 3D depth
- paper texture

Never stack every effect simultaneously.

## Image treatment

Support:
- portrait crop
- landscape crop
- object-fit cover
- object-position control
- rounded image
- polaroid
- full-bleed cinematic image

User photos are the visual hero.

## Component families

### Creator
- WizardShell
- StepHeader
- ThemeCard
- MediaUploader
- MessageEditor
- MusicPicker
- SecurityField
- PreviewFrame
- PublishPanel

### Recipient
- UnlockScreen
- CinematicIntro
- NameReveal
- MemoryGallery
- PolaroidWall
- LetterScene
- CakeScene
- ConfettiLayer
- FinaleScene

## Theme architecture

Themes should be configuration-driven.

Example conceptual model:

```ts
ThemeDefinition {
  id
  name
  tokens
  fonts
  background
  decorativeLayers
  motionPreset
  componentVariants
}
```

The application should not duplicate entire pages for every theme.

## Accessibility

Required:
- keyboard navigation
- visible focus states
- semantic buttons
- alt text for photos
- sufficient contrast
- reduced motion
- audio mute/pause
- screen-reader-friendly creator flow

## Immediate next action
Use this system to define the technical stack and data model in `04-TECHNICAL-ARCHITECTURE.md`.
