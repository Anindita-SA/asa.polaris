import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, ChevronDown, ChevronUp, Calculator } from 'lucide-react';

export default function PracticeScoreTracker({ curriculumId }) {
  const [isOpen, setIsOpen] = useState(true);
  const [scores, setScores] = useState([]);
  
  // New entry form
  const [title, setTitle] = useState('');
  const [scoreVal, setScoreVal] = useState('');
  const [totalVal, setTotalVal] = useState('40');
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
    // reset total to 40 for reading/listening, clear for others
    if (category === 'listening' || category === 'reading') {
      setTotalVal('40');
    } else {
      setTotalVal('');
    }
  };

  const handleDelete = (id) => {
    saveScores(scores.filter(s => s.id !== id));
  };

  // IELTS Band calculation based on official Liz matrices
  const calculateBand = (score, cat) => {
    if (cat === 'writing' || cat === 'speaking') {
      return Number(score).toFixed(1); // User directly inputs band score
    }
    
    if (cat === 'listening') {
      if (score >= 39) return 9.0;
      if (score >= 37) return 8.5;
      if (score >= 35) return 8.0;
      if (score >= 32) return 7.5;
      if (score >= 30) return 7.0;
      if (score >= 26) return 6.5;
      if (score >= 23) return 6.0;
      if (score >= 18) return 5.5;
      if (score >= 16) return 5.0;
      if (score >= 13) return 4.5;
      if (score >= 10) return 4.0;
      return 0.0;
    }
    if (cat === 'reading') {
      if (score >= 39) return 9.0;
      if (score >= 37) return 8.5;
      if (score >= 35) return 8.0;
      if (score >= 33) return 7.5;
      if (score >= 30) return 7.0;
      if (score >= 27) return 6.5;
      if (score >= 23) return 6.0;
      if (score >= 19) return 5.5;
      if (score >= 15) return 5.0;
      if (score >= 13) return 4.5;
      if (score >= 10) return 4.0;
      return 0.0;
    }
    return null;
  };

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    if (newCat === 'listening' || newCat === 'reading') {
      setTotalVal('40');
    } else {
      setTotalVal('');
    }
  };

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'listening': return 'text-sky bg-cosmic border-sky';
      case 'reading': return 'text-emerald-400 bg-cosmic border-emerald-500';
      case 'writing': return 'text-amber-400 bg-cosmic border-amber-500';
      case 'speaking': return 'text-aurora bg-cosmic border-aurora';
      default: return 'text-nova bg-stardust border-nova';
    }
  };

  return (
    <div className="bg-nebula border border-cosmic rounded-xl overflow-hidden mt-6 shadow-natural">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-stardust hover:bg-cosmic transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-gold" />
          <h3 className="font-display text-lg text-starlight font-bold">Score Predictor & Tracker</h3>
          <span className="text-xs font-mono bg-void px-2 py-0.5 rounded-full border border-cosmic text-nova">
            {scores.length} Logs
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-nova" /> : <ChevronDown className="w-4 h-4 text-nova" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-cosmic space-y-4">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 p-3 bg-stardust border border-cosmic rounded-lg">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Sprint Title</label>
              <input 
                required type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Cambridge Book 18 Test 1"
                className="w-full bg-void border border-cosmic rounded px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold"
              />
            </div>
            <div className="w-[100px]">
              <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Type</label>
              <select 
                value={category} onChange={handleCategoryChange}
                className="w-full bg-void border border-cosmic rounded px-2 py-1.5 text-xs text-starlight outline-none focus:border-gold"
              >
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="speaking">Speaking</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="w-[60px]">
              <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Score</label>
              <input 
                required type="number" step="0.5" value={scoreVal} onChange={e => setScoreVal(e.target.value)}
                placeholder={category === 'writing' || category === 'speaking' ? '7.0' : '35'}
                className="w-full bg-void border border-cosmic rounded px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold"
              />
            </div>
            {(category === 'listening' || category === 'reading' || category === 'other') && (
              <div className="w-[60px]">
                <label className="text-[10px] font-mono text-nova uppercase mb-1 block font-bold">Total</label>
                <input 
                  type="number" step="0.5" value={totalVal} onChange={e => setTotalVal(e.target.value)}
                  placeholder="40"
                  className="w-full bg-void border border-cosmic rounded px-2.5 py-1.5 text-xs text-starlight outline-none focus:border-gold"
                />
              </div>
            )}
            <button type="submit" className="bg-gold hover:bg-gold-dim text-void font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors border border-gold">
              <Plus className="w-3.5 h-3.5" /> Log
            </button>
          </form>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {scores.length === 0 ? (
              <p className="text-center text-xs text-nova font-mono py-4">No scores logged yet. Your IELTS predictions will appear here.</p>
            ) : (
              scores.map(s => {
                const band = calculateBand(s.score, s.category);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-stardust border border-cosmic rounded-lg hover:border-nova transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold border ${getCategoryColor(s.category)}`}>
                        {s.category}
                      </div>
                      <div>
                        <p className="text-sm font-body text-starlight font-medium">{s.title}</p>
                        <p className="text-[10px] font-mono text-dim">{new Date(s.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-mono text-nova font-medium">{s.score}</span>
                          {s.total && <span className="text-[10px] font-mono text-dim">/ {s.total}</span>}
                        </div>
                        {band !== null && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calculator className="w-3 h-3 text-gold" />
                            <span className="text-xs font-mono uppercase text-dim">Band</span>
                            <span className="text-sm font-display text-gold font-bold">{Number(band).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleDelete(s.id)} className="text-dim hover:text-danger p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
