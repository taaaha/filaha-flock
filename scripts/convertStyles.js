/**
 * Convert files using `const styles = StyleSheet.create({...})` (module-level)
 * to the `useStyles(makeStyles)` pattern so they respond to theme changes.
 *
 * - Adds the useStyles import if absent.
 * - Replaces `const styles = StyleSheet.create({` with `const makeStyles = () => ({`.
 * - Inserts `const styles = useStyles(makeStyles);` at the top of each component
 *   function (default-exported function declaration or `export default function`).
 *
 * Idempotent — running twice is a no-op.
 */
const fs = require('fs');
const path = require('path');

const TARGETS = [
  'src/components/AlertItem.js',
  'src/components/BatteryBar.js',
  'src/components/SensorTile.js',
  'src/components/TrendChart.js',
  'src/screens/CoopDetailScreen.js',
  'src/screens/AlertsScreen.js',
  'src/screens/OnboardingScreen.js',
];

for (const file of TARGETS) {
  if (!fs.existsSync(file)) { console.log('skip (missing):', file); continue; }
  let c = fs.readFileSync(file, 'utf8');

  if (c.includes('const makeStyles =')) {
    console.log('skip (already converted):', file);
    continue;
  }

  // 1) Add useStyles import after colors import (or after first React import)
  if (!c.includes("from '../utils/useStyles'")) {
    if (c.match(/import\s+\{[^}]*colors[^}]*\}\s+from\s+'\.\.\/utils\/colors'/)) {
      c = c.replace(
        /(import\s+\{[^}]*colors[^}]*\}\s+from\s+'\.\.\/utils\/colors';)/,
        `$1\nimport { useStyles } from '../utils/useStyles';`
      );
    } else {
      // fallback: prepend
      c = `import { useStyles } from '../utils/useStyles';\n` + c;
    }
  }

  // 2) Replace `const styles = StyleSheet.create({` with factory
  c = c.replace(/^const styles = StyleSheet\.create\(\{/m, 'const makeStyles = () => ({');

  // 3) Find closing `});` matching that — easy: find the last `});` in the file
  // The replacement converts:  `})` to close arrow function body
  // The original last `});` was the StyleSheet.create() call closing — now the arrow
  // function's closing parenthesis. The structure works without modification because
  // `() => ({...})` ends with `})`, same as the original `StyleSheet.create({...})`.

  // 4) Inject `const styles = useStyles(makeStyles);` at the start of each component fn
  // Find `export default function Name(props) {` OR plain `function Name(props) {`
  // that returns JSX (heuristic: contains `<` in body).
  // For simplicity, target the FIRST `export default function ... {` and inject after it.
  const expDefMatch = c.match(/(export default function\s+\w+\s*\([^)]*\)\s*\{)/);
  if (expDefMatch && !c.includes('const styles = useStyles(makeStyles)')) {
    c = c.replace(expDefMatch[1], `${expDefMatch[1]}\n  const styles = useStyles(makeStyles);`);
  } else if (!c.includes('const styles = useStyles(makeStyles)')) {
    // Try non-export named function (component-style)
    const fnMatch = c.match(/(\nfunction\s+\w+\s*\([^)]*\)\s*\{)/);
    if (fnMatch) {
      c = c.replace(fnMatch[1], `${fnMatch[1]}\n  const styles = useStyles(makeStyles);`);
    }
  }

  fs.writeFileSync(file, c);
  console.log('converted:', file);
}

console.log('done');
