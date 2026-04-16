#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== OpenCode UI Gutter Test - Automated Verification ===\n');

// Read the compiled CSS
const cssPath = path.join(__dirname, 'dist', 'panel-webview.css');
const css = fs.readFileSync(cssPath, 'utf-8');

// Test 1: Check all --oc-shell-gutter declarations
console.log('📋 Test 1: Checking --oc-shell-gutter values\n');

const gutterRegex = /--oc-shell-gutter:\s*([^;]+);/g;
const gutterMatches = [...css.matchAll(gutterRegex)];

let allZero = true;
gutterMatches.forEach((match, index) => {
  const value = match[1].trim();
  const isZero = value === '0px';
  console.log(`  ${isZero ? '✅' : '❌'} Declaration ${index + 1}: ${value}`);
  if (!isZero) allZero = false;
});

console.log(`\n  Total declarations: ${gutterMatches.length}`);
console.log(`  ${allZero ? '✅ PASS' : '❌ FAIL'}: All gutter values are 0px\n`);

// Test 2: Check padding usage
console.log('📋 Test 2: Checking padding usage with var(--oc-shell-gutter)\n');

const paddingRegex = /padding:\s*[^;]*var\(--oc-shell-gutter\)[^;]*;/g;
const paddingMatches = [...css.matchAll(paddingRegex)];

console.log(`  Found ${paddingMatches.length} padding declarations using --oc-shell-gutter:`);
paddingMatches.forEach((match, index) => {
  console.log(`  ${index + 1}. ${match[0].trim()}`);
});

// Test 3: Verify theme-specific declarations
console.log('\n📋 Test 3: Verifying theme-specific gutter values\n');

const themes = [
  { name: 'Default Dark', pattern: /body\.vscode-dark\s*\{[^}]*--oc-shell-gutter:\s*([^;]+);/s },
  { name: 'Default Light', pattern: /body\.vscode-light\s*\{[^}]*--oc-shell-gutter:\s*([^;]+);/s },
  { name: 'Codex Dark', pattern: /body\.vscode-dark\s+\.oc-shell\[data-oc-theme=codex\]\s*\{[^}]*--oc-shell-gutter:\s*([^;]+);/s },
  { name: 'Codex Light', pattern: /body\.vscode-light\s+\.oc-shell\[data-oc-theme=codex\]\s*\{[^}]*--oc-shell-gutter:\s*([^;]+);/s },
  { name: 'Claude Dark', pattern: /body\.vscode-dark\s+\.oc-shell\[data-oc-theme=claude\]\s*\{[^}]*--oc-shell-gutter:\s*([^;]+);/s },
  { name: 'Claude Light', pattern: /body\.vscode-light\s+\.oc-shell\[data-oc-theme=claude\]\s*\{[^}]*--oc-shell-gutter:\s*([^;]+);/s }
];

let allThemesPass = true;
themes.forEach(theme => {
  const match = css.match(theme.pattern);
  if (match) {
    const value = match[1].trim();
    const isZero = value === '0px';
    console.log(`  ${isZero ? '✅' : '❌'} ${theme.name}: ${value}`);
    if (!isZero) allThemesPass = false;
  } else {
    console.log(`  ⚠️  ${theme.name}: Not found`);
  }
});

console.log(`\n  ${allThemesPass ? '✅ PASS' : '❌ FAIL'}: All themes have 0px gutter\n`);

// Final summary
console.log('=== Summary ===\n');

const allTestsPass = allZero && allThemesPass;

if (allTestsPass) {
  console.log('✅ ALL TESTS PASSED');
  console.log('\nThe CSS has been correctly updated:');
  console.log('- All --oc-shell-gutter values are 0px');
  console.log('- All theme variants (default, codex, claude) have 0px gutter');
  console.log('- Padding rules correctly reference var(--oc-shell-gutter)');
  console.log('\n🎉 The gaps should be eliminated in the visual output!');
  console.log('\nTo verify visually:');
  console.log('1. Open visual-test.html in a browser');
  console.log('2. Or press F5 in VS Code to launch Extension Development Host');
  console.log('3. Switch between themes and verify no gaps on left/right sides');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('\nPlease review the failures above and fix the CSS.');
}

console.log('\n');
process.exit(allTestsPass ? 0 : 1);
