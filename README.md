# RED — Realm of Eternal Dragons

**The Forgotten Valley** is the first playable milestone: a procedural, single-player 3D fantasy exploration prototype built with TypeScript, Three.js, Vite, and Rapier 3D.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Production output is generated in `dist`:

```sh
npm run build
npm run preview
```

## Controls

### Keyboard and mouse

- **WASD** — move; **hold and drag the mouse** — look around
- **Shift** — sprint; **Space** — jump; **B** — block
- **Click** — sword attack; **E** — interact/tame a weakened wolf
- **V** — switch first-/third-person camera
- **Q** — summon or dismiss Spirit of the Wolf
- **I** — inventory

### Touch screens

Use the on-screen joystick and action buttons. Drag anywhere outside the controls to look around. The camera, jump, block, attack, interact, spirit, and sprint actions are available from the touch HUD.

## What is playable

- A locally generated valley with mountainous borders, forest, rocks, a river, Elderwatch Ruins, and Mossfall Cave.
- Third- and first-person cameras driving the same Rapier character controller.
- Four starting races with distinct base attributes.
- Wolves that pursue and attack, deer that flee, and territorial bears that attack nearby players.
- Sword damage, blocking, health/death/respawn, creature loot, XP, levels, a basic inventory, wolf taming/following, and a timed spectral wolf ability.
- IndexedDB local saves for character progression, inventory, equipment, companions, and discovered landmarks.

Creature visuals, character appearance, and animation are procedural placeholders; there are no imported character/creature models, skeletal animation clips, equipment management, detailed quests, multiplayer, or a full RPG content set in this milestone. The spirit ability is combat-ready but has no separate progression UI yet. The cave is an explorable landmark entrance, not a finished dungeon.

## GitHub Pages

The Vite `base: './'` setting makes generated asset URLs relative, including when published under a project path such as `https://<user>.github.io/RED/`. The workflow at `.github/workflows/deploy.yml` builds and deploys `main` to GitHub Pages. Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository; subsequent pushes to `main` publish the site.

## Architecture

```text
src/
  core/       input, procedural assets, save storage, shared game types
  creatures/  creature models, AI, combat and companion/spirit behavior
  game/       application setup and game loop
  player/     player controller and switchable camera
  ui/         character selection, HUD, inventory, touch controls
  world/      procedural Forgotten Valley and static physics geometry
```

Saves use IndexedDB database `red-forgotten-valley`, store `saves`, and version `1`. Keep version-specific migrations in `src/core/SaveManager.ts` when the persisted data shape changes.
