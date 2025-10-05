'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Navigation from '@/components/Navigation'
import type { OverlayType, RegionData } from '@/components/MapComponent'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400">Loading map...</div>,
})



interface DataCardProps {
  title: string
  value: string
  risk: 'low' | 'moderate' | 'high'
  overlayType?: OverlayType
  activeOverlay?: OverlayType
  onSelectOverlay?: (overlay: OverlayType) => void
}

function DataCard({ title, value, risk, overlayType, activeOverlay, onSelectOverlay }: DataCardProps) {
  const riskColors = {
    low: 'border-green-600',
    moderate: 'border-yellow-600',
    high: 'border-red-600',
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
      className={`bg-[#222] border-l-2 ${riskColors[risk]} p-4 transition-colors ${
        isClickable ? 'hover:bg-[#242424] cursor-pointer' : ''
      } ${isActive ? 'ring-2 ring-amber-500' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
        <span className="text-xs text-gray-500">{riskLabels[risk]}</span>
      </div>
      <p className="text-xl font-medium text-gray-100">{value}</p>
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



function getRiskLevel(value: number, type: string): 'low' | 'moderate' | 'high' {
  if (type === 'temperature') {
    if (value < 20) return 'low'
    if (value < 30) return 'moderate'
    return 'high'
  } else if (type === 'airQuality') {
    if (value < 50) return 'low'
    if (value < 100) return 'moderate'
    return 'high'
  } else if (type === 'floodRisk') {
    if (value < 30) return 'low'
    if (value < 60) return 'moderate'
    return 'high'
  }
  return 'moderate'
}

function Legend() {
  const [layout, setLayout] = useState<'column' | 'row'>('column');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const legendRef = useRef<HTMLDivElement>(null);

  const handleLayoutToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLayout(prev => (prev === 'column' ? 'row' : 'column'));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !legendRef.current) return;
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      legendRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      const finalX = e.clientX - dragStartPos.current.x;
      const finalY = e.clientY - dragStartPos.current.y;
      setOffset({ x: finalX, y: finalY });
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const legendMap: Record<Exclude<OverlayType, 'none' | 'combined'>, { title: string; entries: Array<{ color: string; label:string }> }> = {
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
  };

  const columnIcon = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3H13V5H3V3Z" fill="currentColor"/><path d="M3 7H13V9H3V7Z" fill="currentColor"/><path d="M3 11H13V13H3V11Z" fill="currentColor"/></svg>;
  const rowIcon = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3H5V13H3V3Z" fill="currentColor"/><path d="M7 3H9V13H7V3Z" fill="currentColor"/><path d="M11 3H13V13H11V3Z" fill="currentColor"/></svg>;

  return (
    <div
      ref={legendRef}
      className={`bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-4 transition-[max-width] duration-500 ease-in-out ${layout === 'column' ? 'max-w-xs' : ''}`}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div
        className="flex justify-between items-center mb-3"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <h3 className="text-sm font-medium text-gray-200">Levels</h3>
        <button
          onClick={handleLayoutToggle}
          className="text-gray-400 hover:text-white p-1 rounded"
          title={layout === 'column' ? 'Switch to row layout' : 'Switch to column layout'}
        >
          {layout === 'column' ? rowIcon : columnIcon}
        </button>
      </div>
      <div 
        className="grid gap-x-6 gap-y-4 transition-[grid-template-columns] duration-500 ease-in-out"
        style={{ gridTemplateColumns: layout === 'column' ? '1fr' : 'repeat(3, 1fr)' }}
      >
        {Object.values(legendMap).map((legend) => (
            <div key={legend.title}>
              <div className="text-xs text-gray-400 mb-2 font-semibold">{legend.title}</div>
              <div className="space-y-1 text-xs">
                {legend.entries.map((entry) => (
                  <div key={entry.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${entry.color} rounded-sm`}></div>
                    <span className="text-gray-300">{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-gray-500 italic">
        Real-time NASA GIBS satellite data
      </div>
    </div>
  );
}

type OverlayState = {
  hasGeometry: boolean
  overlayMetrics: { temperature: number; airQuality: number; floodRisk: number } | null
}

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)
  const [mapKey] = useState(() => `dashboard-map-${Date.now()}`)
  const [searchQuery, setSearchQuery] = useState('JAKARTA')
  const [searchResult, setSearchResult] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>('temperature')
  const [overlayState, setOverlayState] = useState<OverlayState>({ hasGeometry: false, overlayMetrics: null })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      // Using OpenStreetMap Nominatim API for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        setSearchResult({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          name: result.display_name
        })
      }
    } catch (error) {
      console.error('Error searching location:', error)
    }
  }

  const handleOverlayStateChange = useCallback((state: OverlayState) => {
    setOverlayState(state)
  }, [])

  const handleOverlayToggle = useCallback((overlay: OverlayType) => {
    setActiveOverlay((current) => (current === overlay ? 'none' : overlay))
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f]">
      <Navigation />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {/* Search Bar */}
          <div className="absolute top-6 right-6 z-[1000] w-[28rem] max-w-[calc(100%-3rem)]">
            <form onSubmit={handleSearch} className="flex items-center bg-[#1a1a1a] border border-gray-700 rounded-full shadow-xl overflow-hidden pr-1 transition-shadow duration-300 focus-within:shadow-[0_0_15px_2px_rgba(255,255,255,0.1)]">
              <input
                type="text"
                placeholder="Search any city (e.g., Jakarta, Tokyo, Paris)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-5 py-3 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                className="p-2.5 m-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </button>
            </form>
          </div>

          <MapComponent
            key={mapKey}
            onRegionSelect={setSelectedRegion}
            searchResult={searchResult}
            activeOverlay={activeOverlay}
            onOverlayStateChange={handleOverlayStateChange}
          />

          <div className="absolute bottom-6 left-6 z-[1000]">
            {overlayState.hasGeometry && <Legend />}
          </div>
        </div>

        <aside className="w-96 bg-[#1a1a1a] overflow-y-auto border-l border-gray-800">
          <div className="p-6">
            <h2 className="text-lg font-medium mb-6 text-gray-200">
              Region Data
            </h2>

            {selectedRegion ? (
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-800">
                  <h3 className="text-base font-medium text-gray-200 mb-1">
                    {selectedRegion.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedRegion.lat.toFixed(4)}, {selectedRegion.lng.toFixed(4)}
                  </p>
                </div>

              

                <DataCard
                  title="Temperature"
                  value={`${selectedRegion.temperature}°C`}
                  risk={getRiskLevel(selectedRegion.temperature, 'temperature')}
                  overlayType="temperature"
                  activeOverlay={activeOverlay}
                  onSelectOverlay={handleOverlayToggle}
                />

                <DataCard
                  title="Air Quality Index"
                  value={selectedRegion.airQuality.toString()}
                  risk={getRiskLevel(selectedRegion.airQuality, 'airQuality')}
                  overlayType="air-quality"
                  activeOverlay={activeOverlay}
                  onSelectOverlay={handleOverlayToggle}
                />

                <DataCard
                  title="Flood Risk"
                  value={`${selectedRegion.floodRisk}%`}
                  risk={getRiskLevel(selectedRegion.floodRisk, 'floodRisk')}
                  overlayType="flood"
                  activeOverlay={activeOverlay}
                  onSelectOverlay={handleOverlayToggle}
                />

                
                 


              </div>
            ) : (
              <div className="text-center text-gray-500 mt-20">
                <p className="text-sm">
                  Click on the map to view region data
                </p>
              </div>
            )}
          </div>
          
        </aside>
      </div>
    </div>
  )
}

