'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Popup, Marker, useMapEvents, Rectangle, GeoJSON, Circle } from 'react-leaflet'
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
  temperature: number  
  airQuality: number 
  floodRisk: number 
  lat: number 
  lng: number 
}

export type OverlayType = 'none' | 'temperature' | 'air-quality' | 'flood' | 'combined'

export type GIBSOverlayType = 'temperature' | 'air-quality' | 'flood'

export type MapMode = 'standard' | 'gibs-overlay'

const gibsOverlayLabels: Record<GIBSOverlayType, string> = {
  temperature: 'Surface Temperature',
  'air-quality': 'Air Quality (Aerosol Optical Depth)',
  flood: 'Flood / Precipitation',
}

const GIBS_LAYER_CONFIG: Record<
  GIBSOverlayType,
  {
    layerId: string
    tileMatrixSet: string
    maxNativeZoom: number
    includeTimeDimension: boolean
  }
> = {
  temperature: {
    layerId: 'MODIS_Terra_Land_Surface_Temp_Day',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    includeTimeDimension: true,
  },
  'air-quality': {
    layerId: 'MODIS_Combined_MAIAC_L2G_AerosolOpticalDepth',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    maxNativeZoom: 7,
    includeTimeDimension: false,
  },
  flood: {
    layerId: 'IMERG_Precipitation_Rate',
    tileMatrixSet: 'GoogleMapsCompatible_Level6',
    maxNativeZoom: 6,
    includeTimeDimension: true,
  },
}

export interface MapComponentProps {
  onRegionSelect: (region: RegionData) => void
  searchResult?: { lat: number; lng: number; name: string } | null
  activeOverlay: OverlayType
  mapMode: MapMode
  gibsOverlay: GIBSOverlayType
  onOverlayStateChange?: (state: {
    hasGeometry: boolean
    overlayMetrics: { temperature: number; airQuality: number; floodRisk: number } | null
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
  temperature: number
  airQuality: number
  floodRisk: number
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
  mapMode,
  gibsOverlay,
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
  const [isLoadingApi, setIsLoadingApi] = useState(false)
  const [map, setMap] = useState<L.Map | null>(null)
  const [urbanPlanningGrid] = useState<UrbanPlanningGrid[]>([])
  const [selectedCountryGeometry, setSelectedCountryGeometry] = useState<Feature | FeatureCollection | null>(null)
  const [overlayMetrics, setOverlayMetrics] = useState<{ temperature: number; airQuality: number; floodRisk: number } | null>(null)
  const [highlightCircle, setHighlightCircle] = useState<{ center: [number, number]; radius: number } | null>(null)
  const [waterGeometry, setWaterGeometry] = useState<FeatureCollection | null>(null)
  const [gibsBounds, setGibsBounds] = useState<[number, number, number, number] | null>(null)
  const [gibsMaskGeometry, setGibsMaskGeometry] = useState<FeatureCollection | null>(null)
  const [lastClickedCoords, setLastClickedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const fetchWaterGeometry = useCallback(async (bounds: [number, number, number, number]) => {
    console.log('🌎 Received bounds for water geometry fetch:', bounds);
    const [south, west, north, east] = bounds;

    // Add a check for the size of the bounding box
    const area = (north - south) * (east - west);
    if (area > 100) { // Limit to a reasonable area (e.g., 100 square degrees)
      console.log('⚠️ Bounding box is too large for water geometry query, skipping.');
      setWaterGeometry(null);
      return;
    }

    const bbox = `${south},${west},${north},${east}`;
    const query = `
      [out:geojson][timeout:30];
      (
        nwr["natural"="water"](${bbox});
        nwr["waterway"="riverbank"](${bbox});
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
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const polygonFeatures = data.features.filter(
          (feature: Feature) =>
            feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
        );
        if (polygonFeatures.length > 0) {
          setWaterGeometry({ type: 'FeatureCollection', features: polygonFeatures });
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

  const buildGibsMask = useCallback((geometry: FeatureCollection | null): FeatureCollection | null => {
    if (!geometry || !geometry.features.length) return null

    const worldOutline: number[][] = [
      [-180, -90],
      [180, -90],
      [180, 90],
      [-180, 90],
      [-180, -90],
    ]

    const holes: number[][][] = []

    for (const feature of geometry.features) {
      if (!feature.geometry) continue
      if (feature.geometry.type === 'Polygon') {
        const rings = feature.geometry.coordinates
        if (rings[0]) {
          holes.push(rings[0])
        }
      } else if (feature.geometry.type === 'MultiPolygon') {
        for (const polygon of feature.geometry.coordinates) {
          if (polygon[0]) {
            holes.push(polygon[0])
          }
        }
      }
    }

    if (!holes.length) return null

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [worldOutline, ...holes],
          },
        },
      ],
    }
  }, [])

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

    if (mapMode === 'gibs-overlay') {
      if (sanitized) {
        try {
          const geoLayer = L.geoJSON(sanitized as unknown as GeoJsonObject)
          const geoBounds = geoLayer.getBounds()
          if (geoBounds.isValid()) {
            setGibsBounds([
              geoBounds.getSouth(),
              geoBounds.getWest(),
              geoBounds.getNorth(),
              geoBounds.getEast(),
            ])
          }
        } catch (error) {
          console.warn('Failed to compute GIBS bounds from geometry:', error)
        }
        setGibsMaskGeometry(buildGibsMask(sanitized))
      } else {
        setGibsMaskGeometry(null)
        setGibsBounds(null)
      }
    }

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
  }, [buildGibsMask, map, mapMode])

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





  // Handle search result
  const fetchApiData = useCallback(async (lat: number, lng: number): Promise<ApiData | null> => {
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

      console.log('API data fetched for popup:', { tempData, aqData, floodData })

      const apiResults: ApiData = {
        temperature: tempData.data?.currentTemp || 0,
        airQuality: tempData.data?.currentAQI || aqData.data?.currentAQI || 0,
        floodRisk: floodData.data?.overallRisk || 0,
      }

      return apiResults
    } catch (error) {
      console.error('Error fetching API data for popup:', error)
      return null
    } finally {
      setIsLoadingApi(false)
    }
  }, [])

  useEffect(() => {
    if (!searchResult || !map) return

    const run = async () => {
      console.log('🔍 Navigating to:', searchResult.name)
      map.flyTo([searchResult.lat, searchResult.lng], 10, {
        duration: 1.5
      })

      setLastClickedCoords({ lat: searchResult.lat, lng: searchResult.lng })

      let regionData: RegionData = {
        name: searchResult.name,
        lat: searchResult.lat,
        lng: searchResult.lng,
        temperature: 0,
        airQuality: 0,
        floodRisk: 0,
      }

      setClickedLocation(regionData)
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
  }, [searchResult, map, fetchCountryGeometry, fetchApiData, fetchWaterGeometry, onRegionSelect])

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
        return temperatureSeverityColor(overlayMetrics.temperature)
      case 'air-quality':
        return airQualitySeverityColor(overlayMetrics.airQuality)
      case 'flood':
        return floodSeverityColor(overlayMetrics.floodRisk)
      case 'combined':
        return combinedRiskSeverityColor(
          calculateUrbanRiskScore(overlayMetrics.temperature, overlayMetrics.airQuality, overlayMetrics.floodRisk)
        )
      default:
        return null
    }
  })()

  const getGibsTileLayer = useCallback(() => {
    if (mapMode !== 'gibs-overlay') return null

    const baseUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
    const layerConfig = GIBS_LAYER_CONFIG[gibsOverlay]
    const { layerId, tileMatrixSet, maxNativeZoom, includeTimeDimension } = layerConfig

    // Use a date with better data availability (3 days ago for more reliable data)
    const today = new Date()
    const dataDate = new Date(today)
    dataDate.setDate(dataDate.getDate() - 3)
    const dateString = dataDate.toISOString().split('T')[0]
    const timeSegment = includeTimeDimension ? `${dateString}/` : ''

    return (
      <TileLayer
        key={`gibs-${gibsOverlay}-global-${dateString}`}
        url={`${baseUrl}/${layerId}/default/${timeSegment}${tileMatrixSet}/{z}/{y}/{x}.png`}
        attribution="NASA GIBS"
        opacity={0.9}
        maxZoom={Math.max(maxNativeZoom, 12)}
        maxNativeZoom={maxNativeZoom}
        minZoom={1}
      />
    )
  }, [gibsOverlay, mapMode])

  useEffect(() => {
    if (!onOverlayStateChange) return

    onOverlayStateChange({
      hasGeometry: Boolean(selectedCountryGeometry),
      overlayMetrics,
    })
  }, [onOverlayStateChange, overlayMetrics, selectedCountryGeometry])

  useEffect(() => {
    if (mapMode !== 'gibs-overlay') {
      setGibsMaskGeometry(null)
      setGibsBounds(null)
      return
    }

    const geometryCollection = sanitizeFeatureCollection(
      (selectedCountryGeometry as Feature | FeatureCollection) || null
    )

    if (!geometryCollection) {
      setGibsMaskGeometry(null)
      setGibsBounds(null)
      return
    }

    setGibsMaskGeometry(buildGibsMask(geometryCollection))

    try {
      const geoLayer = L.geoJSON(geometryCollection as unknown as GeoJsonObject)
      const bounds = geoLayer.getBounds()
      if (bounds.isValid()) {
        setGibsBounds([
          bounds.getSouth(),
          bounds.getWest(),
          bounds.getNorth(),
          bounds.getEast(),
        ])
      }
    } catch (error) {
      console.warn('Unable to compute GIBS bounds from geometry:', error)
    }
  }, [buildGibsMask, mapMode, selectedCountryGeometry])

  useEffect(() => {
    if (!map || !lastClickedCoords) return
    map.flyTo(
      [lastClickedCoords.lat, lastClickedCoords.lng],
      mapMode === 'gibs-overlay' ? Math.max(map.getZoom(), 5) : map.getZoom(),
      { duration: 0.6 }
    )
  }, [lastClickedCoords, map, mapMode])

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

      {/* Map controls handled via dashboard panel */}

      {/* Urban Planning Controls */}
      {mapMode === 'standard' && (
        <div className="absolute top-4 right-4 z-[1001] bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl max-w-sm">
          {/* Header with collapse button */}
          {/* <div className="flex items-center justify-between p-4 pb-2">
          ...
          */}
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
      )}

      <MapContainer
        key={`${mapId}-${mapMode}`}
        center={lastClickedCoords ? [lastClickedCoords.lat, lastClickedCoords.lng] : [-6.2088, 106.8456]}
        zoom={mapMode === 'gibs-overlay' ? 5 : 10}
        minZoom={mapMode === 'gibs-overlay' ? 2 : 3}
        maxZoom={16}
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
          maxZoom={16}
        />

        {mapMode === 'gibs-overlay' && getGibsTileLayer()}

        {mapMode === 'standard' && selectedCountryGeometry && activeOverlay !== 'none' && (
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

        {mapMode === 'gibs-overlay' && selectedCountryGeometry && (
          <GeoJSON
            key={`gibs-outline`}
            data={selectedCountryGeometry as unknown as GeoJsonObject}
            style={() => ({
              color: '#ffffff',
              weight: 1.5,
              fillColor: 'transparent',
              fillOpacity: 0,
              opacity: 0.9,
            })}
          />
        )}

        {/* Removed GIBS mask to show global overlay */}

        {mapMode === 'standard' && waterGeometry && (
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

        {mapMode === 'standard' && highlightCircle && activeOverlay !== 'none' && (
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

        {/* Removed GIBS bounds rectangle - showing global overlay now */}

        {mapMode === 'gibs-overlay' && !selectedCountryGeometry && highlightCircle && (
          <Circle
            center={highlightCircle.center}
            radius={highlightCircle.radius}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: 'transparent',
              fillOpacity: 0,
              opacity: 0.9,
            }}
          />
        )}

        {/* Clicked location marker */}
        {mapMode === 'standard' && clickedLocation && (
          <Marker
            position={[clickedLocation.lat, clickedLocation.lng]}
            icon={customIcon}
          />
        )}

        {/* Urban Planning Development Grid */}
        {mapMode === 'standard' && urbanPlanningGrid.map((cell) => (
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
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{cell.name}</h3>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                    cell.habitability === 'excellent' ? 'bg-green-100 text-green-800' :
                    cell.habitability === 'good' ? 'bg-green-50 text-green-700 border border-green-200' :
                    cell.habitability === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    cell.habitability === 'poor' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {cell.habitability.charAt(0).toUpperCase() + cell.habitability.slice(1)} Suitability
                  </span>
                </div>

                {/* Development Suitability Assessment */}
                <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Suitability Analysis</h4>
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
                  <h4 className="font-semibold text-gray-800 text-sm border-b border-gray-200 pb-2">Environmental Metrics</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1 font-medium">Temperature</div>
                      <div className="text-base font-semibold text-gray-900">{cell.temperature}°C</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {cell.temperature > 35 ? 'Very Hot' :
                         cell.temperature > 30 ? 'Hot' :
                         cell.temperature > 25 ? 'Warm' :
                         cell.temperature > 20 ? 'Mild' : 'Cool'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1 font-medium">Air Quality</div>
                      <div className="text-base font-semibold text-gray-900">AQI {cell.airQuality}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {cell.airQuality <= 50 ? 'Good' :
                         cell.airQuality <= 100 ? 'Moderate' :
                         cell.airQuality <= 150 ? 'Unhealthy' : 'Hazardous'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1 font-medium">Flood Risk</div>
                      <div className="text-base font-semibold text-gray-900">{cell.floodRisk}%</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {cell.floodRisk <= 30 ? 'Low' :
                         cell.floodRisk <= 60 ? 'Moderate' : 'High'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Urban Planning Recommendations */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">
                    Development Recommendations
                  </h4>
                  <div className="space-y-2 text-sm">
                    {cell.habitability === 'excellent' && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-800 mb-2">Recommended for Major Development</div>
                        <ul className="text-green-700 space-y-1 text-xs">
                          <li>• High-density residential developments</li>
                          <li>• Commercial and business districts</li>
                          <li>• Educational and healthcare facilities</li>
                          <li>• Parks and community centers</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'good' && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-700 mb-2">Suitable for Development</div>
                        <ul className="text-green-600 space-y-1 text-xs">
                          <li>• Medium-density mixed-use development</li>
                          <li>• Standard infrastructure requirements</li>
                          <li>• Green building practices recommended</li>
                          <li>• Environmental monitoring protocols</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'moderate' && (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div className="font-semibold text-yellow-800 mb-2">Conditional Development</div>
                        <ul className="text-yellow-700 space-y-1 text-xs">
                          <li>• Low-density development only</li>
                          <li>• Enhanced climate-resilient infrastructure</li>
                          <li>• Mandatory environmental impact assessments</li>
                          <li>• Continuous monitoring required</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'poor' && (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="font-semibold text-orange-800 mb-2">High-Risk Development Area</div>
                        <ul className="text-orange-700 space-y-1 text-xs">
                          <li>• Avoid residential development</li>
                          <li>• Industrial use only with extensive precautions</li>
                          <li>• Flood mitigation systems mandatory</li>
                          <li>• Emergency evacuation planning critical</li>
                        </ul>
                      </div>
                    )}
                    {cell.habitability === 'critical' && (
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="font-semibold text-red-800 mb-2">Not Recommended for Development</div>
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

                <div className="border-t border-gray-200 pt-3 mt-4 text-xs text-gray-500 text-center">
                  <div className="font-mono">Grid: Row {cell.gridRow + 1}, Col {cell.gridCol + 1}</div>
                  <div className="mt-1">NASA Earth Observation Data</div>
                </div>
              </div>
            </Popup>
          </Rectangle>
        ))}
      </MapContainer>
    </div>
  )
}
