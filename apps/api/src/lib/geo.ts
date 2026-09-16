/**
 * Location handling without a Google API key.
 *
 * Two jobs: pull coordinates out of a pasted Google Maps link, and fall back to
 * geocoding an address through OpenStreetMap's Nominatim. Neither needs a key,
 * a billing account, or a native map SDK.
 */

export interface Coords {
  latitude: number;
  longitude: number;
  source: "url" | "geocode";
  label?: string;
}

/**
 * Coordinates embedded in a Google Maps URL.
 *
 * Google uses several shapes and people paste all of them:
 *   /maps/@51.4545,-2.5879,15z            the map's centre
 *   /maps/place/X/@51.45,-2.58,17z/data=  centre plus a place
 *   !3d51.4545!4d-2.5879                  the PIN, inside the data blob
 *   ?q=51.4545,-2.5879                    an explicit query
 *
 * The !3d/!4d pair is preferred: on a /place/ link the @ coordinates are where
 * the camera sits, which can be a street away from the pin itself.
 */
export function coordsFromMapsUrl(url: string): Coords | null {
  const clean = url.trim();

  const pin = clean.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) return { latitude: Number(pin[1]), longitude: Number(pin[2]), source: "url" };

  const query = clean.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+)[,%C2%A0\s]+(-?\d+\.\d+)/);
  if (query) return { latitude: Number(query[1]), longitude: Number(query[2]), source: "url" };

  const at = clean.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]), source: "url" };

  return null;
}

const valid = (c: Coords | null) =>
  c && Math.abs(c.latitude) <= 90 && Math.abs(c.longitude) <= 180 ? c : null;

/**
 * Expands a shortened link (maps.app.goo.gl, goo.gl/maps) far enough to read
 * the coordinates out of the redirect target. Short links carry no coordinates
 * themselves, so without this a pasted share-link yields nothing.
 */
async function expandShortLink(url: string): Promise<string | null> {
  if (!/(?:maps\.app\.goo\.gl|goo\.gl\/maps)/.test(url)) return null;
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(6000) });
    return res.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Address to coordinates via Nominatim. Free and keyless, but the usage policy
 * requires identifying the application and limits callers to roughly one
 * request per second --- fine for creating a gym, never for a search-as-you-type.
 */
async function geocode(query: string): Promise<Coords | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: { "User-Agent": "Wellness2.0/1.0 (gym location lookup)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (!hit) return null;
    return { latitude: Number(hit.lat), longitude: Number(hit.lon), source: "geocode", label: hit.display_name };
  } catch {
    return null;
  }
}

/**
 * Best effort, cheapest first: read the link, expand it if short, and only then
 * fall back to geocoding the written address.
 */
export async function resolveLocation(input: {
  mapsUrl?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}): Promise<Coords | null> {
  if (input.mapsUrl) {
    const direct = valid(coordsFromMapsUrl(input.mapsUrl));
    if (direct) return direct;

    const expanded = await expandShortLink(input.mapsUrl);
    if (expanded) {
      const fromExpanded = valid(coordsFromMapsUrl(expanded));
      if (fromExpanded) return fromExpanded;
    }
  }

  const written = [input.address, input.city, input.country].filter(Boolean).join(", ");
  if (written.length > 3) return valid(await geocode(written));

  return null;
}
