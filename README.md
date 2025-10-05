# Terra - Climate & Environmental Monitoring Platform

A professional climate and environmental monitoring platform designed for government agencies and policy makers. Terra provides real-time environmental data visualization, risk assessment, and AI-powered analysis to support evidence-based decision making.

## Features

### 🌍 Interactive Map
- Click anywhere on the map to view location-specific environmental data
- Real-time temperature, air quality index (AQI), and flood risk metrics
- Water geometry visualization using OpenStreetMap data
- Temperature severity overlays with color-coded risk levels

### 📊 Real-Time Data
- **Temperature Data**: NASA POWER API providing historical and current temperature readings
- **Air Quality**: WAQI (World Air Quality Index) with real-time ground station data
- **Flood Risk**: Precipitation-based flood risk assessment using NASA POWER API
- **Pollutant Tracking**: PM2.5, PM10, O3, NO2, SO2, CO measurements

### 🤖 AI Climate Assistant
- Professional environmental analyst powered by Google Gemini AI
- Context-aware responses based on selected location data
- Conversation history with localStorage persistence
- Policy-focused insights for government decision-makers

### 📈 Data Visualization
- 7-day forecasts for temperature, AQI, and flood risk
- Color-coded severity indicators
- Distance-aware data accuracy (shows nearest monitoring station)
- Interactive 3D globe with major city markers

## Tech Stack

- **Framework**: Next.js 15 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Map**: React Leaflet
- **AI**: Google Gemini API (@google/genai)
- **3D Globe**: COBE
- **Data Sources**:
  - NASA POWER API
  - WAQI (World Air Quality Index)
  - OpenStreetMap Nominatim & Overpass API

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd terra
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Add your API keys to `.env.local`:
```env
# WAQI (World Air Quality Index) API Key
# Get your free API key at: https://aqicn.org/data-platform/token/
WAQI_API_KEY=your_waqi_api_key_here

# Gemini API Key (for chatbot)
# Get your free API key at: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

### API Keys

#### WAQI API Key
1. Visit [https://aqicn.org/data-platform/token/](https://aqicn.org/data-platform/token/)
2. Register for a free API token
3. Add to `.env.local` as `WAQI_API_KEY`

#### Gemini API Key
1. Visit [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env.local` as `GEMINI_API_KEY`

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Usage

### Viewing Location Data

1. Navigate to the Dashboard page
2. Click any location on the interactive map
3. View real-time environmental metrics in the data cards
4. Explore 7-day forecasts for each metric

### Using the AI Assistant

1. Click the chat icon in the bottom-right corner
2. Select a location on the map for context-aware responses
3. Ask questions about climate data, environmental risks, or policy recommendations
4. Use the trash icon to clear conversation history

### Understanding Risk Levels

- **Temperature**: Color-coded from blue (cold) to red (extreme heat)
- **AQI**: Good (0-50), Moderate (51-100), Unhealthy (101-150), Very Unhealthy (151-200), Hazardous (201+)
- **Flood Risk**: Low (<20%), Medium (20-40%), High (40-60%), Very High (60-80%), Extreme (80%+)

## Project Structure

```
terra/
├── app/
│   ├── api/
│   │   ├── chat/              # Gemini AI chatbot endpoint
│   │   └── predict/           # Environmental data APIs
│   │       ├── air-quality/
│   │       ├── temperature/
│   │       └── flood/
│   ├── dashboard/             # Main dashboard page
│   ├── about/                 # About page
│   └── insights/              # Insights page
├── components/
│   ├── Chatbot.tsx           # AI chat interface
│   ├── MapComponent.tsx      # Interactive map
│   └── Globe.tsx             # 3D globe visualization
└── public/                   # Static assets
```

## API Endpoints

### POST `/api/chat`
AI chatbot endpoint with conversation history support.

**Request:**
```json
{
  "message": "What are the climate risks?",
  "conversationHistory": [...],
  "locationData": {
    "name": "Jakarta",
    "lat": -6.2088,
    "lng": 106.8456,
    "temperature": 28,
    "airQuality": 95,
    "floodRisk": 35
  }
}
```

### POST `/api/predict/temperature`
Fetch temperature data and 7-day forecast.

**Request:**
```json
{
  "lat": -6.2088,
  "lng": 106.8456
}
```

### POST `/api/predict/air-quality`
Fetch real-time AQI and pollutant data.

### POST `/api/predict/flood`
Calculate flood risk based on precipitation data.

## Error Handling

All API routes throw errors when external services are unavailable instead of using fallback models, ensuring data accuracy and transparency.

## Contributing

This project was developed for NASA Space Apps Challenge 2024.

## License

[Add your license here]

## Acknowledgments

- **NASA POWER Project** - Climate data access
- **WAQI** - Real-time air quality data
- **OpenStreetMap** - Geocoding and map data
- **Google Gemini** - AI-powered assistant
- **Next.js Team** - Framework and tooling
