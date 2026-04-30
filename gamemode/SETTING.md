# Game Mode — Wizard Setting Field

Marinara Engine's Game Mode setup wizard has a free-text **Setting** field. Whatever you put there is interpolated into the GM system prompt **every single turn** — it is the most reliable place to lock world premise. Most other character-card fields (`first_mes`, `scenario`, `mes_example`, `system_prompt`, `post_history_instructions`, `extensions.depth_prompt`, embedded `character_book`) are **not used** in Game Mode.

Paste the block below into the **Setting** field of every Endless Game Mode session.

---

## Default setting text (paste this)

```
Modern Earth — your normal life. Without warning, white marble doors in medieval stone frames may appear, replacing existing doors or standing in open spaces. Most people cannot see them. You can. Touching one for the first time bonds a passive perception filter; awareness deepens with exposure. Doors etched with a crescent moon always lead to The Manifold — a living brutalist hub world that enforces an absolute No-Death Rule and forbids naming The Forgotten Ones (its absent builders). Unmarked doors lead elsewhere: Night City (cyberpunk, neon-noir), Aldenmoor (high fantasy continent), Pale Fog (Silent-Hill-adjacent psychological horror), Stardust Valley (cozy supernatural valley town), The Ashlands (Dark-Souls-adjacent dying kingdom), The Fallout Wastes (post-apoc), Evergreen Vale (Ghibli-warm village), The Endless Library (liminal infinite library), Ironwater Station (abandoned deep-space station), The Frontier (wild west), Dunwater Coast (pirate islands), and rare nearly-empty Glimpse Worlds (Red Planet, White Forest, Lighthouse, Stopped City, Slow Thing). Looking through an open door shows the destination clearly — no shimmer, no portal effect, just a window into somewhere else. Doors vanish leaving a small fading scorch mark. Present impossible things plainly, without fanfare. Mystery is preserved by what is not said.
```

---

## Recommended Player Goals (paste into wizard's Player Goals field, max 2000 chars)

```
You live a normal life on modern-day Earth. Today, a marble door has appeared somewhere in your daily environment — your hallway, your office, an alley, a service corridor. You can see it; nearly no one else can. The door is open. Beyond the gap, somewhere that is plainly not your world is visible. The choice of whether to step through belongs to you. If you cross, you may end up in The Manifold (the hub) or in any of the other worlds. You may return through any door etched with a crescent moon — these always lead to The Manifold, from which you can choose another door home. Keep your head; the worlds do not all play by the same rules. Within The Manifold, never name or assert the existence of its builders.
```

---

## Genre / Tone choices in the wizard

These are quick presets. The detailed per-world matrix lives in `GENRE_MATRIX.md`. For the **opening session** (Modern Earth), use:

- **Genre:** Modern (+ optional custom: "Multi-World Modern")
- **Tone:** Serious + custom: "Mundanely Wrong"
- **Difficulty:** Normal (or Casual for first session)

Once the player has crossed into a specific world, you may consider starting a **new Game Mode chat** with that world's preferred Genre/Tone if you want a tonal shift — Marinara doesn't auto-rebalance these mid-campaign.

---

## What lorebooks to attach in the wizard

In the wizard's **Lorebooks** step (`activeLorebookIds`), attach:

- `core/The Endless.json` — always. Door mechanics, Manifold rules, Taboo, the world catalog.

Do **not** pre-attach any individual world lorebook. Toggle in the destination world only when the player crosses through. This keeps token cost in check and prevents cross-world contamination.

---

## What to enable in agents

Recommended for The Endless:

- **`game-master`** — required (it's the primary responder)
- **`world-state`** — tracks current location, time, weather
- **`quest`** — tracks ongoing player intent
- **`custom-tracker`** — configure with the schema in `CUSTOM_TRACKER.md` (perception filter, taboo offenses, current world, worlds visited, last door etching)
- **`knowledge-router`** — recommended on tight VRAM; reads entry `description` fields and selectively injects relevant entries
- **`lorebook-keeper`** — optional; auto-creates lorebook entries from story events. Useful for capturing one-off NPCs the GM invents

Skip:
- **`combat`** — only if you don't intend to use combat encounters this session
- **`response-orchestrator`** — Conversation-mode oriented, not Game Mode
