const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        scanDir(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('revalidatePath') && !content.includes('import { revalidatePath } from \'next/cache\'') && !content.includes('import { revalidatePath } from "next/cache"')) {
        console.log(fullPath);
      }
    }
  });
}

scanDir(path.join(process.cwd(), 'app'));
