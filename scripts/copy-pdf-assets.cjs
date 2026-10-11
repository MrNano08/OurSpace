const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.dirname(require.resolve('pdfjs-dist/package.json',{paths:[path.join(root,'frontend')]}));
for(const folder of ['cmaps','standard_fonts','wasm']){const target=path.join(root,'frontend/public/pdfjs',folder);fs.mkdirSync(target,{recursive:true});for(const entry of fs.readdirSync(path.join(source,folder))){if(entry.startsWith('quickjs'))continue;fs.copyFileSync(path.join(source,folder,entry),path.join(target,entry));}}
