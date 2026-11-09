import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { pinIcon, dotIcon, BAND_HEX } from '../../lib/mapPins.js'
import { PriorityScore } from '../ui/Pills.jsx'
import { Link } from 'react-router-dom'

/** Public issue map: one pin per grouped Issue, the badge is the merged report count. */
export function IssueMap({ issues = [], center = [18.5204, 73.8567], zoom = 12, height = 460, heat = false, onSelect }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {heat
          ? issues.map((issue) => (
              <Circle
                key={issue.id}
                center={[issue.lat, issue.lng]}
                radius={Math.min(900, 180 + (issue.reportCount || 1) * 120)}
                pathOptions={{
                  color: BAND_HEX[issue.priorityBand] || BAND_HEX.normal,
                  fillColor: BAND_HEX[issue.priorityBand] || BAND_HEX.normal,
                  fillOpacity: 0.16,
                  weight: 1,
                }}
              />
            ))
          : issues.map((issue) => (
              <Marker
                key={issue.id}
                position={[issue.lat, issue.lng]}
                icon={pinIcon({ band: issue.priorityBand, text: String(issue.reportCount || 1) })}
                eventHandlers={{ click: () => onSelect?.(issue) }}
              >
                <Popup>
                  <div className="min-w-[190px]">
                    <div className="mono text-[11px] tracking-wider text-ink-faint">{issue.code}</div>
                    <div className="mt-1 font-medium">{issue.category?.name || 'Issue'}</div>
                    <div className="mt-1 text-[12px] text-ink-soft">
                      {issue.department?.name} · {issue.ward?.name}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="pill border-line bg-paper-2 text-ink-soft">
                        {issue.reportCount} report{issue.reportCount > 1 ? 's' : ''}
                      </span>
                      <span className="pill border-line bg-paper-2 text-ink-soft">{issue.status}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>
    </div>
  )
}

export default IssueMap
