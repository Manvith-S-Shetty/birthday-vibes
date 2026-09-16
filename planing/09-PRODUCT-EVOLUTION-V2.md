# Birthday Vibes — Product Evolution V2

**Document:** `09-PRODUCT-EVOLUTION-V2.md`  
**Status:** Planning / Product Direction  
**Version:** 2.0  
**Date:** 2026-09-15  
**Product:** Birthday Vibes  
**Purpose:** Define the next evolution of Birthday Vibes from a premium cinematic birthday page into a richer interactive digital gift experience.

---

# 1. Product Vision V2

## 1.1 Current Product

Birthday Vibes is a private, cinematic digital birthday experience where a creator can build a personalized experience containing:

- Recipient information
- Theme
- Photos / memories
- Personal message
- Music
- Security / PIN
- Preview
- Private share link
- QR code
- Cinematic recipient experience
- Memory wall
- Letter
- Birthday cake / candles
- Finale

The current experience already establishes the core foundation:

> A birthday wish should feel like an experience, not a static digital card.

## 1.2 V2 Vision

V2 should evolve the product toward:

> **A birthday surprise the recipient can actually experience, interact with, and remember.**

The product should feel like a small personalized interactive movie.

The recipient should not simply scroll through content.

They should:

- discover
- listen
- interact
- remember
- participate
- make a wish
- receive surprises
- reach a cinematic finale

## 1.3 Product North Star

Every important feature should strengthen one or more of these five pillars:

| Pillar | Purpose |
|---|---|
| **Story** | Create a cinematic beginning → middle → finale |
| **Memory** | Turn photos and messages into meaningful moments |
| **Sound** | Music and personal voice create emotional depth |
| **Interaction** | Recipient actively participates rather than only viewing |
| **Surprise** | Hidden and revealed moments create anticipation |

A feature that does not meaningfully strengthen one of these pillars should be questioned before implementation.

---

# 2. Competitive Positioning

## 2.1 Reference

2Luv is an important inspiration/reference point for the product category.

Its birthday experience demonstrates the value of combining:

- Personalization
- Photos
- Music
- Password protection
- Exclusive sharing
- QR sharing
- Interactive cards / moments

Birthday Vibes should learn from these product patterns without copying:

- branding
- visual identity
- wording
- layouts
- assets
- animations
- implementation
- exact interaction designs

## 2.2 Birthday Vibes Differentiation

The intended distinction is:

**2Luv:**
> Interactive digital cards / personalized event experiences.

**Birthday Vibes:**
> Cinematic interactive birthday stories.

The differentiator should be the quality and sequencing of the recipient experience, not simply the number of features.

## 2.3 Competitive Principle

Do not attempt to become:

> “2Luv with more features.”

Instead become:

> “The birthday experience that feels like a personalized short film.”

---

# 3. Product Experience Model

## 3.1 Creator Journey

Target creator flow:

```text
Birthday
    ↓
Recipient
    ↓
Theme / Mood
    ↓
Memories
    ↓
Message
    ↓
Music
    ↓
Voice
    ↓
Interactive Moments
    ↓
Security
    ↓
Preview
    ↓
Publish
    ↓
Share
```

Not every experience must contain every section.

Optional content should remain optional.

## 3.2 Recipient Journey

Target recipient flow:

```text
Private Link
    ↓
Locked Cover
    ↓
PIN
    ↓
Cinematic Introduction
    ↓
Recipient Name Reveal
    ↓
Soundtrack
    ↓
Memories
    ↓
Personal Letter
    ↓
Voice Message
    ↓
Birthday Cake
    ↓
Make a Wish
    ↓
Blow Candles
    ↓
Wish Sealed
    ↓
Finale
    ↓
Optional Surprise / Secret
    ↓
Replay
```

## 3.3 Emotional Arc

The experience should follow:

```text
Curiosity
    ↓
Recognition
    ↓
Nostalgia
    ↓
Connection
    ↓
Anticipation
    ↓
Participation
    ↓
Celebration
    ↓
Emotional Finish
```

Avoid turning the experience into a sequence of unrelated mini-games.

---

# 4. Signature Experience

The signature V2 experience should be approximately:

```text
🔐 PRIVATE EXPERIENCE
        ↓
ENTER PIN
        ↓
🎬 CINEMATIC INTRO
        ↓
"FOR SARAH"
        ↓
🎵 PERSONAL SOUNDTRACK
        ↓
📸 MEMORIES
        ↓
📝 PERSONAL LETTER
        ↓
🎙️ PERSONAL VOICE MESSAGE
        ↓
🎂 CAKE APPEARS
        ↓
"MAKE A WISH"
        ↓
🎤 BLOW THE CANDLES
        ↓
🔥 CANDLES EXTINGUISH
        ↓
✨ WISH SEALED
        ↓
🎉 CINEMATIC FINALE
        ↓
💌 OPTIONAL SECRET MESSAGE
```

This sequence represents the target emotional experience, not a requirement that every V2 experience contain every element.

---

# 5. Feature Priority Matrix

## 5.1 Priority Definitions

### P0 — Signature / Required

A feature that materially changes the product identity and should be prioritized.

### P1 — High Value

A feature that substantially improves personalization or emotional depth.

### P2 — Expansion

A useful feature that can be added after the core experience is stable.

### P3 — Future

A longer-term product opportunity.

---

# 6. P0 — Microphone Candle Blowing

## 6.1 Objective

Replace the current candle interaction's primary action from:

> Tap the candles.

with:

> Blow the candles out.

The existing tap interaction remains as a fallback.

## 6.2 Target Interaction

```text
Cake appears
    ↓
Candles ignite
    ↓
"Make a wish..."
    ↓
"Take a breath and blow"
    ↓
Microphone permission
    ↓
Microphone listening
    ↓
Breath detected
    ↓
Candles extinguish
    ↓
Smoke animation
    ↓
Wish is sealed
    ↓
Finale begins
```

## 6.3 Detection Principle

The browser microphone should be used to estimate audio amplitude.

A basic detection flow:

```text
Ambient baseline
    ↓
Monitor microphone input
    ↓
Measure short audio windows
    ↓
Detect significant sustained increase
    ↓
Detect airflow-like rise/fall pattern
    ↓
Trigger candle extinguishing
```

The system should not rely on a single instantaneous loudness spike.

## 6.4 Permission UX

Before activating the microphone:

> “Ready to make a wish?”

Then:

> “Allow microphone access to blow out the candles.”

The permission request should happen as part of an explicit user gesture whenever browser policy requires it.

## 6.5 Fallback

If microphone access is:

- denied
- unavailable
- unsupported
- interrupted
- blocked by browser policy

show:

> “No microphone? Tap the candles instead.”

The experience must remain fully usable without microphone access.

## 6.6 Privacy

Microphone input should:

- remain local to the browser
- not be uploaded
- not be recorded
- not be stored
- not be transmitted to a server

Only the derived interaction signal should be used to trigger the animation.

## 6.7 Accessibility

Provide:

- tap fallback
- keyboard-accessible fallback
- visible instructions
- no requirement for microphone use
- reduced-motion support

## 6.8 Acceptance Criteria

The feature is complete when:

- microphone permission can be requested safely
- blowing can trigger candle extinguishing
- ordinary ambient noise does not immediately trigger the interaction
- microphone denial does not break the experience
- tap fallback works
- mobile browsers are tested
- desktop browsers are tested
- no audio is recorded or uploaded
- reduced motion works
- the transition into the finale remains smooth

---

# 7. P0 — Music Evolution

## 7.1 Objective

Music should become a first-class part of the emotional experience.

Current concept:

> Select a soundtrack.

V2 concept:

> Build the soundtrack of the experience.

## 7.2 Music Sources

Potential sources:

1. Built-in Birthday Vibes tracks
2. Creator-uploaded audio
3. YouTube external track
4. Spotify external track

## 7.3 Copyright / Platform Rule

Birthday Vibes must not:

- download copyrighted music from YouTube
- download copyrighted music from Spotify
- store copies of platform-owned audio without permission
- bypass platform playback restrictions
- scrape protected audio

For external platforms, store only the necessary reference/link/embed information and use officially supported playback/embed mechanisms.

## 7.4 Creator UX

Target UI:

```text
Choose your soundtrack

○ Birthday Vibes Music
○ Upload my own audio
○ YouTube
○ Spotify
```

For external music:

```text
Paste a supported link

[ __________________________ ]

[ Preview ]
```

The creator should receive clear feedback when a link cannot be used.

## 7.5 V2 Initial Music Scope

Start with:

- one primary soundtrack
- play / pause
- volume control
- external music reference
- uploaded audio where technically/legal supported
- scene-aware volume transitions
- graceful failure when external playback is unavailable

## 7.6 Scene-Aware Audio

Target behavior:

```text
Intro
  → Music fades in

Memories
  → Music continues

Letter
  → Music becomes softer

Cake
  → Music lowers significantly

Candle interaction
  → Music pauses or ducks

Finale
  → Music rises again
```

This should make music feel integrated into the storytelling.

## 7.7 Future Music Scope

Later:

- multiple songs
- scene-specific soundtracks
- soundtrack timeline
- audio memories
- creator voice messages
- audio effects

Do not implement all of these simultaneously.

---

# 8. P1 — Personal Voice Message

## 8.1 Objective

Allow the creator to add a personal spoken message.

Example:

> “I just wanted to tell you how much you mean to me. Happy birthday.”

## 8.2 Creator Flow

```text
Add a personal voice message

[ Record ]

Recording...

[ Stop ]

[ Play ]

[ Re-record ]

[ Save ]
```

## 8.3 Recipient Flow

```text
A little something
I wanted you to hear.

[ Listen to my message ]
```

## 8.4 Privacy

Voice recordings should be treated as private experience content.

They should:

- live in private storage
- only be accessible after recipient authorization
- use short-lived signed access where applicable
- never be exposed through public URLs

## 8.5 Accessibility

Voice must never be the only way to receive essential content.

Provide a text equivalent when the creator supplies one.

---

# 9. P1 — Memory Story System

## 9.1 Current Model

The current Memory Wall presents photos as a visual memory collection.

## 9.2 V2 Model

A memory becomes a small story.

Each memory may contain:

```text
Photo
+
Title
+
Date
+
Caption
+
Optional voice
```

Example:

```text
2023

That ridiculous trip.

"We somehow thought this
was a good idea."

[ Listen ]
```

## 9.3 Memory Timeline

Optional timeline presentation:

```text
2019
First memory
    ↓
2021
Another chapter
    ↓
2023
That unforgettable trip
    ↓
2025
Our best summer
    ↓
2026
Today
```

## 9.4 Product Principle

Do not force dates.

A creator should be able to create a memory without knowing the exact date.

---

# 10. P1 — Interactive Birthday Moments

Introduce a reusable library called:

> **Birthday Moments**

Creators choose which moments to include.

## 10.1 Initial Moment Candidates

### Mystery Gift

```text
Something is waiting for you.

[ Open ]
```

### Birthday Roulette

```text
Spin for a birthday surprise.

[ SPIN ]
```

### Memory Quiz

```text
Where was this photo taken?

A
B
C
D
```

### Hidden Message

A message is revealed through an interaction.

### Birthday Coupon

Example:

> “One dinner of your choice.”

### Countdown

A birthday countdown before the actual date.

### Wish Moment

A guided wish-sealing interaction.

## 10.2 Product Rule

Interactive moments must support the main emotional story.

Do not add game mechanics simply because they are technically possible.

---

# 11. P1 — Secret Messages

## 11.1 Concept

The creator can hide one or more messages in the experience.

Example:

```text
There are 3 little secrets hidden here.

Find them.
```

Possible locations:

- memory
- decorative object
- cake
- finale

## 11.2 Interaction

```text
Discover
    ↓
Reveal animation
    ↓
Personal message
```

## 11.3 Safety / Privacy

Secret content remains protected experience content.

It must not appear in:

- public metadata
- OG tags
- URLs
- QR payload
- public APIs

---

# 12. P2 — Birthday Wish Interaction

## 12.1 Concept

Before blowing candles:

```text
MAKE A WISH

Take a moment.

Close your eyes.

Think of something
you want this year.
```

Then:

> “When you're ready…”

The recipient performs the candle interaction.

## 12.2 Wish Sealed State

After the candles go out:

```text
Your wish has been sealed.
```

## 12.3 Initial Storage

The initial implementation does not need to store the actual wish.

It can remain a symbolic interaction.

## 12.4 Future Wish Capsule

Potential future capability:

- store the wish privately
- allow the recipient to revisit it
- reveal it next birthday
- create an annual birthday archive

This is a P3 concept.

---

# 13. P2 — Birthday Countdown

If the creator publishes before the birthday:

```text
SARAH'S DAY

02 DAYS
14 HOURS
37 MINUTES
```

On the birthday:

> “Today is your day.”

After the birthday:

> “Hope your birthday was unforgettable.”

The copy should adapt based on the birthday date.

---

# 14. P2 — Opening Styles

Allow the creator to select from a small set of cinematic openings.

## 14.1 Cinema

Black screen → typography → light → recipient name.

## 14.2 Envelope

Envelope → opening → message.

## 14.3 Film

Film frame → photographs → recipient reveal.

## 14.4 Spotlight

Dark environment → spotlight → recipient name.

Do not create a large template marketplace at this stage.

---

# 15. P2 — Relationship Personalization

Optional creator input:

```text
Who is this for?

Best Friend
Partner
Sibling
Parent
Child
Family
Someone Special
```

This can influence:

- suggested copy
- tone
- optional interactions
- recommended theme

Initial implementation should be rule-based.

AI personalization is explicitly deferred.

---

# 16. P2 — Mood Personalization

Possible moods:

- Romantic
- Funny
- Nostalgic
- Elegant
- Playful
- Emotional

Mood can eventually influence:

- theme recommendation
- music recommendation
- animation intensity
- interaction selection
- copy suggestions

Mood must not override the creator's explicit choices.

---

# 17. Theme Evolution

## 17.1 Current Themes

The existing V1 themes remain:

- Midnight Cinema
- Champagne Noir
- Garden Afterglow
- Sunset Film
- Playful Confetti

## 17.2 V2 Theme Principle

A theme should affect the entire experience, not only colors.

It may influence:

- typography
- background treatment
- lighting
- particles
- transitions
- cake presentation
- memory presentation
- finale behavior
- soundtrack suggestions

## 17.3 Example

### Midnight Cinema

Visual:

- dark theatre
- gold light
- cinematic grain
- gold dust

Motion:

- slow
- dramatic
- film-inspired

### Garden Afterglow

Visual:

- warm night garden
- amber / rose-gold lighting
- subtle fireflies

Motion:

- softer
- organic
- gentle

### Playful Confetti

Visual:

- celebratory
- brighter accents
- confetti

Motion:

- energetic
- playful

Themes should remain visually distinct without becoming unrelated products.

---

# 18. Creator Studio V2

## 18.1 Proposed Flow

```text
1. Recipient
2. Theme
3. Memories
4. Message
5. Music
6. Voice
7. Interactive Moments
8. Security
9. Preview
10. Publish
```

## 18.2 Interactive Moments Step

The creator should see:

```text
Birthday Moments

☑ Memories
☑ Personal Letter
☑ Birthday Cake
☑ Blow Candles

Optional:

☐ Voice Message
☐ Memory Quiz
☐ Birthday Roulette
☐ Hidden Messages
☐ Birthday Coupon
☐ Countdown
☐ Wish Moment
```

## 18.3 Preview

Preview must use the same rendering system as the recipient experience.

The existing `ExperienceRenderer` architecture should remain the source of truth.

Do not create a separate preview implementation that can drift from production.

---

# 19. Recipient Experience V2

The recipient experience should remain:

- private
- mobile-first
- cinematic
- fast
- accessible
- easy to understand

## 19.1 Interaction Rules

Every interaction must have:

- clear affordance
- visible state
- success state
- fallback
- keyboard/accessibility consideration where applicable

## 19.2 Avoid Interaction Overload

A recipient should never wonder:

> “What am I supposed to click?”

The next action should be obvious but not visually aggressive.

---

# 20. Audio Architecture Considerations

Audio should be treated as an experience subsystem.

Potential conceptual model:

```text
ExperienceAudioController

Track source
    ↓
Playback state
    ↓
Volume
    ↓
Scene volume
    ↓
Fade
    ↓
Pause / resume
```

External platform playback and local uploaded audio may require different adapters.

Potential abstraction:

```text
MusicProvider
├── BuiltInMusicProvider
├── UploadedAudioProvider
├── YouTubeProvider
└── SpotifyProvider
```

Actual architecture must be validated against each platform's current technical and licensing constraints before implementation.

---

# 21. Microphone Architecture Considerations

Conceptual flow:

```text
CandleInteractionController
        ↓
MicrophonePermission
        ↓
AudioInput
        ↓
AmplitudeAnalysis
        ↓
BlowDetector
        ↓
CandleExtinguishEvent
        ↓
ExperienceRenderer
```

The microphone feature should remain client-side.

No raw microphone recording should be sent to the server.

The implementation should be isolated from the rest of the experience renderer so it can fail safely.

---

# 22. Privacy & Security

V2 must preserve the existing security model.

Private content includes:

- personal messages
- photos
- voice recordings
- uploaded music
- secret messages
- private memories

These must not become publicly accessible merely because new interactive features are introduced.

## 22.1 Rules

Never place private content in:

- URL parameters
- public metadata
- OG descriptions
- QR data
- public HTML before authorization
- client-side seed data in production

## 22.2 External Music

Do not proxy, download, or store copyrighted platform audio unless explicitly authorized and technically permitted.

Use supported external playback mechanisms.

## 22.3 Microphone

Microphone data must remain local to the browser.

---

# 23. Accessibility

V2 must maintain:

- keyboard navigation
- visible focus states
- touch targets of at least 44px
- readable text
- reduced-motion support
- tap fallback for microphone
- text equivalent for voice where necessary
- accessible labels for controls
- meaningful error states

Animations must enhance the experience, not become required for understanding.

---

# 24. Mobile Browser Constraints

Because the recipient experience is primarily mobile, every V2 feature must be evaluated on mobile browsers.

Special attention:

### Microphone

- permission UX
- browser support
- HTTPS requirement
- iOS Safari behavior
- Android Chrome behavior

### Audio

- autoplay restrictions
- user gesture requirements
- external embed behavior
- background playback limitations

### Images

- bandwidth
- lazy loading
- memory usage

### Animation

- performance
- reduced motion
- low-power devices

A feature is not production-ready simply because it works on desktop Chrome.

---

# 25. Performance Principles

V2 must not sacrifice initial load performance for visual effects.

Priorities:

1. Fast locked cover
2. Minimal public payload
3. Lazy protected media
4. Optimized images
5. Deferred heavy animation assets
6. Avoid unnecessary JavaScript
7. Respect reduced motion
8. Avoid loading external music providers before needed

---

# 26. Analytics / Product Success Metrics

Analytics should be privacy-conscious.

Potential product metrics:

## Creator

- experience creation started
- creation completed
- preview opened
- publish completed
- share action used

## Recipient

- experience opened
- PIN unlock success
- experience completion
- memory interaction
- letter opened
- voice message played
- candle interaction started
- microphone permission accepted
- candles successfully blown
- tap fallback used
- finale reached
- replay used

## Signature Metric

A key V2 metric could be:

> **Percentage of unlocked experiences where the recipient reaches the candle/finale moment.**

This measures whether the experience successfully carries the recipient through its story.

---

# 27. Product Quality Metrics

We should evaluate V2 on:

### Emotional quality

Does it feel personal?

### Visual quality

Does it feel premium?

### Interaction quality

Does interaction feel natural?

### Performance

Does it load and transition quickly?

### Reliability

Does it work when permissions or external services fail?

### Accessibility

Can users complete the experience without optional capabilities?

### Privacy

Is private content protected?

---

# 28. Feature Priority Roadmap

## Phase V2-A — Signature Interaction

Priority: **P0**

Build:

1. Microphone candle blowing
2. Tap fallback
3. Improved candle animation
4. Wish-sealing sequence
5. Scene-aware audio control

Goal:

> Make the cake moment unforgettable.

---

## Phase V2-B — Personal Audio

Priority: **P0/P1**

Build:

1. Music architecture
2. External music references
3. YouTube integration where supported
4. Spotify integration where supported
5. Uploaded audio where supported
6. Audio controls
7. Scene-aware fading
8. Creator voice message

Goal:

> Make the experience sound personal.

---

## Phase V2-C — Storytelling

Priority: **P1**

Build:

1. Memory metadata
2. Memory stories
3. Timeline presentation
4. Voice attached to memories
5. Better cinematic sequencing

Goal:

> Make memories feel like chapters.

---

## Phase V2-D — Interactive Moments

Priority: **P1/P2**

Build a reusable system for:

- Mystery Gift
- Memory Quiz
- Birthday Roulette
- Hidden Message
- Birthday Coupon
- Countdown
- Wish Moment

Goal:

> Make every experience uniquely interactive.

---

## Phase V2-E — Personalization

Priority: **P2**

Build:

- relationship selection
- mood
- opening style
- theme-specific behavior
- recommended experience configuration

Goal:

> Make creation easier without taking control away from the creator.

---

## Phase V2-F — Long-Term Product

Priority: **P3**

Potential:

- Wish Capsule
- annual birthday archive
- revisit previous birthdays
- recipient history
- creator accounts
- multiple experiences
- premium themes
- payments
- AI-assisted personalization

These are not part of the immediate V2 implementation.

---

# 29. What We Will NOT Build Yet

To protect product focus, defer:

- payments
- subscriptions
- marketplace
- creator social profiles
- public discovery
- AI-generated birthday experiences
- complex account systems
- real-time multiplayer
- arbitrary mini-game builder
- dozens of templates
- unrestricted external media downloading
- social-feed functionality

The product must become excellent before it becomes broad.

---

# 30. Technical Compatibility With Current Architecture

The current architecture should be extended rather than replaced.

Existing important concepts to preserve:

- Next.js / React / TypeScript
- Tailwind
- Motion
- Supabase
- private storage
- server-side authorization
- repository abstraction
- `ExperienceRenderer`
- theme system
- reduced-motion support
- creator/recipient separation
- protected recipient payload

Potential new domain concepts:

```text
Experience
├── memories
├── message
├── music
├── voice
├── moments
├── candleInteraction
├── theme
└── finale
```

The exact schema should be designed during the technical planning phase after product requirements are approved.

---

# 31. Data Model Direction

V2 may require new entities or fields for:

```text
experiences
memories
music
voice_messages
interactive_moments
secret_messages
```

Potential conceptual relationship:

```text
Experience
    ├── Memories
    ├── Music
    ├── Voice Messages
    ├── Interactive Moments
    ├── Secret Messages
    └── Security
```

Do not modify the production schema until the exact migration and RLS strategy has been reviewed.

---

# 32. Failure States

Every V2 capability must define its failure state before implementation.

Examples:

### Microphone unavailable

> “Use tap instead.”

### Microphone permission denied

> “No microphone needed — tap the candles.”

### External music unavailable

> “This soundtrack is unavailable. Continue without music.”

### YouTube/Spotify embed blocked

> Provide an appropriate fallback rather than breaking the experience.

### Voice playback fails

> Show a text message or continue to the next scene.

### Slow media

> Show a lightweight loading state without freezing the entire experience.

---

# 33. Design Principles

## Principle 1 — Cinematic, not flashy

Motion should create atmosphere.

## Principle 2 — Personal, not generic

User content should be the emotional center.

## Principle 3 — Interactive, not complicated

The recipient should always understand what to do.

## Principle 4 — Premium, not SaaS-like

Avoid generic dashboards, excessive cards, excessive rounded containers, and unnecessary UI chrome.

## Principle 5 — Surprise through pacing

Do not reveal everything immediately.

## Principle 6 — Graceful degradation

Optional technology must never break the experience.

## Principle 7 — Mobile first

Recipient experience should be designed around a phone.

## Principle 8 — One strong emotional moment is better than ten weak features

The candle interaction is the first signature moment.

---

# 34. Proposed Final Recipient Experience

The target premium experience:

```text
┌───────────────────────────────┐
│                               │
│        PRIVATE LINK           │
│                               │
│       Enter your PIN          │
│                               │
└───────────────┬───────────────┘
                ↓
        CINEMATIC INTRO
                ↓
          "FOR SARAH"
                ↓
        HER SOUNDTRACK
                ↓
          MEMORY STORY
                ↓
         PERSONAL LETTER
                ↓
         VOICE MESSAGE
                ↓
        "ONE MORE THING..."
                ↓
            BIRTHDAY
              CAKE
                ↓
         "MAKE A WISH"
                ↓
        🎤 BLOW CANDLES
                ↓
         CANDLES OUT
                ↓
        "WISH SEALED"
                ↓
         MUSIC RISES
                ↓
        CINEMATIC FINALE
                ↓
        OPTIONAL SECRET
                ↓
             REPLAY
```

This is the experience that should guide design decisions.

---

# 35. Implementation Governance

No V2 feature should be implemented directly from this document without a dedicated implementation plan.

For each feature:

```text
Product requirement
        ↓
Technical reconnaissance
        ↓
Security review
        ↓
Implementation plan
        ↓
Build
        ↓
Browser testing
        ↓
Mobile testing
        ↓
Failure-state testing
        ↓
Accessibility testing
        ↓
Performance testing
        ↓
Review
        ↓
Approval
```

The existing project workflow remains:

> **Plan → Build → Run → Inspect → Test → Fix → Approve → Next Phase**

---

# 36. V2 Definition of Done

V2 should not be considered complete because all planned code exists.

It is complete only when:

### Product

- The recipient experience feels materially more interactive.
- The emotional arc is coherent.
- Features feel like one product rather than separate demos.

### Microphone

- Blow interaction works on supported mobile/desktop browsers.
- Permission failure has a fallback.
- No microphone recording is stored.

### Music

- Supported music sources work reliably.
- External platform restrictions are respected.
- Playback failure does not break the experience.

### Personalization

- Photos, messages, music, voice, and interactions are creator-controlled.
- Private content remains protected.

### UX

- Creator flow is understandable.
- Recipient flow is obvious.
- Mobile interaction is comfortable.

### Visual

- Themes remain premium and differentiated.
- Motion remains restrained and cinematic.

### Engineering

- TypeScript passes.
- Lint passes.
- Production build passes.
- Security tests pass.
- Mobile browser tests pass.
- Reduced-motion tests pass.
- External integration failure cases are tested.

### Production

- Production environment variables are correct.
- Canonical production URL is correct.
- Supabase production project is the dedicated Birthday Vibes project.
- No secrets are committed.
- Public/private data boundaries remain intact.

---

# 37. Immediate Product Strategy

The next implementation should **not** begin with all V2 features.

Recommended sequence:

```text
FIRST
Microphone candle blowing
        ↓
SECOND
Music architecture + external music
        ↓
THIRD
Voice message
        ↓
FOURTH
Memory storytelling
        ↓
FIFTH
Interactive Moments framework
        ↓
SIXTH
Advanced personalization
```

The first milestone should answer one question:

> **Can we make the recipient genuinely feel like they are participating in their birthday?**

The microphone candle interaction is the clearest first test of that hypothesis.

---

# 38. Final Product Direction

Birthday Vibes should evolve from:

> **A beautiful digital birthday card**

into:

> **A private cinematic birthday experience with memories, music, voice, interaction, surprise, and a memorable finale.**

The product should not win by having the largest feature list.

It should win because the recipient remembers:

> **“Someone made this specifically for me.”**

---

## Document Status

**Status:** Ready for product review.

**Next document:** Technical implementation plan for the first approved V2 feature.

**First candidate feature:** Microphone candle-blowing interaction.

**Implementation status:** Not started from this document.

**Important:** This file is a product-direction document. Technical schema changes, API changes, browser compatibility decisions, third-party platform integrations, and security implementation must be planned and reviewed separately before coding.
