// Pure 2D Analytical Arcade Physics Engine mapped onto the 3D (X, Z) Rink Plane
// Zero WASM dependencies — 100% compatible with Web, React Native (Expo), and Node/Rust servers.

import { useStore, gameRefs } from "./store";
import { STRIKER_CATALOG } from "./data/catalogs";

const SUBSTEPS = 8;

// Exact inner rink dimensions extracted from /public/air-hockey.glb
const RINK_CENTER_X = 0.02;
const RINK_HALF_W = 2.99; // Straight side walls at |x - 0.02| = 2.99
const RINK_HALF_L = 4.41; // Straight end walls at |z| = 4.41
const CORNER_START_X = 1.956; // Where side wall begins curving
const CORNER_START_Z = 2.875; // Where end wall begins curving
const CORNER_RX = RINK_HALF_W - CORNER_START_X; // 1.034
const CORNER_RZ = RINK_HALF_L - CORNER_START_Z; // 1.535

// Goal cage geometry (two indoor ice-hockey cages at z = ±3.18..±3.61, widened 1.35x for arcade scoring)
const GOAL_HALF_W = 0.84;
const GOAL_FRONT_Z = 3.18;
const GOAL_BACK_Z = 3.61;
const POST_RADIUS = 0.035;

export class Body2D {
  constructor({
    name = "",
    type = "dynamic",
    x = 0,
    y = 0.05,
    z = 0,
    radius = 0.25,
    restitution = 0.88,
    damping = 0.05,
    onCollision = null,
  }) {
    this.name = name;
    this.type = type;
    this.x = x;
    this.y = y;
    this.z = z;
    this.nextX = x;
    this.nextY = y;
    this.nextZ = z;
    this.vx = 0;
    this.vz = 0;
    this.radius = radius;
    this.restitution = restitution;
    this.damping = damping;
    this.onCollision = onCollision;
    this.lastCollisionTime = 0;
    this.lastBoostTime = 0;
  }

  translation() {
    return { x: this.x, y: this.y, z: this.z };
  }

  linvel() {
    return { x: this.vx, y: 0, z: this.vz };
  }

  setTranslation({ x, y, z }) {
    this.x = x;
    if (y !== undefined) this.y = y;
    this.z = z;
    this.nextX = x;
    this.nextZ = z;
  }

  setLinvel({ x, z }) {
    this.vx = x;
    this.vz = z;
  }

  setAngvel() {}

  setNextKinematicTranslation({ x, y, z }) {
    this.nextX = x;
    if (y !== undefined) this.nextY = y;
    this.nextZ = z;
  }
}

class PhysicsWorld2D {
  constructor() {
    this.pucks = new Set();
    this.pushers = new Map();
    this.onGoalCallback = null; // (goalOwnerName, speedKmh) => void
    this.onBonusCollectCallback = null; // (collectorBodyName) => void
    this.onRocketFireCallback = null; // (shooterName, x, z) => void
    this.onWallBounceCallback = null; // (puck) => void
  }

  addPuck(body) {
    this.pucks.add(body);
  }

  removePuck(body) {
    this.pucks.delete(body);
  }

  setPusher(name, body) {
    this.pushers.set(name, body);
  }

  removePusher(name) {
    this.pushers.delete(name);
  }

  // Push a kinematic pusher out of a solid line segment (e.g., goal frame)
  clampCircleOutsideSegment(body, x1, z1, x2, z2, thickness = POST_RADIUS) {
    const abx = x2 - x1;
    const abz = z2 - z1;
    const apx = body.x - x1;
    const apz = body.z - z1;
    const abLenSq = abx * abx + abz * abz;
    const t =
      abLenSq > 0.00001
        ? Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq))
        : 0;

    const closestX = x1 + t * abx;
    const closestZ = z1 + t * abz;
    const dx = body.x - closestX;
    const dz = body.z - closestZ;
    const dist = Math.hypot(dx, dz);
    const minDist = body.radius + thickness;

    if (dist < minDist) {
      const nx = dist > 0.0001 ? dx / dist : 0;
      const nz = dist > 0.0001 ? dz / dist : body.z < 0 ? 1 : -1;
      body.x = closestX + nx * minDist;
      body.z = closestZ + nz * minDist;
    }
  }

  // Prevent pushers from clipping through goal cages or rounded corners
  constrainPusher(pusher) {
    // 1. Block pusher from entering the Goal Cage box (both front, back, and sides)
    const signZ = pusher.z >= 0 ? 1 : -1;
    const frontZ = signZ * GOAL_FRONT_Z;
    const backZ = signZ * GOAL_BACK_Z;

    // Front bar of the goal (prevent pusher from going inside the net)
    this.clampCircleOutsideSegment(
      pusher,
      -GOAL_HALF_W,
      frontZ,
      GOAL_HALF_W,
      frontZ,
      POST_RADIUS
    );
    // Left side of goal cage
    this.clampCircleOutsideSegment(
      pusher,
      -GOAL_HALF_W,
      frontZ,
      -GOAL_HALF_W,
      backZ,
      POST_RADIUS
    );
    // Right side of goal cage
    this.clampCircleOutsideSegment(
      pusher,
      GOAL_HALF_W,
      frontZ,
      GOAL_HALF_W,
      backZ,
      POST_RADIUS
    );
    // Back of goal cage
    this.clampCircleOutsideSegment(
      pusher,
      -GOAL_HALF_W,
      backZ,
      GOAL_HALF_W,
      backZ,
      POST_RADIUS
    );

    // 2. Keep pusher inside rounded rink corners
    const r = pusher.radius;
    const relX = pusher.x - RINK_CENTER_X;
    const absX = Math.abs(relX);
    const absZ = Math.abs(pusher.z);
    if (absX > CORNER_START_X && absZ > CORNER_START_Z) {
      const sx = Math.sign(relX) || 1;
      const sz = Math.sign(pusher.z) || 1;
      const dx = absX - CORNER_START_X;
      const dz = absZ - CORNER_START_Z;
      const effRx = Math.max(0.1, CORNER_RX - r);
      const effRz = Math.max(0.1, CORNER_RZ - r);
      const normDist = Math.hypot(dx / effRx, dz / effRz);
      if (normDist > 1.0) {
        pusher.x = RINK_CENTER_X + sx * (CORNER_START_X + dx / normDist);
        pusher.z = sz * (CORNER_START_Z + dz / normDist);
      }
    }
  }

  // Resolve collision between a circle (puck) and a line segment (goal frame / ice shield)
  resolveSegment(puck, x1, z1, x2, z2, thickness = POST_RADIUS, bounce = 0.85) {
    const abx = x2 - x1;
    const abz = z2 - z1;
    const apx = puck.x - x1;
    const apz = puck.z - z1;
    const abLenSq = abx * abx + abz * abz;
    const t =
      abLenSq > 0.00001
        ? Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq))
        : 0;

    const closestX = x1 + t * abx;
    const closestZ = z1 + t * abz;
    const dx = puck.x - closestX;
    const dz = puck.z - closestZ;
    const dist = Math.hypot(dx, dz);
    const minDist = puck.radius + thickness;

    if (dist < minDist && dist > 0.00001) {
      const nx = dx / dist;
      const nz = dz / dist;
      puck.x = closestX + nx * (minDist + 0.001);
      puck.z = closestZ + nz * (minDist + 0.001);

      const vn = puck.vx * nx + puck.vz * nz;
      if (vn < 0) {
        puck.vx -= (1 + bounce) * vn * nx;
        puck.vz -= (1 + bounce) * vn * nz;
        this.notifyHit(puck, "wall");
      }
    }
  }

  // Resolve collision with the stadium rink walls and smooth elliptical corners
  resolveRinkWalls(puck) {
    const r = puck.radius;
    const relX = puck.x - RINK_CENTER_X;
    const absX = Math.abs(relX);
    const absZ = Math.abs(puck.z);

    if (absZ <= CORNER_START_Z) {
      const maxX = RINK_HALF_W - r;
      if (absX > maxX) {
        const signX = Math.sign(relX) || 1;
        puck.x = RINK_CENTER_X + signX * maxX;
        if (puck.vx * signX > 0) {
          puck.vx = -puck.vx * puck.restitution;
          this.notifyHit(puck, "wall");
        }
      }
      return;
    }

    if (absX <= CORNER_START_X) {
      const maxZ = RINK_HALF_L - r;
      if (absZ > maxZ) {
        const signZ = Math.sign(puck.z) || 1;
        puck.z = signZ * maxZ;
        if (puck.vz * signZ > 0) {
          puck.vz = -puck.vz * puck.restitution;
          this.notifyHit(puck, "wall");
        }
      }
      return;
    }

    const signX = Math.sign(relX) || 1;
    const signZ = Math.sign(puck.z) || 1;
    const dx = absX - CORNER_START_X;
    const dz = absZ - CORNER_START_Z;

    const effRx = Math.max(0.1, CORNER_RX - r);
    const effRz = Math.max(0.1, CORNER_RZ - r);

    const normDist = Math.hypot(dx / effRx, dz / effRz);
    if (normDist > 1.0) {
      const clampedDx = dx / normDist;
      const clampedDz = dz / normDist;
      puck.x = RINK_CENTER_X + signX * (CORNER_START_X + clampedDx);
      puck.z = signZ * (CORNER_START_Z + clampedDz);

      let nx = (signX * clampedDx) / (effRx * effRx);
      let nz = (signZ * clampedDz) / (effRz * effRz);
      const nLen = Math.hypot(nx, nz) || 1;
      nx /= nLen;
      nz /= nLen;

      const vn = puck.vx * nx + puck.vz * nz;
      if (vn > 0) {
        puck.vx -= (1 + puck.restitution) * vn * nx;
        puck.vz -= (1 + puck.restitution) * vn * nz;
        this.notifyHit(puck, "wall");
      }
    }
  }

  notifyHit(puck, otherName) {
    if (otherName === "wall" && this.onWallBounceCallback) {
      this.onWallBounceCallback(puck);
    }
    if (!puck.onCollision) return;
    const now = performance.now();
    if (otherName === "wall" && now - puck.lastCollisionTime < 45) return;
    puck.lastCollisionTime = now;
    puck.onCollision({
      other: { rigidBodyObject: { name: otherName } },
    });
  }

  step(delta) {
    const state = useStore.getState();
    if (state.isPaused) return;
    const dt = Math.min(delta, 0.05) * (gameRefs.timeScale || 1.0);
    if (dt <= 0) return;
    if (performance.now() < (gameRefs.hitStopUntil || 0)) return;

    let p1RocketArmed = state.playerOneRocketArmed;
    let p2RocketArmed = state.playerTwoRocketArmed;

    const subDt = dt / SUBSTEPS;

    // Pre-constrain target positions of pushers so they can't enter goals
    this.pushers.forEach((pusher) => {
      const tempBody = {
        x: pusher.nextX,
        z: pusher.nextZ,
        radius: pusher.radius,
      };
      this.constrainPusher(tempBody);
      pusher.nextX = tempBody.x;
      pusher.nextZ = tempBody.z;

      pusher.vx = (pusher.nextX - pusher.x) / dt;
      pusher.vz = (pusher.nextZ - pusher.z) / dt;
      pusher.y = pusher.nextY;
    });

    const pucksArray = Array.from(this.pucks);

    for (let s = 0; s < SUBSTEPS; s++) {
      // 1. Advance kinematic pushers by 1 substep
      this.pushers.forEach((pusher) => {
        pusher.x += pusher.vx * subDt;
        pusher.z += pusher.vz * subDt;
        this.constrainPusher(pusher);

        if (gameRefs.bonusPos.active && this.onBonusCollectCallback) {
          const bDist = Math.hypot(
            pusher.x - gameRefs.bonusPos.x,
            pusher.z - gameRefs.bonusPos.z
          );
          if (bDist < pusher.radius + 0.34) {
            this.onBonusCollectCallback(pusher.name);
          }
        }
      });

      // 2. Advance dynamic pucks & resolve collisions
      for (let i = 0; i < pucksArray.length; i++) {
        const puck = pucksArray[i];

        if (gameRefs.rocketFlight && Math.abs(gameRefs.curveSpin) > 0.01) {
          puck.vx += gameRefs.curveSpin * subDt;
        }

        const dampFactor = Math.max(0, 1 - puck.damping * subDt);
        puck.vx *= dampFactor;
        puck.vz *= dampFactor;

        puck.x += puck.vx * subDt;
        puck.z += puck.vz * subDt;

        // A. Rink walls & rounded corners
        this.resolveRinkWalls(puck);

        // B. Goal cages (left side, right side, back wall)
        this.resolveSegment(
          puck,
          -GOAL_HALF_W,
          GOAL_FRONT_Z,
          -GOAL_HALF_W,
          GOAL_BACK_Z
        );
        this.resolveSegment(
          puck,
          GOAL_HALF_W,
          GOAL_FRONT_Z,
          GOAL_HALF_W,
          GOAL_BACK_Z
        );
        this.resolveSegment(
          puck,
          -GOAL_HALF_W,
          GOAL_BACK_Z,
          GOAL_HALF_W,
          GOAL_BACK_Z,
          POST_RADIUS,
          0.3
        );

        this.resolveSegment(
          puck,
          -GOAL_HALF_W,
          -GOAL_FRONT_Z,
          -GOAL_HALF_W,
          -GOAL_BACK_Z
        );
        this.resolveSegment(
          puck,
          GOAL_HALF_W,
          -GOAL_FRONT_Z,
          GOAL_HALF_W,
          -GOAL_BACK_Z
        );
        this.resolveSegment(
          puck,
          -GOAL_HALF_W,
          -GOAL_BACK_Z,
          GOAL_HALF_W,
          -GOAL_BACK_Z,
          POST_RADIUS,
          0.3
        );

        // C. Active Ice Wall Shields
        if (state.playerOneShield) {
          this.resolveSegment(puck, -0.94, -2.9, 0.94, -2.9, 0.09, 0.95);
        }
        if (state.playerTwoShield) {
          this.resolveSegment(puck, -0.94, 2.9, 0.94, 2.9, 0.09, 0.95);
        }

        // D. Pusher <-> Puck collisions
        this.pushers.forEach((pusher) => {
          const dx = puck.x - pusher.x;
          const dz = puck.z - pusher.z;
          const dist = Math.hypot(dx, dz);
          const minDist = puck.radius + pusher.radius;

          if (dist < minDist && dist > 0.00001) {
            const nx = dx / dist;
            const nz = dz / dist;

            puck.x = pusher.x + nx * (minDist + 0.002);
            puck.z = pusher.z + nz * (minDist + 0.002);

            const isP1 = pusher.name === "pusherOne";
            const isP2 = pusher.name === "pusherTwo";

            if ((isP1 && p1RocketArmed) || (isP2 && p2RocketArmed)) {
              const superType =
                (isP1 ? gameRefs.p1SuperType : gameRefs.p2SuperType) ||
                (isP1 ? state.playerOneStriker : state.playerTwoStriker) ||
                "blaze";

              if (isP1) {
                p1RocketArmed = false;
                gameRefs.p1SuperType = null;
                state.setPlayerRocketArmed("playerOne", false);
              } else {
                p2RocketArmed = false;
                gameRefs.p2SuperType = null;
                state.setPlayerRocketArmed("playerTwo", false);
              }

              const goalZ = isP1 ? 3.45 : -3.45;
              let targetX = 0;
              let targetZ = goalZ;
              let superSpeed = 21.5;
              gameRefs.curveSpin = 0;

              if (superType === "volt") {
                targetX = puck.x >= 0 ? -2.85 : 2.85;
                targetZ = isP1 ? 1.55 : -1.55;
                superSpeed = 20.5;
              } else if (superType === "frost") {
                superSpeed = 19.2;
              } else if (superType === "venom") {
                targetX = puck.x >= 0 ? -0.55 : 0.55;
                superSpeed = 19.0;
                gameRefs.curveSpin = puck.x >= 0 ? 18.0 : -18.0;
              }

              const rdx = targetX - puck.x;
              const rdz = targetZ - puck.z;
              const rLen = Math.hypot(rdx, rdz) || 1;

              puck.vx = (rdx / rLen) * superSpeed;
              puck.vz = (rdz / rLen) * superSpeed;
              gameRefs.rocketFlight = true;
              gameRefs.hitStopUntil = performance.now() + 65;

              if (this.onRocketFireCallback) {
                this.onRocketFireCallback(pusher.name, puck.x, puck.z, superType);
              }
              this.notifyHit(puck, pusher.name);
              return;
            }

            const relVx = puck.vx - pusher.vx;
            const relVz = puck.vz - pusher.vz;
            const vn = relVx * nx + relVz * nz;

            const strikerId = isP1 ? state.playerOneStriker : state.playerTwoStriker;
            const pwrStat = STRIKER_CATALOG[strikerId]?.stats?.pwr || 3;
            const pwrFactor = 0.94 + pwrStat * 0.03;

            if (vn < 0) {
              const bounce = 0.9;
              puck.vx -= (1 + bounce) * vn * pwrFactor * nx;
              puck.vz -= (1 + bounce) * vn * pwrFactor * nz;
              puck.vx += pusher.vx * 0.25;
              puck.vz += pusher.vz * 0.25;
            } else {
              const pushSpeed = Math.max(
                3.6,
                (pusher.vx * nx + pusher.vz * nz) * 1.2 * pwrFactor
              );
              puck.vx = nx * pushSpeed;
              puck.vz = nz * pushSpeed;
            }

            const postSpeed = Math.hypot(puck.vx, puck.vz);
            if (postSpeed > 10.5) {
              gameRefs.hitStopUntil = performance.now() + 35;
            }

            this.notifyHit(puck, pusher.name);
          }
        });

        // F. Check Bonus Box sensor intersection
        if (gameRefs.bonusPos.active && this.onBonusCollectCallback) {
          const bDist = Math.hypot(
            puck.x - gameRefs.bonusPos.x,
            puck.z - gameRefs.bonusPos.z
          );
          if (bDist < puck.radius + 0.34) {
            this.onBonusCollectCallback("palet");
          }
        }

        // G. Check Goal Scored sensor
        if (
          this.onGoalCallback &&
          state.startGame &&
          !state.endGame &&
          !state.reinit &&
          !state.isGoalSlowMo
        ) {
          if (
            Math.abs(puck.x) < GOAL_HALF_W - 0.08 &&
            puck.z > GOAL_FRONT_Z &&
            puck.z < GOAL_BACK_Z + 0.05
          ) {
            const speed = Math.hypot(puck.vx, puck.vz);
            const speedKmh = Math.min(
              185,
              Math.max(58, Math.round(48 + speed * 8.2))
            );
            this.onGoalCallback("playerOne", speedKmh);
          } else if (
            Math.abs(puck.x) < GOAL_HALF_W - 0.08 &&
            puck.z < -GOAL_FRONT_Z &&
            puck.z > -GOAL_BACK_Z - 0.05
          ) {
            const speed = Math.hypot(puck.vx, puck.vz);
            const speedKmh = Math.min(
              185,
              Math.max(58, Math.round(48 + speed * 8.2))
            );
            this.onGoalCallback("playerTwo", speedKmh);
          }
        }
      }

      // 3. Puck <-> Puck collisions (Multi-Puck mode)
      for (let i = 0; i < pucksArray.length; i++) {
        for (let j = i + 1; j < pucksArray.length; j++) {
          const p1 = pucksArray[i];
          const p2 = pucksArray[j];
          const dx = p2.x - p1.x;
          const dz = p2.z - p1.z;
          const dist = Math.hypot(dx, dz);
          const minDist = p1.radius + p2.radius;

          if (dist < minDist && dist > 0.00001) {
            const nx = dx / dist;
            const nz = dz / dist;
            const overlap = (minDist - dist) * 0.5;

            p1.x -= nx * overlap;
            p1.z -= nz * overlap;
            p2.x += nx * overlap;
            p2.z += nz * overlap;

            const kx = p1.vx - p2.vx;
            const kz = p1.vz - p2.vz;
            const p = kx * nx + kz * nz;

            if (p > 0) {
              const bounce = 0.9;
              p1.vx -= p * bounce * nx;
              p1.vz -= p * bounce * nz;
              p2.vx += p * bounce * nx;
              p2.vz += p * bounce * nz;
              this.notifyHit(p1, "palet");
            }
          }
        }
      }
    }
  }
}

export const physicsWorld = new PhysicsWorld2D();
