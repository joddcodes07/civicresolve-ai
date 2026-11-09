import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { pinIcon } from '../../lib/mapPins.js'

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function Recenter({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

/** Draggable pin + click-to-place location picker. */
export function LocationPicker({ lat, lng, onChange, height = 260, tone = 'normal', zoom = 15 }) {
  const center = [lat, lng]
  return (
    <div className="overflow-hidden rounded-xl border border-line" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onPick={onChange} />
        <Recenter lat={lat} lng={lng} />
        <Marker
          position={center}
          icon={pinIcon({ band: tone })}
          draggable
          eventHandlers={{
            dragend(event) {
              const pos = event.target.getLatLng()
              onChange(pos.lat, pos.lng)
            },
          }}
        />
      </MapContainer>
    </div>
  )
}

export default LocationPicker
