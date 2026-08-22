import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Flame, Check, Target, ChevronRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DayBriefView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFire, setShowFire] = useState(false);

  useEffect(() => {
    fetchImportantTasks();
  }, []);

  const fetchImportantTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'done')
      .in('quadrant', ['urgent_important', 'important_not_urgent'])
      .order('status', { ascending: false }); // 'active' might sort before 'inbox' depending on logic, or we can just show them all
    
    setTasks(data || []);
    setLoading(false);
  };

  const affirmations = [
    "I am an engineer capable of solving any problem.",
    "My focus is a laser; distractions burn away.",
    "I possess the discipline to execute my plans.",
    "I am building the foundation for my future at TU Delft.",
    "Fear is just fuel for my ambition."
  ];

  const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

  if (loading) return <div className="p-8 text-dim">Loading your brief...</div>;

  const urgent = tasks.filter(t => t.quadrant === 'urgent_important');
  const strategic = tasks.filter(t => t.quadrant === 'important_not_urgent');

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-8 space-y-8 pb-32">
      <div className="flex justify-between items-end border-b border-blue-900/30 pb-4">
        <div>
          <h2 className="text-3xl font-display text-starlight tracking-widest">DAY BRIEF</h2>
          <p className="text-dim font-body italic mt-2">Your critical targets for today.</p>
        </div>
        <button 
          onClick={() => setShowFire(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-500 border border-amber-500/40 rounded-xl hover:bg-amber-500/30 transition-all font-display tracking-widest"
        >
          <Flame className="w-4 h-4" /> IGNITE
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass border border-orange-500/30 rounded-2xl p-6 space-y-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <h3 className="font-display tracking-widest text-orange-400 flex items-center gap-2">
            <Flame className="w-5 h-5" /> DO FIRST (URGENT & IMPORTANT)
          </h3>
          {urgent.length === 0 ? (
            <p className="text-dim italic">Clear skies. No urgent fires to put out.</p>
          ) : (
            <div className="space-y-2">
              {urgent.map(t => (
                <div key={t.id} className="flex items-start gap-3 glass bg-void/50 p-3 rounded-xl border border-white/5">
                  <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span className="text-starlight font-body">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass border border-blue-500/30 rounded-2xl p-6 space-y-4 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <h3 className="font-display tracking-widest text-pulsar flex items-center gap-2">
            <Target className="w-5 h-5" /> STRATEGIC (IMPORTANT)
          </h3>
          {strategic.length === 0 ? (
            <p className="text-dim italic">No strategic targets defined.</p>
          ) : (
            <div className="space-y-2">
              {strategic.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-start gap-3 glass bg-void/50 p-3 rounded-xl border border-white/5">
                  <ChevronRight className="w-4 h-4 text-pulsar mt-0.5 shrink-0" />
                  <span className="text-starlight font-body">{t.title}</span>
                </div>
              ))}
              {strategic.length > 5 && (
                <p className="text-xs text-dim italic pl-2">...and {strategic.length - 5} more.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFire && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-void/90 p-4 backdrop-blur-sm"
          >
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
              <div className="w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[100px] animate-pulse" />
              <div className="absolute w-[300px] h-[300px] bg-red-600/30 rounded-full blur-[80px] animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
            
            <div className="relative glass border-2 border-orange-500/50 p-10 rounded-3xl max-w-2xl text-center shadow-[0_0_100px_rgba(245,158,11,0.4)]">
              <Flame className="w-16 h-16 text-orange-500 mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl md:text-5xl font-display tracking-widest text-white mb-8 leading-tight drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">
                "{randomAffirmation}"
              </h2>
              <button 
                onClick={() => setShowFire(false)}
                className="px-8 py-3 bg-orange-500 text-void font-bold font-display tracking-widest rounded-xl hover:bg-orange-400 transition-colors"
              >
                LET'S GO
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
