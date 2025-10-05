import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, locationData } = body

    console.log('Chat API called with message:', message)

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }

    console.log('API Key configured, initializing GoogleGenAI...')

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    // Build context from location data
    const contextPrompt = locationData
      ? `You are a helpful climate and environmental assistant analyzing data for ${locationData.name}.

Current Location Data:
- Location: ${locationData.name} (${locationData.lat}, ${locationData.lng})
- Temperature: ${locationData.temperature !== null ? `${locationData.temperature}°C` : 'Not available'}
- Air Quality Index (AQI): ${locationData.airQuality !== null ? locationData.airQuality : 'Not available'}
- Flood Risk: ${locationData.floodRisk !== null ? `${locationData.floodRisk}%` : 'Not available'}

Based on this environmental data, please provide helpful, accurate, and actionable insights. Keep responses concise and focused on environmental impact, climate risks, and sustainability recommendations.

User question: ${message}`
      : `You are a helpful climate and environmental assistant. The user hasn't selected a location yet, so provide general information about climate, environment, and sustainability.

User question: ${message}`

    console.log('Generating content with Gemini...')

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: contextPrompt,
    })

    console.log('Gemini response received')

    const text = response.text

    if (!text) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: text,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)

    // Handle specific error types
    let errorMessage = 'Internal server error'
    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid API key. Please check your GEMINI_API_KEY in .env.local'
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
