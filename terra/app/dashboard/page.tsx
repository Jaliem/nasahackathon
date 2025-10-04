'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Navigation from '@/components/Navigation'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-gray-400">Loading map...</div>,
})

export interface RegionData {
  name: string
  temperature: number
  airQuality: number
  floodRisk: number
  lat: number
  lng: number
}

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f]">
      <Navigation />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <MapComponent onRegionSelect={setSelectedRegion} />
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

function PredictButton({ type, region }: PredictButtonProps) {
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<string | null>(null)

  const handlePredict = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/predict/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: region.lat, lng: region.lng }),
      })
      const data = await response.json()
      setPrediction(data.prediction || data.message)
    } catch (error) {
      setPrediction('Error generating prediction')
    } finally {
      setLoading(false)
    }
  }

  const labels = {
    temperature: 'Temperature',
    'air-quality': 'Air Quality',
    flood: 'Flood Risk',
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
      {prediction && (
        <div className="p-3 bg-[#222] border border-gray-700 text-xs text-gray-400">
          {prediction}
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
