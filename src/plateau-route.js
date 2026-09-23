// Geographic guide through the railway corridor, not a surveyed track centreline.
// Station anchors: existing PLATEAU feature coordinates (Tokyo/Kanda), viewer origin (Akihabara).
// Intermediate points follow the user's annotated corridor; heights are illustrative.
export const routeAnchors = [
  { lon: 139.76725119307451, lat: 35.68132354731678, station: '東京' },
  { lon: 139.76775, lat: 35.6831 },
  { lon: 139.7684, lat: 35.6854 },
  { lon: 139.7690, lat: 35.6877 },
  { lon: 139.7701, lat: 35.6896 },
  { lon: 139.77079143628413, lat: 35.6914152608644, station: '神田' },
  { lon: 139.7715, lat: 35.6928 },
  { lon: 139.7722, lat: 35.6945 },
  { lon: 139.77305, lat: 35.6963 },
  { lon: 139.7731, lat: 35.6984, station: '秋葉原' },
];

// Distance-based interpolation avoids changes in speed at differently spaced anchors.
export function createDistanceRoute(points) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(
      points[i].x - points[i - 1].x, points[i].y - points[i - 1].y, points[i].z - points[i - 1].z));
  }
  const length = distances.at(-1);
  return {
    distances, length,
    sample(distance) {
      const d = Math.max(0, Math.min(length, distance));
      let i = 1;
      while (i < distances.length - 1 && distances[i] < d) i++;
      const a = points[i - 1], b = points[i];
      const t = (d - distances[i - 1]) / (distances[i] - distances[i - 1]);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    },
  };
}
