import React, { useState, useEffect, useMemo } from 'react';
import { useWSJFScore } from '../hooks/useWSJFScore';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import DayChunker from './DayChunker';
import { 
  Shuffle, 
  Play, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Sparkles, 
  Pause, 
  Zap, 
  Award, 
  CalendarDays, 
  Share2,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WEEKDAYS = [
  { id: 'monday', label: 'Monday', short: 'MON' },
  { id: 'tuesday', label: 'Tuesday', short: 'TUE' },
  { id: 'wednesday', label: 'Wednesday', short: 'WED' },
  { id: 'thursday', label: 'Thursday', short: 'THU' },
  { id: 'friday', label: 'Friday', short: 'FRI' },
  { id: 'saturday', label: 'Saturday', short: 'SAT' },
  { id: 'sunday', label: 'Sunday', short: 'SUN' },
];

function getCurrentWeekdayId() {
  const dayIndex = new Date().getDay();
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[dayIndex];
}

const TINY_FIRST_STEPS = [
  "Open the file and just read the title out loud.",
  "Put your hands on the keyboard/tool. Don't type yet.",
  "Write one single sentence, even if it's draft quality.",
  "Open the required browser tab or program. That's the whole step.",
  "Set a 2-minute timer and just touch the task work surface.",
  "Move your physical body into position at your desk.",
  "Read the last note or line you wrote for this item.",
  "Clear your desk surface except for what's needed right now.",
];

export default function TodaysTasksShuffle() {
  const { user } = useAuth();
  const { tasks, loading, error, refetch } = useWSJFScore();
  
  useEffect(() => {
    console.log('[TodaysTasksShuffle] Component mounted / refetching (Data loading via useWSJFScore)');
  }, [loading]);

  const [selectedDay, setSelectedDay] = useState(getCurrentWeekdayId());
  const [weekdayCapacities, setWeekdayCapacities] = useState({
    monday: 240,
    tuesday: 240,
    wednesday: 240,
    thursday: 240,
    friday: 240,
    saturday: 180,
    sunday: 180,
  });

  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [activeTask, setActiveTask] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeCue, setActiveCue] = useState('');
  const [showScores, setShowScores] = useState(false);

  const currentTodayId = useMemo(() => getCurrentWeekdayId(), []);

  const dayTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const explicitlyAssigned = tasks.filter(t => t.scheduled_day === selectedDay && t.status !== 'done');
    const unassigned = tasks.filter(t => !t.scheduled_day && t.status !== 'done');

    const combined = [...explicitlyAssigned];

    const scoredUnassigned = unassigned.map((t) => {
      const jitter = shuffleSeed > 0 ? (Math.random() * 0.3 - 0.15) : 0;
      return {
        ...t,
        effectiveScore: Math.max(0, t.wsjfScore + jitter),
      };
    }).sort((a, b) => b.effectiveScore - a.effectiveScore);

    const targetCapacity = weekdayCapacities[selectedDay] || 240;
    let currentMins = combined.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0);

    for (const task of scoredUnassigned) {
      const taskDuration = task.estimated_minutes || 30;
      if (currentMins + taskDuration <= targetCapacity || combined.length === 0) {
        combined.push({
          ...task,
          effectiveDuration: taskDuration,
          isPlaceholder: !task.estimated_minutes,
        });
        currentMins += taskDuration;
      }
    }

    return combined;
  }, [tasks, selectedDay, shuffleSeed, weekdayCapacities]);

  const dayAllocatedMinutes = useMemo(() => {
    return dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0);
  }, [dayTasks]);

  const handleShuffle = () => {
    setShuffleSeed((prev) => prev + 1);
  };

  const assignTaskToWeekday = async (taskId, weekdayId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ scheduled_day: weekdayId })
        .eq('id', taskId).eq('user_id', user?.id);

      if (error) throw error;
      refetch();
    } catch (err) {
      console.error('Error scheduling task for weekday:', err);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleStartTask = (task) => {
    setActiveTask(task);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setActiveCue(TINY_FIRST_STEPS[Math.floor(Math.random() * TINY_FIRST_STEPS.length)]);
  };

  const handleMarkDone = async (task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', task.id).eq('user_id', user?.id);

      if (error) throw error;

      if (activeTask && activeTask.id === task.id) {
        setActiveTask(null);
        setIsTimerRunning(false);
      }

      refetch();
    } catch (err) {
      console.error('Error marking task done:', err);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full min-h-full bg-transparent text-starlight font-body p-4 sm:p-6 md:p-8 pb-32 selection:bg-gold selection:text-black">
      
      {/* Header Bar */}
      <div className="max-w-5xl mx-auto mb-6 border-b border-pulsar/30 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gold" />
            <h1 className="font-display text-lg sm:text-xl font-bold text-starlight">
              Day Planner <span className="text-gold font-mono text-base">/</span> Weekday Memory
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-body text-nova/60 italic mt-1">
            Plan and tweak your daily capacity per weekday. Ready for Calendar & Reminder sync.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowScores(!showScores)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold transition-all glass border ${
              showScores
                ? 'bg-gold/20 border-gold text-gold '
                : 'border-pulsar/40 text-nova/60 hover:text-starlight'
            }`}
          >
            {showScores ? 'HIDE SCORES' : 'SHOW SCORES'}
          </button>

          <button
            onClick={handleShuffle}
            disabled={loading || tasks.length === 0}
            className="bg-gold hover:bg-gold/90 disabled:opacity-50 text-void font-display text-xs sm:text-sm px-4 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
            <span>SHUFFLE {WEEKDAYS.find(w => w.id === selectedDay)?.short}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ==================================================================== */}
        {/* Weekday Memory Selector Capsule Strip                                */}
        {/* ==================================================================== */}
        <section className="glass border border-pulsar/30 rounded-xl p-3 sm:p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-starlight flex items-center gap-1.5">
              <Star className="w-4 h-4 text-gold fill-current" /> Weekday Memory Slots
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-mono text-pulsar bg-pulsar/10 border border-pulsar/30 px-3 py-1 rounded-full">
              <Share2 className="w-3 h-3" /> Ready for Calendar & Reminders Sync
            </span>
          </div>

          {/* Capsule Pills */}
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map((day) => {
              const isSelected = selectedDay === day.id;
              const isToday = currentTodayId === day.id;
              const cap = weekdayCapacities[day.id] || 240;

              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cosmic border-gold text-starlight  font-bold scale-[1.03]'
                      : isToday
                      ? 'glass border-pulsar/40 text-starlight hover:border-gold'
                      : 'glass border-pulsar/30 text-nova/60 hover:text-starlight hover:border-blue-900/40'
                  }`}
                >
                  <span className="font-display text-xs">{day.short}</span>
                  {isToday && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full mt-1 ${isSelected ? 'bg-gold text-void font-bold' : 'bg-pulsar/20 text-pulsar'}`}>
                      Today
                    </span>
                  )}
                  <span className={`text-[9px] font-mono mt-1 ${isSelected ? 'text-gold' : 'text-nova/60'}`}>
                    {cap}m
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Day Chunking & Time Spending Pie Chart */}
        <DayChunker tasks={tasks} selectedDay={selectedDay} onRefreshTasks={refetch} />

        {/* Launch Pad Active Banner */}
        <AnimatePresence>
          {activeTask && (
            <motion.section
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="relative rounded-xl p-5 glass border-2 border-gold  overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 bottom-0 bg-gold/10 transition-all duration-1000 pointer-events-none"
                style={{
                  width: `${Math.min(100, (timerSeconds / ((activeTask.estimated_minutes || 30) * 60)) * 100)}%`,
                }}
              />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-gold animate-ping" />
                    <span className="text-xs font-mono uppercase tracking-widest text-gold font-bold">
                      Launch Pad Active - {WEEKDAYS.find(w => w.id === selectedDay)?.label}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-sm font-body font-bold text-starlight mt-1">
                    {activeTask.title}
                  </h2>

                  {activeCue && (
                    <div className="mt-2 text-xs bg-gold/15 border border-gold/50 text-starlight px-3 py-1.5 rounded-xl flex items-center gap-2 font-body">
                      <Zap className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span><strong>First Step:</strong> {activeCue}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-gold">
                      {formatTimer(timerSeconds)}
                    </div>
                    <div className="text-[11px] font-mono text-nova/60">
                      Est: {activeTask.estimated_minutes || 30}m
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="p-2.5 rounded-xl glass border border-pulsar/40 text-starlight hover:border-gold transition-all"
                    >
                      {isTimerRunning ? <Pause className="w-4 h-4 text-gold" /> : <Play className="w-4 h-4 text-emerald" />}
                    </button>
                    <button
                      onClick={() => handleMarkDone(activeTask)}
                      className="bg-emerald hover:bg-emerald/90 text-void font-display text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Selected Weekday Capacity Controls */}
        <div className="glass border border-pulsar/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-nova/60">
              Capacity for <strong className="text-starlight font-display">{WEEKDAYS.find(w => w.id === selectedDay)?.label}</strong>:
            </span>
            <span className="font-bold text-gold">
              {dayAllocatedMinutes}m / {weekdayCapacities[selectedDay] || 240}m
            </span>
            <span className="text-nova/60">
              ({Math.round((dayAllocatedMinutes / (weekdayCapacities[selectedDay] || 240)) * 100)}% filled)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-nova/60">Adjust Budget:</span>
            <select
              value={weekdayCapacities[selectedDay] || 240}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setWeekdayCapacities(prev => ({ ...prev, [selectedDay]: val }));
              }}
              className="bg-void border border-pulsar/40 text-xs font-mono font-bold text-gold rounded-lg px-2.5 py-1 outline-none cursor-pointer"
            >
              <option value={120}>2h (120m)</option>
              <option value={180}>3h (180m)</option>
              <option value={240}>4h (240m)</option>
              <option value={300}>5h (300m)</option>
              <option value={360}>6h (360m)</option>
              <option value={480}>8h (480m)</option>
            </select>
          </div>
        </div>

        {/* Task Cards Stack */}
        {loading ? (
          <div className="p-12 text-center text-sm text-nova/60 glass border border-pulsar/30 rounded-xl font-body">
            Loading weekday schedule & scoring tasks...
          </div>
        ) : dayTasks.length === 0 ? (
          <div className="p-12 text-center text-sm text-nova/60 glass border border-pulsar/30 rounded-xl font-body italic">
            No tasks planned for {WEEKDAYS.find(w => w.id === selectedDay)?.label} yet. Select another day or dump new tasks in the TASK VOMIT!
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {dayTasks.map((task, index) => (
                <WeekdayTaskCard
                  key={task.id}
                  task={task}
                  rank={index + 1}
                  showScore={showScores}
                  selectedDay={selectedDay}
                  isActive={activeTask && activeTask.id === task.id}
                  onStart={() => handleStartTask(task)}
                  onMarkDone={() => handleMarkDone(task)}
                  onAssignDay={(dayId) => assignTaskToWeekday(task.id, dayId)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function WeekdayTaskCard({ task, rank, showScore, selectedDay, isActive, onStart, onMarkDone, onAssignDay }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-xl p-4 glass border transition-all duration-200 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 ${
        isActive
          ? 'bg-cosmic border-gold '
          : 'border-pulsar/30 hover:border-gold/50 hover:bg-pulsar/10'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="h-7 w-7 rounded-xl bg-void border border-pulsar/40 flex items-center justify-center text-xs font-mono font-bold text-gold shrink-0">
          #{rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-body font-semibold text-starlight truncate">
              {task.title}
            </h3>

            {(showScore || isHovered) && task.wsjfScore !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold bg-gold/15 border border-gold/40 text-gold px-2.5 py-0.5 rounded-full">
                <Award className="w-3 h-3 text-gold" />
                <span>WSJF: {task.wsjfScore}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-mono text-nova/60">
            <span className="flex items-center gap-1 bg-void px-2 py-0.5 rounded-lg border border-pulsar/40">
              <Clock className="w-3 h-3 text-pulsar" />
              <span>{task.estimated_minutes || 30}m</span>
            </span>

            {task.deadline && (
              <span className="flex items-center gap-1 bg-void px-2 py-0.5 rounded-lg border border-pulsar/40">
                <Calendar className="w-3 h-3 text-gold" />
                <span>{task.deadline}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-void border border-pulsar/40 px-2.5 py-1 rounded-xl text-xs font-mono text-nova/60">
          <span>Move:</span>
          <select
            value={task.scheduled_day || selectedDay}
            onChange={(e) => onAssignDay(e.target.value)}
            className="bg-transparent text-gold font-bold outline-none cursor-pointer"
          >
            {WEEKDAYS.map((w) => (
              <option key={w.id} value={w.id} className="bg-void text-starlight">
                {w.short}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onStart}
          className="bg-gold/15 hover:bg-gold text-gold hover:text-void border border-gold/40 hover:border-gold font-display text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Start</span>
        </button>

        <button
          onClick={onMarkDone}
          className="p-2 rounded-xl glass border border-pulsar/30 text-nova/60 hover:text-emerald transition-all cursor-pointer"
          title="Mark done"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}



