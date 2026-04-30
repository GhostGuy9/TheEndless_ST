# The Endless — Lore Project

## What This Is

This repository contains all lorebook and character card JSON files for **The Endless** — an original multi-world lore system. It connects multiple fictional worlds (original and existing) through a shared phenomenon of ancient marble doors that appear and disappear without warning.

All files are in **Marinara Engine** native format. Marinara imports them directly; SillyTavern users need to unwrap the outer envelope first (see README.md).

---

## Project Owner

**Danny** (GhostGuy9) — Creator and lore director. All lore decisions belong to Danny. When in doubt about a creative direction, ask rather than assume.

---

## Repository Structure

```
TheEndless_ST/
├── CLAUDE.md               ← You are here
├── README.md
├── core/
│   ├── The Endless.json        ← Core lorebook (door mechanics, Manifold rules, world catalog)
│   ├── TheEndless_GM.json      ← GM/narrator character card (v3.0, Game Mode native)
│   └── TheEndless - Profile Photo.png
├── gamemode/                   ← Game Mode setup recipes (paste-ready)
│   ├── SETTING.md              ← Wizard Setting + Player Goals text + agent enable list
│   ├── CUSTOM_TRACKER.md       ← Custom Tracker agent schema (perception filter, taboo, world)
│   └── GENRE_MATRIX.md         ← Per-world Genre/Tone/Difficulty reference
├── characters/
│   ├── Threshold.json          ← Experienced Explorer NPC card
│   ├── Cairn.json              ← Younger Explorer NPC card
│   └── GenericExplorer.json    ← Template for unnamed Explorers
└── worlds/                 ← 17 world lorebooks
    ├── Aldenmoor.json
    ├── Dunwater Coast.json
    ├── Evergreen Vale.json
    ├── Ironwater Station.json
    ├── Night City.json
    ├── Pale Fog.json
    ├── Stardust Valley.json
    ├── The Ashlands.json
    ├── The Endless Library.json
    ├── The Fallout Wastes.json
    ├── The Frontier.json
    ├── The Lighthouse World.json     ← Glimpse
    ├── The Manifold.json
    ├── The Red Planet.json           ← Glimpse
    ├── The Slow Thing.json           ← Glimpse
    ├── The Stopped City.json         ← Glimpse
    └── The White Forest.json         ← Glimpse
```

Directory name is historical (`TheEndless_ST`) — project is no longer ST-specific.

---

## Marinara Engine File Format Rules

Getting these wrong silently breaks things on import.

### Lorebooks
- Top-level envelope: `{ "type": "marinara_lorebook", "version": 1, "exportedAt": "...", "data": { "lorebook": {...}, "entries": [...] } }`
- `data.entries` is a JSON **array** (not an object keyed by uid as SillyTavern uses)
- Each entry has its own `id`, `lorebookId`, `createdAt`, `updatedAt` — use nanoid-style strings
- `name` on entry (equivalent to ST's `comment`) — still use bracket prefix convention: `[Overview]`, `[Location]`, `[Mechanics]`, `[Character]`, `[Meta]`, etc.
- `tag` on entry accepts a single string — we derive this from the bracket prefix (e.g., `[Location]` → `tag: "location"`)
- `keys` = primary keywords array; `secondaryKeys` = secondary keywords
- `content` must be self-contained — keywords and titles are NOT injected, only content
- `constant: true` entries always fire regardless of keywords — use sparingly (max 2-3 per lorebook)
- `position` is an **integer**: `0` = before character definitions, `1` = after character definitions, `2` = depth-injected (uses `depth` field for placement). **Range is 0–2 only** — Marinara collapsed ST's 0–4. Anything higher will be rejected by Marinara's Zod schema on import.
- `depth` is the integer offset for `position: 2` injection (in messages from the end)
- `order` (equivalent to ST's `insertion_order`) — higher = injected closer to end of prompt = stronger model influence
- `role` is a string: `"system"`, `"user"`, or `"assistant"`
- `selectiveLogic` is a string: `"and"`, `"or"`, or `"not"`
- `description` (per-entry, string) — short summary used by the **Knowledge Router** agent to decide which entries to inject. Keep it tight (80–160 chars). Already populated on every entry; keep new entries consistent.
- Lorebook-level `category` is **mostly cosmetic** — affects only UI sidebar grouping/icons. Five values: `"world"`, `"character"`, `"npc"`, `"spellbook"`, `"uncategorized"` (UI label: "Other"). The ONE category with mechanical effect: `"spellbook"` — read wholesale into Game Mode combat encounters via `EncounterModal`'s spellbook attachment dropdown. Currently all worlds + core use `"world"`.

### Character Cards
- Top-level envelope: `{ "type": "marinara_character", "version": 1, "exportedAt": "...", "data": { "spec": "chara_card_v2", "spec_version": "2.0", "data": {...}, "metadata": {...} } }`
- Inner `data.data` is the standard chara_card_v2 spec (name, description, personality, scenario, first_mes, etc.)
- Use `{{char}}` and `{{user}}` macros instead of real names

**CRITICAL: This project targets Marinara Game Mode. Game Mode reads ONLY these fields from a card:**
- `name`
- `description`
- `personality`
- `extensions.backstory` (or root `backstory`)
- `extensions.appearance` (or root `appearance`)

These five are concatenated into a `<gm_role>` block injected every turn. Game Mode IGNORES: `scenario`, `first_mes`, `mes_example`, `alternate_greetings`, `system_prompt`, `post_history_instructions`, `extensions.depth_prompt`, `character_book`. **Do not put load-bearing content in those fields.** Cards in this repo have those fields cleared.

- `character_book` (embedded lorebook on a card): **never read in Game Mode.** Standalone `core/The Endless.json` is the source of truth. Embedded books are kept `null` on cards in this repo.
- M.E.-specific `extensions` bag fields:
  - `nameColor` / `dialogueColor` / `boxColor`: hex or CSS gradient (cosmetic; not used by Game Mode but harmless). Threshold uses `#E88D67`, GM card uses `#C4A882`.
  - `backstory` / `appearance`: prose fields, **read by Game Mode**.
  - `talkativeness`: 0.0–1.0 (affects how often the model volunteers dialogue).
  - `conversationStatus`: `"online"` default.

---

## How Marinara Engine Loads This

### Game Mode is the target play mode

This project is built for **Marinara Game Mode**. Game Mode setup happens in a wizard, the `game-master` agent is the responder, and per-turn world anchoring lives in:

1. The wizard's free-text **Setting** field (interpolated into `<gm_rules>` every turn — most reliable anchor)
2. The wizard's **Player Goals** field (used at `/game/setup` only, not re-injected each turn)
3. Active lorebooks (constant entries always fire; non-constant fire on keyword match against chat content)
4. Custom Tracker agent state (auto-injected as `<custom_state>` every turn)

The actual setup recipes live in `gamemode/`:
- `gamemode/SETTING.md` — paste-ready Setting text + Player Goals + recommended agents
- `gamemode/CUSTOM_TRACKER.md` — Custom Tracker schema (perception filter, current world, taboo offenses, etc.)
- `gamemode/GENRE_MATRIX.md` — per-world Genre/Tone/Difficulty reference

### Lorebook activation model

A lorebook is visible to the AI in a chat only when **both**:
- `enabled: true` (master kill switch, set per-lorebook), AND
- One of: in chat's `activeLorebookIds` (manual toggle) / matched `characterId` / matched `personaId` / matched `chatId`

`enabled: true` alone does NOT load a lorebook. There is no auto-discovery — Marinara never browses dormant lorebooks. **Whatever isn't toggled in does not exist for the AI.**

### Recommended Setup
| What | How |
|---|---|
| `core/TheEndless_GM.json` | Import as Character. In Game Mode wizard, set GM Mode = "Character GM" and pick this card. |
| `core/The Endless.json` | Attach in the wizard's Lorebooks step (`activeLorebookIds`). Always-on for The Endless campaigns. |
| `worlds/<world>.json` | Toggle ON in the chat's lorebook drawer **only when the player is currently in that world**. Toggle OFF when they leave. |
| `characters/Threshold.json` etc. | Optional — add as Party Members when an Explorer should join the player. |

**Do NOT pre-attach all world lorebooks.** With 17 worlds attached, every world's constant entries fire simultaneously — the AI tries to write in 17 tones at once and produces nondescript blend-soup ("not in any world"). The single most common configuration error.

### Catalog pattern for dynamic door storytelling

Marinara has no built-in mechanism for the AI to activate dormant lorebooks. To preserve the "AI picks where the door leads" feel, two layered injection points carry world thumbnails into context:

1. **Wizard Setting field** — compressed catalog string (see `gamemode/SETTING.md`), guaranteed every turn.
2. **`[Catalog] World Thumbnails — The Endless`** — constant entry in `core/The Endless.json` (~3500 chars), reinforces the catalog from the lorebook side.

When the player commits to a destination, manually toggle the matching world lorebook on. The AI's first impression comes from the catalog + genre knowledge; full world detail loads when you toggle.

### Token Budget Reality
At 8GB VRAM, local models (~7-9B uncensored GGUF) run with tight budgets. Every active element costs:
- GM card fields (description + personality + backstory + appearance): ~1000–1500 tokens, every turn
- Core lorebook constants (Overview + Catalog + Tone + Dialogue Format): ~1500 tokens, every turn
- Wizard Setting text: ~800 tokens, every turn
- One world lorebook attached: ~300 tokens of constants + ~150–300 per keyword-triggered entry
- Custom Tracker `<custom_state>`: ~200–400 tokens

Keep world lorebook entries lean. 100–250 tokens per entry target. Use `description` (80–160 chars per entry) so the **Knowledge Router** agent can semantically prune irrelevant entries.

### Marinara-Native Features Available
- **Built-in agents** (25+): see `gamemode/SETTING.md` for which to enable. Recommended core: `game-master`, `world-state`, `quest`, `custom-tracker`, `knowledge-router`. Optional: `combat`, `lorebook-keeper`.
- **Custom Tracker** is the home for Endless-specific state (perception filter, taboo offenses) — see `gamemode/CUSTOM_TRACKER.md`.
- **Custom Widgets** are LLM-generated HUD widgets (8 types: progress bars, gauges, counters, etc.). User toggles the feature; LLM picks types at setup based on the Setting text. User cannot define new widget types.
- **Spellbook lorebooks** are the only `category` with mechanical effect — read wholesale into combat encounters via `EncounterModal`. None are built yet; candidates per `gamemode/GENRE_MATRIX.md`.
- **Custom Agents** can be created with full prompt templates if the built-ins don't fit a need.

Danny decides what to wire up per-playthrough rather than baking feature assumptions into the data.

---

## The Endless — Core Lore Reference

### The Doors
- White marble door in a medieval stone frame
- Appear without warning, replacing existing doors in any world
- When they disappear: original door returns, small scorch mark left on ground that fades naturally
- Can also appear in open spaces, fields, blank walls — not limited to existing doorways
- **Crescent moon etching = always leads to The Manifold. No exceptions.**
- **No etching = leads somewhere else** (another world, Glimpse World, unknown)
- Looking through an open door shows the destination clearly — no shimmer, no portal effect, just a window into somewhere else
- Most people cannot see the doors (perception filter suppresses awareness)

### The Perception Filter
- Bonds to a person on first touch of any door — passive and automatic
- Progression is feel-based (tracked by the **Custom Tracker** agent, see `gamemode/CUSTOM_TRACKER.md`):
  - Early: notices doors others miss
  - Mid: senses active doors before seeing them
  - Deep: can will an active door to reroute its destination to The Manifold (one function only — compass home)
- The Manifold appears to allow and encourage the reroute ability in experienced travelers

### The Manifold (The Hub World)
- Living spatial entity — not a building someone made, not a haunted location
- Architecture is brutalist but grown-looking rather than constructed
- Walls shift, hallways vanish, stairs lead nowhere or somewhere new
- Reference: The Oldest House from Control (the video game) — same energy
- Doors line every surface, hundreds of them. Most cold/inactive. Some warm (active connection)
- Light emanates from the structure itself — reflects its mood:
  - **White** = neutral/standard
  - **Red** = Taboo has been broken, environment hostile
  - Personal colors = perceived only by individual travelers via their perception filter
- The Manifold is aware. It is not hostile by default. It enforces its own rules because it chooses to.

### The No-Death Rule
- Absolute. No death of any kind in The Manifold. Enforced by the space itself, not any person or system.
- Self-harm attempts: body partially ghosts, physical self-interaction becomes impossible until intent passes
- Falls: stopped exactly 5 inches above ground, gently lowered
- Violence: doesn't land with force, made to feel purposeless like pushing through water
- Covers all living things — people, animals, insects, everything
- No one has ever died in The Manifold. No body has ever been found there.

### The Taboo
- Naming or directly asserting the existence of The Forgotten Ones inside The Manifold is forbidden
- Not a written rule — The Manifold enforces it because it chooses to
- **First offense**: lighting shifts red, environment becomes hostile until offender exits. On exit, resets completely. Lesson learned.
- **Second offense**: permanent. Perception filter reverses. Offender can never see any door anywhere ever again. Cannot be told where doors are. Cannot be led to one. The Manifold does not announce this — it simply happens.

### The Forgotten Ones (The Builders)
- Built The Endless and The Manifold. Simply gone now. Not dead, not sleeping, not returning. Just absent.
- Not aliens, not gods. Just prior — a category of being that existed before the current shape of things.
- Their written language survives in fragments: faint etchings on door frames, walls deep in The Manifold that weren't there before, objects in Glimpse Worlds
- Language appears deliberately incomplete — as if full text is scattered across many worlds
- No remains, no images, no record of what they looked like or why they built this
- **Must never be named inside The Manifold**
- Their names are known to exist but are never written in any lorebook entry — this is intentional

---

## Known Worlds

All 17 worlds are built and live in `worlds/`. Full-tier worlds have rich lore (NPCs, locations, factions). Glimpse Worlds are intentionally lore-light.

### Full Worlds
| World | Tone | File |
|---|---|---|
| The Manifold | Hub, living brutalist spatial entity | `worlds/The Manifold.json` |
| Night City | Cyberpunk Red 2045 (CP2077-adjacent) | `worlds/Night City.json` |
| Stardust Valley | Cozy VTuber-ish world (VchiBan-inspired) | `worlds/Stardust Valley.json` |
| The Ashlands | Dark Souls-adjacent dying kingdom | `worlds/The Ashlands.json` |
| Pale Fog | Silent Hill-adjacent psychological horror | `worlds/Pale Fog.json` |
| The Fallout Wastes | Post-apocalyptic wasteland | `worlds/The Fallout Wastes.json` |
| Evergreen Vale | Studio Ghibli-esque cozy village | `worlds/Evergreen Vale.json` |
| The Endless Library | Liminal infinite library | `worlds/The Endless Library.json` |
| Ironwater Station | Abandoned deep space station | `worlds/Ironwater Station.json` |
| The Frontier | Wild west | `worlds/The Frontier.json` |
| Dunwater Coast | Pirate island chains | `worlds/Dunwater Coast.json` |
| Aldenmoor | High fantasy continent | `worlds/Aldenmoor.json` |

### Glimpse Worlds
Rarely visited, intentionally under-explained.
- **The Red Planet** — rust terrain, circle of white featureless buildings, no life
- **The White Forest** — identical pale trees in perfect grid, no animals, silence
- **The Lighthouse World** — endless ocean, one rock, one lighthouse, logbook inside
- **The Stopped City** — city frozen mid-morning, no people, nothing decaying
- **The Slow Thing** — black sand, two suns, something enormous on the horizon that never arrives

---

## NPC Naming Conventions by World

Used by the GM card to generate contextually appropriate NPC names.

| World | Naming Style | Examples |
|---|---|---|
| Night City | Street handles, cultural mix surnames | Rook, Marta Szabo, Jin-ho Pak, Cipher, Ghost |
| Stardust Valley | Soft, nature-adjacent, two syllables | Sora, Maeve, Lirien, Calla, Finn, Yuki, Bramble |
| The Ashlands | Heavy, old-world, worn down | Edric, Mourne, Sable, Wren, Aldous, Crest, Vara |
| Pale Fog | Slightly wrong, familiar but off | Names that shift between introductions |
| Fallout Wastes | Practical nouns that stuck | Grit, Mama Torrez, Shovel, Doc Carver, Rue |
| Evergreen Vale | Simple, warm, generational | Brom, Lena, Hazel, Old Peck, Milli, Tomas |
| Endless Library | Call numbers or forgotten names | Eleven-West, Archivist Crane, the one who answers to Shh |
| Ironwater Station | Names on worn badges | Okonkwo, Specialist Vael, DEMI WAS HERE |
| The Frontier | Names that earned themselves | Clay, Sister Rue, the Judge, Calico, Esperanza Voss |
| Dunwater Coast | Names that belong to the sea | Corsair, Brine, Magistra Fenn, Tallow, Sirocco |
| Aldenmoor | Classical fantasy with weight | Caelith, Morn, Aldren Voss, Sister Thea, Jorin |
| Manifold Explorers | Self-named after first crossing | Threshold, Sable, Match, Once, Cairn, Wren |

---

## GM Card Notes

- **Version**: 3.0 (inner `character_version` field) — Marinara Game Mode native
- **Voice**: GM narrative voice. Uses `{{char}}` framing. Asterisk action beats. NOT a pure text adventure narrator.
- **Dialogue color**: `#C4A882` (preset in `extensions.dialogueColor`; cosmetic, not consumed by Game Mode but harmless)
- **Game Mode reads only**: `name`, `description`, `personality`, `extensions.backstory`, `extensions.appearance`. Everything else on the card is cleared (scenario, first_mes, mes_example, alternate_greetings, system_prompt, post_history_instructions, depth_prompt, character_book).
- **No separate NPC cards needed for worlds** — GM generates NPCs organically using the naming conventions above. Standalone NPC cards (Threshold, Cairn, GenericExplorer) exist as optional Party Members.
- The Taboo enforcement, No-Death Rule description, and Glimpse World descriptions live in the GM card's `description` and the core lorebook's constant entries.
- **Core lorebook lives at `core/The Endless.json`** — single source of truth. The GM card no longer embeds a `character_book` (Game Mode doesn't read it).

---

## Tone and Mystery Rules

These apply to ALL content in this project. Never violate them.

- The Forgotten Ones are never explained. Never named in any lorebook content.
- The Glimpse Worlds are never explained. They simply are.
- The Manifold's full nature is never stated outright.
- Impossible things are presented plainly, without fanfare.
- Mystery is preserved by what is NOT said.
- The strangeness of The Endless is in its mundanity — a marble door in a medieval frame standing in an alley is wrong, but it does not announce itself as wrong.

---

## Inspirations and Reference Points

Useful context for maintaining correct tone and feel:

- **The Manifold**: Control (Remedy Entertainment) — The Oldest House as a living spatial entity
- **The Doors**: The Gold King (Minecraft ARG YouTube series) — golden doors connecting worlds
- **Door travel mechanic**: Doctor Who TARDIS — you can see clearly through the doorway into another world, no portal effect
- **The Forgotten Ones**: Subnautica's Precursor race — built everything, died off (from a virus), left no forwarding address
- **Overall structure**: The Dark Tower (Stephen King) — hub connecting all universes; SCP Foundation — anomalous locations bleeding between realities; Control — liminal connector spaces
- **Glimpse Worlds energy**: Liminal spaces aesthetic — prepared but unused, stopped but not abandoned
