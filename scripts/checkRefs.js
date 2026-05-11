const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find src App.js -name "*.js" -type f', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

const builtIn = new Set([
  'StyleSheet','View','Text','Pressable','Modal','ScrollView','FlatList','TextInput',
  'Animated','StatusBar','SafeAreaView','Platform','Alert','Linking','NativeModules',
  'Vibration','Image','KeyboardAvoidingView','ActivityIndicator','TouchableOpacity',
  'DeviceEventEmitter','PermissionsAndroid','I18nManager',
  'Promise','Date','Math','Array','Object','JSON','String','Number','Set','Map',
  'React','Component','Fragment','NaN','Infinity','Error','RegExp','Symbol',
  'AsyncStorage','Buffer','undefined','null','true','false','Easing','Dimensions',
]);

let issues = 0;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const importBlock = c.match(/^(?:[^]*?^)(?=(?:const|function|export|class|let|var)\s)/m);
  const splitIdx = importBlock ? importBlock[0].length : 0;
  const head = c.slice(0, splitIdx);
  const body = c.slice(splitIdx);

  const declared = new Set(builtIn);
  // Imports
  for (const m of head.matchAll(/import\s+([\w*\s,{}]+)\s+from/g)) {
    const part = m[1];
    if (part.includes('{')) {
      const named = part.match(/\{([^}]+)\}/);
      if (named) {
        named[1].split(',').map(s => s.trim().replace(/.*\s+as\s+/, '')).forEach(n => declared.add(n));
      }
      const def = part.split(/[,{]/)[0].trim();
      if (def && /^\w+$/.test(def)) declared.add(def);
    } else {
      declared.add(part.trim());
    }
  }

  // Local declarations in body
  for (const m of body.matchAll(/(?:const|let|var|function|class)\s+(\w+)/g)) declared.add(m[1]);
  for (const m of body.matchAll(/export\s+(?:default\s+)?function\s+(\w+)/g)) declared.add(m[1]);
  for (const m of body.matchAll(/function\s+(\w+)/g)) declared.add(m[1]);

  // Find PascalCase identifier usage in body
  const usages = new Set();
  for (const m of body.matchAll(/<([A-Z][\w]*)\b/g)) usages.add(m[1]); // JSX <Name>
  for (const m of body.matchAll(/\b([A-Z][a-zA-Z]+)\s*\(/g)) usages.add(m[1]); // Function call
  for (const m of body.matchAll(/\b([A-Z][a-zA-Z]+)\.\w+/g)) usages.add(m[1]); // X.foo

  const missing = [...usages].filter(n => !declared.has(n) && !builtIn.has(n));
  if (missing.length) {
    console.log('ISSUES in', f);
    missing.slice(0, 8).forEach(m => console.log('  ', m));
    issues += missing.length;
  }
}
if (issues === 0) console.log('No undefined PascalCase references found.');
else console.log('Total potential issues:', issues);
