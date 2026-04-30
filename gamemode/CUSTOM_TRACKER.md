# Custom Tracker Agent — The Endless State Schema

Marinara's `custom-tracker` agent maintains arbitrary JSON state across turns. Its output is auto-injected into every prompt as `<custom_state>`. This is the right place for Endless-specific persistent state — replaces the old "RPG Companion card" approach.

## Setup

1. Open the Agents panel → enable `custom-tracker`.
2. In its settings, paste the field schema below.
3. Default values populate when the agent first runs.

## Field schema

```json
{
  "perception_filter_level": {
    "type": "enum",
    "values": ["none", "early", "mid", "deep"],
    "default": "early",
    "description": "How deeply the perception filter has bonded. 'none' = pre-first-touch. 'early' = notices doors others miss. 'mid' = senses active doors before seeing them. 'deep' = can will an active door to reroute home to The Manifold."
  },
  "current_world": {
    "type": "enum",
    "values": [
      "Earth", "The Manifold", "Night City", "Aldenmoor", "Stardust Valley",
      "The Ashlands", "Pale Fog", "The Fallout Wastes", "Evergreen Vale",
      "The Endless Library", "Ironwater Station", "The Frontier",
      "Dunwater Coast", "The Red Planet", "The White Forest",
      "The Lighthouse World", "The Stopped City", "The Slow Thing"
    ],
    "default": "Earth",
    "description": "The world the player is currently in. Updates whenever the player crosses a door."
  },
  "worlds_visited": {
    "type": "array",
    "default": [],
    "description": "Worlds the player has set foot in at least once, in order of first visit."
  },
  "doors_crossed": {
    "type": "integer",
    "default": 0,
    "description": "Total count of doors the player has stepped through. Drives perception_filter_level progression."
  },
  "taboo_offenses": {
    "type": "integer",
    "default": 0,
    "description": "How many times the player has named or asserted the existence of The Forgotten Ones inside The Manifold. 0 = clean. 1 = environment turned hostile last visit but reset on exit. 2 = perception filter PERMANENTLY reversed; player can no longer see any door anywhere."
  },
  "last_door_etching": {
    "type": "enum",
    "values": ["crescent_moon", "none", "unknown"],
    "default": "unknown",
    "description": "The marking on the last door the player approached or crossed. crescent_moon = leads to The Manifold. none = leads elsewhere."
  },
  "manifold_lighting": {
    "type": "enum",
    "values": ["white", "red", "personal"],
    "default": "white",
    "description": "Current Manifold lighting state. white = neutral. red = Taboo broken, environment hostile. personal = traveler-specific colors via deep perception filter."
  },
  "explorer_contacts": {
    "type": "array",
    "default": [],
    "description": "Named Explorers the player has met (e.g. Threshold, Cairn, Sable, Match, Once, Wren) and any GM-invented Explorers."
  }
}
```

## Custom Tracker prompt template

In the agent's `promptTemplate` field, paste:

```
You are the State Tracker for The Endless. Each turn, read the latest narration and update the tracked state JSON when events warrant it. Update rules:

- perception_filter_level: advance from "none" → "early" on first door touch. "early" → "mid" after roughly 5+ doors crossed. "mid" → "deep" only at GM's narrative discretion (long exposure, key moments).
- current_world: update the moment the player physically enters a new world via a door.
- worlds_visited: append a world the first time current_world is set to it.
- doors_crossed: increment when the player steps through a door.
- taboo_offenses: increment ONLY if the player explicitly names or asserts the existence of The Forgotten Ones (or unambiguous synonyms) WHILE inside The Manifold. Do not count near-misses or implications.
- last_door_etching: update when the player observes or crosses a door. crescent_moon = leads to Manifold. none = leads elsewhere.
- manifold_lighting: white by default. red when taboo_offenses == 1 within the same Manifold visit. resets to white on exit.
- explorer_contacts: append a named Explorer the first time the player meaningfully interacts with one.

Output ONLY the updated JSON state object. Do not narrate.
```

## What the GM sees

`<custom_state>...</custom_state>` is auto-injected into the GM system prompt every turn after the tracker runs. The GM can reason about:

- Has the player been to Aldenmoor before? Reference it naturally.
- Are they on their second taboo offense? Then their next slip permanently reverses the perception filter — narrate accordingly.
- Has perception_filter_level reached "deep"? They can now reroute doors home.

## Notes

- Set `runInterval` to every 1 message (the default is every 8) — Endless state changes turn-by-turn.
- Set `defaultInjectAsSection: true` so it lands in the prompt as `<custom_state>`.
- Lock the agent (`locked: true`) once configured to prevent the Lorebook Keeper from accidentally editing it.
