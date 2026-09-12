import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, Check } from 'lucide-react'

const QUICK_REASONS = [
  'Bangladesh not in eligible countries',
  'Requires citizenship / residency I do not hold',
  'Degree / Academic stage mismatch (needs PhD or specific non-EEE)',
  'Requires self-funding or upfront fee',
  'Aggregator, dead link, or past deadline',
  'Irrelevant field / not a fit'
]

const DismissFeedbackModal = ({ isOpen, onClose, opportunity, onConfirmDismiss }) => {
  const [selectedReason, setSelectedReason] = useState(QUICK_REASONS[0])
  const [customNote, setCustomNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !opportunity) return null

  const handleDismissWithFeedback = async (reasonToSubmit) => {
    setSubmitting(true)
    const finalReason = customNote.trim() 
      ? `${reasonToSubmit}: ${customNote.trim()}`
      : reasonToSubmit

    await onConfirmDismiss(opportunity, finalReason)
    setSubmitting(false)
    setSelectedReason(QUICK_REASONS[0])
    setCustomNote('')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="dismiss-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg glass border border-amber-500/30 rounded-xl p-6 space-y-5 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-pulsar/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-display text-starlight leading-tight">
                  Dismiss & Train Scout
                </h3>
                <p className="text-xs font-mono text-nova/60 mt-0.5">
                  Teach the Scout to avoid similar ineligible programs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-nova/60 hover:text-starlight p-1.5 rounded-lg hover:bg-pulsar/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Opportunity Details */}
          <div className="bg-void/60 border border-pulsar/30 rounded-lg p-3">
            <p className="text-xs font-mono text-amber-400/80 uppercase">Target Opportunity</p>
            <p className="text-sm font-display text-starlight mt-0.5">{opportunity.title}</p>
          </div>

          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-nova/70">
              Why is this not eligible / not a fit?
            </label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {QUICK_REASONS.map((reason) => {
                const isSelected = selectedReason === reason
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-body transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-medium'
                        : 'bg-void/40 text-nova/70 border-pulsar/20 hover:border-pulsar/40 hover:text-starlight'
                    }`}
                  >
                    <span>{reason}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Additional note */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-nova/70">
              Additional Details (Optional)
            </label>
            <input
              type="text"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="e.g. Only open to SIDS and Africa, excludes South Asia"
              className="w-full bg-void/70 border border-pulsar/40 rounded-lg px-3 py-2 text-xs text-starlight outline-none placeholder:text-nova/40 focus:border-amber-500/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-pulsar/30">
            <button
              type="button"
              onClick={() => handleDismissWithFeedback('Dismissed without specific reason')}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-body text-nova/60 hover:text-starlight rounded-lg transition-colors"
            >
              Quick Dismiss
            </button>
            <button
              type="button"
              onClick={() => handleDismissWithFeedback(selectedReason)}
              disabled={submitting}
              className="px-4 py-2 text-xs font-display rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {submitting ? 'Saving...' : 'Dismiss & Train Scout'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default DismissFeedbackModal
