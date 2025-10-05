'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import Navigation from '@/components/Navigation'
import type { OverlayType, RegionData, MapMode, GIBSOverlayType, MapComponentProps } from '@/components/MapComponent'
import RegionDataPanel, { OverlayState } from '@/components/RegionDataPanel'
import { Chatbot } from '@/components/Chatbot'

const MapComponent = dynamic<MapComponentProps>(
  () => import('@/components/MapComponent').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center text-gray-400">Loading map...</div>,
  }
)
export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)
  const [mapKey] = useState(() => `dashboard-map-${Date.now()}`)
  const [searchQuery, setSearchQuery] = useState('JAKARTA')
  const [searchResult, setSearchResult] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>('temperature')
  const [overlayState, setOverlayState] = useState<OverlayState>({ hasGeometry: false, overlayMetrics: null })
  const [mapMode, setMapMode] = useState<MapMode>('standard')
  const [gibsOverlay, setGibsOverlay] = useState<GIBSOverlayType>('temperature')
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)

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

  const handleMapModeChange = useCallback((mode: MapMode) => {
    setMapMode(mode)
  }, [])

  const handleGibsOverlayChange = useCallback((overlay: GIBSOverlayType) => {
    setGibsOverlay(overlay)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f]">
      <Navigation />

      <div className="flex flex-1 overflow-hidden pt-[60px]">
        <RegionDataPanel
          selectedRegion={selectedRegion}
          activeOverlay={activeOverlay}
          onOverlayToggle={handleOverlayToggle}
          overlayState={overlayState}
          mapMode={mapMode}
          onMapModeChange={handleMapModeChange}
          gibsOverlay={gibsOverlay}
          onGibsOverlayChange={handleGibsOverlayChange}
        />

        <div className="flex-1 relative">
          {/* Search Bar */}
          <div className="absolute top-4 right-4 z-[1000] w-80 max-w-[calc(100%-2rem)]">
            <form
              onSubmit={handleSearch}
              className="flex items-center bg-[#0f0f0f] border border-gray-800 rounded overflow-hidden transition-colors focus-within:border-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="ml-3 text-gray-600">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent text-gray-200 placeholder-gray-600 focus:outline-none text-xs"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#202020] text-gray-300 border-l border-gray-800 transition-colors text-xs"
              >
                Search
              </button>
            </form>
          </div>

          <MapComponent
            key={mapKey}
            onRegionSelect={setSelectedRegion}
            searchResult={searchResult}
            activeOverlay={activeOverlay}
            mapMode={mapMode}
            gibsOverlay={gibsOverlay}
            onOverlayStateChange={handleOverlayStateChange}
          />
        </div>
      </div>

      <Chatbot
        locationData={selectedRegion}
        isOpen={isChatbotOpen}
        onToggle={() => setIsChatbotOpen(!isChatbotOpen)}
      />
    </div>
  )
}

