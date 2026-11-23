import { PerspectiveCamera, Vector3 } from 'three';
import { COURT_HALF_SIZE } from './courtGeometry';

const corners = [-1, 1].flatMap((x) => [-1, 1].map((z) =>
  new Vector3(x * COURT_HALF_SIZE, 0.24, z * COURT_HALF_SIZE)
));
const scratch = new Vector3();
const backwards = new Vector3();

// Keep the court inside the HUD, even when the player zooms in on a narrow window.
export function fitMatchCamera(camera: PerspectiveCamera, player?: Vector3, ball?: Vector3) {
  camera.updateMatrixWorld();
  const tangent = Math.tan(camera.getEffectiveFOV() * Math.PI / 360);
  let extraDistance = 0;
  function fit(point: Vector3, headroom = 0) {
    scratch.copy(point);
    scratch.y += headroom;
    scratch.applyMatrix4(camera.matrixWorldInverse);
    extraDistance = Math.max(extraDistance,
      scratch.z + Math.abs(scratch.x) / (tangent * camera.aspect * 0.91),
      scratch.z + Math.abs(scratch.y) / (tangent * 0.77));
  }
  for (const corner of corners) fit(corner);
  if (player) fit(player, 2.45);
  if (ball && Math.abs(ball.x) <= COURT_HALF_SIZE && Math.abs(ball.z) <= COURT_HALF_SIZE) fit(ball, 0.22);
  camera.position.addScaledVector(camera.getWorldDirection(backwards), -extraDistance);
  camera.updateMatrixWorld();
}
