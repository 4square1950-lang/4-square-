export interface Footprint {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

// Sweep a vehicle's footprint against the bounds of stationary blockers.
export function trafficTravel(from: Footprint, x: number, z: number, obstacles: Footprint[]) {
  let fraction = 1;
  for (const obstacle of obstacles) {
    const dx = x - from.x, dz = z - from.z;
    const alongX = from.x - obstacle.x, alongZ = from.z - obstacle.z;
    const width = from.halfX + obstacle.halfX + 0.12, length = from.halfZ + obstacle.halfZ + 0.12;
    if (Math.abs(alongX) < width && Math.abs(alongZ) < length) {
      if (Math.abs(alongX + dx) >= Math.abs(alongX) && Math.abs(alongZ + dz) >= Math.abs(alongZ)) continue;
      return 0;
    }
    const slab = (start: number, delta: number, span: number) => {
      if (!delta) return Math.abs(start) < span ? [-Infinity, Infinity] : [Infinity, -Infinity];
      const a = (-span - start) / delta, b = (span - start) / delta;
      return [Math.min(a, b), Math.max(a, b)];
    };
    const [nearX, farX] = slab(alongX, dx, width);
    const [nearZ, farZ] = slab(alongZ, dz, length);
    const entry = Math.max(nearX, nearZ);
    if (entry >= 0 && entry <= Math.min(farX, farZ, fraction)) fraction = Math.max(0, entry - 0.005);
  }
  return fraction;
}
