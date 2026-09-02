import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Award, ChevronDown, ChevronUp, LineChart } from 'lucide-react';

export default function PracticeScoreTracker({ curriculumId }) {
  const [isOpen, setIsOpen] = useState(true);
  const [scores, setScores] = useState([]);
  
  // New entry form
  const [title, setTitle] = useState('');
  const [scoreVal, setScoreVal] = useState('');
  const [totalVal, setTotalVal] = useState('');
  const [category, setCategory] = useState('listening'); // 'listening', 'reading', 'writing', 'speaking', 'other'

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`polaris_practice_scores_${curriculumId}`);
      if (saved) {
        setScores(JSON.parse(saved));
      }
    } catch(e) {}
  }, [curriculumId]);

  const saveScores = (newScores) => {
    setScores(newScores);
    localStorage.setItem(`polaris_practice_scores_${curriculumId}`, JSON.stringify(newScores));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim() || !scoreVal) return;
    
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: title.trim(),
      score: parseFloat(scoreVal),
      total: totalVal ? parseFloat(totalVal) : null,
      category
    };
    
    saveScores([newEntry, ...scores]);
    setTitle('');
    setScoreVal('');
    setTotalVal('');
  };

  const handleDelete = (id) => {
    saveScores(scores.filter(s => s.id !== id));
  };

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'listening': return 'text-sky bg-sky/10 border-sky/30';
      case 'reading': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'writing': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'speaking': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default: return 'text-nova/60 bg-stardust/40 border-pulsar/40';
    }
  };

  return (
    <div className="glass border border-pulsar/30 rounded-xl overflow-hidden mt-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-gold" />
          <h3 className="font-display text-lg text-starlight">Practice Sprint Scores</h3>
          <span className="text-xs font-mono bg-void/50 px-2 py-0.5 rounded-full border border-pulsar/30 text-nova/60">
            {scores.length} Logs
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-nova/60" /> : <ChevronDown className="w-4 h-4 text-nova/60" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-pulsar/30 bg-void/20 space-y-4">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 p-3 glass border border-pulsar/40 rounded-lg">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-mono text-nova/60 uppercase mb-1 block">Sprint Title</label>
              <input 
                required type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. YouTube Mock Test #4"
                className="w-full bg-void/50 border border-pulsar/40 rounded px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold"
              />
            </div>
            <div className="w-[100px]">
              <label className="text-[10px] font-mono text-nova/60 uppercase mb-1 block">Type</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-void/50 border border-pulsar/40 rounded px-2 py-1.5 text-xs text-starlight outline-none focus:border-gold"
              >
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="w-[60px]">
              <label className="text-[10px] font-mono text-nova/60 uppercase mb-1 block">Score</label>
              <input 
                required type="number" step="0.5" value={scoreVal} onChange={e => setScoreVal(e.target.value)}
                placeholder="35"
                className="w-full bg-void/50 border border-pulsar/40 rounded px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold"
              />
            </div>
            <div className="w-[60px]">
              <label className="text-[10px] font-mono text-nova/60 uppercase mb-1 block">Total (opt)</label>
              <input 
                type="number" step="0.5" value={totalVal} onChange={e => setTotalVal(e.target.value)}
                placeholder="40"
                className="w-full bg-void/50 border border-pulsar/40 rounded px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold"
              />
            </div>
            <button type="submit" className="bg-gold hover:bg-gold/90 text-void font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Log
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {scores.length === 0 ? (
              <p className="text-center text-xs text-nova/50 font-mono py-4">No scores logged yet. Start tracking your manual practice here!</p>
            ) : (
              scores.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 glass border border-pulsar/20 rounded-lg hover:border-pulsar/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${getCategoryColor(s.category)}`}>
                      {s.category}
                    </div>
                    <div>
                      <p className="text-sm font-body text-starlight">{s.title}</p>
                      <p className="text-[10px] font-mono text-nova/50">{new Date(s.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-display text-gold font-bold">{s.score}</span>
                      {s.total && <span className="text-xs font-mono text-nova/50">/ {s.total}</span>}
                    </div>
                    <button onClick={() => handleDelete(s.id)} className="text-nova/40 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
