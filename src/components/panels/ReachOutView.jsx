import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Send,
  Plus,
  ChevronDown,
  ChevronUp,
  Mail,
  Building2,
  Calendar,
  Trash2,
  Edit2,
  X,
  FileText,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'

const STATUS_CONFIG = {
  researching: {
    label: 'Researching',
    order: 0,
    classes: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
  },
  fit_brief_done: {
    label: 'Fit Brief Done',
    order: 1,
    classes: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
  },
  drafted: {
    label: 'Drafted',
    order: 2,
    classes: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
  },
  queued: {
    label: 'Queued',
    order: 3,
    classes: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
  },
  sent: {
    label: 'Sent',
    order: 4,
    classes: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
  },
  replied: {
    label: 'Replied',
    order: 5,
    classes: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
  },
}

const STATUS_KEYS = Object.keys(STATUS_CONFIG)

export default function ReachOutView() {
  const { user } = useAuth()
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Batch import state
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [batchInput, setBatchInput] = useState('')
  const [batchMessage, setBatchMessage] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    institution: '',
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

  // Sort targets: first by status order, then by follow_up_due (ascending, nulls last), then created_at
  const sortedTargets = useMemo(() => {
    return [...targets].sort((a, b) => {
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
  }, [targets])

  const handleOpenAddModal = () => {
    setEditingTarget(null)
    setFormData({
      name: '',
      institution: '',
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

  const handleOpenEditModal = (target, e) => {
    if (e) e.stopPropagation()
    setEditingTarget(target)
    setFormData({
      name: target.name || '',
      institution: target.institution || '',
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

  const handleSaveTarget = async (e) => {
    e.preventDefault()
    if (!user?.id || !formData.name.trim() || !formData.institution.trim()) return

    setFormSubmitting(true)
    try {
      const payload = {
        user_id: user.id,
        name: formData.name.trim(),
        institution: formData.institution.trim(),
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
      alert(`Save failed: ${err.message || 'Unknown error'}`)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleQuickStatusChange = async (targetId, nextStatus, e) => {
    if (e) e.stopPropagation()
    if (!user?.id) return

    // Optimistic update
    setTargets((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, status: nextStatus } : t))
    )

    try {
      const updateData = { status: nextStatus }
      if (nextStatus === 'sent' && !targets.find((t) => t.id === targetId)?.sent_date) {
        updateData.sent_date = new Date().toISOString().slice(0, 10)
      }

      const { error: updateErr } = await supabase
        .from('outreach_targets')
        .update(updateData)
        .eq('id', targetId)
        .eq('user_id', user.id)

      if (updateErr) throw updateErr
    } catch (err) {
      console.error('Failed to update status:', err)
      fetchTargets()
    }
  }

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

  const handleBatchImport = async () => {
    if (!user?.id || !batchInput.trim()) return

    setBatchLoading(true)
    setBatchMessage(null)

    let parsed
    try {
      parsed = JSON.parse(batchInput.trim())
    } catch (err) {
      setBatchMessage({
        type: 'error',
        text: 'Malformed JSON: Please check the syntax and ensure it is a valid JSON array.',
      })
      setBatchLoading(false)
      return
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setBatchMessage({
        type: 'error',
        text: 'Expected a non-empty JSON array: [{ name, institution, email, fit_brief, draft_text }].',
      })
      setBatchLoading(false)
      return
    }

    const invalidItem = parsed.find((item) => !item || !item.name || !item.institution)
    if (invalidItem) {
      setBatchMessage({
        type: 'error',
        text: 'Every target in the array must contain both "name" and "institution" properties.',
      })
      setBatchLoading(false)
      return
    }

    const rows = parsed.map((item) => ({
      name: String(item.name).trim(),
      institution: String(item.institution).trim(),
      email: item.email ? String(item.email).trim() : null,
      fit_brief: item.fit_brief ? String(item.fit_brief).trim() : null,
      draft_text: item.draft_text ? String(item.draft_text).trim() : null,
      source_papers: item.source_papers ? String(item.source_papers).trim() : null,
      sent_date: item.sent_date || null,
      follow_up_due: null,
      status: 'drafted',
      user_id: user.id,
    }))

    try {
      const { error: insErr } = await supabase.from('outreach_targets').insert(rows)
      if (insErr) throw insErr

      setBatchMessage({
        type: 'success',
        text: `${rows.length} target${rows.length > 1 ? 's' : ''} added successfully!`,
      })
      setBatchInput('')
      fetchTargets()
    } catch (err) {
      console.error('Batch import failed:', err)
      setBatchMessage({
        type: 'error',
        text: `Batch import failed: ${err.message || 'Unknown database error'}`,
      })
    } finally {
      setBatchLoading(false)
    }
  }

  const sampleBatchPlaceholder = `[\n  {\n    "name": "Prof. Alan Turing",\n    "institution": "University of Manchester",\n    "email": "aturing@manchester.ac.uk",\n    "fit_brief": "Research on morphogenesis and computational intelligence",\n    "draft_text": "Dear Prof. Turing, I read your paper on..."\n  }\n]`

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Target Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display text-starlight flex items-center gap-2">
            <Send className="w-5 h-5 text-pulsar" /> Reach Out
          </h2>
          <p className="text-xs font-mono text-nova/60 mt-0.5">
            Academic and professional outreach tracker
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTargets}
            disabled={loading}
            className="p-2 rounded-lg bg-void/60 border border-pulsar/30 text-nova/80 hover:text-starlight hover:border-pulsar transition-colors"
            title="Refresh targets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-lg bg-pulsar/20 hover:bg-pulsar/30 text-pulsar border border-pulsar/40 font-display text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Target
          </button>
        </div>
      </div>

      {/* Batch Import Collapsible Section */}
      <div className="glass border border-pulsar/30 rounded-xl overflow-hidden transition-all">
        <button
          onClick={() => {
            setIsBatchOpen((prev) => !prev)
            setBatchMessage(null)
          }}
          className="w-full px-4 py-3 bg-void/40 flex items-center justify-between text-left hover:bg-void/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-aurora" />
            <span className="text-sm font-display text-starlight">Batch Import Targets</span>
            <span className="text-xs font-mono text-nova/50">JSON array</span>
          </div>
          {isBatchOpen ? (
            <ChevronUp className="w-4 h-4 text-nova/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-nova/60" />
          )}
        </button>

        {isBatchOpen && (
          <div className="p-4 bg-void/20 border-t border-pulsar/20 space-y-3">
            <p className="text-xs text-nova/70 font-body">
              Paste a JSON array of outreach targets. All imported items will be saved with status{' '}
              <span className="font-mono text-indigo-300">drafted</span> and no initial follow-up date.
            </p>

            <textarea
              rows={6}
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={sampleBatchPlaceholder}
              className="w-full bg-void/80 border border-pulsar/30 rounded-lg p-3 text-xs font-mono text-starlight placeholder:text-nova/30 focus:outline-none focus:border-pulsar"
            />

            {batchMessage && (
              <div
                className={`p-3 rounded-lg border text-xs font-body flex items-start gap-2 ${
                  batchMessage.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                }`}
              >
                {batchMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <span>{batchMessage.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setBatchInput('')
                  setBatchMessage(null)
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-nova/60 hover:text-starlight transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleBatchImport}
                disabled={batchLoading || !batchInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald/20 hover:bg-emerald/30 text-emerald border border-emerald/50 text-xs font-display flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {batchLoading ? 'Importing...' : 'Import Batch'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Target Status Counts Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STATUS_KEYS.map((key) => {
          const cfg = STATUS_CONFIG[key]
          const count = targets.filter((t) => t.status === key).length
          return (
            <div
              key={key}
              className="glass border border-pulsar/20 rounded-lg p-2.5 text-center bg-void/30"
            >
              <span
                className={`inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border ${cfg.classes} mb-1`}
              >
                {cfg.label}
              </span>
              <p className="text-base font-display text-starlight">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-nova/60 font-mono text-sm animate-pulse">
            Loading outreach targets...
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl glass border border-rose-800/50 bg-rose-950/30 text-rose-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedTargets.length === 0 && (
        <div className="glass border border-pulsar/30 rounded-xl p-8 text-center bg-void/20">
          <Send className="w-10 h-10 text-nova/30 mx-auto mb-3" />
          <h3 className="text-base font-display text-starlight mb-1">No outreach targets yet</h3>
          <p className="text-xs text-nova/60 font-body max-w-md mx-auto mb-4">
            Start tracking professors, researchers, mentors, or collaborators. You can add targets
            individually or import a batch in JSON format.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-lg bg-pulsar/20 hover:bg-pulsar/30 text-pulsar border border-pulsar/40 text-xs font-display inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Target
          </button>
        </div>
      )}

      {/* Targets List */}
      {!loading && sortedTargets.length > 0 && (
        <div className="space-y-3">
          {sortedTargets.map((target) => {
            const statusCfg = STATUS_CONFIG[target.status] || STATUS_CONFIG.researching
            const isExpanded = expandedId === target.id
            const isDueSoon =
              target.follow_up_due &&
              new Date(target.follow_up_due) <= new Date(Date.now() + 86400000 * 2)

            return (
              <div
                key={target.id}
                className="glass border border-pulsar/30 rounded-xl overflow-hidden bg-void/30 hover:border-pulsar/60 transition-all"
              >
                {/* Main Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : target.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-base text-starlight truncate">
                        {target.name}
                      </h4>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusCfg.classes}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-nova/70 flex-wrap">
                      <span className="flex items-center gap-1 text-nova/80">
                        <Building2 className="w-3.5 h-3.5 text-aurora/80" />
                        {target.institution}
                      </span>
                      {target.email && (
                        <span className="flex items-center gap-1 text-nova/60">
                          <Mail className="w-3.5 h-3.5 text-nova/60" />
                          {target.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Follow-up Due & Actions */}
                  <div className="flex items-center gap-3 sm:self-center flex-wrap">
                    {target.follow_up_due ? (
                      <div
                        className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border ${
                          isDueSoon
                            ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                            : 'bg-void/60 border-pulsar/20 text-nova/70'
                        }`}
                        title="Follow-up due date"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {format(new Date(target.follow_up_due), 'd MMM yyyy')}</span>
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-nova/40 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>No follow-up set</span>
                      </div>
                    )}

                    {/* Quick Status Dropdown */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={target.status}
                        onChange={(e) => handleQuickStatusChange(target.id, e.target.value, e)}
                        className="bg-void/80 border border-pulsar/30 text-starlight text-xs font-mono rounded px-2 py-1 focus:outline-none focus:border-pulsar"
                      >
                        {STATUS_KEYS.map((k) => (
                          <option key={k} value={k} className="bg-stardust text-starlight">
                            {STATUS_CONFIG[k].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={(e) => handleOpenEditModal(target, e)}
                      className="p-1.5 text-nova/60 hover:text-starlight rounded hover:bg-void/60 transition-colors"
                      title="Edit target"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteTarget(target.id, e)}
                      className="p-1.5 text-nova/60 hover:text-rose-400 rounded hover:bg-void/60 transition-colors"
                      title="Delete target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-pulsar/20 bg-void/40 space-y-3 text-xs">
                    {target.fit_brief && (
                      <div className="space-y-1">
                        <span className="font-mono text-nova/60 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-gold" /> Fit Brief:
                        </span>
                        <p className="font-body text-starlight/90 bg-void/60 p-2.5 rounded-lg border border-blue-900/20 leading-relaxed whitespace-pre-wrap">
                          {target.fit_brief}
                        </p>
                      </div>
                    )}

                    {target.draft_text && (
                      <div className="space-y-1">
                        <span className="font-mono text-nova/60 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-aurora" /> Draft Email / Letter:
                        </span>
                        <p className="font-body text-starlight/90 bg-void/60 p-2.5 rounded-lg border border-blue-900/20 leading-relaxed whitespace-pre-wrap">
                          {target.draft_text}
                        </p>
                      </div>
                    )}

                    {target.source_papers && (
                      <div className="space-y-1">
                        <span className="font-mono text-nova/60 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-pulsar" /> Source Papers / Links:
                        </span>
                        <p className="font-mono text-nova/80 bg-void/60 p-2.5 rounded-lg border border-blue-900/20 leading-relaxed whitespace-pre-wrap">
                          {target.source_papers}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] font-mono text-nova/50 border-t border-pulsar/10">
                      <div>
                        {target.sent_date && (
                          <span>Sent on: {format(new Date(target.sent_date), 'd MMM yyyy')}</span>
                        )}
                      </div>
                      <div>
                        <span>Created: {format(new Date(target.created_at), 'd MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Target Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="glass border border-pulsar/40 bg-stardust rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-in">
            <div className="p-4 bg-void/60 border-b border-pulsar/20 flex items-center justify-between">
              <h3 className="font-display text-base text-starlight flex items-center gap-2">
                <Send className="w-4 h-4 text-pulsar" />
                {editingTarget ? 'Edit Outreach Target' : 'Add New Outreach Target'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-nova/60 hover:text-starlight rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Prof. Ada Lovelace"
                    className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Institution *</label>
                  <input
                    type="text"
                    required
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="MIT / Cambridge"
                    className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@university.edu"
                    className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar"
                  >
                    {STATUS_KEYS.map((k) => (
                      <option key={k} value={k} className="bg-stardust text-starlight">
                        {STATUS_CONFIG[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Sent Date</label>
                  <input
                    type="date"
                    value={formData.sent_date}
                    onChange={(e) => setFormData({ ...formData, sent_date: e.target.value })}
                    className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Follow-up Due</label>
                  <input
                    type="date"
                    value={formData.follow_up_due}
                    onChange={(e) => setFormData({ ...formData, follow_up_due: e.target.value })}
                    className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-nova/80">Fit Brief</label>
                <textarea
                  rows={3}
                  value={formData.fit_brief}
                  onChange={(e) => setFormData({ ...formData, fit_brief: e.target.value })}
                  placeholder="Key research alignment, shared lab interests, or mutual citations..."
                  className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-nova/80">Draft Text</label>
                <textarea
                  rows={4}
                  value={formData.draft_text}
                  onChange={(e) => setFormData({ ...formData, draft_text: e.target.value })}
                  placeholder="Draft email body or outreach note..."
                  className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-nova/80">Source Papers / References</label>
                <input
                  type="text"
                  value={formData.source_papers}
                  onChange={(e) => setFormData({ ...formData, source_papers: e.target.value })}
                  placeholder="Key papers, ArXiv links, project URLs..."
                  className="w-full bg-void/70 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pulsar/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-nova/60 hover:text-starlight transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-pulsar/20 hover:bg-pulsar/30 text-pulsar border border-pulsar/50 text-xs font-display flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingTarget ? 'Update Target' : 'Create Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
