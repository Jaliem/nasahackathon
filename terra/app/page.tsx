import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f0f]">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">
            Smart City Planning Powered by NASA Earth Data
          </h1>

          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            Terra helps urban planners visualize temperature, air quality, and flood risk
            using NASA Earth observation data for sustainable and climate-resilient city growth.
          </p>

          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 bg-[#2a2a2a] hover:bg-[#333] text-gray-200 border border-gray-700 transition-colors"
          >
            View Dashboard
          </Link>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 bg-[#1a1a1a] border border-gray-800">
              <h3 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
                Temperature
              </h3>
              <p className="text-xs text-gray-500">
                Monitor urban heat patterns and forecast climate trends
              </p>
            </div>

            <div className="p-6 bg-[#1a1a1a] border border-gray-800">
              <h3 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
                Air Quality
              </h3>
              <p className="text-xs text-gray-500">
                Track pollution levels and predict air quality changes
              </p>
            </div>

            <div className="p-6 bg-[#1a1a1a] border border-gray-800">
              <h3 className="text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
                Flood Risk
              </h3>
              <p className="text-xs text-gray-500">
                Assess flood vulnerability and plan resilient infrastructure
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-600">
          <p>Built with NASA Earth observation data for sustainable urban planning</p>
        </div>
      </footer>
    </div>
  )
}
