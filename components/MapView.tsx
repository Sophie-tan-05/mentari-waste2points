'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export interface MapLocation {
  lat: number
  lon: number
  name: string
  address: string
  tag: string
}

interface MapViewProps {
  locations: MapLocation[]
  center: [number, number]
  zoom?: number
}

export default function MapView({ locations, center, zoom = 16 }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: false,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      locations.forEach((loc, i) => {
        const num = i + 1
        const icon = L.divIcon({
          html: `
            <div style="
              width:36px;height:36px;
              background:#2E7D32;
              border:3px solid white;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              box-shadow:0 3px 10px rgba(0,0,0,.35);
              display:flex;align-items:center;justify-content:center;
            ">
              <span style="
                transform:rotate(45deg);
                color:white;
                font-size:13px;
                font-weight:800;
                font-family:sans-serif;
                line-height:1;
              ">${num}</span>
            </div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -40],
        })

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`

        L.marker([loc.lat, loc.lon], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:200px;padding:2px 0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="
                  background:#2E7D32;color:white;
                  width:22px;height:22px;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;
                  font-size:12px;font-weight:800;flex-shrink:0;
                ">${num}</span>
                <p style="margin:0;font-weight:700;font-size:14px;color:#1B2E1C;line-height:1.3">${loc.name}</p>
              </div>
              <p style="margin:0 0 8px;font-size:12px;color:#5A7A5C;line-height:1.4">${loc.address}</p>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <span style="background:#E8F5E9;color:#2E7D32;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">${loc.tag}</span>
                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
                  style="font-size:11px;color:#2E7D32;font-weight:600;text-decoration:underline">
                  Directions →
                </a>
              </div>
            </div>
          `, { maxWidth: 260 })
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        // @ts-expect-error Leaflet map remove
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ height: '100%', width: '100%', isolation: 'isolate', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%', minHeight: '360px' }}
      />
    </div>
  )
}
