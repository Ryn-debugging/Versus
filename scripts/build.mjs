import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const template = fs.readFileSync(path.join(rootDir, 'src/template.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'src/styles.css'), 'utf8');

const jsOrder = [
    'src/js/audio.js',
    'src/js/data.js',
    'src/js/entities.js',
    'src/js/renderer.js',
    'src/js/main.js'
];

const jsBundle = jsOrder
    .map(rel => {
        const content = fs.readFileSync(path.join(rootDir, rel), 'utf8');
        return `// --- FILE: ${rel} ---\n${content}`;
    })
    .join('\n\n');

const output = template
    .replace('/*__INLINE_CSS__*/', () => css)
    .replace('/*__INLINE_JS__*/', () => jsBundle);

const outPath = path.join(rootDir, 'index.html');
fs.writeFileSync(outPath, output, 'utf8');

const androidWwwDir = path.join(rootDir, 'app/src/main/assets/www');
fs.mkdirSync(androidWwwDir, { recursive: true });
const androidOutPath = path.join(androidWwwDir, 'index.html');
fs.writeFileSync(androidOutPath, output, 'utf8');

const sizeKb = (Buffer.byteLength(output, 'utf8') / 1024).toFixed(1);
console.log(`Built ${outPath} & ${androidOutPath} (${sizeKb} KB, ${output.split('\n').length} lines)`);
