export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/** Metres per degree of latitude — used to turn a km buffer into a bounding box. */
const M_PER_DEG_LAT = 110574;

export function expandBox(
  points: { lat: number; lon: number }[],
  bufferMeters: number
) {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const dLat = bufferMeters / M_PER_DEG_LAT;
  const dLon =
    bufferMeters / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));
  return {
    minLat: Math.min(...lats) - dLat,
    maxLat: Math.max(...lats) + dLat,
    minLon: Math.min(...lons) - dLon,
    maxLon: Math.max(...lons) + dLon,
  };
}
