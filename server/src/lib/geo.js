// Geospatial helpers — great-circle distance and point-in-polygon, no PostGIS.

const EARTH_RADIUS_M = 6371000
const toRad = (deg) => (deg * Math.PI) / 180

/** Distance in metres between two lat/lng points (haversine). */
export function haversineMetres(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Ray-casting point-in-polygon. `polygon` is an array of [lng, lat] rings or a GeoJSON geometry. */
export function pointInPolygon(lat, lng, polygon) {
  if (polygon?.type === 'Feature') return pointInPolygon(lat, lng, polygon.geometry)
  if (polygon?.type === 'MultiPolygon') return polygon.coordinates.some(coordinates => pointInPolygon(lat, lng, { type: 'Polygon', coordinates }))
  const rings = normaliseRings(polygon)
  if (!rings || rings.length === 0) return false

  // Outer ring hit and no hole hit => inside.
  if (!ringContains(lng, lat, rings[0])) return false
  for (let i = 1; i < rings.length; i++) {
    if (ringContains(lng, lat, rings[i])) return false
  }
  return true
}

function normaliseRings(polygon) {
  if (!polygon) return null
  if (Array.isArray(polygon)) {
    // Could be a raw ring [[lng,lat],...] or an array of rings [[[...]]]
    if (polygon.length && Array.isArray(polygon[0]) && typeof polygon[0][0] === 'number') {
      return [polygon]
    }
    return polygon
  }
  if (polygon.type === 'Feature') return normaliseRings(polygon.geometry)
  if (polygon.type === 'Polygon') return polygon.coordinates
  if (polygon.type === 'MultiPolygon') return polygon.coordinates[0]
  return null
}

function ringContains(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Return the first ward whose boundary contains the point, else the nearest ward centre. */
export function resolveWard(lat, lng, wards = []) {
  if (!wards.length) return null
  for (const ward of wards) {
    if (ward.boundary && pointInPolygon(lat, lng, ward.boundary)) return ward
  }
  let nearest = null
  let best = Infinity
  for (const ward of wards) {
    const d = haversineMetres(lat, lng, ward.lat, ward.lng)
    if (d < best) {
      best = d
      nearest = ward
    }
  }
  return nearest
}

/** Convenience for the API: centroid of a polygon ring. */
export function centroid(polygon) {
  const rings = normaliseRings(polygon)
  if (!rings || !rings[0]) return null
  const ring = rings[0]
  let x = 0
  let y = 0
  for (const [lng, lat] of ring) {
    x += lng
    y += lat
  }
  return { lng: x / ring.length, lat: y / ring.length }
}
