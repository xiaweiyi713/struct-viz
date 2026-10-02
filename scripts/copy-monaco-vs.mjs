// scripts/copy-monaco-vs.mjs
// 构建后把 monaco-editor 的 min/vs 拷贝到 dist/monaco/vs，实现 Monaco 自托管。
// 背景：@monaco-editor/react 默认从 jsdelivr CDN 加载 Monaco，国内访问慢/不稳定，
// 会导致 /sandbox 的编辑器长时间停在"加载编辑器…"甚至失败。自托管后编辑器资源
// 与站点同源，不再依赖任何外部 CDN。
// 注意：不在 git 里提交这 16MB，每次构建时从 node_modules 拷贝。
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "monaco-editor", "min", "vs");
const dest = join(root, "dist", "monaco", "vs");

if (!existsSync(src)) {
  console.error(`[copy-monaco-vs] monaco vs dir missing: ${src}`);
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-monaco-vs] copied to ${dest}`);
