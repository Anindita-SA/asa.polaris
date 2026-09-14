import { useState } from 'react'
import {
  Upload,
  ChevronDown,
  ChevronUp,
  Code2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { SAMPLE_BATCH_TEMPLATE, STATUS_KEYS } from './reachOutConstants'
import { supabase } from '../../../lib/supabase'

export default function BatchImportModal({ isOpen, onToggle, user, onImportSuccess }) {
  const [batchInput, setBatchInput] = useState('')
  const [batchMessage, setBatchMessage] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)

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
      if (onImportSuccess) {
        onImportSuccess()
      }
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

  return (
    <div className="glass border border-pulsar/30 rounded-xl overflow-hidden transition-all bg-void/30">
      <button
        onClick={() => {
          onToggle()
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
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-nova/70" />
          ) : (
            <ChevronDown className="w-4 h-4 text-nova/70" />
          )}
        </div>
      </button>

      {isOpen && (
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
  )
}
