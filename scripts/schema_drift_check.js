import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const SCHEMA_FILE = path.join(ROOT_DIR, 'docs', 'DATABASE_SCHEMA.md');
const SRC_DIR = path.join(ROOT_DIR, 'src');

/**
 * Parses the markdown schema document into a dictionary.
 * Format: { table_name: ['col1', 'col2'] }
 */
function parseSchema() {
  const schema = {};
  let currentTable = null;
  
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`Schema file not found at ${SCHEMA_FILE}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(SCHEMA_FILE, 'utf-8').split('\n');
  for (const line of lines) {
    const tableMatch = line.match(/^## Table `([^`]+)`/);
    if (tableMatch) {
      currentTable = tableMatch[1];
      schema[currentTable] = [];
    } else if (line.startsWith('## ') && !tableMatch) {
      // Non-table heading (e.g. "## Storage Buckets") - stop adding columns
      currentTable = null;
    } else if (currentTable && line.startsWith('| `')) {
      const colMatch = line.match(/^\| `([^`]+)`/);
      if (colMatch) {
        schema[currentTable].push(colMatch[1]);
      }
    } else if (!currentTable && line.startsWith('| `')) {
      // Storage bucket rows: | `bucket-name` | description |
      const bucketMatch = line.match(/^\| `([^`]+)`/);
      if (bucketMatch) {
        schema[bucketMatch[1]] = [];
      }
    }
  }
  return schema;
}

/**
 * Recursively find all JS and JSX files in a directory.
 */
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walkDir(path.join(dir, file), fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

/**
 * Scans files for Supabase usage and checks against the schema.
 */
function checkSchemaDrift() {
  const schema = parseSchema();
  const files = walkDir(SRC_DIR);
  
  let errorsFound = 0;
  let warningsFound = 0;

  console.log(`\n🔍 Starting Polaris Health Check (Scanning ${files.length} files)\n`);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Find all table names referenced in supabase.from('...')
    const fromRegex = /\.from\(['"`]([^'"`]+)['"`]\)/g;
    let match;
    const referencedTables = new Set();
    
    while ((match = fromRegex.exec(content)) !== null) {
      referencedTables.add(match[1]);
    }

    const relativePath = path.relative(ROOT_DIR, file);

    for (const table of referencedTables) {
      // 1. Check if table exists in schema
      if (!schema[table]) {
        console.error(`❌ ERROR in ${relativePath}: Query references table '${table}', but it does not exist in database_sup.md`);
        errorsFound++;
        continue;
      }

      // 2. Check for missing user_id filter (Heuristic)
      // If the table HAS a user_id column in the schema, the file invoking the query MUST reference user_id
      if (schema[table].includes('user_id')) {
        const hasUserIdReference = content.includes('user_id') || content.includes('userId');
        if (!hasUserIdReference) {
          console.warn(`⚠️  WARNING in ${relativePath}: Queries table '${table}' which has a user_id column, but 'user_id' is not filtered in this file. (Potential RLS/data leak)`);
          warningsFound++;
        }
      }
    }
  }

  console.log(`\nHealth Check Complete!`);
  console.log(`Errors: ${errorsFound} (Schema Mismatches)`);
  console.log(`Warnings: ${warningsFound} (Missing user_id filters)`);

  if (errorsFound > 0) {
    process.exit(1); // Fail CI if there are hard errors
  }
}

checkSchemaDrift();
