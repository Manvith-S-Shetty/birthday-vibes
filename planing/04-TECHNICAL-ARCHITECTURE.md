# Technical Architecture

## Recommended stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui only where useful for creator UI
- Framer Motion / Motion for animation
- Lucide icons

The recipient surface should use custom-designed components rather than looking like a component-library demo.

### Backend
Use Supabase for:
- PostgreSQL database
- authentication if creator accounts are introduced later
- storage
- row-level security
- server-side access patterns

V1 can support creator sessions without forcing account creation if desired.

### Media
Supabase Storage:
- original upload
- optimized variants where practical
- private/public policy depending on published experience architecture

### QR
Use a reliable QR generation library.

### Validation
Zod.

### Forms
React Hook Form.

### Deployment
Vercel for Next.js, with Supabase as backend.

## Core entities

### Experience

```text
id
slug
type
recipient_name
birthday_date
theme_id
message
password_hash
status
published_at
created_at
updated_at
```

### Media

```text
id
experience_id
storage_path
type
alt_text
sort_order
metadata
created_at
```

### Music

```text
id
experience_id
source_type
source_url
title
artist
enabled
```

### ExperienceMoment

```text
id
experience_id
moment_type
config_json
sort_order
enabled
```

## Security

Never store plaintext passwords.

Use:
- salted password hashing
- server-side verification
- rate limiting
- secure cookies/tokens where needed
- private media access policies
- slug entropy
- no sensitive data in URLs

The recipient URL can be public to reach the locked screen, but content must remain inaccessible until authentication/unlock succeeds.

## API/server actions

Conceptual operations:

```text
createDraft()
updateDraft()
uploadMedia()
deleteMedia()
reorderMedia()
updateTheme()
updateMessage()
setSecurity()
publishExperience()
getPublishedExperience()
verifyRecipientPassword()
generateShareData()
```

## Performance

Target:
- fast initial shell
- lazy-loaded photos
- responsive image sizes
- compressed assets
- no giant animation libraries loaded unnecessarily
- defer non-critical effects
- preload only the first hero media

## SEO

Creator pages:
- normal metadata

Private recipient pages:
- noindex
- avoid exposing personalized content to crawlers

## Analytics

Keep V1 minimal:
- creation started
- draft completed
- published
- unlock success
- experience completed

Do not collect unnecessary personal data.

## Immediate next action
Define the exact build phases and Antigravity agent workflow in `07-ANTIGRAVITY-EXECUTION.md`.
