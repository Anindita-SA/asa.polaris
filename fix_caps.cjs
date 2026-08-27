const fs = require('fs');
const path = require('path');

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase());
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const regex = />([^<a-z]+)</g;
  
  content = content.replace(regex, (match, p1) => {
    if (/[A-Z]/.test(p1) && !/[a-z]/.test(p1)) {
        const leading = p1.match(/^\s*/)[0];
        const trailing = p1.match(/\s*$/)[0];
        const core = p1.trim();
        
        if (core.length < 3 && core !== 'AM' && core !== 'PM') return match;
        
        const skip = ['URL', 'API', 'HUD', 'IO', 'ID'];
        if (skip.includes(core)) return match;

        let tc = toTitleCase(core);
        return '>' + leading + tc + trailing + '<';
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(processFile);
console.log('Done');
