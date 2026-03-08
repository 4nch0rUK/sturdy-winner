import { mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const webDir = resolve(root, "www");

mkdirSync(webDir, { recursive: true });
copyFileSync(resolve(root, "index.html"), resolve(webDir, "index.html"));
copyFileSync(resolve(root, "app.js"), resolve(webDir, "app.js"));
copyFileSync(resolve(root, "styles.css"), resolve(webDir, "styles.css"));

console.log(`Prepared web assets in ${webDir}`);
