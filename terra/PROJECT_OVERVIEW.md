# Terra - Urban Planning Intelligence Platform

A Next.js web application that helps urban planners make data-driven decisions for sustainable and climate-resilient city growth using NASA Earth observation data.

## Features

### 🗺️ Interactive Map
- **Leaflet.js** powered interactive map
- Click anywhere on the map to view regional climate data
- Pre-loaded sample cities across the United States
- Color-coded markers indicating risk levels:
  - 🟢 Green: Low risk
  - 🟠 Orange: Moderate risk
  - 🔴 Red: High risk

### 📊 Real-time Data Insights
- **Temperature** monitoring and forecasts
- **Air Quality Index (AQI)** tracking
- **Flood Risk** assessment
- Color-coded risk indicators for easy interpretation

### 🤖 AI Prediction Endpoints (Placeholder)
Ready-to-integrate API endpoints for future AI models:
- `/api/predict/temperature` - Temperature forecasting
- `/api/predict/air-quality` - Air quality predictions
- `/api/predict/flood` - Flood risk assessment

## Tech Stack

- **Frontend Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet.js + React-Leaflet
- **Language**: TypeScript
- **Runtime**: Node.js

## Getting Started

### Installation

```bash
cd terra
npm install
```

### Running the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
terra/
├── app/
│   ├── api/
│   │   └── predict/
│   │       ├── temperature/
│   │       ├── air-quality/
│   │       └── flood/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── MapComponent.tsx
└── public/
```

## How to Use

1. **Explore the Map**:
   - The map loads centered on the United States
   - Pre-loaded cities are marked with colored circles

2. **View Region Data**:
   - Click on any marker or anywhere on the map
   - The right panel shows detailed climate data for that location

3. **Generate AI Predictions**:
   - After selecting a region, use the prediction buttons
   - The placeholder API returns mock forecasts (ready for your AI model integration)

## Integration with Real Data Sources

### NASA Earthdata
To integrate NASA Earth observation data:
1. Sign up for NASA Earthdata account: https://urs.earthdata.nasa.gov/
2. Obtain API credentials
3. Update the API endpoints to fetch real satellite data

### OpenWeatherMap
For real-time weather data:
1. Get API key from https://openweathermap.org/api
2. Add to environment variables: `OPENWEATHER_API_KEY`
3. Update temperature endpoint to use real data

## Next Steps for AI Model Integration

1. **Temperature Model**:
   - Replace mock data in `/api/predict/temperature/route.ts`
   - Integrate your ML model for temperature forecasting
   - Use NASA MODIS land surface temperature data

2. **Air Quality Model**:
   - Update `/api/predict/air-quality/route.ts`
   - Connect to NASA AIRS or OMI satellite data
   - Implement prediction algorithms

3. **Flood Risk Model**:
   - Modify `/api/predict/flood/route.ts`
   - Utilize NASA GPM precipitation data
   - Incorporate elevation and terrain analysis

## Deployment Options

### Vercel (Recommended for Next.js)
```bash
npm install -g vercel
vercel
```

### Railway
1. Connect your GitHub repository
2. Deploy with auto-detected Next.js configuration

### Render
1. Create new Web Service
2. Connect repository
3. Build command: `npm run build`
4. Start command: `npm start`

## Environment Variables

Create a `.env.local` file for API keys:

```env
NEXT_PUBLIC_NASA_API_KEY=your_nasa_key
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
```

## Sample Cities Included

The app includes sample data for these cities:
- New York, Los Angeles, Chicago
- Houston, Phoenix, Miami
- Seattle, Boston, Denver, Atlanta

## Contributing

This is a hackathon project demonstrating the potential of NASA Earth data for urban planning. Feel free to extend it with:
- More data sources
- Advanced AI models
- Additional climate indicators
- Historical trend analysis
- Comparative city analysis

## License

MIT License - feel free to use this for your urban planning projects!

---

Built for sustainable and climate-resilient cities 🌍
