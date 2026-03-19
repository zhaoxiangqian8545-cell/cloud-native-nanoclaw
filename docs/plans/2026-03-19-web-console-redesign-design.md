# Web Console Redesign — NanoClaw on Cloud

## Goal

Redesign the web console from a plain Tailwind prototype into a polished SaaS dashboard with dark sidebar navigation, emerald accent theme, Inter typography, and a new S3 file browser feature.

## Design Decisions

- **Style:** SaaS Dashboard (Linear/Vercel inspired)
- **Layout:** Light content area + dark charcoal collapsible sidebar
- **Accent color:** Emerald/teal (`#10b981`)
- **Branding:** "NanoClaw on Cloud" (never "ClawBot Cloud")
- **Font:** Inter (body) + JetBrains Mono (code/monospace)
- **Icons:** lucide-react
- **Approach:** Full rewrite of all pages, zero backend changes (same API/auth)

## Design System

### Color Palette

| Role | Token | Value |
|------|-------|-------|
| Sidebar bg | `sidebar-900` | `#0f172a` (slate-900) |
| Sidebar hover | `sidebar-800` | `#1e293b` (slate-800) |
| Sidebar text | — | `#94a3b8` (slate-400), white when active |
| Content bg | — | `#f8fafc` (slate-50) |
| Card bg | — | `#ffffff` |
| Card border | — | `#e2e8f0` (slate-200) |
| Accent | `emerald-500` | `#10b981` |
| Accent hover | `emerald-600` | `#059669` |
| Accent subtle | `emerald-50` | `#ecfdf5` |
| Text primary | — | `#0f172a` (slate-900) |
| Text secondary | — | `#64748b` (slate-500) |
| Text muted | — | `#94a3b8` (slate-400) |
| Status active | — | emerald |
| Status warning | — | amber-500 |
| Status error | — | red-500 |
| Status neutral | — | slate-400 |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page title | Inter | 24px | 600 (semibold) |
| Section title | Inter | 18px | 600 |
| Card title | Inter | 16px | 600 |
| Body | Inter | 14px | 400 |
| Caption/badge | Inter | 12px | 500 |
| Code/editor | JetBrains Mono | 13px | 400 |

### Spacing

- Grid unit: 8px
- Sidebar width: 256px expanded, 64px collapsed
- Content padding: 24px
- Card padding: 20px
- Card gap: 16px
- Card radius: 12px (rounded-xl)

### Components

- **Buttons:** `rounded-lg`, emerald fill primary, ghost/outline secondary, `h-9 px-4 text-sm`
- **Inputs:** `slate-200` border, `rounded-lg`, emerald focus ring, `h-9 px-3 text-sm`
- **Badges:** Pill shape (`rounded-full px-2 py-0.5 text-xs font-medium`), tinted bg + colored text
- **Cards:** White, `rounded-xl`, `shadow-sm`, optional hover `shadow-md` transition
- **Tables:** Header `text-xs uppercase text-slate-400`, rows with `hover:bg-slate-50`
- **Tabs:** Bottom border style, active = emerald text + emerald bottom border

## Layout Structure

### Sidebar Navigation

```
┌─────────────────────┐
│  🦞 NanoClaw        │  Logo + brand (collapsed: icon only)
│     on Cloud         │
├─────────────────────┤
│  📊 Dashboard        │  Main nav (lucide icons)
│  ⚙️  Settings        │
│  👥 Admin ★          │  Admin-only
├─────────────────────┤
│  MY BOTS             │  Section label
│  ● Slack Assistant   │  Green dot = active
│  ○ Test Bot          │  Gray dot = paused
│  + New Bot           │  Inline create
├─────────────────────┤
│  (spacer)            │
├─────────────────────┤
│  « Collapse          │  Toggle button
│  user@email.com      │  User + sign out
└─────────────────────┘
```

- Bot selection in sidebar → clicking navigates to `/bots/:botId`
- Active bot: emerald left border + `bg-emerald-500/10` tint
- Collapsed: icons only, bot dots only, hover tooltips
- Mobile: overlay drawer with backdrop

### Content Area

Full width minus sidebar, scrollable, `bg-slate-50`.

## Page Designs

### Login — Split Screen

```
┌──────────────────┬───────────────────────────┐
│                  │                           │
│  (dark panel)    │   Sign in to your account │
│                  │                           │
│  🦞 NanoClaw     │   [Email input]           │
│     on Cloud     │   [Password input]        │
│                  │   ☐ Remember me           │
│  Multi-tenant    │   [Sign in button]        │
│  AI assistant    │                           │
│  platform on AWS │   Don't have an account?  │
│                  │   Register                │
│                  │                           │
└──────────────────┴───────────────────────────┘
```

- Left panel: sidebar dark color (`slate-900`), white text, brand + tagline
- Right panel: white, centered form
- Sign-up and force-new-password flows inline on right panel

### Dashboard — Overview Hub

```
┌─────────────────────────────────────────────────┐
│  Welcome back                                   │
│                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐     │
│  │ 3 Bots    │ │ 4.8M      │ │ 149       │     │
│  │ 1 active  │ │ tokens    │ │ invocats  │     │
│  │           │ │ / 100M    │ │ this mo.  │     │
│  └───────────┘ └───────────┘ └───────────┘     │
│                                                 │
│  Recent Activity                                │
│  ┌─────────────────────────────────────────┐    │
│  │ Slack Assistant replied in #general  2m │    │
│  │ Discord bot processed task         15m  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Quick Actions                                  │
│  [Shared Memory →]  [Create Bot →]              │
└─────────────────────────────────────────────────┘
```

- Stat cards with emerald accent numbers
- Recent activity feed from messages API
- Quick action links

### BotDetail — Tabbed Layout

```
Tabs: [Overview] [Channels] [Conversations] [Tasks] [Memory] [Files] [Settings]
```

**Overview tab:**
- Bot name + status badge (editable inline)
- Description (editable)
- Model/Provider config card (provider dropdown + model radio presets)
- Quick stats: channels count, conversations count, tasks count

**Channels tab:**
- Channel cards (not list rows) with icon, type, status badge, remove action
- "Add Channel" button → full-page ChannelSetup wizard

**Conversations tab:**
- Table: group name, channel type icon, last message date, message count
- Click row → Messages page
- "Memory" action link per row

**Tasks tab:**
- Same as current Tasks page, restyled with new design system
- Create task modal stays

**Memory tab:**
- Two sub-tabs: "Bot Memory" / "Shared Memory"
- Monospace editor (JetBrains Mono)
- Group memory accessible via Conversations tab → Memory link

**Files tab (NEW):**
- Split-pane: folder tree (left, ~280px) + file preview (right)
- Folder tree shows S3 structure under `{userId}/{botId}/`
- Click file → preview content in right panel
- Text files: monospace rendered with line numbers
- Binary/unknown: show file name, size, last modified
- Refresh button to reload tree

**Settings tab:**
- Trigger pattern (editable)
- Container config (maxTurns, timeout)
- Danger zone: delete bot (with confirmation)

### ChannelSetup — Polished Wizard

- Same 4-step flow, restyled:
  1. Channel type selector (icon cards, not plain buttons)
  2. Setup guide (accordion/collapsible steps, not text wall)
  3. Credential form (grouped fields)
  4. Success state (green check + webhook URL copy block)
- Breadcrumb: `Bot Name > Channels > Add Channel`

### Messages — Chat Polish

- Bot messages: left-aligned, emerald initial avatar, slate-100 bubble
- User messages: right-aligned, white bubble with slate-200 border
- Sender name + timestamp header per bubble
- Back nav to bot conversations tab

### Settings — Simple Restyle

- Same Anthropic API config card, restyled with new design system

### Admin UserList — Table Polish

- Proper table with `hover:bg-slate-50`, sortable columns
- Plan badges: emerald (pro), purple (enterprise), slate (free)
- Fix "Invalid Date" bug

### Admin UserDetail — Card Polish

- Same layout, new design system
- Number formatting with commas (e.g. 100,000,000)
- Fix "Invalid Date" bug

## New Feature: S3 File Browser

### API Endpoints (control-plane)

```
GET /api/bots/:botId/files?prefix=         → { entries: FileEntry[] }
GET /api/bots/:botId/files/content?key=     → { content: string, size: number, lastModified: string }
```

**FileEntry type:**
```typescript
interface FileEntry {
  key: string;        // full S3 key relative to bot prefix
  name: string;       // file/folder display name
  isFolder: boolean;
  size?: number;      // bytes, only for files
  lastModified?: string;
}
```

**S3 prefix mapping:**
- API receives `prefix` relative to bot: e.g. `workspace/dc:1234/`
- Control-plane prepends `{userId}/{botId}/` and calls S3 ListObjectsV2
- Content endpoint reads single object, returns text (max 1MB, reject binary > threshold)

**Security:**
- JWT-authed, userId from token
- Verify bot belongs to user before S3 access
- Read-only — no write/delete endpoints

### Frontend Component

**FileBrowser.tsx** — Split pane:
- Left: `FolderTree` — recursive expand/collapse, lazy-loads on folder click
- Right: `FilePreview` — text content with line numbers, or metadata for binary
- State: `expandedFolders: Set<string>`, `selectedFile: string | null`, `fileContent: string`

## New Dependencies

```
@fontsource/inter
@fontsource/jetbrains-mono
lucide-react
clsx
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tailwind.config.js` | UPDATE | Custom colors (sidebar, emerald), Inter font family |
| `index.css` | UPDATE | Import fonts, custom scrollbar styles |
| `src/components/Sidebar.tsx` | CREATE | Dark collapsible sidebar with bot list |
| `src/components/Layout.tsx` | REWRITE | Sidebar + content area wrapper |
| `src/components/StatCard.tsx` | CREATE | Reusable stat card |
| `src/components/Badge.tsx` | CREATE | Status badge component |
| `src/components/TabNav.tsx` | CREATE | Tab navigation component |
| `src/components/FileBrowser.tsx` | CREATE | S3 file browser (tree + preview) |
| `src/pages/Login.tsx` | REWRITE | Split-screen branded login |
| `src/pages/Dashboard.tsx` | REWRITE | Overview hub with stats + activity |
| `src/pages/BotDetail.tsx` | REWRITE | Tabbed layout (7 tabs) |
| `src/pages/ChannelSetup.tsx` | RESTYLE | Same flow, new design system |
| `src/pages/Messages.tsx` | RESTYLE | Improved chat bubbles |
| `src/pages/Settings.tsx` | RESTYLE | Match design system |
| `src/pages/admin/UserList.tsx` | RESTYLE | Polished table |
| `src/pages/admin/UserDetail.tsx` | RESTYLE | Fix bugs + polish |
| `src/lib/api.ts` | UPDATE | Add files API types and methods |
| `src/lib/auth.ts` | UNCHANGED | — |
| `src/App.tsx` | UPDATE | Route changes (BotDetail tabs handle sub-routes) |
| `control-plane/src/routes/api/files.ts` | CREATE | S3 file list + content endpoints |
| `control-plane/src/routes/api/index.ts` | UPDATE | Register files routes |

## Not Changing

- `lib/auth.ts` — same Cognito auth
- `lib/api.ts` — existing endpoints unchanged, only adding files API
- All backend logic (control-plane, agent-runtime, shared, infra)
- S3 data structure
- DynamoDB schema
