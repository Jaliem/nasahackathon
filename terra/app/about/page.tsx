import Navigation from '@/components/Navigation'

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f0f]">
      <Navigation />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-100 mb-8">About Terra</h1>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">Mission</h2>
              <p className="text-gray-400 leading-relaxed">
                Terra is an urban planning intelligence platform that leverages NASA Earth observation
                data to help city planners make informed, data-driven decisions for sustainable and
                climate-resilient urban development. By combining real-time satellite data with AI-powered
                predictions, we enable smarter planning that prioritizes quality of life and environmental
                sustainability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">The Challenge</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Cities worldwide face mounting challenges from climate change, including urban heat islands,
                deteriorating air quality, and increased flood risks. Traditional planning approaches often
                lack access to comprehensive, real-time environmental data needed to address these complex
                issues effectively.
              </p>
              <p className="text-gray-400 leading-relaxed">
                Terra was built to bridge this gap by making NASA&apos;s Earth observation data accessible and
                actionable for urban planners, enabling evidence-based decisions that improve resilience
                and quality of life.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">NASA Earth Data Integration</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Our platform integrates multiple NASA Earth observation datasets to provide comprehensive
                environmental insights:
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-[#1a1a1a] border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">MODIS Land Surface Temperature</h3>
                  <p className="text-xs text-gray-500">
                    Thermal infrared data for monitoring urban heat islands and temperature patterns
                  </p>
                </div>
                <div className="p-4 bg-[#1a1a1a] border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">OMI & AIRS Air Quality Data</h3>
                  <p className="text-xs text-gray-500">
                    Satellite measurements of atmospheric pollutants and air quality indicators
                  </p>
                </div>
                <div className="p-4 bg-[#1a1a1a] border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">GPM Precipitation Data</h3>
                  <p className="text-xs text-gray-500">
                    Global precipitation measurements combined with elevation models for flood risk assessment
                  </p>
                </div>
                <div className="p-4 bg-[#1a1a1a] border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Landsat & Sentinel Imagery</h3>
                  <p className="text-xs text-gray-500">
                    High-resolution satellite imagery for vegetation health and land use analysis
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">Technology Stack</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-[#1a1a1a] border border-gray-800">
                  <p className="text-sm text-gray-300">Next.js 15</p>
                  <p className="text-xs text-gray-600">Framework</p>
                </div>
                <div className="p-3 bg-[#1a1a1a] border border-gray-800">
                  <p className="text-sm text-gray-300">TypeScript</p>
                  <p className="text-xs text-gray-600">Language</p>
                </div>
                <div className="p-3 bg-[#1a1a1a] border border-gray-800">
                  <p className="text-sm text-gray-300">Leaflet.js</p>
                  <p className="text-xs text-gray-600">Mapping</p>
                </div>
                <div className="p-3 bg-[#1a1a1a] border border-gray-800">
                  <p className="text-sm text-gray-300">Tailwind CSS</p>
                  <p className="text-xs text-gray-600">Styling</p>
                </div>
                <div className="p-3 bg-[#1a1a1a] border border-gray-800">
                  <p className="text-sm text-gray-300">NASA Earthdata</p>
                  <p className="text-xs text-gray-600">Data Source</p>
                </div>
                <div className="p-3 bg-[#1a1a1a] border border-gray-800">
                  <p className="text-sm text-gray-300">Vercel</p>
                  <p className="text-xs text-gray-600">Hosting</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">Key Features</h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">●</span>
                  <div>
                    <p className="text-gray-300 font-medium">Interactive Data Visualization</p>
                    <p className="text-sm text-gray-500">
                      Real-time mapping of temperature, air quality, and flood risk data
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">●</span>
                  <div>
                    <p className="text-gray-300 font-medium">AI-Powered Predictions</p>
                    <p className="text-sm text-gray-500">
                      Machine learning models for climate and environmental forecasting
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">●</span>
                  <div>
                    <p className="text-gray-300 font-medium">Risk Assessment Tools</p>
                    <p className="text-sm text-gray-500">
                      Color-coded indicators for quick identification of high-risk areas
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">●</span>
                  <div>
                    <p className="text-gray-300 font-medium">Regional Analysis</p>
                    <p className="text-sm text-gray-500">
                      Detailed environmental data for specific city regions and neighborhoods
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">Impact & Goals</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Terra aims to democratize access to sophisticated Earth observation data, empowering urban
                planners with the tools they need to create more livable, sustainable cities. By providing
                actionable insights on climate risks and environmental quality, we help cities:
              </p>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">→</span>
                  Reduce urban heat through strategic green infrastructure planning
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">→</span>
                  Improve air quality by identifying pollution hotspots
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">→</span>
                  Enhance flood resilience through predictive risk modeling
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-600">→</span>
                  Support evidence-based policy decisions for climate adaptation
                </li>
              </ul>
            </section>

            <section className="pt-8 border-t border-gray-800">
              <p className="text-sm text-gray-500 text-center">
                Built for sustainable urban planning | Powered by NASA Earth observation data
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
