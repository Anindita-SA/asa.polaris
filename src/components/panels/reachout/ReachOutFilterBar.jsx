import { Search, X, SlidersHorizontal } from 'lucide-react'
import { STATUS_CONFIG, STATUS_KEYS } from './reachOutConstants'

export default function ReachOutFilterBar({
  activePipelineFilter,
  onSelectPipelineFilter,
  pipelineCounts,
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  onResetFilters,
}) {
  return (
    <div className="space-y-4">
      {/* Interactive Status Pipeline Bar */}
      <div className="glass border border-pulsar/30 rounded-xl p-2 bg-void/40">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {/* All Filter Tab */}
          <button
            onClick={() => onSelectPipelineFilter('all')}
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
                onClick={() => onSelectPipelineFilter(key)}
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

      {/* Live Search Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-nova/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by professor, university, profile URL, email, research keywords, fit brief..."
            className="w-full bg-void/70 border border-pulsar/30 rounded-xl pl-9 pr-9 py-2.5 text-xs font-body text-starlight placeholder:text-nova/40 focus:outline-none focus:border-pulsar transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
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
            Showing <strong className="text-starlight">{filteredCount}</strong> of{' '}
            {totalCount} targets
          </span>
          {(searchQuery || activePipelineFilter !== 'all') && (
            <button
              onClick={onResetFilters}
              className="px-2 py-1 rounded border border-pulsar/30 bg-void/60 text-nova hover:text-starlight hover:border-pulsar text-[11px] transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
