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
  ZoomIn,
  ZoomOut
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
  urgent_important: '#f59e0b',
  important_not_urgent: '#3b82f6',
  urgent_not_important: '#8b5cf6',
  neither: '#64748b',
  transition: '#10b981',
};

const TYPE_LABEL = {
  urgent_important: 'Do First',
  important_not_urgent: 'Strategic',
  urgent_not_important: 'Quick Win',
  neither: 'Backburner',
  transition: 'Rest',
  task: 'Focus',
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

function formatDur(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// px-per-minute scale constants
const PX_PER_MIN = 0.72;
const PX_PER_MIN_ZOOM = 1.5;
const MIN_BLOCK_PX = 28;

function BlockPill({ item, tasks, zoomed, onToggleDone, onDelete, onAssignTask }) {
  const [hovered, setHovered] = useState(false);
  const isTransition = item.type === 'transition';
  const matchedTask = tasks.find(t => t.id === item.source_id);
  const quad = matchedTask?.quadrant;
  const color = isTransition ? TYPE_COLORS.transition : (TYPE_COLORS[quad] || TYPE_COLORS.urgent_important);
  const label = isTransition ? 'REST' : (TYPE_LABEL[quad] || 'FOCUS');

  // Proportional height based on real duration
  const scale = zoomed ? PX_PER_MIN_ZOOM : PX_PER_MIN;
  const propHeight = Math.max(MIN_BLOCK_PX, item.duration_minutes * scale);
  const showEndTime = hovered || propHeight >= 52 || zoomed;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-xl border overflow-hidden cursor-pointer select-none transition-all duration-200 group ${
        item.done
          ? 'opacity-40 border-white/10'
          : isTransition
          ? 'border-emerald/30 bg-emerald/5 hover:border-emerald/60'
          : 'border-white/10 bg-white/5 hover:border-gold/40'
      }`}
      style={{ height: propHeight }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2 px-3 pl-3.5 h-7 shrink-0">
        <span className="text-[9px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}22`, color }}>
          {label}
        </span>
        <span className="font-mono text-[10px] text-gold shrink-0">{item.start_time}</span>
        <span className={`text-[11px] font-body font-semibold flex-1 truncate ${item.done ? 'line-through text-dim' : 'text-starlight'}`}>
          {item.title}
        </span>
        <span className="font-mono text-[9px] text-dim shrink-0 mr-1">{formatDur(item.duration_minutes)}</span>
      </div>
      <AnimatePresence>
        {(hovered || zoomed) && (
          <motion.div
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-0 left-0 right-0 px-3 pl-3.5 py-1.5 flex items-center justify-between gap-2 border-t border-white/5 bg-black/20 backdrop-blur-sm"
          >
            <div className="text-[9px] font-mono text-dim/70">
              {showEndTime && `${item.start_time} -> ${minsToTime((item.start_mins || 0) + item.duration_minutes)}`}
            </div>
            <div className="flex items-center gap-1">
              {!isTransition && tasks.length > 0 && (
                <select
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    const task = tasks.find(t => t.id === e.target.value);
                    if (task) onAssignTask(item.id, task);
                  }}
                  className="bg-void border border-blue-900/30 text-gold font-mono text-[9px] rounded-lg px-1.5 py-0.5 outline-none cursor-pointer max-w-[100px] truncate"
                  defaultValue=""
                >
                  <option value="" disabled className="bg-void text-dim">Assign...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id} className="bg-void text-starlight">{t.title}</option>
                  ))}
                </select>
              )}
              <button onClick={e => { e.stopPropagation(); onToggleDone(item); }}
                className={`p-1 rounded-lg transition-all ${item.done ? 'text-emerald' : 'text-dim hover:text-emerald'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                className="p-1 rounded-lg text-dim hover:text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GapPill({ item, zoomed, onFill }) {
  const [hovered, setHovered] = useState(false);
  const scale = zoomed ? PX_PER_MIN_ZOOM : PX_PER_MIN;
  const gapPx = Math.max(8, item.duration_minutes * scale);
  const showLabel = gapPx >= 16;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-between px-3 rounded-xl border border-dashed border-pulsar/15 hover:bg-pulsar/5 hover:border-pulsar/35 transition-all cursor-default overflow-hidden"
      style={{ height: gapPx }}
    >
      {showLabel && (
        <div className="flex items-center gap-2 font-mono text-[8px] text-pulsar/30">
          {hovered && <Sparkles className="w-2.5 h-2.5 animate-pulse text-pulsar/50" />}
          <span>{hovered ? `${item.start_time} - ${item.end_time}  ` : ''}{formatDur(item.duration_minutes)} free</span>
        </div>
      )}
      {hovered && (
        <button
          onClick={() => onFill(item.start_time, item.duration_minutes)}
          className="text-[9px] font-mono text-pulsar/60 hover:text-pulsar border border-pulsar/25 hover:border-pulsar/50 px-2 py-0.5 rounded-lg transition-all ml-auto"
        >
          + Fill
        </button>
      )}
    </div>
  );
}

export default function DayChunker({ tasks = [], selectedDay = 'today', onRefreshTasks }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const [nowMins, setNowMins] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

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
          ...b, log_date: logDateStr, ...(userId ? { user_id: userId } : {}),
        }));
        const { data: inserted } = await supabase.from('day_plan_blocks').insert(defaultRows).select();
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

  useEffect(() => { fetchBlocks(); }, [logDateStr]);

  const handleCreateBlock = async (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      const newBlock = {
        title: newTitle.trim(), start_time: newStartTime,
        duration_minutes: parseInt(newDuration, 10), type: newType,
        log_date: logDateStr, done: false, ...(userId ? { user_id: userId } : {}),
      };
      const { data, error } = await supabase.from('day_plan_blocks').insert([newBlock]).select().single();
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
      const { error } = await supabase.from('day_plan_blocks')
        .update({ title: task.title, source_type: 'task', source_id: task.id, duration_minutes: task.estimated_minutes || 60 })
        .eq('id', blockId);
      if (error) throw error;
      fetchBlocks();
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  const toggleBlockDone = async (block) => {
    const newDone = !block.done;
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, done: newDone } : b));
    try {
      await supabase.from('day_plan_blocks').update({ done: newDone }).eq('id', block.id);
    } catch (err) {
      fetchBlocks();
    }
  };

  const deleteBlock = async (blockId) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    try {
      await supabase.from('day_plan_blocks').delete().eq('id', blockId);
    } catch (err) {
      fetchBlocks();
    }
  };

  const timelineItems = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    const sorted = [...blocks].sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time));
    const items = [];
    let cursor = 8 * 60;
    const firstStart = timeToMins(sorted[0].start_time);
    if (firstStart < cursor) cursor = firstStart;
    sorted.forEach(block => {
      const blockStart = timeToMins(block.start_time);
      const blockDur = block.duration_minutes || 30;
      if (blockStart > cursor) {
        items.push({ isGap: true, start_time: minsToTime(cursor), end_time: minsToTime(blockStart), duration_minutes: blockStart - cursor });
      }
      items.push({ ...block, isGap: false, start_mins: blockStart, end_mins: blockStart + blockDur });
      cursor = Math.max(cursor, blockStart + blockDur);
    });
    return items;
  }, [blocks]);

  const pieStats = useMemo(() => {
    let totalPlannedMins = 0, transitionMins = 0, totalGapMins = 0;
    const categoryMins = { urgent_important: 0, important_not_urgent: 0, urgent_not_important: 0, neither: 0, transition: 0 };
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
    return { totalPlannedMins, transitionMins, totalGapMins, categoryMins };
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
        segments.push({ ...entry, percent: Math.round(percent * 100), strokeDasharray, strokeDashoffset });
      }
    });
    return segments;
  }, [pieStats]);

  return (
    <div className="w-full space-y-6">

      {/* Top Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Donut Pie */}
        <div className="md:col-span-1 glass border border-blue-900/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon className="w-4 h-4 text-gold" />
            <h3 className="font-display text-xs tracking-widest text-starlight uppercase">DAY TIME SPENDING PIE</h3>
          </div>
          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(30, 45, 74, 0.3)" strokeWidth="14" />
              {donutSegments.map((seg, idx) => (
                <circle key={idx} cx="50" cy="50" r="38" fill="transparent" stroke={seg.color} strokeWidth="14"
                  strokeDasharray={seg.strokeDasharray} strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-700" />
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

        {/* Gap Summary + Ribbon */}
        <div className="md:col-span-2 glass border border-blue-900/20 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pulsar" />
              <h3 className="font-display text-xs tracking-widest text-starlight uppercase">
                PROPORTIONAL TIME RULER & GAP DETECTOR
              </h3>
            </div>
            <button
              onClick={() => { setNewStartTime('12:00'); setNewDuration(60); setShowAddModal(true); }}
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
              <span className="font-mono text-lg font-bold text-emerald">{pieStats.transitionMins}m</span>
            </div>
            <div className="glass border border-blue-900/30 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-dim uppercase block">OPEN WINDOW GAPS</span>
              <span className="font-mono text-lg font-bold text-pulsar">
                {Math.floor(pieStats.totalGapMins / 60)}h {pieStats.totalGapMins % 60}m
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-dim">
              <span>08:00 AM</span>
              <span>24-Hour Proportional Ribbon Scale</span>
              <span>08:00 PM</span>
            </div>
            <div className="w-full h-3 bg-void rounded-full border border-blue-900/30 overflow-hidden flex">
              {timelineItems.map((item, idx) => {
                if (item.isGap) {
                  return (
                    <div key={`gap-ribbon-${idx}`} style={{ flexGrow: item.duration_minutes }}
                      className="h-full bg-pulsar/20 border-r border-pulsar/30 border-dashed"
                      title={`Open Window: ${item.start_time} - ${item.end_time} (${item.duration_minutes}m free)`} />
                  );
                }
                const color = item.type === 'transition'
                  ? TYPE_COLORS.transition
                  : (TYPE_COLORS[tasks.find(t => t.id === item.source_id)?.quadrant] || TYPE_COLORS.urgent_important);
                return (
                  <div key={`block-ribbon-${item.id}`}
                    style={{ flexGrow: item.duration_minutes, backgroundColor: color }}
                    className="h-full border-r border-void/50 opacity-90 hover:opacity-100 transition-opacity"
                    title={`${item.title} (${item.duration_minutes}m)`} />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Pill Stack Timeline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs tracking-widest text-starlight uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" />
            DAY AT A GLANCE
            <span className="text-[9px] font-mono text-dim normal-case tracking-normal font-sans">
               hover pills to expand · zoom for full detail
            </span>
          </h3>
          <button
            onClick={() => setZoomed(z => !z)}
            className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              zoomed
                ? 'bg-gold/20 border-gold/40 text-gold'
                : 'glass border-blue-900/30 text-dim hover:text-starlight hover:border-gold/30'
            }`}
          >
            {zoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            {zoomed ? 'ZOOM OUT' : 'ZOOM IN'}
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-dim glass border border-blue-900/20 rounded-2xl">
            Loading your day...
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-dim glass border border-blue-900/20 rounded-2xl italic">
            No time blocks yet. Click "Add Chunk" above to plan your day!
          </div>
        ) : (
          <div className="glass border border-blue-900/20 rounded-2xl p-3 space-y-1 shadow-2xl">
            {timelineItems.map((item, idx) => {
              if (item.isGap) {
                return (
                  <GapPill
                    key={`gap-${idx}`}
                    item={item}
                    zoomed={zoomed}
                    onFill={openForGap}
                  />
                );
              }
              return (
                <BlockPill
                  key={item.id}
                  item={item}
                  tasks={tasks}
                  zoomed={zoomed}
                  onToggleDone={toggleBlockDone}
                  onDelete={deleteBlock}
                  onAssignTask={assignTaskToBlock}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}>
          <div className="glass border border-blue-900/40 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-starlight tracking-wider text-sm">CREATE / FILL TIME BLOCK CHUNK</h3>
            <form onSubmit={handleCreateBlock} className="space-y-3 font-body text-xs">
              <div>
                <label className="text-dim font-mono text-[10px] uppercase block mb-1">Block Title</label>
                <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Deep Coding Sprint / Evening Review"
                  className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none focus:border-gold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-dim font-mono text-[10px] uppercase block mb-1">Start Time</label>
                  <input type="text" value={newStartTime} onChange={e => setNewStartTime(e.target.value)}
                    placeholder="09:00"
                    className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-dim font-mono text-[10px] uppercase block mb-1">Duration (Mins)</label>
                  <input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)}
                    className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="text-dim font-mono text-[10px] uppercase block mb-1">Block Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="w-full bg-stardust/50 border border-blue-900/30 text-starlight rounded-xl px-3 py-2 outline-none font-mono">
                  <option value="task">Focus Work Block</option>
                  <option value="transition">Rest / Transition Buffer</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl glass text-dim text-xs font-display">CANCEL</button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl bg-gold text-void font-display text-xs font-bold shadow-md">SAVE BLOCK</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
