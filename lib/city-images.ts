// Maps session name keywords → Wikipedia article titles for city wallpapers
const CITY_MAP: Record<string, string> = {
  'bangkok':        'Bangkok',
  'phuket':         'Phuket',
  'chiang mai':     'Chiang Mai',
  'pattaya':        'Pattaya',
  'bali':           'Bali',
  'boracay':        'Boracay',
  'maldives':       'Maldives',
  'singapore':      'Singapore',
  'kuala lumpur':   'Kuala Lumpur',
  'kl ':            'Kuala Lumpur',
  'penang':         'Penang',
  'jakarta':        'Jakarta',
  'hanoi':          'Hanoi',
  'saigon':         'Ho Chi Minh City',
  'ho chi minh':    'Ho Chi Minh City',
  'taipei':         'Taipei',
  'seoul':          'Seoul',
  'tokyo':          'Tokyo',
  'kyoto':          'Kyoto',
  'osaka':          'Osaka',
  'hong kong':      'Hong Kong',
  'sydney':         'Sydney',
  'melbourne':      'Melbourne',
  'dubai':          'Dubai',
  'mumbai':         'Mumbai',
  'delhi':          'Delhi',
  'goa':            'Goa',
  'colombo':        'Colombo',
  'kathmandu':      'Kathmandu',
  'paris':          'Paris',
  'london':         'London',
  'amsterdam':      'Amsterdam',
  'barcelona':      'Barcelona',
  'rome':           'Rome',
  'berlin':         'Berlin',
  'prague':         'Prague',
  'vienna':         'Vienna',
  'lisbon':         'Lisbon',
  'athens':         'Athens',
  'istanbul':       'Istanbul',
  'marrakech':      'Marrakesh',
  'cape town':      'Cape Town',
  'new york':       'New York City',
  'los angeles':    'Los Angeles',
  'las vegas':      'Las Vegas',
  'toronto':        'Toronto',
  'vancouver':      'Vancouver',
  'mexico city':    'Mexico City',
  'rio':            'Rio de Janeiro',
  'buenos aires':   'Buenos Aires',
  'cairo':          'Cairo',
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
