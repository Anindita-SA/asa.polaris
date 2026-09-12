import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCelebration } from '../../hooks/useCelebration'
import {
  safeExternalUrl,
  createMailtoUrl,
  createGmailComposeUrl,
  createAcademicSearchUrl,
} from '../../lib/urlUtils'
import {
  Send,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Building2,
  Calendar,
  CalendarPlus,
  CalendarClock,
  Trash2,
  Edit2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  BookOpen,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Upload,
  Code2,
  SlidersHorizontal,
  User,
  Globe,
} from 'lucide-react'
import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns'

const STATUS_CONFIG = {
  researching: {
    key: 'researching',
    label: 'Researching',
    order: 0,
    dotColor: 'bg-sky-400',
    badgeClasses: 'bg-sky-950/80 text-sky-300 border-sky-800',
    activeTabClasses: 'bg-sky-950 border-sky-600 text-sky-200',
    tabBadgeClasses: 'bg-sky-900/80 text-sky-200 border-sky-700',
  },
  fit_brief_done: {
    key: 'fit_brief_done',
    label: 'Fit Brief Done',
    order: 1,
    dotColor: 'bg-amber-400',
    badgeClasses: 'bg-amber-950/80 text-amber-300 border-amber-800',
    activeTabClasses: 'bg-amber-950 border-amber-600 text-amber-200',
    tabBadgeClasses: 'bg-amber-900/80 text-amber-200 border-amber-700',
  },
  drafted: {
    key: 'drafted',
    label: 'Drafted',
    order: 2,
    dotColor: 'bg-indigo-400',
    badgeClasses: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
    activeTabClasses: 'bg-indigo-950 border-indigo-600 text-indigo-200',
    tabBadgeClasses: 'bg-indigo-900/80 text-indigo-200 border-indigo-700',
  },
  queued: {
    key: 'queued',
    label: 'Queued',
    order: 3,
    dotColor: 'bg-purple-400',
    badgeClasses: 'bg-purple-950/80 text-purple-300 border-purple-800',
    activeTabClasses: 'bg-purple-950 border-purple-600 text-purple-200',
    tabBadgeClasses: 'bg-purple-900/80 text-purple-200 border-purple-700',
  },
  sent: {
    key: 'sent',
    label: 'Sent',
    order: 4,
    dotColor: 'bg-blue-400',
    badgeClasses: 'bg-blue-950/80 text-blue-300 border-blue-800',
    activeTabClasses: 'bg-blue-950 border-blue-600 text-blue-200',
    tabBadgeClasses: 'bg-blue-900/80 text-blue-200 border-blue-700',
  },
  replied: {
    key: 'replied',
    label: 'Replied',
    order: 5,
    dotColor: 'bg-emerald-400',
    badgeClasses: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    activeTabClasses: 'bg-emerald-950 border-emerald-600 text-emerald-200',
    tabBadgeClasses: 'bg-emerald-900/80 text-emerald-200 border-emerald-700',
  },
}

const STATUS_KEYS = Object.keys(STATUS_CONFIG)

const SAMPLE_BATCH_TEMPLATE = `[
  {
    "name": "Prof. Demis Hassabis",
    "institution": "Google DeepMind / UCL",
    "profile_url": "https://scholar.google.com/citations?user=G8d697IAAAAJ",
    "email": "dhassabis@deepmind.com",
    "fit_brief": "Pioneering breakthroughs across structural biology (AlphaFold) and reinforcement learning. Aligned with neuro-symbolic and automated scientific discovery pipelines.",
    "draft_text": "Dear Prof. Hassabis,\\n\\nI have been closely following your lab's work at DeepMind on structural biology and reinforcement learning. Our research explores real-time graph reasoning and hypothesis verification, which directly intersects with your recent publications...",
    "source_papers": "https://doi.org/10.1038/s41586-021-03819-2 (AlphaFold), https://arxiv.org/abs/1312.5602 (Deep Q-Networks)"
  },
  {
    "name": "Prof. Yoshua Bengio",
    "institution": "MILA / Universite de Montreal",
    "profile_url": "https://yoshuabengio.org",
    "email": "yoshua.bengio@mila.quebec",
    "fit_brief": "Foundational exploration of Generative Flow Networks (GFlowNets), causal representation learning, and AI safety mechanisms.",
    "draft_text": "Dear Prof. Bengio,\\n\\nI am writing to share our recent benchmark on generative flow networks applied to structured hypothesis search. We observed notable efficiency gains when integrating causal priors...",
    "source_papers": "GFlowNets Foundations (Bengio et al., 2021), Causal Representation Learning (Scholkopf & Bengio)"
  }
]`

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
  const [batchInput, setBatchInput] = useState('')
  const [batchMessage, setBatchMessage] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)

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

  // Follow-up status evaluator
  const getFollowUpMeta = (target) => {
    if (target.status === 'replied') {
      return {
        type: 'replied',
        label: 'Resolved (Replied)',
        badgeClasses: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
        isOverdue: false,
        isDueToday: false,
      }
    }

    if (!target.follow_up_due) {
      return {
        type: 'none',
        label: 'No follow-up set',
        badgeClasses: 'bg-void/60 text-dim border-pulsar/20',
        isOverdue: false,
        isDueToday: false,
      }
    }

    try {
      const dueDate = parseISO(target.follow_up_due)
      const today = new Date()
      const diff = differenceInCalendarDays(dueDate, today)

      if (diff < 0) {
        const absDiff = Math.abs(diff)
        return {
          type: 'overdue',
          label: absDiff === 1 ? 'Overdue 1 day' : `Overdue ${absDiff} days`,
          badgeClasses: 'bg-rose-950/90 text-rose-300 border-rose-800',
          isOverdue: true,
          isDueToday: false,
        }
      }

      if (diff === 0) {
        return {
          type: 'due_today',
          label: 'Due Today',
          badgeClasses: 'bg-amber-950/90 text-amber-300 border-amber-800',
          isOverdue: false,
          isDueToday: true,
        }
      }

      if (diff <= 3) {
        return {
          type: 'due_soon',
          label: `Due in ${diff}d (${format(dueDate, 'd MMM')})`,
          badgeClasses: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
          isOverdue: false,
          isDueToday: false,
        }
      }

      return {
        type: 'scheduled',
        label: `Due: ${format(dueDate, 'd MMM yyyy')}`,
        badgeClasses: 'bg-void/70 text-nova/80 border-pulsar/30',
        isOverdue: false,
        isDueToday: false,
      }
    } catch {
      return {
        type: 'scheduled',
        label: `Due: ${target.follow_up_due}`,
        badgeClasses: 'bg-void/70 text-nova/80 border-pulsar/30',
        isOverdue: false,
        isDueToday: false,
      }
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

  // Batch import parser and runner
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
        text: `Invalid JSON syntax: ${err.message}. Please verify bracket matching and quote closure.`,
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

    const invalidIndex = parsed.findIndex((item) => !item || !item.name || !item.institution)
    if (invalidIndex !== -1) {
      setBatchMessage({
        type: 'error',
        text: `Item at index ${invalidIndex} is missing required "name" or "institution" property.`,
      })
      setBatchLoading(false)
      return
    }

    const rows = parsed.map((item) => ({
      name: String(item.name).trim(),
      institution: String(item.institution).trim(),
      profile_url: item.profile_url ? String(item.profile_url).trim() : null,
      email: item.email ? String(item.email).trim() : null,
      fit_brief: item.fit_brief ? String(item.fit_brief).trim() : null,
      draft_text: item.draft_text ? String(item.draft_text).trim() : null,
      source_papers: item.source_papers ? String(item.source_papers).trim() : null,
      sent_date: item.sent_date || null,
      follow_up_due: item.follow_up_due || null,
      status: item.status && STATUS_KEYS.includes(item.status) ? item.status : 'drafted',
      user_id: user.id,
    }))

    try {
      const { error: insErr } = await supabase.from('outreach_targets').insert(rows)
      if (insErr) throw insErr

      setBatchMessage({
        type: 'success',
        text: `Transmission batch imported successfully! Added ${rows.length} outreach target${rows.length > 1 ? 's' : ''}.`,
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

  // Helper to render text with auto-detected hyperlinks
  const renderTextWithLinks = (text) => {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, idx) => {
      if (urlRegex.test(part)) {
        const safe = safeExternalUrl(part)
        if (safe) {
          return (
            <a
              key={idx}
              href={safe}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-nova hover:text-starlight underline inline-flex items-center gap-1 break-all"
            >
              {part}
              <ExternalLink className="w-3 h-3 inline-block shrink-0" />
            </a>
          )
        }
      }
      return <span key={idx}>{part}</span>
    })
  }

  // Get initials for profile badge
  const getInitials = (name) => {
    if (!name) return '?'
    const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim()
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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

      {/* Feature 1: Interactive Status Pipeline Bar */}
      <div className="glass border border-pulsar/30 rounded-xl p-2 bg-void/40">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {/* All Filter Tab */}
          <button
            onClick={() => setActivePipelineFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 shrink-0 transition-all border ${
              activePipelineFilter === 'all'
                ? 'bg-pulsar/25 border-pulsar/60 text-starlight font-semibold shadow-sm'
                : 'bg-void/40 border-pulsar/10 text-nova/70 hover:bg-void/70 hover:text-starlight hover:border-pulsar/30'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-nova" />
            <span>All Pipeline</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                activePipelineFilter === 'all'
                  ? 'bg-pulsar/40 border-pulsar text-starlight'
                  : 'bg-void/80 border-pulsar/20 text-nova/60'
              }`}
            >
              {pipelineCounts.all}
            </span>
          </button>

          {/* Individual Status Stage Tabs */}
          {STATUS_KEYS.map((key) => {
            const cfg = STATUS_CONFIG[key]
            const count = pipelineCounts[key] || 0
            const isActive = activePipelineFilter === key

            return (
              <button
                key={key}
                onClick={() => setActivePipelineFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 shrink-0 transition-all border ${
                  isActive
                    ? `${cfg.activeTabClasses} font-semibold shadow-sm`
                    : 'bg-void/40 border-pulsar/10 text-nova/70 hover:bg-void/70 hover:text-starlight hover:border-pulsar/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                <span>{cfg.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                    isActive ? cfg.tabBadgeClasses : 'bg-void/80 border-pulsar/20 text-nova/60'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feature 2: Live Search Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-nova/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by professor, university, profile URL, email, research keywords, fit brief..."
            className="w-full bg-void/70 border border-pulsar/30 rounded-xl pl-9 pr-9 py-2.5 text-xs font-body text-starlight placeholder:text-nova/40 focus:outline-none focus:border-pulsar transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nova/50 hover:text-starlight rounded transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Summary Tag */}
        <div className="flex items-center gap-2 text-xs font-mono text-nova/60 shrink-0">
          <span>
            Showing <strong className="text-starlight">{filteredAndSortedTargets.length}</strong> of{' '}
            {targets.length} targets
          </span>
          {(searchQuery || activePipelineFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setActivePipelineFilter('all')
              }}
              className="px-2 py-1 rounded border border-pulsar/30 bg-void/60 text-nova hover:text-starlight hover:border-pulsar text-[11px] transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Feature 3: Streamlined Collapsible Batch Importer */}
      <div className="glass border border-pulsar/30 rounded-xl overflow-hidden transition-all bg-void/30">
        <button
          onClick={() => {
            setIsBatchOpen((prev) => !prev)
            setBatchMessage(null)
          }}
          className="w-full px-4 py-3 bg-void/50 flex items-center justify-between text-left hover:bg-void/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-aurora" />
            <span className="text-sm font-display text-starlight">Batch Import Console</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-void/80 text-nova/70 border border-pulsar/20">
              JSON Array Format
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-nova/60">
            <span>{isBatchOpen ? 'Collapse' : 'Expand'}</span>
            {isBatchOpen ? (
              <ChevronUp className="w-4 h-4 text-nova/70" />
            ) : (
              <ChevronDown className="w-4 h-4 text-nova/70" />
            )}
          </div>
        </button>

        {isBatchOpen && (
          <div className="p-4 bg-void/25 border-t border-pulsar/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-nova/75 font-body">
                Paste an array of target objects. Each target requires <span className="font-mono text-starlight">name</span> and <span className="font-mono text-starlight">institution</span>. Optionally include <span className="font-mono text-starlight">profile_url</span>.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBatchInput(SAMPLE_BATCH_TEMPLATE)
                    setBatchMessage(null)
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-void/70 hover:bg-void border border-pulsar/30 text-nova hover:text-starlight flex items-center gap-1.5 transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5 text-gold" /> Load Template Example
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchInput('')
                    setBatchMessage(null)
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-void/70 hover:bg-void border border-pulsar/20 text-nova/60 hover:text-starlight transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={7}
                value={batchInput}
                onChange={(e) => {
                  setBatchInput(e.target.value)
                  if (batchMessage) setBatchMessage(null)
                }}
                placeholder="[\n  {\n    &quot;name&quot;: &quot;Prof. Alan Turing&quot;,\n    &quot;institution&quot;: &quot;University of Manchester&quot;,\n    &quot;profile_url&quot;: &quot;https://turing.org.uk&quot;,\n    &quot;email&quot;: &quot;aturing@manchester.ac.uk&quot;,\n    &quot;fit_brief&quot;: &quot;Computational morphogenesis&quot;,\n    &quot;draft_text&quot;: &quot;Dear Prof. Turing...&quot;,\n    &quot;source_papers&quot;: &quot;The Chemical Basis of Morphogenesis (1952)&quot;\n  }\n]"
                className="w-full bg-void/90 border border-pulsar/30 rounded-lg p-3 text-xs font-mono text-starlight placeholder:text-nova/30 focus:outline-none focus:border-pulsar leading-relaxed scrollbar-hide"
              />
            </div>

            {batchMessage && (
              <div
                className={`p-3 rounded-lg border text-xs font-body flex items-start gap-2.5 ${
                  batchMessage.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}
              >
                {batchMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{batchMessage.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleBatchImport}
                disabled={batchLoading || !batchInput.trim()}
                className="px-4 py-2 rounded-lg bg-emerald/20 hover:bg-emerald/30 text-emerald border border-emerald/50 text-xs font-display flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {batchLoading ? 'Importing Batch...' : 'Import Batch'}
              </button>
            </div>
          </div>
        )}
      </div>

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
          {filteredAndSortedTargets.map((target) => {
            const statusCfg = STATUS_CONFIG[target.status] || STATUS_CONFIG.researching
            const followUpMeta = getFollowUpMeta(target)
            const isExpanded = expandedId === target.id
            const emailCopiedKey = `email-${target.id}`
            const briefCopiedKey = `brief-${target.id}`
            const draftCopiedKey = `draft-${target.id}`
            const papersCopiedKey = `papers-${target.id}`

            return (
              <div
                key={target.id}
                className={`glass border rounded-xl overflow-hidden bg-void/40 transition-all duration-200 ${
                  followUpMeta.isOverdue
                    ? 'border-rose-800/60 hover:border-rose-600'
                    : followUpMeta.isDueToday
                    ? 'border-amber-800/60 hover:border-amber-600'
                    : isExpanded
                    ? 'border-pulsar/60'
                    : 'border-pulsar/25 hover:border-pulsar/50'
                }`}
              >
                {/* Card Main Header Bar */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : target.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Avatar initial, Name, Status Badge, Due Tag, Sub-details */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Monogram / Avatar badge */}
                    <div className="w-10 h-10 rounded-xl bg-void/80 border border-pulsar/30 flex items-center justify-center text-xs font-display text-starlight shrink-0">
                      {getInitials(target.name)}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Name & Status & Due Indicator */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-base text-starlight truncate">
                          {target.name}
                        </h4>

                        {/* Status Badge: Solid colors with dot indicator, NO gradients */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${statusCfg.badgeClasses}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                          {statusCfg.label}
                        </span>

                        {/* Overdue / Due Tag */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 ${followUpMeta.badgeClasses}`}
                        >
                          {followUpMeta.isOverdue ? (
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                          ) : followUpMeta.isDueToday ? (
                            <Clock className="w-3 h-3 text-amber-400" />
                          ) : (
                            <Calendar className="w-3 h-3 text-nova/60" />
                          )}
                          {followUpMeta.label}
                        </span>
                      </div>

                      {/* Institution & Profile Link & Email Details */}
                      <div className="flex items-center gap-3 text-xs font-mono text-nova/70 flex-wrap">
                        <span className="flex items-center gap-1 text-nova/80">
                          <Building2 className="w-3.5 h-3.5 text-aurora" />
                          <span>{target.institution}</span>
                        </span>

                        {/* Profile Link or Google Scholar Search Quick Button */}
                        {target.profile_url && safeExternalUrl(target.profile_url) ? (
                          <a
                            href={safeExternalUrl(target.profile_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-0.5 rounded bg-void/60 hover:bg-void border border-pulsar/30 hover:border-pulsar/60 text-pulsar hover:text-starlight text-[11px] font-mono flex items-center gap-1 transition-colors"
                            title="Open faculty / lab profile"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Lab Page</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        ) : (
                          <a
                            href={createAcademicSearchUrl(target.name, target.institution)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-0.5 rounded bg-void/40 hover:bg-void/70 border border-pulsar/20 hover:border-pulsar/40 text-nova/60 hover:text-starlight text-[11px] font-mono flex items-center gap-1 transition-colors"
                            title="Search academic profile on Google Scholar"
                          >
                            <Search className="w-3 h-3" />
                            <span>Search Profile</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        )}

                        {target.email && (
                          <div
                            className="flex items-center gap-1.5 text-nova/70"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="w-3.5 h-3.5 text-nova/50" />
                            <span className="text-starlight/90">{target.email}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(target.email, emailCopiedKey, e)}
                              className="p-1 rounded text-nova/50 hover:text-starlight hover:bg-void transition-colors"
                              title="Copy email address"
                            >
                              {copiedKey === emailCopiedKey ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Status Dropdown, Edit, Delete, Accordion Toggle */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-pulsar/15">
                    {/* Quick Status Dropdown */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={target.status}
                        onChange={(e) => handleQuickStatusChange(target.id, e.target.value, e)}
                        className="bg-void/80 border border-pulsar/30 text-starlight text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-pulsar"
                        title="Change pipeline stage"
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
                      type="button"
                      onClick={(e) => handleOpenEditModal(target, e)}
                      className="p-1.5 text-nova/60 hover:text-starlight rounded-lg hover:bg-void border border-transparent hover:border-pulsar/30 transition-colors"
                      title="Edit outreach target"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTarget(target.id, e)}
                      className="p-1.5 text-nova/60 hover:text-rose-400 rounded-lg hover:bg-void border border-transparent hover:border-rose-900/30 transition-colors"
                      title="Delete outreach target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Accordion Toggle Icon */}
                    <div className="p-1.5 text-nova/60 hover:text-starlight transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-nova" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-nova/60" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature 5: Rich Expanded Details View */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-pulsar/20 bg-void/50 space-y-4">
                    {/* Quick Action Bar */}
                    <div className="p-2.5 rounded-lg bg-void/70 border border-pulsar/20 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-nova/60 uppercase tracking-wider">
                        Quick Cadence Actions:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsSentToday(target, e)}
                          className="px-2.5 py-1 rounded text-xs font-mono bg-blue-950/70 hover:bg-blue-900/90 text-blue-300 border border-blue-800 flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3 h-3 text-blue-400" /> Mark as Sent Today
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsReplied(target, e)}
                          className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Mark as Replied
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSetFollowUpDays(target, 7, e)}
                          className="px-2.5 py-1 rounded text-xs font-mono bg-void/80 hover:bg-void text-nova hover:text-starlight border border-pulsar/30 flex items-center gap-1.5 transition-colors"
                        >
                          <CalendarPlus className="w-3 h-3 text-nova" /> Follow-up in 7 Days
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSetFollowUpDays(target, 14, e)}
                          className="px-2.5 py-1 rounded text-xs font-mono bg-void/80 hover:bg-void text-nova hover:text-starlight border border-pulsar/30 flex items-center gap-1.5 transition-colors"
                        >
                          <CalendarClock className="w-3 h-3 text-nova" /> Follow-up in 14 Days
                        </button>
                      </div>
                    </div>

                    {/* Strategic Fit Brief Box */}
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-gold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-gold" /> Strategic Fit Brief
                        </span>
                        <div className="flex items-center gap-2">
                          {editingBriefId !== target.id && (
                            <button
                              type="button"
                              onClick={(e) => handleStartEditBrief(target, e)}
                              className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                            >
                              <Edit2 className="w-3 h-3 text-gold" /> Edit Brief
                            </button>
                          )}
                          {target.fit_brief && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(target.fit_brief, briefCopiedKey, e)}
                              className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                            >
                              {copiedKey === briefCopiedKey ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" /> Copied Brief!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy Brief
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {editingBriefId === target.id ? (
                        <div className="space-y-2 bg-void/85 p-3 rounded-lg border border-gold/40">
                          <textarea
                            rows={4}
                            value={briefEditValue}
                            onChange={(e) => setBriefEditValue(e.target.value)}
                            placeholder="Key research alignment, shared lab interests, grant synergies, or mutual citations..."
                            className="w-full bg-void/90 border border-pulsar/30 rounded-lg p-2.5 text-xs font-body text-starlight focus:outline-none focus:border-gold leading-relaxed"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={savingInline}
                              onClick={handleCancelEditBrief}
                              className="px-3 py-1 rounded text-xs font-mono text-nova/60 hover:text-starlight transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingInline}
                              onClick={(e) => handleSaveInlineBrief(target.id, e)}
                              className="px-3 py-1 rounded bg-gold/20 hover:bg-gold/30 text-gold border border-gold/50 text-xs font-mono flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {savingInline ? 'Saving...' : 'Save Brief'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-body text-xs text-starlight/90 bg-void/80 p-3 rounded-lg border border-pulsar/20 leading-relaxed whitespace-pre-wrap">
                          {target.fit_brief ? (
                            target.fit_brief
                          ) : (
                            <span className="text-nova/40 italic">
                              No strategic fit brief recorded. Click Edit Brief to document alignment context.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Draft Email Pitch Box */}
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-aurora text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-aurora" /> Draft Email Pitch
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          {editingDraftId !== target.id && (
                            <button
                              type="button"
                              onClick={(e) => handleStartEditDraft(target, e)}
                              className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                            >
                              <Edit2 className="w-3 h-3 text-aurora" /> Edit Draft
                            </button>
                          )}

                          {target.email && (
                            <>
                              {/* Open in Gmail Web Compose */}
                              <a
                                href={createGmailComposeUrl({
                                  email: target.email,
                                  subject: `Outreach: ${target.name} - Scientific Inquiry`,
                                  body: target.draft_text || '',
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-mono text-red-300 hover:text-red-200 flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 border border-red-800/80 hover:border-red-600 transition-colors"
                                title="Compose message in Gmail Web"
                              >
                                <Mail className="w-3 h-3 text-red-400" /> Open in Gmail
                              </a>

                              {/* Default Mail App (mailto link without target="_blank") */}
                              <a
                                href={createMailtoUrl({
                                  email: target.email,
                                  subject: `Outreach: ${target.name} - Scientific Inquiry`,
                                  body: target.draft_text || '',
                                })}
                                className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                                title="Launch default system mail application"
                              >
                                <ExternalLink className="w-3 h-3" /> Default Mail App
                              </a>

                              {/* Copy Email Button */}
                              <button
                                type="button"
                                onClick={(e) => handleCopy(target.email, emailCopiedKey, e)}
                                className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                              >
                                {copiedKey === emailCopiedKey ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" /> Copied Email!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" /> Copy Email
                                  </>
                                )}
                              </button>
                            </>
                          )}

                          {/* Copy Draft Button */}
                          {target.draft_text && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(target.draft_text, draftCopiedKey, e)}
                              className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                            >
                              {copiedKey === draftCopiedKey ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" /> Copied Draft!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy Draft
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {editingDraftId === target.id ? (
                        <div className="space-y-2 bg-void/85 p-3 rounded-lg border border-aurora/40">
                          <textarea
                            rows={7}
                            value={draftEditValue}
                            onChange={(e) => setDraftEditValue(e.target.value)}
                            placeholder="Draft outreach email body or letter..."
                            className="w-full bg-void/90 border border-pulsar/30 rounded-lg p-3 text-xs font-mono text-starlight focus:outline-none focus:border-aurora leading-relaxed scrollbar-hide"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={savingInline}
                              onClick={handleCancelEditDraft}
                              className="px-3 py-1 rounded text-xs font-mono text-nova/60 hover:text-starlight transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingInline}
                              onClick={(e) => handleSaveInlineDraft(target.id, e)}
                              className="px-3 py-1 rounded bg-aurora/20 hover:bg-aurora/30 text-aurora border border-aurora/50 text-xs font-mono flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {savingInline ? 'Saving...' : 'Save Draft'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-starlight/90 bg-void/90 p-3.5 rounded-lg border border-pulsar/25 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto scrollbar-hide">
                          {target.draft_text ? (
                            target.draft_text
                          ) : (
                            <span className="text-nova/40 italic font-body">
                              No draft email prepared. Click Edit Draft to craft the outreach pitch.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Grounding Research / Papers Box */}
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-sky-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-sky-400" /> Grounding Research & Papers
                        </span>
                        {target.source_papers && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleCopy(target.source_papers, papersCopiedKey, e)
                            }
                            className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                          >
                            {copiedKey === papersCopiedKey ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Papers
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="font-mono text-xs text-nova/90 bg-void/80 p-3 rounded-lg border border-pulsar/20 leading-relaxed whitespace-pre-wrap">
                        {target.source_papers ? (
                          renderTextWithLinks(target.source_papers)
                        ) : (
                          <span className="text-nova/40 italic font-body">
                            No source papers or reference links recorded.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-[11px] font-mono text-nova/50 border-t border-pulsar/15">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3 text-nova/40" />
                          Sent Date:{' '}
                          <strong className="text-starlight/80">
                            {target.sent_date
                              ? format(parseISO(target.sent_date), 'd MMM yyyy')
                              : 'Not sent yet'}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-nova/40" />
                          Follow-up Cadence:{' '}
                          <strong className="text-starlight/80">
                            {target.follow_up_due
                              ? format(parseISO(target.follow_up_due), 'd MMM yyyy')
                              : 'None set'}
                          </strong>
                        </span>
                      </div>
                      <div>
                        <span>
                          Created:{' '}
                          {target.created_at
                            ? format(new Date(target.created_at), 'd MMM yyyy')
                            : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Feature 6: Clean Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass border border-pulsar/40 bg-stardust rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in scale-in duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-void/70 border-b border-pulsar/20 flex items-center justify-between shrink-0">
              <h3 className="font-display text-base text-starlight flex items-center gap-2">
                <Send className="w-4 h-4 text-pulsar" />
                {editingTarget ? 'Edit Outreach Target' : 'Add New Outreach Target'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-nova/60 hover:text-starlight rounded-lg hover:bg-void transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTarget} className="p-5 space-y-5 overflow-y-auto scrollbar-hide">
              {/* Group 1: Profile & Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-nova/80 flex items-center gap-1.5 pb-1 border-b border-pulsar/15">
                  <User className="w-3.5 h-3.5 text-pulsar" /> Target Profile & Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-nova/80">Professor / Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Prof. Ada Lovelace"
                      className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-nova/80">Institution / Lab *</label>
                    <input
                      type="text"
                      required
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      placeholder="Cambridge / DeepMind"
                      className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-nova/80">Profile / Lab URL</label>
                    <input
                      type="url"
                      value={formData.profile_url}
                      onChange={(e) => setFormData({ ...formData, profile_url: e.target.value })}
                      placeholder="https://scholar.google.com/citations?user=..."
                      className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-nova/80">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@university.edu"
                      className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Pipeline Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar"
                  >
                    {STATUS_KEYS.map((k) => (
                      <option key={k} value={k} className="bg-stardust text-starlight">
                        {STATUS_CONFIG[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Cadence & Timing */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-nova/80 flex items-center gap-1.5 pb-1 border-b border-pulsar/15">
                  <Calendar className="w-3.5 h-3.5 text-aurora" /> Transmission Schedule
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-nova/80">Sent Date</label>
                    <input
                      type="date"
                      value={formData.sent_date}
                      onChange={(e) => setFormData({ ...formData, sent_date: e.target.value })}
                      className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-nova/80">Follow-up Due Date</label>
                    <input
                      type="date"
                      value={formData.follow_up_due}
                      onChange={(e) =>
                        setFormData({ ...formData, follow_up_due: e.target.value })
                      }
                      className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Intelligence & Outreach Content */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-nova/80 flex items-center gap-1.5 pb-1 border-b border-pulsar/15">
                  <Sparkles className="w-3.5 h-3.5 text-gold" /> Strategic Content & Pitch
                </h4>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Strategic Fit Brief</label>
                  <textarea
                    rows={3}
                    value={formData.fit_brief}
                    onChange={(e) => setFormData({ ...formData, fit_brief: e.target.value })}
                    placeholder="Key research alignment, shared lab interests, grant synergies, or mutual citations..."
                    className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Grounding Research & References</label>
                  <textarea
                    rows={2}
                    value={formData.source_papers}
                    onChange={(e) => setFormData({ ...formData, source_papers: e.target.value })}
                    placeholder="Key papers, ArXiv links, project URLs, DOIs..."
                    className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-nova/80">Draft Email Pitch</label>
                  <textarea
                    rows={5}
                    value={formData.draft_text}
                    onChange={(e) => setFormData({ ...formData, draft_text: e.target.value })}
                    placeholder="Draft outreach email body or letter..."
                    className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar leading-relaxed"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
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
                  {formSubmitting ? (
                    'Saving...'
                  ) : editingTarget ? (
                    'Update Target'
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Create Target
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
