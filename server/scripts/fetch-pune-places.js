// Explicit public-data download. OSM is community-maintained, not a PMC register.
import fs from 'node:fs/promises'
const query = '[out:json][timeout:60];nwr["amenity"~"^(school|hospital)$"](18.35,73.65,18.75,74.05);out center tags;'
const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(90000),
  headers: { 'User-Agent': 'CivicResolve-Educational-Data-Import/1.0' },
})
if (!response.ok) throw new Error(`OSM download failed: ${response.status}`)
const body = await response.json()
const places = body.elements.filter(e => e.tags?.name && Number.isFinite(e.lat ?? e.center?.lat)).map(e => ({
  id: `osm-${e.type}-${e.id}`, name: e.tags.name, kind: e.tags.amenity,
  lat: e.lat ?? e.center.lat, lng: e.lon ?? e.center.lon,
  sourceUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
}))
await fs.writeFile(new URL('../data/pune-places.json', import.meta.url), JSON.stringify({
  source: '© OpenStreetMap contributors', sourceUrl: 'https://www.openstreetmap.org/copyright',
  license: 'ODbL-1.0', downloadedAt: new Date().toISOString(), places,
}, null, 2))
console.log(`Downloaded ${places.length} named schools/hospitals (Pune bounding box; import clips to wards).`)
