import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  Cpu, 
  ExternalLink, 
  Plus, 
  Check, 
  Edit2, 
  X, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  ShieldCheck, 
  Gift, 
  FileText, 
  Sparkles 
} from 'lucide-react'
import DismissFeedbackModal from '../modals/DismissFeedbackModal'
import { safeExternalUrl } from '../../lib/urlUtils'
import { offlineInsert, offlineUpdate, generateUUID } from '../../lib/offlineApi'
import { parseOpportunityBreakdown } from '../../lib/opportunityUtils'

const HardwareScoutPanel = () => {
  const { user } = useAuth()
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [isScouting, setIsScouting] = useState(false)
  const [dismissTargetOpp, setDismissTargetOpp] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (user?.id) {
      fetchOpportunities()
    }
  }, [user?.id])

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCopyDraft = (id, text) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const invokeScout = async () => {
    setIsScouting(true)
    try {
      const { error } = await supabase.functions.invoke('scout-opportunities')
      if (error) throw error
      await fetchOpportunities()
    } catch (err) {
      console.error('Error invoking scout:', err)
      alert('Failed to invoke scout. Check console logs.')
    } finally {
      setIsScouting(false)
    }
  }

  const fetchOpportunities = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('hardware_opportunities')
      .select(`
        *,
        tasks:task_id (status)
      `)
      .eq('user_id', user.id)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(50)
    
    setOpportunities(data || [])
    setLoading(false)
  }

  const approveAndActivate = async (opp) => {
    if (!user?.id) return
    // Optimistic update
    setOpportunities(prev => prev.filter(o => o.id !== opp.id))

    let newTaskId = opp.task_id

    if (opp.task_id) {
      await offlineUpdate('tasks', { id: opp.task_id, user_id: user.id }, {
        status: 'active',
        quadrant: 'important_not_urgent'
      })
    } else {
      const newId = generateUUID()
      const { data: taskData } = await offlineInsert('tasks', {
        id: newId,
        title: `Apply for: ${opp.title}`,
        notes: `URL: ${opp.url}\n\nDraft:\n${opp.application_draft || ''}`,
        status: 'active',
        quadrant: 'important_not_urgent',
        user_id: user.id
      })
      
      newTaskId = (taskData && taskData[0]) ? taskData[0].id : newId
    }

    await offlineUpdate('hardware_opportunities', { id: opp.id, user_id: user.id }, {
      status: 'applied',
      task_id: newTaskId
    })

    if (newTaskId) {
      supabase.functions.invoke('generate-application-subtasks', {
        body: {
          parent_task_id: newTaskId,
          opportunity: {
            title: opp.title,
            url: opp.url,
            deadline: opp.deadline,
            effort: opp.effort,
            project_fit: opp.project_fit,
            what_offered: opp.what_offered
          }
        }
      }).catch(err => console.error('Background subtask generation failed:', err))
    }

    // Ensure state remains synchronized with backend
    fetchOpportunities()
  }

  const rejectOpportunityWithFeedback = async (opp, reason) => {
    if (!user?.id) return
    // Optimistic update
    setOpportunities(prev => prev.filter(o => o.id !== opp.id))

    await offlineUpdate('hardware_opportunities', { id: opp.id, user_id: user.id }, {
      status: 'rejected',
      rejection_reason: reason || 'Dismissed by user',
      rejected_at: new Date().toISOString()
    })
    
    // Ensure state remains synchronized with backend
    fetchOpportunities()
  }

  const startEditing = (opp) => {
    setEditingId(opp.id)
    setEditForm({
      title: opp.title || '',
      url: opp.url || '',
      deadline: opp.deadline || '',
      effort: opp.effort || '',
      project_fit: opp.project_fit || '',
      what_offered: opp.what_offered || '',
      profile_match: opp.profile_match ?? '',
      acceptance_chance: opp.acceptance_chance ?? '',
      application_draft: opp.application_draft || ''
    })
  }

  const saveEdit = async () => {
    if (!user?.id || !editingId) return
    const matchNum = editForm.profile_match === '' || editForm.profile_match == null ? null : Number(editForm.profile_match)
    const chanceNum = editForm.acceptance_chance === '' || editForm.acceptance_chance == null ? null : Number(editForm.acceptance_chance)

    await offlineUpdate('hardware_opportunities', { id: editingId, user_id: user.id }, {
      title: editForm.title,
      url: editForm.url,
      deadline: editForm.deadline || null,
      what_offered: editForm.what_offered || null,
      project_fit: editForm.project_fit || null,
      effort: editForm.effort || null,
      application_draft: editForm.application_draft || null,
      profile_match: isNaN(matchNum) ? null : matchNum,
      acceptance_chance: isNaN(chanceNum) ? null : chanceNum
    })
    
    setEditingId(null)
    fetchOpportunities()
  }

  if (loading) return <div className="p-8 text-nova/60">Loading opportunities...</div>

  return (
    <div className="space-y-6 max-w-4xl w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="text-amber-500 w-6 h-6" />
          <h2 className="text-base font-display text-starlight">Hardware & Grants Scout</h2>
        </div>
        <button 
          onClick={invokeScout} 
          disabled={isScouting}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-nova/60 hover:text-amber-400 bg-pulsar/10 hover:bg-amber-500/10 border border-pulsar/30 hover:border-amber-500/30 rounded-lg transition-all"
        >
          {isScouting ? 'SCOUTING...' : 'RUN SCOUT NOW'}
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="glass p-6 rounded-xl border border-pulsar/40 text-nova/60 text-center">
          No active opportunities found. The weekly/monthly scout will populate this list.
        </div>
      ) : (
        <div className="grid gap-4 w-full">
          {opportunities.map((opp) => {
            const isEditing = editingId === opp.id
            const isExpanded = expandedIds.has(opp.id)
            const validUrl = safeExternalUrl(opp.url)

            return (
              <div key={opp.id} className="glass p-5 rounded-xl border border-pulsar/40 flex flex-col gap-4">
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-pulsar/30 pb-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Edit Opportunity</span>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="text-nova/60 hover:text-starlight text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-mono uppercase text-nova/70 mb-1">Title</label>
                        <input 
                          value={editForm.title || ''}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          className="bg-void/70 border border-pulsar/40 rounded-lg px-3 py-2 text-sm text-starlight outline-none w-full focus:border-amber-500/50"
                          placeholder="Opportunity Title"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-nova/70 mb-1">URL</label>
                        <input 
                          value={editForm.url || ''}
                          onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                          className="bg-void/70 border border-pulsar/40 rounded-lg px-3 py-2 text-sm text-starlight outline-none w-full focus:border-amber-500/50"
                          placeholder="https://..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-mono uppercase text-nova/70 mb-1">Deadline</label>
                          <input 
                            type="date"
                            value={editForm.deadline || ''}
                            onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                            className="bg-void/70 border border-pulsar/40 rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none w-full focus:border-amber-500/50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-nova/70 mb-1">Effort</label>
                          <select
                            value={editForm.effort || ''}
                            onChange={e => setEditForm({ ...editForm, effort: e.target.value })}
                            className="bg-void/70 border border-pulsar/40 rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none w-full focus:border-amber-500/50"
                          >
                            <option value="">Effort...</option>
                            <option value="low">Low</option>
                            <option value="med">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-nova/70 mb-1">Profile Match %</label>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={editForm.profile_match ?? ''}
                            onChange={e => setEditForm({ ...editForm, profile_match: e.target.value })}
                            className="bg-void/70 border border-pulsar/40 rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none w-full focus:border-amber-500/50"
                            placeholder="0 - 100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-nova/70 mb-1">Acceptance %</label>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={editForm.acceptance_chance ?? ''}
                            onChange={e => setEditForm({ ...editForm, acceptance_chance: e.target.value })}
                            className="bg-void/70 border border-pulsar/40 rounded-lg px-2.5 py-1.5 text-xs text-starlight outline-none w-full focus:border-amber-500/50"
                            placeholder="0 - 100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-nova/70 mb-1">Program Summary / Project Fit</label>
                        <textarea 
                          value={editForm.project_fit || ''}
                          onChange={e => setEditForm({ ...editForm, project_fit: e.target.value })}
                          rows={3}
                          className="bg-void/70 border border-pulsar/40 rounded-lg px-3 py-2 text-sm text-starlight outline-none w-full focus:border-amber-500/50 leading-relaxed"
                          placeholder="Rich summary covering program overview, applicant fit, and eligibility..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-nova/70 mb-1">What's Offered (Funding, Perks, Stipend)</label>
                        <textarea 
                          value={editForm.what_offered || ''}
                          onChange={e => setEditForm({ ...editForm, what_offered: e.target.value })}
                          rows={2}
                          className="bg-void/70 border border-pulsar/40 rounded-lg px-3 py-2 text-sm text-starlight outline-none w-full focus:border-amber-500/50 leading-relaxed"
                          placeholder="Specific funding terms, grant amount, stipend, travel coverage..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-nova/70 mb-1">Application Draft</label>
                        <textarea 
                          value={editForm.application_draft || ''}
                          onChange={e => setEditForm({ ...editForm, application_draft: e.target.value })}
                          rows={4}
                          className="bg-void/70 border border-pulsar/40 rounded-lg px-3 py-2 text-xs font-mono text-starlight outline-none w-full focus:border-amber-500/50 leading-relaxed"
                          placeholder="Application draft text..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-pulsar/30">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg text-sm text-nova/60 hover:text-starlight hover:bg-pulsar/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 rounded-lg text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div 
                      className="flex justify-between items-start cursor-pointer select-none group"
                      onClick={() => toggleExpand(opp.id)}
                    >
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-display font-bold text-starlight group-hover:text-amber-400 transition-colors">
                            {opp.title}
                          </h3>
                          {validUrl && (
                            <a 
                              href={validUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={(e) => e.stopPropagation()}
                              className="text-nova/60 hover:text-amber-400 transition-colors p-1"
                              title="Open original link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-mono mt-2">
                          {opp.deadline && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400/90 border border-amber-500/20">
                              Deadline: {opp.deadline}
                            </span>
                          )}
                          {opp.effort && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Effort: {opp.effort}
                            </span>
                          )}
                          {opp.profile_match != null && (
                            <span className={`px-2 py-0.5 rounded border ${
                              opp.profile_match >= 80 ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                              opp.profile_match >= 50 ? 'border-pulsar/30 text-nova/70 bg-pulsar/10' :
                              'border-red-500/30 text-red-400/70 bg-red-500/10'
                            }`}>
                              Match: {opp.profile_match}%
                            </span>
                          )}
                          {opp.acceptance_chance != null && (
                            <span className={`px-2 py-0.5 rounded border ${
                              opp.acceptance_chance >= 60 ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                              opp.acceptance_chance >= 30 ? 'border-pulsar/30 text-nova/70 bg-pulsar/10' :
                              'border-red-500/30 text-red-400/70 bg-red-500/10'
                            }`}>
                              Chance: {opp.acceptance_chance}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); startEditing(opp); }} 
                          className="p-1.5 text-nova/60 hover:text-starlight rounded bg-pulsar/10 border border-pulsar/30 hover:border-pulsar/60 transition-colors"
                          title="Edit details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
                          {opp.status}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(opp.id); }}
                          className="p-1.5 text-nova/60 hover:text-amber-400 rounded bg-pulsar/10 border border-pulsar/30 hover:border-amber-500/30 transition-colors"
                          title={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Summary Section */}
                    {(() => {
                      const breakdown = parseOpportunityBreakdown(opp)
                      return !isExpanded ? (
                        /* Collapsed Teaser */
                        <div className="space-y-1">
                          <p className="text-sm font-body text-nova/80 line-clamp-2 leading-relaxed">
                            {breakdown.overview}
                          </p>
                          <button 
                            onClick={() => toggleExpand(opp.id)}
                            className="text-xs font-mono text-amber-400/90 hover:text-amber-300 flex items-center gap-1 transition-colors"
                          >
                            View Strategic Details <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        /* Expanded Structured Breakdown */
                        <div className="space-y-3 pt-1">
                          {/* a) Program Summary / Overview */}
                          <div className="bg-void/70 p-3.5 rounded-xl border border-pulsar/30 space-y-1">
                            <div className="text-xs font-mono uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-amber-400" /> Program Summary / Overview
                            </div>
                            <p className="text-sm font-body text-starlight/90 leading-relaxed">
                              {breakdown.overview}
                            </p>
                          </div>

                          {/* b) Strategic Fit & Eligibility */}
                          <div className="bg-void/70 p-3.5 rounded-xl border border-pulsar/30 space-y-2">
                            <div className="text-xs font-mono uppercase tracking-wider text-blue-400/90 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Strategic Fit & Eligibility
                            </div>
                            <p className="text-sm font-body text-starlight/90 leading-relaxed">
                              {breakdown.fit}
                            </p>
                            <div className="text-xs font-mono text-nova/80 space-y-1 border-t border-pulsar/20 pt-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-amber-400/90 font-medium">Verified Constraints:</span>
                                <span className="text-starlight/90">Bangladeshi national, EEE undergrad, Indian student visa</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-nova/70">
                                <span>Profile Match: <strong className="text-emerald-400">{opp.profile_match != null ? `${opp.profile_match}%` : 'Pending'}</strong></span>
                                <span>:</span>
                                <span>Acceptance Probability: <strong className="text-blue-400">{opp.acceptance_chance != null ? `${opp.acceptance_chance}%` : 'Pending'}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* c) What's Offered */}
                          <div className="bg-void/70 p-3.5 rounded-xl border border-pulsar/30 space-y-1">
                            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                              <Gift className="w-3.5 h-3.5 text-emerald-400" /> What's Offered (Funding, Perks, Stipend)
                            </div>
                            <p className="text-sm font-body text-starlight/90 leading-relaxed">
                              {breakdown.offered}
                            </p>
                          </div>

                          {/* d) Application Draft */}
                          {opp.application_draft && (
                            <div className="bg-void/70 p-3.5 rounded-xl border border-pulsar/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-mono uppercase tracking-wider text-purple-400/90 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Application Draft
                                </div>
                                <button
                                  onClick={() => handleCopyDraft(opp.id, opp.application_draft)}
                                  className="flex items-center gap-1 text-xs font-mono text-nova/70 hover:text-starlight px-2 py-0.5 rounded bg-pulsar/10 border border-pulsar/30 hover:border-pulsar/60 transition-colors"
                                  title="Copy draft to clipboard"
                                >
                                  {copiedId === opp.id ? (
                                    <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                                  ) : (
                                    <><Copy className="w-3 h-3" /> Copy Draft</>
                                  )}
                                </button>
                              </div>
                              <div className="p-3 rounded-lg bg-void/90 border border-pulsar/20 text-xs font-mono text-starlight/85 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-text">
                                {opp.application_draft}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-pulsar/20">
                      {isExpanded ? (
                        <button
                          onClick={() => toggleExpand(opp.id)}
                          className="text-xs font-mono text-nova/60 hover:text-amber-400 flex items-center gap-1 transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" /> Collapse Details
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setDismissTargetOpp(opp)}
                          className="px-4 py-2 rounded-lg text-sm text-nova/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => approveAndActivate(opp)}
                          disabled={opp.status === 'applied'}
                          className="px-4 py-2 rounded-lg text-sm bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {opp.status === 'applied' ? (
                            <><Check className="w-4 h-4" /> Added to Tasks</>
                          ) : (
                            <><Plus className="w-4 h-4" /> Move to Tasks</>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <DismissFeedbackModal 
        isOpen={!!dismissTargetOpp}
        onClose={() => setDismissTargetOpp(null)}
        opportunity={dismissTargetOpp}
        onConfirmDismiss={rejectOpportunityWithFeedback}
      />
    </div>
  )
}

export default HardwareScoutPanel
