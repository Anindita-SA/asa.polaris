#!/usr/bin/env node
/**
 * Safe Masked Environment Inspector
 *
 * Scans environment files and prints ONLY variable names, lengths, and the last 4 characters.
 * NEVER outputs full secret values.
 *
 * Usage:
 *   node scripts/show_env.js
 *   node scripts/show_env.js .env
 *   node scripts/show_env.js .env.agent
 *   node scripts/show_env.js "E:\secrets\.env"
 */

import fs from 'fs';
import path from 'path';

function maskValue(val) {
  if (val === undefined || val === null || val === '') {
    return '(empty)';
  }

  // Remove surrounding quotes if present
  let cleanVal = val.trim();
  if ((cleanVal.startsWith('"') && cleanVal.endsWith('"')) ||
      (cleanVal.startsWith("'") && cleanVal.endsWith("'"))) {
    cleanVal = cleanVal.slice(1, -1);
  }

  const len = cleanVal.length;
  if (len === 0) {
    return '(empty)';
  }
  if (len <= 4) {
    return `[${len} chars] ****`;
  }
  const suffix = cleanVal.slice(-4);
  return `[${len} chars] ...${suffix}`;
}

function inspectEnvFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  console.log(`\n============================================================`);
  console.log(`Masked Inspection: ${resolvedPath}`);
  console.log(`============================================================`);

  if (!fs.existsSync(resolvedPath)) {
    console.log(`File does not exist: ${resolvedPath}`);
    return;
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    const candidateFiles = ['.env', '.env.agent', '.env.local', 'polaris.env'];
    let foundAny = false;
    for (const cf of candidateFiles) {
      const nested = path.join(resolvedPath, cf);
      if (fs.existsSync(nested) && !fs.statSync(nested).isDirectory()) {
        inspectEnvFile(nested);
        foundAny = true;
      }
    }
    if (!foundAny) {
      console.log(`No .env files found in directory: ${resolvedPath}`);
    }
    return;
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const lines = content.split(/\r?\n/);

  let varCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIdx).trim();
    const rawVal = trimmed.slice(eqIdx + 1);
    const masked = maskValue(rawVal);

    console.log(`  ${key.padEnd(35)} : ${masked}`);
    varCount++;
  }

  console.log(`------------------------------------------------------------`);
  console.log(`Total variables detected: ${varCount} (all values masked)`);
  console.log(`============================================================\n`);
}

function main() {
  const targetArg = process.argv[2];

  if (targetArg) {
    inspectEnvFile(targetArg);
  } else {
    // Default: inspect standard local workspace env files if they exist
    const defaultFiles = ['.env', '.env.agent', '.env.local'];
    let inspectedAny = false;

    for (const f of defaultFiles) {
      const fullPath = path.join(process.cwd(), f);
      if (fs.existsSync(fullPath)) {
        inspectEnvFile(fullPath);
        inspectedAny = true;
      }
    }

    if (!inspectedAny) {
      console.log('No default env files (.env, .env.agent, .env.local) found in current directory.');
    }
  }
}

main();
