# Game Mode — Per-World Genre / Tone / Difficulty Reference

Marinara's Game Mode wizard freezes the Genre, Tone, and Difficulty values for the entire campaign. They cannot be changed mid-chat. The cleanest pattern for The Endless is therefore:

1. **Start every campaign on modern Earth** with the defaults from `SETTING.md` (Genre: Modern, Tone: Serious + "Mundanely Wrong").
2. When the player commits to settling in a specific world, optionally start a **new Game Mode chat** with that world's preferred Genre/Tone for tonal precision. (Multi-session continuity is preserved via `chat.metadata.sessionSummaries`.)

For sessions that explicitly start in a single world (skipping the door encounter), use the matrix below.

---

## Full Worlds

| World | Genre | Custom Genre Add | Tone | Difficulty | Notes |
|---|---|---|---|---|---|
| **Earth (baseline)** | Modern | — | Serious + "Mundanely Wrong" | Normal | Opening sessions; the door arrives |
| **The Manifold** | Modern | "Liminal" | Serious + "Awe-still" | Casual | No-Death Rule active — Difficulty mostly cosmetic |
| **Night City** | Cyberpunk | — | Gritty + Dark | Hard | Combat-likely; consider Spellbook for cyberware |
| **Aldenmoor** | Fantasy | — | Heroic | Normal | Combat-likely; consider Spellbook for magic |
| **Stardust Valley** | Modern | "Cozy Supernatural" | Whimsical + Comedic | Casual | Low-stakes social play |
| **The Ashlands** | Fantasy | "Dark Fantasy" | Dark + Gritty | Brutal | Dark-Souls-adjacent; lethal |
| **Pale Fog** | Horror | — | Dark + Serious | Hard | Sanity-threatening; psychological |
| **The Fallout Wastes** | Post-Apocalyptic | — | Gritty + Dark | Hard | Combat-likely |
| **Evergreen Vale** | Fantasy | "Cozy Pastoral" | Whimsical + Heroic | Casual | Ghibli-warm; no combat default |
| **The Endless Library** | Modern | "Liminal" | Serious + Whimsical | Casual | Puzzle / mystery oriented |
| **Ironwater Station** | Sci-Fi | "Abandoned" | Dark + Serious | Hard | Survival horror flavored |
| **The Frontier** | Historical | "Wild West" | Gritty + Heroic | Normal | Combat-likely |
| **Dunwater Coast** | Fantasy | "Pirate" | Heroic + Gritty | Normal | Combat + social |

## Glimpse Worlds

Glimpse Worlds are intentionally lore-light. Lean into liminal silence; do not write much.

| World | Genre | Custom Genre Add | Tone | Difficulty |
|---|---|---|---|---|
| **The Red Planet** | Sci-Fi | "Liminal" | Serious | Casual |
| **The White Forest** | Horror | "Liminal" | Dark + Serious | Casual |
| **The Lighthouse World** | Modern | "Liminal" | Serious | Casual |
| **The Stopped City** | Modern | "Liminal" | Serious | Casual |
| **The Slow Thing** | Sci-Fi | "Cosmic Horror" | Dark + Serious | Casual |

---

## Spellbook recommendations (per Game Mode combat encounter)

Marinara's Spellbook lorebook category is read wholesale into combat encounters. Recommended Spellbook lorebooks to author per world (none are built yet):

| World | Spellbook concept |
|---|---|
| Aldenmoor | Schools of magic — pyromancy, healing, divination, wards |
| Night City | Quickhacks + cyberware combat moves + iconic weapons |
| Pale Fog | "Anomalies" — dissociative actions, brief reality-breaks (cosmic) |
| The Fallout Wastes | Chems, melee, ballistic, energy weapons |
| The Ashlands | Sword arts, miracle-style faith powers, dark sorceries |
| The Frontier | Gun combat — fanning, quickdraw, dynamite, lasso, brawling |
| Dunwater Coast | Cutlass styles, pistol drills, naval boarding tactics |

The other worlds rarely need combat encounters; skip Spellbooks unless a session demands it.

---

## When to start a new Game Mode chat vs. continue

Continue the same chat when:
- Player crosses doors freely (multi-world traveler narrative)
- Each world visit is brief / vignette-style

Start a new Game Mode chat when:
- The player wants a sustained arc in one world (e.g. "5 sessions in Night City")
- The previous campaign's `genre`/`setting`/`tone` are tonally wrong for the new world
- You want to pick a world-specific Spellbook for combat

The previous chat's `chat.metadata.sessionSummaries[]` can be referenced manually in the new chat's Player Goals or Setting field for continuity.
