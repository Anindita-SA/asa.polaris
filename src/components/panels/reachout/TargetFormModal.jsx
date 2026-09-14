import { Send, X, Plus, User, Calendar, Sparkles } from 'lucide-react'
import { STATUS_CONFIG, STATUS_KEYS } from './reachOutConstants'

export default function TargetFormModal({
  isOpen,
  onClose,
  editingTarget,
  formData,
  onFormDataChange,
  onSubmit,
  formSubmitting,
}) {
  if (!isOpen) return null

  return (
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
            onClick={onClose}
            className="p-1 text-nova/60 hover:text-starlight rounded-lg hover:bg-void transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="p-5 space-y-5 overflow-y-auto scrollbar-hide">
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
                  onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
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
                  onChange={(e) =>
                    onFormDataChange({ ...formData, institution: e.target.value })
                  }
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
                  onChange={(e) =>
                    onFormDataChange({ ...formData, profile_url: e.target.value })
                  }
                  placeholder="https://scholar.google.com/citations?user=..."
                  className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-nova/80">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
                  placeholder="name@university.edu"
                  className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-nova/80">Pipeline Status</label>
              <select
                value={formData.status}
                onChange={(e) => onFormDataChange({ ...formData, status: e.target.value })}
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
                  onChange={(e) =>
                    onFormDataChange({ ...formData, sent_date: e.target.value })
                  }
                  className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-nova/80">Follow-up Due Date</label>
                <input
                  type="date"
                  value={formData.follow_up_due}
                  onChange={(e) =>
                    onFormDataChange({ ...formData, follow_up_due: e.target.value })
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
                onChange={(e) =>
                  onFormDataChange({ ...formData, fit_brief: e.target.value })
                }
                placeholder="Key research alignment, shared lab interests, grant synergies, or mutual citations..."
                className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-body text-starlight focus:outline-none focus:border-pulsar leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-nova/80">Grounding Research & References</label>
              <textarea
                rows={2}
                value={formData.source_papers}
                onChange={(e) =>
                  onFormDataChange({ ...formData, source_papers: e.target.value })
                }
                placeholder="Key papers, ArXiv links, project URLs, DOIs..."
                className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-nova/80">Draft Email Pitch</label>
              <textarea
                rows={5}
                value={formData.draft_text}
                onChange={(e) =>
                  onFormDataChange({ ...formData, draft_text: e.target.value })
                }
                placeholder="Draft outreach email body or letter..."
                className="w-full bg-void/80 border border-pulsar/30 rounded-lg px-3 py-2 text-xs font-mono text-starlight focus:outline-none focus:border-pulsar leading-relaxed"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-pulsar/20">
            <button
              type="button"
              onClick={onClose}
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
  )
}
