import { test as it, expect } from 'vitest';
import { parseAITasks, validateEnvironment, generateHeuristicAuditTasks, insertTasks } from './weekly_audit.js';

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

it('generateHeuristicAuditTasks ignores missing meal cost and flags egg protein > 12g with category polaris', () => {
  // Meal with missing cost should NOT trigger an anomaly
  const mealsMissingCost = [
    { meal_description: 'Oatmeal with berries', protein_g: 6, cost: null },
    { name: 'Rice and chicken', protein: 25, cost: '' },
    { description: 'Salad bowl', protein: 5 }
  ];
  const noAnomalyTasks = generateHeuristicAuditTasks([], mealsMissingCost);
  expect(noAnomalyTasks).toEqual([]);

  // Meal with egg and protein > 12g should trigger an anomaly with category polaris
  const mealsWithEggAnomaly = [
    { meal_description: '2 Boiled Eggs', protein_g: 22, cost: 50 }
  ];
  const eggAnomalyTasks = generateHeuristicAuditTasks([], mealsWithEggAnomaly);
  expect(eggAnomalyTasks.length).toBe(1);
  expect(eggAnomalyTasks[0].title).toBe('Audit Nutrition Logs');
  expect(eggAnomalyTasks[0].category).toBe('polaris');
  expect(eggAnomalyTasks[0].notes).toContain('2 boiled eggs');
});

it('generateHeuristicAuditTasks creates milestone subtasks without forcing polaris category', () => {
  const milestones = [
    { title: 'Launch v2 MVP', deadline: '2026-10-01' }
  ];
  const tasks = generateHeuristicAuditTasks(milestones, []);
  expect(tasks.length).toBe(1);
  expect(tasks[0].title).toBe('Prepare next step for Launch v2 MVP');
  expect(tasks[0].category).toBeUndefined();
});

it('insertTasks filters out existing active tasks and forwards category to Supabase', async () => {
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
    { title: 'New Unique Task', notes: 'new', category: 'polaris' },
    { title: 'Audit Nutrition Logs', notes: 'audit anomaly' },
    { title: 'General Task', notes: 'general' }
  ];

  const count = await insertTasks(mockSupabase, 'user-123', tasksToInsert);
  expect(count).toBe(3);
  expect(insertedRows.length).toBe(3);
  expect(insertedRows[0].title).toBe('New Unique Task');
  expect(insertedRows[0].category).toBe('polaris');
  expect(insertedRows[1].title).toBe('Audit Nutrition Logs');
  expect(insertedRows[1].category).toBe('polaris');
  expect(insertedRows[2].title).toBe('General Task');
  expect(insertedRows[2].category).toBe('normal');
});

it('parseAITasks supports { tasks: [...] } object responses, coercions and sanitization', () => {
  const objectJson = JSON.stringify({
    tasks: [
      { title: 'Task in object', estimated_minutes: '25', notes: 'note 1' },
      { title: '  Trimmed Task  ', estimated_minutes: 40 },
      { title: '', estimated_minutes: 10 },
      { title: '   ' },
      null,
      { estimated_minutes: 20 },
      { title: 12345 }
    ]
  });

  const parsed = parseAITasks(objectJson);
  expect(parsed.length).toBe(2);
  expect(parsed[0].title).toBe('Task in object');
  expect(parsed[0].estimated_minutes).toBe(25);
  expect(parsed[1].title).toBe('Trimmed Task');
  expect(parsed[1].estimated_minutes).toBe(40);
});

it('parseAITasks coerces non-integer estimated_minutes and handles non-array protection', () => {
  const mixedTasks = JSON.stringify([
    { title: 'Coerce invalid string', estimated_minutes: 'abc' },
    { title: 'Coerce missing minutes' },
    { title: 'Coerce null minutes', estimated_minutes: null }
  ]);
  const parsed = parseAITasks(mixedTasks);
  expect(parsed.length).toBe(3);
  expect(parsed[0].estimated_minutes).toBe(15);
  expect(parsed[1].estimated_minutes).toBe(15);
  expect(parsed[2].estimated_minutes).toBe(15);

  // Test non-array parse protection (valid JSON but not array or { tasks: [] })
  expect(parseAITasks('{"message": "success"}')).toEqual([]);
  expect(parseAITasks('{"tasks": "not an array"}')).toEqual([]);
  expect(parseAITasks('12345')).toEqual([]);
  expect(parseAITasks('"plain string"')).toEqual([]);
});

it('parseAITasks truncates error preview string to first 200 characters on JSON parse failures', () => {
  const longInvalidInput = 'Malformed JSON '.repeat(30);
  expect(longInvalidInput.length).toBeGreaterThan(200);

  let thrownError;
  try {
    parseAITasks(longInvalidInput);
  } catch (err) {
    thrownError = err;
  }

  expect(thrownError).toBeDefined();
  expect(thrownError.message).toContain('Failed to parse AI response as JSON. Output was: ');
  const preview = thrownError.message.replace('Failed to parse AI response as JSON. Output was: ', '');
  expect(preview.length).toBe(200);
});

it('insertTasks safely handles non-array and empty inputs', async () => {
  const mockSupabase = {
    from: () => {
      throw new Error('Should not be called for non-array or empty inputs');
    }
  };

  expect(await insertTasks(mockSupabase, 'user-123', null)).toBe(0);
  expect(await insertTasks(mockSupabase, 'user-123', undefined)).toBe(0);
  expect(await insertTasks(mockSupabase, 'user-123', {})).toBe(0);
  expect(await insertTasks(mockSupabase, 'user-123', 'not-an-array')).toBe(0);
  expect(await insertTasks(mockSupabase, 'user-123', [])).toBe(0);
});

