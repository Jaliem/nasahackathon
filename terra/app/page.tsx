import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Globe } from "@/components/Globe";
import Image from "next/image";

const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#000000]">
      <div className="relative group">
        <Navigation />
      </div>

      {/* Main container with padding removed to allow for full-width sections */}
      <main className="flex-1 flex flex-col items-center pt-40">
        
        {/* Top hero text with its own padding */}
        <div className="max-w-3xl text-center z-10 relative px-6">
          <h1 className="text-7xl md:text-7.5xl text-gray-100 mt-10 mb-4 leading-tight">
            Plan Smarter. <br /> <i> Build </i>
            <b>Stronger.</b>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Terra delivers critical climate intelligence for urban planners.
            Visualize heat, air, and water risks with the clarity of real-time
            data to create truly resilient communities.
          </p>
        </div>
        <div className="relative z-10 mt-8">
          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 bg-gray-100 hover:bg-[#d3d3d3] text-black transition-all duration-500 rounded-3xl hover:shadow-[0_0_30px_rgba(229,231,235,0.6)]"
          >
            <b>Get Started Now</b>
          </Link>
        </div>

        {/* Globe Section */}
        <div className="relative w-full overflow-hidden -mt-50">
          <div className="relative w-full h-[200vh]">
            <Globe />
            <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-b from-transparent via-black via-35% to-black"></div>
          </div>
        </div>

        {/* Main Content Wrapper (For content that overlaps the globe) */}
        <div className="w-full max-w-6xl mx-auto z-10 relative md:-mt-200 mb-20 px-4">
          
          {/* Section 1: Why Terra? */}
          <section className="mb-24 grid grid-cols-1 md:grid-cols-2 gap-15 items-center text-justify">
            <div>
              <h2 className="text-4xl text-gray-100 mb-6">Why Terra?</h2>
              <p className="text-gray-400 leading-relaxed">
                Urban planners face the challenge of making critical decisions
                without granular, real-time environmental data. To effectively
                combat issues like air pollution and urban heat islands, they
                need to move beyond traditional models and leverage dynamic,
                scientific datasets for evidence-based strategies.
              </p>
              <p className="text-gray-400 leading-relaxed mt-4">
                This platform bridges that gap by making actionable data
                accessible directly from key scientific sources, including the{" "}
                <a
                  href="https://waqi.info/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:underline"
                >
                  World Air Quality Index (WAQI)
                </a>{" "}
                ,{" "}
                <a
                  href="https://power.larc.nasa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:underline"
                >
                  NASA&apos;s POWER Project
                </a>{""}
                , and the{" "}
                <a
                  href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:underline"
                >
                  NASA&apos;s GIBS Earth Data
                </a>
                .
              </p>
              <div className="flex gap-5">
                
                <Image
                  src="/nasa_logo.png"
                  alt="NASA Logo"
                  width={50}
                  height={50}
                  className="mt-6 mb-6 opacity-80"
                />
                <Image
                  src="/waqi_logo.png"
                  alt="WAQI Logo"
                  width={40}
                  height={40}
                  className="mt-6 mb-6 opacity-80"
                />
              </div>
            </div>
            <div className="flex items-center justify-center overflow-hidden">
              <Image
                src="/why_tera.png"
                alt="Why Terra Illustration"
                width={1000}
                height={1000}
                className="shadow-2xl"
              />
            </div>
          </section>

          {/* Section 2: Feature Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="md:col-span-3 text-center">
              <h2 className="text-4xl text-gray-100 mb-6">
                <i>Key Features</i>
              </h2>
            </div>
            
            <div className="group relative p-20 rounded-2xl border border-white/10 bg-white/1 backdrop-blur-md shadow-xl flex flex-col items-center text-center transition-all duration-500 hover:scale-105 hover:border-white/70 hover:bg-white/10 hover:shadow-2xl overflow-hidden">
              <div className="absolute -bottom-5 -left-5 -right-5 h-20 bg-gradient-to-t from-gray-300/20 to-transparent rounded-b-2xl blur-md"></div>
              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-gray-300/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12H5.25m-.386-6.364l1.591-1.591M12 12.75a3 3 0 110-6 3 3 0 010 6z" /></svg>
              </div>
              <h3 className="relative z-10 text-xl font-semibold text-gray-100 mb-3 transition-colors duration-300 group-hover:text-white">Temperature</h3>
              <p className="relative z-10 text-sm text-gray-400 transition-colors duration-300 group-hover:text-gray-300">Monitor urban heat patterns and forecast climate trends.</p>
            </div>
            
            <div className="group relative p-20 rounded-2xl border border-white/10 bg-white/1 backdrop-blur-md shadow-xl flex flex-col items-center text-center transition-all duration-500 hover:scale-105 hover:border-white/70 hover:bg-white/10 hover:shadow-2xl overflow-hidden">
              <div className="absolute -bottom-5 -left-5 -right-5 h-20 bg-gradient-to-t from-gray-300/20 to-transparent rounded-b-2xl blur-md"></div>
              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-gray-300/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-1.996-5.43c-1.33 0-2.51.602-3.267 1.543l-.744.936-1.123-.112A4.5 4.5 0 006.75 7.5 4.5 4.5 0 002.25 12v3z" /></svg>
              </div>
              <h3 className="relative z-10 text-xl font-semibold text-gray-100 mb-3 transition-colors duration-300 group-hover:text-white">Air Quality</h3>
              <p className="relative z-10 text-sm text-gray-400 transition-colors duration-300 group-hover:text-gray-300">Track pollution levels and predict air quality changes.</p>
            </div>
            
            <div className="group relative p-20 rounded-2xl border border-white/10 bg-white/1 backdrop-blur-md shadow-xl flex flex-col items-center text-center transition-all duration-500 hover:scale-105 hover:border-white/70 hover:bg-white/10 hover:shadow-2xl overflow-hidden">
              <div className="absolute -bottom-5 -left-5 -right-5 h-20 bg-gradient-to-t from-gray-300/20 to-transparent rounded-b-2xl blur-md"></div>
              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-gray-300/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75c1.5-1.5 3.75-1.5 5.25 0s3.75 1.5 5.25 0s3.75-1.5 5.25 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12c1.5-1.5 3.75-1.5 5.25 0s3.75 1.5 5.25 0s3.75-1.5 5.25 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 17.25c1.5-1.5 3.75-1.5 5.25 0s3.75 1.5 5.25 0s3.75-1.5 5.25 0" /></svg>
              </div>
              <h3 className="relative z-10 text-xl font-semibold text-gray-100 mb-3 transition-colors duration-300 group-hover:text-white">Flood Risk</h3>
              <p className="relative z-10 text-sm text-gray-400 transition-colors duration-300 group-hover:text-gray-300">Assess flood vulnerability and plan resilient infrastructure.</p>
            </div>
            
            <div className="group relative p-20 rounded-2xl border border-white/10 bg-white/1 backdrop-blur-md shadow-xl flex flex-col items-center text-center transition-all duration-500 hover:scale-105 hover:border-white/70 hover:bg-white/10 hover:shadow-2xl overflow-hidden">
              <div className="absolute -bottom-5 -left-5 -right-5 h-20 bg-gradient-to-t from-gray-300/20 to-transparent rounded-b-2xl blur-md"></div>
              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-gray-300/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zm0 0v7.5m0 0h7.5m-7.5 0l-4.243-4.243" /></svg>
              </div>
              <h3 className="relative z-10 text-xl font-semibold text-gray-100 mb-3 transition-colors duration-300 group-hover:text-white">AI Insights</h3>
              <p className="relative z-10 text-sm text-gray-400 transition-colors duration-300 group-hover:text-gray-300">Leverage machine learning for predictive analysis and pattern detection.</p>
            </div>
            
            <div className="group relative p-20 rounded-2xl border border-white/10 bg-white/1 backdrop-blur-md shadow-xl flex flex-col items-center text-center transition-all duration-500 hover:scale-105 hover:border-white/70 hover:bg-white/10 hover:shadow-2xl overflow-hidden">
              <div className="absolute -bottom-5 -left-5 -right-5 h-20 bg-gradient-to-t from-gray-300/20 to-transparent rounded-b-2xl blur-md"></div>
              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-gray-300/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.017h-.008v-.017z" /></svg>
              </div>
              <h3 className="relative z-10 text-xl font-semibold text-gray-100 mb-3 transition-colors duration-300 group-hover:text-white">Risk Assessment</h3>
              <p className="relative z-10 text-sm text-gray-400 transition-colors duration-300 group-hover:text-gray-300">Quantify and map climate vulnerabilities with our integrated toolset.</p>
            </div>
            
            <div className="group relative p-20 rounded-2xl border border-white/10 bg-white/1 backdrop-blur-md shadow-xl flex flex-col items-center text-center transition-all duration-500 hover:scale-105 hover:border-white/70 hover:bg-white/10 hover:shadow-2xl overflow-hidden">
              <div className="absolute -bottom-5 -left-5 -right-5 h-20 bg-gradient-to-t from-gray-300/20 to-transparent rounded-b-2xl blur-md"></div>
              <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-gray-300/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              </div>
              <h3 className="relative z-10 text-xl font-semibold text-gray-100 mb-3 transition-colors duration-300 group-hover:text-white">Regional Analysis</h3>
              <p className="relative z-10 text-sm text-gray-400 transition-colors duration-300 group-hover:text-gray-300">Compare and analyze environmental data across multiple geographic areas.</p>
            </div>
          </section>
        </div>

        <section>
          <div className="bg-black text-gray-200 py-20 sm:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                {/* Left side: Text content */}

                {/* Right side: Chat UI mockup with new styling */}
                <div className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl p-4 sm:p-6 transition-all duration-500 hover:scale-105 hover:border-white/70 hover:bg-white/10 hover:shadow-2xl overflow-hidden">
                    <div className="absolute -bottom-5 -left-5 -right-5 h-20 bg-gradient-to-t from-gray-300/10 to-transparent rounded-b-2xl blur-md"></div>
                    {/* Header */}
                    <div className="relative z-10 flex items-center mb-6 space-x-3">
                        <div className="flex-shrink-0 bg-black/50 p-2 rounded-full border border-gray-700">
                            <BotIcon />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">TerraBot</h3>
                            <p className="text-sm text-gray-400 flex items-center">
                                <span className="w-2 h-2 bg-white rounded-full mr-1.5"></span>
                                Online
                            </p>
                        </div>
                    </div>

                    {/* Chat messages */}
                    <div className="relative z-10 space-y-5">
                        {/* Bot message 1 */}
                        <div className="flex items-start gap-3 max-w-md">
                            <div className="flex-shrink-0 bg-black/50 p-2 rounded-full border border-gray-700">
                                <BotIcon />
                            </div>
                            <div className="bg-black rounded-lg rounded-tl-none p-3 text-sm border-gray-700 border">
                                <p>Welcome! I&apos;m TerraBot. Ask me anything about urban environmental data or development suitability.</p>
                            </div>
                        </div>

                        {/* User message */}
                        <div className="flex justify-end">
                          <div className="bg-gray-100 rounded-lg rounded-br-none p-3 text-gray-800 max-w-md text-sm">
                            <p>Is it a good idea to build a new residential complex in West Jakarta?</p>
                          </div>
                        </div>
                        
                        {/* Bot message 2 */}
                        <div className="flex items-start gap-3 max-w-md">
                          <div className="flex-shrink-0 p-2 rounded-full border border-gray-700">
                              <BotIcon />
                          </div>
                          <div className="bg-black rounded-lg rounded-tl-none p-3 text-sm border border-gray-700">
                              <p>West Jakarta shows moderate air quality but a high flood-risk score. For a residential project, I would recommend elevating the foundation and including green spaces to mitigate heat.</p>
                          </div>
                      </div>
                    </div>
                </div>

                <div className="md:pr-8">
                    <h2 className="text-base font-semibold leading-7 text-gray-400"><i>Conversational AI</i></h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Meet TerraBot</p>
                    <p className="mt-6 text-lg leading-8 text-gray-300 text-justify">
                        Go beyond dashboards. TerraBot is your personal environmental analyst. Ask complex questions in plain language and get instant, data-driven answers and development suitability assessments.
                    </p>
                    <p className="mt-4 text-gray-400 text-justify">
                        It&apos;s designed to democratize data, making critical insights accessible to everyone from city planners to community stakeholders, fostering a more collaborative and informed decision-making process.
                    </p>
                </div>
            </div>
        </div>
        </section>

        {/* Standalone Full-Width Hero Section */}
        <section className="w-full relative h-[60vh] md:h-[70vh] flex items-center justify-center mt-20 text-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/hero.png"
              alt="Terra Hero Background"
              layout="fill"
              objectFit="cover"
              quality={80}
              className="brightness-50"
            />
          </div>
          <div className="relative z-10 max-w-4xl px-4">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              <i>Uncover</i> Urban Resilience
            </h2>
            <p className="text-lg md:text-xl text-gray-200 mb-10 leading-tight">
              Harness Earth observation data to predict environmental challenges and build a sustainable future for your city.
            </p>
            <div className="relative z-10 mt-8">
          <Link
            href="/dashboard"
            className="border-transparent px-8 py-3 bg-gray-100 hover:bg-[#d3d3d3] text-black transition-all duration-500 rounded-3xl hover:shadow-[0_0_30px_rgba(229,231,235,0.6)]"
          >
            <b>Explore Dashboard</b>
          </Link>
        </div>
          </div>
        </section>
      </main>

      <footer className="py-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-600">
          <p>
            Built using the WAQI, NASA&apos;s POWER Project & NASA&apos;s GIBS Earth observation data
          </p>
        </div>
      </footer>
    </div>
  );
}