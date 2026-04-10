# The Endless — SillyTavern Extension & Lore Project

A multi-world door phenomenon for SillyTavern. Ancient marble doors appear without warning, connecting worlds through a living hub called **The Manifold**. This repo is both a SillyTavern extension and a complete lorebook/character card collection.

## What's Included

### Extension — Door Manager
Automatically manages world lorebook activation based on narrative events. When your character walks through a marble door, the extension:
- Detects the door event from player input or model output
- Randomly selects a destination world
- Activates only that world's lorebook (deactivates all others)
- Injects a system note so the model knows where to narrate

Install via SillyTavern's extension installer using this repo URL.

### Lorebooks

| File | Description |
|---|---|
| `core/The Endless.json` | Global Active lorebook — door mechanics, Manifold rules, Explorer NPCs |
| `core/TheEndless_GM.json` | GM/narrator character card (v2.0) |
| `worlds/*.json` | 16 world lorebooks — activate per-world via the extension |

**Worlds:** Night City, Stardust Valley, The Ashlands, Pale Fog, The Fallout Wastes, Evergreen Vale, The Endless Library, Ironwater Station, The Frontier, Dunwater Coast, Aldenmoor, plus 5 Glimpse Worlds (The Red Planet, The White Forest, The Lighthouse World, The Stopped City, The Slow Thing).

### Character Cards

| File | Description |
|---|---|
| `characters/Threshold.json` | Experienced Manifold Explorer — casual, knows everything |
| `characters/Cairn.json` | Younger Explorer — practical, blunt, tactical |
| `characters/GenericExplorer.json` | Template for generating unique unnamed Explorers |

## Setup

1. **Install the extension** — In SillyTavern, go to Extensions > Install from URL and paste this repo's URL
2. **Import the GM card** — Characters > Import > `core/TheEndless_GM.json`
3. **Import the core lorebook** — World Info > Import > `core/The Endless.json` > Set as Global, Always Active
4. **Import world lorebooks** — World Info > Import each file from `worlds/`. Leave all entries disabled — the extension manages activation
5. **(Optional)** Import character cards from `characters/` for group chat use

## How It Works

The GM card handles narration and tone. The core lorebook provides door mechanics, Manifold rules, and Explorer NPCs (keyword-triggered). World lorebooks provide world-specific lore and NPCs — only one is active at a time.

The extension sits between everything: it detects when you walk through a door, picks a destination, activates the right lorebook, and tells the model where to narrate. When you return to The Manifold (crescent moon door), all world lorebooks deactivate.

### Extension Commands

| Command | Alias | Action |
|---|---|---|
| `/endless-world [name]` | `/ew` | Show current world or switch to a specific world |
| `/endless-door` | `/ed` | Trigger a random door event |
| `/endless-manifold` | `/em` | Return to The Manifold |
| `/endless-history` | `/eh` | Show world visit history |

## Token Budget

Designed for local models on 8GB VRAM (7-9B parameter models):
- GM card: ~800 tokens (v2.0, slimmed from ~1700)
- Core lorebook constants: ~300 tokens
- Explorer NPCs: ~150 tokens each, only when mentioned
- World lorebook entries: ~150-300 each, only when triggered
- World NPC entries: ~150 each, only when mentioned

A typical scene uses ~1,200 tokens of system content, leaving room for chat history and BunnyMo trackers.

## Compatible Extensions

- **Doom's Enhancement Suite** — Chat bubbles, NPC profiles, font color dialog
- **CarrotKernel** — Character detection, BunnyMo tag injection
- **BunnyMo** — Behavioral trackers (health, chemistry, etc.)

## Credits

Created by **Danny** (GhostGuy9) with **Claude** (Anthropic).
