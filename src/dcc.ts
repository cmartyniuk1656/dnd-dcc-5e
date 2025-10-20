// DCC - dnd5e Extension
// Foundry v12, dnd5e v3+. Adds flags.dcc.* stats, exposes them as @dcc.*, and an optional sheet subclass with a DCC tab.

const MODULE_ID = "dcc-dnd5e-extension" as const;
const MIGRATION_FLAG = "seeded-0-1-0" as const;

type DccFlags = {
  audience: number; // How loud the crowd screams
  hype: number; // Momentum/edge - fuels advantage
  style: number; // Flashy execution - fuels crit range, social swagger
  grit: number; // Tenacity - fuels temp HP and death saves
  provenance?: "synthesized" | "api";
};

const DEFAULT_DCC: DccFlags = {
  audience: 0,
  hype: 0,
  style: 0,
  grit: 0,
  provenance: "synthesized"
};

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);

  game.settings.register(MODULE_ID, "defaults", {
    name: "Default DCC Flags",
    hint: "Values applied to actors that lack flags.dcc.*",
    scope: "world",
    config: true,
    type: Object,
    default: DEFAULT_DCC
  });

  game.settings.register(MODULE_ID, MIGRATION_FLAG, {
    name: "DCC Flag Seed Complete",
    hint: "Internal flag used to seed DCC defaults on existing actors.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

Hooks.once("ready", async () => {
  console.log(`${MODULE_ID} | ready`);

  // 1) Wrap getRollData so @dcc.* is always available in roll formulas
  //    Requires libWrapper
  // @ts-ignore - libWrapper is injected by module
  libWrapper.register(
    MODULE_ID,
    "CONFIG.Actor.documentClass.prototype.getRollData",
    function (this: Actor, wrapped: (...args: unknown[]) => any, ...args: unknown[]) {
      const data = wrapped.apply(this, args);
      const dccDefaults = getDccDefaults();
      const actorFlags = foundry.utils.getProperty(this, "flags.dcc") ?? {};
      data.dcc = foundry.utils.mergeObject(structuredClone(dccDefaults), actorFlags, { inplace: false });
      return data;
    },
    "WRAPPER"
  );

  // 2) One-time light migration to seed default flags for existing actors
  const hasMigrated = Boolean(game.settings.get(MODULE_ID, MIGRATION_FLAG));
  if (!hasMigrated) {
    const defaults = getDccDefaults();
    for (const actor of game.actors ?? []) {
      if (actor.type !== "character") continue;
      const current = foundry.utils.getProperty(actor, "flags.dcc") ?? {};
      const merged = foundry.utils.mergeObject(structuredClone(defaults), current, { inplace: false });
      if (!foundry.utils.isObjectEqual(current, merged)) {
        await actor.update({ "flags.dcc": merged });
      }
    }
    await game.settings.set(MODULE_ID, MIGRATION_FLAG, true);
  }

  // 3) Register an alternative sheet (optional): CharacterSheetDCC
  Actors.registerSheet("dnd5e", CharacterSheetDCC as any, {
    types: ["character"],
    label: "DCC Character Sheet",
    makeDefault: false
  });
});

// --- Sheet subclass -------------------------------------------------------

class CharacterSheetDCC extends (dnd5e.applications.actor.ActorSheet5eCharacter as any) {
  static override get defaultOptions() {
    const opts = super.defaultOptions;
    opts.classes = [...(opts.classes ?? []), "dcc-sheet"];
    opts.tabs = opts.tabs ?? [];
    return opts;
  }

  /** Extend the dnd5e template with our DCC tab via Handlebars partial */
  override async _renderInner(data: any, options: any) {
    const html = await super._renderInner(data, options);

    const nav = html[0]?.querySelector?.(".sheet-navigation .tabs");
    const body = html[0]?.querySelector?.(".tab-body");
    if (nav && body && !html[0].querySelector("#dcc-tab")) {
      const li = document.createElement("a");
      li.classList.add("item");
      li.dataset.tab = "dcc";
      li.textContent = "DCC";
      nav.appendChild(li);

      const pane = document.createElement("section");
      pane.classList.add("tab", "dcc-pane");
      pane.dataset.tab = "dcc";
      pane.id = "dcc-tab";
      pane.innerHTML = await renderTemplate(`modules/${MODULE_ID}/templates/actor-dcc-tab.hbs`, data);
      body.appendChild(pane);
    }

    return html;
  }

  /** Provide template context that includes @dcc defaults for rendering */
  override getData(options?: any) {
    const context = super.getData(options);
    const actor: Actor = (this as any).actor;
    const defaults = getDccDefaults();
    const actorFlags = foundry.utils.getProperty(actor, "flags.dcc") ?? {};
    const merged = foundry.utils.mergeObject(structuredClone(defaults), actorFlags, { inplace: false });

    context.flags = context.flags ?? {};
    context.flags.dcc = merged;
    context.dcc = merged;
    return context;
  }

  /** Save changes from the DCC tab inputs back into flags.dcc */
  override async _updateObject(event: Event, formData: Record<string, unknown>) {
    const dccUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formData)) {
      if (key.startsWith("flags.dcc.")) {
        dccUpdates[key] = value === "" ? 0 : Number(value);
      }
    }
    if (Object.keys(dccUpdates).length) {
      await (this as any).actor.update(dccUpdates);
    }
    return super._updateObject(event, formData);
  }
}

function getDccDefaults(): DccFlags {
  const stored = (game.settings?.get?.(MODULE_ID, "defaults") ?? {}) as Partial<DccFlags>;
  return foundry.utils.mergeObject(structuredClone(DEFAULT_DCC), stored, { inplace: false });
}
