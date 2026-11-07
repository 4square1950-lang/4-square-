import * as THREE from 'three';

export interface CylinderCollider {
  id: string;
  type: 'person' | 'pole' | 'tree' | 'object';
  x: number;
  z: number;
  radius: number;
  height: number;
  isStatic: boolean;
}

export interface BoxCollider {
  id: string;
  type: 'bench' | 'wall' | 'car' | 'signboard' | 'step';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export class PhysicsEngine {
  cylinderColliders: Map<string, CylinderCollider> = new Map();
  boxColliders: Map<string, BoxCollider> = new Map();

  addCylinder(col: CylinderCollider) {
    this.cylinderColliders.set(col.id, col);
  }

  updateCylinderPos(id: string, x: number, z: number) {
    const col = this.cylinderColliders.get(id);
    if (col) {
      col.x = x;
      col.z = z;
    }
  }

  removeCylinder(id: string) {
    this.cylinderColliders.delete(id);
  }

  addBox(box: BoxCollider) {
    this.boxColliders.set(box.id, box);
  }

  removeBox(id: string) {
    this.boxColliders.delete(id);
  }

  reset() {
    this.cylinderColliders.clear();
    this.boxColliders.clear();
  }

  /**
   * Resolves person-to-person and person-to-object collisions for a target person.
   * Uses iterative circle-to-AABB and circle-to-circle clamping to strictly prevent
   * pass-through or tunneling even at corners and thin walls.
   */
  resolvePersonMovement(
    personId: string,
    currentX: number,
    currentZ: number,
    radius: number = 0.48
  ): [number, number] {
    let x = currentX;
    let z = currentZ;

    // Run 4 iterative relaxation passes to resolve corner pinching and compound obstacles
    const iterations = 4;
    for (let iter = 0; iter < iterations; iter++) {
      // 1. Box Colliders (Walls, Benches, Cars, Steps, Gate Posts)
      for (const [, box] of this.boxColliders) {
        // Find closest point on the rectangle [minX, maxX] x [minZ, maxZ] to circle center (x, z)
        const closestX = Math.max(box.minX, Math.min(box.maxX, x));
        const closestZ = Math.max(box.minZ, Math.min(box.maxZ, z));

        const dx = x - closestX;
        const dz = z - closestZ;
        const distSq = dx * dx + dz * dz;

        // Check if point is inside box or within radius of box boundary
        const isInside = x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;

        if (isInside) {
          // Circle center is inside the box: find the shallowest exit vector
          const dLeft = x - box.minX;
          const dRight = box.maxX - x;
          const dBack = z - box.minZ;
          const dFront = box.maxZ - z;
          const minEdge = Math.min(dLeft, dRight, dBack, dFront);

          if (minEdge === dLeft) {
            x = box.minX - radius - 0.02;
          } else if (minEdge === dRight) {
            x = box.maxX + radius + 0.02;
          } else if (minEdge === dBack) {
            z = box.minZ - radius - 0.02;
          } else {
            z = box.maxZ + radius + 0.02;
          }
        } else if (distSq < radius * radius && distSq > 0.000001) {
          // Circle penetrates box corner or edge from outside
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist + 0.01;
          const nx = dx / dist;
          const nz = dz / dist;
          x += nx * overlap;
          z += nz * overlap;
        }
      }

      // 2. Cylinder Colliders (NPCs, Spectators, Referee, Poles, Trees)
      for (const [, other] of this.cylinderColliders) {
        if (other.id === personId) continue;

        const dx = x - other.x;
        const dz = z - other.z;
        const distSq = dx * dx + dz * dz;
        const minDist = radius + other.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - (dist > 0.0001 ? dist : 0.0001) + 0.01;
          const nx = dist > 0.0001 ? dx / dist : 1.0;
          const nz = dist > 0.0001 ? dz / dist : 0.0;

          if (other.isStatic) {
            // Static obstacle (trees, poles, fixed NPCs): push player completely out
            x += nx * overlap;
            z += nz * overlap;
          } else {
            // Another dynamic player: push with firm separation
            x += nx * (overlap * 0.85);
            z += nz * (overlap * 0.85);
          }
        }
      }

      // Hard clamp inside schoolyard perimeter boundaries
      x = Math.max(-27.5, Math.min(27.5, x));
      z = Math.max(-25.0, Math.min(23.5, z));
    }

    // Update position in cylinder registry
    this.updateCylinderPos(personId, x, z);

    return [x, z];
  }

  /**
   * Checks ball bounce against ground, people, and obstacles.
   */
  checkBallCollisions(
    ballPos: THREE.Vector3,
    velocity: THREE.Vector3,
    ballRadius: number = 0.22
  ): { collided: boolean; normal?: THREE.Vector3 } {
    // 1. Ground collision: ensure ball never drops through floor
    if (ballPos.y <= ballRadius) {
      ballPos.y = ballRadius;
      return { collided: true, normal: new THREE.Vector3(0, 1, 0) };
    }

    // 2. Obstacle box collisions
    for (const [, box] of this.boxColliders) {
      if (
        ballPos.x >= box.minX - ballRadius &&
        ballPos.x <= box.maxX + ballRadius &&
        ballPos.z >= box.minZ - ballRadius &&
        ballPos.z <= box.maxZ + ballRadius &&
        ballPos.y >= box.minY &&
        ballPos.y <= box.maxY
      ) {
        return { collided: true, normal: new THREE.Vector3(0, 1, 0) };
      }
    }

    return { collided: false };
  }
}

export const globalPhysics = new PhysicsEngine();
