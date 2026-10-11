import React, { useState, useMemo } from 'react';
import {
  BLUEPRINT_COUNTDOWNS,
  BLUEPRINT_SCHEDULE,
  calculateDaysRemaining,
} from '../../data/blueprintSchedule';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  ShieldAlert,
  Sparkles,
  Target,
  GraduationCap,
  PartyPopper,
  Check,
} from 'lucide-react';

const TAG_STYLES = {
  TODAY: {
    badge: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  'STUDY DAY': {
    badge: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
    dot: 'bg-sky-400',
  },
  'EXAM DAY': {
    badge: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
    dot: 'bg-rose-400',
  },
  FESTIVAL: {
    badge: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  RECOVERY: {
    badge: 'border-purple-400/40 bg-purple-400/10 text-purple-300',
    dot: 'bg-purple-400',
  },
};

export default function BlueprintView() {
  const [filter, setFilter] = useState('all');

  const [completedDays, setCompletedDays] = useState(() => {
    const initial = {};
    BLUEPRINT_SCHEDULE.forEach((day) => {
      try {
        const val = localStorage.getItem(`polaris_blueprint_done_${day.id}`);
        if (val === 'true') {
          initial[day.id] = true;
        }
      } catch {
        // Safe fallback in storage restricted environments
      }
    });
    return initial;
  });

  const toggleDone = (dayId) => {
    setCompletedDays((prev) => {
      const nextDone = !prev[dayId];
      try {
        if (nextDone) {
          localStorage.setItem(`polaris_blueprint_done_${dayId}`, 'true');
        } else {
          localStorage.removeItem(`polaris_blueprint_done_${dayId}`);
        }
      } catch {
        // Safe fallback
      }
      return { ...prev, [dayId]: nextDone };
    });
  };

  const filteredSchedule = useMemo(() => {
    if (filter === 'exams') {
      return BLUEPRINT_SCHEDULE.filter((day) => Boolean(day.exam));
    }
    return BLUEPRINT_SCHEDULE;
  }, [filter]);

  const completedCount = useMemo(() => {
    return Object.values(completedDays).filter(Boolean).length;
  }, [completedDays]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col p-3 sm:p-6 space-y-4 text-starlight font-body">
      {/* Top Banner: Cap Discipline and Filters */}
      <div className="glass border border-pulsar/30 bg-void/60 rounded-2xl p-3.5 sm:p-4 shadow-xl shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300 text-xs font-mono font-medium shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Strict 1-Primary / Day Cap Active</span>
          </div>
          <span className="text-xs text-nova/60 font-mono">
            {completedCount} / {BLUEPRINT_SCHEDULE.length} Primaries Completed
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto bg-stardust/80 border border-pulsar/30 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-cosmic text-starlight border border-pulsar/50 font-bold shadow'
                : 'text-nova/60 hover:text-starlight hover:bg-pulsar/10'
            }`}
          >
            All Days ({BLUEPRINT_SCHEDULE.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('exams')}
            className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === 'exams'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow'
                : 'text-nova/60 hover:text-rose-300 hover:bg-rose-500/10'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Exams Only (4)</span>
          </button>
        </div>
      </div>

      {/* Milestone Countdowns Banner */}
      <div className="glass border border-pulsar/30 bg-void/60 rounded-2xl p-3 sm:p-4 shadow-xl shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-nova/80 font-bold">
              Milestone Countdown Deck
            </h2>
          </div>
          <span className="text-[11px] font-mono text-nova/50">
            Anchor: Sun Oct 11, 2026
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {BLUEPRINT_COUNTDOWNS.map((milestone) => {
            const daysLeft = calculateDaysRemaining(milestone.date);
            const isExam = milestone.type === 'exam';

            let countLabel = '';
            if (daysLeft === 0) {
              countLabel = 'TODAY';
            } else if (daysLeft === 1) {
              countLabel = 'TOMORROW';
            } else if (daysLeft > 1) {
              countLabel = `${daysLeft}d left`;
            } else {
              countLabel = `${Math.abs(daysLeft)}d ago`;
            }

            return (
              <div
                key={milestone.label}
                className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-all ${
                  isExam
                    ? 'border-rose-500/30 bg-rose-500/10 hover:border-rose-500/50'
                    : 'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-starlight truncate">
                    {milestone.label}
                  </span>
                  {isExam ? (
                    <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <PartyPopper className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                  <span className="text-nova/60">{milestone.date.slice(5)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      daysLeft === 0
                        ? 'bg-amber-400 text-void font-bold animate-pulse'
                        : isExam
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {countLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Day Cards List */}
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
        {filteredSchedule.map((day) => {
          const isDone = Boolean(completedDays[day.id]);
          const tagStyle = TAG_STYLES[day.tag] || {
            badge: 'border-pulsar/40 bg-pulsar/10 text-nova',
            dot: 'bg-pulsar',
          };

          return (
            <div
              key={day.id}
              className={`rounded-2xl p-4 transition-all duration-200 border ${
                day.isToday
                  ? 'border-amber-400/50 bg-amber-400/5 shadow-lg shadow-amber-500/5'
                  : 'glass border-pulsar/30 bg-void/60 hover:border-pulsar/50'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  {day.isToday ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                    </span>
                  ) : (
                    <Calendar className="w-3.5 h-3.5 text-nova/50" />
                  )}

                  <span className="font-display font-bold text-base text-starlight tracking-wide">
                    {day.date}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono border font-semibold ${tagStyle.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${tagStyle.dot}`} />
                    {day.tag}
                  </span>

                  {day.exam && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <Flame className="w-3 h-3 text-rose-400" />
                      Exam: {day.exam}
                    </span>
                  )}
                </div>

                <div className="text-xs text-nova/70 font-mono italic">
                  {day.reality}
                </div>
              </div>

              {/* Primary Focus Block */}
              <div className="mt-3 p-3 rounded-xl border border-white/5 bg-stardust/40 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-gold font-bold">
                    <Target className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>Primary Focus (Single-Cap)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleDone(day.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-cosmic/80 text-nova/80 hover:text-starlight hover:bg-cosmic border border-pulsar/30'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5 text-nova/40" />
                        <span>Mark Done</span>
                      </>
                    )}
                  </button>
                </div>

                <p
                  className={`text-sm leading-relaxed transition-all ${
                    isDone
                      ? 'line-through text-nova/50 italic'
                      : 'text-starlight font-medium'
                  }`}
                >
                  {day.primaryFocus}
                </p>
              </div>

              {/* Secondary Focus Block */}
              <div className="mt-2.5 px-3 py-2 rounded-xl bg-void/40 border border-white/5 flex flex-col sm:flex-row sm:items-baseline gap-1.5 text-xs">
                <span className="font-mono text-[11px] uppercase tracking-wider text-nova/50 shrink-0 font-medium">
                  Support / Reset:
                </span>
                <span className="text-nova/80 leading-relaxed font-body">
                  {day.secondaryFocus}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
