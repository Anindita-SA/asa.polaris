import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, 'src')

function walkAndReplace(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      walkAndReplace(filePath)
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf-8')
      if (content.includes('—')) {
        content = content.replace(/—/g, '-')
        fs.writeFileSync(filePath, content)
        console.log('Replaced in', file)
      }
    }
  }
}

walkAndReplace(srcDir)
