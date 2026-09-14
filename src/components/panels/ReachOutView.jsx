import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCelebration } from '../../hooks/useCelebration'
import {
  Send,
  Plus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { format, addDays } from 'date-fns'

import {
  STATUS_CONFIG,
  STATUS_KEYS,
  getFollowUpMeta,
} from './reachout/reachOutConstants'
import ReachOutFilterBar from './reachout/ReachOutFilterBar'
import BatchImportModal from './reachout/BatchImportModal'
import TargetFormModal from './reachout/TargetFormModal'
import ReachOutTargetCard from './reachout/ReachOutTargetCard'

export default function ReachOutView() {
  const { user } = useAuth()
  const { celebrate } = useCelebration()

  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtering & Search state
  const [activePipelineFilter, setActivePipelineFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Batch import state
  const [isBatchOpen, setIsBatchOpen] = useState(false)

  // Card expansion & clipboard state
  const [expandedId, setExpandedId] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  // In-app direct editing state
  const [editingBriefId, setEditingBriefId] = useState(null)
  const [briefEditValue, setBriefEditValue] = useState('')
  const [editingDraftId, setEditingDraftId] = useState(null)
  const [draftEditValue, setDraftEditValue] = useState('')
  const [savingInline, setSavingInline] = useState(false)

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    profile_url: '',
    email: '',
    status: 'researching',
    fit_brief: '',
    draft_text: '',
    source_papers: '',
    sent_date: '',
    follow_up_due: '',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchTargets()
    }
  }, [user?.id])

  const fetchTargets = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('outreach_targets')
        .select('*')
        .eq('user_id', user.id)

      if (fetchErr) throw fetchErr
      setTargets(data || [])
    } catch (err) {
      console.error('Error fetching outreach targets:', err)
      setError('Could not load outreach targets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filtered and sorted targets list
  const filteredAndSortedTargets = useMemo(() => {
    let result = [...targets]

    // 1. Pipeline status filter
    if (activePipelineFilter !== 'all') {
      result = result.filter((t) => t.status === activePipelineFilter)
    }

    // 2. Search query filter
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      const terms = query.split(/\s+/).filter(Boolean)
      result = result.filter((t) => {
        const searchableText = [
          t.name || '',
          t.institution || '',
          t.profile_url || '',
          t.email || '',
          t.fit_brief || '',
          t.draft_text || '',
          t.source_papers || '',
        ]
          .join(' ')
          .toLowerCase()

        return terms.every((term) => searchableText.includes(term))
      })
    }

    // 3. Priority Sort: Overdue first, Due Today second, then pipeline order, follow-up date, and created_at
    result.sort((a, b) => {
      const metaA = getFollowUpMeta(a)
      const metaB = getFollowUpMeta(b)

      if (metaA.isOverdue && !metaB.isOverdue) return -1
      if (!metaA.isOverdue && metaB.isOverdue) return 1

      if (metaA.isDueToday && !metaB.isDueToday) return -1
      if (!metaA.isDueToday && metaB.isDueToday) return 1

      const orderA = STATUS_CONFIG[a.status]?.order ?? 99
      const orderB = STATUS_CONFIG[b.status]?.order ?? 99
      if (orderA !== orderB) {
        return orderA - orderB
      }

      if (a.follow_up_due && b.follow_up_due) {
        return new Date(a.follow_up_due) - new Date(b.follow_up_due)
      }
      if (a.follow_up_due) return -1
      if (b.follow_up_due) return 1

      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })

    return result
  }, [targets, activePipelineFilter, searchQuery])

  // Count calculations for status pipeline bar
  const pipelineCounts = useMemo(() => {
    const counts = { all: targets.length }
    STATUS_KEYS.forEach((key) => {
      counts[key] = targets.filter((t) => t.status === key).length
    })
    return counts
  }, [targets])

  // Clipboard copy handler with temporary feedback
  const handleCopy = async (text, key, e) => {
    if (e) e.stopPropagation()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  // Quick Action: Mark as Sent Today
  const handleMarkAsSentToday = async (target, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const nextFollowUp = target.follow_up_due || format(addDays(new Date(), 7), 'yyyy-MM-dd')

    setTargets((prev) =>
      prev.map((t) =>
        t.id === target.id
          ? { ...t, status: 'sent', sent_date: todayStr, follow_up_due: nextFollowUp }
          : t
      )
    )

    try {
      const { error: updateErr } = await supabase
        .from('outreach_targets')
        .update({
          status: 'sent',
          sent_date: todayStr,
          follow_up_due: nextFollowUp,
        })
        .eq('id', target.id)
        .eq('user_id', user.id)

      if (updateErr) throw updateErr
      celebrate()
    } catch (err) {
      console.error('Failed to mark target as sent:', err)
      fetchTargets()
    }
  }

  // Quick Action: Mark as Replied
  const handleMarkAsReplied = async (target, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return

    setTargets((prev) =>
      prev.map((t) => (t.id === target.id ? { ...t, status: 'replied' } : t))
    )

    try {
      const { error: updateErr } = await supabase
        .from('outreach_targets')
        .update({ status: 'replied' })
        .eq('id', target.id)
        .eq('user_id', user.id)

      if (updateErr) throw updateErr
      celebrate()
    } catch (err) {
      console.error('Failed to mark target as replied:', err)
      fetchTargets()
    }
  }

  // Quick Action: Set follow-up in X days
  const handleSetFollowUpDays = async (target, days, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return

    const nextDueDate = format(addDays(new Date(), days), 'yyyy-MM-dd')

    setTargets((prev) =>
      prev.map((t) => (t.id === target.id ? { ...t, follow_up_due: nextDueDate } : t))
    )

    try {
      const { error: updateErr } = await supabase
        .from('outreach_targets')
        .update({ follow_up_due: nextDueDate })
        .eq('id', target.id)
        .eq('user_id', user.id)

      if (updateErr) throw updateErr
    } catch (err) {
      console.error('Failed to update follow-up date:', err)
      fetchTargets()
    }
  }

  // Quick Status dropdown change
  const handleQuickStatusChange = async (targetId, nextStatus, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return

    const currentTarget = targets.find((t) => t.id === targetId)
    const updateData = { status: nextStatus }

    if (nextStatus === 'sent' && !currentTarget?.sent_date) {
      updateData.sent_date = format(new Date(), 'yyyy-MM-dd')
      if (!currentTarget?.follow_up_due) {
        updateData.follow_up_due = format(addDays(new Date(), 7), 'yyyy-MM-dd')
      }
    }

    setTargets((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, ...updateData } : t))
    )

    try {
      const { error: updateErr } = await supabase
        .from('outreach_targets')
        .update(updateData)
        .eq('id', targetId)
        .eq('user_id', user.id)

      if (updateErr) throw updateErr

      if (nextStatus === 'replied' || nextStatus === 'sent') {
        celebrate()
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      fetchTargets()
    }
  }

  // Inline Direct Editing: Fit Brief
  const handleStartEditBrief = (target, e) => {
    if (e) e.stopPropagation()
    setEditingBriefId(target.id)
    setBriefEditValue(target.fit_brief || '')
  }

  const handleCancelEditBrief = (e) => {
    if (e) e.stopPropagation()
    setEditingBriefId(null)
    setBriefEditValue('')
  }

  const handleSaveInlineBrief = async (targetId, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return

    setSavingInline(true)
    const trimmed = briefEditValue.trim() || null
    try {
      const { error: updateErr } = await supabase
        .from('outreach_targets')
        .update({ fit_brief: trimmed })
        .eq('id', targetId)
        .eq('user_id', user.id)

      if (updateErr) throw updateErr

      setTargets((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, fit_brief: trimmed } : t))
      )
      setEditingBriefId(null)
      setBriefEditValue('')
    } catch (err) {
      console.error('Failed to update fit brief:', err)
      alert(`Failed to save fit brief: ${err.message || 'Unknown database error'}`)
    } finally {
      setSavingInline(false)
    }
  }

  // Inline Direct Editing: Draft Text
  const handleStartEditDraft = (target, e) => {
    if (e) e.stopPropagation()
    setEditingDraftId(target.id)
    setDraftEditValue(target.draft_text || '')
  }

  const handleCancelEditDraft = (e) => {
    if (e) e.stopPropagation()
    setEditingDraftId(null)
    setDraftEditValue('')
  }

  const handleSaveInlineDraft = async (targetId, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return

    setSavingInline(true)
    const trimmed = draftEditValue.trim() || null
    try {
      const { error: updateErr } = await supabase
        .from('outreach_targets')
        .update({ draft_text: trimmed })
        .eq('id', targetId)
        .eq('user_id', user.id)

      if (updateErr) throw updateErr

      setTargets((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, draft_text: trimmed } : t))
      )
      setEditingDraftId(null)
      setDraftEditValue('')
    } catch (err) {
      console.error('Failed to update draft text:', err)
      alert(`Failed to save draft: ${err.message || 'Unknown database error'}`)
    } finally {
      setSavingInline(false)
    }
  }

  // Delete Target
  const handleDeleteTarget = async (targetId, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return
    if (!window.confirm('Are you sure you want to remove this outreach target?')) return

    setTargets((prev) => prev.filter((t) => t.id !== targetId))
    try {
      const { error: delErr } = await supabase
        .from('outreach_targets')
        .delete()
        .eq('id', targetId)
        .eq('user_id', user.id)

      if (delErr) throw delErr
    } catch (err) {
      console.error('Failed to delete target:', err)
      fetchTargets()
    }
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingTarget(null)
    setFormData({
      name: '',
      institution: '',
      profile_url: '',
      email: '',
      status: 'researching',
      fit_brief: '',
      draft_text: '',
      source_papers: '',
      sent_date: '',
      follow_up_due: '',
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (target, e) => {
    if (e) e.stopPropagation()
    setEditingTarget(target)
    setFormData({
      name: target.name || '',
      institution: target.institution || '',
      profile_url: target.profile_url || '',
      email: target.email || '',
      status: target.status || 'researching',
      fit_brief: target.fit_brief || '',
      draft_text: target.draft_text || '',
      source_papers: target.source_papers || '',
      sent_date: target.sent_date || '',
      follow_up_due: target.follow_up_due || '',
    })
    setIsModalOpen(true)
  }

  // Save Modal (Insert / Update)
  const handleSaveTarget = async (e) => {
    e.preventDefault()
    if (!user?.id || !formData.name.trim() || !formData.institution.trim()) return

    setFormSubmitting(true)
    try {
      const payload = {
        user_id: user.id,
        name: formData.name.trim(),
        institution: formData.institution.trim(),
        profile_url: formData.profile_url.trim() || null,
        email: formData.email.trim() || null,
        status: formData.status || 'researching',
        fit_brief: formData.fit_brief.trim() || null,
        draft_text: formData.draft_text.trim() || null,
        source_papers: formData.source_papers.trim() || null,
        sent_date: formData.sent_date || null,
        follow_up_due: formData.follow_up_due || null,
      }

      if (editingTarget) {
        const { error: updateErr } = await supabase
          .from('outreach_targets')
          .update(payload)
          .eq('id', editingTarget.id)
          .eq('user_id', user.id)

        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('outreach_targets')
          .insert(payload)

        if (insertErr) throw insertErr
      }

      setIsModalOpen(false)
      fetchTargets()
    } catch (err) {
      console.error('Error saving target:', err)
      alert(`Save failed: ${err.message || 'Unknown database error'}`)
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl w-full pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display text-starlight flex items-center gap-2">
            <Send className="w-5 h-5 text-pulsar" /> Reach Out Transmission Console
          </h2>
          <p className="text-xs font-mono text-nova/60 mt-0.5">
            Academic and professional outreach tracker with intelligent follow-up cadence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTargets}
            disabled={loading}
            className="p-2 rounded-lg bg-void/60 border border-pulsar/30 text-nova/80 hover:text-starlight hover:border-pulsar transition-colors"
            title="Refresh outreach targets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-lg bg-pulsar/20 hover:bg-pulsar/30 text-pulsar border border-pulsar/40 font-display text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Target
          </button>
        </div>
      </div>

      {/* Feature 1 & 2: Pipeline Filters and Search Bar */}
      <ReachOutFilterBar
        activePipelineFilter={activePipelineFilter}
        onSelectPipelineFilter={setActivePipelineFilter}
        pipelineCounts={pipelineCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={targets.length}
        filteredCount={filteredAndSortedTargets.length}
        onResetFilters={() => {
          setSearchQuery('')
          setActivePipelineFilter('all')
        }}
      />

      {/* Feature 3: Collapsible Batch Importer */}
      <BatchImportModal
        isOpen={isBatchOpen}
        onToggle={() => setIsBatchOpen((prev) => !prev)}
        user={user}
        onImportSuccess={fetchTargets}
      />

      {/* Loading & Error States */}
      {loading && (
        <div className="text-center py-16">
          <RefreshCw className="w-6 h-6 text-pulsar animate-spin mx-auto mb-2" />
          <p className="text-nova/60 font-mono text-xs">Loading outreach targets...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl glass border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAndSortedTargets.length === 0 && (
        <div className="glass border border-pulsar/30 rounded-xl p-10 text-center bg-void/30 space-y-3">
          <Send className="w-10 h-10 text-nova/30 mx-auto" />
          <h3 className="text-base font-display text-starlight">No outreach targets match</h3>
          <p className="text-xs text-nova/60 font-body max-w-md mx-auto">
            {searchQuery || activePipelineFilter !== 'all'
              ? 'No targets found matching your current filter criteria. Try searching with different terms or resetting filters.'
              : 'Start tracking professors, researchers, or mentors. You can add targets individually or import a batch in JSON format.'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            {searchQuery || activePipelineFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setActivePipelineFilter('all')
                }}
                className="px-3.5 py-1.5 rounded-lg bg-void/80 hover:bg-void text-starlight border border-pulsar/40 text-xs font-mono transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-lg bg-pulsar/20 hover:bg-pulsar/30 text-pulsar border border-pulsar/40 text-xs font-display inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Target
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feature 4: Transmission Console Card List */}
      {!loading && filteredAndSortedTargets.length > 0 && (
        <div className="space-y-3">
          {filteredAndSortedTargets.map((target) => (
            <ReachOutTargetCard
              key={target.id}
              target={target}
              isExpanded={expandedId === target.id}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === target.id ? null : target.id))
              }
              copiedKey={copiedKey}
              onCopy={handleCopy}
              onQuickStatusChange={handleQuickStatusChange}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteTarget}
              onMarkAsSentToday={handleMarkAsSentToday}
              onMarkAsReplied={handleMarkAsReplied}
              onSetFollowUpDays={handleSetFollowUpDays}
              editingBriefId={editingBriefId}
              briefEditValue={briefEditValue}
              onBriefEditChange={setBriefEditValue}
              onStartEditBrief={handleStartEditBrief}
              onCancelEditBrief={handleCancelEditBrief}
              onSaveInlineBrief={handleSaveInlineBrief}
              editingDraftId={editingDraftId}
              draftEditValue={draftEditValue}
              onDraftEditChange={setDraftEditValue}
              onStartEditDraft={handleStartEditDraft}
              onCancelEditDraft={handleCancelEditDraft}
              onSaveInlineDraft={handleSaveInlineDraft}
              savingInline={savingInline}
            />
          ))}
        </div>
      )}

      {/* Feature 5: Add / Edit Modal */}
      <TargetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingTarget={editingTarget}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleSaveTarget}
        formSubmitting={formSubmitting}
      />
    </div>
  )
}
