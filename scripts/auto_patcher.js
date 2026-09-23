import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { generateWithFallbackNode } from './lib/llm_utils.js';

// Strip comments and collapse blank lines to reduce token count
function minifySource(code) {
  return code
    .replace(/\/\/.*$/gm, '')           // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/^\s*\n/gm, '\n')         // collapse blank lines
    .replace(/\n{3,}/g, '\n\n')        // max 2 consecutive newlines
    .trim();
}

// Extract only the useful bits from an error object
function compactError(err) {
  if (!err) return 'unknown error';
  const msg = err.message || err.msg || String(err);
  const status = err.status || err.context?.status || '';
  return status ? `${status}: ${msg}` : msg;
}

async function invokeAndPatch(functionName) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or URL in env');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    console.log(`[${functionName}] Attempt ${attempt}...`);
    const { data, error } = await supabase.functions.invoke(functionName, { body: { force: true } });

    if (!error) {
      console.log(`[${functionName}] OK`);
      return true;
    }

    const errStr = compactError(error);
    console.error(`[${functionName}] Failed: ${errStr}`);

    if (attempt > MAX_RETRIES) {
      console.error(`[${functionName}] Max retries exhausted.`);
      return false;
    }

    const indexPath = path.join(process.cwd(), 'supabase', 'functions', functionName, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      console.error(`[${functionName}] Source not found: ${indexPath}`);
      return false;
    }

    const rawCode = fs.readFileSync(indexPath, 'utf-8');
    const code = minifySource(rawCode);

    // Single-shot: diagnose + patch in one call to minimize token round-trips
    const prompt = `Fix this Supabase Edge Function. Error: ${errStr}
Source:
${code}

Reply with ONLY the fixed TypeScript code. No markdown fences, no explanation.`;

    // Estimate output cap: source tokens + 20% margin
    const estimatedTokens = Math.min(Math.ceil(code.length / 3) + 512, 4096);

    const patched = await generateWithFallbackNode(prompt, null, null, {
      asJson: false,
      preferredModel: 'gemini-3.1-flash-lite',
      maxOutputTokens: estimatedTokens
    });

    if (!patched || patched.length < 50) {
      console.error(`[${functionName}] Patch too short, skipping.`);
      return false;
    }

    fs.writeFileSync(indexPath, patched.trim());
    console.log(`[${functionName}] Patched. Deploying...`);

    try {
      execSync(`npx supabase functions deploy ${functionName}`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`[${functionName}] Deploy failed.`);
    }
  }
}

async function run() {
  try {
    await invokeAndPatch('generate-morning-brief');
    await invokeAndPatch('scout-opportunities');
    console.log('Auto-patcher done.');
  } catch (err) {
    console.error('Auto-patcher error:', err);
    process.exit(1);
  }
}

run();
