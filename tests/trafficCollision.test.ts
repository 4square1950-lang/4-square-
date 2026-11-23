import assert from 'node:assert/strict';
import { test } from 'node:test';
import { trafficTravel } from '../src/utils/trafficCollision';

test('a high-speed step cannot tunnel through a vehicle or pedestrian', () => {
  const car = { x: 0, z: 0, halfX: 1, halfZ: 2 };
  const vehicle = { x: 0, z: 10, halfX: 1, halfZ: 2 };
  const person = { x: 0, z: 6, halfX: .45, halfZ: .45 };
  assert.ok(trafficTravel(car, 0, 50, [vehicle]) * 50 < 6);
  assert.ok(trafficTravel(car, 0, 30, [person]) * 30 < 3.55);
  assert.equal(trafficTravel({ ...car, x: 3.25 }, 3.25, 50, [vehicle, person]), 1);
});

test('a lane change stops before a side-by-side vehicle', () => {
  const car = { x: 0, z: 0, halfX: 1, halfZ: 2 };
  const nextLane = { ...car, x: 3.4 };
  const travel = trafficTravel(car, 3.4, 0, [nextLane]);
  assert.ok(travel > 0 && travel * 3.4 < 1.4);
});
