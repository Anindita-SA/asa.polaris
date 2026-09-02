import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTodaysTasks } from '../../hooks/useTodaysTasks';
import { useMorningBrief } from '../../hooks/useMorningBrief';
import { Flame, Check, Target, ChevronRight, Zap, Sparkles, RefreshCw, Rocket } from 'lucide-react';
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
  const [applyingIds, setApplyingIds] = useState(new Set()); // For "Flag to Apply" loading state
  const [noNewOpp, setNoNewOpp] = useState(false);

  const fetchedRef = React.useRef(false);
  useEffect(() => {
    if (user?.id && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchExtras();
    }
  }, [user?.id]);

  const fetchExtras = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const [briefRes, goalRes] = await Promise.all([
      supabase.from('morning_briefs').select('items').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('goals').select('title').eq('user_id', user.id).eq('scope', 'weekly').eq('completed', false).order('created_at', { ascending: true }).limit(1).maybeSingle()
    ]);
    
    let items = briefRes.data?.items || [];
    let oppItems = items.filter(i => i.type === 'opportunity' || i.hardware_opportunity_id);
    let noNewOpp = false;

    // Tweak: if no opportunities fetched, get top previous ones
    if (oppItems.length === 0) {
      const { data: pastOpps } = await supabase
        .from('hardware_opportunities')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['new', 'drafting'])
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (pastOpps && pastOpps.length > 0) {
        noNewOpp = true;
        const mappedOpps = pastOpps.map(o => ({
          title: o.title,
          summary: o.what_offered || 'No description available',
          url: o.url,
          deadline: o.deadline,
          effort: o.effort,
          hardware_opportunity_id: o.id,
          type: 'opportunity',
          source_name: 'Database'
        }));
        items = [...items, ...mappedOpps];
      }
    }

    const hwIds = items.filter(i => i.hardware_opportunity_id).map(i => i.hardware_opportunity_id);
    
    let appliedIds = new Set();
    if (hwIds.length > 0) {
      const { data: hwData } = await supabase.from('hardware_opportunities').select('id, status').in('id', hwIds);
      if (hwData) {
        hwData.filter(h => h.status === 'applied').forEach(h => appliedIds.add(h.id));
      }
    }

    const enhancedItems = items.map(item => {
      if (item.hardware_opportunity_id && appliedIds.has(item.hardware_opportunity_id)) {
        return { ...item, isApplied: true };
      }
      return item;
    });

    setBriefItems(enhancedItems);
    setWeeklyGoal(goalRes.data?.title || 'None');
    setNoNewOpp(noNewOpp);
    setLoadingExtras(false);
  };

  const handleManualGenerate = async (force = false) => {
    await generateBrief(force);
    setBriefAttempted(true);
    await fetchExtras();
  };

  const flagToApply = async (item, index) => {
    if (!item.hardware_opportunity_id) return;
    setApplyingIds(prev => new Set(prev).add(index));
    
    let newTaskId;
    const { data: taskData } = await supabase.from('tasks').insert({
      title: `Apply for: ${item.title}`,
      notes: `URL: ${item.url || ''}\nDeadline: ${item.deadline || 'Unknown'}`,
      status: 'active',
      quadrant: 'important_not_urgent',
      deadline: item.deadline || null,
      user_id: user.id
    }).select().single();
    
    if (taskData) newTaskId = taskData.id;

    if (newTaskId) {
      await supabase.from('hardware_opportunities')
        .update({ status: 'applied', task_id: newTaskId })
        .eq('id', item.hardware_opportunity_id);
    }
    
    await fetchExtras();
    setApplyingIds(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const affirmations = ["I am an engineer capable of solving any problem.", "My focus is a laser; distractions burn away.", "Fear is just fuel for my ambition."];
  const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

  if (tasksLoading || loadingExtras) return <div className="p-8 text-nova/60">Loading your brief...</div>;

  const urgent = todaysTasks.filter(t => !t.completed && t.quadrant === 'urgent_important');
  const strategic = todaysTasks.filter(t => !t.completed && t.quadrant === 'important_not_urgent');

  const oppItems = briefItems.filter(i => i.type === 'opportunity' || i.hardware_opportunity_id);
  const newsItems = briefItems.filter(i => i.type === 'news' || (!i.type && !i.hardware_opportunity_id));

  return (
    <div className="w-full p-4 sm:p-8 space-y-8 pb-32">
      <div className="flex justify-between items-end border-b border-pulsar/40 pb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-starlight">Day Brief</h2>
          <p className="text-nova/60 font-body italic mt-2">Your critical targets for today.</p>
        </div>
        <button onClick={() => { setShowFire(true); localStorage.setItem('polaris_ignite_date', new Date().toLocaleDateString('en-CA')); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-500 border border-amber-500/40 rounded-xl hover:bg-amber-500/30 transition-all font-display">
          <Flame className="w-4 h-4" /> Ignite
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={() => handleManualGenerate(briefItems.length > 0)} disabled={isGenerating} className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-nova/60 hover:text-amber-400 bg-pulsar/10 hover:bg-amber-500/10 border border-pulsar/30 hover:border-amber-500/30 rounded-lg transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-500' : ''}`} />
          {isGenerating ? 'GENERATING...' : (briefItems.length > 0 || briefAttempted) ? 'REGENERATE BRIEF' : 'GENERATE BRIEF'}
        </button>
      </div>

      {oppItems.length > 0 && (
        <div className="glass border border-amber-500/30 rounded-xl p-6">
          <h3 className="text-lg font-display text-amber-400 flex items-center gap-2 mb-4">
            <Rocket className="w-5 h-5" /> Curated Opportunities
          </h3>
          {noNewOpp && (
            <p className="text-sm font-body text-nova/60 italic mb-4">
              Scout did not find any new eligible opportunities today. Here are the most suitable ones from your backlog.
            </p>
          )}
          <div className="space-y-4">
            {oppItems.map((item, i) => {
              const originalIndex = briefItems.indexOf(item);
              const isApplying = applyingIds.has(originalIndex);
              return (
                <div key={i} className="glass bg-void/70 border border-amber-500/20 p-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="text-lg font-display text-starlight leading-tight mb-2">{item.title}</h4>
                      <div className="flex flex-wrap gap-2 text-xs font-mono mb-2">
                        <span className="text-amber-400/80 border border-amber-500/20 bg-amber-500/10 px-2 py-1 rounded">{item.source_name || 'Scout'}</span>
                        {item.effort && <span className="text-nova/70 border border-pulsar/30 px-2 py-1 rounded">Effort: {item.effort}</span>}
                        {item.deadline && <span className="text-nova/70 border border-pulsar/30 px-2 py-1 rounded">Deadline: {item.deadline}</span>}
                      </div>
                    </div>
                    {item.hardware_opportunity_id && (
                      <button
                        onClick={() => flagToApply(item, originalIndex)}
                        disabled={item.isApplied || isApplying}
                        className={`shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs font-display rounded-lg transition-colors border ${
                          item.isApplied 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 opacity-70'
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/40'
                        }`}
                      >
                        {item.isApplied ? <><Check className="w-3.5 h-3.5" /> Added to Tasks</> : <><Target className="w-3.5 h-3.5" /> Flag to Apply</>}
                      </button>
                    )}
                  </div>
                  <p className="font-body text-nova/70 text-sm leading-relaxed">{item.summary}</p>
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-mono text-amber-400/90 hover:text-amber-300 hover:underline">Read more &rarr;</a>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {newsItems.length > 0 && (
        <div className="glass border border-pulsar/30 rounded-xl p-6">
          <h3 className="text-lg font-display text-pulsar flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" /> News & Tech Breakthroughs
          </h3>
          <div className="space-y-4">
            {newsItems.map((item, i) => (
              <div key={i} className="glass bg-void/70 border border-pulsar/20 p-4 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                  <h4 className="text-lg font-display text-starlight leading-tight">{item.title}</h4>
                  <span className="text-xs font-mono text-pulsar/80 shrink-0 border border-pulsar/20 bg-pulsar/10 px-2 py-1 rounded">{item.source_name}</span>
                </div>
                <p className="font-body text-nova/60 text-sm leading-relaxed">{item.summary}</p>
                {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2.5 text-xs font-mono text-pulsar hover:text-blue-300 hover:underline">Read more &rarr;</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-starlight font-body text-lg border-l-2 border-nova pl-4 py-1">
        Today: <span className="text-orange-400 font-bold">{urgent.length}</span> urgent, <span className="text-pulsar font-bold">{strategic.length}</span> strategic. <br/>This week's push: <span className="text-nova font-bold">{weeklyGoal}</span>.
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass border border-orange-500/30 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-display text-orange-400 flex items-center gap-2"><Flame className="w-5 h-5" /> Do First</h3>
          {urgent.length === 0 ? <p className="text-nova/60 italic">Clear skies.</p> : <div className="space-y-2">{urgent.map(t => <div key={t.id} className="flex items-start gap-3 glass bg-void/70 p-3 rounded-xl border border-pulsar/30"><ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" /><span className="text-starlight font-body">{t.title}</span></div>)}</div>}
        </div>
        <div className="glass border border-blue-500/30 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-display text-pulsar flex items-center gap-2"><Target className="w-5 h-5" /> Strategic</h3>
          {strategic.length === 0 ? <p className="text-nova/60 italic">No targets defined.</p> : <div className="space-y-2">{strategic.map(t => <div key={t.id} className="flex items-start gap-3 glass bg-void/70 p-3 rounded-xl border border-pulsar/30"><ChevronRight className="w-4 h-4 text-pulsar mt-0.5 shrink-0" /><span className="text-starlight font-body">{t.title}</span></div>)}</div>}
        </div>
      </div>

      <AnimatePresence>
        {showFire && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-md">
            <div className="text-center space-y-8 p-6">
              <Flame className="w-32 h-32 text-amber-500 mx-auto" />
              <h3 className="text-2xl font-display text-starlight">Day Ignited</h3>
              <p className="text-xl font-body text-amber-500 italic">"{randomAffirmation}"</p>
              <button onClick={() => setShowFire(false)} className="mt-8 px-8 py-3 glass border border-amber-500/50 text-amber-500 rounded-xl">Engage</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
