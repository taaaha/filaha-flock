/**
 * Finds hardcoded user-facing English strings that aren't going through t().
 * Heuristic: JSX text nodes and common string props containing 2+ English
 * words, excluding obvious non-UI (keys, icon names, style values, console).
 */
const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find src -name "*.js"', { encoding: 'utf8' })
  .trim().split('\n')
  .filter((f) => !f.includes('/translations/') && !f.includes('poultryData') &&
                 !f.includes('guideContent') && !f.includes('actionSteps'));

const ENGLISH = /[A-Za-z]{2,}\s+[A-Za-z]{2,}/; // 2+ words
const SKIP = /(console\.|require\(|import |from ['"]|StyleSheet|useStyles|__DEV__|\.test\(|RegExp|fontFamily|backgroundColor|borderColor|\bhttps?:)/;

let total = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    if (SKIP.test(ln)) return;
    // JSX text node: >English words<
    const jsxText = ln.match(/>\s*([A-Z][A-Za-z][^<>{}]*[A-Za-z])\s*</);
    // String literal that looks like a sentence (has a space + letters), not a key
    const strLit = ln.match(/['"]([A-Z][a-z]+(?:\s+[A-Za-z][a-z]+){1,}[^'"]*)['"]/);
    let candidate = null;
    if (jsxText && ENGLISH.test(jsxText[1])) candidate = jsxText[1].trim();
    else if (strLit && ENGLISH.test(strLit[1]) && !ln.includes('t(') ) candidate = strLit[1].trim();
    // ignore if line already calls t(
    if (candidate && !/\bt\(/.test(ln)) {
      hits.push(`  L${i + 1}: ${candidate.slice(0, 60)}`);
    }
  });
  if (hits.length) {
    console.log(f);
    hits.slice(0, 12).forEach((h) => console.log(h));
    total += hits.length;
  }
}
console.log('\nTotal suspect lines:', total);
