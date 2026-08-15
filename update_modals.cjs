const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/components', (filePath) => {
  if (!filePath.endsWith('.jsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const overlayRegex = /className="([^"]*fixed inset-0[^"]*flex[^"]*items-center[^"]*justify-center[^"]*p-4[^"]*)"/g;
  
  content = content.replace(overlayRegex, (match, classes) => {
    if (classes.includes('items-end')) return match;
    
    let newClasses = classes
      .replace(/\bitems-center\b/g, 'items-end md:items-center')
      .replace(/\bp-4\b/g, 'p-0 md:p-4')
    
    changed = true;
    return 'className="' + newClasses + '"';
  });

  const boxRegex = /className="([^"]*(?:rounded-2xl|rounded-xl|rounded-lg)[^"]*max-w-(?:sm|md|lg|xl|2xl|3xl)[^"]*)"/g;
  
  content = content.replace(boxRegex, (match, classes) => {
    if (classes.includes('rounded-b-none')) return match;
    if (classes.includes('fixed inset-0')) return match; 
    
    let newClasses = classes
      .replace(/\brounded-(2xl|xl|lg|md|sm)\b/g, 'rounded-t-2xl rounded-b-none md:rounded-$1')
      .replace(/\bmax-w-(sm|md|lg|xl|2xl|3xl)\b/g, 'w-full max-w-full md:max-w-$1');
      
    changed = true;
    return 'className="' + newClasses + '"';
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
});
