const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync("find src -name '*.js'", { encoding: 'utf8' })
  .trim().split('\n');

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  // Has makeStyles factory (means module-level `styles` doesn't exist anymore)
  if (!c.includes('const makeStyles =') && !c.includes('const makeModalStyles =')) continue;
  // Has no module-level `const styles = StyleSheet.create`
  if (c.match(/^const styles = StyleSheet\.create/m)) continue;

  // Find all function definitions and check if they reference styles. but don't call useStyles
  const fnRegex = /(?:function\s+(\w+)\s*\([^)]*\)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>|const\s+(\w+)\s*=\s*function)\s*\{/g;
  let m;
  while ((m = fnRegex.exec(c)) !== null) {
    const fnName = m[1] || m[2] || m[3];
    const start = m.index + m[0].length;
    // Find matching closing brace
    let depth = 1, end = start;
    while (depth > 0 && end < c.length) {
      const ch = c[end];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      end++;
    }
    const body = c.slice(start, end);
    // Does the function body reference `styles.X` without calling useStyles?
    if (body.match(/\bstyles\./) && !body.match(/useStyles\s*\(/)) {
      console.log(`⚠ ${f}: function "${fnName}" uses styles but does not call useStyles`);
    }
  }
}
console.log('done');
