import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { pinIcon, issueColor } from '../../lib/mapPins.js'
import { useI18n } from '../../lib/i18n.jsx'

/** Public issue map: one pin per grouped Issue, the badge is the merged report count. */
export function IssueMap({ issues = [], center = [18.5204, 73.8567], zoom = 12, height = 460, heat = false, onSelect }) {
  const { t } = useI18n()
  return (
    <div className="overflow-hidden rounded-xl border border-line" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom preferCanvas style={{ height: '100%', width: '100%' }}>
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
                  color: issueColor(issue),
                  fillColor: issueColor(issue),
                  fillOpacity: issue.demo ? 0.09 : 0.16,
                  dashArray: issue.demo ? '4 4' : undefined,
                  weight: 1,
                }}
              />
            ))
          : issues.map((issue) => (
              <IssueMarker key={issue.id} issue={issue} onSelect={onSelect}>
                <Popup>
                  <div className="min-w-[190px]">
                    <div className="mono text-[11px] tracking-wider text-ink-faint">{issue.code}{issue.demo && ` · ${t('common.demo')}`}</div>
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
              </IssueMarker>
            ))}
      </MapContainer>
    </div>
  )
}

function IssueMarker({ issue, children, onSelect }) {
  const color = issueColor(issue)
  const position = [issue.lat, issue.lng]
  const eventHandlers = { click: () => onSelect?.(issue) }
  if (issue.demo) {
    return (
      <CircleMarker center={position} radius={5} pathOptions={{ color: '#fff', fillColor: color, weight: 1, fillOpacity: 0.85 }} eventHandlers={eventHandlers}>
        {children}
      </CircleMarker>
    )
  }
  return (
    <Marker position={position} icon={pinIcon({ color, text: String(issue.reportCount || 1) })} eventHandlers={eventHandlers}>
      {children}
    </Marker>
  )
}

export default IssueMap
