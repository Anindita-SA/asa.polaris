import { parseISO, differenceInCalendarDays, format } from 'date-fns'
import { safeExternalUrl } from '../../../lib/urlUtils'
import { ExternalLink } from 'lucide-react'

export const STATUS_CONFIG = {
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

export const STATUS_KEYS = Object.keys(STATUS_CONFIG)

export const SAMPLE_BATCH_TEMPLATE = `[
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

export const getFollowUpMeta = (target) => {
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

export const getInitials = (name) => {
  if (!name) return '?'
  const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const renderTextWithLinks = (text) => {
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
