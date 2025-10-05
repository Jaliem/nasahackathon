import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory, locationData } = body

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

    // Build system instruction
    const systemInstruction = locationData
      ? `Urban planning assistant specializing in sustainable city growth. Location: ${locationData.name} (${locationData.lat}, ${locationData.lng}), Temp ${locationData.temperature !== null ? `${locationData.temperature}°C` : 'N/A'}, AQI ${locationData.airQuality !== null ? locationData.airQuality : 'N/A'}, Flood Risk ${locationData.floodRisk !== null ? `${locationData.floodRisk}%` : 'N/A'}. Provide brief, actionable insights for urban planners on balancing city development with environmental sustainability and public health. Keep responses under 100 words.`
      : `Urban planning assistant specializing in sustainable city growth. Provide brief, actionable insights for urban planners on balancing development with environmental sustainability. Keep responses under 100 words.`

    // Build conversation history for context
    let conversationContent = systemInstruction + '\n\n'

    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        conversationContent += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`
      }
    }

    conversationContent += `User: ${message}`

    console.log('Generating content with Gemini...')

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: conversationContent,
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
  } catch (error: unknown) {
    console.error('Chat API error:', error)

    // Handle specific error types
    let errorMessage = 'Internal server error'
    const err = error as Error
    if (err.message?.includes('API key')) {
      errorMessage = 'Invalid API key. Please check your GEMINI_API_KEY in .env.local'
    } else if (err.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.'
    } else if (err.message) {
      errorMessage = err.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
