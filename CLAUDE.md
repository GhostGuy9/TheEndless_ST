# The Endless — SillyTavern Lore Project

## What This Is

This repository contains all SillyTavern lorebook JSON files and character card JSON files for **The Endless** — an original multi-world lore system designed as a Global Active World in SillyTavern. It connects multiple fictional worlds (original and existing) through a shared phenomenon of ancient marble doors that appear and disappear without warning.

All files are importable directly into SillyTavern. Lorebooks go through World Info → Import. Character cards go through Characters → Import.

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
│   ├── TheEndless_Lorebook.json    ← Global Active lorebook, always loaded
│   └── TheEndless_GM.json          ← GM/narrator character card
└── worlds/
    ├── World_Ashlands.json         ← (planned)
    ├── World_Aldenmoor.json        ← (planned)
    ├── World_PaleFog.json          ← (planned)
    ├── World_FalloutWastes.json    ← (planned)
    ├── World_EvergreenVale.json    ← (planned)
    ├── World_EndlessLibrary.json   ← (planned)
    ├── World_IronwaterStation.json ← (planned)
    ├── World_Frontier.json         ← (planned)
    ├── World_DunwaterCoast.json    ← (planned)
    └── World_NightCity.json        ← (planned, CP2077-adjacent)
```

---

## SillyTavern File Format Rules

These are critical. Getting these wrong silently breaks things on import.

### Lorebooks
- `entries` MUST be a JSON object keyed by uid strings (`"1"`, `"2"`) — NEVER an array
- Using an array corrupts the `comment` field on every entry during import
- `comment` field is the label shown in ST's UI — use bracket prefix convention: `[Overview]`, `[Location]`, `[Mechanics]`, `[Character]`, `[Meta]`, etc.
- `content` must be self-contained — keywords and titles are NOT injected, only content
- `constant: true` entries always fire regardless of keywords — use sparingly (max 2-3 per lorebook)
- `position: "before_char"` for world/setting lore, `"after_char"` for immediate scene context
- Higher `insertion_order` = injected closer to end of prompt = stronger model influence

### Character Cards
- Spec: `chara_card_v2`, spec_version `"2.0"`
- Use `{{char}}` and `{{user}}` macros instead of real names
- `first_mes` length calibrates AI response length — write it the length you want responses to be
- `mes_example` exchanges MUST each start with `<START>` on its own line
- `system_prompt` left as `""` uses user's global ST settings

---

## How SillyTavern Loads This

### Loading Order (Context Priority)
```
System Prompt → Character Card → Lorebooks → Chat History
```

### Recommended ST Setup
| What | How |
|---|---|
| `TheEndless_Lorebook.json` | World Info → Import → set Global, Always Active |
| `TheEndless_GM.json` | Characters → Import → load as primary card |
| Individual world lorebook | Activate ONLY when player is in that world, deactivate on exit |
| RPG Companion card | Load alongside GM card for mechanical stat/inventory tracking |

**Do NOT load all world lorebooks globally.** The GM card carries thumbnail descriptions of all worlds. Full world lorebooks only activate when the player is inside that world. This is a deliberate token budget decision.

### Token Budget Reality
At 8GB VRAM Danny runs local models (currently testing ~7-9B uncensored GGUF models). Token budget is tight. Every active element costs:
- GM card description: ~800-900 tokens
- Lorebook constant entries: ~300 tokens always
- Triggered lorebook entries: ~150-300 each per message
- World lorebook entries: fire only when active

Keep world lorebook entries lean. 100-250 tokens per entry target.

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

### Already Built (in core/ lorebook)
These have full thumbnail entries in the GM card and entries in TheEndless_Lorebook.json.

**The Manifold** — The hub. Living brutalist spatial entity between all worlds.

**Glimpse Worlds** (lore-light, no individual lorebooks planned):
- The Red Planet — rust terrain, circle of white featureless buildings, no life
- The White Forest — identical pale trees in perfect grid, no animals, silence
- The Lighthouse World — endless ocean, one rock, one lighthouse, logbook inside
- The Stopped City — city frozen mid-morning, no people, nothing decaying
- The Slow Thing — black sand, two suns, something enormous on the horizon that never arrives

### Planned (individual lorebooks to be built)
Each gets its own lorebook file in `worlds/`. Two-tier system:
- **Tier 1**: Thumbnail entry in TheEndless_Lorebook.json (already written in GM card, needs lorebook entry added)
- **Tier 2**: Full individual world lorebook, activated only when player is in that world

| World | Tone | File |
|---|---|---|
| Night City | Cyberpunk dystopia (CP2077-adjacent) | World_NightCity.json |
| Stardust Valley | Cozy VTuber world (VchiBan) | World_StardustValley.json |
| The Ashlands | Dark Souls-adjacent dying kingdom | World_Ashlands.json |
| Pale Fog | Silent Hill-adjacent psychological horror | World_PaleFog.json |
| The Fallout Wastes | Post-apocalyptic wasteland | World_FalloutWastes.json |
| Evergreen Vale | Studio Ghibli-esque cozy village | World_EvergreenVale.json |
| The Endless Library | Liminal infinite library | World_EndlessLibrary.json |
| Ironwater Station | Abandoned deep space station | World_IronwaterStation.json |
| The Frontier | Wild west | World_Frontier.json |
| Dunwater Coast | Pirate island chains | World_DunwaterCoast.json |
| Aldenmoor | High fantasy continent | World_Aldenmoor.json |

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

- **Version**: 1.1
- **Voice**: GM character with narrative voice. Uses `{{char}}` framing. Asterisk action beats. NOT a pure text adventure narrator (Danny uses Text Adventure preset in ST which handles formatting — the card itself keeps its character voice).
- **No separate NPC cards needed** — GM generates Explorer NPCs organically
- **RPG Companion** handles mechanical tracking (perception filter level, stats, inventory). GM card handles narration only.
- The Taboo enforcement, No-Death Rule description, and Glimpse World descriptions are all handled by this card

---

## What's Left To Build

In priority order:
1. Add thumbnail entries to `TheEndless_Lorebook.json` for all 11 planned worlds (Tier 1)
2. Build each individual world lorebook one at a time (Tier 2), starting with whichever world Danny wants to play in first
3. Stardust Valley and Night City lorebooks may already exist separately — confirm with Danny before rebuilding

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
