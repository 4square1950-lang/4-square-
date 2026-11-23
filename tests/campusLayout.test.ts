import { trainingTotals, TRAINING_DRILLS } from '../src/services/training';
import { campusCollectibles, ITEM_RARITIES } from '../src/services/collectibles';
import { daylightAt } from '../src/services/venueDaylight';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { buildCampusCourt, buildCampusExterior, disposeCampus } from '../src/utils/campusScene';
import { CAMPUS_ARRIVAL, CAMPUS_LIMITS, CAMPUS_STREET, ANNEX, ANNEX_STAIRS, campusYardFence, SCHOOL_STAIRS, SCHOOL_UPPER, getCampusElevation, campusNpcSpot, campusPerimeter, campusPlayground, campusWalls, COURT_CLEARANCE, FUNNEL_POSITION, getCampusLayout, SCHOOL } from '../src/utils/campusLayout';
import { COURT_HALF_SIZE } from '../src/utils/courtGeometry';
import { VENUES } from '../src/utils/venueData';

test('all campaign schools keep the court and its run-off behind the school', () => {
  const footprints = new Set<string>();
  for (const venue of VENUES) {
    const layout = getCampusLayout(venue.id);
    const { left, right, back } = layout.yard;
    assert.ok(left < -COURT_CLEARANCE && right > COURT_CLEARANCE && back > COURT_CLEARANCE, venue.id);
    assert.ok(SCHOOL.rear < -COURT_CLEARANCE && CAMPUS_ARRIVAL[2] < SCHOOL.front);
    for (const wall of campusWalls(layout)) {
      const minX = wall.x - wall.width / 2;
      const maxX = wall.x + wall.width / 2;
      const maxZ = wall.z + wall.depth / 2;
      assert.ok(maxZ <= -COURT_CLEARANCE || minX >= COURT_CLEARANCE || maxX <= -COURT_CLEARANCE, venue.id);
      assert.ok(minX >= SCHOOL.doorHalfWidth - 1e-8 || maxX <= -SCHOOL.doorHalfWidth + 1e-8, venue.id);
    }
    for (const [index] of venue.npcs.entries()) {
      const [x, , z] = campusNpcSpot(index);
      assert.ok(Math.abs(x) - 0.45 > COURT_CLEARANCE && x < right && z > SCHOOL.rear && z < back, venue.id);
    }
    assert.ok(Math.abs(FUNNEL_POSITION.x) - 0.45 > COURT_CLEARANCE);
    footprints.add(JSON.stringify({ roof: layout.roof, yard: layout.yard, wings: layout.wings }));
  }
  assert.equal(footprints.size, VENUES.length);
});

test('the shared 3D builder uses the playable court bounds and paints once per square', (t) => {
  // Geometry can be checked without a renderer. Texture creation uses its solid-color fallback.
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ getContext: () => null }) } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  });
  for (const { id } of VENUES) {
    const campus = buildCampusExterior(id);
    const court = buildCampusCourt(id);
    const exterior = campus.getObjectByName('schoolExterior')!;
    assert.ok(exterior);
    assert.equal(court.squareMeshes.size, 4);
    const bounds = new THREE.Box3().setFromObject(court.group);
    assert.ok(Math.abs(bounds.max.x - COURT_HALF_SIZE) < 0.1);
    assert.ok(Math.abs(bounds.min.z + COURT_HALF_SIZE) < 0.1);
    const route = new THREE.Raycaster(new THREE.Vector3(0, 1.2, -26), new THREE.Vector3(0, 0, 1), 0, 22);
    exterior.updateMatrixWorld(true);
    assert.deepEqual(route.intersectObject(exterior, true), [], id);
    campus.add(court.group);
    disposeCampus(campus);
  }
});

test('the shared campus fence bounds the school approach, side buildings, and play areas', () => {
  for (const { id } of VENUES) {
    const playground = campusPlayground(id);
    const { left, right, front, rear } = CAMPUS_LIMITS;
    assert.ok(playground.x - playground.width / 2 > left && playground.x + playground.width / 2 < right);
    assert.ok(playground.z - playground.depth / 2 > SCHOOL.rear && playground.z + playground.depth / 2 < rear);
    assert.ok(CAMPUS_ARRIVAL[2] > front);
    assert.ok(campusPerimeter().every((fence) => fence.z + fence.depth / 2 <= CAMPUS_STREET.min || fence.z - fence.depth / 2 >= CAMPUS_STREET.max));
    assert.ok(Math.abs(playground.x) - playground.width / 2 > COURT_CLEARANCE);
  }
});


test('both staircases connect their floors without teleporting from the ground below', () => {
  for (const [stairs, floor] of [[ANNEX_STAIRS, ANNEX.floor], [SCHOOL_STAIRS, SCHOOL_UPPER.floor]] as const) {
    const { left, right, top, bottom } = stairs;
    const x = (left + right) / 2;
    let y = 0;
    for (let z = bottom; z >= top - .1; z -= .1) y = getCampusElevation(y, x, z);
    assert.equal(y, floor);
    for (let z = top; z <= bottom + .1; z += .1) y = getCampusElevation(y, x, z);
    assert.equal(y, 0);
    assert.equal(getCampusElevation(0, x, top + 1), 0);
  }
});

test('both yard gates allow a walking route to the playground at each venue', () => {
  for (const { id } of VENUES) {
    const layout = getCampusLayout(id);
    const { back, left, right } = layout.yard;
    const gates = campusYardFence(layout).filter(({ side }) => side);
    const crossing = back - 4.3;
    assert.ok(gates.every(({ z, length }) => Math.abs(crossing - z) - length / 2 > 1));
    const playground = campusPlayground(id);
    assert.ok(playground.x < left || playground.x > right);
  }
});

test('collectible rarity weights produce all four tiers without duplicate pickup identities', () => {
  const pickups = VENUES.flatMap(({id})=>campusCollectibles(id));
  assert.equal(new Set(pickups.map(({id})=>id)).size,pickups.length);
  assert.deepEqual(ITEM_RARITIES.map((rarity)=>pickups.filter((item)=>item.rarity===rarity).length),[64,12,3,1]);
});
test('campaign lighting follows the destination at the same UTC time', () => {
  const now = new Date('2026-11-21T15:00:00Z');
  assert.equal(daylightAt('buenos_aires_argentina',now),'sunny');
  assert.equal(daylightAt('melbourne_australia',now),'night');
});

test('first-clear training totals count each completed drill once', () => {
  assert.deepEqual(trainingTotals(['footwork','footwork','serve','unknown']),{drills:2,coins:25,xp:125});
  assert.deepEqual(trainingTotals(TRAINING_DRILLS.map(({id})=>id)),{drills:9,coins:150,xp:750});
});
