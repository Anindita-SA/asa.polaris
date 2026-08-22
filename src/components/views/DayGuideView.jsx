import React, { useState, useCallback, useEffect } from 'react';
import TodaysTasksShuffle from '../TodaysTasksShuffle';
import MatrixCanvasView from './MatrixCanvasView';
import DayBriefView from './DayBriefView';
import { supabase } from '../../lib/supabase';
import { computeWSJFScore } from '../../hooks/useWSJFScore';
import {
  Sparkles, Star, Network, Bot, CheckCircle2, Clock, AlertTriangle,
  Zap, Target, Flame, Archive, RefreshCw, ChevronRight, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Quadrant colour map ──────────────────────────────────────────────────────
const Q_COLOR = {
  urgent_important:     '#f59e0b',
  important_not_urgent: '#3b82f6',
  urgent_not_important: '#8b5cf6',
  neither:              '#64748b',
};
const Q_LABEL = {
  urgent_important:     'Do First',
  important_not_urgent: 'Strategic',
  urgent_not_important: 'Quick Win',
  neither:              'Backburner',
};
const Q_ICON = {
  urgent_important:     Flame,
  important_not_urgent: Target,
  urgent_not_important: Zap,
  neither:              Archive,
};

function formatDur(mins) {
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ── Standalone Auditor Panel ─────────────────────────────────────────────────
function AuditorPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditDone, setAuditDone] = useState(false);
  const [pickedIds, setPickedIds] = useState([]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('AuditorPanel fetchTasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const pushLog = (msg, type = 'info') =>
    setAuditLog(prev => [...prev, { msg, type, ts: Date.now() }]);

  const runAudit = async () => {
    setIsAuditing(true);
    setAuditDone(false);
    setAuditLog([]);
    setPickedIds([]);

    try {
      const key = import.meta.env.VITE_GROQ_API_KEY;
      if (!key) {
        pushLog('Missing VITE_GROQ_API_KEY in .env — AI estimation skipped.', 'warn');
      } else {
        const unestimated = tasks.filter(t => !t.estimated_minutes && t.status !== 'done');
        if (unestimated.length > 0) {
          pushLog(`Estimating duration for ${unestimated.length} unestimated tasks via AI…`, 'info');
          for (const task of unestimated) {
            const prompt = `Analyze task: "${task.title}". Return ONLY valid JSON with duration in minutes and task_type as "input" (reading, research, studying, learning, absorbing) or "output" (writing, coding, creating, building, designing, submitting, producing). Example: {"minutes": 35, "task_type": "output"}`;
            try {
              const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [{ role: 'user', content: prompt }],
                  response_format: { type: 'json_object' }
                })
              });
              const data = await res.json();
              const parsed = JSON.parse(data.choices[0].message.content);
              const mins = parsed?.minutes ? Math.max(5, Math.round(parsed.minutes)) : 30;
              await supabase.from('tasks').update({ estimated_minutes: mins, estimate_source: 'ai' }).eq('id', task.id);
              pushLog(`  ✦ "${task.title}" → ${mins}m`, 'success');
            } catch (e) {
              pushLog(`  ✗ Failed to estimate "${task.title}"`, 'error');
            }
          }
        } else {
          pushLog('All active tasks already have time estimates.', 'success');
        }
      }

      pushLog('Scoring all tasks with WSJF algorithm…', 'info');
      const { data: updatedData } = await supabase.from('tasks').select('*');
      const scored = (updatedData || [])
        .map(t => ({ ...t, score: computeWSJFScore(t).score }))
        .sort((a, b) => b.score - a.score);

      let capacityMins = 0;
      const todayPickIds = [];
      for (const t of scored) {
        if (t.status === 'done') continue;
        const dur = t.estimated_minutes || 30;
        if (capacityMins + dur <= 240 || todayPickIds.length === 0) {
          todayPickIds.push(t.id);
          capacityMins += dur;
        }
      }

      for (const id of todayPickIds) {
        await supabase.from('tasks').update({ status: 'active' }).eq('id', id);
      }

      // Bridge: write curated tasks into daily_tasks so RemindersPanel sees them
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        const todayStr = new Date().toLocaleDateString('en-CA');
        const pickedFull = scored.filter(t => todayPickIds.includes(t.id));
        for (const t of pickedFull) {
          const { data: existing } = await supabase
            .from('daily_tasks').select('id')
            .eq('user_id', userId).eq('date', todayStr).eq('title', t.title)
            .maybeSingle();
          if (!existing) {
            await supabase.from('daily_tasks').insert({
              user_id: userId, title: t.title,
              date: todayStr, recurring: false, completed: false,
            });
          }
        }
      } catch (e) { console.warn('daily_tasks bridge (AuditorPanel):', e); }

      setPickedIds(todayPickIds);
      pushLog(`Audit complete — ${todayPickIds.length} priority tasks curated (${formatDur(capacityMins)} total).`, 'success');
      await fetchTasks();
      setAuditDone(true);
    } catch (err) {
      console.error('Auditor error:', err);
      pushLog('Audit failed — check console for details.', 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  // Derived stats
  const total = tasks.filter(t => t.status !== 'done').length;
  const estimated = tasks.filter(t => t.estimated_minutes && t.status !== 'done').length;
  const active = tasks.filter(t => t.status === 'active').length;
  const unquadrant = tasks.filter(t => !t.quadrant && t.status !== 'done').length;

  const byQuad = {};
  tasks.filter(t => t.quadrant && t.status !== 'done').forEach(t => {
    byQuad[t.quadrant] = (byQuad[t.quadrant] || 0) + 1;
  });

  const pickedTasks = tasks.filter(t => pickedIds.includes(t.id));

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide px-4 sm:px-8 py-6 space-y-6">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl tracking-widest text-starlight flex items-center gap-2">
            <Bot className="w-5 h-5 text-gold" /> AI AUDITOR
          </h2>
          <p className="text-xs text-dim mt-1 font-body italic">
            Estimates task durations via AI, scores with WSJF, and curates today's priority queue (4h capacity).
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={isAuditing || loading}
          className="flex items-center gap-2 bg-gold hover:bg-gold/90 disabled:opacity-50 text-void font-display text-xs px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 cursor-pointer"
        >
          <Bot className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
          {isAuditing ? 'AUDITING…' : 'RUN AI AUDIT'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Tasks', value: total, color: 'text-starlight', icon: BarChart2 },
          { label: 'Estimated', value: `${estimated}/${total}`, color: 'text-pulsar', icon: Clock },
          { label: 'Today Queue', value: active, color: 'text-gold', icon: Flame },
          { label: 'Unsorted', value: unquadrant, color: unquadrant > 0 ? 'text-amber-400' : 'text-emerald-400', icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass border border-blue-900/20 rounded-2xl p-4 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-dim uppercase mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Quadrant breakdown */}
      <div className="glass border border-blue-900/20 rounded-2xl p-5">
        <h3 className="font-display text-xs tracking-widest text-starlight uppercase mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-pulsar" /> Quadrant Distribution
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(Q_LABEL).map(([quad, label]) => {
            const count = byQuad[quad] || 0;
            const Icon = Q_ICON[quad];
            const color = Q_COLOR[quad];
            return (
              <div key={quad} className="flex items-center gap-3 glass border border-white/5 rounded-xl p-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <div className="font-mono text-sm font-bold text-starlight">{count}</div>
                  <div className="text-[10px] font-mono text-dim">{label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit log */}
      {auditLog.length > 0 && (
        <div className="glass border border-blue-900/20 rounded-2xl p-5 space-y-2">
          <h3 className="font-display text-xs tracking-widest text-starlight uppercase mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" /> Audit Log
          </h3>
          <div className="space-y-1.5 font-mono text-[11px]">
            {auditLog.map((entry, i) => (
              <div key={i} className={`flex items-start gap-2 ${
                entry.type === 'success' ? 'text-emerald-400'
                : entry.type === 'error' ? 'text-red-400'
                : entry.type === 'warn' ? 'text-amber-400'
                : 'text-dim'
              }`}>
                <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Curated picks result */}
      {auditDone && pickedTasks.length > 0 && (
        <div className="glass border border-gold/20 rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-xs tracking-widest text-gold uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Today's Curated Queue ({pickedTasks.length} tasks)
          </h3>
          <div className="space-y-2">
            {pickedTasks.map((t, i) => {
              const color = Q_COLOR[t.quadrant] || '#f59e0b';
              const label = Q_LABEL[t.quadrant] || 'Focus';
              return (
                <div key={t.id} className="flex items-center gap-3 glass border border-white/5 rounded-xl px-3 py-2">
                  <span className="font-mono text-[10px] text-dim w-4 shrink-0">{i + 1}</span>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-body text-starlight flex-1 truncate">{t.title}</span>
                  <span className="font-mono text-[9px] shrink-0" style={{ color }}>{label}</span>
                  {t.estimated_minutes && (
                    <span className="font-mono text-[9px] text-dim shrink-0">{t.estimated_minutes}m</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isAuditing && auditLog.length === 0 && (
        <div className="glass border border-dashed border-blue-900/30 rounded-2xl p-12 text-center space-y-3">
          <Bot className="w-10 h-10 text-dim mx-auto" />
          <p className="text-sm text-dim font-body italic">
            Run the AI Auditor to auto-estimate task durations, score with WSJF, and curate today's priority queue.
          </p>
          <p className="text-[10px] font-mono text-dim/50">Requires VITE_GROQ_API_KEY for AI estimation.</p>
        </div>
      )}

    </div>
  );
}

// ── Day Guide View ───────────────────────────────────────────────────────────
export default function DayGuideView() {
  const [activeSubTab, setActiveSubTab] = useState('spatial');
  // Shared cross-tab refresh counter — incrementing forces all sub-views to refetch
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Supabase Realtime — any INSERT/UPDATE on tasks table triggers a refresh across all tabs
  useEffect(() => {
    const channelName = `day-guide-${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        triggerRefresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [triggerRefresh]);

  const tabs = [
    {
      id: 'spatial',
      label: 'MATRIX',
      fullLabel: 'CONSTELLATION MATRIX',
      icon: Network,
      iconColor: 'text-pulsar',
      activeStyle: 'bg-cosmic border border-pulsar/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    },
    {
      id: 'picks',
      label: 'PICKS',
      fullLabel: "TODAY'S PICKS",
      icon: Sparkles,
      iconColor: 'text-gold',
      activeStyle: 'bg-cosmic border border-gold/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    },
    {
      id: 'auditor',
      label: 'AUDITOR',
      fullLabel: 'AI AUDITOR',
      icon: Bot,
      iconColor: 'text-emerald-400',
      activeStyle: 'bg-cosmic border border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.25)]',
    },
    {
      id: 'brief',
      label: 'BRIEF',
      fullLabel: 'DAY BRIEF',
      icon: Target,
      iconColor: 'text-amber-500',
      activeStyle: 'bg-cosmic border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    },
  ];

  return (
    <div className="w-full h-full min-h-screen text-starlight font-body flex flex-col overflow-hidden relative">
      {/* Compact Sub-Header */}
      <div className="glass border-b border-blue-900/20 pl-4 sm:pl-12 pr-4 sm:pr-14 py-2.5 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-3 shadow-xl shrink-0">
        {/* Title — collapses gracefully */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-sm tracking-[0.12em] text-starlight truncate">
              DAY GUIDE
            </h1>
            <p className="text-[10px] text-dim font-body italic truncate hidden sm:block">
              Constellation matrix · WSJF picks · AI auditor
            </p>
          </div>
        </div>

        {/* Pill Sub-Navigation — compact, never wraps */}
        <div className="glass border border-blue-900/30 p-0.5 rounded-full flex items-center gap-0.5 shadow-inner shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                title={tab.fullLabel}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-display tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? `text-starlight ${tab.activeStyle} font-bold`
                    : 'text-dim hover:text-starlight hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3 h-3 ${isActive ? tab.iconColor : 'text-dim'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeSubTab === 'spatial' && (
            <motion.div key="spatial"
              initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }} transition={{ duration: 0.15 }}
              className="w-full h-full"
            >
              <MatrixCanvasView refreshTrigger={refreshKey} onTasksChanged={triggerRefresh} />
            </motion.div>
          )}
          {activeSubTab === 'picks' && (
            <motion.div key="picks"
              initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }} transition={{ duration: 0.15 }}
              className="w-full h-full overflow-y-auto scrollbar-hide"
            >
              <TodaysTasksShuffle key={`picks-${refreshKey}`} />
            </motion.div>
          )}
          {activeSubTab === 'auditor' && (
            <motion.div key="auditor"
              initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }} transition={{ duration: 0.15 }}
              className="w-full h-full"
            >
              <AuditorPanel key={`auditor-${refreshKey}`} onAuditDone={triggerRefresh} />
            </motion.div>
          )}
          {activeSubTab === 'brief' && (
            <motion.div key="brief"
              initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }} transition={{ duration: 0.15 }}
              className="w-full h-full"
            >
              <DayBriefView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
