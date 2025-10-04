'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Navigation from '@/components/Navigation'
import type { RegionData } from '@/components/MapComponent'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400">Loading map...</div>,
})

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)
  const [mapKey] = useState(() => `dashboard-map-${Date.now()}`)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<{ lat: number; lng: number; name: string } | null>(null)

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

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f]">
      <Navigation />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {/* Search Bar */}
          <div className="absolute top-4 left-4 z-[1000] w-80">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search any city (e.g., Jakarta, Tokyo, Paris)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 rounded shadow-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg"
              >
                Search
              </button>
            </form>
          </div>

          <MapComponent key={mapKey} onRegionSelect={setSelectedRegion} searchResult={searchResult} />
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
                />

                <DataCard
                  title="Air Quality Index"
                  value={selectedRegion.airQuality.toString()}
                  risk={getRiskLevel(selectedRegion.airQuality, 'airQuality')}
                />

                <DataCard
                  title="Flood Risk"
                  value={`${selectedRegion.floodRisk}%`}
                  risk={getRiskLevel(selectedRegion.floodRisk, 'floodRisk')}
                />

                <div className="pt-4 border-t border-gray-800">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Predictions
                  </h4>
                  <div className="space-y-2">
                    <PredictButton type="temperature" region={selectedRegion} />
                    <PredictButton type="air-quality" region={selectedRegion} />
                    <PredictButton type="flood" region={selectedRegion} />
                  </div>
                </div>
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

interface DataCardProps {
  title: string
  value: string
  risk: 'low' | 'moderate' | 'high'
}

function DataCard({ title, value, risk }: DataCardProps) {
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

  return (
    <div className={`bg-[#222] border-l-2 ${riskColors[risk]} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
        <span className="text-xs text-gray-500">{riskLabels[risk]}</span>
      </div>
      <p className="text-xl font-medium text-gray-100">{value}</p>
    </div>
  )
}

interface PredictButtonProps {
  type: 'temperature' | 'air-quality' | 'flood'
  region: RegionData
}

interface PredictionData {
  prediction: string
  data?: {
    forecast?: Array<{ day: number; temp?: number; aqi?: number; quality?: string }>
    metadata?: {
      dataSource?: string
      gibsLayer?: string
      gibsLayers?: string[]
      observationDate?: string
      spatialResolution?: string
    }
    pollutants?: Record<string, number | string>
    factors?: Record<string, number | string>
    recommendations?: string[]
  }
}

function PredictButton({ type, region }: PredictButtonProps) {
  const [loading, setLoading] = useState(false)
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null)

  const handlePredict = async () => {
    setLoading(true)
    console.log(`🎯 Fetching ${type} prediction for:`, { lat: region.lat, lng: region.lng })

    try {
      const response = await fetch(`/api/predict/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: region.lat, lng: region.lng }),
      })
      const data = await response.json()

      console.log(`📊 ${type} prediction received:`, data)
      console.log(`🛰️  GIBS Metadata:`, data.data?.metadata)

      if (type === 'air-quality' && data.data?.pollutants) {
        console.log('💨 Pollutants:', data.data.pollutants)
      }

      if (type === 'flood' && data.data?.factors) {
        console.log('🌊 Flood Factors:', data.data.factors)
      }

      if (type === 'temperature' && data.data?.forecast) {
        console.log('🌡️  Temperature Forecast:', data.data.forecast)
      }

      setPredictionData(data)
    } catch (error) {
      console.error(`❌ Error fetching ${type} prediction:`, error)
      setPredictionData({ prediction: 'Error generating prediction' })
    } finally {
      setLoading(false)
    }
  }

  const labels = {
    temperature: 'Temperature Forecast',
    'air-quality': 'Air Quality Forecast',
    flood: 'Flood Risk Assessment',
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePredict}
        disabled={loading}
        className="w-full px-3 py-2 bg-[#2a2a2a] hover:bg-[#333] disabled:bg-[#222] disabled:text-gray-600 text-gray-300 text-sm border border-gray-700 transition-colors"
      >
        {loading ? 'Loading...' : labels[type]}
      </button>
      {predictionData && (
        <div className="p-3 bg-[#222] border border-gray-700 text-xs space-y-3">
          <p className="text-gray-400">{predictionData.prediction}</p>

          {predictionData.data?.forecast && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-gray-500 mb-2">7-Day Forecast:</p>
              <div className="space-y-1">
                {predictionData.data.forecast.slice(0, 3).map((item) => (
                  <div key={item.day} className="flex justify-between text-gray-400">
                    <span>Day {item.day}:</span>
                    <span>
                      {item.temp ? `${item.temp}°C` : item.aqi ? `AQI ${item.aqi}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {predictionData.data?.metadata && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-gray-500 mb-1">Data Source:</p>
              <p className="text-gray-400">{predictionData.data.metadata.dataSource}</p>
              {predictionData.data.metadata.observationDate && (
                <p className="text-gray-500 mt-1">
                  Date: {predictionData.data.metadata.observationDate}
                </p>
              )}
              {predictionData.data.metadata.spatialResolution && (
                <p className="text-gray-500">
                  Resolution: {predictionData.data.metadata.spatialResolution}
                </p>
              )}
            </div>
          )}

          {predictionData.data?.pollutants && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-gray-500 mb-1">Pollutants:</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(predictionData.data.pollutants).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="text-gray-400">
                    {key.toUpperCase()}: {value}
                  </div>
                ))}
              </div>
            </div>
          )}

          {predictionData.data?.factors && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-gray-500 mb-1">Risk Factors:</p>
              <div className="space-y-1">
                {Object.entries(predictionData.data.factors).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-gray-400">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {predictionData.data?.recommendations && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-gray-500 mb-1">Recommendations:</p>
              <ul className="list-disc list-inside text-gray-400 space-y-1">
                {predictionData.data.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="text-xs">{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
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
