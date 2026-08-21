import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Clock, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  PieChart as PieIcon, 
  Layers, 
  Zap,
  Star,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_TIME_BLOCKS = [
  { start_time: '08:00', duration_minutes: 120, title: 'Morning Deep Work Block', type: 'task' },
  { start_time: '10:00', duration_minutes: 30, title: 'Rest & Coffee Transition', type: 'transition' },
  { start_time: '10:30', duration_minutes: 150, title: 'High-Impact Execution', type: 'task' },
  { start_time: '13:00', duration_minutes: 60, title: 'Lunch & Reset', type: 'transition' },
  { start_time: '14:00', duration_minutes: 120, title: 'Afternoon Sprint & Admin', type: 'task' },
  { start_time: '16:00', duration_minutes: 60, title: 'Day Review & Sunset Buffer', type: 'task' },
];

const TYPE_COLORS = {
  urgent_important: '#f59e0b',      // Gold / High Impact
  important_not_urgent: '#3b82f6',  // Pulsar Blue / Strategic
  urgent_not_important: '#8b5cf6',  // Aurora Violet / Quick Wins
  neither: '#64748b',               // Dim / Backburner
  transition: '#10b981',            // Emerald / Rest & Transition
};

function timeToMins(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minsToTime(totalMins) {
  const normalized = Math.max(0, Math.min(1439, totalMins));
  const h = Math.floor(normalized / 60).toString().padStart(2, '0');
  const m = (normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function DayChunker({ tasks = [], selectedDay = 'today', onRefreshTasks }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedPillId, setExpandedPillId] = useState(null);
  const [viewMode, setViewMode] = useState('compact'); // 'compact' | 'zoomed'

  // Live Current Time
  const [nowMins, setNowMins] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newDuration, setNewDuration] = useState(60);
  const [newType, setNewType] = useState('task');

  const logDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNowMins(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('day_plan_blocks')
        .select('*')
        .eq('log_date', logDateStr)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        const defaultRows = PRESET_TIME_BLOCKS.map(b => ({
          ...b,
          log_date: logDateStr,
          ...(userId ? { user_id: userId } : {})
        }));

        const { data: inserted } = await supabase
          .from('day_plan_blocks')
          .insert(defaultRows)
          .select();

        setBlocks(inserted || []);
      } else {
        setBlocks(data);
      }
    } catch (err) {
      console.error('Error fetching day_plan_blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, [logDateStr]);

  const handleCreateBlock = async (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const newBlock = {
        title: newTitle.trim(),
        start_time: newStartTime,
        duration_minutes: parseInt(newDuration, 10),
        type: newType,
        log_date: logDateStr,
        done: false,
        ...(userId ? { user_id: userId } : {})
      };

      const { data, error } = await supabase
        .from('day_plan_blocks')
        .insert([newBlock])
        .select()
        .single();

      if (error) throw error;

      setBlocks(prev => [...prev, data].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setNewTitle('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error creating block:', err);
    }
  };

  const openForGap = (gapStart, gapDuration) => {
    setNewStartTime(gapStart);
    setNewDuration(Math.min(120, gapDuration));
    setNewTitle('New Focus Window');
    setShowAddModal(true);
  };

  const assignTaskToBlock = async (blockId, task) => {
    try {
      const { error } = await supabase
        .from('day_plan_blocks')
        .update({
          title: task.title,
          source_type: 'task',
          source_id: task.id,
          duration_minutes: task.estimated_minutes || 60
        })
        .eq('id', blockId);

      if (error) throw error;
      fetchBlocks();
    } catch (err) {
      console.error('Error assigning task to block:', err);
    }
  };

  const toggleBlockDone = async (block) => {
    const newDone = !block.done;
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, done: newDone } : b));

    try {
      await supabase.from('day_plan_blocks').update({ done: newDone }).eq('id', block.id);
    } catch (err) {
      console.error('Error toggling block done:', err);
      fetchBlocks();
    }
  };

  const deleteBlock = async (blockId) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    try {
      await supabase.from('day_plan_blocks').delete().eq('id', blockId);
    } catch (err) {
      console.error('Error deleting block:', err);
      fetchBlocks();
    }
  };

  // Timeline Items & Gap Detection
  const timelineItems = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];

    const sorted = [...blocks].sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time));
    const items = [];

    let currentCursorMins = 8 * 60;

    if (sorted.length > 0) {
      const firstBlockStart = timeToMins(sorted[0].start_time);
      if (firstBlockStart < currentCursorMins) {
        currentCursorMins = firstBlockStart;
      }
    }

    sorted.forEach((block) => {
      const blockStart = timeToMins(block.start_time);
      const blockDuration = block.duration_minutes || 30;

      if (blockStart > currentCursorMins) {
        const gapMins = blockStart - currentCursorMins;
        items.push({
          id: `gap-${currentCursorMins}`,
          isGap: true,
          start_time: minsToTime(currentCursorMins),
          end_time: minsToTime(blockStart),
          duration_minutes: gapMins,
        });
      }

      items.push({
        ...block,
        isGap: false,
        start_mins: blockStart,
        end_mins: blockStart + blockDuration,
      });

      currentCursorMins = Math.max(currentCursorMins, blockStart + blockDuration);
    });

    return items;
  }, [blocks]);

  // Pie Stats
  const pieStats = useMemo(() => {
    let totalPlannedMins = 0;
    let transitionMins = 0;
    let totalGapMins = 0;

    const categoryMins = {
      urgent_important: 0,
      important_not_urgent: 0,
      urgent_not_important: 0,
      neither: 0,
      transition: 0,
    };

    timelineItems.forEach(item => {
      if (item.isGap) {
        totalGapMins += item.duration_minutes;
      } else {
        const mins = item.duration_minutes || 30;
        totalPlannedMins += mins;

        if (item.type === 'transition') {
          categoryMins.transition += mins;
          transitionMins += mins;
        } else {
          const matchedTask = tasks.find(t => t.id === item.source_id);
          const quad = matchedTask?.quadrant || 'urgent_important';
          categoryMins[quad] = (categoryMins[quad] || 0) + mins;
        }
      }
    });

    return {
      totalPlannedMins,
      transitionMins,
      totalGapMins,
      categoryMins,
    };
  }, [timelineItems, tasks]);

  const donutSegments = useMemo(() => {
    const total = pieStats.totalPlannedMins || 1;
    let accumulatedAngle = 0;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;

    const segments = [];
    const entries = [
      { key: 'urgent_important', label: 'Do First', color: TYPE_COLORS.urgent_important, mins: pieStats.categoryMins.urgent_important },
      { key: 'important_not_urgent', label: 'Strategic', color: TYPE_COLORS.important_not_urgent, mins: pieStats.categoryMins.important_not_urgent },
      { key: 'urgent_not_important', label: 'Quick Wins', color: TYPE_COLORS.urgent_not_important, mins: pieStats.categoryMins.urgent_not_important },
      { key: 'transition', label: 'Rest & Buffer', color: TYPE_COLORS.transition, mins: pieStats.categoryMins.transition },
    ];

    entries.forEach(entry => {
      if (entry.mins > 0) {
        const percent = entry.mins / total;
        const strokeDasharray = `${percent * circumference} ${circumference}`;
        const strokeDashoffset = -accumulatedAngle * circumference;
        accumulatedAngle += percent;

        segments.push({
          ...entry,
          percent: Math.round(percent * 100),
          strokeDasharray,
          strokeDashoffset,
        });
      }
    });

    return segments;
  }, [pieStats]);

  const SCALE = 1.35;

  return (
    <div className="w-full space-y-6 bg-transparent text-starlight font-body">
      
      {/* Top Banner: Day Spending Pie Chart + Day Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* SVG Donut Pie Chart */}
        <div className="md:col-span-1 glass border border-blue-900/20 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon className="w-4 h-4 text-gold" />
            <h3 className="font-display text-xs tracking-widest text-starlight uppercase">
              DAY SPENDING PIE
            </h3>
          </div>

          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="rgba(30, 45, 74, 0.3)"
                strokeWidth="14"
              />
              {donutSegments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-700"
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-mono text-base font-bold text-starlight">
                {Math.floor(pieStats.totalPlannedMins / 60)}h {pieStats.totalPlannedMins % 60}m
              </span>
              <span className="text-[9px] font-mono text-gold uppercase tracking-wider">PLANNED</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-1.5 pt-3 text-[10px] font-mono border-t border-blue-900/20">
            {donutSegments.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-left truncate">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-dim truncate">{seg.label}: <strong className="text-starlight">{seg.percent}%</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Day Summary & Ribbon Scale */}
        <div className="md:col-span-2 glass border border-blue-900/20 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pulsar" />
              <h3 className="font-display text-xs tracking-widest text-starlight uppercase">
                DAY CHUNKING & TIME-BLOCKING
              </h3>
            </div>

            <button
              onClick={() => {
                setNewStartTime('12:00');
                setNewDuration(60);
                setShowAddModal(true);
              }}
              className="bg-gold hover:bg-gold/90 text-void font-display text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD CHUNK</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="glass border border-blue-900/30 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-dim uppercase block">FOCUS WORK</span>
              <span className="font-mono text-lg font-bold text-gold">
                {Math.floor((pieStats.totalPlannedMins - pieStats.transitionMins) / 60)}h {(pieStats.totalPlannedMins - pieStats.transitionMins) % 60}m
              </span>
            </div>

            <div className="glass border border-blue-900/30 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-dim uppercase block">REST & BUFFER</span>
              <span className="font-mono text-lg font-bold text-emerald">
                {pieStats.transitionMins}m
              </span>
            </div>

            <div className="glass border border-blue-900/30 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-dim uppercase block">OPEN WINDOW GAPS</span>
              <span className="font-mono text-lg font-bold text-pulsar">
                {Math.floor(pieStats.totalGapMins / 60)}h {pieStats.totalGapMins % 60}m
              </span>
            </div>
          </div>

          {/* 24h Proportional Ribbon Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-dim">
              <span>08:00 AM</span>
              <span>24-Hour Proportional Ribbon Scale</span>
              <span>08:00 PM</span>
            </div>
            
            <div className="w-full h-3 bg-void/60 rounded-full border border-blue-900/30 overflow-hidden flex">
              {timelineItems.map((item, idx) => {
                if (item.isGap) {
                  return (
                    <div
                      key={`gap-ribbon-${idx}`}
                      style={{ flexGrow: item.duration_minutes }}
                      className="h-full bg-pulsar/20 border-r border-pulsar/30 border-dashed"
                      title={`Open Window: ${item.start_time} - ${item.end_time} (${item.duration_minutes}m free)`}
                    />
                  );
                }
                const color = item.type === 'transition' ? TYPE_COLORS.transition : (TYPE_COLORS[tasks.find(t => t.id === item.source_id)?.quadrant] || TYPE_COLORS.urgent_important);
                return (
                  <div
                    key={`block-ribbon-${item.id}`}
                    style={{ flexGrow: item.duration_minutes, backgroundColor: color }}
                    className="h-full border-r border-void/50 opacity-90 hover:opacity-100 transition-opacity"
                    title={`${item.title} (${item.duration_minutes}m)`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TIMELINE VIEW CONTROLS & COMPACT STACKED PILLS VIEW                   */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display text-xs tracking-widest text-starlight uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" /> WHOLE DAY AT A GLANCE (TIMELINE STACK)
          </h3>

          {/* Zoom Level Capsule Pill Switcher */}
          <div className="glass border border-blue-900/30 p-0.5 rounded-full flex items-center gap-1">
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1 rounded-full text-[10px] font-display tracking-widest transition-all cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-cosmic text-gold border border-gold/40 shadow-[0_0_10px_rgba(245,158,11,0.25)] font-bold'
                  : 'text-dim hover:text-starlight'
              }`}
            >
              COMPACT ALL-DAY
            </button>
            <button
              onClick={() => setViewMode('zoomed')}
              className={`px-3 py-1 rounded-full text-[10px] font-display tracking-widest transition-all cursor-pointer ${
                viewMode === 'zoomed'
                  ? 'bg-cosmic text-pulsar border border-pulsar/40 shadow-[0_0_10px_rgba(59,130,246,0.25)] font-bold'
                  : 'text-dim hover:text-starlight'
              }`}
            >
              ZOOMED RULER
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-dim glass border border-blue-900/20 rounded-2xl">
            Loading timeline...
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-dim glass border border-blue-900/20 rounded-2xl italic">
            No time blocks created yet. Click "Add Chunk" to block your day!
          </div>
        ) : viewMode === 'compact' ? (
          /* ================================================================= */
          /* COMPACT MODE: Sleek Stacked Time Pills (Fits Whole Day on Screen) */
          /* ================================================================= */
          <div className="glass border border-blue-900/20 rounded-2xl p-4 space-y-2 shadow-2xl">
            {timelineItems.map((item, idx) => {
              const isExpanded = expandedPillId === (item.id || item.start_time);
              const isTransition = item.type === 'transition';

              if (item.isGap) {
                return (
                  <div
                    key={`gap-compact-${idx}`}
                    onClick={() => openForGap(item.start_time, item.duration_minutes)}
                    className="group relative rounded-xl border border-dashed border-pulsar/40 bg-pulsar/5 hover:bg-pulsar/15 transition-all p-2.5 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs text-pulsar">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span className="font-bold">{item.start_time} - {item.end_time}</span>
                      <span className="text-[10px] bg-pulsar/20 px-2 py-0.5 rounded-full font-semibold">
                        ✨ {item.duration_minutes}m FREE WINDOW
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openForGap(item.start_time, item.duration_minutes);
                      }}
                      className="text-[10px] font-display bg-pulsar/20 border border-pulsar/40 text-pulsar hover:bg-pulsar hover:text-void px-2.5 py-1 rounded-lg transition-all"
                    >
                      + FILL ({item.duration_minutes}m)
                    </button>
                  </div>
                );
              }

              const color = isTransition ? TYPE_COLORS.transition : (TYPE_COLORS[tasks.find(t => t.id === item.source_id)?.quadrant] || TYPE_COLORS.urgent_important);

              return (
                <div
                  key={item.id}
                  onClick={() => setExpandedPillId(isExpanded ? null : item.id)}
                  className={`group rounded-xl glass border transition-all p-3 cursor-pointer ${
                    item.done
                      ? 'opacity-40 line-through border-dim/20'
                      : isExpanded
                      ? 'border-gold shadow-[0_0_20px_rgba(245,158,11,0.25)] bg-cosmic/90'
                      : 'border-blue-900/30 hover:border-gold/50'
                  }`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: color,
                  }}
                >
                  {/* Compact Header Pill Bar */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="px-2 py-0.5 rounded-lg bg-void border border-blue-900/30 font-mono text-xs font-bold text-gold shrink-0">
                        {item.start_time}
                      </span>
                      <h4 className="text-xs font-body font-bold text-starlight truncate">
                        {item.title}
                      </h4>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block ${
                        isTransition ? 'bg-emerald/20 text-emerald' : 'bg-pulsar/20 text-pulsar'
                      }`}>
                        {isTransition ? 'REST' : 'FOCUS'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-dim bg-void px-2 py-0.5 rounded-lg border border-blue-900/30">
                        {item.duration_minutes}m
                      </span>

                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-dim" />}
                    </div>
                  </div>

                  {/* Expanded Pill Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="pt-3 mt-2 border-t border-blue-900/20 flex flex-wrap items-center justify-between gap-3"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="text-xs font-mono text-dim">
                          <span>Status: <strong className={item.done ? 'text-emerald' : 'text-gold'}>{item.done ? 'COMPLETED' : 'PLANNED'}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          {tasks.length > 0 && !isTransition && (
                            <div className="flex items-center gap-1.5 bg-void border border-blue-900/30 px-2.5 py-1 rounded-xl text-[10px] font-mono">
                              <span className="text-dim">Assign Task:</span>
                              <select
                                onChange={(e) => {
                                  const task = tasks.find(t => t.id === e.target.value);
                                  if (task) assignTaskToBlock(item.id, task);
                                }}
                                className="bg-transparent text-gold font-bold outline-none cursor-pointer max-w-[130px] truncate"
                                defaultValue=""
                              >
                                <option value="" disabled className="bg-void text-dim">Select task</option>
                                {tasks.map(t => (
                                  <option key={t.id} value={t.id} className="bg-void text-starlight">
                                    {t.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <button
                            onClick={() => toggleBlockDone(item)}
                            className="p-1.5 rounded-xl glass border border-blue-900/20 text-dim hover:text-emerald transition-all"
                            title="Toggle Done"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => deleteBlock(item.id)}
                            className="p-1.5 rounded-xl glass border border-blue-900/20 text-dim hover:text-danger transition-all"
                            title="Delete Block"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================================================================= */
          /* ZOOMED MODE: Proportional Ruler Scaled to Duration                */
          /* ================================================================= */
          <div className="relative glass border border-blue-900/20 rounded-2xl p-4 sm:p-6 space-y-2 overflow-hidden shadow-2xl">
            {timelineItems.some(i => !i.isGap && nowMins >= i.start_mins && nowMins <= i.end_mins) && (
              <div className="absolute left-0 right-0 z-30 pointer-events-none flex items-center gap-2"
                style={{
                  top: `${Math.max(10, (nowMins - (timelineItems[0]?.start_mins || 480)) * SCALE)}px`
                }}
              >
                <div className="h-0.5 flex-1 bg-gold shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
                <span className="text-[10px] font-mono font-bold bg-gold text-void px-2 py-0.5 rounded-full shadow-lg">
                  NOW — {minsToTime(nowMins)}
                </span>
                <div className="h-0.5 flex-1 bg-gold shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
              </div>
            )}

            {timelineItems.map((item, idx) => {
              if (item.isGap) {
                const gapHeight = Math.max(48, item.duration_minutes * SCALE);
                return (
                  <div
                    key={`gap-${idx}`}
                    style={{ height: `${gapHeight}px` }}
                    className="group relative rounded-xl border border-dashed border-pulsar/40 bg-pulsar/5 hover:bg-pulsar/10 transition-all flex items-center justify-between px-4"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs text-pulsar">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span className="font-bold">{item.start_time} - {item.end_time}</span>
                      <span className="text-[10px] bg-pulsar/20 px-2 py-0.5 rounded-full">
                        ✨ {item.duration_minutes}m OPEN WINDOW
                      </span>
                    </div>

                    <button
                      onClick={() => openForGap(item.start_time, item.duration_minutes)}
                      className="opacity-80 group-hover:opacity-100 bg-pulsar/20 hover:bg-pulsar text-pulsar hover:text-void font-display text-[10px] px-3 py-1 rounded-lg transition-all border border-pulsar/40 cursor-pointer"
                    >
                      + FILL WINDOW ({item.duration_minutes}m)
                    </button>
                  </div>
                );
              }

              const blockHeight = Math.max(64, item.duration_minutes * SCALE);
              const isTransition = item.type === 'transition';

              return (
                <div
                  key={item.id}
                  style={{ height: `${blockHeight}px` }}
                  className={`group relative rounded-2xl glass border transition-all p-4 flex flex-col justify-between overflow-hidden shadow-md ${
                    item.done
                      ? 'opacity-40 line-through border-dim/20'
                      : isTransition
                      ? 'border-emerald/40 bg-emerald/5'
                      : 'border-blue-900/30 hover:border-gold/50'
                  }`}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{
                      backgroundColor: isTransition ? TYPE_COLORS.transition : (TYPE_COLORS[tasks.find(t => t.id === item.source_id)?.quadrant] || TYPE_COLORS.urgent_important)
                    }}
                  />

                  <div className="flex items-center justify-between gap-3 pl-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-xl bg-void border border-blue-900/30 font-mono text-xs font-bold text-gold shrink-0">
                        {item.start_time}
                      </span>
                      <h4 className="text-xs sm:text-sm font-body font-bold text-starlight truncate">
                        {item.title}
                      </h4>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                        isTransition ? 'bg-emerald/20 text-emerald' : 'bg-pulsar/20 text-pulsar'
                      }`}>
                        {isTransition ? 'REST' : 'FOCUS'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-starlight bg-void px-2.5 py-1 rounded-xl border border-blue-900/30">
                        {item.duration_minutes}m SCALE
                      </span>

                      <button
                        onClick={() => toggleBlockDone(item)}
                        className="p-1.5 rounded-xl glass border border-blue-900/20 text-dim hover:text-emerald transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => deleteBlock(item.id)}
                        className="p-1.5 rounded-xl glass border border-blue-900/20 text-dim hover:text-danger transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {blockHeight >= 90 && (
                    <div className="flex items-center justify-between pl-2 pt-2 border-t border-blue-900/20 text-[11px] font-mono text-dim">
                      <span>Proportional Height: {Math.round(blockHeight)}px</span>
                      {tasks.length > 0 && !isTransition && (
                        <div className="flex items-center gap-1.5 bg-void border border-blue-900/30 px-2.5 py-1 rounded-xl">
                          <span>Assign Task:</span>
                          <select
                            onChange={(e) => {
                              const task = tasks.find(t => t.id === e.target.value);
                              if (task) assignTaskToBlock(item.id, task);
                            }}
                            className="bg-transparent text-gold font-bold outline-none cursor-pointer max-w-[140px] truncate"
                            defaultValue=""
                          >
                            <option value="" disabled className="bg-void text-dim">Select task</option>
                            {tasks.map(t => (
                              <option key={t.id} value={t.id} className="bg-void text-starlight">
                                {t.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass border border-blue-900/40 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-starlight tracking-wider text-sm">CREATE TIME BLOCK CHUNK</h3>

            <form onSubmit={handleCreateBlock} className="space-y-3 font-body text-xs">
              <div>
                <label className="text-dim font-mono text-[10px] uppercase block mb-1">Block Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Deep Coding Sprint / Evening Review"
                  className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-dim font-mono text-[10px] uppercase block mb-1">Start Time</label>
                  <input
                    type="text"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    placeholder="09:00"
                    className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-dim font-mono text-[10px] uppercase block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={e => setNewDuration(e.target.value)}
                    className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-dim font-mono text-[10px] uppercase block mb-1">Block Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none font-mono"
                >
                  <option value="task">Focus Work Block</option>
                  <option value="transition">Rest / Transition Buffer</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl glass text-dim text-xs font-display"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gold text-void font-display text-xs font-bold shadow-md"
                >
                  SAVE BLOCK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
