// Module-level registry for tables missing in remote Supabase schema (PGRST205 / 42P01)
const missingTables = new Set();

export function markTableMissing(table) {
  if (table) missingTables.add(table);
}

export function isTableMissing(table) {
  return missingTables.has(table);
}

export function clearMissingTables() {
  missingTables.clear();
}

export function getMissingTables() {
  return Array.from(missingTables);
}
