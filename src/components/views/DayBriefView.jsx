import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTodaysTasks } from '../../hooks/useTodaysTasks';
import { useMorningBrief } from '../../hooks/useMorningBrief';
import { Flame, Check, Target, ChevronRight, Sparkles, RefreshCw, Rocket, X, Bookmark, AlignLeft, Star, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DismissFeedbackModal from '../modals/DismissFeedbackModal';
import { safeExternalUrl } from '../../lib/urlUtils';
import { offlineSelect, offlineInsert, offlineUpdate } from '../../lib/offlineApi';
import db from '../../lib/offlineStore';
import { parseOpportunityBreakdown, formatTwoSentenceSummary } from '../../lib/opportunityUtils';

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
  const [savingNewsIds, setSavingNewsIds] = useState(new Set());
  const [dismissTargetOpp, setDismissTargetOpp] = useState(null);
  const [noNewOpp, setNoNewOpp] = useState(false);
  const [dailyGoals, setDailyGoals] = useState([]);
  const [expandedOppIds, setExpandedOppIds] = useState(new Set());
  const fetchedRef = React.useRef(false);

  const toggleOppExpand = (id) => {
    setExpandedOppIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (user?.id && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchExtras();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const handleBriefUpdated = (e) => {
      if (e?.detail?.table && e.detail.table !== 'morning_briefs') return;
      fetchExtras();
    };
    window.addEventListener('polaris-morning-brief-updated', handleBriefUpdated);
    window.addEventListener('polaris-tasks-changed', handleBriefUpdated);
    return () => {
      window.removeEventListener('polaris-morning-brief-updated', handleBriefUpdated);
      window.removeEventListener('polaris-tasks-changed', handleBriefUpdated);
    };
  }, [user?.id]);

  const fetchExtras = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const [briefRes, goalRes] = await Promise.all([
      offlineSelect('morning_briefs', { user_id: user.id, date: today }),
      offlineSelect('goals', { user_id: user.id })
    ]);
    
    let items = briefRes.data?.[0]?.items || [];
    const hasNewsItem = (arr) => Array.isArray(arr) && arr.some(i => i.type === 'news' || (!i.type && !i.hardware_opportunity_id));

    // Fallback to Supabase if Dexie has no items or lacks news items yet
    if ((items.length === 0 || !hasNewsItem(items)) && typeof navigator !== 'undefined' && navigator.onLine && supabase?.from) {
      try {
        const { data: sbBrief } = await supabase
          .from('morning_briefs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (sbBrief?.items && sbBrief.items.length > 0 && (items.length === 0 || hasNewsItem(sbBrief.items))) {
          items = sbBrief.items;
          if (db?.morning_briefs) {
            await db.morning_briefs.put(sbBrief);
          }
        }
      } catch (err) {
        console.warn('Direct Supabase fallback for morning brief in DayBriefView failed:', err);
      }
    }
    let oppItems = items.filter(i => i.type === 'opportunity' || i.hardware_opportunity_id);
    let noNewOpp = false;

    // Tweak: if no opportunities fetched, get top previous ones
    if (oppItems.length === 0) {
      const { data: allOpps } = await offlineSelect('hardware_opportunities', { user_id: user.id });
      const pastOpps = (allOpps || [])
        .filter(o => o.status === 'new')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 3);
      
      if (pastOpps && pastOpps.length > 0) {
        noNewOpp = true;
        const mappedOpps = pastOpps.map(o => ({
          title: o.title,
          summary: o.project_fit || o.what_offered || 'No description available',
          url: o.url,
          deadline: o.deadline,
          effort: o.effort,
          hardware_opportunity_id: o.id,
          type: 'opportunity',
          source_name: 'Database',
          is_previous: true,
          profile_match: o.profile_match,
          acceptance_chance: o.acceptance_chance,
          project_fit: o.project_fit,
          what_offered: o.what_offered
        }));
        items = [...items, ...mappedOpps];
      }
    }

    const { data: hwData } = await offlineSelect('hardware_opportunities', { user_id: user.id });
    const hwMap = new Map((hwData || []).map(h => [h.id, h]));
    const hwByUrl = new Map((hwData || []).map(h => [h.url, h]));

    // Query media_log to accurately reflect saved reading articles
    const { data: mediaItems } = await offlineSelect('media_log', { user_id: user.id });

    const savedTitles = new Set((mediaItems || []).map(m => m.title?.toLowerCase().trim()));
    const savedUrls = new Set(
      (mediaItems || [])
        .map(m => {
          const match = m.full_review?.match(/URL:\s*(https?:\/\/[^\s\n]+)/i);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean)
    );

    // Filter out any opportunities that are marked rejected
    const activeItems = items.filter(item => {
      const hwObj = (item.hardware_opportunity_id && hwMap.get(item.hardware_opportunity_id)) || (item.url && hwByUrl.get(item.url));
      if (hwObj && hwObj.status === 'rejected') return false;
      return true;
    });

    const enhancedItems = activeItems.map(item => {
      const hwObj = (item.hardware_opportunity_id && hwMap.get(item.hardware_opportunity_id)) || (item.url && hwByUrl.get(item.url));
      const hwId = item.hardware_opportunity_id || hwObj?.id;
      let isApplied = hwObj ? hwObj.status === 'applied' : false;
      let isSaved = item.isSaved || false;
      let isStarred = hwObj ? !!hwObj.is_starred : false;

      if (item.title && savedTitles.has(item.title.toLowerCase().trim())) {
        isSaved = true;
      }
      if (item.url && savedUrls.has(item.url.trim())) {
        isSaved = true;
      }

      // Prefer calibrated and verified fields from hwObj over stale brief items
      const hasCorruptScores = item.profile_match === 80 && item.acceptance_chance === 60;
      const finalMatch = (hwObj?.profile_match != null && (hasCorruptScores || item.profile_match == null)) 
        ? hwObj.profile_match 
        : item.profile_match;
      const finalChance = (hwObj?.acceptance_chance != null && (hasCorruptScores || item.acceptance_chance == null))
        ? hwObj.acceptance_chance
        : item.acceptance_chance;

      return { 
        ...item, 
        hardware_opportunity_id: hwId,
        effort: item.effort || hwObj?.effort,
        deadline: item.deadline || hwObj?.deadline,
        profile_match: finalMatch,
        acceptance_chance: finalChance,
        project_fit: hwObj?.project_fit || item.project_fit,
        what_offered: (hwObj?.what_offered && hwObj.what_offered !== 'Travel and project funding') ? hwObj.what_offered : item.what_offered,
        summary: hwObj?.project_fit || item.summary,
        isApplied, 
        isSaved, 
        isStarred 
      };
    });

    const weeklyGoals = (goalRes.data || [])
      .filter(g => g.scope === 'weekly' && !g.completed)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    const dailyGoals = (goalRes.data || [])
      .filter(g => g.scope === 'daily' && !g.completed)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    setBriefItems(enhancedItems);
    setWeeklyGoal(weeklyGoals[0]?.title || 'None');
    setDailyGoals(dailyGoals);
    setNoNewOpp(noNewOpp);
    setLoadingExtras(false);
  };

  const handleManualGenerate = async (force = false) => {
    await generateBrief(force);
    setBriefAttempted(true);
    await fetchExtras();
  };

  const handleDismissOpportunity = async (opp, reason) => {
    if (!user?.id) return;
    const oppId = opp.hardware_opportunity_id || opp.id;
    const oppUrl = opp.url;

    // 1. Mark in hardware_opportunities if ID exists
    if (oppId) {
      await offlineUpdate('hardware_opportunities', { id: oppId, user_id: user.id }, {
        status: 'rejected',
        rejection_reason: reason || 'Dismissed by user',
        rejected_at: new Date().toISOString()
      });
    } else if (oppUrl) {
      await offlineUpdate('hardware_opportunities', { url: oppUrl, user_id: user.id }, {
        status: 'rejected',
        rejection_reason: reason || 'Dismissed by user',
        rejected_at: new Date().toISOString()
      });
    }

    // 2. Remove from today's morning_briefs
    const today = new Date().toLocaleDateString('en-CA');
    const { data: currentBriefData } = await offlineSelect('morning_briefs', { user_id: user.id, date: today });
    const currentBrief = currentBriefData?.[0];

    if (currentBrief && Array.isArray(currentBrief.items)) {
      const filtered = currentBrief.items.filter(i => 
        (oppId && i.hardware_opportunity_id === oppId) || (oppUrl && i.url === oppUrl) ? false : true
      );
      await offlineUpdate('morning_briefs', { id: currentBrief.id, user_id: user.id }, {
        items: filtered
      });
    }

    await fetchExtras();
  };

  const toggleStar = async (item) => {
    if (!user?.id) return;
    let hwId = item.hardware_opportunity_id;
    if (!hwId && item.url) {
      const { data } = await offlineSelect('hardware_opportunities', { user_id: user.id, url: item.url });
      if (data && data[0]) hwId = data[0].id;
    }
    if (!hwId) return;
    
    const newVal = !item.isStarred;
    await offlineUpdate('hardware_opportunities', 
      { id: hwId, user_id: user.id },
      { is_starred: newVal }
    );

    await fetchExtras();
  };

  const flagToApply = async (item, index) => {
    if (!user?.id) return;
    setApplyingIds(prev => new Set(prev).add(index));
    
    let hwId = item.hardware_opportunity_id;
    if (!hwId && item.url) {
      const { data } = await offlineSelect('hardware_opportunities', { user_id: user.id, url: item.url });
      if (data && data[0]) hwId = data[0].id;
    }

    let newTaskId;
    const newId = crypto.randomUUID();
    const { data: taskData } = await offlineInsert('tasks', {
      id: newId,
      title: `Apply for: ${item.title}`,
      notes: `URL: ${item.url || ''}\nDeadline: ${item.deadline || 'Unknown'}`,
      status: 'active',
      quadrant: 'important_not_urgent',
      deadline: item.deadline || null,
      user_id: user.id
    });
    
    if (taskData && taskData[0]) newTaskId = taskData[0].id;
    else newTaskId = newId;

    if (newTaskId && hwId) {
      await offlineUpdate('hardware_opportunities', 
        { id: hwId, user_id: user.id },
        { status: 'applied', task_id: newTaskId }
      );
        
      // Fire-and-forget subtask generation
      supabase.functions.invoke('generate-application-subtasks', {
        body: {
          parent_task_id: newTaskId,
          opportunity: {
            title: item.title,
            url: item.url,
            deadline: item.deadline,
            effort: item.effort,
            project_fit: item.project_fit || item.summary,
            what_offered: item.what_offered || item.summary
          }
        }
      }).catch(err => console.error('Background subtask generation failed:', err));
    }
    
    await fetchExtras();
    setApplyingIds(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleSaveNewsItem = async (item, index) => {
    if (!user?.id || item.isSaved) return;
    setSavingNewsIds(prev => new Set(prev).add(index));

    try {
      await offlineInsert('media_log', {
        id: crypto.randomUUID(),
        title: item.title,
        author_or_creator: item.source_name || 'Morning Brief',
        media_type: 'article',
        status: 'want_to',
        recommended_by: 'Morning Brief',
        one_line_takeaway: item.summary || null,
        full_review: item.url ? `URL: ${item.url}` : null,
        tags: ['morning-brief', 'article'],
        user_id: user.id
      });

      const updatedBriefItems = briefItems.map((bi, i) => {
        if (i === index || (bi.title === item.title && (bi.url === item.url || bi.source_name === item.source_name))) {
          return { ...bi, isSaved: true };
        }
        return bi;
      });
      setBriefItems(updatedBriefItems);

      const today = new Date().toLocaleDateString('en-CA');
      const { data: currentBriefData } = await offlineSelect('morning_briefs', { user_id: user.id, date: today });
      const currentBrief = currentBriefData?.[0];

      if (currentBrief && Array.isArray(currentBrief.items)) {
        const briefUpdatedItems = currentBrief.items.map(bi => {
          if (bi.title === item.title && (bi.url === item.url || bi.source_name === item.source_name)) {
            return { ...bi, isSaved: true };
          }
          return bi;
        });
        await offlineUpdate('morning_briefs', { id: currentBrief.id, user_id: user.id }, {
          items: briefUpdatedItems
        });
      }
    } catch (err) {
      console.error('Error saving news item to curriculum media log:', err);
    } finally {
      setSavingNewsIds(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
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
              const oppId = item.hardware_opportunity_id || item.url || i;
              const isExpanded = expandedOppIds.has(oppId);
              const breakdown = parseOpportunityBreakdown(item);
              const oppSummary = formatTwoSentenceSummary(breakdown.overview || item.summary || item.project_fit);
              const validUrl = safeExternalUrl(item.url);

              return (
                <div key={i} className="glass bg-void/70 border border-amber-500/20 p-4 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h4 className="text-base sm:text-lg font-display font-bold text-starlight leading-snug">
                          {item.title}
                        </h4>
                        {validUrl && (
                          <a
                            href={validUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-nova/60 hover:text-amber-400 transition-colors p-0.5"
                            title="Open link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Badges: Source, Effort, Deadline, Match % */}
                      <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                        <span className="text-amber-400/90 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
                          {item.source_name || 'Scout'}
                        </span>
                        <span className="text-blue-400 border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded">
                          Effort: {item.effort || 'med'}
                        </span>
                        <span className="text-nova/80 border border-pulsar/40 bg-pulsar/10 px-2 py-0.5 rounded">
                          Deadline: {item.deadline || 'Rolling'}
                        </span>
                        {item.profile_match != null && (
                          <span className={`border px-2 py-0.5 rounded ${
                            item.profile_match >= 80 ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                            item.profile_match >= 50 ? 'border-pulsar/30 text-nova/80 bg-pulsar/10' :
                            'border-red-500/30 text-red-400/80 bg-red-500/10'
                          }`}>
                            Match: {item.profile_match}%
                          </span>
                        )}
                        {item.acceptance_chance != null && (
                          <span className={`border px-2 py-0.5 rounded ${
                            item.acceptance_chance >= 60 ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                            item.acceptance_chance >= 30 ? 'border-pulsar/30 text-nova/80 bg-pulsar/10' :
                            'border-red-500/30 text-red-400/80 bg-red-500/10'
                          }`}>
                            Chance: {item.acceptance_chance}%
                          </span>
                        )}
                        {item.is_previous && (
                          <span className="text-amber-400/70 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded">
                            Archived
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fast Action Buttons: Star, Apply/Flag, Dismiss */}
                    <div className="shrink-0 flex items-center gap-1.5 self-start pt-0.5">
                      <button
                        onClick={() => toggleStar(item)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-display rounded-lg transition-colors border ${
                          item.isStarred
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'border-pulsar/30 text-nova/60 hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/10'
                        }`}
                        title="Star opportunity"
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                        <span>{item.isStarred ? 'Starred' : 'Star'}</span>
                      </button>

                      <button
                        onClick={() => flagToApply(item, originalIndex)}
                        disabled={item.isApplied || isApplying}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-display rounded-lg transition-colors border ${
                          item.isApplied 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 opacity-70 cursor-default'
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/40'
                        }`}
                        title={item.isApplied ? 'Added to Tasks' : 'Flag to Apply'}
                      >
                        {item.isApplied ? (
                          <><Check className="w-3.5 h-3.5" /> <span>Added</span></>
                        ) : (
                          <><Target className="w-3.5 h-3.5" /> <span>Flag to Apply</span></>
                        )}
                      </button>

                      <button
                        onClick={() => setDismissTargetOpp(item)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-display rounded-lg transition-colors border border-pulsar/30 text-nova/60 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
                        title="Dismiss opportunity"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>

                  {/* 2-Sentence High-Information Summary */}
                  <div>
                    <p className="font-body text-nova/80 text-sm leading-relaxed">
                      {oppSummary}
                    </p>
                  </div>

                  {item.what_offered && (
                    <div className="text-xs font-mono text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                      <span className="text-nova/70">Offered:</span> {item.what_offered}
                    </div>
                  )}

                  {/* View Strategic Details Toggle & Breakdown */}
                  <div className="pt-0.5">
                    <button
                      onClick={() => toggleOppExpand(oppId)}
                      className="text-xs font-mono text-amber-400/90 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>Hide Strategic Details <ChevronRight className="w-3 h-3 rotate-90 transition-transform" /></>
                      ) : (
                        <>View Strategic Details <ChevronRight className="w-3 h-3 transition-transform" /></>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-pulsar/20 pt-2.5">
                        <div className="bg-void/80 p-2.5 rounded-lg border border-pulsar/30 space-y-1">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-semibold">
                            Program Overview
                          </div>
                          <p className="text-xs font-body text-starlight/90 leading-relaxed">
                            {breakdown.overview}
                          </p>
                        </div>

                        <div className="bg-void/80 p-2.5 rounded-lg border border-pulsar/30 space-y-1">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-blue-400/90 font-semibold">
                            Strategic Fit & Eligibility
                          </div>
                          <p className="text-xs font-body text-starlight/90 leading-relaxed">
                            {breakdown.fit}
                          </p>
                        </div>

                        <div className="bg-void/80 p-2.5 rounded-lg border border-pulsar/30 space-y-1">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/90 font-semibold">
                            What is Offered
                          </div>
                          <p className="text-xs font-body text-starlight/90 leading-relaxed">
                            {breakdown.offered}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {validUrl && (
                    <div className="pt-0.5">
                      <a 
                        href={validUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1 text-xs font-mono text-amber-400/90 hover:text-amber-300 hover:underline"
                      >
                        Read more &rarr;
                      </a>
                    </div>
                  )}
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
            {newsItems.map((item, i) => {
              const originalIndex = briefItems.indexOf(item);
              const isSaving = savingNewsIds.has(originalIndex);
              return (
                <div key={i} className="glass bg-void/70 border border-pulsar/20 p-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                    <h4 className="text-lg font-display text-starlight leading-tight">{item.title}</h4>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono text-pulsar/80 border border-pulsar/20 bg-pulsar/10 px-2 py-1 rounded">{item.source_name || item.source || 'News'}</span>
                      <button
                        onClick={() => handleSaveNewsItem(item, originalIndex)}
                        disabled={item.isSaved || isSaving}
                        title={item.isSaved ? "Saved to Curriculum" : "Save to Curriculum"}
                        className={`flex items-center justify-center p-1.5 rounded-lg transition-colors border ${
                          item.isSaved
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 opacity-70'
                            : 'bg-pulsar/20 text-pulsar hover:bg-pulsar/30 border-pulsar/40'
                        }`}
                      >
                        {item.isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="font-body text-nova/60 text-sm leading-relaxed">{item.summary}</p>
                  {safeExternalUrl(item.url) && <a href={safeExternalUrl(item.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2.5 text-xs font-mono text-pulsar hover:text-blue-300 hover:underline">Read more &rarr;</a>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-starlight font-body text-lg border-l-2 border-nova pl-4 py-1">
        Today: <span className="text-orange-400 font-bold">{urgent.length}</span> urgent, <span className="text-pulsar font-bold">{strategic.length}</span> strategic. <br/>This week's push: <span className="text-nova font-bold">{weeklyGoal}</span>.
      </div>
      
      <div className="glass border border-amber-500/30 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-display text-starlight flex items-center gap-2"><AlignLeft className="w-5 h-5 text-amber-500" /> Today's Agenda</h3>
        {dailyGoals.length === 0 ? (
          <p className="text-nova/60 italic">No daily goals defined.</p>
        ) : (
          <ul className="space-y-2">
            {dailyGoals.map(g => (
              <li key={g.id} className="flex items-start gap-3 text-starlight font-body">
                <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                {g.title}
              </li>
            ))}
          </ul>
        )}
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

      <DismissFeedbackModal
        isOpen={!!dismissTargetOpp}
        onClose={() => setDismissTargetOpp(null)}
        opportunity={dismissTargetOpp}
        onConfirmDismiss={handleDismissOpportunity}
      />
    </div>
  );
}
