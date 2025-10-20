import * as esbuild from "esbuild";
import archiver from "archiver";
import { createWriteStream, constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const watchMode = process.argv.includes("--watch");
const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const stylesDir = path.join(projectRoot, "styles");
const cssSource = path.join(projectRoot, "src", "dcc.css");
const cssTarget = path.join(stylesDir, "dcc.css");
const zipTarget = path.join(projectRoot, "dcc-dnd5e-extension.zip");

async function buildScript() {
  const context = await esbuild.context({
    entryPoints: ["src/dcc.ts"],
    bundle: true,
    format: "esm",
    sourcemap: true,
    target: "es2022",
    outfile: "dist/dcc.js",
    logLevel: "info"
  });

  await context.rebuild();
  return context;
}

async function copyCss() {
  await mkdir(stylesDir, { recursive: true });
  await copyFile(cssSource, cssTarget);
  console.log(`Copied ${path.relative(projectRoot, cssSource)} -> ${path.relative(projectRoot, cssTarget)}`);
}

async function pathExists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function packageModule() {
  const output = createWriteStream(zipTarget);
  const archive = archiver("zip", { zlib: { level: 9 } });

  const entries = [
    { type: "file", source: path.join(projectRoot, "module.json"), dest: "module.json" },
    { type: "dir", source: distDir, dest: "dist" },
    { type: "dir", source: stylesDir, dest: "styles" },
    { type: "dir", source: path.join(projectRoot, "templates"), dest: "templates" }
  ];

  const existing = [];
  for (const entry of entries) {
    if (await pathExists(entry.source)) existing.push(entry);
  }

  if (!existing.length) {
    console.warn("No distributable assets found to package.");
    return;
  }

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      console.log(`Packaged ${zipTarget} (${archive.pointer()} bytes)`);
      resolve();
    });
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    for (const entry of existing) {
      if (entry.type === "file") {
        archive.file(entry.source, { name: entry.dest });
      } else {
        archive.directory(entry.source + "/", entry.dest);
      }
    }
    archive.finalize();
  });
}

async function main() {
  await mkdir(distDir, { recursive: true });
  const context = await buildScript();
  await copyCss();
  await packageModule();

  if (watchMode) {
    console.log("Watching for changes...");
    await context.watch({
      async onRebuild(error) {
        if (error) {
          console.error("Build failed:", error);
          return;
        }
        try {
          await copyCss();
          await packageModule();
        } catch (err) {
          console.error("Post-build step failed:", err);
        }
      }
    });

    const watcher = (await import("node:fs")).watch;
    watcher(cssSource, async (eventType) => {
      if (eventType !== "change") return;
      try {
        await copyCss();
        await packageModule();
      } catch (err) {
        console.error("Failed to process CSS change:", err);
      }
    });
  } else {
    await context.dispose();
    console.log("Build complete.");
  }

  return context;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
