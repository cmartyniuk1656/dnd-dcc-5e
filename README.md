# DCC - dnd5e Extension (Foundry VTT v12)

> **Status:** Scaffold-first. This module wires in custom DCC (Dungeon Crawler Carl) stats for the dnd5e system without locking in specific mechanics.

## What is this?

* Adds a safe, namespaced home under `flags.dcc.*` on actors.
* Injects those values into roll formulas as `@dcc.*` via a `getRollData` wrapper (using libWrapper).
* Optionally registers a character sheet subclass that appends a DCC tab with configurable inputs.

No dnd5e system schema is replaced; this module extends the sheet and roll data layer.

## Requirements

* Foundry VTT v12
* dnd5e system v3+
* libWrapper module (dependency)

## Install (local dev)

1. Locate your Foundry Data directory.
   * Windows: `%LOCALAPPDATA%/FoundryVTT/Data/modules/`
   * macOS: `~/Library/Application Support/FoundryVTT/Data/modules/`
   * Linux: `~/.local/share/FoundryVTT/Data/modules/`
2. Create a folder `dcc-dnd5e-extension` and copy this repo so the structure looks like:

   ```
   dcc-dnd5e-extension/
   |- module.json
   |- dist/
   |  |- dcc.js           # compiled bundle
   |- templates/
   |  |- actor-dcc-tab.hbs
   |- styles/
   |  |- dcc.css
   \- src/
      |- dcc.ts
   ```

3. In Foundry, open your World, choose Manage Modules, enable libWrapper and DCC - dnd5e Extension.

## Quick Start

1. (Optional) On a character sheet choose Configure Sheet -> DCC Character Sheet to enable the extra tab.
2. Add values under `flags.dcc.*` from the sheet tab, Active Effects, or scripts. They are exposed to formula strings as `@dcc.*`.
3. Example Active Effect:
   * Key: `system.bonuses.mwak.damage`
   * Mode: `ADD`
   * Value: `+ floor(@dcc.hype / 2)`

## Development

This repo ships with a TypeScript + esbuild toolchain.

```
npm install
npm run build     # one-off build to dist/dcc.js
npm run watch     # rebuild on changes (JS + CSS)
```

`npm run watch` keeps esbuild running and also copies `src/dcc.css` into `styles/dcc.css` when it changes.

### Packaging for testing

1. Run `npm run build` to refresh `dist/`, `styles/`, and generate `dcc-dnd5e-extension.zip`.
2. Upload `dcc-dnd5e-extension.zip` (contains `module.json`, `dist/`, `styles/`, `templates/`) to your Foundry server.
3. Unzip it under `FoundryVTT/Data/modules`, then enable in Foundry.

## Extending

The module merges `flags.dcc` into roll data and the optional sheet.

1. Data: add keys under `actor.flags.dcc`. Example console snippet:

   ```js
   const actor = canvas.tokens.controlled[0]?.actor;
   actor?.update({ "flags.dcc.hype": 2 });
   ```

2. UI: add fields to `templates/actor-dcc-tab.hbs` with `name="flags.dcc.yourKey"`.
3. Formulas: reference stats as `@dcc.yourKey` in any dnd5e roll expression.

## Troubleshooting

* Module missing -> verify folder structure and that `dist/dcc.js` exists.
* `@dcc.*` unknown -> ensure libWrapper is active.
* DCC tab missing -> switch the actor to DCC Character Sheet.
* Values not persisting -> confirm your input names start with `flags.dcc.`.

## Repository Layout

```
/dist/      Compiled JS bundle consumed by Foundry
/src/       TypeScript source
/templates/ Handlebars partials for sheet content
/styles/    Distributed CSS (copied from src/dcc.css)
```

## License

This project still needs a license before public release (MIT is a common Foundry default).

## Credits

* Built for Foundry VTT v12 and the dnd5e system v3+.
* Uses libWrapper for safe method wrapping.
