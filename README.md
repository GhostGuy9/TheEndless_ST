# The Endless — Lore Project

A multi-world door phenomenon. Ancient marble doors appear without warning, connecting worlds through a living hub called **The Manifold**.

This repo is a data-only lore collection: lorebooks, character cards, and world files in **Marinara Engine** native format. All files are also compatible with SillyTavern via its import flow.

## What's Included

### Core

| File | Description |
|---|---|
| `core/The Endless.json` | Core lorebook — door mechanics, Manifold rules, Explorer NPCs |
| `core/TheEndless_GM.json` | GM/narrator character card |

### Worlds

17 world lorebooks in `worlds/` — each a self-contained setting that activates when your character is inside it.

**Full worlds:** Night City, Stardust Valley, The Ashlands, Pale Fog, The Fallout Wastes, Evergreen Vale, The Endless Library, Ironwater Station, The Frontier, Dunwater Coast, Aldenmoor, The Manifold.

**Glimpse Worlds** (lore-light, rarely visited): The Red Planet, The White Forest, The Lighthouse World, The Stopped City, The Slow Thing.

### Characters

| File | Description |
|---|---|
| `characters/Threshold.json` | Experienced Manifold Explorer — casual, knows everything |
| `characters/Cairn.json` | Younger Explorer — practical, blunt, tactical |
| `characters/GenericExplorer.json` | Template for generating unnamed Explorer NPCs |

## Setup — Marinara Engine

1. Import `core/TheEndless_GM.json` as a character
2. Import `core/The Endless.json` as a lorebook and bind it to the GM card (or leave it global)
3. Import the world lorebook for whichever setting you want to play in — activate it for the chat
4. Optional: import any of the Explorer character cards for group chats

Marinara Engine's native features (tags, categories, per-entry color, relationships, game mode hooks) are wired into the JSON where it made sense. Dialogue colors for Threshold (`#E88D67`) and the GM narrator (`#C4A882`) are preset.

## Setup — SillyTavern

Marinara's lorebook and character envelopes are thin wrappers around SillyTavern's v2 spec, but ST's importer doesn't unwrap them. To use these files in SillyTavern:

1. Strip the outer envelope — for lorebooks, use `.data.lorebook` + `.data.entries`; for characters, use `.data`
2. Or export a file from SillyTavern in the old format and hand-port entries

If you want to keep ST-native copies alongside these, check out the pre-conversion commit (`15cddb7` and earlier) and grab them from git history.

## Lore Overview

See `CLAUDE.md` for the full lore reference — door mechanics, the Manifold's rules, the Taboo, the perception filter, and the worlds.

## Credits

Created by **Danny** (GhostGuy9) with **Claude** (Anthropic).
