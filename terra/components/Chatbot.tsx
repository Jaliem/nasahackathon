"use client"

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { RegionData } from './MapComponent'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatbotProps {
  locationData: RegionData | null
  isOpen: boolean
  onToggle: () => void
}

export function Chatbot({ locationData, isOpen, onToggle }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('chatbot-messages')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setMessages(parsed.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      } catch {
        localStorage.removeItem('chatbot-messages')
      }
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot-messages', JSON.stringify(messages))
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem('chatbot-messages')
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
          locationData: locationData
            ? {
                name: locationData.name,
                lat: locationData.lat,
                lng: locationData.lng,
                temperature: locationData.temperature,
                airQuality: locationData.airQuality,
                floodRisk: locationData.floodRisk,
              }
            : null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: data.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the server. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-[1001] bg-[#1a1a1a] hover:bg-[#202020] text-gray-300 border border-gray-800 rounded-full p-3.5 transition-colors"
        aria-label="Open assistant"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-[1001] w-96 h-[600px] bg-[#0f0f0f] rounded-lg shadow-2xl flex flex-col border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-100">TerraBot</h3>
          {locationData && (
            <p className="text-xs text-gray-400 truncate mt-1">{locationData.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={clearChat}
            className="text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded p-1.5 transition-colors"
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded p-1.5 transition-colors"
            aria-label="Close assistant"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0a] scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12 px-4">
            <p className="text-xs leading-relaxed">
              {locationData
                ? `Ask questions about ${locationData.name}'s environmental conditions and urban planning considerations.`
                : 'Select a location on the map to begin analyzing climate and environmental data.'}
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded p-2.5 ${
                message.role === 'user'
                  ? 'bg-[#1a1a1a] text-gray-100'
                  : 'bg-[#141414] text-gray-300 border border-gray-800'
              }`}
            >
              {message.role === 'user' ? (
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
              ) : (
                <div className="text-xs prose prose-sm prose-invert max-w-none prose-headings:text-gray-100 prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-p:text-gray-300 prose-ul:my-1 prose-li:my-0 prose-li:text-gray-300 prose-strong:text-gray-100 prose-strong:font-medium">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
              <p className={`text-[10px] mt-1.5 ${message.role === 'user' ? 'text-gray-500' : 'text-gray-600'}`}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#141414] border border-gray-800 rounded p-2.5">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800 bg-[#0f0f0f]">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="flex-1 bg-[#1a1a1a] border border-gray-800 text-gray-100 placeholder-gray-600 rounded px-3 py-2 focus:outline-none focus:border-gray-700 text-xs transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-[#1a1a1a] hover:bg-[#202020] disabled:bg-[#141414] disabled:text-gray-600 text-gray-300 border border-gray-800 rounded px-3 py-2 transition-colors text-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
