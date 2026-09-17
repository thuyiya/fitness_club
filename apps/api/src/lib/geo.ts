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
  /**
   * `exact` means the coordinate came from the link itself or matched the full
   * address. `approximate` means only a broader part matched --- usually the
   * town --- because the building is not in OpenStreetMap. The distinction has
   * to reach the UI: a pin silently dropped on the wrong street is worse than
   * one openly labelled as the town centre.
   */
  precision: "exact" | "approximate";
  label?: string;
  /** What actually matched, when that differs from what was asked for. */
  matched?: string;
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
  if (pin) return { latitude: Number(pin[1]), longitude: Number(pin[2]), source: "url", precision: "exact" };

  const query = clean.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+)[,%C2%A0\s]+(-?\d+\.\d+)/);
  if (query) return { latitude: Number(query[1]), longitude: Number(query[2]), source: "url", precision: "exact" };

  const at = clean.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]), source: "url", precision: "exact" };

  return null;
}

const valid = (c: Coords | null) =>
  c && Math.abs(c.latitude) <= 90 && Math.abs(c.longitude) <= 180 ? c : null;

/**
 * The place text a Maps URL carries in `q=` when it has no coordinates.
 *
 * A share link from the mobile app very often resolves to
 * `?q=Jail+Fitness,+Kadurugas+Junction,+Kurunegala` --- a NAME and address,
 * with the coordinates nowhere in the URL. Reading that text and geocoding it
 * is the only way such a link ever produces a pin.
 */
export function placeTextFromMapsUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    for (const key of ["q", "query", "destination"]) {
      const raw = parsed.searchParams.get(key);
      if (!raw) continue;
      // Skip it when it IS a coordinate pair --- that path is handled already.
      if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(raw.trim())) continue;
      const text = raw.replace(/\+/g, " ").trim();
      if (text.length > 2) return text;
    }
    // /maps/place/Some+Gym+Name/...
    const inPath = parsed.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (inPath?.[1]) {
      const text = decodeURIComponent(inPath[1]).replace(/\+/g, " ").trim();
      if (text.length > 2) return text;
    }
  } catch {
    // Not a parseable URL; nothing to read.
  }
  return null;
}

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
    return {
      latitude: Number(hit.lat), longitude: Number(hit.lon),
      source: "geocode", precision: "exact", label: hit.display_name, matched: query,
    };
  } catch {
    return null;
  }
}

/**
 * Geocode a place string, dropping leading components until something matches.
 *
 * Share links name a business first ("Jail Fitness, Kadurugas Junction,
 * Kurunegala"). Small businesses and minor junctions are frequently absent from
 * OpenStreetMap, but the town almost always exists --- so narrow to the most
 * specific thing that IS mapped, and say how specific that turned out to be.
 *
 * Only the full string counts as exact; anything reached by discarding detail
 * is reported as approximate.
 */
async function geocodeProgressively(place: string): Promise<Coords | null> {
  const parts = place.split(",").map((x) => x.trim()).filter(Boolean);

  for (let skip = 0; skip < parts.length; skip++) {
    const attempt = parts.slice(skip).join(", ");
    if (attempt.length < 3) continue;

    const hit = valid(await geocode(attempt));
    if (hit) {
      return {
        ...hit,
        precision: skip === 0 ? "exact" : "approximate",
        label: place,
        matched: attempt,
      };
    }
    // Nominatim asks for no more than one request a second.
    await new Promise((r) => setTimeout(r, 1100));
  }
  return null;
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

    // A short link carries nothing itself; follow it once and re-read.
    const expanded = (await expandShortLink(input.mapsUrl)) ?? input.mapsUrl;
    const fromExpanded = valid(coordsFromMapsUrl(expanded));
    if (fromExpanded) return fromExpanded;

    // Still nothing: the link names a PLACE rather than a point. Geocode the
    // name, which is what a share link from the mobile app usually gives.
    const place = placeTextFromMapsUrl(expanded);
    if (place) {
      const found = await geocodeProgressively(place);
      if (found) return found;
    }
  }

  const written = [input.address, input.city, input.country].filter(Boolean).join(", ");
  if (written.length > 3) return geocodeProgressively(written);

  return null;
}
