// components/Globe.tsx
"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import createGlobe, { COBEOptions } from "cobe"
import { useMotionValue, useSpring } from "motion/react"
import { cn } from "@/lib/utils"

const MOVEMENT_DAMPING = 1400

const GLOBE_CONFIG: Partial<COBEOptions> = {
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [0, 0, 0],
  markerColor: [1, 1, 1],
  glowColor: [1, 1, 1],
  markers: [
    // Asia
    { location: [14.5995, 120.9842], size: 0.03 }, // Manila
    { location: [19.076, 72.8777], size: 0.1 }, // Mumbai
    { location: [23.8103, 90.4125], size: 0.05 }, // Dhaka
    { location: [30.0444, 31.2357], size: 0.07 }, // Cairo
    { location: [39.9042, 116.4074], size: 0.08 }, // Beijing
    { location: [34.6937, 135.5022], size: 0.05 }, // Osaka
    { location: [35.6762, 139.6503], size: 0.1 }, // Tokyo
    { location: [37.5665, 126.978], size: 0.08 }, // Seoul
    { location: [31.2304, 121.4737], size: 0.09 }, // Shanghai
    { location: [22.3193, 114.1694], size: 0.07 }, // Hong Kong
    { location: [25.0330, 121.5654], size: 0.06 }, // Taipei
    { location: [1.3521, 103.8198], size: 0.07 }, // Singapore
    { location: [13.7563, 100.5018], size: 0.08 }, // Bangkok
    { location: [3.139, 101.6869], size: 0.07 }, // Kuala Lumpur
    { location: [-6.2088, 106.8456], size: 0.09 }, // Jakarta
    { location: [28.7041, 77.1025], size: 0.1 }, // Delhi
    { location: [12.9716, 77.5946], size: 0.08 }, // Bangalore
    { location: [18.5204, 73.8567], size: 0.06 }, // Pune
    { location: [10.8231, 106.6297], size: 0.07 }, // Ho Chi Minh
    { location: [21.0285, 105.8542], size: 0.06 }, // Hanoi
    { location: [24.8607, 67.0011], size: 0.08 }, // Karachi
    { location: [41.0082, 28.9784], size: 0.06 }, // Istanbul
    { location: [39.9334, 32.8597], size: 0.05 }, // Ankara
    { location: [25.2048, 55.2708], size: 0.07 }, // Dubai
    { location: [29.3759, 47.9774], size: 0.05 }, // Kuwait City
    { location: [24.7136, 46.6753], size: 0.06 }, // Riyadh
    
    // Europe
    { location: [51.5074, -0.1278], size: 0.09 }, // London
    { location: [48.8566, 2.3522], size: 0.09 }, // Paris
    { location: [52.52, 13.405], size: 0.08 }, // Berlin
    { location: [41.9028, 12.4964], size: 0.07 }, // Rome
    { location: [40.4168, -3.7038], size: 0.08 }, // Madrid
    { location: [55.7558, 37.6173], size: 0.09 }, // Moscow
    { location: [59.9343, 30.3351], size: 0.06 }, // St. Petersburg
    { location: [50.1109, 8.6821], size: 0.06 }, // Frankfurt
    { location: [48.2082, 16.3738], size: 0.06 }, // Vienna
    { location: [52.3676, 4.9041], size: 0.07 }, // Amsterdam
    { location: [50.8503, 4.3517], size: 0.06 }, // Brussels
    { location: [47.3769, 8.5417], size: 0.05 }, // Zurich
    { location: [59.3293, 18.0686], size: 0.06 }, // Stockholm
    { location: [60.1699, 24.9384], size: 0.05 }, // Helsinki
    { location: [55.6761, 12.5683], size: 0.06 }, // Copenhagen
    { location: [53.3498, -6.2603], size: 0.06 }, // Dublin
    { location: [41.3851, 2.1734], size: 0.07 }, // Barcelona
    { location: [38.7223, -9.1393], size: 0.06 }, // Lisbon
    { location: [45.4642, 9.19], size: 0.06 }, // Milan
    { location: [50.0755, 14.4378], size: 0.06 }, // Prague
    { location: [47.4979, 19.0402], size: 0.06 }, // Budapest
    { location: [52.2297, 21.0122], size: 0.07 }, // Warsaw
    
    // North America
    { location: [40.7128, -74.006], size: 0.1 }, // New York
    { location: [34.0522, -118.2437], size: 0.09 }, // Los Angeles
    { location: [41.8781, -87.6298], size: 0.08 }, // Chicago
    { location: [29.7604, -95.3698], size: 0.07 }, // Houston
    { location: [33.4484, -112.074], size: 0.06 }, // Phoenix
    { location: [37.7749, -122.4194], size: 0.08 }, // San Francisco
    { location: [47.6062, -122.3321], size: 0.07 }, // Seattle
    { location: [25.7617, -80.1918], size: 0.07 }, // Miami
    { location: [42.3601, -71.0589], size: 0.07 }, // Boston
    { location: [38.9072, -77.0369], size: 0.07 }, // Washington DC
    { location: [43.651070, -79.347015], size: 0.08 }, // Toronto
    { location: [45.5017, -73.5673], size: 0.07 }, // Montreal
    { location: [49.2827, -123.1207], size: 0.07 }, // Vancouver
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: Partial<COBEOptions>
}) {
  const phiRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })

  const r = useMotionValue(0)
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  })

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      r.set(r.get() + delta / MOVEMENT_DAMPING)
    }
  }

  const createAndRunGlobe = useCallback(() => {
    if (!canvasRef.current || containerDimensions.width === 0 || containerDimensions.height === 0) {
      return
    }

    const { width: containerWidth, height: containerHeight } = containerDimensions
    const renderWidth = containerWidth * 2
    const renderHeight = containerHeight * 2

    const globe = createGlobe(canvasRef.current, {
      ...config,
      width: renderWidth,
      height: renderHeight,
      onRender: (state) => {
        if (!pointerInteracting.current) phiRef.current += 0.005
        state.phi = phiRef.current + rs.get()
      },
    } as COBEOptions)

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1"
      }
    }, 0)

    return () => {
      globe.destroy()
    }
  }, [containerDimensions, rs, config])

  useEffect(() => {
    let destroyGlobe: (() => void) | undefined
    if (containerDimensions.width > 0 && containerDimensions.height > 0) {
      destroyGlobe = createAndRunGlobe()
    }
    return () => {
      if (destroyGlobe) destroyGlobe()
    }
  }, [createAndRunGlobe, containerDimensions])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setContainerDimensions({ width, height })
      }
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 mx-auto w-full h-full",
        className
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX
          updatePointerInteraction(e.clientX)
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  )
}