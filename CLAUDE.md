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
│   ├── The Endless.json        ← Core lorebook (door mechanics, Manifold rules, Explorer NPCs)
│   ├── TheEndless_GM.json      ← GM/narrator character card
│   └── TheEndless - Profile Photo.png
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
- `position` is an **integer**: `0` = before character definitions (world/setting lore), `1` = after character definitions (immediate scene context), `2`/`3` = around author's note, `4` = at chat depth
- `order` (equivalent to ST's `insertion_order`) — higher = injected closer to end of prompt = stronger model influence
- `role` is a string: `"system"`, `"user"`, or `"assistant"`
- `selectiveLogic` is a string: `"and"` or `"or"`
- Lorebook-level `category`: use `"world"` for world lorebooks and the core Endless lorebook

### Character Cards
- Top-level envelope: `{ "type": "marinara_character", "version": 1, "exportedAt": "...", "data": { "spec": "chara_card_v2", "spec_version": "2.0", "data": {...}, "metadata": {...} } }`
- Inner `data.data` is the standard chara_card_v2 spec (name, description, personality, scenario, first_mes, etc.)
- Use `{{char}}` and `{{user}}` macros instead of real names
- `first_mes` length calibrates AI response length — write it the length you want responses to be
- `mes_example` exchanges MUST each start with `<START>` on its own line
- `system_prompt` left as `""` uses the user's global Marinara settings
- M.E.-specific extensions bag fields:
  - `nameColor` / `dialogueColor` / `boxColor`: hex or CSS gradient (e.g., `linear-gradient(...)`). Threshold uses `#E88D67`, GM card uses `#C4A882`
  - `backstory` / `appearance`: optional prose fields (alternative to embedding everything in `description`)
  - `talkativeness`: 0.0–1.0 (affects how often the model volunteers dialogue)
  - `conversationStatus`: `"online"` default
- `character_book`: set to `null` unless the card embeds its own private lorebook

---

## How Marinara Engine Loads This

### Loading Order (Context Priority)
```
System Prompt → Character Card → Lorebooks → Chat History
```

### Recommended Setup
| What | How |
|---|---|
| `core/TheEndless_GM.json` | Import as character, use as primary chat partner. Core lore is embedded — no separate lorebook bind needed |
| `core/The Endless.json` | Standalone copy of the core lorebook. Optional import for SillyTavern users or anyone who wants it as a separate lorebook |
| A world lorebook | Activate for the chat ONLY while the player is in that world |
| Explorer character cards | Optional — import for group chats where Explorers appear |

**Do NOT activate all world lorebooks at once.** The GM card carries thumbnail descriptions of all worlds. Full world lorebooks only activate when the player is inside that world. This is a deliberate token budget decision.

### Token Budget Reality
At 8GB VRAM Danny runs local models (currently testing ~7-9B uncensored GGUF models). Token budget is tight. Every active element costs:
- GM card description: ~800-900 tokens
- Lorebook constant entries: ~300 tokens always
- Triggered lorebook entries: ~150-300 each per message
- World lorebook entries: fire only when active

Keep world lorebook entries lean. 100-250 tokens per entry target.

### Marinara-Native Features Available
These are exposed by the file format but require activation in the Marinara UI:
- **Agents** (25+ built-in): world tracking, quests, combat, expression detection — particularly relevant for Night City (combat), Ironwater Station (status tracking), Pale Fog (sanity)
- **Game mode**: party systems, NPC dialogue tracking — natural fit for The Frontier, Aldenmoor, Dunwater Coast
- **Dynamic weather / sprite switching**: not currently wired into any card, but `extensions.dialogueColor` preset on Threshold and the GM
- **Local Gemma model**: can be assigned to tracker agents or game scene analysis — useful for keeping VRAM headroom on the main model

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
- Progression is feel-based (tracked by RPG Companion card, not this GM card):
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

- **Version**: 2.1 (inner `character_version` field)
- **Voice**: GM character with narrative voice. Uses `{{char}}` framing. Asterisk action beats. NOT a pure text adventure narrator.
- **Dialogue color**: `#C4A882` (preset in `extensions.dialogueColor`)
- **No separate NPC cards needed for worlds** — GM generates NPCs organically using the naming conventions above. Standalone NPC cards (Threshold, Cairn, GenericExplorer) exist for group chats if desired.
- The Taboo enforcement, No-Death Rule description, and Glimpse World descriptions are all handled by the GM card
- **Core lorebook is embedded** in the GM card's `character_book` field — door mechanics, Manifold rules, and Endless overview ship with the card. `core/The Endless.json` exists as a standalone copy too. **If you edit one, update both** (the embedded copy is plain chara_card_v2 spec format, the standalone is M.E. format)

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
