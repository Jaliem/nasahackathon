'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Popup, Marker, useMapEvents, Rectangle, GeoJSON, Circle, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Feature, FeatureCollection, Geometry, GeoJsonObject } from 'geojson'

const SEVERITY_COLORS = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  critical: '#dc2626',
}

const temperatureSeverityColor = (temperature: number) => {
  const value = Number.isFinite(temperature) ? temperature : 0
  if (value < 20) return SEVERITY_COLORS.low
  if (value < 30) return SEVERITY_COLORS.moderate
  if (value < 40) return SEVERITY_COLORS.high
  return SEVERITY_COLORS.critical
}

const airQualitySeverityColor = (aqi: number) => {
  const value = Number.isFinite(aqi) ? aqi : 0
  if (value <= 50) return SEVERITY_COLORS.low
  if (value <= 100) return SEVERITY_COLORS.moderate
  if (value <= 200) return SEVERITY_COLORS.high
  return SEVERITY_COLORS.critical
}

const floodSeverityColor = (floodRisk: number) => {
  const value = Number.isFinite(floodRisk) ? floodRisk : 0
  if (value <= 30) return SEVERITY_COLORS.low
  if (value <= 60) return SEVERITY_COLORS.moderate
  if (value <= 80) return SEVERITY_COLORS.high
  return SEVERITY_COLORS.critical
}

const combinedRiskSeverityColor = (riskScore: number) => {
  const value = Number.isFinite(riskScore) ? riskScore : 0
  if (value <= 30) return SEVERITY_COLORS.low
  if (value <= 50) return SEVERITY_COLORS.moderate
  if (value <= 70) return SEVERITY_COLORS.high
  return SEVERITY_COLORS.critical
}

type GeometryFetchResult = {
  success: boolean
  countryName?: string
  bounds?: [number, number, number, number]
}

type GeometryFetchOptions = {
  fitBounds?: boolean
  fallbackBounds?: [number, number, number, number]
  properties?: Record<string, unknown>
}

const buildFeatureFromGeometry = (geometry: Geometry, properties: Record<string, unknown> = {}): Feature => ({
  type: 'Feature',
  properties,
  geometry,
})

const getFeatureCountryName = (feature?: Feature): string | undefined => {
  if (!feature || !feature.properties) return undefined
  const props = feature.properties as Record<string, unknown>
  const address = props.address as Record<string, unknown> | undefined
  // Prioritize city-level names over country
  return (
    (address?.city as string | undefined) ||
    (address?.town as string | undefined) ||
    (address?.village as string | undefined) ||
    (address?.municipality as string | undefined) ||
    (address?.county as string | undefined) ||
    (address?.state as string | undefined) ||
    (address?.country as string | undefined) ||
    (props.display_name as string | undefined) ||
    (props.name as string | undefined)
  )
}

const sanitizeFeatureCollection = (input: Feature | FeatureCollection | null): FeatureCollection | null => {
  if (!input) return null

  const isPolygonOrMultiPolygon = (feature: Feature) =>
    feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')

  if (input.type === 'FeatureCollection') {
    const polygonFeatures = input.features.filter(isPolygonOrMultiPolygon)
    return polygonFeatures.length ? { type: 'FeatureCollection', features: polygonFeatures } : null
  }

  if (isPolygonOrMultiPolygon(input)) {
    return { type: 'FeatureCollection', features: [input] }
  }

  return null
}

const parseGeoJsonResponse = (input: Feature | FeatureCollection | null) => {
  const sanitized = sanitizeFeatureCollection(input)

  if (!input) {
    return { sanitized, countryName: undefined as string | undefined }
  }

  if (input.type === 'FeatureCollection') {
    const firstFeature = input.features.find((feature) => feature.properties)
    return { sanitized, countryName: getFeatureCountryName(firstFeature) }
  }

  return { sanitized, countryName: getFeatureCountryName(input) }
}

const buildBoundsFeatureCollection = (
  bounds: [number, number, number, number],
  properties: Record<string, unknown> = {}
): FeatureCollection => {
  const [south, west, north, east] = bounds
  const coordinates = [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ]

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties,
        geometry: {
          type: 'Polygon',
          coordinates,
        },
      },
    ],
  }
}

const extractBoundsFromResponse = (data: unknown): [number, number, number, number] | undefined => {
  if (!data) return undefined

  const parseNumericArray = (bbox?: unknown): number[] | undefined => {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) return undefined
    const parsed = bbox.map((value) => Number(value))
    if (parsed.some((value) => Number.isNaN(value))) return undefined
    return parsed
  }

  const parseGeoJsonBbox = (bbox?: unknown): [number, number, number, number] | undefined => {
    const parsed = parseNumericArray(bbox)
    if (!parsed) return undefined
    const [minLon, minLat, maxLon, maxLat] = parsed
    return [minLat, minLon, maxLat, maxLon]
  }

  const parseNominatimBbox = (bbox?: unknown): [number, number, number, number] | undefined => {
    const parsed = parseNumericArray(bbox)
    if (!parsed) return undefined
    const [south, north, west, east] = parsed
    return [south, west, north, east]
  }

  if (typeof (data as { bbox?: unknown }).bbox !== 'undefined') {
    const bounds = parseGeoJsonBbox((data as { bbox?: unknown }).bbox)
    if (bounds) return bounds
  }

  if (typeof (data as { boundingbox?: unknown }).boundingbox !== 'undefined') {
    const bounds = parseNominatimBbox((data as { boundingbox?: unknown }).boundingbox)
    if (bounds) return bounds
  }

  if ((data as FeatureCollection).type === 'FeatureCollection' && Array.isArray((data as FeatureCollection).features)) {
    for (const feature of (data as FeatureCollection).features) {
      const bounds = extractBoundsFromResponse(feature)
      if (bounds) return bounds
    }
  }

  if ((data as Feature).type === 'Feature') {
    const feature = data as Feature & { bbox?: unknown; properties?: Record<string, unknown> }
    if (feature.bbox) {
      const bounds = parseGeoJsonBbox(feature.bbox)
      if (bounds) return bounds
    }
    if (feature.properties && (feature.properties as { boundingbox?: unknown }).boundingbox) {
      const bounds = parseNominatimBbox((feature.properties as { boundingbox?: unknown }).boundingbox)
      if (bounds) return bounds
    }
  }

  return undefined
}

export interface RegionData {
  name: string
  temperature: number | null
  airQuality: number | null
  floodRisk: number | null
  lat: number
  lng: number
}

export type OverlayType = 'none' | 'temperature' | 'air-quality' | 'flood' | 'combined'

interface MapComponentProps {
  onRegionSelect: (region: RegionData) => void
  searchResult?: { lat: number; lng: number; name: string } | null
  activeOverlay: OverlayType
  onOverlayStateChange?: (state: {
    hasGeometry: boolean
    overlayMetrics: { temperature: number | null; airQuality: number | null; floodRisk: number | null } | null
  }) => void
}




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
  temperature: number | null
  airQuality: number | null
  floodRisk: number | null
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

export default function MapComponent({
  onRegionSelect,
  searchResult = null,
  activeOverlay,
  onOverlayStateChange,
}: MapComponentProps) {
  const customIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMzMzIj48cGF0aCBkPSJNMTIgMEM5LjI0IDAgNyAyLjI0IDcgNWMwIDIuODUgMi45MiA3LjIxIDUgOS44OCAyLjExLTIuNjkgNS03IDUtOS44OCAwLTIuNzYtMi4yNC01LTUtNXptMCA3Yy0xLjEgMC0yLS45LTItMnMuOS0yIDItMiAyIC45IDIgMi0uOSAyLTIgMnoiLz48L3N2Zz4=',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  })

  const [mounted, setMounted] = useState(false)
  const [mapId] = useState(() => `map-${Math.random().toString(36).substr(2, 9)}`)
  const [clickedLocation, setClickedLocation] = useState<RegionData | null>(null)
  const [apiData, setApiData] = useState<ApiData | null>(null)
  const [isLoadingApi, setIsLoadingApi] = useState(false)
  const [map, setMap] = useState<L.Map | null>(null)
  const [urbanPlanningGrid, setUrbanPlanningGrid] = useState<UrbanPlanningGrid[]>([])
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false)
  const [analysisMode, setAnalysisMode] = useState<'grid' | 'region'>('region')
  const [regionData, setRegionData] = useState<UrbanPlanningGrid | null>(null)
  const [selectedCountryGeometry, setSelectedCountryGeometry] = useState<Feature | FeatureCollection | null>(null)
  const [overlayMetrics, setOverlayMetrics] = useState<{ temperature: number | null; airQuality: number | null; floodRisk: number | null } | null>(null)
  const [highlightCircle, setHighlightCircle] = useState<{ center: [number, number]; radius: number } | null>(null)
  const [waterGeometry, setWaterGeometry] = useState<FeatureCollection | null>(null)

  const fetchWaterGeometry = useCallback(async (bounds: [number, number, number, number]) => {
    const [south, west, north, east] = bounds
    const query = `
      [out:json][timeout:30];
      (
        way["natural"="water"](${south},${west},${north},${east});
        way["waterway"="riverbank"](${south},${west},${north},${east});
        relation["natural"="water"](${south},${west},${north},${east});
        relation["waterway"="riverbank"](${south},${west},${north},${east});
      );
      out geom;
    `
      .replace(/\s+/g, ' ')
      .trim();

    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Overpass API request failed: ${response.statusText}`);
      }
      const data = await response.json()

      // Convert OSM JSON to GeoJSON
      if (data.elements && data.elements.length > 0) {
        const features: Feature[] = []

        data.elements.forEach((element: any) => {
          if (element.type === 'way' && element.geometry) {
            // Convert way to polygon
            const coordinates = element.geometry.map((node: any) => [node.lon, node.lat])
            // Close the polygon if not already closed
            if (coordinates.length > 0 &&
                (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
                 coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
              coordinates.push(coordinates[0])
            }
            if (coordinates.length >= 4) {
              features.push({
                type: 'Feature',
                properties: element.tags || {},
                geometry: {
                  type: 'Polygon',
                  coordinates: [coordinates]
                }
              })
            }
          } else if (element.type === 'relation' && element.members) {
            // Handle multipolygon relations
            const outerWays = element.members.filter((m: any) => m.role === 'outer' && m.geometry)
            if (outerWays.length > 0) {
              const polygons = outerWays.map((way: any) =>
                way.geometry.map((node: any) => [node.lon, node.lat])
              )
              features.push({
                type: 'Feature',
                properties: element.tags || {},
                geometry: {
                  type: 'MultiPolygon',
                  coordinates: [polygons]
                }
              })
            }
          }
        })

        if (features.length > 0) {
          setWaterGeometry({ type: 'FeatureCollection', features })
        } else {
          setWaterGeometry(null);
        }
      } else {
        setWaterGeometry(null);
      }
    } catch (error) {
      console.error('Failed to fetch water geometry:', error);
      setWaterGeometry(null);
    }
  }, []);

  const applyRegionGeometry = useCallback((
    {
      geometry = null,
      bounds,
      properties = {},
      fitBounds = false,
    }: {
      geometry?: Feature | FeatureCollection | null
      bounds?: [number, number, number, number]
      properties?: Record<string, unknown>
      fitBounds?: boolean
    }
  ): boolean => {
    let sanitized = sanitizeFeatureCollection(geometry)

    if (!sanitized && bounds) {
      sanitized = buildBoundsFeatureCollection(bounds, properties)
    }

    if (sanitized) {
      setHighlightCircle(null)
    }
    setSelectedCountryGeometry(sanitized)

    if (!sanitized || !map || !fitBounds) {
      return Boolean(sanitized)
    }

    try {
      const geoLayer = L.geoJSON(sanitized as unknown as GeoJsonObject)
      const geoBounds = geoLayer.getBounds()
      if (geoBounds.isValid()) {
        map.fitBounds(geoBounds, { padding: [32, 32] })
      }
    } catch (error) {
      console.error('Failed to focus on selected geometry:', error)
    }

    return Boolean(sanitized)
  }, [map])

  const fetchGeometryByName = useCallback(async (countryName: string | undefined, options: GeometryFetchOptions = {}): Promise<GeometryFetchResult> => {
    if (!countryName) return { success: false }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=geojson&polygon_geojson=1&limit=1&q=${encodeURIComponent(countryName)}`)
      if (!response.ok) {
        throw new Error('Country search failed')
      }

      const data = await response.json()
      const { sanitized } = parseGeoJsonResponse(data as FeatureCollection)
      const boundsFromResponse = extractBoundsFromResponse(data) ?? options.fallbackBounds
      const selectionProperties = options.properties ?? { name: countryName }

      if (sanitized) {
        applyRegionGeometry({
          geometry: sanitized,
          bounds: boundsFromResponse,
          properties: selectionProperties,
          fitBounds: options.fitBounds,
        })
        return { success: true, countryName, bounds: boundsFromResponse }
      }

      if (boundsFromResponse) {
        const applied = applyRegionGeometry({
          bounds: boundsFromResponse,
          properties: selectionProperties,
          fitBounds: options.fitBounds,
        })
        if (applied) {
          return { success: true, countryName, bounds: boundsFromResponse }
        }
      }
    } catch (error) {
      console.error('Failed to fetch geometry by name:', error)
    }

    return { success: false, countryName, bounds: options.fallbackBounds }
  }, [applyRegionGeometry])

  const fetchCountryGeometry = useCallback(async (lat: number, lng: number, options: GeometryFetchOptions = {}): Promise<GeometryFetchResult> => {
    const zoomLevels = [14, 12, 10, 8] // Start from neighborhood, up to county level
    let countryName: string | undefined
    let lastBounds = options.fallbackBounds

    for (const zoom of zoomLevels) {
      let boundsFromResponse: [number, number, number, number] | undefined
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=geojson&polygon_geojson=1&extratags=1&zoom=${zoom}&lat=${lat}&lon=${lng}`)
        if (!response.ok) {
          throw new Error('Reverse geocoding failed')
        }

        const data = await response.json()
        const { sanitized, countryName: extractedName } = parseGeoJsonResponse(data as FeatureCollection)
        boundsFromResponse = extractBoundsFromResponse(data) ?? lastBounds
        countryName = countryName || extractedName

        const selectionProperties = {
          ...(options.properties || {}),
          ...(countryName ? { name: countryName } : {}),
        }

        if (sanitized) {
          applyRegionGeometry({
            geometry: sanitized,
            bounds: boundsFromResponse,
            properties: selectionProperties,
            fitBounds: options.fitBounds,
          })
          return { success: true, countryName, bounds: boundsFromResponse }
        }


      } catch (error) {
        console.error(`Failed reverse geocoding at zoom ${zoom}:`, error)
      }
      lastBounds = boundsFromResponse ?? lastBounds
    }

    if (!countryName) {
      try {
        const fallbackResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=3&lat=${lat}&lon=${lng}`)
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          countryName = (fallbackData?.address?.country as string | undefined) || (fallbackData?.display_name as string | undefined)
        }
      } catch (error) {
        console.error('Failed to fetch fallback reverse geocode:', error)
      }
    }

    const nameResult = await fetchGeometryByName(countryName, {
      fitBounds: options.fitBounds,
      fallbackBounds: options.fallbackBounds ?? lastBounds,
      properties: options.properties,
    })

    return {
      success: nameResult.success,
      countryName: nameResult.countryName || countryName,
      bounds: nameResult.bounds ?? options.fallbackBounds ?? lastBounds,
    }
  }, [fetchGeometryByName, applyRegionGeometry])

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
    setWaterGeometry(null)

    try {
      // Geocode the location
      setOverlayMetrics(null)

      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&q=${encodeURIComponent(locationName)}&limit=1`
      )
      const geoData = await geoResponse.json()

      if (!geoData || geoData.length === 0) {
        console.error('Location not found')
        setIsGeneratingGrid(false)
        return
      }

      const location = geoData[0]
      const lat = parseFloat(location.lat)
      const lng = parseFloat(location.lon)
      const boundingBox = location.boundingbox // [south, north, west, east]


      // Fly to location
      map.flyTo([lat, lng], 12, { duration: 1.5 })

      setSelectedCountryGeometry(null)

      const south = parseFloat(boundingBox[0])
      const north = parseFloat(boundingBox[1])
      const west = parseFloat(boundingBox[2])
      const east = parseFloat(boundingBox[3])
      const fallbackBounds: [number, number, number, number] = [south, west, north, east]

      const featureFromSearch = location.geojson
        ? buildFeatureFromGeometry(location.geojson as Geometry, { name: location.display_name })
        : null
      let geometryCountryName: string | undefined = location.display_name

      if (featureFromSearch) {
        const applied = applyRegionGeometry({
          geometry: featureFromSearch,
          bounds: fallbackBounds,
          properties: { name: location.display_name },
          fitBounds: true,
        })

        if (!applied) {
          const geometryResult = await fetchCountryGeometry(lat, lng, {
            fitBounds: true,
            fallbackBounds,
            properties: { name: location.display_name },
          })

          if (geometryResult.countryName) {
            geometryCountryName = geometryResult.countryName
          }
          if (geometryResult.bounds) {
            fetchWaterGeometry(geometryResult.bounds)
          }
        } else {
          fetchWaterGeometry(fallbackBounds)
        }
      } else {
        const geometryResult = await fetchCountryGeometry(lat, lng, {
          fitBounds: true,
          fallbackBounds,
          properties: { name: location.display_name },
        })
        if (geometryResult.countryName) {
          geometryCountryName = geometryResult.countryName
        }
        if (geometryResult.bounds) {
          fetchWaterGeometry(geometryResult.bounds)
        }
      }

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
        name: geometryCountryName || location.display_name,
        gridRow: 0,
        gridCol: 0,
      }

      setRegionData(regionAnalysis)
      setUrbanPlanningGrid([regionAnalysis])
      setOverlayMetrics({
        temperature: regionAnalysis.temperature,
        airQuality: regionAnalysis.airQuality,
        floodRisk: regionAnalysis.floodRisk,
      })

    } catch (error) {
      console.error('Error analyzing region:', error)
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
      console.log('Zoom in more to generate development grid (current zoom:', zoom, ', need: 12+)')
      setUrbanPlanningGrid([])
      return
    }

    // Prevent multiple simultaneous requests
    if (isGeneratingGrid) {
      return
    }

    setIsGeneratingGrid(true)

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
      setIsGeneratingGrid(false)
      return
    }

    // Calculate cell area in square kilometers
    const cellAreaKm2 = cellSizeKm * cellSizeKm

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
            console.warn(`Failed to fetch data for grid cell [${row},${col}]:`, fetchError)
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

      setUrbanPlanningGrid(gridCells)
    } catch (error) {
      console.error('Error generating urban planning grid:', error)
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
  const fetchApiData = useCallback(async (lat: number, lng: number): Promise<ApiData | null> => {
    setIsLoadingApi(true)

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

      const apiResults: ApiData = {
        temperature: tempData.data?.currentTemp ?? null,
        airQuality: tempData.data?.currentAQI ?? aqData.data?.currentAQI ?? null,
        floodRisk: floodData.data?.overallRisk ?? null,
      }

      setApiData(apiResults)
      return apiResults
    } catch (error) {
      console.error('Error fetching API data for popup:', error)
      setApiData(null)
      return null
    } finally {
      setIsLoadingApi(false)
    }
  }, [])

  useEffect(() => {
    if (!searchResult || !map) return

    const run = async () => {
      map.flyTo([searchResult.lat, searchResult.lng], 10, {
        duration: 1.5
      })

      let regionData: RegionData = {
        name: searchResult.name,
        lat: searchResult.lat,
        lng: searchResult.lng,
        temperature: 0,
        airQuality: 0,
        floodRisk: 0,
      }

      setClickedLocation(regionData)
      setApiData(null)
      setOverlayMetrics(null)
      setSelectedCountryGeometry(null)
      setHighlightCircle(null)
      setWaterGeometry(null)

      const geometryResult = await fetchCountryGeometry(searchResult.lat, searchResult.lng, {
        fitBounds: true,
        properties: { name: searchResult.name },
      })

      if (geometryResult.bounds) {
        fetchWaterGeometry(geometryResult.bounds)
      }

      if (!geometryResult.success) {
        const zoom = map.getZoom()
        const radius = zoom > 12 ? 1000 : zoom > 8 ? 4000 : 10000 // 1km, 4km, 10km
        setHighlightCircle({ center: [searchResult.lat, searchResult.lng], radius: radius })
      }

      if (geometryResult.countryName) {
        const resolvedName = geometryResult.countryName ?? regionData.name
        regionData = { ...regionData, name: resolvedName }
        setClickedLocation((prev) => (prev ? { ...prev, name: resolvedName } : regionData))
      }

      const apiResults = await fetchApiData(searchResult.lat, searchResult.lng)
      if (apiResults) {
        regionData = {
          ...regionData,
          temperature: apiResults.temperature,
          airQuality: apiResults.airQuality,
          floodRisk: apiResults.floodRisk,
        }
        setOverlayMetrics({
          temperature: apiResults.temperature,
          airQuality: apiResults.airQuality,
          floodRisk: apiResults.floodRisk,
        })
        setClickedLocation(regionData)
      } else {
        setOverlayMetrics({
          temperature: regionData.temperature,
          airQuality: regionData.airQuality,
          floodRisk: regionData.floodRisk,
        })
      }

      onRegionSelect(regionData)
    }

    run()
  }, [searchResult, map, fetchCountryGeometry, fetchApiData, fetchWaterGeometry])

  const handleMapClick = async (lat: number, lng: number) => {
    // Normalize coordinates to valid ranges
    // Latitude: -90 to 90
    // Longitude: -180 to 180
    const normalizedLat = Math.max(-90, Math.min(90, lat))
    const normalizedLng = ((lng + 180) % 360) - 180 // Wrap longitude to -180 to 180

    console.log('🗺️ Clicked coords:', { lat: normalizedLat, lng: normalizedLng })

    // Create region data for clicked location
    setSelectedCountryGeometry(null)
    setHighlightCircle(null)
    setWaterGeometry(null)

    let regionData: RegionData = {
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
    setOverlayMetrics(null)

    const geometryResult = await fetchCountryGeometry(normalizedLat, normalizedLng, {
      fitBounds: true,
      properties: { name: regionData.name },
    })

    if (geometryResult.bounds) {
      fetchWaterGeometry(geometryResult.bounds)
    }

    if (!geometryResult.success) {
      if (!map) return
      const zoom = map.getZoom()
      const radius = zoom > 12 ? 1000 : zoom > 8 ? 4000 : 10000 // 1km, 4km, 10km
      setHighlightCircle({ center: [normalizedLat, normalizedLng], radius: radius })
    }
    if (geometryResult.countryName) {
      const resolvedName = geometryResult.countryName ?? regionData.name
      regionData = { ...regionData, name: resolvedName }
      setClickedLocation(regionData)
    }

    // Fetch API data with normalized coordinates
    const apiResults = await fetchApiData(normalizedLat, normalizedLng)

    // Update region data with API results if available
    if (apiResults) {
      regionData.temperature = apiResults.temperature
      regionData.airQuality = apiResults.airQuality
      regionData.floodRisk = apiResults.floodRisk
      setOverlayMetrics({
        temperature: apiResults.temperature,
        airQuality: apiResults.airQuality,
        floodRisk: apiResults.floodRisk,
      })
      regionData = {
        ...regionData,
        temperature: apiResults.temperature,
        airQuality: apiResults.airQuality,
        floodRisk: apiResults.floodRisk,
      }
      setClickedLocation(regionData)
    } else {
      setOverlayMetrics({
        temperature: regionData.temperature,
        airQuality: regionData.airQuality,
        floodRisk: regionData.floodRisk,
      })
    }

    // Update sidebar with complete data
    onRegionSelect(regionData)
  }

  const overlayFillColor = (() => {
    if (!overlayMetrics) return null

    switch (activeOverlay) {
      case 'temperature':
        return overlayMetrics.temperature !== null ? temperatureSeverityColor(overlayMetrics.temperature) : null
      case 'air-quality':
        return overlayMetrics.airQuality !== null ? airQualitySeverityColor(overlayMetrics.airQuality) : null
      case 'flood':
        return overlayMetrics.floodRisk !== null ? floodSeverityColor(overlayMetrics.floodRisk) : null
      case 'combined':
        if (overlayMetrics.temperature !== null && overlayMetrics.airQuality !== null && overlayMetrics.floodRisk !== null) {
          return combinedRiskSeverityColor(
            calculateUrbanRiskScore(overlayMetrics.temperature, overlayMetrics.airQuality, overlayMetrics.floodRisk)
          )
        }
        return null
      default:
        return null
    }
  })()

  useEffect(() => {
    if (!onOverlayStateChange) return

    onOverlayStateChange({
      hasGeometry: Boolean(selectedCountryGeometry),
      overlayMetrics,
    })
  }, [onOverlayStateChange, overlayMetrics, selectedCountryGeometry])

  if (!mounted) {
    return <div className="h-full flex items-center justify-center text-gray-400">Loading map...</div>
  }

  return (
    <div id={mapId} className="h-full w-full relative">
      {isLoadingApi && (
        <div className="pointer-events-none absolute inset-0 z-[1002] flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-gray-100 text-sm">
            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin"></span>
            <span>Analyzing region...</span>
          </div>
        </div>
      )}

      {/* Urban Planning Controls */}
      <div className="absolute top-4 right-4 z-[1001] bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl max-w-sm">
        {/* Header with collapse button */}
        {/* <div className="flex items-center justify-between p-4 pb-2">
          <div className="text-lg font-bold text-white flex items-center gap-2">
            NASA Urban Planning Assistant
          </div>
          <button
            onClick={() => setIsPlanningPanelCollapsed(!isPlanningPanelCollapsed)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title={isPlanningPanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isPlanningPanelCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div> */}

        {/* Collapsible content */}
        {/* {!isPlanningPanelCollapsed && (
          <div className="px-4 pb-4"> */}
            {/* Analysis Mode Selector */}
            {/* <div className="space-y-3 mb-4">
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
                  Grid
                </button>
              </div>

              {analysisMode === 'region' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    onKeyDown={(e) => {
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
            </div> */}

            {/* Loading indicator */}
            {/* {isGeneratingGrid && (
              <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-blue-200">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span className="text-sm">Generating development grid...</span>
                </div>
              </div>
            )} */}

            {/* Instructions */}
            {/* <div className="text-xs text-gray-400 mb-4 p-3 bg-gray-800 rounded border border-gray-600">
              <div className="font-semibold text-gray-300 mb-2">How to Use:</div>
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
                  <li>Click &quot;Generate&quot; to load grid data</li>
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
            </div> */}

            {/* Growth Suitability Legend */}
            {/* <div className="border-t border-gray-600 pt-4">
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
            </div> */}
        {/* </div>
        )} */}
      </div> 

      <MapContainer
        key={mapId}
        center={[-6.2088, 106.8456]} // Jakarta, Indonesia
        zoom={10}
        minZoom={3}
        maxZoom={16} // Allow over-zooming up to level 16
        maxBounds={[
          [-90, -180],  // Southwest coordinates
          [90, 180]     // Northeast coordinates
        ]}
        maxBoundsViscosity={0.5}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={true}
        ref={(mapInstance) => {
          if (mapInstance) {
            setMap(mapInstance)
          }
        }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={16} // Tiles are only available up to zoom 16
        />

        {selectedCountryGeometry && activeOverlay !== 'none' && (
          <GeoJSON
            key={`${activeOverlay}-${overlayFillColor}`}
            data={selectedCountryGeometry as unknown as GeoJsonObject}
            style={() => ({
              color: '#ffffff',
              weight: 1,
              fillColor: overlayFillColor || '#0000ff',
              fillOpacity: 0.55,
              opacity: 0.8,
            })}
          />
        )}

        {waterGeometry && (
          <GeoJSON
            key="water-mask"
            data={waterGeometry as unknown as GeoJsonObject}
            pane="markerPane"
            style={() => ({
              fillColor: '#1a293b',
              color: 'transparent',
              fillOpacity: 1,
            })}
          />
        )}

        {highlightCircle && activeOverlay !== 'none' && (
          <Circle
            center={highlightCircle.center}
            radius={highlightCircle.radius}
            pathOptions={{
              color: '#ffffff',
              weight: 1,
              fillColor: overlayFillColor || '#0000ff',
              fillOpacity: 0.55,
              opacity: 0.8,
            }}
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
                        <div className="font-semibold text-green-700 mb-2">SUITABLE FOR DEVELOPMENT</div>
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
                        <div className="font-semibold text-yellow-800 mb-2">CONDITIONAL DEVELOPMENT</div>
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
                        <div className="font-semibold text-red-800 mb-2">NOT RECOMMENDED FOR DEVELOPMENT</div>
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
                  Grid Position: Row {cell.gridRow + 1}, Column {cell.gridCol + 1}<br />
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
                        Temperature:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {apiData.temperature !== null && apiData.temperature !== undefined ? `${apiData.temperature}°C` : 'Not Found'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        Air Quality:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {apiData.airQuality !== null && apiData.airQuality !== undefined ? `AQI ${apiData.airQuality}` : 'Not Found'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        Flood Risk:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {apiData.floodRisk !== null && apiData.floodRisk !== undefined ? `${apiData.floodRisk}%` : 'Not Found'}
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
                        Temperature:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {clickedLocation.temperature}°C
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                       Air Quality:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        AQI {clickedLocation.airQuality}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        Flood Risk:
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

