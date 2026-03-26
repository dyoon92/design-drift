# Design System – Claude Rules

## What this repo is

A component library for a property management product (StorageOS).
Components live in `src/stories/`. Prototypes live in `src/stories/prototypes/`.
The Vite app (`npm run dev`) is a live demo of composed components.

---

## The #1 rule: never invent UI from scratch

If a task requires a component that does not exist in `src/stories/`, do NOT
create custom one-off styles or invent a new component inline.

Instead:
1. Use a `<Placeholder>` (see existing prototypes for the pattern)
2. Output this message:

```
⚠️  Missing component: [ComponentName]
This needs to be designed in Figma first before it can be built.
Next step: file a design request so it can be added to the component library.
```

This keeps prototypes built from real components only — not throwaway custom UI.

---

## Available components (always check here first)

| Component | File | What it does |
|---|---|---|
| `TenantPageHeader` | `src/stories/TenantPageHeader.tsx` | Full tenant page header with tabs, balance, access |
| `PaymentBanner` | `src/stories/PaymentBanner.tsx` | Payment status strip |
| `TenantInfoCard` | `src/stories/TenantInfoCard.tsx` | Collapsible tenant details card |
| `TenantsTable` | `src/stories/TenantsTable.tsx` | Tenants list with Current/Past tabs, row click |
| `AccessStatus` | `src/stories/AccessStatus.tsx` | Gate/access status badge |
| `UnitDetailsCard` | `src/stories/UnitDetailsCard.tsx` | Unit number, status, size, rent cards |
| `CommunicationsPanel` | `src/stories/CommunicationsPanel.tsx` | Message feed with pinned notes, lock/note/email types |
| `Navbar` | `src/stories/AppNav.tsx` | Top navbar: logo, facility, search, tasks, avatar |
| `Sidebar` | `src/stories/AppNav.tsx` | Left nav: collapsible, all nav items, user footer |
| `Tabs` | `src/stories/Tabs.tsx` | Horizontal tab bar with optional count badges |
| `PinnedNotes` | `src/stories/PinnedNotes.tsx` | Pinned message cards with amber border, pin icon, Read More |
| `Button` | `src/stories/Button.tsx` | Primary/Secondary/Danger/Warning/White · sm/md/lg |
| `Input` | `src/stories/Input.tsx` | Text input with floating label, states, hint, feedback |
| `Badge` | `src/stories/Badge.tsx` | General, UnitBadge, CommBadge · high/low contrast · lg/sm |

---

## Where to put new work

| What | Where |
|---|---|
| New reusable component | `src/stories/[ComponentName].tsx` + `.stories.ts` |
| New prototype / screen | `src/stories/prototypes/[ScreenName].tsx` + `.stories.ts` |
| Demo app wiring | `src/App.tsx` |

---

## Style rules

- **All colors** must use CSS variables: `var(--ds-color-*)` — never hardcoded hex
- **All spacing/radius** must use CSS variables: `var(--ds-spacing-*)`, `var(--ds-border-radius-*)`
- **No CSS files or modules** — inline styles only
- **No new dependencies** without asking first
- Font: `Inter, system-ui, sans-serif`

---

## Token sync

Design tokens (colors, spacing, typography) are auto-generated from Figma.

```bash
npm run figma-sync   # pulls from Figma → writes src/tokens/variables.css
```

Never edit `src/tokens/variables.css` or `src/tokens/tokens.ts` by hand.

---

## Running the project

```bash
npm run storybook    # component catalog on :6006
npm run dev          # demo app on :5173
npm run figma-sync   # sync tokens from Figma
npm run chromatic    # publish stories to Chromatic (requires CHROMATIC_PROJECT_TOKEN)
```

---

## Design → Code workflow

1. Designer updates Figma
2. `npm run figma-sync` updates tokens
3. For new components: Claude reads Figma via MCP, builds component, adds to Storybook
4. PM describes a new screen → Claude composes existing components into a prototype
5. Engineer wires data to the prototype → ships
