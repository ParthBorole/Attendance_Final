/**
 * Calculates geodesic distance between two latitude/longitude points in meters
 * using the high-precision Haversine formula.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceMeters = R * c;
  return Math.round(distanceMeters * 10) / 10; // Round to 1 decimal place
}

/**
 * Validates whether the student's coordinates fall within the authorized radius.
 */
export function isWithinRadius(
  studentLat: number,
  studentLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): { isInside: boolean; distanceMeters: number } {
  const distanceMeters = calculateDistance(studentLat, studentLon, centerLat, centerLon);
  return {
    isInside: distanceMeters <= radiusMeters,
    distanceMeters,
  };
}
