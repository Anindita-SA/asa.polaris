import { test as it, expect } from 'vitest';
import { parseAITasks, validateEnvironment } from './weekly_audit.js';

it('validateEnvironment checks for required keys', () => {
  // Should throw if missing keys
  expect(() => validateEnvironment({ supabaseUrl: '', supabaseKey: '', groqApiKey: '' })).toThrow(/Missing required/);
  
  // Should not throw if present
  expect(() => validateEnvironment({ 
    supabaseUrl: 'https://test.supabase.co', 
    supabaseKey: 'test-key', 
    groqApiKey: 'test-key' 
  })).not.toThrow();
});

it('parseAITasks strips markdown and parses JSON correctly', () => {
  const validJson = '[{"title": "Task 1", "estimated_minutes": 15}]';
  
  // Test raw JSON
  const parsed1 = parseAITasks(validJson);
  expect(parsed1.length).toBe(1);
  expect(parsed1[0].title).toBe('Task 1');

  // Test markdown block wrapped JSON
  const markdownJson = `
\`\`\`json
  [{"title": "Task 2", "estimated_minutes": 30}]
\`\`\`
  `;
  const parsed2 = parseAITasks(markdownJson);
  expect(parsed2[0].title).toBe('Task 2');

  // Test invalid JSON throws
  expect(() => parseAITasks("Hello world")).toThrow(/Failed to parse/);
});

it('insertTasks filters out existing active tasks with the same title', async () => {
  const { insertTasks } = await import('./weekly_audit.js');

  let insertedRows = [];
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          neq: async () => ({
            data: [{ title: 'Existing Task' }, { title: 'Other Task' }],
            error: null
          })
        })
      }),
      insert: async (data) => {
        insertedRows = data;
        return { error: null };
      }
    })
  };

  const tasksToInsert = [
    { title: 'existing task', notes: 'duplicate' },
    { title: 'New Unique Task', notes: 'new' }
  ];

  const count = await insertTasks(mockSupabase, 'user-123', tasksToInsert);
  expect(count).toBe(1);
  expect(insertedRows.length).toBe(1);
  expect(insertedRows[0].title).toBe('New Unique Task');
});
