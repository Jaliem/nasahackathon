import { NextRequest, NextResponse } from 'next/server'

// GIBS WMTS endpoint for NASA satellite data
const GIBS_BASE_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best'

// NASA POWER API endpoint
const NASA_POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point'

async function fetchNASAPowerTemperature(lat: number, lng: number) {
  try {
    // Get date range (last 14 days to ensure we get at least 7 valid days)
    const today = new Date()
    const endDate = today.toISOString().split('T')[0].replace(/-/g, '')
    const startDateObj = new Date(today)
    startDateObj.setDate(startDateObj.getDate() - 14)
    const startDate = startDateObj.toISOString().split('T')[0].replace(/-/g, '')

    // Fetch NASA POWER data
    const url = `${NASA_POWER_BASE_URL}?parameters=T2M,T2M_MAX,T2M_MIN&community=RE&longitude=${lng}&latitude=${lat}&start=${startDate}&end=${endDate}&format=JSON`

    console.log('🛰️ Fetching NASA POWER data:', url)

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`NASA POWER API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ NASA POWER response:', data)

    // Extract temperature data
    const tempData = data.properties?.parameter?.T2M || {}
    const tempDates = Object.keys(tempData).sort()

    if (tempDates.length === 0) {
      throw new Error('No temperature data available')
    }

    // Filter out -999 (fill value for no data)
    const validTempDates = tempDates.filter(date => tempData[date] !== -999 && tempData[date] != null)

    if (validTempDates.length === 0) {
      throw new Error('No valid temperature data available (all values are fill values)')
    }

    // Get most recent valid temperature
    const latestDate = validTempDates[validTempDates.length - 1]
    const currentTemp = Math.round(tempData[latestDate])

    // Validate temperature is in reasonable range (-100 to 60°C)
    if (currentTemp < -100 || currentTemp > 60) {
      throw new Error(`Invalid temperature value: ${currentTemp}°C`)
    }

    // Get historical data for trend (last 7 valid values)
    const historicalTemps = validTempDates.slice(-7).map(date => Math.round(tempData[date]))

    console.log('✅ Valid NASA POWER temperature data:', { currentTemp, latestDate, validDates: validTempDates.length })

    return {
      currentTemp,
      historicalTemps,
      latestDate,
      source: 'NASA POWER',
      dataAvailable: true,
    }
  } catch (error) {
    console.error('❌ NASA POWER API error:', error)
    // Fallback to climate model if API fails
    return null
  }
}

async function fetchGIBSTemperatureData(lat: number, lng: number) {
  try {
    // Get current date for GIBS layer
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]

    // Try to get real NASA POWER data first
    const nasaPowerData = await fetchNASAPowerTemperature(lat, lng)

    if (!nasaPowerData) {
      throw new Error('No temperature data available for this location. NASA POWER API failed to return valid data.')
    }

    // Use real NASA POWER data
    const currentTemp = nasaPowerData.currentTemp
    console.log('✅ Using NASA POWER real temperature:', currentTemp)

    return {
      currentTemp,
      nasaPowerData,
      source: 'NASA POWER (Real Satellite/Model Data)',
      layer: 'MODIS_Terra_Land_Surface_Temp_Day',
      date: dateStr,
      resolution: '0.5° x 0.5°',
      gibsUrl: `${GIBS_BASE_URL}/MODIS_Terra_Land_Surface_Temp_Day/default/${dateStr}`,
    }
  } catch (error) {
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { lat, lng } = await request.json()
    console.log('🌡️  Temperature API called for:', { lat, lng })

    // Fetch GIBS temperature data
    const gibsData = await fetchGIBSTemperatureData(lat, lng)
    console.log('🛰️  GIBS Temperature Data:', gibsData)

    // Generate forecast based on current temperature and climate trends
    const { currentTemp, nasaPowerData } = gibsData

    if (!nasaPowerData?.historicalTemps || nasaPowerData.historicalTemps.length === 0) {
      throw new Error('No historical temperature data available from NASA POWER API')
    }

    // Use real historical data as forecast (use available data, pad with current temp if needed)
    const availableForecasts = nasaPowerData.historicalTemps.map((temp: number, i: number) => ({
      day: i + 1,
      temp,
      source: 'NASA POWER (Historical)',
    }))

    // If we have less than 7 days, pad with current temperature for remaining days
    const forecast = [...availableForecasts]
    while (forecast.length < 7) {
      forecast.push({
        day: forecast.length + 1,
        temp: currentTemp,
        source: 'NASA POWER (Current)',
      })
    }

    const response = {
      success: true,
      prediction: `Temperature: ${currentTemp}°C. Based on real NASA POWER satellite and model data (last 7 days historical).`,
      data: {
        location: { lat, lng },
        currentTemp: gibsData.currentTemp,
        forecast,
        metadata: {
          dataSource: gibsData.source,
          dataType: 'Real NASA POWER Data',
          gibsLayer: gibsData.layer,
          observationDate: nasaPowerData?.latestDate || gibsData.date,
          spatialResolution: gibsData.resolution,
          tileUrl: gibsData.gibsUrl,
          nasaPowerAvailable: true,
        },
      },
    }

    console.log('✅ Temperature API Response:', response)
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Temperature API Error:', error)
    return NextResponse.json(
      { success: false, message: 'Error processing temperature prediction', error: String(error) },
      { status: 500 }
    )
  }
}
