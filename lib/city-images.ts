// Maps session name keywords → Wikipedia article titles for city/country wallpapers
const CITY_MAP: Record<string, string> = {
  // Thailand
  'thailand':       'Thailand',
  'bangkok':        'Bangkok',
  'phuket':         'Phuket',
  'chiang mai':     'Chiang Mai',
  'pattaya':        'Pattaya',
  'krabi':          'Krabi Province',
  'koh samui':      'Ko Samui',

  // Indonesia
  'indonesia':      'Indonesia',
  'bali':           'Bali',
  'jakarta':        'Jakarta',
  'bandung':        'Bandung',
  'yogyakarta':     'Yogyakarta',
  'lombok':         'Lombok',

  // Philippines
  'philippines':    'Philippines',
  'manila':         'Manila',
  'boracay':        'Boracay',
  'cebu':           'Cebu City',
  'palawan':        'Palawan',

  // Malaysia
  'malaysia':       'Malaysia',
  'kuala lumpur':   'Kuala Lumpur',
  'kl ':            'Kuala Lumpur',
  'penang':         'Penang',
  'langkawi':       'Langkawi',
  'kota kinabalu':  'Kota Kinabalu',

  // Singapore
  'singapore':      'Singapore',

  // Vietnam
  'vietnam':        'Vietnam',
  'hanoi':          'Hanoi',
  'saigon':         'Ho Chi Minh City',
  'ho chi minh':    'Ho Chi Minh City',
  'da nang':        'Da Nang',
  'hoi an':         'Hội An',

  // Cambodia / Laos / Myanmar
  'cambodia':       'Cambodia',
  'siem reap':      'Siem Reap',
  'phnom penh':     'Phnom Penh',
  'laos':           'Laos',
  'myanmar':        'Myanmar',

  // Maldives
  'maldives':       'Maldives',

  // Taiwan
  'taiwan':         'Taiwan',
  'taipei':         'Taipei',

  // South Korea
  'korea':          'South Korea',
  'seoul':          'Seoul',
  'busan':          'Busan',
  'jeju':           'Jeju Island',

  // Japan
  'japan':          'Japan',
  'tokyo':          'Tokyo',
  'kyoto':          'Kyoto',
  'osaka':          'Osaka',
  'hiroshima':      'Hiroshima',
  'hokkaido':       'Hokkaido',

  // China
  'china':          'China',
  'beijing':        'Beijing',
  'shanghai':       'Shanghai',
  'hong kong':      'Hong Kong',
  'macau':          'Macau',
  'chengdu':        'Chengdu',

  // Australia / NZ
  'australia':      'Australia',
  'sydney':         'Sydney',
  'melbourne':      'Melbourne',
  'brisbane':       'Brisbane',
  'new zealand':    'New Zealand',
  'auckland':       'Auckland',

  // India / South Asia
  'india':          'India',
  'mumbai':         'Mumbai',
  'delhi':          'Delhi',
  'goa':            'Goa',
  'jaipur':         'Jaipur',
  'agra':           'Agra',
  'kolkata':        'Kolkata',
  'sri lanka':      'Sri Lanka',
  'colombo':        'Colombo',
  'nepal':          'Nepal',
  'kathmandu':      'Kathmandu',
  'pakistan':       'Pakistan',

  // Middle East
  'dubai':          'Dubai',
  'abu dhabi':      'Abu Dhabi',
  'qatar':          'Qatar',
  'doha':           'Doha',
  'israel':         'Israel',
  'jordan':         'Jordan',

  // Europe
  'europe':         'Europe',
  'paris':          'Paris',
  'france':         'France',
  'london':         'London',
  'uk':             'United Kingdom',
  'england':        'England',
  'scotland':       'Scotland',
  'ireland':        'Ireland',
  'amsterdam':      'Amsterdam',
  'netherlands':    'Netherlands',
  'barcelona':      'Barcelona',
  'madrid':         'Madrid',
  'spain':          'Spain',
  'rome':           'Rome',
  'italy':          'Italy',
  'milan':          'Milan',
  'venice':         'Venice',
  'florence':       'Florence',
  'berlin':         'Berlin',
  'germany':        'Germany',
  'munich':         'Munich',
  'prague':         'Prague',
  'czech':          'Czech Republic',
  'vienna':         'Vienna',
  'austria':        'Austria',
  'lisbon':         'Lisbon',
  'portugal':       'Portugal',
  'athens':         'Athens',
  'greece':         'Greece',
  'santorini':      'Santorini',
  'istanbul':       'Istanbul',
  'turkey':         'Turkey',
  'switzerland':    'Switzerland',
  'zurich':         'Zürich',
  'geneva':         'Geneva',
  'scandinavia':    'Scandinavia',
  'norway':         'Norway',
  'sweden':         'Sweden',
  'denmark':        'Denmark',
  'finland':        'Finland',
  'croatia':        'Croatia',
  'dubrovnik':      'Dubrovnik',
  'budapest':       'Budapest',
  'hungary':        'Hungary',
  'poland':         'Poland',

  // Africa
  'marrakech':      'Marrakesh',
  'morocco':        'Morocco',
  'cape town':      'Cape Town',
  'south africa':   'South Africa',
  'egypt':          'Egypt',
  'cairo':          'Cairo',
  'kenya':          'Kenya',

  // Americas
  'new york':       'New York City',
  'los angeles':    'Los Angeles',
  'las vegas':      'Las Vegas',
  'usa':            'United States',
  'america':        'United States',
  'chicago':        'Chicago',
  'miami':          'Miami',
  'hawaii':         'Hawaii',
  'toronto':        'Toronto',
  'vancouver':      'Vancouver',
  'canada':         'Canada',
  'mexico':         'Mexico',
  'mexico city':    'Mexico City',
  'cancun':         'Cancún',
  'brazil':         'Brazil',
  'rio':            'Rio de Janeiro',
  'buenos aires':   'Buenos Aires',
  'argentina':      'Argentina',
  'peru':           'Peru',
  'colombia':       'Colombia',
}

/** Returns the matched Wikipedia article title, or null if no city found. */
export function detectCity(sessionName: string): string | null {
  const lower = sessionName.toLowerCase()
  for (const [keyword, wikiTitle] of Object.entries(CITY_MAP)) {
    if (lower.includes(keyword)) return wikiTitle
  }
  return null
}

/** Fetches the main Wikipedia image for a city. Returns image URL or null. */
export async function fetchCityImage(city: string): Promise<string | null> {
  try {
    const url =
      `https://en.wikipedia.org/w/api.php?action=query` +
      `&titles=${encodeURIComponent(city)}` +
      `&prop=pageimages&format=json&pithumbsize=1200&origin=*`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const pages = json?.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0] as { thumbnail?: { source: string } }
    return page?.thumbnail?.source ?? null
  } catch {
    return null
  }
}
