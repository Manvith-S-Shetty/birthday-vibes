# Product Requirements

## Product name
Working name: **Wishlight**.

Final branding can be chosen after the first visual prototype.

## Core user journey

### Creator
1. Open `/create`.
2. Choose Birthday.
3. Enter recipient name.
4. Enter birthday date optionally.
5. Choose a visual theme.
6. Add a personal message.
7. Upload photos.
8. Optionally add background music.
9. Set a secret password/PIN.
10. Arrange/select interactive moments.
11. See the complete experience in live preview.
12. Publish.
13. Receive a private URL and QR code.
14. Share through WhatsApp, Instagram, email, or any messaging app.

### Recipient
1. Open private URL.
2. See a cinematic locked cover.
3. Enter password/PIN.
4. Experience an animated reveal.
5. See personalized name/message.
6. Interact with birthday moments.
7. Explore memories/photos.
8. Read the letter.
9. Interact with cake/candles or another final moment.
10. Replay the experience.

## Required interactive moments for V1

- Secret PIN/password unlock
- Cinematic opening/reveal
- Animated name reveal
- Birthday countdown/date reveal when a date is supplied
- Photo gallery
- Polaroid/memory wall
- Personal letter with typewriter reveal
- Birthday cake/candles interaction
- Confetti/fireworks finale
- Background music with explicit user control
- Share link
- QR code

## V1 theme direction

Avoid generic blue/purple SaaS styling.

Primary visual direction:
- premium black/ivory
- warm champagne/gold accents
- cinematic gradients
- subtle glass and grain
- elegant serif display typography
- clean modern sans-serif body typography
- soft glow
- restrained motion

Additional themes:
1. Midnight Cinema
2. Champagne Noir
3. Garden Afterglow
4. Sunset Film
5. Playful Confetti

Themes must share the same component system but change tokens, backgrounds, typography accents, decorative assets and motion personality.

## Creator experience requirements

The creator should never feel like they are filling a long form.

Use a staged wizard:
- Who is it for?
- Pick the mood.
- Add memories.
- Write the message.
- Add music.
- Lock the surprise.
- Preview.
- Publish.

Each stage should have:
- progress indicator
- back/continue controls
- autosave
- validation
- live preview
- clear empty states

## Recipient experience requirements

The recipient experience is the hero product.

It should feel:
- cinematic
- personal
- lightweight
- fast
- emotional without being visually noisy
- excellent on a phone

Avoid:
- template-looking cards
- excessive gradients
- excessive emojis
- giant UI chrome
- constant animation
- autoplay audio without consent
- cluttered navigation

## Success criteria

A first-time creator should be able to create a complete birthday experience in approximately 3–7 minutes.

A recipient should understand what to do immediately after opening the link.

The experience must remain beautiful even with:
- one photo
- no music
- short message
- no birthday date

## Immediate next action
Turn these requirements into the page/state map in `02-EXPERIENCE-ARCHITECTURE.md`.
