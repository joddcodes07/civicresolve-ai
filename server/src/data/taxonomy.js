// Master taxonomy for the city: departments, complaint categories (with the
// multilingual keyword lexicon that powers the local classifier) and wards.
//
// Keywords are intentionally written in English, Hindi, Marathi (Devanagari)
// and Hinglish/Marathi-Roman so citizens can describe a problem however they
// naturally type or speak. This single source of truth is used by both the
// seed script and the AI rules engine.

export const DEPARTMENTS = [
  { code: 'ROADS', name: 'Roads & Footpaths (PWD)', slaHours: 72, blurb: 'Potholes, footpaths, manholes, road repair' },
  { code: 'WATER', name: 'Water Supply', slaHours: 24, blurb: 'Supply, quality, pipelines, tankers' },
  { code: 'DRAINAGE', name: 'Drainage & Sewerage', slaHours: 48, blurb: 'Drains, sewers, overflow, choking' },
  { code: 'WASTE', name: 'Solid Waste Management', slaHours: 48, blurb: 'Garbage collection, dumps, bins' },
  { code: 'LIGHTING', name: 'Street Lighting (Electrical)', slaHours: 48, blurb: 'Streetlights, poles, wiring' },
  { code: 'HEALTH', name: 'Public Health & Sanitation', slaHours: 24, blurb: 'Toilets, mosquitoes, strays' },
  { code: 'PARKS', name: 'Parks & Gardens', slaHours: 168, blurb: 'Gardens, trees, playgrounds' },
  { code: 'TOWNPLAN', name: 'Town Planning & Encroachment', slaHours: 168, blurb: 'Encroachment, hoardings, zoning' },
  { code: 'BUILDING', name: 'Building Permissions', slaHours: 168, blurb: 'Unsafe structures, permissions' },
  { code: 'TRAFFIC', name: 'Traffic & Transport', slaHours: 48, blurb: 'Signals, parking, bus stops' },
  { code: 'FIRE', name: 'Fire & Emergency Services', slaHours: 12, blurb: 'Fire hazards, gas leaks, emergencies' },
  { code: 'EDUCATION', name: 'Education (Municipal Schools)', slaHours: 168, blurb: 'School buildings, facilities, meals' },
  { code: 'REVENUE', name: 'Revenue & Certificates', slaHours: 72, blurb: 'Property tax, certificates, records' },
  { code: 'OTHERS', name: 'General / Others', slaHours: 120, blurb: 'Anything that needs routing to a human' },
]

export const CATEGORIES = [
  // ---- Roads & Footpaths (PWD) ----
  {
    name: 'Potholes & Bad Roads',
    departmentCode: 'ROADS',
    defaultSeverity: 4,
    dupRadiusMetres: 50,
    keywords: [
      'pothole', 'potholes', 'pot hole', 'khadda', 'khaddha', 'gaddha', 'gadha', 'road broken',
      'broken road', 'road damage', 'damaged road', 'sadak kharab', 'sadak tuti', 'rasta kharab',
      'uneven road', 'bumpy road', 'craters', 'road repair', 'resurface', 'road sink', 'गड्ढा',
      'गड्ढे', 'खड्डा', 'खड्डे', 'सड़क खराब', 'सड़क टूटी', 'रस्ता खराब',
    ],
  },
  {
    name: 'Open / Missing Manhole',
    departmentCode: 'ROADS',
    defaultSeverity: 5,
    dupRadiusMetres: 50,
    keywords: [
      'open manhole', 'manhole cover', 'manhole missing', 'missing manhole', 'uncovered manhole',
      'manhole', 'chamber cover', 'gutter cover', 'चेंबर', 'गटार', 'मॅनहोल',
    ],
  },
  {
    name: 'Broken Footpath',
    departmentCode: 'ROADS',
    defaultSeverity: 3,
    dupRadiusMetres: 50,
    keywords: [
      'footpath', 'pavement', 'sidewalk', 'paver blocks', 'broken tiles', 'footpath broken',
      'footpath occupied', 'फुटपाथ', 'पदपथ', 'फूटपाथ',
    ],
  },
  {
    name: 'Road Cave-in / Sinkhole',
    departmentCode: 'ROADS',
    defaultSeverity: 5,
    dupRadiusMetres: 50,
    keywords: ['cave in', 'caved in', 'sinkhole', 'road sank', 'road collapsed', 'sadak dhas', 'धसान', 'रस्ता खचला'],
  },

  // ---- Water Supply ----
  {
    name: 'No Water Supply',
    departmentCode: 'WATER',
    defaultSeverity: 4,
    dupRadiusMetres: 150,
    keywords: [
      'no water', 'water supply', 'water not coming', 'paani nahi', 'pani nahi', 'water cut',
      'no water supply', 'water shortage', 'water tanker', 'पानी नहीं', 'पाणी नाही', 'पाणी येत नाही', 'टंकी',
    ],
  },
  {
    name: 'Contaminated Water',
    departmentCode: 'WATER',
    defaultSeverity: 5,
    dupRadiusMetres: 150,
    keywords: [
      'dirty water', 'contaminated water', 'muddy water', 'smelly water', 'brown water',
      'water polluted', 'ganda pani', 'gandapani', 'पानी गंदा', 'दूषित पाणी', 'घाणेरडे पाणी',
    ],
  },
  {
    name: 'Water Pipeline Leak',
    departmentCode: 'WATER',
    defaultSeverity: 3,
    dupRadiusMetres: 150,
    keywords: ['water leak', 'pipeline leak', 'pipe burst', 'water pipe', 'water wastage', 'leakage', 'पाइप', 'गळती', 'पाईप'],
  },

  // ---- Drainage & Sewerage ----
  {
    name: 'Blocked Drain',
    departmentCode: 'DRAINAGE',
    defaultSeverity: 4,
    dupRadiusMetres: 75,
    keywords: [
      'blocked drain', 'drain blocked', 'choked drain', 'gutter blocked', 'nala block', 'nali block',
      'nala choka', 'sewer blocked', 'drain overflow', 'nala', 'nali', 'naala', 'naali', 'drain',
      'choked', 'नाला', 'नाली', 'गटार तुंबले', 'तुंबलेला नाला',
    ],
  },
  {
    name: 'Overflowing Sewage',
    departmentCode: 'DRAINAGE',
    defaultSeverity: 5,
    dupRadiusMetres: 75,
    keywords: [
      'sewage overflow', 'sewer overflow', 'sewage', 'gutter overflow', 'manhole overflow',
      'gutter', 'सीवेज', 'गटार ओव्हरफ्लो', 'मलमूत्र', 'गंदा पानी बह रहा',
    ],
  },

  // ---- Solid Waste ----
  {
    name: 'Garbage Not Collected',
    departmentCode: 'WASTE',
    defaultSeverity: 3,
    dupRadiusMetres: 50,
    keywords: [
      'garbage', 'kachra', 'kachara', 'waste', 'trash', 'rubbish', 'dustbin', 'garbage not collected',
      'kachra nahi utha', 'sweeper', 'sweeping', 'कचरा', 'कचरा उचलला नाही', 'घाण',
    ],
  },
  {
    name: 'Garbage Burning / Illegal Dump',
    departmentCode: 'WASTE',
    defaultSeverity: 4,
    dupRadiusMetres: 50,
    keywords: ['garbage burning', 'burning garbage', 'kachra jalaya', 'illegal dump', 'dumping', 'kachra dump', 'कचरा जाळणे', 'कचरा जलाया'],
  },
  {
    name: 'Dead Animal',
    departmentCode: 'WASTE',
    defaultSeverity: 4,
    dupRadiusMetres: 50,
    keywords: ['dead animal', 'dead dog', 'dead cow', 'carcass', 'mare hue janwar', 'मृत प्राणी', 'मेलेला प्राणी'],
  },

  // ---- Street Lighting ----
  {
    name: 'Streetlight Not Working',
    departmentCode: 'LIGHTING',
    defaultSeverity: 3,
    dupRadiusMetres: 30,
    keywords: [
      'streetlight', 'street light', 'pole light', 'light not working', 'no light', 'dark street',
      'light kharab', 'स्ट्रीट लाइट', 'बत्ती', 'दिवा', 'रोषणाई', 'फोकस',
    ],
  },
  {
    name: 'Exposed / Sparking Wires',
    departmentCode: 'LIGHTING',
    defaultSeverity: 5,
    dupRadiusMetres: 30,
    keywords: [
      'sparking wire', 'exposed wire', 'loose wire', 'electric shock', 'live wire', 'short circuit',
      'current', 'शॉर्ट सर्किट', 'तार', 'वीज', 'चमकणारी तार',
    ],
  },

  // ---- Public Health & Sanitation ----
  {
    name: 'Public Toilet Issue',
    departmentCode: 'HEALTH',
    defaultSeverity: 3,
    dupRadiusMetres: 50,
    keywords: ['public toilet', 'toilet', 'urinal', 'sulabh', 'toilet dirty', 'no water in toilet', 'शौचालय', 'संडास', 'जनता शौचालय'],
  },
  {
    name: 'Mosquito Breeding / Stagnant Water',
    departmentCode: 'HEALTH',
    defaultSeverity: 4,
    dupRadiusMetres: 75,
    keywords: ['mosquito', 'dengue', 'malaria', 'stagnant water', 'mosquito breeding', 'डास', 'जमा पानी', 'साचलेले पाणी', 'मच्छर'],
  },
  {
    name: 'Stray Animals',
    departmentCode: 'HEALTH',
    defaultSeverity: 3,
    dupRadiusMetres: 75,
    keywords: ['stray dog', 'stray', 'stray dogs', 'pig', 'monkey', 'cattle', 'आवारा कुत्ते', 'भटके कुत्रे', 'श्वान'],
  },

  // ---- Parks & Gardens ----
  {
    name: 'Park Maintenance',
    departmentCode: 'PARKS',
    defaultSeverity: 2,
    dupRadiusMetres: 75,
    keywords: ['park', 'garden', 'playground', 'unkempt', 'broken bench', 'garden dirty', 'उद्यान', 'बगीचा', 'बाग'],
  },
  {
    name: 'Fallen / Dangerous Tree',
    departmentCode: 'PARKS',
    defaultSeverity: 5,
    dupRadiusMetres: 75,
    keywords: ['fallen tree', 'tree fallen', 'tree branch', 'dangerous tree', 'uprooted tree', 'tree cutting', 'पेड़', 'झाड', 'वृक्ष'],
  },

  // ---- Town Planning ----
  {
    name: 'Encroachment / Illegal Hoarding',
    departmentCode: 'TOWNPLAN',
    defaultSeverity: 3,
    dupRadiusMetres: 75,
    keywords: ['encroachment', 'illegal construction', 'hoarding', 'illegal banner', 'illegal shop', 'अतिक्रमण', 'बॅनर', 'फलक'],
  },

  // ---- Building Permissions ----
  {
    name: 'Dangerous / Illegal Structure',
    departmentCode: 'BUILDING',
    defaultSeverity: 5,
    dupRadiusMetres: 75,
    keywords: ['dangerous building', 'illegal building', 'structure collapse', 'dilapidated building', 'wall crack', 'जर्जर इमारत', 'धोकादायक इमारत'],
  },

  // ---- Traffic & Transport ----
  {
    name: 'Traffic Signal Not Working',
    departmentCode: 'TRAFFIC',
    defaultSeverity: 4,
    dupRadiusMetres: 50,
    keywords: ['traffic signal', 'signal not working', 'traffic light', 'signal kharab', 'zebra crossing', 'सिग्नल', 'वाहतूक सिग्नल'],
  },
  {
    name: 'Illegal Parking',
    departmentCode: 'TRAFFIC',
    defaultSeverity: 2,
    dupRadiusMetres: 50,
    keywords: ['illegal parking', 'parking', 'vehicle parked', 'no parking', 'पार्किंग', 'वाहन'],
  },

  // ---- Fire & Emergency ----
  {
    name: 'Fire Hazard',
    departmentCode: 'FIRE',
    defaultSeverity: 5,
    dupRadiusMetres: 75,
    keywords: ['fire', 'fire hazard', 'burning', 'smoke', 'fire emergency', 'gas leak', 'आग', 'आग लागली', 'धूर'],
  },

  // ---- Education ----
  {
    name: 'School Building / Facility Issue',
    departmentCode: 'EDUCATION',
    defaultSeverity: 3,
    dupRadiusMetres: 100,
    keywords: ['school', 'school building', 'classroom', 'school repair', 'mid day meal', 'शाळा', 'स्कूल', 'शाला'],
  },

  // ---- Revenue & Certificates ----
  {
    name: 'Certificate / Tax Delay',
    departmentCode: 'REVENUE',
    defaultSeverity: 3,
    dupRadiusMetres: 100,
    keywords: ['birth certificate', 'death certificate', 'property tax', 'khata', 'mutation', 'no dues', 'certificate delay', 'दाखला', 'प्रमाणपत्र', 'कर'],
  },

  // ---- Fallback ----
  {
    name: 'Other / General',
    departmentCode: 'OTHERS',
    defaultSeverity: 2,
    dupRadiusMetres: 50,
    keywords: ['other', 'general', 'complaint', 'issue', 'problem', 'इतर', 'अन्य'],
  },
]

// Words that raise severity when present, regardless of category.
export const SEVERITY_SIGNALS = {
  critical: [
    'open manhole', 'manhole missing', 'sparking', 'live wire', 'electric shock', 'fire',
    'collapse', 'collapsed', 'caved in', 'cave in', 'sinkhole', 'dengue', 'emergency', 'accident',
    'death', 'died', 'injury', 'gas leak', 'short circuit', 'आग', 'धोका', 'गंभीर', 'अपघात',
  ],
  high: [
    'overflow', 'overflowing', 'blocked', 'choked', 'broken', 'danger', 'dangerous', 'urgent',
    'contaminated', 'dirty water', 'stray dog', 'fallen tree', 'deep', 'large', 'खराब', 'तुंबले',
  ],
}

// Presence of any of these flags a safety risk (feeds +20 in the priority score).
export const SAFETY_SIGNALS = [
  'manhole', 'open manhole', 'sparking', 'live wire', 'electric', 'fire', 'collapse', 'caved',
  'child', 'children', 'school', 'hospital', 'accident', 'gas leak', 'danger', 'hazard',
  'stray dog', 'snake', 'deep', 'बच्चे', 'बच्चा', 'शाळा', 'धोका', 'आग',
]

// A small Indic gloss so the officer sees a rough English reading even with no
// LLM configured. Best-effort, deliberately honest (not a full translator).
export const GLOSS = {
  'पानी': 'water', 'पाणी': 'water', 'नहीं': 'not', 'नाही': 'not', 'नही': 'not',
  'सड़क': 'road', 'सडक': 'road', 'रस्ता': 'road', 'गड्ढा': 'pothole', 'गड्ढे': 'potholes',
  'खड्डा': 'pothole', 'खड्डे': 'potholes', 'टूटी': 'broken', 'खराब': 'bad/damaged',
  'नाला': 'drain', 'नाली': 'drain', 'गटार': 'gutter/drain', 'तुंबले': 'blocked',
  'तुंबलेला': 'blocked', 'कचरा': 'garbage', 'कचरा': 'garbage', 'उचलला': 'lifted',
  'बत्ती': 'light/lamp', 'दिवा': 'lamp', 'स्ट्रीट': 'street', 'लाइट': 'light',
  'शौचालय': 'toilet', 'संडास': 'toilet', 'पेड़': 'tree', 'झाड': 'tree',
  'गंदा': 'dirty', 'गंदे': 'dirty', 'बह': 'flowing', 'रहा': 'is', 'है': 'is',
  'आग': 'fire', 'धोका': 'danger', 'धूर': 'smoke', 'पाइप': 'pipe', 'गळती': 'leak',
  'प्रमाणपत्र': 'certificate', 'कर': 'tax', 'शाळा': 'school', 'स्कूल': 'school',
  'मच्छर': 'mosquito', 'डास': 'mosquito', 'अतिक्रमण': 'encroachment',
  'मध्ये': 'in', 'जवळ': 'near', 'पर': 'on', 'और': 'and', 'आणि': 'and',
}

// Demo city: Pune-like ward grid (18.5204 N, 73.8567 E) with simple polygons.
export const CITY = { name: 'Pune', lat: 18.5204, lng: 73.8567 }

export const WARDS = [
  { name: 'Ward 01 · Shivajinagar', lat: 18.5308, lng: 73.8478 },
  { name: 'Ward 02 · Kothrud', lat: 18.5074, lng: 73.8077 },
  { name: 'Ward 03 · Hadapsar', lat: 18.5089, lng: 73.9260 },
  { name: 'Ward 04 · Kharadi', lat: 18.5515, lng: 73.9434 },
  { name: 'Ward 05 · Baner', lat: 18.5590, lng: 73.7868 },
  { name: 'Ward 06 · Deccan', lat: 18.5140, lng: 73.8410 },
  { name: 'Ward 07 · Yerawada', lat: 18.5510, lng: 73.8830 },
  { name: 'Ward 08 · Katraj', lat: 18.4520, lng: 73.8570 },
  { name: 'Ward 09 · Pimpri', lat: 18.6279, lng: 73.8009 },
  { name: 'Ward 10 · Camp', lat: 18.5122, lng: 73.8790 },
  { name: 'Ward 11 · Aundh', lat: 18.5591, lng: 73.8077 },
  { name: 'Ward 12 · Wagholi', lat: 18.5800, lng: 73.9800 },
]

/** Build a square GeoJSON polygon around a ward centre (demo boundaries). */
export function wardBoundary(lat, lng, half = 0.012) {
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - half, lat - half],
      [lng + half, lat - half],
      [lng + half, lat + half],
      [lng - half, lat + half],
      [lng - half, lat - half],
    ]],
  }
}
