'use client'

import type {
  OverlayType,
  RegionData,
  MapMode,
  GIBSOverlayType,
} from '@/components/MapComponent'

export type OverlayState = {
  hasGeometry: boolean
  overlayMetrics: { temperature: number; airQuality: number; floodRisk: number } | null
}

interface RegionDataPanelProps {
  selectedRegion: RegionData | null
  activeOverlay: OverlayType
  onOverlayToggle: (overlay: OverlayType) => void
  overlayState: OverlayState
  mapMode: MapMode
  onMapModeChange: (mode: MapMode) => void
  gibsOverlay: GIBSOverlayType
  onGibsOverlayChange: (overlay: GIBSOverlayType) => void
}

interface DataCardProps {
  title: string
  value: string
  risk: 'low' | 'moderate' | 'high'
  overlayType?: OverlayType
  activeOverlay?: OverlayType
  onSelectOverlay?: (overlay: OverlayType) => void
}

const overlayButtons: Array<{ id: OverlayType; label: string; activeClass: string }> = [
  { id: 'temperature', label: 'Temperature', activeClass: 'bg-red-600 text-white' },
  { id: 'air-quality', label: 'Air Quality', activeClass: 'bg-purple-600 text-white' },
  { id: 'flood', label: 'Flood Risk', activeClass: 'bg-blue-600 text-white' },
  { id: 'combined', label: 'Combined Risk', activeClass: 'bg-slate-700 text-white' },
]

const overlayLegendMap: Record<Exclude<OverlayType, 'none'>, { title: string; entries: Array<{ color: string; label: string }> }> = {
  temperature: {
    title: 'Temperature Risk Levels',
    entries: [
      { color: 'bg-green-500', label: 'Low (< 20°C)' },
      { color: 'bg-yellow-500', label: 'Moderate (20-30°C)' },
      { color: 'bg-orange-500', label: 'High (30-40°C)' },
      { color: 'bg-red-600', label: 'Critical (> 40°C)' },
    ],
  },
  'air-quality': {
    title: 'Air Quality Risk Levels',
    entries: [
      { color: 'bg-green-500', label: 'Good (0-50)' },
      { color: 'bg-yellow-500', label: 'Moderate (51-100)' },
      { color: 'bg-orange-500', label: 'Unhealthy (101-200)' },
      { color: 'bg-red-600', label: 'Hazardous (> 200)' },
    ],
  },
  flood: {
    title: 'Flood Risk Levels',
    entries: [
      { color: 'bg-green-500', label: 'Low (0-30%)' },
      { color: 'bg-yellow-500', label: 'Moderate (31-60%)' },
      { color: 'bg-orange-500', label: 'High (61-80%)' },
      { color: 'bg-red-600', label: 'Critical (> 80%)' },
    ],
  },
  combined: {
    title: 'Composite Climate Risk',
    entries: [
      { color: 'bg-green-500', label: 'Low (Score ≤ 30)' },
      { color: 'bg-yellow-500', label: 'Moderate (31-50)' },
      { color: 'bg-orange-500', label: 'High (51-70)' },
      { color: 'bg-red-600', label: 'Critical (> 70)' },
    ],
  },
}


function DataCard({ title, value, risk, overlayType, activeOverlay, onSelectOverlay }: DataCardProps) {
  const riskColors = {
    low: 'border-green-500',
    moderate: 'border-yellow-500',
    high: 'border-red-500',
  }

  const riskBadgeColors = {
    low: 'bg-green-50 text-green-700 border-green-200',
    moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-red-50 text-red-700 border-red-200',
  }

  const riskLabels = {
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
  }

  const isClickable = Boolean(overlayType && onSelectOverlay)
  const isActive = Boolean(overlayType && activeOverlay === overlayType)

  const content = (
    <div
      className={`bg-[#0f0f0f] border-l-2 ${riskColors[risk]} p-3 transition-all ${
        isClickable ? 'hover:bg-[#141414] cursor-pointer' : ''
      } ${isActive ? 'bg-[#141414] border-l-gray-400' : ''}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{title}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskBadgeColors[risk]}`}>{riskLabels[risk]}</span>
      </div>
      <p className="text-lg font-medium text-gray-200">{value}</p>
    </div>
  )

  if (isClickable && overlayType) {
    return (
      <button
        type="button"
        onClick={() => onSelectOverlay?.(overlayType)}
        className="w-full text-left focus:outline-none"
      >
        {content}
      </button>
    )
  }

  return content
}

function getRiskLevel(value: number, type: 'temperature' | 'airQuality' | 'floodRisk'): 'low' | 'moderate' | 'high' {
  if (type === 'temperature') {
    if (value < 20) return 'low'
    if (value < 30) return 'moderate'
    return 'high'
  }

  if (type === 'airQuality') {
    if (value < 50) return 'low'
    if (value < 100) return 'moderate'
    return 'high'
  }

  if (value < 30) return 'low'
  if (value < 60) return 'moderate'
  return 'high'
}

function getCombinedRiskScore(temp: number, aqi: number, flood: number): number {
  // Normalize each metric to 0-100 scale
  const tempScore = Math.min(100, Math.max(0, ((temp - 10) / 30) * 100))
  const aqiScore = Math.min(100, (aqi / 200) * 100)
  const floodScore = Math.min(100, flood)

  // Weighted average: temp 30%, aqi 35%, flood 35%
  return Math.round((tempScore * 0.3) + (aqiScore * 0.35) + (floodScore * 0.35))
}

function getCombinedRiskLevel(temp: number, aqi: number, flood: number): 'low' | 'moderate' | 'high' {
  const score = getCombinedRiskScore(temp, aqi, flood)
  if (score < 30) return 'low'
  if (score < 60) return 'moderate'
  return 'high'
}

function MapModeToggle({ mapMode, onChange }: { mapMode: MapMode; onChange: (mode: MapMode) => void }) {
  const options: Array<{ id: MapMode; label: string; }> = [
    { id: 'standard', label: 'Standard'},
    { id: 'gibs-overlay', label: 'Satellite' },
  ]

  return (
    <div className="">
      <div className="text-[10px] text-gray-500 uppercase mb-2 tracking-wider font-medium">Map View</div>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const isActive = mapMode === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
                isActive
                  ? 'border-gray-700 bg-[#1a1a1a] text-gray-200'
                  : 'border-gray-800 bg-[#0f0f0f] text-gray-500 hover:text-gray-400 hover:bg-[#141414]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}


function OverlayControls({ activeOverlay, onToggle, overlayState }: {
  activeOverlay: OverlayType
  onToggle: (overlay: OverlayType) => void
  overlayState: OverlayState
}) {
  const showLegend = activeOverlay !== 'none' && overlayState.overlayMetrics && overlayState.hasGeometry
  const legend = showLegend ? overlayLegendMap[activeOverlay as Exclude<OverlayType, 'none'>] : null

  return (
    <div className="">
      <div>
        <div className="text-[10px] text-gray-500 uppercase mb-2 tracking-wider font-medium">Data Overlays</div>
        <div className="grid grid-cols-1 gap-1.5">
          {overlayButtons.map((button) => {
            const isActive = activeOverlay === button.id
            return (
              <button
                key={button.id}
                type="button"
                onClick={() => onToggle(button.id)}
                className={`w-full px-2.5 py-1.5 text-xs font-medium text-left rounded border transition-colors ${
                  isActive
                    ? `${button.activeClass} border-transparent`
                    : 'bg-[#0f0f0f] border-gray-800 text-gray-400 hover:text-gray-300 hover:bg-[#141414]'
                }`}
              >
                {button.label}
              </button>
            )
          })}
        </div>
      </div>

      {legend && (
        <div className="bg-[#0f0f0f] border border-gray-900 rounded p-3 mt-2">
          <div className="text-[10px] text-gray-500 uppercase mb-2 tracking-wider">Legend</div>
          <div className="space-y-1.5 text-xs">
            {legend.entries.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 ${entry.color}`}></div>
                <span className="text-gray-400 text-[11px]">{entry.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-900 text-[9px] text-gray-600">
            NASA Earth Observation Data
          </div>
        </div>
      )}
    </div>
  )
}

export default function RegionDataPanel({
  selectedRegion,
  activeOverlay,
  onOverlayToggle,
  overlayState,
  mapMode,
  onMapModeChange,
  onGibsOverlayChange,
}: RegionDataPanelProps) {
  const syncGibsOverlay = (overlay: OverlayType) => {
    if (overlay === 'temperature' || overlay === 'air-quality' || overlay === 'flood') {
      onGibsOverlayChange(overlay)
    }
  }

  const handleOverlaySelect = (overlay: OverlayType) => {
    onOverlayToggle(overlay)
    syncGibsOverlay(overlay)
  }

  const overlaySection = (
    <div className="space-y-3">
      <OverlayControls
        activeOverlay={activeOverlay}
        onToggle={handleOverlaySelect}
        overlayState={overlayState}
      />
    </div>
  )

  return (
    <aside className="w-96 bg-black overflow-y-auto border-r border-gray-900 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
      <div className="p-5 space-y-5">
        <div>
          <h2 className="text-sm font-medium text-gray-200">Analysis</h2>
          <p className="text-xs text-gray-500 mt-1">
            Environmental metrics and data overlays
          </p>
        </div>

        <MapModeToggle mapMode={mapMode} onChange={onMapModeChange} />

        {selectedRegion ? (
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-900">
              <h3 className="text-sm font-medium text-gray-200 mb-1">{selectedRegion.name}</h3>
              <p className="text-[10px] text-gray-600 font-mono">
                {selectedRegion.lat.toFixed(4)}, {selectedRegion.lng.toFixed(4)}
              </p>
            </div>

            <DataCard
              title="Temperature"
              value={`${selectedRegion.temperature}°C`}
              risk={getRiskLevel(selectedRegion.temperature, 'temperature')}
              overlayType="temperature"
              activeOverlay={activeOverlay}
              onSelectOverlay={handleOverlaySelect}
            />

            <DataCard
              title="Air Quality Index"
              value={selectedRegion.airQuality.toString()}
              risk={getRiskLevel(selectedRegion.airQuality, 'airQuality')}
              overlayType="air-quality"
              activeOverlay={activeOverlay}
              onSelectOverlay={handleOverlaySelect}
            />

            <DataCard
              title="Flood Risk"
              value={`${selectedRegion.floodRisk}%`}
              risk={getRiskLevel(selectedRegion.floodRisk, 'floodRisk')}
              overlayType="flood"
              activeOverlay={activeOverlay}
              onSelectOverlay={handleOverlaySelect}
            />

            <DataCard
              title="Combined Risk"
              value={getCombinedRiskScore(selectedRegion.temperature, selectedRegion.airQuality, selectedRegion.floodRisk).toString()}
              risk={getCombinedRiskLevel(selectedRegion.temperature, selectedRegion.airQuality, selectedRegion.floodRisk)}
              overlayType="combined"
              activeOverlay={activeOverlay}
              onSelectOverlay={handleOverlaySelect}
            />

            {activeOverlay !== 'none' && overlayState.overlayMetrics && overlayState.hasGeometry && overlayLegendMap[activeOverlay as Exclude<OverlayType, 'none'>] && (
              <div className="bg-[#0f0f0f] border border-gray-900 rounded p-3">
                <div className="text-[10px] text-gray-500 uppercase mb-2 tracking-wider">Legend</div>
                <div className="space-y-1.5 text-xs">
                  {overlayLegendMap[activeOverlay as Exclude<OverlayType, 'none'>].entries.map((entry) => (
                    <div key={entry.label} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 ${entry.color}`}></div>
                      <span className="text-gray-400 text-[11px]">{entry.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-900 text-[9px] text-gray-600">
                  NASA Earth Observation Data
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-gray-600 mt-16 px-4">
              <p className="text-xs">Select a location on the map to view environmental metrics.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}