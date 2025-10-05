'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMapEvents, useMap, Rectangle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ReactDOMServer from 'react-dom/server'

export interface RegionData {
  name: string
  temperature: number
  airQuality: number
  floodRisk: number
  lat: number
  lng: number
}

interface MapComponentProps {
  onRegionSelect: (region: RegionData) => void
  searchResult?: { lat: number; lng: number; name: string } | null
}


// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMzMzIj48cGF0aCBkPSJNMTIgMEM5LjI0IDAgNyAyLjI0IDcgNWMwIDIuODUgMi45MiA3LjIxIDUgOS44OCAyLjExLTIuNjkgNS03IDUtOS44OCAwLTIuNzYtMi4yNC01LTUtNXptMCA3Yy0xLjEgMC0yLS45LTItMnMuOS0yIDItMiAyIC45IDIgMi0uOSAyLTIgMnoiLz48L3N2Zz4=',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

function MapEventHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Calculate development area and population capacity for grid cells
function calculateDevelopmentMetrics(habitability: UrbanPlanningGrid['habitability'], riskScore: number, cellArea: number) {
  // Area multiplier based on habitability (percentage of cell that can be developed)
  const developmentRatio = 
    habitability === 'excellent' ? 0.8 :
    habitability === 'good' ? 0.6 :
    habitability === 'moderate' ? 0.4 :
    habitability === 'poor' ? 0.2 : 0.05

  // Population density per sq km based on habitability
  const baseDensity =
    habitability === 'excellent' ? 12000 :
    habitability === 'good' ? 8000 :
    habitability === 'moderate' ? 5000 :
    habitability === 'poor' ? 2000 : 500

  const developableArea = cellArea * developmentRatio
  const population = Math.round(developableArea * baseDensity)

  return { area: Math.round(developableArea * 100) / 100, population }
}

// Determine optimal development type for grid cells
function getDevelopmentType(habitability: UrbanPlanningGrid['habitability'], temp: number, flood: number): UrbanPlanningGrid['developmentType'] {
  if (habitability === 'critical' || flood > 80) return 'conservation'
  if (habitability === 'poor') return 'industrial'
  if (habitability === 'moderate' && temp > 30) return 'commercial'
  if (habitability === 'excellent' || habitability === 'good') return 'residential'
  return 'mixed'
}

// Get color for grid cell based on habitability
function getGridColor(habitability: UrbanPlanningGrid['habitability']): string {
  switch (habitability) {
    case 'excellent': return '#00ff00'
    case 'good': return '#90ff00'
    case 'moderate': return '#ffff00'
    case 'poor': return '#ff9900'
    case 'critical': return '#ff0000'
    default: return '#cccccc'
  }
}

interface ApiData {
  temperature?: number
  airQuality?: number
  floodRisk?: number
}

interface WaqiStation {
  uid: number
  aqi: string | number
  station: {
    name: string
    geo: [number, number]
  }
}

interface UrbanPlanningPoint {
  lat: number
  lng: number
  temperature: number
  airQuality: number
  floodRisk: number
  urbanRiskScore: number
  habitability: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical'
  name: string
}

interface UrbanPlanningGrid {
  id: string
  bounds: [[number, number], [number, number]] // [[south, west], [north, east]]
  centerLat: number
  centerLng: number
  temperature: number
  airQuality: number
  floodRisk: number
  urbanRiskScore: number
  habitability: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical'
  area: number // in square kilometers
  population: number // estimated population capacity
  developmentType: 'residential' | 'commercial' | 'mixed' | 'industrial' | 'conservation'
  name: string
  gridRow: number
  gridCol: number
}

export default function MapComponent({ onRegionSelect, searchResult = null }: MapComponentProps) {
  const [mounted, setMounted] = useState(false)
  const [mapId] = useState(() => `map-${Math.random().toString(36).substr(2, 9)}`)
  const [clickedLocation, setClickedLocation] = useState<RegionData | null>(null)
  const [apiData, setApiData] = useState<ApiData | null>(null)
  const [isLoadingApi, setIsLoadingApi] = useState(false)
  const [map, setMap] = useState<L.Map | null>(null)
  const [urbanPlanningGrid, setUrbanPlanningGrid] = useState<UrbanPlanningGrid[]>([])
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false)
  const [analysisMode, setAnalysisMode] = useState<'grid' | 'region'>('region')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [regionData, setRegionData] = useState<UrbanPlanningGrid | null>(null)
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'temp-day' | 'temp-night' | 'temp-anomaly' | 'air-quality' | 'precipitation'>('none')
  const [showTempSubmenu, setShowTempSubmenu] = useState(false)

  useEffect(() => {
    setMounted(true)

    return () => {
      // Cleanup all Leaflet map instances
      const container = document.getElementById(mapId)
      if (container) {
        // Remove any existing map instance
        const containerElement = container as HTMLElement & { _leaflet_id?: number }
        const existingMap = containerElement._leaflet_id
        if (existingMap) {
          try {
            // Find and remove the map
            L.DomUtil.get(mapId)
          } catch {
            // Ignore cleanup errors
          }
        }
        container.innerHTML = ''
        delete containerElement._leaflet_id
      }
    }
  }, [mapId])

  // Calculate urban planning risk score (0-100, higher = worse)
  const calculateUrbanRiskScore = (temp: number, aqi: number, flood: number): number => {
    // Temperature risk (0-100): higher temps are riskier
    const tempRisk = temp > 35 ? 100 : temp > 30 ? 80 : temp > 25 ? 50 : temp > 20 ? 30 : 20

    // AQI risk (0-100)
    const aqiRisk = aqi > 200 ? 100 : aqi > 150 ? 80 : aqi > 100 ? 60 : aqi > 50 ? 40 : 20

    // Flood risk is already 0-100

    // Weighted average: flood is most critical for urban planning
    return Math.round((tempRisk * 0.25) + (aqiRisk * 0.25) + (flood * 0.5))
  }

  const getHabitability = (score: number): UrbanPlanningPoint['habitability'] => {
    if (score <= 30) return 'excellent'
    if (score <= 50) return 'good'
    if (score <= 70) return 'moderate'
    if (score <= 85) return 'poor'
    return 'critical'
  }

  // Analyze entire region (city/country) - much more efficient than grid
  const analyzeRegion = async (locationName: string) => {
    if (!map) return

    setIsGeneratingGrid(true)
    console.log(`🌍 Analyzing region: ${locationName}`)

    try {
      // Geocode the location
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`
      )
      const geoData = await geoResponse.json()

      if (!geoData || geoData.length === 0) {
        console.error('❌ Location not found')
        setIsGeneratingGrid(false)
        return
      }

      const location = geoData[0]
      const lat = parseFloat(location.lat)
      const lng = parseFloat(location.lon)
      const boundingBox = location.boundingbox // [south, north, west, east]

      console.log(`📍 Found: ${location.display_name}`, { lat, lng, boundingBox })

      // Fly to location
      map.flyTo([lat, lng], 12, { duration: 1.5 })

      // Fetch data for the center point of the region
      const [tempResponse, aqResponse, floodResponse] = await Promise.all([
        fetch('/api/predict/temperature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }),
        fetch('/api/predict/air-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }),
        fetch('/api/predict/flood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }),
      ])

      const [tempData, aqData, floodData] = await Promise.all([
        tempResponse.json(),
        aqResponse.json(),
        floodResponse.json(),
      ])

      const temp = tempData.data?.currentTemp || 22
      const aqi = aqData.data?.currentAQI || 50
      const flood = floodData.data?.overallRisk || 30

      const riskScore = calculateUrbanRiskScore(temp, aqi, flood)
      const habitability = getHabitability(riskScore)

      // Calculate approximate area
      const south = parseFloat(boundingBox[0])
      const north = parseFloat(boundingBox[1])
      const west = parseFloat(boundingBox[2])
      const east = parseFloat(boundingBox[3])
      const latRange = north - south
      const lngRange = east - west
      const areaKm2 = (latRange * 111) * (lngRange * 111 * Math.cos(lat * Math.PI / 180))

      const { area, population } = calculateDevelopmentMetrics(habitability, riskScore, areaKm2)
      const developmentType = getDevelopmentType(habitability, temp, flood)

      const regionAnalysis: UrbanPlanningGrid = {
        id: `region-${locationName}`,
        bounds: [[south, west], [north, east]],
        centerLat: lat,
        centerLng: lng,
        temperature: Math.round(temp * 10) / 10,
        airQuality: Math.round(aqi),
        floodRisk: Math.round(flood),
        urbanRiskScore: riskScore,
        habitability,
        area,
        population,
        developmentType,
        name: location.display_name,
        gridRow: 0,
        gridCol: 0,
      }

      setRegionData(regionAnalysis)
      setUrbanPlanningGrid([regionAnalysis])
      console.log(`✅ Region analysis complete for ${locationName}`)

    } catch (error) {
      console.error('❌ Error analyzing region:', error)
    } finally {
      setIsGeneratingGrid(false)
    }
  }

  // Generate urban planning grid for development analysis
  const generateUrbanPlanningGrid = async () => {
    if (!map) return

    const zoom = map.getZoom()
    
    // Grid requires higher zoom for meaningful analysis
    if (zoom < 12) {
      console.log('⚠️ Zoom in more to generate development grid (current zoom:', zoom, ', need: 12+)')
      setUrbanPlanningGrid([])
      return
    }

    // Prevent multiple simultaneous requests
    if (isGeneratingGrid) {
      console.log('⏳ Already generating grid, skipping...')
      return
    }

    setIsGeneratingGrid(true)
    console.log('🏗️ Generating urban planning development grid...')

    const bounds = map.getBounds()
    const center = bounds.getCenter()

    // Define fixed cell size in kilometers based on zoom level
    // Higher zoom = smaller cells for more detail
    const cellSizeKm = zoom >= 15 ? 2 : zoom >= 14 ? 5 : zoom >= 13 ? 10 : 15

    // Convert km to degrees (approximately)
    const latDegreesPerKm = 1 / 111
    const lngDegreesPerKm = 1 / (111 * Math.cos(center.lat * Math.PI / 180))

    const cellLatSize = cellSizeKm * latDegreesPerKm
    const cellLngSize = cellSizeKm * lngDegreesPerKm

    // Calculate how many cells fit in the current view
    const latRange = bounds.getNorth() - bounds.getSouth()
    const lngRange = bounds.getEast() - bounds.getWest()

    const numLatCells = Math.ceil(latRange / cellLatSize)
    const numLngCells = Math.ceil(lngRange / cellLngSize)

    // Limit maximum cells to prevent excessive API calls
    const maxCells = 9 // Maximum 3x3 grid = 27 API calls
    const totalCells = numLatCells * numLngCells

    if (totalCells > maxCells) {
      console.log(`⚠️ Too many cells (${totalCells}), zoom in more or reduce area. Maximum: ${maxCells} cells`)
      setIsGeneratingGrid(false)
      return
    }

    // Calculate cell area in square kilometers
    const cellAreaKm2 = cellSizeKm * cellSizeKm

    console.log(`🗺️ Creating ${numLatCells}x${numLngCells} development grid (${totalCells} cells of ${cellSizeKm}km², ${totalCells * 3} API calls)...`)

    const gridCells: UrbanPlanningGrid[] = []

    try {
      for (let row = 0; row < numLatCells; row++) {
        for (let col = 0; col < numLngCells; col++) {
          const south = bounds.getSouth() + (row * cellLatSize)
          const north = bounds.getSouth() + ((row + 1) * cellLatSize)
          const west = bounds.getWest() + (col * cellLngSize)
          const east = bounds.getWest() + ((col + 1) * cellLngSize)
          
          const centerLat = (south + north) / 2
          const centerLng = (west + east) / 2

          // Fetch API data with timeout
          const timeout = 5000
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)

          try {
            const [tempResponse, aqResponse, floodResponse] = await Promise.all([
              fetch('/api/predict/temperature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: centerLat, lng: centerLng }),
                signal: controller.signal,
              }),
              fetch('/api/predict/air-quality', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: centerLat, lng: centerLng }),
                signal: controller.signal,
              }),
              fetch('/api/predict/flood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: centerLat, lng: centerLng }),
                signal: controller.signal,
              }),
            ])

            clearTimeout(timeoutId)

            if (!tempResponse.ok || !aqResponse.ok || !floodResponse.ok) {
              throw new Error('API request failed')
            }

            const [tempData, aqData, floodData] = await Promise.all([
              tempResponse.json(),
              aqResponse.json(),
              floodResponse.json(),
            ])

            const temp = tempData.data?.currentTemp || (18 + Math.random() * 20)
            const aqi = aqData.data?.currentAQI || (25 + Math.random() * 75)
            const flood = floodData.data?.overallRisk || (Math.random() * 70)

            const riskScore = calculateUrbanRiskScore(temp, aqi, flood)
            const habitability = getHabitability(riskScore)
            const { area, population } = calculateDevelopmentMetrics(habitability, riskScore, cellAreaKm2)
            const developmentType = getDevelopmentType(habitability, temp, flood)

            gridCells.push({
              id: `grid-${row}-${col}`,
              bounds: [[south, west], [north, east]],
              centerLat,
              centerLng,
              temperature: Math.round(temp * 10) / 10,
              airQuality: Math.round(aqi),
              floodRisk: Math.round(flood),
              urbanRiskScore: riskScore,
              habitability,
              area,
              population,
              developmentType,
              name: `Grid Cell ${row + 1}-${col + 1}`,
              gridRow: row,
              gridCol: col,
            })

          } catch (fetchError) {
            console.warn(`⚠️ Failed to fetch data for grid cell [${row},${col}]:`, fetchError)
            // Create cell with default values
            gridCells.push({
              id: `grid-${row}-${col}`,
              bounds: [[south, west], [north, east]],
              centerLat,
              centerLng,
              temperature: 22,
              airQuality: 50,
              floodRisk: 30,
              urbanRiskScore: 50,
              habitability: 'moderate',
              area: Math.round(cellAreaKm2 * 100) / 100,
              population: Math.round(cellAreaKm2 * 4000),
              developmentType: 'mixed',
              name: `Grid Cell ${row + 1}-${col + 1}`,
              gridRow: row,
              gridCol: col,
            })
          }

          // Add delay between requests to avoid rate limiting
          if (row < numLatCells - 1 || col < numLngCells - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }

      console.log(`✅ Generated ${gridCells.length} grid cells for development analysis`)
      setUrbanPlanningGrid(gridCells)
    } catch (error) {
      console.error('❌ Error generating urban planning grid:', error)
      setUrbanPlanningGrid([])
    } finally {
      setIsGeneratingGrid(false)
    }
  }


  // Clear grid data when switching modes
  useEffect(() => {
    setUrbanPlanningGrid([])
    setRegionData(null)
  }, [analysisMode])

  // Handle search result
  useEffect(() => {
    if (searchResult && map) {
      console.log('🔍 Navigating to:', searchResult.name)
      map.flyTo([searchResult.lat, searchResult.lng], 10, {
        duration: 1.5
      })

      const regionData: RegionData = {
        name: searchResult.name,
        lat: searchResult.lat,
        lng: searchResult.lng,
        temperature: 0,
        airQuality: 0,
        floodRisk: 0,
      }

      setClickedLocation(regionData)
      setApiData(null)

      // Fetch API data and update region
      fetchApiData(searchResult.lat, searchResult.lng).then((apiResults) => {
        if (apiResults) {
          regionData.temperature = apiResults.temperature
          regionData.airQuality = apiResults.airQuality
          regionData.floodRisk = apiResults.floodRisk
        }
        onRegionSelect(regionData)
      })
    }
  }, [searchResult, map])

  const fetchApiData = async (lat: number, lng: number): Promise<ApiData | null> => {
    setIsLoadingApi(true)
    console.log('🗺️ Fetching API data for popup:', { lat, lng })

    try {
      // Fetch all three APIs in parallel
      const [tempResponse, aqResponse, floodResponse] = await Promise.all([
        fetch('/api/predict/temperature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }),
        fetch('/api/predict/air-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }),
        fetch('/api/predict/flood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }),
      ])

      const [tempData, aqData, floodData] = await Promise.all([
        tempResponse.json(),
        aqResponse.json(),
        floodResponse.json(),
      ])

      console.log('✅ API data fetched for popup:', { tempData, aqData, floodData })

      const apiResults: ApiData = {
        temperature: tempData.data?.currentTemp || 0,
        airQuality: tempData.data?.currentAQI || aqData.data?.currentAQI || 0,
        floodRisk: floodData.data?.overallRisk || 0,
      }

      setApiData(apiResults)
      return apiResults
    } catch (error) {
      console.error('❌ Error fetching API data for popup:', error)
      setApiData(null)
      return null
    } finally {
      setIsLoadingApi(false)
    }
  }

  const handleMapClick = async (lat: number, lng: number) => {
    // Normalize coordinates to valid ranges
    // Latitude: -90 to 90
    // Longitude: -180 to 180
    const normalizedLat = Math.max(-90, Math.min(90, lat))
    const normalizedLng = ((lng + 180) % 360) - 180 // Wrap longitude to -180 to 180

    console.log('🗺️ Clicked coords:', { lat: normalizedLat, lng: normalizedLng })

    // Create region data for clicked location
    const regionData: RegionData = {
      name: `Location (${normalizedLat.toFixed(4)}, ${normalizedLng.toFixed(4)})`,
      lat: normalizedLat,
      lng: normalizedLng,
      temperature: 0, // Will be populated from API
      airQuality: 0,  // Will be populated from API
      floodRisk: 0,   // Will be populated from API
    }

    // Set clicked location to show popup
    setClickedLocation(regionData)
    setApiData(null) // Reset previous API data

    // Fetch API data with normalized coordinates
    const apiResults = await fetchApiData(normalizedLat, normalizedLng)

    // Update region data with API results if available
    if (apiResults) {
      regionData.temperature = apiResults.temperature
      regionData.airQuality = apiResults.airQuality
      regionData.floodRisk = apiResults.floodRisk
    }

    // Update sidebar with complete data
    onRegionSelect(regionData)
  }

  if (!mounted) {
    return <div className="h-full flex items-center justify-center text-gray-400">Loading map...</div>
  }

  return (
    <div id={mapId} className="h-full w-full relative">
      {/* Satellite Overlay Controls */}
      <div className="absolute top-4 left-4 z-[999] bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 shadow-2xl max-w-[220px]">
        <div className="text-sm font-bold text-white mb-2">🛰️ NASA Satellite Overlays</div>
        <div className="space-y-1">
          {/* Temperature with submenu */}
          <div className="relative">
            <button
              onClick={() => setShowTempSubmenu(!showTempSubmenu)}
              className={`w-full px-2 py-1 text-xs rounded transition-colors flex items-center justify-between ${
                activeOverlay.startsWith('temp-')
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>🌡️ Temperature</span>
              <span className="text-xs">{showTempSubmenu ? '▼' : '▶'}</span>
            </button>

            {showTempSubmenu && (
              <div className="mt-1 ml-2 space-y-1 border-l-2 border-gray-600 pl-2">
                <button
                  onClick={() => { setActiveOverlay(activeOverlay === 'temp-day' ? 'none' : 'temp-day'); }}
                  className={`w-full px-2 py-1 text-[10px] rounded transition-colors text-left ${
                    activeOverlay === 'temp-day'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  ☀️ Day Surface Temp
                </button>
                <button
                  onClick={() => { setActiveOverlay(activeOverlay === 'temp-night' ? 'none' : 'temp-night'); }}
                  className={`w-full px-2 py-1 text-[10px] rounded transition-colors text-left ${
                    activeOverlay === 'temp-night'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🌙 Night Surface Temp
                </button>
                <button
                  onClick={() => { setActiveOverlay(activeOverlay === 'temp-anomaly' ? 'none' : 'temp-anomaly'); }}
                  className={`w-full px-2 py-1 text-[10px] rounded transition-colors text-left ${
                    activeOverlay === 'temp-anomaly'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🔥 Temperature Anomaly
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setActiveOverlay(activeOverlay === 'air-quality' ? 'none' : 'air-quality')}
            className={`w-full px-2 py-1 text-xs rounded transition-colors ${
              activeOverlay === 'air-quality'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            💨 Air Quality
          </button>
          <button
            onClick={() => setActiveOverlay(activeOverlay === 'precipitation' ? 'none' : 'precipitation')}
            className={`w-full px-2 py-1 text-xs rounded transition-colors ${
              activeOverlay === 'precipitation'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🌊 Precipitation
          </button>
        </div>

        {/* Legend for active overlay */}
        {activeOverlay !== 'none' && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Legend:</div>
            {activeOverlay === 'temp-day' && (
              <div className="space-y-1 text-xs">
                <div className="text-[10px] text-gray-400 mb-1">Daytime Surface Temperature</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600"></div>
                  <span className="text-gray-300">&lt; 10°C Cold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500"></div>
                  <span className="text-gray-300">10-25°C Mild</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500"></div>
                  <span className="text-gray-300">25-35°C Warm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500"></div>
                  <span className="text-gray-300">35-45°C Hot</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600"></div>
                  <span className="text-gray-300">&gt; 45°C Extreme</span>
                </div>
              </div>
            )}
            {activeOverlay === 'temp-night' && (
              <div className="space-y-1 text-xs">
                <div className="text-[10px] text-gray-400 mb-1">Nighttime Surface Temperature</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-700"></div>
                  <span className="text-gray-300">&lt; 0°C Freezing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500"></div>
                  <span className="text-gray-300">0-10°C Cold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-400"></div>
                  <span className="text-gray-300">10-20°C Cool</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500"></div>
                  <span className="text-gray-300">20-30°C Warm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500"></div>
                  <span className="text-gray-300">&gt; 30°C Hot</span>
                </div>
              </div>
            )}
            {activeOverlay === 'temp-anomaly' && (
              <div className="space-y-1 text-xs">
                <div className="text-[10px] text-gray-400 mb-1">Temperature Deviation from Normal</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-700"></div>
                  <span className="text-gray-300">Much Cooler</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400"></div>
                  <span className="text-gray-300">Cooler</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400"></div>
                  <span className="text-gray-300">Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500"></div>
                  <span className="text-gray-300">Warmer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600"></div>
                  <span className="text-gray-300">Much Warmer</span>
                </div>
              </div>
            )}
            {activeOverlay === 'air-quality' && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500"></div>
                  <span className="text-gray-300">Clean</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500"></div>
                  <span className="text-gray-300">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500"></div>
                  <span className="text-gray-300">Polluted</span>
                </div>
              </div>
            )}
            {activeOverlay === 'precipitation' && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-300"></div>
                  <span className="text-gray-300">Light</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500"></div>
                  <span className="text-gray-300">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-600"></div>
                  <span className="text-gray-300">Heavy</span>
                </div>
              </div>
            )}
            <div className="mt-2 text-[10px] text-gray-500 italic">
              Real-time NASA GIBS satellite data
            </div>
          </div>
        )}
      </div>

      {/* Urban Planning Controls */}
      <div className="absolute top-4 right-4 z-[1001] bg-[#1a1a1a] border border-gray-700 rounded-lg p-4 shadow-2xl max-w-sm">
        <div className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🏗️ NASA Urban Planning Assistant
        </div>

        {/* Analysis Mode Selector */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAnalysisMode('region')}
              className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                analysisMode === 'region'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🌍 Region
            </button>
            <button
              onClick={() => setAnalysisMode('grid')}
              className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                analysisMode === 'grid'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🏗️ Grid
            </button>
          </div>

          {analysisMode === 'region' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && selectedLocation.trim()) {
                    analyzeRegion(selectedLocation)
                  }
                }}
                placeholder="City or country..."
                className="w-full px-3 py-2 bg-[#222] border border-gray-600 text-gray-200 placeholder-gray-500 text-sm rounded focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => {
                  if (selectedLocation.trim()) {
                    analyzeRegion(selectedLocation)
                  }
                }}
                disabled={isGeneratingGrid || !selectedLocation.trim()}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded border border-green-500 transition-colors"
              >
                {isGeneratingGrid ? 'Analyzing...' : '🔍 Analyze'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => generateUrbanPlanningGrid()}
                disabled={isGeneratingGrid}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded border border-blue-500 transition-colors"
              >
                {isGeneratingGrid ? 'Analyzing...' : '🔄 Generate Grid'}
              </button>

              <div className="bg-yellow-900/30 border border-yellow-600/40 rounded p-2 text-xs text-yellow-200">
                Zoom 12+ then click Generate Grid
              </div>
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {isGeneratingGrid && (
          <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-200">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-sm">Generating development grid...</span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-400 mb-4 p-3 bg-gray-800 rounded border border-gray-600">
          <div className="font-semibold text-gray-300 mb-2">📍 How to Use:</div>
          {analysisMode === 'region' ? (
            <div className="space-y-1">
              <p><strong>Region Mode:</strong> Fast analysis with just 3 API calls</p>
              <p>• Enter any city or country name</p>
              <p>• Get instant development suitability assessment</p>
              <p>• Entire region colored by habitability score</p>
              <p>• Green = Good for growth, Red = Not recommended</p>
            </div>
          ) : (
            <ol className="space-y-1 list-decimal list-inside">
              <li>Zoom to your area of interest (zoom 12+)</li>
              <li>Click "Generate" to load grid data</li>
              <li>Click cells for detailed insights</li>
              <li>Green = Suitable, Red = Not recommended</li>
            </ol>
          )}
          {map && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <span className="text-gray-300">Current Zoom: </span>
              <span className={`font-bold ${map.getZoom() >= 12 ? 'text-green-400' : 'text-orange-400'}`}>
                {map.getZoom().toFixed(1)}
              </span>
              <span className="text-gray-500"> / 16.0 max</span>
            </div>
          )}
        </div>

        {/* Growth Suitability Legend */}
        <div className="border-t border-gray-600 pt-4">
          <div className="text-sm font-semibold text-gray-300 mb-3">Development Suitability Grid:</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-6 h-4 border border-white" style={{ backgroundColor: '#00ff00' }}></div>
              <div>
                <div className="font-medium text-green-400">Excellent - High Growth Potential</div>
                <div className="text-gray-400">Low climate risks, ideal for major development</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-4 border border-white" style={{ backgroundColor: '#90ff00' }}></div>
              <div>
                <div className="font-medium text-green-300">Good - Suitable for Growth</div>
                <div className="text-gray-400">Minor risks, good for mixed development</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-4 border border-white" style={{ backgroundColor: '#ffff00' }}></div>
              <div>
                <div className="font-medium text-yellow-400">Moderate - Conditional Growth</div>
                <div className="text-gray-400">Requires enhanced infrastructure</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-4 border border-white" style={{ backgroundColor: '#ff9900' }}></div>
              <div>
                <div className="font-medium text-orange-400">Poor - Limited Growth</div>
                <div className="text-gray-400">High risk, specialized planning needed</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-4 border border-white" style={{ backgroundColor: '#ff0000' }}></div>
              <div>
                <div className="font-medium text-red-400">Critical - No Growth</div>
                <div className="text-gray-400">Severe risks, conservation recommended</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-700 text-[10px] text-gray-500">
            <div className="font-semibold mb-1">Data Sources (NASA):</div>
            <div>• GIBS Earth Observation • POWER Climate Data</div>
            <div>• Air Quality Index • Flood Risk Assessment</div>
          </div>
        </div>
      </div>

      <MapContainer
        key={mapId}
        center={[37.0902, -95.7129]}
        zoom={4}
        minZoom={3}
        maxZoom={16} // Reduced from 18 to limit excessive zooming
        maxBounds={[
          [-90, -180],  // Southwest coordinates
          [90, 180]     // Northeast coordinates
        ]}
        maxBoundsViscosity={0.5}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={true}
        ref={(mapInstance) => {
          if (mapInstance) {
            setMap(mapInstance)
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* NASA GIBS Satellite Overlays */}
        {/* Day Temperature */}
        {activeOverlay === 'temp-day' && (
          <TileLayer
            url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/${new Date().toISOString().split('T')[0]}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`}
            attribution='NASA GIBS - MODIS Terra Day'
            opacity={0.65}
            maxZoom={7}
          />
        )}
        {/* Night Temperature */}
        {activeOverlay === 'temp-night' && (
          <TileLayer
            url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Night/default/${new Date().toISOString().split('T')[0]}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`}
            attribution='NASA GIBS - MODIS Terra Night'
            opacity={0.65}
            maxZoom={7}
          />
        )}
        {/* Temperature Anomaly */}
        {activeOverlay === 'temp-anomaly' && (
          <TileLayer
            url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/${new Date().toISOString().split('T')[0]}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`}
            attribution='NASA GIBS - Temperature Anomaly'
            opacity={0.7}
            maxZoom={7}
          />
        )}
        {activeOverlay === 'air-quality' && (
          <TileLayer
            url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_MAIAC_L2G_AerosolOpticalDepth/default/${new Date().toISOString().split('T')[0]}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`}
            attribution='NASA GIBS'
            opacity={0.6}
            maxZoom={6}
          />
        )}
        {activeOverlay === 'precipitation' && (
          <TileLayer
            url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${new Date().toISOString().split('T')[0]}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`}
            attribution='NASA GIBS'
            opacity={0.6}
            maxZoom={8}
          />
        )}

        <MapEventHandler onMapClick={handleMapClick} />

        {/* Urban Planning Development Grid */}
        {urbanPlanningGrid.map((cell) => (
          <Rectangle
            key={cell.id}
            bounds={cell.bounds}
            pathOptions={{
              fillColor: getGridColor(cell.habitability),
              color: '#ffffff',
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div className="p-4 min-w-[320px] max-w-[400px]">
                <h3 className="font-bold text-lg mb-3 border-b pb-2 text-gray-800 flex items-center gap-2">
                  🏗️ {cell.name}
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    cell.habitability === 'excellent' ? 'bg-green-100 text-green-800' :
                    cell.habitability === 'good' ? 'bg-green-50 text-green-700' :
                    cell.habitability === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    cell.habitability === 'poor' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {cell.habitability.toUpperCase()}
                  </span>
                </h3>

                {/* Development Suitability Assessment */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg mb-4 border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-2 text-sm">🎯 Development Suitability Analysis</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-600 mb-1">Urban Risk Score</div>
                      <div className="text-lg font-bold text-gray-800">{cell.urbanRiskScore}/100</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-600 mb-1">Grid Area</div>
                      <div className="text-lg font-bold text-gray-800">{cell.area} km²</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-600 mb-1">Development Capacity</div>
                      <div className="text-lg font-bold text-gray-800">{cell.population.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-600 mb-1">Recommended Use</div>
                      <div className="text-sm font-bold text-gray-800 capitalize">{cell.developmentType}</div>
                    </div>
                  </div>
                </div>

                {/* NASA Climate Data */}
                <div className="space-y-3 mb-4">
                  <h4 className="font-bold text-gray-700 text-sm border-b pb-1">🛰️ NASA Earth Observation Data</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 p-2 rounded border">
                      <div className="text-xs text-blue-600 mb-1">🌡️ Temperature</div>
                      <div className="text-sm font-bold text-blue-800">{cell.temperature}°C</div>
                      <div className="text-xs text-gray-500">
                        {cell.temperature > 35 ? 'Very Hot' : 
                         cell.temperature > 30 ? 'Hot' : 
                         cell.temperature > 25 ? 'Warm' : 
                         cell.temperature > 20 ? 'Mild' : 'Cool'}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded border">
                      <div className="text-xs text-purple-600 mb-1">💨 Air Quality</div>
                      <div className="text-sm font-bold text-purple-800">AQI {cell.airQuality}</div>
                      <div className="text-xs text-gray-500">
                        {cell.airQuality <= 50 ? 'Good' :
                         cell.airQuality <= 100 ? 'Moderate' :
                         cell.airQuality <= 150 ? 'Unhealthy' : 'Hazardous'}
                      </div>
                    </div>
                    <div className="bg-cyan-50 p-2 rounded border">
                      <div className="text-xs text-cyan-600 mb-1">🌊 Flood Risk</div>
                      <div className="text-sm font-bold text-cyan-800">{cell.floodRisk}%</div>
                      <div className="text-xs text-gray-500">
                        {cell.floodRisk <= 30 ? 'Low' :
                         cell.floodRisk <= 60 ? 'Moderate' : 'High'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Urban Planning Recommendations */}
                <div className="border-t pt-3">
                  <h4 className="font-bold text-gray-700 mb-2 text-sm flex items-center gap-1">
                    📋 Development Recommendations for Grid Cell
                  </h4>
                  <div className="space-y-2 text-sm">
                    {cell.habitability === 'excellent' && (
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <div className="font-semibold text-green-800 mb-2">✅ RECOMMENDED FOR MAJOR DEVELOPMENT</div>
                        <ul className="text-green-700 space-y-1 text-xs">
                          <li>• High-density residential developments</li>
                          <li>• Commercial and business districts</li>
                          <li>• Educational and healthcare facilities</li>
                          <li>• Parks and community centers</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'good' && (
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <div className="font-semibold text-green-700 mb-2">✅ SUITABLE FOR DEVELOPMENT</div>
                        <ul className="text-green-600 space-y-1 text-xs">
                          <li>• Medium-density mixed-use development</li>
                          <li>• Standard infrastructure requirements</li>
                          <li>• Green building practices recommended</li>
                          <li>• Environmental monitoring protocols</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'moderate' && (
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <div className="font-semibold text-yellow-800 mb-2">⚠️ CONDITIONAL DEVELOPMENT</div>
                        <ul className="text-yellow-700 space-y-1 text-xs">
                          <li>• Low-density development only</li>
                          <li>• Enhanced climate-resilient infrastructure</li>
                          <li>• Mandatory environmental impact assessments</li>
                          <li>• Continuous monitoring required</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'poor' && (
                      <div className="bg-orange-50 p-3 rounded border border-orange-200">
                        <div className="font-semibold text-orange-800 mb-2">⚠️ HIGH-RISK DEVELOPMENT AREA</div>
                        <ul className="text-orange-700 space-y-1 text-xs">
                          <li>• Avoid residential development</li>
                          <li>• Industrial use only with extensive precautions</li>
                          <li>• Flood mitigation systems mandatory</li>
                          <li>• Emergency evacuation planning critical</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'critical' && (
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <div className="font-semibold text-red-800 mb-2">❌ NOT RECOMMENDED FOR DEVELOPMENT</div>
                        <ul className="text-red-700 space-y-1 text-xs">
                          <li>• Severe environmental and climate risks</li>
                          <li>• Designate as conservation or protection area</li>
                          <li>• No permanent structures permitted</li>
                          <li>• Natural disaster high-risk zone</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-2 mt-3 text-xs text-gray-500 italic text-center">
                  Grid Position: Row {cell.gridRow + 1}, Column {cell.gridCol + 1}<br/>
                  Data: NASA GIBS • POWER • Real-time satellite observations
                </div>
              </div>
            </Popup>
          </Rectangle>
        ))}


        {/* Clicked location marker with popup */}
        {clickedLocation && (
          <Marker
            position={[clickedLocation.lat, clickedLocation.lng]}
            icon={customIcon}
            eventHandlers={{
              add: (e) => {
                // Auto-open popup when marker is added
                e.target.openPopup()
              }
            }}
          >
            <Popup autoClose={false} closeOnClick={false}>
              <div className="p-3 min-w-[200px]">
                <h3 className="font-semibold text-sm mb-3 text-gray-800 border-b pb-2">
                  {clickedLocation.name}
                </h3>

                {isLoadingApi ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700 mb-2"></div>
                    <p className="text-xs text-gray-500">Loading NASA GIBS data...</p>
                  </div>
                ) : apiData ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        🌡️ Temperature:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {apiData.temperature !== undefined ? `${apiData.temperature}°C` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        💨 Air Quality:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {apiData.airQuality !== undefined ? `AQI ${apiData.airQuality}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        🌊 Flood Risk:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {apiData.floodRisk !== undefined ? `${apiData.floodRisk}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="mt-3 pt-2 border-t">
                      <p className="text-xs text-green-700 text-center font-medium">
                        ✓ Live NASA GIBS Data
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        🌡️ Temperature:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {clickedLocation.temperature}°C
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        💨 Air Quality:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        AQI {clickedLocation.airQuality}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        🌊 Flood Risk:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {clickedLocation.floodRisk}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Click prediction buttons in sidebar for details
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
