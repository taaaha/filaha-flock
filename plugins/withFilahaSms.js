const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.filaha';

const REQUIRED_PERMISSIONS = [
  'android.permission.RECEIVE_SMS',
  'android.permission.READ_SMS',
  'android.permission.SEND_SMS',
  'android.permission.CALL_PHONE',
  'android.permission.VIBRATE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
];

function ensurePermissions(manifest) {
  if (!manifest['uses-permission']) manifest['uses-permission'] = [];
  REQUIRED_PERMISSIONS.forEach((perm) => {
    const exists = manifest['uses-permission'].some(
      (p) => p && p.$ && p.$['android:name'] === perm
    );
    if (!exists) {
      manifest['uses-permission'].push({ $: { 'android:name': perm } });
    }
  });
}

function ensureTelQuery(manifest) {
  // Declare ability to open tel: URIs on Android 11+
  if (!manifest.queries) manifest.queries = [];
  const queries = manifest.queries[0] || {};
  if (!queries.intent) queries.intent = [];

  const hasTelIntent = queries.intent.some((intent) => {
    if (!intent || !intent.data) return false;
    return intent.data.some(
      (d) => d && d.$ && d.$['android:scheme'] === 'tel'
    );
  });

  if (!hasTelIntent) {
    queries.intent.push({
      action: [{ $: { 'android:name': 'android.intent.action.DIAL' } }],
      data: [{ $: { 'android:scheme': 'tel' } }],
    });
  }
  manifest.queries = [queries];
}

function ensureSmsReceiver(application) {
  if (!application.receiver) application.receiver = [];
  const receiverExists = application.receiver.some(
    (r) => r && r.$ && r.$['android:name'] === '.SmsReceiver'
  );
  if (!receiverExists) {
    application.receiver.push({
      $: {
        'android:name': '.SmsReceiver',
        'android:exported': 'true',
        'android:permission': 'android.permission.BROADCAST_SMS',
      },
      'intent-filter': [
        {
          $: { 'android:priority': '999' },
          action: [
            { $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } },
          ],
        },
      ],
    });
  }
}

function withFilahaManifest(config) {
  return withAndroidManifest(config, async (cfg) => {
    const androidManifest = cfg.modResults;
    const manifest = androidManifest.manifest;

    ensurePermissions(manifest);
    ensureTelQuery(manifest);

    if (manifest.application && manifest.application[0]) {
      ensureSmsReceiver(manifest.application[0]);
    }

    return cfg;
  });
}

function injectKotlin(contents) {
  const importLine = 'import com.filaha.SmsPackage';
  if (!contents.includes(importLine)) {
    // Insert after package line
    contents = contents.replace(
      /(^package\s+[\w.]+\s*$)/m,
      `$1\n\n${importLine}`
    );
  }

  const addLine = 'packages.add(SmsPackage())';
  if (!contents.includes('SmsPackage()')) {
    let injected = false;

    // Form A: val packages = PackageList(this).packages ... return packages
    if (/val\s+packages\s*=\s*PackageList\(this\)\.packages/.test(contents)) {
      contents = contents.replace(
        /(val\s+packages\s*=\s*PackageList\(this\)\.packages[^\n]*\n)/,
        `$1              ${addLine}\n`
      );
      injected = true;
    }
    // Form B: PackageList(this).packages.apply { ... }
    else if (/PackageList\(this\)\.packages\.apply\s*\{/.test(contents)) {
      contents = contents.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{)/,
        `$1\n              add(SmsPackage())`
      );
      injected = true;
    }
    // Form C (Expo SDK 50 template): direct `return PackageList(this).packages`
    else if (/return\s+PackageList\(this\)\.packages\b/.test(contents)) {
      contents = contents.replace(
        /([ \t]*)return\s+PackageList\(this\)\.packages\b[^\n]*/,
        (match, indent) =>
          `${indent}val packages = PackageList(this).packages\n${indent}${addLine}\n${indent}return packages`
      );
      injected = true;
    }
    // Form D: a `return packages` line we can prepend to
    else if (/return\s+packages\s*$/m.test(contents)) {
      contents = contents.replace(
        /([ \t]*)return\s+packages\s*$/m,
        (match, indent) =>
          `${indent}${addLine}\n${indent}return packages`
      );
      injected = true;
    }

    if (!injected) {
      throw new Error(
        '[withFilahaSms] Could not find a known getPackages() template ' +
        'in MainApplication.kt to inject SmsPackage(). The native module ' +
        'will NOT be registered. Inspect MainApplication.kt and update the plugin.'
      );
    }
  }
  return contents;
}

function injectJava(contents) {
  const importLine = 'import com.filaha.SmsPackage;';
  if (!contents.includes(importLine)) {
    contents = contents.replace(
      /(package\s+[\w.]+;)/,
      `$1\n${importLine}`
    );
  }
  const addLine = 'packages.add(new SmsPackage());';
  if (!contents.includes('new SmsPackage()')) {
    let injected = false;
    if (/List<ReactPackage>\s+packages\s*=\s*new\s+PackageList\(this\)\.getPackages\(\);/.test(contents)) {
      contents = contents.replace(
        /(List<ReactPackage>\s+packages\s*=\s*new\s+PackageList\(this\)\.getPackages\(\);)/,
        `$1\n              ${addLine}`
      );
      injected = true;
    } else if (/return\s+new\s+PackageList\(this\)\.getPackages\(\)\s*;/.test(contents)) {
      contents = contents.replace(
        /([ \t]*)return\s+new\s+PackageList\(this\)\.getPackages\(\)\s*;/,
        (match, indent) =>
          `${indent}List<ReactPackage> packages = new PackageList(this).getPackages();\n${indent}${addLine}\n${indent}return packages;`
      );
      injected = true;
    } else if (/return\s+packages\s*;/.test(contents)) {
      contents = contents.replace(
        /([ \t]*)return\s+packages\s*;/,
        (match, indent) => `${indent}${addLine}\n${indent}return packages;`
      );
      injected = true;
    }
    if (!injected) {
      throw new Error('[withFilahaSms] Could not inject SmsPackage in MainApplication.java');
    }
  }
  return contents;
}

function withFilahaPackageRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const language = cfg.modResults.language;
    if (language === 'kt') {
      contents = injectKotlin(contents);
    } else {
      contents = injectJava(contents);
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withFilahaJavaFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const targetDir = path.join(
        platformRoot,
        'app',
        'src',
        'main',
        'java',
        ...PACKAGE_NAME.split('.')
      );

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const sourceDir = path.join(projectRoot, 'plugins', 'native-android');
      const files = ['SmsReceiver.java', 'SmsPackage.java'];

      files.forEach((file) => {
        const src = path.join(sourceDir, file);
        const dst = path.join(targetDir, file);
        if (!fs.existsSync(src)) {
          throw new Error(`[withFilahaSms] Missing source: ${src}`);
        }
        const content = fs.readFileSync(src, 'utf8');
        fs.writeFileSync(dst, content);
      });

      return cfg;
    },
  ]);
}

module.exports = function withFilahaSms(config) {
  config = withFilahaManifest(config);
  config = withFilahaPackageRegistration(config);
  config = withFilahaJavaFiles(config);
  return config;
};
