import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ExternalLink } from 'lucide-react'

export default function SparkPopup({ items, onDismiss }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl glass border border-amber-500/30 rounded-xl p-6 sm:p-10 "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 border-b border-amber-500/20 pb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-display text-starlight">Morning Spark</h2>
              <p className="text-sm font-mono text-nova/60 mt-1">Today's Climate Tech & Renewable Signals</p>
            </div>
            <button 
              onClick={onDismiss}
              className="ml-auto p-2 glass border border-pulsar/30 hover:border-nova/20 rounded-xl text-nova/60 hover:text-starlight transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide pr-2">
            {items && items.length > 0 ? (
              items.map((item, i) => (
                <div key={i} className="glass bg-void/40 border border-pulsar/30 p-5 rounded-xl hover:border-amber-500/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-base text-starlight leading-tight">{item.title}</h3>
                    <span className="text-xs font-mono text-amber-400/80 shrink-0 border border-amber-500/20 bg-amber-500/10 px-2 py-1 rounded">
                      {item.source_name}
                    </span>
                  </div>
                  <p className="font-body text-nova/60/90 mt-3 text-sm leading-relaxed">
                    {item.summary}
                  </p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-xs font-mono text-amber-400/90 hover:text-amber-300 hover:underline transition-colors"
                    >
                      Read more &rarr;
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-nova/60 font-mono text-sm">
                No signals picked up today.
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="mt-8 pt-6 border-t border-pulsar/30 text-center">
            <button
              onClick={onDismiss}
              className="px-8 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-display rounded-xl transition-all"
            >
              Initialize Day
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
