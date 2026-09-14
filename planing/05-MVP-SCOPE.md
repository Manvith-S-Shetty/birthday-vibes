# MVP Scope

## Build in V1

### Creator
- birthday creation flow
- recipient name
- date
- 5 themes
- 1 message
- 1–12 photos
- optional music
- password/PIN
- live preview
- publish
- share URL
- QR code

### Recipient
- password unlock
- animated intro
- name reveal
- photo gallery
- personal message
- candle/cake interaction
- confetti finale
- music control
- replay

## V1.1
- drag-and-drop section ordering
- multiple letters/cards
- more themes
- photo captions
- countdown
- custom background music upload
- WhatsApp share helper
- creator dashboard

## V2
- accounts
- saved drafts across devices
- analytics
- scheduled reveal
- custom domains
- collaborative creation
- voice message
- video memory
- AI-assisted message writing
- AI theme personalization
- additional occasions

## Explicitly avoid in first version

Do not build:
- payments
- subscriptions
- complex social accounts
- full CMS
- marketplace
- dozens of templates
- unnecessary admin dashboard
- complicated AI features

The first goal is to make **one birthday experience unbelievably good**.

## Definition of done

V1 is complete when:

1. A creator can make an experience without editing code.
2. Data persists.
3. Photos persist.
4. Recipient password works.
5. Preview matches published experience.
6. Recipient experience works on phone and desktop.
7. All major animations are smooth.
8. Empty states work.
9. Invalid input is handled.
10. Refreshing the recipient page does not break the experience.
11. Published private content is not indexable.
12. Browser testing passes on Chromium and mobile viewport sizes.

## Immediate next action
Follow the implementation sequence in `07-ANTIGRAVITY-EXECUTION.md`.
