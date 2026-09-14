import {
  Send,
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
  Globe,
  Search,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  safeExternalUrl,
  createMailtoUrl,
  createGmailComposeUrl,
  createAcademicSearchUrl,
} from '../../../lib/urlUtils'
import {
  STATUS_CONFIG,
  STATUS_KEYS,
  getFollowUpMeta,
  getInitials,
  renderTextWithLinks,
} from './reachOutConstants'

export default function ReachOutTargetCard({
  target,
  isExpanded,
  onToggleExpand,
  copiedKey,
  onCopy,
  onQuickStatusChange,
  onEdit,
  onDelete,
  onMarkAsSentToday,
  onMarkAsReplied,
  onSetFollowUpDays,
  editingBriefId,
  briefEditValue,
  onBriefEditChange,
  onStartEditBrief,
  onCancelEditBrief,
  onSaveInlineBrief,
  editingDraftId,
  draftEditValue,
  onDraftEditChange,
  onStartEditDraft,
  onCancelEditDraft,
  onSaveInlineDraft,
  savingInline,
}) {
  const statusCfg = STATUS_CONFIG[target.status] || STATUS_CONFIG.researching
  const followUpMeta = getFollowUpMeta(target)
  const emailCopiedKey = `email-${target.id}`
  const briefCopiedKey = `brief-${target.id}`
  const draftCopiedKey = `draft-${target.id}`
  const papersCopiedKey = `papers-${target.id}`

  return (
    <div
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
        onClick={onToggleExpand}
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

              {/* Status Badge: Solid colors with dot indicator */}
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
                    onClick={(e) => onCopy(target.email, emailCopiedKey, e)}
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
              onChange={(e) => onQuickStatusChange(target.id, e.target.value, e)}
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
            onClick={(e) => onEdit(target, e)}
            className="p-1.5 text-nova/60 hover:text-starlight rounded-lg hover:bg-void border border-transparent hover:border-pulsar/30 transition-colors"
            title="Edit outreach target"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => onDelete(target.id, e)}
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

      {/* Rich Expanded Details View */}
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
                onClick={(e) => onMarkAsSentToday(target, e)}
                className="px-2.5 py-1 rounded text-xs font-mono bg-blue-950/70 hover:bg-blue-900/90 text-blue-300 border border-blue-800 flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3 h-3 text-blue-400" /> Mark as Sent Today
              </button>
              <button
                type="button"
                onClick={(e) => onMarkAsReplied(target, e)}
                className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Mark as Replied
              </button>
              <button
                type="button"
                onClick={(e) => onSetFollowUpDays(target, 7, e)}
                className="px-2.5 py-1 rounded text-xs font-mono bg-void/80 hover:bg-void text-nova hover:text-starlight border border-pulsar/30 flex items-center gap-1.5 transition-colors"
              >
                <CalendarPlus className="w-3 h-3 text-nova" /> Follow-up in 7 Days
              </button>
              <button
                type="button"
                onClick={(e) => onSetFollowUpDays(target, 14, e)}
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
                    onClick={(e) => onStartEditBrief(target, e)}
                    className="text-[11px] font-mono text-nova/70 hover:text-starlight flex items-center gap-1 px-2 py-0.5 rounded bg-void/60 border border-pulsar/20 hover:border-pulsar/40 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-gold" /> Edit Brief
                  </button>
                )}
                {target.fit_brief && (
                  <button
                    type="button"
                    onClick={(e) => onCopy(target.fit_brief, briefCopiedKey, e)}
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
                  onChange={(e) => onBriefEditChange(e.target.value)}
                  placeholder="Key research alignment, shared lab interests, grant synergies, or mutual citations..."
                  className="w-full bg-void/90 border border-pulsar/30 rounded-lg p-2.5 text-xs font-body text-starlight focus:outline-none focus:border-gold leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={savingInline}
                    onClick={onCancelEditBrief}
                    className="px-3 py-1 rounded text-xs font-mono text-nova/60 hover:text-starlight transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingInline}
                    onClick={(e) => onSaveInlineBrief(target.id, e)}
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
                    onClick={(e) => onStartEditDraft(target, e)}
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
                      onClick={(e) => onCopy(target.email, emailCopiedKey, e)}
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
                    onClick={(e) => onCopy(target.draft_text, draftCopiedKey, e)}
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
                  onChange={(e) => onDraftEditChange(e.target.value)}
                  placeholder="Draft outreach email body or letter..."
                  className="w-full bg-void/90 border border-pulsar/30 rounded-lg p-3 text-xs font-mono text-starlight focus:outline-none focus:border-aurora leading-relaxed scrollbar-hide"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={savingInline}
                    onClick={onCancelEditDraft}
                    className="px-3 py-1 rounded text-xs font-mono text-nova/60 hover:text-starlight transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingInline}
                    onClick={(e) => onSaveInlineDraft(target.id, e)}
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
                  onClick={(e) => onCopy(target.source_papers, papersCopiedKey, e)}
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
}
