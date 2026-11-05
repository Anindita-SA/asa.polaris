// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inspectSyncErrors, resyncTodayPlan, fixTodayPlan } from './resyncTodayPlan';
import db from './offlineStore';
import * as offlineApi from './offlineApi';
import * as syncManager from './syncManager';
import { supabase } from './supabase';

vi.mock('./offlineApi', () => ({
  offlineInsert: vi.fn().mockResolvedValue({ data: [{}], error: null }),
  offlineUpdate: vi.fn().mockResolvedValue({ data: [{}], error: null }),
  generateUUID: vi.fn().mockReturnValue('mock-uuid-123')
}));

vi.mock('./syncManager', () => ({
  flushQueue: vi.fn().mockResolvedValue()
}));

describe('resyncTodayPlan and inspectSyncErrors Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inspectSyncErrors', () => {
    it('groups errors for daily_plan, daily_plan_items, and tasks created since migration date', async () => {
      const mockErrors = [
        {
          id: 1,
          table: 'daily_plan_items',
          error_message: "Could not find the table 'public.daily_plan_items' in the schema cache (PGRST205)",
          created_at: new Date('2026-11-02T12:00:00Z').getTime()
        },
        {
          id: 2,
          table: 'daily_plan',
          error_message: 'column daily_plan.manual_boxes does not exist (42703)',
          created_at: new Date('2026-11-02T14:00:00Z').getTime()
        },
        {
          id: 3,
          table: 'tasks',
          error_message: 'duplicate key value violates unique constraint (23505)',
          created_at: new Date('2026-11-03T02:00:00Z').getTime()
        },
        {
          id: 4,
          table: 'other_table',
          error_message: 'random error',
          created_at: new Date('2026-11-03T03:00:00Z').getTime()
        },
        {
          id: 5,
          table: 'daily_plan_items',
          error_message: 'PGRST205',
          created_at: new Date('2026-10-31T00:00:00Z').getTime() // Before migration date
        }
      ];

      db.sync_errors = {
        toArray: vi.fn().mockResolvedValue(mockErrors),
        bulkDelete: vi.fn().mockResolvedValue(true)
      };

      const result = await inspectSyncErrors('2026-11-02T00:00:00Z');
      expect(result.totalTargetErrors).toBe(3);
      expect(result.grouped.daily_plan_items['PGRST205 (Table missing from schema cache)']).toBe(1);
      expect(result.grouped.daily_plan['42703 (Column does not exist)']).toBe(1);
      expect(result.grouped.tasks['23505 (Unique violation)']).toBe(1);
      expect(result.grouped.other_table).toBeUndefined();
    });
  });

  describe('resyncTodayPlan', () => {
    it('throws error if todayStr is not 2026-11-03', async () => {
      await expect(resyncTodayPlan({ todayStr: '2026-11-04' })).rejects.toThrow(
        'resyncTodayPlan is strictly restricted to 2026-11-03'
      );
    });

    it('re-enqueues missing daily_plan_items and mismatched daily_plan rows, flushes, and clears DLQ', async () => {
      const mockLocalPlans = [
        { id: 'plan-1', user_id: 'u1', plan_date: '2026-11-03', slot: 1, done_boxes: 1, manual_boxes: 1, xp_awarded: 10, status: 'planned' }
      ];
      const mockLocalItems = [
        { id: 'item-1', user_id: 'u1', plan_id: 'plan-1', task_id: 'task-sub-1', position: 0, completed_by_slot: false }
      ];

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockLocalPlans)
          })
        })
      };

      db.daily_plan_items = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockLocalItems)
          })
        })
      };

      const mockDlqErrors = [
        { id: 101, table: 'daily_plan_items', payload: { id: 'item-1' } },
        { id: 102, table: 'tasks', payload: { id: 'other' } }
      ];
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      db.sync_errors = {
        toArray: vi.fn().mockResolvedValue(mockDlqErrors),
        bulkDelete: mockBulkDelete
      };

      // Mock remote Supabase returns plan with mismatch (done_boxes: 0, manual_boxes: 0) and 0 items
      let verifiedItemsData = [];
      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'daily_plan') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'plan-1', slot: 1, plan_date: '2026-11-03', status: 'planned', target_boxes: 2, done_boxes: 0, manual_boxes: 0, xp_awarded: 0 }
              ],
              error: null
            })
          };
        }
        if (table === 'daily_plan_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockImplementation(() => {
              // First call returns 0 items, second call after sync returns 1 item
              const data = verifiedItemsData;
              verifiedItemsData = [{ id: 'item-1', plan_id: 'plan-1', task_id: 'task-sub-1' }];
              return Promise.resolve({ data, error: null });
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis()
        };
      });

      const res = await resyncTodayPlan({ todayStr: '2026-11-03', userId: 'u1' });

      // offlineInsert called for missing item-1
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
        'daily_plan_items',
        expect.objectContaining({
          id: 'item-1',
          plan_id: 'plan-1',
          task_id: 'task-sub-1'
        })
      );

      // offlineUpdate called for plan-1 mismatch
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          done_boxes: 1,
          manual_boxes: 1,
          xp_awarded: 10
        })
      );

      // flushQueue was called
      expect(syncManager.flushQueue).toHaveBeenCalled();

      // Only replayed entry (id 101) cleared from sync_errors
      expect(mockBulkDelete).toHaveBeenCalledWith([101]);
      expect(res.countsAfter.itemsEnqueued).toBe(1);
      expect(res.countsAfter.plansUpdated).toBe(1);
      expect(res.clearedDlqCount).toBe(1);
    });
  });

  describe('fixTodayPlan Suite', () => {
    it('throws error if todayStr is not 2026-11-03', async () => {
      await expect(fixTodayPlan({ todayStr: '2026-11-04' })).rejects.toThrow(
        'fixTodayPlan is strictly restricted to 2026-11-03'
      );
    });

    it('aborts without writing if any local row has done_boxes > 0', async () => {
      const mockLocalPlans = [
        { id: 'c8055491-493b-433c-b8ed-b4a70004a0a2', slot: 1, done_boxes: 1, status: 'planned', plan_date: '2026-11-03' },
        { id: '2537be39-b7e3-48ee-a65e-72f5d6817470', slot: 2, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' },
        { id: '4305377a-ebc1-4c9c-921b-7117b6c415ff', slot: 3, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' }
      ];

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockLocalPlans)
          })
        })
      };

      const res = await fixTodayPlan({ todayStr: '2026-11-03' });
      expect(res.aborted).toBe(true);
      expect(res.reason).toContain('Local Slot 1 has done_boxes=1');
      expect(offlineApi.offlineUpdate).not.toHaveBeenCalled();
      expect(offlineApi.offlineInsert).not.toHaveBeenCalled();
      expect(syncManager.flushQueue).not.toHaveBeenCalled();
    });

    it('aborts without writing if any local row has status other than planned', async () => {
      const mockLocalPlans = [
        { id: 'c8055491-493b-433c-b8ed-b4a70004a0a2', slot: 1, done_boxes: 0, status: 'cleared', plan_date: '2026-11-03' },
        { id: '2537be39-b7e3-48ee-a65e-72f5d6817470', slot: 2, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' },
        { id: '4305377a-ebc1-4c9c-921b-7117b6c415ff', slot: 3, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' }
      ];

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockLocalPlans)
          })
        })
      };

      const res = await fixTodayPlan({ todayStr: '2026-11-03' });
      expect(res.aborted).toBe(true);
      expect(res.reason).toContain("status='cleared'");
      expect(offlineApi.offlineUpdate).not.toHaveBeenCalled();
      expect(offlineApi.offlineInsert).not.toHaveBeenCalled();
      expect(syncManager.flushQueue).not.toHaveBeenCalled();
    });

    it('aborts without writing if any remote row has done_boxes > 0 or non-planned status', async () => {
      const mockLocalPlans = [
        { id: 'c8055491-493b-433c-b8ed-b4a70004a0a2', slot: 1, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' },
        { id: '2537be39-b7e3-48ee-a65e-72f5d6817470', slot: 2, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' },
        { id: '4305377a-ebc1-4c9c-921b-7117b6c415ff', slot: 3, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' }
      ];

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockLocalPlans)
          })
        })
      };

      vi.spyOn(supabase, 'from').mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 'c8055491-493b-433c-b8ed-b4a70004a0a2', slot: 1, done_boxes: 2, status: 'planned' }
          ],
          error: null
        })
      }));

      const res = await fixTodayPlan({ todayStr: '2026-11-03' });
      expect(res.aborted).toBe(true);
      expect(res.reason).toContain('Remote Slot 1 has done_boxes=2');
      expect(offlineApi.offlineUpdate).not.toHaveBeenCalled();
      expect(offlineApi.offlineInsert).not.toHaveBeenCalled();
    });

    it('applies in-place updates for slot 2 and slot 3, inserts daily_plan_items, flushes, and returns remote counts', async () => {
      const mockLocalPlans = [
        { id: 'c8055491-493b-433c-b8ed-b4a70004a0a2', user_id: 'u1', slot: 1, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' },
        { id: '2537be39-b7e3-48ee-a65e-72f5d6817470', user_id: 'u1', slot: 2, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' },
        { id: '4305377a-ebc1-4c9c-921b-7117b6c415ff', user_id: 'u1', slot: 3, done_boxes: 0, status: 'planned', plan_date: '2026-11-03' }
      ];

      db.daily_plan = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockLocalPlans)
          })
        })
      };

      db.daily_plan_items = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([])
          })
        })
      };

      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'daily_plan') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'c8055491-493b-433c-b8ed-b4a70004a0a2', slot: 1, task_id: '395ee464', target_boxes: 4, done_boxes: 0, status: 'planned' },
                  { id: '2537be39-b7e3-48ee-a65e-72f5d6817470', slot: 2, task_id: '28a6d124-be16-45e3-b471-5db2631fd73f', target_boxes: 4, done_boxes: 0, status: 'planned' },
                  { id: '4305377a-ebc1-4c9c-921b-7117b6c415ff', slot: 3, task_id: '8255fd8b-977a-40d3-90ea-2cbe750b5d87', target_boxes: 2, done_boxes: 0, status: 'planned' }
                ],
                error: null
              }),
              data: [
                { id: 'c8055491-493b-433c-b8ed-b4a70004a0a2', slot: 1, done_boxes: 0, status: 'planned' },
                { id: '2537be39-b7e3-48ee-a65e-72f5d6817470', slot: 2, done_boxes: 0, status: 'planned' },
                { id: '4305377a-ebc1-4c9c-921b-7117b6c415ff', slot: 3, done_boxes: 0, status: 'planned' }
              ],
              error: null
            })
          };
        }
        if (table === 'daily_plan_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [
                { id: 'item-1', plan_id: '2537be39-b7e3-48ee-a65e-72f5d6817470', task_id: '9d8d50c0-126a-448b-b9df-907b650aa461', position: 0 },
                { id: 'item-2', plan_id: '4305377a-ebc1-4c9c-921b-7117b6c415ff', task_id: 'e6418e42-782f-4676-a25a-3c1d256e48f6', position: 0 }
              ],
              error: null
            })
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const res = await fixTodayPlan({ todayStr: '2026-11-03', userId: 'u1' });

      expect(res.success).toBe(true);
      expect(res.itemsInserted).toBe(2);

      // Verify in-place updates on Slot 2 and Slot 3 (swapped_from null)
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: '2537be39-b7e3-48ee-a65e-72f5d6817470' },
        expect.objectContaining({
          task_id: '28a6d124-be16-45e3-b471-5db2631fd73f',
          target_boxes: 4,
          swapped_from: null
        })
      );

      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: '4305377a-ebc1-4c9c-921b-7117b6c415ff' },
        expect.objectContaining({
          task_id: '8255fd8b-977a-40d3-90ea-2cbe750b5d87',
          target_boxes: 2,
          swapped_from: null
        })
      );

      // Verify offlineInsert for daily_plan_items
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
        'daily_plan_items',
        expect.objectContaining({
          plan_id: '2537be39-b7e3-48ee-a65e-72f5d6817470',
          task_id: '9d8d50c0-126a-448b-b9df-907b650aa461',
          position: 0,
          completed_by_slot: false
        })
      );

      expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
        'daily_plan_items',
        expect.objectContaining({
          plan_id: '4305377a-ebc1-4c9c-921b-7117b6c415ff',
          task_id: 'e6418e42-782f-4676-a25a-3c1d256e48f6',
          position: 0,
          completed_by_slot: false
        })
      );

      // Verify flushQueue called
      expect(syncManager.flushQueue).toHaveBeenCalled();

      // Remote counts verified
      expect(res.remotePlansCount).toBe(3);
      expect(res.remoteItemsCount).toBe(2);
    });
  });
});
