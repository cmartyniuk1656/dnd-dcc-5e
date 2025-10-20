// src/dcc.ts
var MODULE_ID = "dcc-dnd5e-extension";
var MIGRATION_FLAG = "seeded-0-1-0";
var DEFAULT_DCC = {
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
  libWrapper.register(
    MODULE_ID,
    "CONFIG.Actor.documentClass.prototype.getRollData",
    function(wrapped, ...args) {
      const data = wrapped.apply(this, args);
      const dccDefaults = getDccDefaults();
      const actorFlags = foundry.utils.getProperty(this, "flags.dcc") ?? {};
      data.dcc = foundry.utils.mergeObject(structuredClone(dccDefaults), actorFlags, { inplace: false });
      return data;
    },
    "WRAPPER"
  );
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
  Actors.registerSheet("dnd5e", CharacterSheetDCC, {
    types: ["character"],
    label: "DCC Character Sheet",
    makeDefault: false
  });
});
var CharacterSheetDCC = class extends dnd5e.applications.actor.ActorSheet5eCharacter {
  static get defaultOptions() {
    const opts = super.defaultOptions;
    opts.classes = [...opts.classes ?? [], "dcc-sheet"];
    opts.tabs = opts.tabs ?? [];
    return opts;
  }
  /** Extend the dnd5e template with our DCC tab via Handlebars partial */
  async _renderInner(data, options) {
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
  getData(options) {
    const context = super.getData(options);
    const actor = this.actor;
    const defaults = getDccDefaults();
    const actorFlags = foundry.utils.getProperty(actor, "flags.dcc") ?? {};
    const merged = foundry.utils.mergeObject(structuredClone(defaults), actorFlags, { inplace: false });
    context.flags = context.flags ?? {};
    context.flags.dcc = merged;
    context.dcc = merged;
    return context;
  }
  /** Save changes from the DCC tab inputs back into flags.dcc */
  async _updateObject(event, formData) {
    const dccUpdates = {};
    for (const [key, value] of Object.entries(formData)) {
      if (key.startsWith("flags.dcc.")) {
        dccUpdates[key] = value === "" ? 0 : Number(value);
      }
    }
    if (Object.keys(dccUpdates).length) {
      await this.actor.update(dccUpdates);
    }
    return super._updateObject(event, formData);
  }
};
function getDccDefaults() {
  const stored = game.settings?.get?.(MODULE_ID, "defaults") ?? {};
  return foundry.utils.mergeObject(structuredClone(DEFAULT_DCC), stored, { inplace: false });
}
//# sourceMappingURL=dcc.js.map
