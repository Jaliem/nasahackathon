import Navigation from '@/components/Navigation'

export default function Insights() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f0f]">
      <Navigation />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">AI Insights</h1>
            <p className="text-sm text-gray-500">
              Advanced predictions powered by machine learning and NASA Earth data
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Air Quality Predictions */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-200 mb-1">
                  Air Quality Predictions
                </h3>
                <p className="text-xs text-gray-500">7-day forecast model</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Current AQI</span>
                  <span className="text-sm font-medium text-gray-300">68</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Predicted (7d)</span>
                  <span className="text-sm font-medium text-yellow-500">75</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Trend</span>
                  <span className="text-sm font-medium text-red-500">+10%</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-600">
                  Model ready for integration. Connect your AI endpoint to display live predictions.
                </p>
              </div>
            </div>

            {/* Urban Heat Zones */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-200 mb-1">
                  Urban Heat Zones
                </h3>
                <p className="text-xs text-gray-500">Temperature anomaly detection</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">High Risk Zones</span>
                  <span className="text-sm font-medium text-gray-300">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Avg Temperature</span>
                  <span className="text-sm font-medium text-orange-500">32°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Heat Index</span>
                  <span className="text-sm font-medium text-red-500">High</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-600">
                  Uses NASA MODIS satellite data for thermal analysis.
                </p>
              </div>
            </div>

            {/* Flood Risk Assessment */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-200 mb-1">
                  Flood Risk Assessment
                </h3>
                <p className="text-xs text-gray-500">Climate-driven predictions</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Risk Areas</span>
                  <span className="text-sm font-medium text-gray-300">8</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Overall Risk</span>
                  <span className="text-sm font-medium text-yellow-500">Moderate</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Confidence</span>
                  <span className="text-sm font-medium text-green-500">87%</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-600">
                  Integrates precipitation data with elevation models.
                </p>
              </div>
            </div>

            {/* Climate Trends */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-200 mb-1">
                  Climate Trends
                </h3>
                <p className="text-xs text-gray-500">Long-term analysis</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Temp Change (10y)</span>
                  <span className="text-sm font-medium text-red-500">+1.8°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Precipitation</span>
                  <span className="text-sm font-medium text-blue-500">+12%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Data Points</span>
                  <span className="text-sm font-medium text-gray-300">2.4M</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-600">
                  Historical data from NASA Earthdata archives.
                </p>
              </div>
            </div>

            {/* Vegetation Index */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-200 mb-1">
                  Vegetation Health
                </h3>
                <p className="text-xs text-gray-500">NDVI monitoring</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Green Cover</span>
                  <span className="text-sm font-medium text-green-500">42%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Change (1y)</span>
                  <span className="text-sm font-medium text-red-500">-3%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Health Index</span>
                  <span className="text-sm font-medium text-yellow-500">Fair</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-600">
                  Derived from Landsat and Sentinel satellite imagery.
                </p>
              </div>
            </div>

            {/* Carbon Emissions */}
            <div className="bg-[#1a1a1a] border border-gray-800 p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-200 mb-1">
                  Carbon Footprint
                </h3>
                <p className="text-xs text-gray-500">Emissions tracking</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">CO₂ Levels</span>
                  <span className="text-sm font-medium text-red-500">425 ppm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Trend</span>
                  <span className="text-sm font-medium text-red-500">Rising</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Target Gap</span>
                  <span className="text-sm font-medium text-orange-500">18%</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-600">
                  Data from NASA OCO-2 satellite observations.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-[#1a1a1a] border border-gray-800">
            <h2 className="text-lg font-medium text-gray-200 mb-2">Integration Ready</h2>
            <p className="text-sm text-gray-400 mb-4">
              These cards display placeholder data. Connect your AI models to the following endpoints:
            </p>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="text-gray-600">POST</span>
                <code className="text-gray-400">/api/predict/temperature</code>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">POST</span>
                <code className="text-gray-400">/api/predict/air-quality</code>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">POST</span>
                <code className="text-gray-400">/api/predict/flood</code>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
