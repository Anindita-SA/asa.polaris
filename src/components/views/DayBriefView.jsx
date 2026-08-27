import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTodaysTasks } from '../../hooks/useTodaysTasks';
import { useMorningBrief } from '../../hooks/useMorningBrief';
import { Flame, Check, Target, ChevronRight, Zap, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DayBriefView() {
  const { user } = useAuth();
  const { tasks: todaysTasks, isLoading: tasksLoading } = useTodaysTasks();
  const { generateBrief, isGenerating } = useMorningBrief({ autoRun: false });
  
  const [briefItems, setBriefItems] = useState([]);
  const [weeklyGoal, setWeeklyGoal] = useState(null);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [showFire, setShowFire] = useState(false);
  const [briefAttempted, setBriefAttempted] = useState(false);

  const fetchedRef = React.useRef(false);
  useEffect(() => {
    if (user?.id && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchExtras();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchExtras = async () => {
    console.log('[DayBriefView] fetchExtras called (Data loading triggered)');
    const today = new Date().toLocaleDateString('en-CA');
    
    const [briefRes, goalRes] = await Promise.all([
      supabase
        .from('morning_briefs')
        .select('items')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('goals')
        .select('title')
        .eq('user_id', user.id)
        .eq('scope', 'weekly')
        .eq('completed', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
    ]);
    
    console.log('[DayBriefView] morning_briefs row items array:', briefRes.data?.items);
    if (briefRes.data?.items) {
      briefRes.data.items.forEach((item, idx) => {
        console.log(`[DayBriefView] item[${idx}] url:`, item.url);
      });
    }

    setBriefItems(briefRes.data?.items || []);
    setWeeklyGoal(goalRes.data?.title || 'None');
    setLoadingExtras(false);
  };

  const handleManualGenerate = async (force = false) => {
    await generateBrief(force);
    setBriefAttempted(true);
    await fetchExtras();
  };

  const affirmations = [
    "I am an engineer capable of solving any problem.",
    "My focus is a laser; distractions burn away.",
    "I possess the discipline to execute my plans.",
    "I am building the foundation for my future at TU Delft.",
    "Fear is just fuel for my ambition."
  ];

  const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

  if (tasksLoading || loadingExtras) return <div className="p-8 text-dim">Loading your brief...</div>;

  const urgent = todaysTasks.filter(t => !t.completed && t.quadrant === 'urgent_important');
  const strategic = todaysTasks.filter(t => !t.completed && t.quadrant === 'important_not_urgent');

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide p-4 sm:p-8 space-y-8 pb-32">
      <div className="flex justify-between items-end border-b border-blue-900/30 pb-4">
        <div>
          <h2 className="text-3xl font-display text-starlight ">Day Brief</h2>
          <p className="text-dim font-body italic mt-2">Your critical targets for today.</p>
        </div>
        <button 
          onClick={() => {
            setShowFire(true);
            localStorage.setItem('polaris_ignite_date', new Date().toLocaleDateString('en-CA'));
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-500 border border-amber-500/40 rounded-xl hover:bg-amber-500/30 transition-all font-display "
        >
          <Flame className="w-4 h-4" /> Ignite
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleManualGenerate(briefItems.length > 0)}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-display text-dim hover:text-amber-400 bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-500' : ''}`} />
          {isGenerating ? 'GENERATING...' : (briefItems.length > 0 || briefAttempted) ? 'REGENERATE BRIEF' : 'GENERATE BRIEF'}
        </button>
        {briefAttempted && !isGenerating && (
          <span className="text-xs font-mono text-danger">Check console if failed.</span>
        )}
      </div>

      {briefItems.length > 0 && (
        <div className="glass border border-amber-500/30 rounded-2xl p-6 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <h3 className="font-display text-amber-400 flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" /> Morning Spark
          </h3>
          <div className="space-y-4">
            {briefItems.map((item, i) => (
              <div key={i} className="glass bg-void/50 border border-white/5 p-4 rounded-xl">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="font-display text-starlight leading-tight">{item.title}</h4>
                  <span className="text-[10px] font-mono text-amber-400/80 shrink-0 border border-amber-500/20 bg-amber-500/10 px-2 py-1 rounded">
                    {item.source_name}
                  </span>
                </div>
                <p className="font-body text-dim text-sm leading-relaxed">{item.summary}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2.5 text-xs font-mono text-amber-400/90 hover:text-amber-300 hover:underline transition-colors"
                  >
                    Read more &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Paragraph */}
      <div className="text-starlight font-body text-lg border-l-2 border-nova pl-4 py-1">
        Today: <span className="text-orange-400 font-bold">{urgent.length}</span> urgent, <span className="text-pulsar font-bold">{strategic.length}</span> strategic. 
        <br/>
        This week's push: <span className="text-nova font-bold">{weeklyGoal}</span>.
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass border border-orange-500/30 rounded-2xl p-6 space-y-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <h3 className="font-display text-orange-400 flex items-center gap-2">
            <Flame className="w-5 h-5" /> Do First (Urgent & Important)
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
          <h3 className="font-display text-pulsar flex items-center gap-2">
            <Target className="w-5 h-5" /> Strategic (Important)
          </h3>
          {strategic.length === 0 ? (
            <p className="text-dim italic">No strategic targets defined.</p>
          ) : (
            <div className="space-y-2">
              {strategic.map(t => (
                <div key={t.id} className="flex items-start gap-3 glass bg-void/50 p-3 rounded-xl border border-white/5">
                  <ChevronRight className="w-4 h-4 text-pulsar mt-0.5 shrink-0" />
                  <span className="text-starlight font-body">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFire && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md"
          >
            <div className="text-center space-y-8 max-w-lg p-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-32 h-32 rounded-full bg-amber-500 mx-auto flex items-center justify-center shadow-[0_0_100px_rgba(245,158,11,0.5)]"
              >
                <Flame className="w-16 h-16 text-void" />
              </motion.div>
              
              <div className="space-y-4">
                <h3 className="text-4xl font-display text-starlight ">Day Ignited</h3>
                <p className="text-xl font-body text-amber-500 italic">
                  "{randomAffirmation}"
                </p>
              </div>

              <button 
                onClick={() => setShowFire(false)}
                className="mt-8 px-8 py-3 glass border border-amber-500/50 text-amber-500 rounded-xl hover:bg-amber-500/10 transition-colors font-display "
              >
                Engage
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
