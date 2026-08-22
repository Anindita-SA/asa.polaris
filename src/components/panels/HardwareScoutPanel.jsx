import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Cpu, ExternalLink, Plus, Check, Edit2, X, Save } from 'lucide-react'

const HardwareScoutPanel = () => {
  const { user } = useAuth()
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    const { data } = await supabase
      .from('hardware_opportunities')
      .select(`
        *,
        tasks:task_id (status)
      `)
      .eq('user_id', user.id)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
    
    setOpportunities(data || [])
    setLoading(false)
  }

  const approveAndActivate = async (opp) => {
    let newTaskId = opp.task_id

    if (opp.task_id) {
      await supabase
        .from('tasks')
        .update({ status: 'active', quadrant: 'important_not_urgent' })
        .eq('id', opp.task_id)
    } else {
      const { data: taskData } = await supabase
        .from('tasks')
        .insert({
          title: `Apply for: ${opp.title}`,
          notes: `URL: ${opp.url}\n\nDraft:\n${opp.application_draft || ''}`,
          status: 'active',
          quadrant: 'important_not_urgent',
          user_id: user.id
        })
        .select()
        .single()
      
      if (taskData) {
        newTaskId = taskData.id
      }
    }

    await supabase
      .from('hardware_opportunities')
      .update({ status: 'applied', task_id: newTaskId })
      .eq('id', opp.id)

    fetchOpportunities()
  }

  const rejectOpportunity = async (oppId) => {
    await supabase
      .from('hardware_opportunities')
      .update({ status: 'rejected' })
      .eq('id', oppId)
    
    fetchOpportunities()
  }

  const startEditing = (opp) => {
    setEditingId(opp.id)
    setEditForm({ ...opp })
  }

  const saveEdit = async () => {
    await supabase
      .from('hardware_opportunities')
      .update({
        title: editForm.title,
        url: editForm.url,
        deadline: editForm.deadline,
        what_offered: editForm.what_offered,
        project_fit: editForm.project_fit,
        effort: editForm.effort,
        application_draft: editForm.application_draft
      })
      .eq('id', editingId)
    
    setEditingId(null)
    fetchOpportunities()
  }

  if (loading) return <div className="p-8 text-dim">Loading opportunities...</div>

  return (
    <div className="space-y-6 max-w-4xl w-full">
      <div className="flex items-center gap-3">
        <Cpu className="text-amber-500 w-6 h-6" />
        <h2 className="text-xl font-display text-starlight">Hardware & Grants Scout</h2>
      </div>

      {opportunities.length === 0 ? (
        <div className="glass p-6 rounded-2xl border border-blue-900/30 text-dim text-center">
          No active opportunities found. The weekly/monthly scout will populate this list.
        </div>
      ) : (
        <div className="grid gap-4 w-full">
          {opportunities.map((opp) => {
            const isEditing = editingId === opp.id
            return (
              <div key={opp.id} className="glass p-5 rounded-2xl border border-blue-900/30 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    {isEditing ? (
                      <input 
                        value={editForm.title || ''}
                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                        className="bg-transparent border-b border-blue-500/30 outline-none text-lg font-display text-starlight w-full mb-2"
                        placeholder="Opportunity Title"
                      />
                    ) : (
                      <h3 className="text-lg font-display text-starlight flex items-center gap-2">
                        {opp.title}
                        {opp.url && (
                          <a href={opp.url} target="_blank" rel="noreferrer" className="text-dim hover:text-pulsar">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </h3>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-xs text-dim mt-1">
                      {isEditing ? (
                        <>
                          <input 
                            type="date"
                            value={editForm.deadline || ''}
                            onChange={e => setEditForm({...editForm, deadline: e.target.value})}
                            className="bg-void/50 border border-blue-900/30 rounded px-2 py-1 text-starlight outline-none"
                          />
                          <select
                            value={editForm.effort || ''}
                            onChange={e => setEditForm({...editForm, effort: e.target.value})}
                            className="bg-void/50 border border-blue-900/30 rounded px-2 py-1 text-starlight outline-none"
                          >
                            <option value="">Effort...</option>
                            <option value="low">Low</option>
                            <option value="med">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <input 
                            value={editForm.project_fit || ''}
                            onChange={e => setEditForm({...editForm, project_fit: e.target.value})}
                            className="bg-void/50 border border-blue-900/30 rounded px-2 py-1 text-starlight outline-none flex-1"
                            placeholder="Project Fit"
                          />
                          <input 
                            value={editForm.url || ''}
                            onChange={e => setEditForm({...editForm, url: e.target.value})}
                            className="bg-void/50 border border-blue-900/30 rounded px-2 py-1 text-starlight outline-none flex-1"
                            placeholder="URL"
                          />
                        </>
                      ) : (
                        <>
                          {opp.deadline && <span>Deadline: {opp.deadline}</span>}
                          {opp.effort && <span>Effort: {opp.effort}</span>}
                          {opp.project_fit && <span>Fit: {opp.project_fit}</span>}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-start">
                    {!isEditing && (
                      <button onClick={() => startEditing(opp)} className="p-1.5 text-dim hover:text-starlight rounded bg-blue-900/10">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="px-2 py-1 rounded bg-blue-900/20 text-dim text-xs uppercase tracking-wider">
                      {opp.status}
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <input 
                      value={editForm.what_offered || ''}
                      onChange={e => setEditForm({...editForm, what_offered: e.target.value})}
                      className="bg-void/50 border border-blue-900/30 rounded px-3 py-2 text-sm text-starlight outline-none w-full"
                      placeholder="What is offered?"
                    />
                    <textarea 
                      value={editForm.application_draft || ''}
                      onChange={e => setEditForm({...editForm, application_draft: e.target.value})}
                      className="bg-void/50 border border-blue-900/30 rounded px-3 py-2 text-sm text-starlight outline-none w-full min-h-[120px] font-mono"
                      placeholder="Application draft text..."
                    />
                  </div>
                ) : (
                  <>
                    {opp.what_offered && (
                      <div className="text-sm">
                        <span className="text-dim">Offered:</span> <span className="text-starlight">{opp.what_offered}</span>
                      </div>
                    )}

                    {opp.application_draft && (
                      <div className="bg-void/50 p-3 rounded-xl border border-blue-900/20 text-sm whitespace-pre-wrap font-mono text-starlight/80 max-h-48 overflow-y-auto">
                        {opp.application_draft}
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg text-sm text-dim hover:text-starlight hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 rounded-lg text-sm bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save Changes
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => rejectOpportunity(opp.id)}
                        className="px-4 py-2 rounded-lg text-sm text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => approveAndActivate(opp)}
                        disabled={opp.status === 'applied'}
                        className="px-4 py-2 rounded-lg text-sm bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {opp.status === 'applied' ? (
                          <><Check className="w-4 h-4" /> Added to Tasks</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Move to Tasks</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HardwareScoutPanel
