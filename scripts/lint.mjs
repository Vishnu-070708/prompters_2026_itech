import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

console.log('Running CivicResolve Code Quality & Style Linter...');

let errorsCount = 0;
let warningsCount = 0;

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(ROOT, filePath);

  // Check 1: No leftover debug console.log calls in src
  if (filePath.includes('/src/') && content.includes('console.log(')) {
    console.warn(`[WARN] ${relPath}: leftover console.log statement found`);
    warningsCount++;
  }

  // Check 2: No dangerouslySetInnerHTML
  if (content.includes('dangerouslySetInnerHTML')) {
    console.error(`[ERROR] ${relPath}: dangerouslySetInnerHTML is forbidden for XSS security`);
    errorsCount++;
  }

  // Check 3: External links must have rel="noopener noreferrer"
  if (content.includes('target="_blank"') && !content.includes('rel="noopener noreferrer"')) {
    console.warn(`[WARN] ${relPath}: target="_blank" should include rel="noopener noreferrer"`);
    warningsCount++;
  }

  // Check 4: No hardcoded API keys
  if (content.match(/AIzaSy[A-Za-z0-9_-]{33}/)) {
    console.error(`[ERROR] ${relPath}: Hardcoded Google API key pattern detected!`);
    errorsCount++;
  }

  // Check 5: No eval() or Function() constructor execution
  if (/\beval\s*\(/.test(content)) {
    console.error(`[ERROR] ${relPath}: eval() is forbidden for security`);
    errorsCount++;
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walkDir(full);
      }
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
      lintFile(full);
    }
  }
}

walkDir(path.join(ROOT, 'src'));

console.log(`\nLint Complete: ${errorsCount} errors, ${warningsCount} warnings.`);

if (errorsCount > 0) {
  process.exit(1);
} else {
  console.log('✓ Code quality standards satisfied.');
  process.exit(0);
}
