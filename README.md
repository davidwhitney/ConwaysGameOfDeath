# Conway's Game of Death

**Survive the Automaton** — a Vampire Survivors-style action roguelike powered by cellular automata.

Fight through procedurally generated cave dungeons, collect weapons and power-ups, and survive waves of Halloween-themed enemies. The map itself is alive, generated and evolved using Conway's cellular automata rules, creating organic cave systems that shift as you play.

## How to Play

- Move through the caves, dodging and defeating enemies that spawn in ever-growing waves
- Collect XP gems dropped by enemies to level up
- Each level-up offers a choice of 3 randomly weighted options: new weapons, effects, or healing
- Equip up to 6 weapons and 6 effects, each upgradeable to max level
- Survive for 30 minutes to unlock the exit gate
- Defeat Death — the final boss — to escape

### Controls

| Input | Movement | Action |
|-------|----------|--------|
| Keyboard | Arrow keys / WASD | Space |
| Gamepad | Analog stick | Buttons |
| Touch | Multi-touch | Tap |

## Features

### 31 Weapons across 4 Categories

- **Melee** — Swing around the player: Whip, Sword, Axe, Knife, Cross, Spear, Mace
- **AoE** — Area damage: Garlic, Holy Water, Fire Wand, Lightning, Meteor, Quake, Spirit Bomb, Plague Cloud
- **Projectile** — Fires in a direction: Magic Missile, Fireball, Ice Shard, Boomerang, Scythe, Shuriken, Death Ray, Bone Toss
- **Force Field** — Orbits/auras: Holy Shield, Frost Aura, Poison Cloud, Thunder Ring, Void Field, Void Burn, Vortex, Blood Aura, Gravity Well

### 26 Effects & Power-ups

XP Boost, Speed, Regen, Shield, Magnet, Cooldown Reduction, Might, Armor, Luck, Revival, Strong Auras, Fury, Focused, Evolution, Thorns, Lifesteal, Berserk, Dodge, Crit Chance, Knockback, Slow Aura, Gold Find, Duration, Growth, Vitality, Housekeeping

### 11 Enemy Types

Bat, Skeleton, Zombie, Ghost, Werewolf, Mummy, Vampire, Lich, Dragon, Reaper — and **Death** itself as the final boss. Enemies scale dynamically in HP and damage over the 30-minute run, with unique behaviours including chasing, swarming, orbiting, teleporting, and cross-pattern movement.

### Procedural Map Generation

The dungeon is a 2000x2000 tile map generated using cellular automata rules (B5678/S45678). The map evolves every 90 seconds, reshaping the caves around you as you play.

### Procedural Music

11 synthesised music styles generated in real-time using the Web Audio API — no pre-recorded samples:

Lo-fi, Trip-hop, Djent, Industrial, Techno, 8-bit Metal, Synthwave, Drum & Bass, Pop-punk, Funk, Ambient

Music intensity modulates dynamically based on gameplay.

### Meta-progression

- **16 Perks** (up to 5 levels each) that persist across runs — buff your stats, increase difficulty for more XP, compress the game timer, and more
- **20+ Achievements** — kill milestones, boss challenges, survival goals, and perk-specific challenges
- **High scores** tracked locally

### CRT Visual Effect

A scanline shader gives the game a retro CRT look.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Game Engine | Phaser 3 |
| Build Tool | Vite |
| Audio | Web Audio API (procedural synthesis) |
| Physics | Arcade physics with spatial hash grid |
| Platform | Browser (PWA-enabled for offline/mobile) |

## Getting Started

### Prerequisites

- Node.js

### Install & Run

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  entities/       # Player, Enemy, weapons, effects, XP gems
  scenes/         # Phaser scenes (menus, gameplay, UI)
  systems/
    audio/        # Procedural music generation
    weapons/      # 31 weapon implementations
    input/        # Keyboard, gamepad, touch handling
  ui/             # UI components and menus
  utils/          # Math helpers, seeded RNG
public/           # PWA manifest, icons, service worker
```

## License

See repository for license details.
