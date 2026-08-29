import { getGroqKey } from '../../lib/llm';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { supabase } from '../../lib/supabase';
import { computeWSJFScore } from '../../hooks/useWSJFScore';
import { 
  Plus, 
  Sparkles, 
  Calendar, 
  Clock, 
  Flame, 
  Target, 
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
  Filter,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Link,
  Unlink,
  RefreshCw,
  List,
  FileText,
  ChevronDown
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
    cx: 300, cy: 200,
  },
  important_not_urgent: {
    id: 'important_not_urgent',
    title: 'Important, Not Urgent',
    subtitle: 'Schedule (Strategic Growth)',
    color: '#3b82f6', // Pulsar Blue
    bg: 'rgba(59, 130, 246, 0.04)',
    border: 'rgba(59, 130, 246, 0.25)',
    glow: 'rgba(59, 130, 246, 0.25)',
    icon: Target,
    cx: 900, cy: 200,
  },
  urgent_not_important: {
    id: 'urgent_not_important',
    title: 'Urgent, Not Important',
    subtitle: 'Delegate / Quick Wins',
    color: '#8b5cf6', // Aurora Violet
    bg: 'rgba(139, 92, 246, 0.04)',
    border: 'rgba(139, 92, 246, 0.25)',
    glow: 'rgba(139, 92, 246, 0.25)',
    icon: Zap,
    cx: 300, cy: 600,
  },
  neither: {
    id: 'neither',
    title: 'Neither Urgent nor Important',
    subtitle: 'Eliminate / Backburner',
    color: '#10b981', // Emerald / Stardust
    bg: 'rgba(16, 185, 129, 0.04)',
    border: 'rgba(16, 185, 129, 0.25)',
    glow: 'rgba(16, 185, 129, 0.25)',
    icon: Archive,
    cx: 900, cy: 600,
  }
};

function getQuadrantFromCoords(x, y) {
  const isRight = x >= 600;
  const isBottom = y >= 400;
  if (!isRight && !isBottom) return 'urgent_important';
  if (isRight && !isBottom) return 'important_not_urgent';
  if (!isRight && isBottom) return 'urgent_not_important';
  return 'neither';
}

function getDefaultCoords(quadrantId) {
  switch (quadrantId) {
    case 'urgent_important': return { x: 260, y: 180 };
    case 'important_not_urgent': return { x: 860, y: 180 };
    case 'urgent_not_important': return { x: 260, y: 580 };
    case 'neither': return { x: 860, y: 580 };
    default: return { x: 600, y: 400 };
  }
}

export default function MatrixCanvasView({ onTasksChanged, refreshTrigger }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState(null);

  // Brain Dump Tab State ('backlog' | 'completed' | 'details')
  const [activeBrainDumpTab, setActiveBrainDumpTab] = useState('backlog');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Brain Dump Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [brainDumpCollapsed, setBrainDumpCollapsed] = useState(false);

  // Canvas Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCompleted, setShowCompleted] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const canvasRef = useRef(null);
  const innerRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    console.log('[MatrixCanvasView] fetchTasks called (Data loading triggered)');
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Merge local canvasX and canvasY into the newly fetched data
      setTasks(prev => {
        const localCoords = {};
        prev.forEach(t => {
          if (t.canvasX != null && t.canvasY != null) {
            localCoords[t.id] = { canvasX: t.canvasX, canvasY: t.canvasY };
          }
        });
        return (data || []).map(t => ({
          ...t,
          canvasX: t.canvas_x != null ? t.canvas_x : localCoords[t.id]?.canvasX,
          canvasY: t.canvas_y != null ? t.canvas_y : localCoords[t.id]?.canvasY
        }));
      });
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  // Quick Dump Task into Brain Dump (Zero-Friction Capture)
  const handleDumpTask = async (e) => {
    if (e) e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const newTask = {
        title,
        status: 'inbox',
        quadrant: null,
        ...(userId ? { user_id: userId } : {})
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) => [data, ...prev]);
      setNewTitle('');
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error dumping task:', err);
    }
  };

  // Deploy task from Brain Dump onto 2D Matrix Plane (lands in quadrant stack list)
  const deployFromBrainDump = async (task, targetQuadrant = 'urgent_important') => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, quadrant: targetQuadrant, canvasX: null, canvasY: null } : t
      )
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ quadrant: targetQuadrant })
        .eq('id', task.id);

      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error deploying task:', err);
      fetchTasks();
    }
  };

  // Untether: Detach task from quadrant cluster list so it floats freely anywhere on 2D plane
  const handleUntether = async (task) => {
    const coords = getDefaultCoords(task.quadrant || 'urgent_important');
    const freeX = coords.x + (Math.random() * 140 - 70);
    const freeY = coords.y + (Math.random() * 100 - 50);

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, canvasX: freeX, canvasY: freeY } : t))
    );

    try {
      await supabase.from('tasks').update({ canvas_x: freeX, canvas_y: freeY }).eq('id', task.id);
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error untethering task:', err);
    }
  };

  // Retether: Attach free-floating node back into a quadrant cluster list
  const handleRetether = async (task) => {
    const targetQuadrant = task.quadrant || getQuadrantFromCoords(task.canvasX || 300, task.canvasY || 300);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: targetQuadrant, canvasX: null, canvasY: null } : t));
    
    try {
      await supabase.from('tasks').update({ quadrant: targetQuadrant, canvas_x: null, canvas_y: null }).eq('id', task.id);
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error retethering task:', err);
    }
  };

  // Return task to Brain Dump
  const returnToBrainDump = async (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, quadrant: null, canvasX: null, canvasY: null } : t))
    );

    try {
      await supabase.from('tasks').update({ quadrant: null, canvas_x: null, canvas_y: null }).eq('id', taskId);
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error returning to brain dump:', err);
      fetchTasks();
    }
  };

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
        .update({ quadrant: newQuadrant, canvas_x: newX, canvas_y: newY })
        .eq('id', taskId);

      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error updating task location:', err);
      fetchTasks();
    }
  };

  // Toggle done status (Finished tasks are removed from 2D plane and appear in Brain Dump's Completed list)
  const toggleDone = async (task) => {
    const newStatus = task.status === 'done' ? 'inbox' : 'done';
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error toggling done:', err);
      fetchTasks();
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchTasks();
    }
  };

  // AI Auditor Function
  const runAIAuditor = async () => {
    setIsAuditing(true);
    setAuditMessage("Auditing Brain Dump & spatial matrix nodes...");

    try {
      const key = getGroqKey();
      if (!key) {
        alert("Groq API Key is not configured. Please enter your key to enable AI features.");
        setIsAuditing(false);
        return;
      }

      const unestimated = tasks.filter((t) => !t.estimated_minutes && t.status !== 'done');
      if (unestimated.length > 0) {
        setAuditMessage(`Estimating duration for ${unestimated.length} unestimated tasks via AI...`);
        for (const task of unestimated) {
          const prompt = `Estimate realistic duration in minutes for task: "${task.title}". Return ONLY JSON like {"minutes": 35}.`;
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

            await supabase
              .from('tasks')
              .update({ estimated_minutes: mins, estimate_source: 'ai' })
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
        const task = scored.find(t => t.id === id);
        if (task && task.status !== 'in_progress' && task.status !== 'active') {
          await supabase.from('tasks').update({ status: 'active' }).eq('id', id);
        }
      }

      await fetchTasks();
      if (onTasksChanged) onTasksChanged();
      setAuditMessage(`Audit complete! Curated ${todayPickIds.length} priority tasks into Today's Tasks queue.`);
    } catch (err) {
      console.error('AI Auditor error:', err);
      setAuditMessage("Audit failed. Please check network connection.");
    } finally {
      setIsAuditing(false);
      setTimeout(() => setAuditMessage(null), 6000);
    }
  };

  // =======================================================================
  // D3 ZOOM & PAN INTEGRATION
  // =======================================================================
  useEffect(() => {
    if (!canvasRef.current || !innerRef.current) return;

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (e) => {
        // High-performance direct DOM update
        d3.select(innerRef.current).style('transform', `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`);
        // Sync React state for drag-math and other components
        setZoom(e.transform.k);
        setPan({ x: e.transform.x, y: e.transform.y });
      });

    zoomBehaviorRef.current = zoomBehavior;
    d3.select(canvasRef.current).call(zoomBehavior).on("dblclick.zoom", null);

    return () => {
      d3.select(canvasRef.current).on('.zoom', null);
    };
  }, []);

  const handleZoomChange = (delta) => {
    if (canvasRef.current && zoomBehaviorRef.current) {
      d3.select(canvasRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, delta > 0 ? 1.25 : 1/1.25);
    }
  };

  const handleResetView = () => {
    if (canvasRef.current && zoomBehaviorRef.current) {
      d3.select(canvasRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Active matrix tasks (Finished tasks `status === 'done'` are hidden from matrix plane)
  const matrixTasks = useMemo(() => {
    return tasks.filter((t) => t.quadrant !== null && t.status !== 'done');
  }, [tasks]);

  // Unsorted Brain Dump tasks (`quadrant === null` and `status !== 'done'`)
  const brainDumpTasks = useMemo(() => {
    let result = tasks.filter((t) => t.quadrant === null && t.status !== 'done');
    if (searchQuery.trim()) {
      result = result.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    }
    return result;
  }, [tasks, searchQuery]);

  // Completed Tasks list (`status === 'done'`)
  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'done');
  }, [tasks]);

  const updateTaskField = async (taskId, field, value) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t))
    );
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ [field]: value })
        .eq('id', taskId);
      if (error) throw error;
      if (onTasksChanged) onTasksChanged();
    } catch (err) {
      console.error('Error updating task field:', err);
    }
  };

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId);
  }, [tasks, selectedTaskId]);

  return (
    <div className="w-full h-full bg-transparent text-starlight font-['Inter'] flex flex-col md:flex-row-reverse overflow-hidden relative selection:bg-gold selection:text-black">
      
      {/* ==================================================================== */}
      {/* Left / Center: Spatial Constellation 2d Canvas Matrix                */}
      {/* ==================================================================== */}
      <div className="flex-1 relative flex flex-col overflow-hidden bg-transparent">
        {/* 2D Canvas Surface */}
        <div
          ref={canvasRef}
          data-role="canvas"
          className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative select-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59,130,246,0.12) 1px, transparent 0)`,
            backgroundSize: `${36 * zoom}px ${36 * zoom}px`,
          }}
        >
          <div
            ref={innerRef}
            className="absolute origin-top-left"
            style={{
              width: '1400px', // Wider canvas for more task space
              minHeight: '900px', // Let height grow with tasks
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Crosshair Dividers */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="4 6" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="4 6" />
            </svg>

            {/* 4 Quadrant Regions with Vertically Stacked Task Pills */}
            <div className="w-full h-full min-h-[900px] grid grid-cols-2 grid-rows-2 gap-6 p-6">
              {Object.values(QUADRANTS).map((q) => {
                const QIcon = q.icon;
                const qTasks = matrixTasks.filter(t => t.quadrant === q.id && t.canvasX == null && t.canvasY == null);

                return (
                  <div
                    key={q.id}
                    data-role="quadrant-bg"
                    className="relative rounded-xl border transition-all p-5 flex flex-col glass shadow-xl"
                    style={{
                      backgroundColor: q.bg,
                      borderColor: q.border,
                    }}
                  >
                    {/* Quadrant Header */}
                    <div className="flex items-center justify-between border-b border-pulsar/30 pb-3 mb-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <QIcon className="w-5 h-5" style={{ color: q.color }} />
                        <div>
                          <h3 className="font-display text-lg text-starlight">
                            {q.title}
                          </h3>
                          <p className="text-[11px] font-['Inter'] text-nova/60 italic">{q.subtitle}</p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-mono px-2.5 py-1 rounded-md border"
                        style={{ color: q.color, borderColor: q.border, backgroundColor: 'rgba(3,7,18,0.7)' }}
                      >
                        {qTasks.length} tasks
                      </span>
                    </div>

                    {/* Vertically Stacked Compact Task Pills with Drag-Between-Quadrants & Hover into Space */}
                    <div className="flex-1 flex flex-col items-start gap-3 py-2 overflow-visible">
                      <AnimatePresence>
                        {qTasks.map((task) => {
                          const isOutput = task.estimate_source === 'ai' || task.title.toLowerCase().includes('write') || task.title.toLowerCase().includes('code') || task.title.toLowerCase().includes('ppt') || task.title.toLowerCase().includes('fix');
                          const ioTag = isOutput ? 'OUT' : 'IN';

                          return (
                            <motion.div
                              key={task.id}
                              layout
                              drag
                              dragSnapToOrigin={true}
                              dragElastic={0.1}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ 
                                opacity: 1, 
                                scale: 1,
                                y: [0, -2, 0]
                              }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              whileHover={{ 
                                scale: 1.05, 
                                y: -4, 
                                boxShadow: `0 0 20px ${q.color}80`,
                                borderColor: q.color,
                                transition: { duration: 0.15 } 
                              }}
                              whileDrag={{ 
                                scale: 1.1, 
                                zIndex: 100, 
                                boxShadow: `0 0 30px ${q.color}`,
                                cursor: 'grabbing' 
                              }}
                              onDragEnd={async (event, info) => {
                                if (canvasRef.current) {
                                  const canvasRect = canvasRef.current.getBoundingClientRect();
                                  const dropX = (info.point.x - canvasRect.left - pan.x) / zoom;
                                  const dropY = (info.point.y - canvasRect.top - pan.y) / zoom;
                                  const targetQuadrant = getQuadrantFromCoords(dropX, dropY);

                                  if (targetQuadrant && targetQuadrant !== task.quadrant) {
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: targetQuadrant } : t));
                                    try {
                                      await supabase.from('tasks').update({ quadrant: targetQuadrant }).eq('id', task.id);
                                      if (onTasksChanged) onTasksChanged();
                                    } catch (err) {
                                      console.error('Error updating task quadrant on drag drop:', err);
                                      fetchTasks();
                                    }
                                  }
                                }
                              }}
                              transition={{ 
                                y: { duration: 1.5 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut' },
                                layout: { type: 'spring', stiffness: 350, damping: 25 },
                                default: { duration: 0.2 }
                              }}
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setActiveBrainDumpTab('details');
                                setBrainDumpCollapsed(false);
                              }}
                              className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0a0f1e]/90 border transition-all cursor-grab active:cursor-grabbing w-fit max-w-[450px] select-none"
                              style={{ 
                                borderColor: `${q.color}66`, 
                                boxShadow: `0 0 10px ${q.color}33` 
                              }}
                            >
                              {/* Left Bullet */}
                              {task.status === 'in_progress' ? (
                                <Zap className="w-3 h-3 shrink-0 pointer-events-none" style={{ color: q.color }} fill="currentColor" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 pointer-events-none" style={{ backgroundColor: q.color }} />
                              )}
                              
                              {/* Title */}
                              <h4 className="text-[13px] font-body text-[#e2e8f0] truncate leading-none pointer-events-none">
                                {task.title}
                              </h4>

                              {/* Right Tags (IN / OUT & Duration) + Action Controls */}
                              <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                                <span className={`px-1.5 py-0.5 rounded font-bold pointer-events-none ${
                                  ioTag === 'IN' ? 'bg-[#1a263d] text-[#60a5fa]' : 'bg-stardust text-nova/60 border border-pulsar/40'
                                }`}>
                                  {ioTag}
                                </span>

                                {task.estimated_minutes && (
                                  <span className="text-nova/60 bg-void/60 px-1 py-0.5 rounded border border-pulsar/40 pointer-events-none">
                                    {task.estimated_minutes}m
                                  </span>
                                )}

                                {/* Quick Hover Controls */}
                                <div className="hidden group-hover:flex items-center gap-1 pl-1 border-l border-pulsar/40">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleUntether(task); }}
                                    className="text-nova/60 hover:text-aurora p-0.5"
                                    title="Untether Node to Float Freely in Space"
                                  >
                                    <Unlink className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); returnToBrainDump(task.id); }}
                                    className="text-nova/60 hover:text-starlight p-0.5"
                                    title="Return to Brain Dump"
                                  >
                                    <Inbox className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleDone(task); }}
                                    className="text-nova/60 hover:text-emerald p-0.5"
                                    title="Mark Done"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {qTasks.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[11px] font-['Inter'] text-nova/60/50 italic border border-dashed border-pulsar/30 rounded-xl p-4">
                          No tasks in this quadrant
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Untethered Free-Floating Nodes on 2D Constellation Plane */}
            {matrixTasks.filter(t => t.canvasX != null && t.canvasY != null).map((task) => {
              const isOutput = task.estimate_source === 'ai' || task.title.toLowerCase().includes('write') || task.title.toLowerCase().includes('code') || task.title.toLowerCase().includes('ppt') || task.title.toLowerCase().includes('fix');
              const ioTag = isOutput ? 'OUT' : 'IN';

              const qColor = QUADRANTS[task.quadrant]?.color || '#f59e0b';

              return (
                <motion.div
                  key={`untethered-${task.id}`}
                  drag
                  dragMomentum={false}
                  onDragEnd={(e, info) => {
                    const newX = Math.max(20, Math.min(1100, task.canvasX + (info.offset.x / zoom)));
                    const newY = Math.max(20, Math.min(720, task.canvasY + (info.offset.y / zoom)));
                    handleNodeDragStop(task.id, newX, newY);
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    y: [0, -4, 0]
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.1, y: -6, boxShadow: `0 0 25px ${qColor}99` }}
                  whileDrag={{ scale: 1.15, zIndex: 100, boxShadow: `0 0 35px ${qColor}` }}
                  transition={{ 
                    y: { duration: 1.8 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut' },
                    default: { duration: 0.2 }
                  }}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setActiveBrainDumpTab('details');
                    setBrainDumpCollapsed(false);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${task.canvasX}px`,
                    top: `${task.canvasY}px`,
                    zIndex: 40,
                    borderColor: qColor,
                    boxShadow: `0 0 15px ${qColor}66`
                  }}
                  className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0a0f1e]/95 border-2 cursor-grab active:cursor-grabbing w-fit max-w-[450px] select-none"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse pointer-events-none" style={{ backgroundColor: qColor }} />
                  <h4 className="text-[13px] font-body text-starlight truncate leading-none pointer-events-none">
                    {task.title}
                  </h4>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold pointer-events-none ${
                      ioTag === 'IN' ? 'bg-[#1a263d] text-[#60a5fa]' : 'bg-stardust text-nova/60 border border-pulsar/40'
                    }`}>
                      {ioTag}
                    </span>

                    {/* Retether & Hover Controls */}
                    <div className="hidden group-hover:flex items-center gap-1 pl-1 border-l border-pulsar/40">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetether(task); }}
                        className="text-gold hover:text-white p-0.5"
                        title="Retether Node to Quadrant Cluster"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); returnToBrainDump(task.id); }}
                        className="text-nova/60 hover:text-starlight p-0.5"
                        title="Return to Brain Dump"
                      >
                        <Inbox className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDone(task); }}
                        className="text-nova/60 hover:text-emerald p-0.5"
                        title="Mark Done"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Left Sidebar: Restored Brain Dump Panel (Unsorted + Completed)      */}
      {/* ==================================================================== */}
      <aside className={`glass border-t md:border-t-0 md:border-r border-pulsar/30 flex flex-col h-auto md:h-full z-20 shadow-2xl transition-all duration-300 ${
        brainDumpCollapsed ? 'w-full md:w-12' : 'w-full md:w-80'
      }`}>
        {/* Brain Dump Header with BACKLOG & COMPLETED Sub-Tabs */}
        <div className={`border-b border-pulsar/30 bg-pulsar/10 flex items-center ${brainDumpCollapsed ? 'justify-center py-3' : 'px-4 py-3 justify-between gap-2'}`}>
          {!brainDumpCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0 w-full pr-2">
              <Inbox className="w-4 h-4 text-gold shrink-0 hidden sm:block" />
              <div className="glass border border-pulsar/40 p-1 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 w-full">
                <button
                  onClick={() => setActiveBrainDumpTab('backlog')}
                  className={`flex-1 justify-center px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeBrainDumpTab === 'backlog'
                      ? 'bg-cosmic text-gold border border-gold/40 '
                      : 'border border-transparent text-nova/60 hover:text-starlight hover:bg-pulsar/10'
                  }`}
                  title={`Backlog (${brainDumpTasks.length})`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold ">{brainDumpTasks.length}</span>
                </button>
                <button
                  onClick={() => setActiveBrainDumpTab('completed')}
                  className={`flex-1 justify-center px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeBrainDumpTab === 'completed'
                      ? 'bg-cosmic text-emerald border border-emerald/40 '
                      : 'border border-transparent text-nova/60 hover:text-starlight hover:bg-pulsar/10'
                  }`}
                  title={`Completed (${completedTasks.length})`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold ">{completedTasks.length}</span>
                </button>
                <button
                  onClick={() => setActiveBrainDumpTab('details')}
                  className={`flex-1 justify-center px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeBrainDumpTab === 'details'
                      ? 'bg-cosmic text-pulsar border border-pulsar/40 '
                      : 'border border-transparent text-nova/60 hover:text-starlight hover:bg-pulsar/10'
                  }`}
                  title="Task Details"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setBrainDumpCollapsed(!brainDumpCollapsed)}
            className="text-nova/60 hover:text-starlight p-1 rounded-lg transition-colors hidden md:block shrink-0"
            title={brainDumpCollapsed ? "Expand Brain Dump" : "Collapse Brain Dump"}
          >
            {brainDumpCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!brainDumpCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeBrainDumpTab === 'backlog' ? (
              <>
                {/* Quick Capture Input (Zero Friction Brain Dump) */}
                <div className="px-4 py-3 border-b border-pulsar/30 space-y-2">
                  <form onSubmit={handleDumpTask} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Dump thoughts here (Press Enter)..."
                      className="w-full bg-stardust/50 border border-pulsar/40 focus:border-gold text-starlight text-xs rounded-lg px-3 py-2 outline-none font-['Inter']"
                    />
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="bg-[#f5a623] hover:bg-[#f5a623]/90 text-[#0c0f14] font-display font-bold uppercase tracking-widest text-xs px-5 py-2 rounded-lg shrink-0 cursor-pointer shadow-md transition-all"
                    >
                      DUMP
                    </button>
                  </form>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-nova/60 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search backlog..."
                      className="w-full bg-void/60 border border-pulsar/40 text-starlight text-xs rounded-lg pl-8 pr-3 py-2 outline-none font-['Inter']"
                    />
                  </div>
                </div>

                {/* Unsorted Brain Dump Backlog Tasks */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
                  {brainDumpTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-nova/60 italic border border-dashed border-pulsar/30 rounded-xl font-['Inter']">
                      Brain Dump is clear! Type above to capture thoughts.
                    </div>
                  ) : (
                    brainDumpTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setActiveBrainDumpTab('details');
                        }}
                        className="group p-3 rounded-lg glass border border-pulsar/30 hover:border-gold/50 transition-all flex flex-col gap-1.5 shadow-sm cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-['Inter'] text-starlight leading-snug">
                            {task.title}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                            className="text-nova/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-pulsar/30 text-xs font-mono">
                          <span className="text-nova/60">Deploy to Matrix:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'urgent_important'); }}
                              className="px-1.5 py-0.5 rounded bg-gold/15 text-gold hover:bg-gold hover:text-void transition-all font-bold"
                              title="Deploy to Urgent & Important"
                            >
                              U+I
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'important_not_urgent'); }}
                              className="px-1.5 py-0.5 rounded bg-pulsar/15 text-pulsar hover:bg-pulsar hover:text-void transition-all font-bold"
                              title="Deploy to Important (Schedule)"
                            >
                              Imp
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'urgent_not_important'); }}
                              className="px-1.5 py-0.5 rounded bg-aurora/15 text-aurora hover:bg-aurora hover:text-void transition-all font-bold"
                              title="Deploy to Urgent (Quick Wins)"
                            >
                              Urg
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deployFromBrainDump(task, 'neither'); }}
                              className="px-1.5 py-0.5 rounded bg-dim/15 text-nova/60 hover:bg-dim hover:text-void transition-all font-bold"
                              title="Deploy to Neither (Backburner)"
                            >
                              Nei
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : activeBrainDumpTab === 'completed' ? (
              /* Completed Tasks List Tab */
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
                {completedTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-nova/60 italic border border-dashed border-pulsar/30 rounded-lg font-['Inter']">
                    No completed tasks yet.
                  </div>
                ) : (
                  completedTasks.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setActiveBrainDumpTab('details');
                      }}
                      className="flex items-center justify-between text-xs text-nova/60 p-3 rounded-lg glass border border-pulsar/30 cursor-pointer hover:border-emerald/50 transition-all"
                    >
                      <span className="truncate line-through text-nova/80">{t.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); toggleDone(t); }} className="text-emerald hover:text-starlight p-1" title="Restore to Inbox">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }} className="text-nova/60 hover:text-red-400 p-1" title="Delete Task">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeBrainDumpTab === 'details' ? (
              /* DETAILS TAB */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide text-sm">
                {selectedTask ? (
                  <div key={selectedTask.id} className="flex flex-col gap-4 text-starlight">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono ">Title</h4>
                      <input 
                        type="text" 
                        defaultValue={selectedTask.title} 
                        onBlur={(e) => updateTaskField(selectedTask.id, 'title', e.target.value)}
                        className="w-full bg-void/40 border border-pulsar/40 rounded-lg p-3 text-sm font-['Inter'] leading-relaxed outline-none focus:border-pulsar/50 transition-colors"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono ">Notes</h4>
                      <textarea
                        defaultValue={selectedTask.notes || ''}
                        onBlur={(e) => updateTaskField(selectedTask.id, 'notes', e.target.value)}
                        rows={4}
                        className="w-full bg-void/40 border border-pulsar/40 rounded-lg p-3 text-xs font-['Inter'] leading-relaxed whitespace-pre-wrap outline-none focus:border-pulsar/50 transition-colors resize-none"
                        placeholder="Add notes..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono ">Estimate (m)</h4>
                        <div className="bg-void/40 border border-pulsar/40 rounded-xl p-2.5 text-xs flex items-center gap-2 focus-within:border-pulsar/50 transition-colors">
                          <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
                          <input
                            type="number"
                            min="0"
                            defaultValue={selectedTask.estimated_minutes || ''}
                            onBlur={(e) => updateTaskField(selectedTask.id, 'estimated_minutes', e.target.value ? parseInt(e.target.value) : null)}
                            className="bg-transparent w-full outline-none font-mono"
                            placeholder="None"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-nova/60 mb-1 font-mono uppercase">Status</h4>
                        <button
                          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                          className={`w-full bg-void/40 border ${statusDropdownOpen ? 'border-pulsar/50' : 'border-pulsar/40'} rounded-xl p-2.5 text-xs flex items-center justify-between transition-colors outline-none cursor-pointer`}
                        >
                          <div className="flex items-center gap-2">
                            {selectedTask.status === 'done' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />
                            ) : selectedTask.status === 'in_progress' ? (
                              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : selectedTask.status === 'scheduled' ? (
                              <Calendar className="w-3.5 h-3.5 text-pulsar shrink-0" />
                            ) : selectedTask.status === 'inbox' ? (
                              <Inbox className="w-3.5 h-3.5 text-nova/60 shrink-0" />
                            ) : (
                              <Flame className="w-3.5 h-3.5 text-pulsar shrink-0" />
                            )}
                            <span className="text-starlight">
                              {selectedTask.status === 'in_progress' ? 'In Progress' :
                               selectedTask.status === 'done' ? 'Done' :
                               selectedTask.status === 'scheduled' ? 'Scheduled' :
                               selectedTask.status === 'inbox' ? 'Inbox' : 'Active'}
                            </span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-nova/60 shrink-0 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {statusDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen(false); }} />
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full mt-2 left-0 right-0 bg-[#0a0f1e]/95 backdrop-blur-xl border border-blue-900/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-50 overflow-hidden py-1"
                              >
                                {[
                                  { value: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-nova/60' },
                                  { value: 'active', label: 'Active', icon: Flame, color: 'text-pulsar' },
                                  { value: 'in_progress', label: 'In Progress', icon: Zap, color: 'text-amber-400' },
                                  { value: 'scheduled', label: 'Scheduled', icon: Calendar, color: 'text-pulsar' },
                                  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald' }
                                ].map(option => (
                                  <button
                                    key={option.value}
                                    onClick={() => {
                                      updateTaskField(selectedTask.id, 'status', option.value);
                                      setStatusDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                                      selectedTask.status === option.value ? 'bg-pulsar/20 text-starlight' : 'text-nova/60 hover:bg-blue-900/30 hover:text-starlight'
                                    }`}
                                  >
                                    <option.icon className={`w-3.5 h-3.5 shrink-0 ${option.color}`} />
                                    <span>{option.label}</span>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-nova/60 italic border border-dashed border-pulsar/30 rounded-xl font-['Inter'] mt-4">
                    Select a task from the matrix or backlog to view its details.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
