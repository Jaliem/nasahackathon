'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import type { RegionData } from '@/app/page'
import 'leaflet/dist/leaflet.css'

interface MapComponentProps {
  onRegionSelect: (region: RegionData) => void
}

// Sample cities with mock climate data
const sampleRegions: RegionData[] = [
  { name: 'New York', lat: 40.7128, lng: -74.0060, temperature: 22, airQuality: 45, floodRisk: 35 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, temperature: 28, airQuality: 85, floodRisk: 15 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, temperature: 18, airQuality: 52, floodRisk: 28 },
  { name: 'Houston', lat: 29.7604, lng: -95.3698, temperature: 32, airQuality: 68, floodRisk: 65 },
  { name: 'Phoenix', lat: 33.4484, lng: -112.0740, temperature: 35, airQuality: 72, floodRisk: 8 },
  { name: 'Miami', lat: 25.7617, lng: -80.1918, temperature: 29, airQuality: 42, floodRisk: 78 },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321, temperature: 16, airQuality: 38, floodRisk: 32 },
  { name: 'Boston', lat: 42.3601, lng: -71.0589, temperature: 19, airQuality: 48, floodRisk: 40 },
  { name: 'Denver', lat: 39.7392, lng: -104.9903, temperature: 21, airQuality: 55, floodRisk: 12 },
  { name: 'Atlanta', lat: 33.7490, lng: -84.3880, temperature: 26, airQuality: 62, floodRisk: 45 },
]

function MapEventHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MapComponent({ onRegionSelect }: MapComponentProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    // Find nearest region or create a custom one
    const nearestRegion = findNearestRegion(lat, lng)
    if (nearestRegion) {
      onRegionSelect(nearestRegion)
    } else {
      // Create custom region data for clicked location
      const customRegion: RegionData = {
        name: `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
        lat,
        lng,
        temperature: Math.round(15 + Math.random() * 20),
        airQuality: Math.round(30 + Math.random() * 80),
        floodRisk: Math.round(Math.random() * 100),
      }
      onRegionSelect(customRegion)
    }
  }

  const findNearestRegion = (lat: number, lng: number): RegionData | null => {
    const threshold = 2 // degrees
    for (const region of sampleRegions) {
      const distance = Math.sqrt(
        Math.pow(region.lat - lat, 2) + Math.pow(region.lng - lng, 2)
      )
      if (distance < threshold) {
        return region
      }
    }
    return null
  }

  const getMarkerColor = (region: RegionData): string => {
    const avgRisk = (
      (region.temperature > 30 ? 1 : 0) +
      (region.airQuality > 75 ? 1 : 0) +
      (region.floodRisk > 50 ? 1 : 0)
    )

    if (avgRisk >= 2) return '#dc2626'
    if (avgRisk === 1) return '#d97706'
    return '#059669'
  }

  if (!mounted) {
    return <div className="h-full flex items-center justify-center">Loading map...</div>
  }

  return (
    <MapContainer
      center={[37.0902, -95.7129]}
      zoom={4}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapEventHandler onMapClick={handleMapClick} />

      {sampleRegions.map((region, idx) => (
        <CircleMarker
          key={idx}
          center={[region.lat, region.lng]}
          radius={12}
          pathOptions={{
            fillColor: getMarkerColor(region),
            color: '#666',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.7,
          }}
          eventHandlers={{
            click: () => onRegionSelect(region),
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-2">{region.name}</h3>
              <div className="text-xs space-y-1 text-gray-700">
                <p>Temperature: {region.temperature}°C</p>
                <p>AQI: {region.airQuality}</p>
                <p>Flood Risk: {region.floodRisk}%</p>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
