// Checks every quoted segment in provisions.js against the source text files.
const fs = require("fs"), path = require("path");
const { PROVISIONS } = require("./provisions.js");
const dir = process.argv[2];
if (!dir) { console.log('Usage: node verify-provisions.js "<folder with the source .txt files>"'); process.exit(1); }
const files = { act: "Act 378 (online 2026).txt", pua53: "PUA53-54.txt", pua448: "PUA448.txt", pua449: "PUA449.txt",
  pua178: "pua 178.txt", pua420: "PUA_420_2007_BM.txt", pua428: "PUA 428.txt", pua258: "PUA_258_2012.txt", budget: "tax-measures.txt", fa2024: "FA 2024.txt", fa2025: "FA 2025.txt" };
const norm = (s) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, "-")
  .replace(/\*/g, "").replace(/\s+/g, " ").trim();
const cache = {};
const text = (k) => (cache[k] ??= norm(fs.readFileSync(path.join(dir, files[k]), "utf8")));
const words = (s) => norm(s).toLowerCase().replace(/[^a-z0-9.,()%]+/g, " ").split(" ").filter(Boolean);
let bad = 0, n = 0, t = 0;
for (const [id, p] of Object.entries(PROVISIONS)) {
  for (const seg of p.body) {
    const src = seg.src || p.src; if (!src) continue;
    if (seg.q) { n++; if (!text(src).includes(norm(seg.q))) { bad++; console.log("MISS q", id, "::", seg.q.slice(0, 90)); } }
    if (seg.tbl) { t++; // words must appear in order within a window
      const w = words(seg.tbl.replace(/→/g, " ")).filter(x => !/^(or|both|and|the|of|for|:|\.)$/.test(x));
      const src_w = words(text(src)); let ok = false;
      for (let i = 0; i < src_w.length && !ok; i++) { if (src_w[i] !== w[0]) continue; let j = 0, k = i;
        while (k < src_w.length && k < i + w.length * 15 && j < w.length) { if (src_w[k] === w[j]) j++; k++; }
        if (j === w.length) ok = true; }
      if (!ok) { console.log("CHECK tbl", id, "::", seg.tbl.slice(0, 90)); }
    }
  }
}
console.log(`quotes: ${n - bad}/${n} exact; table segments: ${t} (word-order check above)`);
if (bad) process.exitCode = 1;
