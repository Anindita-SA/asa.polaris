import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  Headphones, 
  BookOpen, 
  PenTool, 
  Mic, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

// Official IELTS raw score to band conversion
export const calculateBand = (score, category, total) => {
  const numScore = parseFloat(score);
  if (isNaN(numScore)) return null;

  const cat = (category || '').toLowerCase();
  const numTotal = total !== null && total !== undefined && total !== '' ? parseFloat(total) : null;

  if (cat === 'writing' || cat === 'speaking') {
    return Math.min(9.0, Math.max(0.0, numScore));
  }

  if (cat === 'listening') {
    if (numTotal === null && numScore <= 9.0) {
      return numScore;
    }
    const raw = (numTotal && numTotal !== 40) ? (numScore / numTotal) * 40 : numScore;
    if (raw >= 39) return 9.0;
    if (raw >= 37) return 8.5;
    if (raw >= 35) return 8.0;
    if (raw >= 32) return 7.5;
    if (raw >= 30) return 7.0;
    if (raw >= 26) return 6.5;
    if (raw >= 23) return 6.0;
    if (raw >= 18) return 5.5;
    if (raw >= 16) return 5.0;
    if (raw >= 13) return 4.5;
    if (raw >= 10) return 4.0;
    return 0.0;
  }

  if (cat === 'reading') {
    if (numTotal === null && numScore <= 9.0) {
      return numScore;
    }
    const raw = (numTotal && numTotal !== 40) ? (numScore / numTotal) * 40 : numScore;
    if (raw >= 39) return 9.0;
    if (raw >= 37) return 8.5;
    if (raw >= 35) return 8.0;
    if (raw >= 33) return 7.5;
    if (raw >= 30) return 7.0;
    if (raw >= 27) return 6.5;
    if (raw >= 23) return 6.0;
    if (raw >= 19) return 5.5;
    if (raw >= 15) return 5.0;
    if (raw >= 13) return 4.5;
    if (raw >= 10) return 4.0;
    return 0.0;
  }

  // Other category fallback
  if (numTotal && numTotal > 0) {
    return Math.min(9.0, Math.max(0.0, (numScore / numTotal) * 9.0));
  }
  if (numScore <= 9.0) {
    return numScore;
  }
  return numScore;
};

// Official IELTS overall band rounding:
// fraction < 0.25 -> round down to whole band .0
// 0.25 <= fraction < 0.75 -> round to half band .5
// fraction >= 0.75 -> round up to next whole band (whole + 1).0
export const roundToIeltsBand = (mean) => {
  if (mean === null || mean === undefined || isNaN(mean)) return null;
  const whole = Math.floor(mean);
  const fraction = mean - whole;
  const roundedFraction = Math.round(fraction * 1000) / 1000;

  if (roundedFraction < 0.25) {
    return whole;
  } else if (roundedFraction < 0.75) {
    return whole + 0.5;
  } else {
    return whole + 1.0;
  }
};

export const calculateOverallBand = (moduleAverages) => {
  if (!moduleAverages || typeof moduleAverages !== 'object') return null;
  const values = Object.values(moduleAverages).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) return null;
  const rawMean = values.reduce((sum, val) => sum + val, 0) / values.length;
  return {
    rawMean,
    roundedBand: roundToIeltsBand(rawMean),
    activeCount: values.length,
  };
};

export const calculateModuleStats = (scores, category) => {
  const catScores = (scores || [])
    .filter(s => s.category === category)
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

  const bands = catScores
    .map(s => (s.band !== null && s.band !== undefined ? Number(s.band) : calculateBand(s.score, s.category, s.total)))
    .filter(b => b !== null && !isNaN(b));

  const count = bands.length;
  if (count === 0) {
    return {
      average: null,
      best: null,
      count: 0,
      trendText: 'No data yet',
      trendType: 'none',
      trendDetail: 'Log your first test',
      delta: 0,
      bands: [],
    };
  }

  const average = bands.reduce((sum, b) => sum + b, 0) / count;
  const best = Math.max(...bands);

  if (count === 1) {
    return {
      average,
      best,
      count: 1,
      trendText: 'Baseline (1 test)',
      trendType: 'baseline',
      trendDetail: 'Need 2+ tests for comparison',
      delta: 0,
      bands,
    };
  }

  if (count === 2) {
    const diff = bands[1] - bands[0];
    let trendText = 'Stable (2 tests)';
    let trendType = 'stable';
    if (diff > 0) {
      trendText = `+${diff.toFixed(1)} vs Test 1`;
      trendType = 'up';
    } else if (diff < 0) {
      trendText = `${diff.toFixed(1)} vs Test 1`;
      trendType = 'down';
    }
    return {
      average,
      best,
      count: 2,
      trendText,
      trendType,
      trendDetail: 'Test 2 vs Test 1',
      delta: diff,
      bands,
    };
  }

  // count >= 3: Rolling recent 3 tests vs baseline
  const recent3 = bands.slice(-3);
  const recentAvg = recent3.reduce((sum, b) => sum + b, 0) / 3;
  const prior = bands.slice(0, -3);
  const baselineAvg = prior.length > 0 ? (prior.reduce((sum, b) => sum + b, 0) / prior.length) : bands[0];
  const delta = recentAvg - baselineAvg;

  let trendText = 'Stable (±0.0)';
  let trendType = 'stable';
  if (delta >= 0.25) {
    trendText = `+${delta.toFixed(1)} vs baseline`;
    trendType = 'up';
  } else if (delta <= -0.25) {
    trendText = `${delta.toFixed(1)} vs baseline`;
    trendType = 'down';
  }

  return {
    average,
    best,
    count,
    trendText,
    trendType,
    trendDetail: 'Recent 3 tests vs baseline',
    delta,
    bands,
  };
};

const MODULE_DEFS = [
  { id: 'listening', label: 'Listening', icon: Headphones, border: 'border-sky/30', text: 'text-sky', bg: 'bg-sky/5', badge: 'bg-sky/15 text-sky border-sky/30' },
  { id: 'reading', label: 'Reading', icon: BookOpen, border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { id: 'writing', label: 'Writing', icon: PenTool, border: 'border-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { id: 'speaking', label: 'Speaking', icon: Mic, border: 'border-aurora/30', text: 'text-aurora', bg: 'bg-aurora/5', badge: 'bg-aurora/15 text-aurora border-aurora/30' },
];

export default function PracticeScoreTracker({ curriculumId }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'listening', 'reading', 'writing', 'speaking', 'other'

  // New entry form state
  const [title, setTitle] = useState('');
  const [scoreVal, setScoreVal] = useState('');
  const [totalVal, setTotalVal] = useState('40');
  const [category, setCategory] = useState('listening');

  const cacheKey = `polaris_practice_scores_cache_${user?.id || 'anon'}_${curriculumId || 'all'}`;
  const legacyKey = `polaris_practice_scores_${curriculumId}`;

  // Fetch from Supabase and migrate legacy localStorage scores
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);

      // Load cached local state immediately for instant feedback
      try {
        const cached = localStorage.getItem(cacheKey) || localStorage.getItem(legacyKey);
        if (cached && isMounted) {
          setScores(JSON.parse(cached));
        }
      } catch (e) {
        // Ignore cache parsing errors
      }

      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check for legacy localStorage scores to migrate
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            const legacyItems = JSON.parse(legacyRaw);
            if (Array.isArray(legacyItems) && legacyItems.length > 0) {
              const migrationPayload = legacyItems.map(item => ({
                user_id: user.id,
                curriculum_id: curriculumId || null,
                title: item.title || 'Practice Test',
                category: item.category || 'listening',
                score: parseFloat(item.score) || 0,
                total: item.total ? parseFloat(item.total) : null,
                band: item.band ? parseFloat(item.band) : calculateBand(item.score, item.category, item.total),
                date: item.date || new Date().toISOString(),
                created_at: item.date || new Date().toISOString(),
              }));

              await supabase.from('practice_scores').insert(migrationPayload);
              localStorage.removeItem(legacyKey);
            }
          } catch (migrateErr) {
            console.error('Error during practice scores migration:', migrateErr);
          }
        }

        // Query Supabase for canonical scores
        let query = supabase
          .from('practice_scores')
          .select('*')
          .eq('user_id', user.id);

        if (curriculumId) {
          query = query.eq('curriculum_id', curriculumId);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (!error && data && isMounted) {
          setScores(data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (storageErr) {
            // Ignore storage quota errors
          }
        }
      } catch (err) {
        console.error('Failed to fetch practice scores:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, curriculumId]);

  // Derived Module Stats
  const moduleStats = useMemo(() => {
    const stats = {};
    MODULE_DEFS.forEach(mod => {
      stats[mod.id] = calculateModuleStats(scores, mod.id);
    });
    return stats;
  }, [scores]);

  // Module averages for overall projected band
  const moduleAverages = useMemo(() => {
    const avgs = {};
    MODULE_DEFS.forEach(mod => {
      if (moduleStats[mod.id]?.average !== null) {
        avgs[mod.id] = moduleStats[mod.id].average;
      }
    });
    return avgs;
  }, [moduleStats]);

  const overall = useMemo(() => {
    return calculateOverallBand(moduleAverages);
  }, [moduleAverages]);

  // Filtered and sorted scores
  const filteredScores = useMemo(() => {
    if (activeFilter === 'all') return scores;
    return scores.filter(s => s.category === activeFilter);
  }, [scores, activeFilter]);

  // Chronological progression for current filter
  const progressionList = useMemo(() => {
    const subset = activeFilter === 'all' 
      ? scores 
      : scores.filter(s => s.category === activeFilter);

    return [...subset]
      .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at))
      .map(item => {
        const band = item.band !== null && item.band !== undefined 
          ? Number(item.band) 
          : calculateBand(item.score, item.category, item.total);
        return {
          ...item,
          calculatedBand: band,
        };
      });
  }, [scores, activeFilter]);

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    if (newCat === 'listening' || newCat === 'reading') {
      setTotalVal('40');
    } else {
      setTotalVal('');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !scoreVal) return;

    const numScore = parseFloat(scoreVal);
    const numTotal = totalVal ? parseFloat(totalVal) : null;
    const bandScore = calculateBand(numScore, category, numTotal);

    const newRecord = {
      title: title.trim(),
      category,
      score: numScore,
      total: numTotal,
      band: bandScore,
      date: new Date().toISOString(),
    };

    if (user?.id) {
      try {
        const dbPayload = {
          ...newRecord,
          user_id: user.id,
          curriculum_id: curriculumId || null,
        };

        const { data, error } = await supabase
          .from('practice_scores')
          .insert([dbPayload])
          .select();

        const createdItem = data && data[0] ? data[0] : { ...dbPayload, id: Date.now().toString() };
        const updated = [createdItem, ...scores];
        setScores(updated);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        } catch (storageErr) {}
      } catch (err) {
        // Fallback to local
        const localItem = { ...newRecord, id: Date.now().toString(), user_id: user.id, curriculum_id: curriculumId || null };
        const updated = [localItem, ...scores];
        setScores(updated);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        } catch (storageErr) {}
      }
    } else {
      const localItem = { ...newRecord, id: Date.now().toString(), user_id: null, curriculum_id: curriculumId || null };
      const updated = [localItem, ...scores];
      setScores(updated);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch (storageErr) {}
    }

    setTitle('');
    setScoreVal('');
    if (category === 'listening' || category === 'reading') {
      setTotalVal('40');
    } else {
      setTotalVal('');
    }
  };

  const handleDelete = async (id) => {
    if (user?.id) {
      try {
        await supabase
          .from('practice_scores')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Failed to delete score from Supabase:', err);
      }
    }

    const updated = scores.filter(s => s.id !== id);
    setScores(updated);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    } catch (storageErr) {}
  };

  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'listening': return 'text-sky bg-sky/10 border-sky/30';
      case 'reading': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'writing': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'speaking': return 'text-aurora bg-aurora/10 border-aurora/30';
      default: return 'text-nova bg-stardust border-cosmic';
    }
  };

  const renderTrendBadge = (stats) => {
    const { trendType, trendText } = stats;
    switch (trendType) {
      case 'up':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-3 h-3" />
            {trendText}
          </span>
        );
      case 'down':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-danger/15 text-danger border border-danger/30">
            <TrendingDown className="w-3 h-3" />
            {trendText}
          </span>
        );
      case 'stable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Minus className="w-3 h-3" />
            {trendText}
          </span>
        );
      case 'baseline':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky/15 text-sky border border-sky/30">
            <Award className="w-3 h-3" />
            {trendText}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-nova/60 bg-void border border-cosmic">
            <Minus className="w-3 h-3" />
            {trendText}
          </span>
        );
    }
  };

  return (
    <div className="bg-nebula border border-cosmic rounded-xl overflow-hidden mt-6 shadow-natural">
      {/* Header Bar */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-stardust hover:bg-cosmic transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Target className="w-4 h-4 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base text-starlight font-bold">IELTS Module Average Bands & Score Predictor</h3>
              <span className="text-[11px] font-mono bg-void px-2 py-0.5 rounded-full border border-cosmic text-nova">
                {scores.length} {scores.length === 1 ? 'Test' : 'Tests'} Logged
              </span>
            </div>
            <p className="text-xs text-nova/60 mt-0.5">
              Official IELTS conversion matrix, rolling recent trends, and projected overall band.
            </p>
          </div>
        </div>
        <div className="p-1 rounded bg-void border border-cosmic text-nova">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-cosmic space-y-5">
          {/* 1. Executive Summary & Module Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Overall Projected Band Card */}
            <div className="glass border border-gold/40 bg-stardust/90 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden sm:col-span-2 lg:col-span-1">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gold font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-gold" /> Projected Overall
                  </span>
                  <span className="text-[10px] font-mono text-nova/60">
                    {overall ? `${overall.activeCount}/4 skills` : '0/4 skills'}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-starlight">
                    {overall && overall.roundedBand !== null ? Number(overall.roundedBand).toFixed(1) : '-'}
                  </span>
                  {overall && overall.rawMean !== null && (
                    <span className="text-[11px] font-mono text-dim">
                      Raw: {overall.rawMean.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-cosmic">
                {overall && overall.roundedBand !== null ? (
                  overall.roundedBand >= 7.5 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Target Met (7.5+)
                    </span>
                  ) : overall.roundedBand >= 6.5 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold">
                      <Target className="w-3 h-3" /> Approaching Target (7.5+)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-nova font-bold">
                      <Target className="w-3 h-3" /> Building Foundation
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono text-nova/60 italic">
                    Log at least 1 module test
                  </span>
                )}
              </div>
            </div>

            {/* 4 Skill Cards */}
            {MODULE_DEFS.map(mod => {
              const Icon = mod.icon;
              const stats = moduleStats[mod.id];
              return (
                <div 
                  key={mod.id} 
                  className={`glass border ${mod.border} ${mod.bg} rounded-xl p-3.5 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${mod.text}`} />
                        <span className={`text-xs font-display font-bold ${mod.text}`}>{mod.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-dim">
                        {stats.count} {stats.count === 1 ? 'test' : 'tests'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display text-2xl font-bold text-starlight">
                          {stats.average !== null ? stats.average.toFixed(1) : '-'}
                        </span>
                        <span className="text-[10px] font-mono text-dim uppercase">Avg Band</span>
                      </div>
                      {stats.best !== null && (
                        <span className="text-[10px] font-mono text-nova/80">
                          Best: <b className="text-starlight">{stats.best.toFixed(1)}</b>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-cosmic/60 flex items-center justify-between">
                    {renderTrendBadge(stats)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Chronological Progression Strip */}
          <div className="glass border border-cosmic bg-stardust/50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-nova" />
                <span className="text-xs font-mono uppercase tracking-wider text-starlight font-bold">
                  Chronological Progression Strip
                </span>
                <span className="text-[10px] font-mono text-dim">
                  ({activeFilter === 'all' ? 'All Skills' : activeFilter})
                </span>
              </div>
              <span className="text-[10px] font-mono text-nova/60">
                {progressionList.length} milestones
              </span>
            </div>

            {progressionList.length === 0 ? (
              <p className="text-xs font-mono text-nova/60 italic py-2 text-center">
                No practice tests logged in this filter yet. Log tests to see your chronological improvement timeline.
              </p>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-hide">
                {progressionList.map((item, idx) => {
                  const isLast = idx === progressionList.length - 1;
                  return (
                    <React.Fragment key={item.id || idx}>
                      <div 
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-stardust shrink-0 transition-all ${getCategoryTheme(item.category)}`}
                        title={`${item.title} - ${new Date(item.date).toLocaleDateString()}`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono uppercase font-bold">
                              {item.category.slice(0, 4)}
                            </span>
                            <span className="font-display text-sm font-bold text-starlight">
                              {item.calculatedBand !== null ? Number(item.calculatedBand).toFixed(1) : item.score}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-dim truncate max-w-[100px]">
                            {item.title}
                          </span>
                        </div>
                      </div>
                      {!isLast && (
                        <ArrowRight className="w-3 h-3 text-cosmic shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Log Test Form */}
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 p-3.5 bg-stardust border border-cosmic rounded-xl">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Sprint Title</label>
              <input 
                required 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Cambridge Book 18 Test 1"
                className="w-full bg-void border border-cosmic rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold font-body"
              />
            </div>

            <div className="w-[120px]">
              <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Skill Module</label>
              <select 
                value={category} 
                onChange={handleCategoryChange}
                className="w-full bg-void border border-cosmic rounded-lg px-2 py-1.5 text-xs text-starlight outline-none focus:border-gold font-mono"
              >
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="w-[70px]">
              <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Score</label>
              <input 
                required 
                type="number" 
                step="0.5" 
                value={scoreVal} 
                onChange={e => setScoreVal(e.target.value)}
                placeholder={category === 'writing' || category === 'speaking' ? '7.0' : '35'}
                className="w-full bg-void border border-cosmic rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold font-mono"
              />
            </div>

            {(category === 'listening' || category === 'reading' || category === 'other') && (
              <div className="w-[70px]">
                <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Total</label>
                <input 
                  type="number" 
                  step="0.5" 
                  value={totalVal} 
                  onChange={e => setTotalVal(e.target.value)}
                  placeholder="40"
                  className="w-full bg-void border border-cosmic rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold font-mono"
                />
              </div>
            )}

            <button 
              type="submit" 
              className="bg-gold hover:bg-gold-dim text-void font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-gold shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Log Score
            </button>
          </form>

          {/* 4. Filter Tabs & Score Logs List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-cosmic pb-2 flex-wrap">
              <div className="flex items-center gap-1">
                {['all', 'listening', 'reading', 'writing', 'speaking', 'other'].map(tab => {
                  const isActive = activeFilter === tab;
                  const count = tab === 'all' 
                    ? scores.length 
                    : scores.filter(s => s.category === tab).length;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-all border ${
                        isActive
                          ? 'bg-gold/20 text-gold border-gold/40 font-bold'
                          : 'text-nova/60 border-transparent hover:text-starlight hover:bg-cosmic/40'
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              {loading && (
                <span className="text-[10px] font-mono text-nova/60 animate-pulse">
                  Syncing scores...
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredScores.length === 0 ? (
                <p className="text-center text-xs text-nova/60 font-mono py-6">
                  No scores logged for {activeFilter === 'all' ? 'any module' : activeFilter}. Log a sprint test above.
                </p>
              ) : (
                filteredScores.map(s => {
                  const band = s.band !== null && s.band !== undefined 
                    ? Number(s.band) 
                    : calculateBand(s.score, s.category, s.total);

                  return (
                    <div 
                      key={s.id} 
                      className="flex items-center justify-between p-3 bg-stardust border border-cosmic rounded-xl hover:border-nova/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase font-bold border ${getCategoryTheme(s.category)}`}>
                          {s.category}
                        </div>
                        <div>
                          <p className="text-sm font-body text-starlight font-medium leading-snug">{s.title}</p>
                          <p className="text-[10px] font-mono text-dim mt-0.5">
                            {new Date(s.date || s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-5">
                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-mono text-nova font-medium">{s.score}</span>
                            {s.total && <span className="text-[10px] font-mono text-dim">/ {s.total}</span>}
                          </div>
                          {band !== null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Calculator className="w-3 h-3 text-gold" />
                              <span className="text-[10px] font-mono uppercase text-dim">Band</span>
                              <span className="text-sm font-display text-gold font-bold">{Number(band).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDelete(s.id)} 
                          className="text-dim hover:text-danger p-1 rounded transition-colors"
                          title="Delete test log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
