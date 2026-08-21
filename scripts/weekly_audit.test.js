import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAITasks, validateEnvironment } from './weekly_audit.js';

test('validateEnvironment checks for required keys', () => {
  // Should throw if missing keys
  assert.throws(() => validateEnvironment({ supabaseUrl: '', supabaseKey: '', groqApiKey: '' }), /Missing required/);
  
  // Should not throw if present
  assert.doesNotThrow(() => validateEnvironment({ 
    supabaseUrl: 'https://test.supabase.co', 
    supabaseKey: 'test-key', 
    groqApiKey: 'test-key' 
  }));
});

test('parseAITasks strips markdown and parses JSON correctly', () => {
  const validJson = '[{"title": "Task 1", "estimated_minutes": 15}]';
  
  // Test raw JSON
  const parsed1 = parseAITasks(validJson);
  assert.equal(parsed1.length, 1);
  assert.equal(parsed1[0].title, 'Task 1');

  // Test markdown block wrapped JSON
  const markdownJson = `
\`\`\`json
  [{"title": "Task 2", "estimated_minutes": 30}]
\`\`\`
  `;
  const parsed2 = parseAITasks(markdownJson);
  assert.equal(parsed2[0].title, 'Task 2');

  // Test invalid JSON throws
  assert.throws(() => parseAITasks("Hello world"), /Failed to parse/);
});
