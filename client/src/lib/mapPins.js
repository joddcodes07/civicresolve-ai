import L from 'leaflet'

const BAND_COLOR = {
  urgent: '#d93a3f',
  high: '#f28c28',
  normal: '#2f5bea',
  low: '#4b4c54',
  verified: '#0f9b64',
}

/** A shaped map pin as an inline divIcon (avoids Leaflet's default asset issues). */
export function pinIcon({ band = 'normal', text = '', color, size = 30 }) {
  const fill = color || BAND_COLOR[band] || BAND_COLOR.normal
  const label = text ? `<span>${text}</span>` : ''
  const fontSize = String(text).length > 2 ? 9 : 11
  return L.divIcon({
    className: 'civic-pin',
    html: `<div class="map-pin" style="background:${fill};width:${size}px;height:${size}px;font-size:${fontSize}px">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

export const BAND_HEX = BAND_COLOR

export function issueColor(issue) {
  if (issue.status === 'RESOLVED' || issue.status === 'CONFIRMED') return BAND_COLOR.verified
  return BAND_COLOR[issue.priorityBand] || BAND_COLOR.normal
}

export function dotIcon({ color = '#2f5bea', size = 14, pulse = false }) {
  return L.divIcon({
    className: 'civic-dot',
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      ${pulse ? `<span class="animate-pulse-ring" style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.4"></span>` : ''}
      <span style="position:absolute;inset:0;border-radius:50%;background:${color};border:2px solid #fbfaf6;box-shadow:0 2px 6px rgba(19,20,25,.35)"></span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
