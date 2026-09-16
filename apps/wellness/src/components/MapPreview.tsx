import { Image, Linking, Platform, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

const TILE = 256;

/**
 * A map preview with no API key, no billing account and no native map SDK.
 *
 * OpenStreetMap serves raster tiles at /{z}/{x}/{y}.png, so a preview is just a
 * grid of images positioned around the tile containing the pin. react-native-maps
 * would need a Google key on Android and a native rebuild; a static image
 * service would need a key too. This needs neither and renders identically on
 * web, iOS and Android.
 *
 * OSM's tile policy requires attribution and rules out heavy automated use, so
 * this draws a handful of tiles for a single location and nothing more.
 */
function tileFor(lat: number, lon: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export function MapPreview({
  theme, latitude, longitude, label, height = 160, zoom = 15, mapsUrl,
}: {
  theme: Theme; latitude: number; longitude: number;
  label?: string; height?: number; zoom?: number; mapsUrl?: string | null;
}) {
  const { x, y } = tileFor(latitude, longitude, zoom);
  const centreX = Math.floor(x);
  const centreY = Math.floor(y);
  // Where the pin sits inside its own tile, so the marker is not stuck to a
  // tile corner.
  const offsetX = (x - centreX) * TILE;
  const offsetY = (y - centreY) * TILE;

  const open = () => {
    const url = mapsUrl
      ?? (Platform.OS === "ios"
        ? `maps://?ll=${latitude},${longitude}&q=${encodeURIComponent(label ?? "Gym")}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label ?? "Gym")})`);
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`),
    );
  };

  const cols = [-1, 0, 1];
  const rows = [-1, 0, 1];

  return (
    <Pressable onPress={open}>
      <View style={{ height, borderRadius: radius.md, overflow: "hidden", backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line }}>
        <View style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -offsetX - TILE * 1.5, marginTop: -offsetY - TILE * 1.5 }}>
          {rows.map((dy) => (
            <View key={dy} style={{ flexDirection: "row" }}>
              {cols.map((dx) => (
                <Image
                  key={dx}
                  source={{ uri: `https://tile.openstreetmap.org/${zoom}/${centreX + dx}/${centreY + dy}.png` }}
                  style={{ width: TILE, height: TILE }}
                />
              ))}
            </View>
          ))}
        </View>

        {/* The pin sits at the exact centre, which is where the coordinate is. */}
        <View style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -13, marginTop: -30 }}>
          <Feather name="map-pin" size={28} color={theme.accent} />
        </View>

        <View style={{ position: "absolute", right: 6, bottom: 4, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
          <Text style={{ fontSize: 9, color: "#333" }}>© OpenStreetMap</Text>
        </View>

        <View style={{ position: "absolute", left: 8, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.card, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Feather name="external-link" size={11} color={theme.accent} />
          <Text style={{ ...typo.caption, color: theme.accent, fontWeight: "600" }}>Open in maps</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Shown while a location has not been resolved, so the gap is explained. */
export function MapPlaceholder({ theme, message, height = 160 }: { theme: Theme; message: string; height?: number }) {
  return (
    <View style={{
      height, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
      backgroundColor: theme.cardAlt, alignItems: "center", justifyContent: "center", gap: 6, padding: space.lg,
    }}>
      <Feather name="map" size={22} color={theme.muted} />
      <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center" }}>{message}</Text>
    </View>
  );
}
