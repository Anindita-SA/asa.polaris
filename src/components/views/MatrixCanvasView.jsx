import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { computeWSJFScore } from '../../hooks/useWSJFScore';
import { 
  Plus, 
  Sparkles, 
  Calendar, 
  Clock, 
  Flame, 
  Target, 
  Unlink,
  Link as LinkIcon,
  Zap, 
  Archive, 
  CheckCircle2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Bot, 
  Inbox,
  Play,
  Star,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Quadrant Config matching Polaris Constellation Color Palette
const QUADRANTS = {
  urgent_important: {
    id: 'urgent_important',
    title: 'Urgent & Important',
    subtitle: 'Do First (High Impact)',
    color: '#f59e0b', // Gold / North Star
    bg: 'rgba(245, 158, 11, 0.04)',
    border: 'rgba(245, 158, 11, 0.25)',
    glow: 'rgba(245, 158, 11, 0.25)',
    icon: Flame,
  },
  important_not_urgent: {
    id: 'important_not_urgent',
    title: 'Important, Not Urgent',
    subtitle: 'Schedule (Strategic)',
    color: '#3b82f6', // Pulsar Blue
    bg: 'rgba(59, 130, 246, 0.04)',
    border: 'rgba(59, 130, 246, 0.25)',
    glow: 'rgba(59, 130, 246, 0.25)',
    icon: Target,
  },
  urgent_not_important: {
    id: 'urgent_not_important',
    title: 'Urgent, Not Important',
    subtitle: 'Delegate / Quick Wins',
    color: '#3ea8a0', // Aurora Teal
    bg: 'rgba(62, 168, 160, 0.04)',
    border: 'rgba(62, 168, 160, 0.25)',
    glow: 'rgba(62, 168, 160, 0.25)',
    icon: Zap,
  },
  neither: {
    id: 'neither',
    title: 'Neither',
    subtitle: 'Eliminate / Backlog',
    color: '#64748b', // Slate / Dim
    bg: 'rgba(100, 116, 139, 0.04)',
    border: 'rgba(100, 116, 139, 0.25)',
    glow: 'rgba(100, 116, 139, 0.15)',
    icon: Archive,
  },
};

// Cluster anchor centers (in 1200x800 canvas space, centered per quadrant)
const CLUSTER_CENTERS = {
  urgent_important:     { cx: 300, cy: 200 },
  important_not_urgent: { cx: 900, cy: 200 },
  urgent_not_important: { cx: 300, cy: 600 },
  neither:              { cx: 900, cy: 600 },
};

function getQuadrantFromCoords(x, y) {
  if (x < 600) return y < 400 ? 'urgent_important' : 'urgent_not_important';
  return y < 400 ? 'important_not_urgent' : 'neither';
}

function getDefaultCoords(quadrantId) {
  const c = CLUSTER_CENTERS[quadrantId] || { cx: 500, cy: 380 };
  return { x: c.cx, y: c.cy };
}

// ── ClusterChip: one task pill inside a cluster ────────────────────────────
function ClusterChip({ task, qConfig, index, onUntether, onToggleDone, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const isInput = (task.notes || '').includes('[input]') || task.title.toLowerCase().match(/(read|study|learn|research|review|watch|listen|analyze|inspect|notes)/);
  const isOutput = (task.notes || '').includes('[output]') || task.title.toLowerCase().match(/(write|code|build|create|print|report|draft|design|submit|make|draw|schematic|pcb|summary)/);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 22 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl glass border select-none transition-all"
      style={{
        borderColor: qConfig.border,
        boxShadow: `0 0 10px ${qConfig.glow}`,
        minWidth: 155, maxWidth: 210,
        opacity: task.status === 'done' ? 0.45 : 1,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: qConfig.color }} />
      <span className={`text-[10px] font-body flex-1 truncate ${task.status === 'done' ? 'line-through text-dim' : 'text-starlight'}`}>
        {task.title}
      </span>
      {isInput && <span className="text-[7px] font-mono bg-blue-500/20 text-blue-400 px-1 rounded shrink-0">IN</span>}
      {isOutput && <span className="text-[7px] font-mono bg-emerald-500/20 text-emerald-400 px-1 rounded shrink-0">OUT</span>}
      {task.estimated_minutes && (
        <span className="text-[8px] font-mono text-dim shrink-0">{task.estimated_minutes}m</span>
      )}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-1.5 flex items-center gap-0.5 z-30"
        >
          <button onClick={onUntether} title="Untether — drag freely"
            className="p-1 rounded-lg bg-void border border-blue-900/30 text-dim hover:text-gold transition-all">
            <Unlink className="w-3 h-3" />
          </button>
          <button onClick={onToggleDone}
            className={`p-1 rounded-lg bg-void border border-blue-900/30 transition-all ${task.status === 'done' ? 'text-emerald-400' : 'text-dim hover:text-emerald-400'}`}>
            <CheckCircle2 className="w-3 h-3" />
          </button>
          <button onClick={onDelete}
            className="p-1 rounded-lg bg-void border border-blue-900/30 text-dim hover:text-red-400 transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── ClusterBubble: all tethered tasks for one quadrant floating in their box ──
function ClusterBubble({ quadrantId, tasks, qConfig, onUntether, onToggleDone, onDelete }) {
  const { cx, cy } = CLUSTER_CENTERS[quadrantId] || { cx: 500, cy: 380 };
  const seed = quadrantId.length;
  const floatDur = 3.2 + (seed % 3) * 0.6;
  const floatAmt = 7 + (seed % 3) * 2;

  return (
    <div style={{ position: 'absolute', left: cx, top: cy, zIndex: 15, pointerEvents: 'none' }}>
      <div
        className="absolute rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{
          backgroundColor: qConfig.color,
          width: 130, height: 130,
          left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
        }}
      />
      <motion.div
        animate={{ y: [0, -floatAmt, 0] }}
        transition={{ duration: floatDur, repeat: Infinity, ease: 'easeInOut' }}
        style={{ translateX: '-50%', translateY: '-50%', pointerEvents: 'auto' }}
      >
        <div className="flex flex-col gap-1.5 items-start">
          {tasks.map((task, i) => (
            <ClusterChip
              key={task.id}
              task={task}
              qConfig={qConfig}
              index={i}
              onUntether={() => onUntether(task, cx, cy)}
              onToggleDone={() => onToggleDone(task)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── FreeNode: untethered task — smooth drag, re-tether on drop ─────────────
function FreeNode({ task, qConfig, onDragEnd, onRetether, onToggleDone, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const floatDur = 3.0 + (task.id.charCodeAt(0) % 4) * 0.4;

  const isInput = (task.notes || '').includes('[input]') || task.title.toLowerCase().match(/(read|study|learn|research|review|watch|listen|analyze|inspect|notes)/);
  const isOutput = (task.notes || '').includes('[output]') || task.title.toLowerCase().match(/(write|code|build|create|print|report|draft|design|submit|make|draw|schematic|pcb|summary)/);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.04}
      dragTransition={{ power: 0.08, timeConstant: 120 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e, info) => {
        setIsDragging(false);
        const newX = Math.max(20, Math.min(1140, (task.canvasX || 300) + info.offset.x));
        const newY = Math.max(20, Math.min(760, (task.canvasY || 200) + info.offset.y));
        onDragEnd(task.id, newX, newY);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={isDragging
        ? { scale: 1.06, opacity: 0.95, y: 0 }
        : { scale: 1, opacity: 1, y: [0, -5, 0] }
      }
      transition={isDragging
        ? { duration: 0.05 }
        : { y: { duration: floatDur, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' } }
      }
      style={{
        position: 'absolute',
        left: task.canvasX ?? 300,
        top:  task.canvasY ?? 200,
        zIndex: isDragging ? 60 : 20,
        borderColor: qConfig.border,
        boxShadow: `0 0 ${isDragging ? 28 : 14}px ${qConfig.glow}`,
        cursor: isDragging ? 'grabbing' : 'grab',
        willChange: 'transform',
      }}
      className={`group w-44 p-2.5 rounded-xl glass border backdrop-blur-md shadow-lg transition-shadow select-none ${
        task.status === 'done' ? 'opacity-40 border-dim/20' : 'hover:border-gold/40'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: qConfig.color }} />
        <span className="text-[9px] font-mono font-bold uppercase truncate" style={{ color: qConfig.color }}>
          {qConfig.title.split(' ')[0]}
        </span>
        <div className="flex-1" />
        {isInput && <span className="text-[7px] font-mono bg-blue-500/20 text-blue-400 px-1 rounded shrink-0">IN</span>}
        {isOutput && <span className="text-[7px] font-mono bg-emerald-500/20 text-emerald-400 px-1 rounded shrink-0">OUT</span>}
        <button
          onClick={e => { e.stopPropagation(); onRetether(task.id); }}
          title="Re-tether to cluster"
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-dim hover:text-pulsar transition-all"
        >
          <LinkIcon className="w-2.5 h-2.5" />
        </button>
      </div>
      <h4 className={`text-[10px] font-body font-semibold leading-snug mb-1.5 ${task.status === 'done' ? 'line-through text-dim' : 'text-starlight'}`}>
        {task.title}
      </h4>
      <div className={`flex items-center gap-1 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        {task.estimated_minutes && <span className="text-[8px] font-mono text-dim">{task.estimated_minutes}m</span>}
        <div className="flex-1" />
        <button onClick={e => { e.stopPropagation(); onToggleDone(task); }}
          className={`p-0.5 rounded transition-all ${task.status === 'done' ? 'text-emerald-400' : 'text-dim hover:text-emerald-400'}`}>
          <CheckCircle2 className="w-3 h-3" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          className="p-0.5 rounded text-dim hover:text-red-400 transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

export default function MatrixCanvasView({ onSelectTaskForLaunch }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState(null);

  // Zoom & Pan controls
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Drag node on 2D plane
  const handleNodeDragStop = async (taskId, newX, newY) => {
    const newQuadrant = getQuadrantFromCoords(newX, newY);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, quadrant: newQuadrant, canvasX: newX, canvasY: newY } : t
      )
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ quadrant: newQuadrant, canvasX: newX, canvasY: newY })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating task location:', err);
      fetchTasks();
    }
  };

  // Untether: give task a canvas position so it leaves the cluster
  const handleUntether = async (task, cx, cy) => {
    const newX = cx + (Math.random() * 80 - 40);
    const newY = cy + (Math.random() * 60 - 30);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, canvasX: newX, canvasY: newY } : t));
    try {
      await supabase.from('tasks').update({ canvasX: newX, canvasY: newY }).eq('id', task.id);
    } catch (err) {
      console.warn('canvasX/Y columns may not exist — untether is local only:', err);
    }
  };

  // Re-tether: clear canvas position so task returns to its quadrant cluster
  const handleRetether = async (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, canvasX: null, canvasY: null } : t));
    try {
      await supabase.from('tasks').update({ canvasX: null, canvasY: null }).eq('id', taskId);
    } catch (err) {
      console.warn('canvasX/Y columns may not exist — retether is local only:', err);
    }
  };

  // Toggle task done
  const toggleDone = async (task) => {
    const newStatus = task.status === 'done' ? 'active' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    } catch (err) { fetchTasks(); }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchTasks();
    }
  };

  // AI Auditor
  const runAIAuditor = async () => {
    setIsAuditing(true);
    setAuditMessage("Auditing tasks & classifying Input/Output types...");

    try {
      const key = import.meta.env.VITE_GROQ_API_KEY;
      if (!key) {
        alert("Groq API Key (VITE_GROQ_API_KEY) is missing in .env");
        setIsAuditing(false);
        return;
      }

      const unestimated = tasks.filter((t) => !t.estimated_minutes && t.status !== 'done');
      if (unestimated.length > 0) {
        setAuditMessage(`Estimating duration & IO types for ${unestimated.length} tasks via AI...`);
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
            const taskType = (parsed?.task_type === 'input' || parsed?.task_type === 'output')
              ? parsed.task_type
              : (task.title.toLowerCase().match(/(read|study|learn|research|review|watch|listen|analyze|inspect|notes)/) ? 'input' : 'output');

            const updatedNotes = task.notes
              ? (task.notes.includes('[') ? task.notes : `[${taskType}] ${task.notes}`)
              : `[${taskType}]`;

            await supabase
              .from('tasks')
              .update({ estimated_minutes: mins, estimate_source: 'ai', notes: updatedNotes })
              .eq('id', task.id);
          } catch (e) {
            console.error('Estimate error for task:', task.title, e);
          }
        }
      }

      setAuditMessage("Scoring tasks with WSJF algorithm and picking Today's Tasks...");
      const { data: updatedData } = await supabase.from('tasks').select('*');
      const scored = (updatedData || []).map(t => ({
        ...t,
        score: computeWSJFScore(t).score
      })).sort((a, b) => b.score - a.score);

      let capacityMins = 0;
      const todayPickIds = [];
      for (const t of scored) {
        if (t.status === 'done') continue;
        const duration = t.estimated_minutes || 30;
        if (capacityMins + duration <= 240 || todayPickIds.length === 0) {
          todayPickIds.push(t.id);
          capacityMins += duration;
        }
      }

      for (const id of todayPickIds) {
        await supabase.from('tasks').update({ status: 'active' }).eq('id', id);
      }

      // Bridge to RemindersPanel
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        const todayStr = new Date().toLocaleDateString('en-CA');

        const pickedTasks = scored.filter(t => todayPickIds.includes(t.id));
        for (const t of pickedTasks) {
          const { data: existing } = await supabase
            .from('daily_tasks')
            .select('id')
            .eq('user_id', userId)
            .eq('date', todayStr)
            .eq('title', t.title)
            .maybeSingle();

          if (!existing) {
            await supabase.from('daily_tasks').insert({
              user_id: userId,
              title: t.title,
              date: todayStr,
              recurring: false,
              completed: false,
            });
          }
        }
      } catch (bridgeErr) {
        console.warn('daily_tasks bridge write failed (non-critical):', bridgeErr);
      }

      await fetchTasks();
      setAuditMessage(`Audit complete! Curated ${todayPickIds.length} priority tasks (${capacityMins}m) into Today's Tasks queue.`);
    } catch (err) {
      console.error('AI Auditor error:', err);
      setAuditMessage("Audit failed. Please check network connection.");
    } finally {
      setIsAuditing(false);
      setTimeout(() => setAuditMessage(null), 6000);
    }
  };

  // Canvas Panning
  const handleMouseDown = (e) => {
    if (e.target.dataset.role === 'canvas' || e.target.dataset.role === 'quadrant-bg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.0, Math.max(0.5, prev * zoomFactor)));
  };

  const matrixTasks = useMemo(() => {
    return tasks.filter((t) => t.quadrant !== null);
  }, [tasks]);

  return (
    <div className="w-full h-full bg-void/60 text-starlight font-body flex flex-col md:flex-row overflow-hidden relative selection:bg-gold selection:text-black">
      
      {/* SPATIAL CONSTELLATION 2D CANVAS */}
      <div className="flex-1 relative flex flex-col overflow-hidden bg-void/40">
        
        {/* Floating Controls Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 glass border border-blue-900/30 p-2 rounded-2xl backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2 px-2">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-display tracking-widest text-starlight">CONSTELLATION PLANE</span>
          </div>

          <div className="w-px h-5 bg-blue-900/40" />

          {/* Zoom Buttons */}
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            className="p-1.5 rounded-lg text-dim hover:text-starlight hover:bg-white/5 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="p-1.5 rounded-lg text-dim hover:text-starlight hover:bg-white/5 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 rounded-lg text-dim hover:text-starlight hover:bg-white/5 transition-colors"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-blue-900/40" />

          {/* AI Auditor Trigger */}
          <button
            onClick={runAIAuditor}
            disabled={isAuditing}
            className="bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold font-display text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Bot className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing...' : 'RUN AI AUDIT'}</span>
          </button>
        </div>

        {/* Audit Status Toast */}
        <AnimatePresence>
          {auditMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-4 z-30 glass border border-gold/50 text-starlight text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-gold animate-spin" />
              <span className="font-body">{auditMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2D Canvas Surface */}
        <div
          ref={canvasRef}
          data-role="canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative select-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59,130,246,0.12) 1px, transparent 0)`,
            backgroundColor: 'rgba(3,7,18,0.55)',
            backgroundSize: `${36 * zoom}px ${36 * zoom}px`,
          }}
        >
          {/* Spatial Transformed Container */}
          <div
            className="absolute origin-top-left transition-transform duration-75"
            style={{
              width: '1200px',
              height: '800px',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Crosshair Dividers */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <line x1="600" y1="0" x2="600" y2="800" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1="0" y1="400" x2="1200" y2="400" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="4 6" />
            </svg>

            {/* 4 Quadrant Regions */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-3 p-3">
              {Object.values(QUADRANTS).map((q) => {
                const QIcon = q.icon;
                return (
                  <div
                    key={q.id}
                    data-role="quadrant-bg"
                    className="relative rounded-2xl border transition-all p-4 flex flex-col justify-between"
                    style={{
                      backgroundColor: q.bg,
                      borderColor: q.border,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QIcon className="w-5 h-5" style={{ color: q.color }} />
                        <div>
                          <h3 className="font-display text-sm tracking-wider text-starlight">
                            {q.title}
                          </h3>
                          <p className="text-[11px] font-body text-dim italic">{q.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border"
                        style={{ color: q.color, borderColor: q.border, backgroundColor: 'rgba(3,7,18,0.7)' }}
                      >
                        {q.id.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tethered clusters: 4 quadrant groups floating in their boxes */}
            {Object.values(QUADRANTS).map(q => {
              const tethered = matrixTasks.filter(t => t.quadrant === q.id && !t.canvasX && !t.canvasY);
              if (tethered.length === 0) return null;
              return (
                <ClusterBubble
                  key={`cluster-${q.id}`}
                  quadrantId={q.id}
                  tasks={tethered}
                  qConfig={q}
                  onUntether={handleUntether}
                  onToggleDone={toggleDone}
                  onDelete={deleteTask}
                />
              );
            })}

            {/* Free / untethered nodes — smooth drag, re-tether via link icon */}
            {matrixTasks.filter(t => t.canvasX != null || t.canvasY != null).map(task => (
              <FreeNode
                key={task.id}
                task={task}
                qConfig={QUADRANTS[task.quadrant] || QUADRANTS.neither}
                onDragEnd={handleNodeDragStop}
                onRetether={handleRetether}
                onToggleDone={toggleDone}
                onDelete={deleteTask}
              />
            ))}

          </div>
        </div>
      </div>

    </div>
  );
}
