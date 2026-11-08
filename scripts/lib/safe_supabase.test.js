import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSafeClient } from './safe_supabase.js';

describe('safe_supabase client security and allowlist suite', () => {
  it('allows updating whitelisted keys including deadline_source on tasks in read-mostly mode', async () => {
    const client = await createSafeClient('test-safe-task', true, true);
    
    // Valid update containing deadline_source and quadrant
    const updateResult = client.from('tasks').update({
      deadline_source: 'manual',
      quadrant: 'important_not_urgent',
      deadline: '2026-11-15'
    });

    expect(updateResult).toBeDefined();
    expect(typeof updateResult.eq).toBe('function');
  });

  it('supports chainable bulk updates with in() and eq() in dry run mode', async () => {
    const client = await createSafeClient('test-safe-bulk', true, true);
    const res = await client.from('tasks').update({
      status: 'parked'
    }).in('id', ['task-1', 'task-2']).eq('user_id', client._uid);

    expect(res).toBeDefined();
    expect(res.error).toBeNull();

    const singleRes = await client.from('tasks').update({ status: 'parked' }).select().single();
    expect(singleRes.data).toEqual({ status: 'parked' });
  });

  it('rejects updates on tasks containing disallowed fields with a security exception', async () => {
    const client = await createSafeClient('test-safe-task', true, true);

    expect(() => {
      client.from('tasks').update({
        user_id: 'malicious-overwrite-id',
        deadline_source: 'auto'
      });
    }).toThrow(/SECURITY EXCEPTION: Read-mostly script can only update allowed fields/);
  });

  it('blocks delete operations unconditionally on all tables', async () => {
    const client = await createSafeClient('test-safe-task', false, true);

    expect(() => {
      client.from('tasks').delete();
    }).toThrow(/SECURITY EXCEPTION: \.delete\(\) is globally blocked/);
  });

  it('blocks access to tables outside the strict allowlist', async () => {
    const client = await createSafeClient('test-safe-task', false, true);

    expect(() => {
      client.from('auth_users');
    }).toThrow(/SECURITY EXCEPTION: Table 'auth_users' is not in the allowlist/);
  });

  it('blocks insert operations when readMostly is true', async () => {
    const client = await createSafeClient('test-safe-readmostly', true, true);

    expect(() => {
      client.from('tasks').insert({ title: 'New Task' });
    }).toThrow(/SECURITY EXCEPTION: test-safe-readmostly is read-mostly\. Insert blocked\./);
  });
});
