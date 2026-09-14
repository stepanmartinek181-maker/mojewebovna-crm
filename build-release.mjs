import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
let html=await readFile(new URL('./dist/index-dev.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
if(!scripts.length)throw Error('Ve výsledku chybí vložená aplikace.');
html=html.replace("script-src 'self'",`script-src 'self' ${scripts.join(' ')}`);
await writeFile(new URL('./dist/index.html',import.meta.url),html);
await writeFile(new URL('./index.html',import.meta.url),html);
console.log('Hotový index.html pro GitHub Pages, bez dat zákazníků.');
