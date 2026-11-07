# Four Square World Tour - Comprehensive Game System Refactor

Refactor the Credits & Credibility view, Campaign Mode schoolyard/interior exploration, and In-Match court mechanics to deliver a polished, authentic four square experience.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following choices for system mechanics and presentation:

- **Confirmed Decision 1 (Campaign Travel Controls)**: Multi-mode travel controls allowing players to toggle between walking, running, and cycling on a bike.
- **Confirmed Decision 2 (Campaign School Interiors)**: Walkable 3D school corridors with classrooms, student desks, teachers, and chalkboards.
- **Confirmed Decision 3 (Match Camera & Reach)**: Dynamic camera zoom on ball contact with animated palm extensions, digging saves, and physical arm reach.

---

## 1. Overview & Core Concept

This update refactors three primary pillars of the app:
1. **Credits & Credibility Presentation**: Replaces repetitive name containers with a cinematic, flowing credit roll (Star Wars style layout) on the left side paired with real, interactive 3D in-game character models on the right side. Carousel controls (`<` Previous / Next `>`) sync both text entries and 3D character models in real time.
2. **Campaign World & School Interior Exploration**: Expands campaign mode from a car-only floating platform into a rich 3D schoolyard surrounded by oak/maple trees, brick walls, and perimeter fences. Players can toggle between **Walk**, **Run**, and **Bike** movement, and physically walk inside school buildings into interactive classrooms with desks, chalkboards, and teachers.
3. **In-Match Four Square Rules & Striking Mechanics**:
   - **Strict 4-Player Court**: Fixes the bug in `image_11a399c1.png` where extra characters entered active court squares. Exactly 4 players occupy the 4 squares (1: King, 2: Queen, 3: Jack, 4: Rookie). Queued players wait outside the boundary lines.
   - **Proper Rotation**: Point losers drop to Square 4 or queue; all lower players advance up a square.
   - **First to 5 King Holds Wins**: First player to accumulate 5 King square holds wins the match.
   - **Dynamic Camera & Palm Strikes**: Camera zooms in smoothly on ball contact; player models execute arm extensions, palm hits, and diving digs.
   - **Audible Commentary**: Ensures PA announcements and commentators produce clear synthesized audio speech.
   - **Clean Top HUD**: Moves the "Exit Match" button inside the hamburger menu modal.

---

## 2. User Experience & Visual Design

### A. Credits & Credibility Experience
- **Left Side**: Flowing Star Wars style credits text (Category/Role on left, Creator Name on right) with no container borders or background boxes, matching `image_8751bf6b.png`.
- **Right Side**: Full 3D model viewport rendering the actual in-game character model or asset with rotation controls.
- **Navigation**: Synchronized `<` Previous and Next `>` controls that advance the credit entry and 3D character preview simultaneously.

### B. Campaign Mode Exploration & School Interiors
- **Outdoor Environment**: Enclosed schoolyard with grass patches, brick school walls, perimeter chain-link fences, oak/maple trees, and asphalt pathways eliminating empty floating void space.
- **Locomotion Mode Switcher**: Floating bottom toolbar allowing one-click toggling between `WALK`, `RUN`, and `BIKE`.
- **School Interior Transition**: Walking into the school entrance seamlessly loads a 3D school hall with classroom doorways. Entering a classroom reveals rows of desks, a teacher NPC at the chalkboard, and interactive lesson nodes.

### C. Match HUD & Camera Mechanics
- **Clean Header**: Top bar features score counters and hamburger menu. Exit Match button is located inside the hamburger menu modal.
- **Dynamic Action Camera**: Camera smoothly lerps towards the striking player and ball position during hits, widening and zooming out during high bounces.
- **Impact Animations**: Player mesh extends arms, performs palm strikes on contact, and executes diving dig poses on low corner saves.

---

## 3. Technical Architecture & Component Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              APP COMPONENT                             │
└────────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ CREDITS MODAL   │       │ CAMPAIGN SCENE  │       │ MATCH SCENE     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ • Flowing Text  │       │ • Multi-Loco    │       │ • Strict 4 Play │
│ • 3D Char Model │       │ • Trees/Fence   │       │ • Rotation Algo │
│ • Synced Next   │       │ • School Halls  │       │ • Dynamic Zoom  │
│ • No Box Clutter│       │ • Classrooms    │       │ • Audio PA FX   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Key Component Modifications

1. **`src/components/CreditsModal.tsx`**:
   - Refactor layout into left text column (flowing, borderless role & name text) and right 3D canvas viewport.
   - Instantiate Three.js canvas on right side using `buildCustomizablePlayerMesh` to render real in-game character models.
   - Synchronize `<` and `>` button handlers to step through `CREDITS_DATA` items and update the displayed 3D character mesh.

2. **`src/components/ThreeCourtScene.tsx`**:
   - **Environment**: Add surrounding tree meshes (`THREE.ConeGeometry` + `CylinderGeometry`), brick school building exterior, perimeter fence, and ground terrain around the main arena.
   - **Locomotion**: Add state `locomotionMode: 'walk' | 'run' | 'bike'`. Update player movement speed and 3D avatar (render bike model under player when in `'bike'` mode).
   - **Classroom Interiors**: Add building trigger zones. When entering school doors, load 3D classroom scene with student desks, chalkboard, and teacher NPC.

3. **`src/services/foursquareEngine.ts` & `src/components/ThreeCourtScene.tsx`**:
   - **Strict 4-Player Court Placement**: Enforce array bounds so only 4 players are rendered inside squares 1–4. All extra contenders are queued behind square 4.
   - **Rotation Logic**: On fault/point end, lower square players advance `[4->3, 3->2, 2->1]`. Loser drops to queue or square 4.
   - **First-to-5 King Wins**: Track `kingHolds[playerIndex]`. Match finishes when a player reaches 5 holds.
   - **Dynamic Zoom & Palm Reach**: Lerp camera position towards ball impact coordinates during hits. Trigger arm rotation and palm mesh extension towards ball target.
   - **Audible Voice PA**: Integrate `window.speechSynthesis` with fallback sound FX for loud PA announcements.
   - **Header Menu Cleanup**: Move "Exit Match" button inside the hamburger modal menu.

---

## 4. Verification Plan

1. **Credits View**: Open Credits & Credibility modal. Verify text flows cleanly without container boxes, 3D character renders on right, and Next/Prev buttons update both simultaneously.
2. **Campaign World**: Toggle Walk/Run/Bike controls. Explore schoolyard trees, fence, and enter school building to inspect classrooms, desks, and teacher NPC.
3. **Match Gameplay**: Start a classic match. Verify exactly 4 players on court (1 per square), camera zooms on ball hits, players reach and palm-strike the ball, audio PA speaks announcements, rotation occurs correctly on faults, and first to 5 King holds triggers victory.
4. **Code Quality**: Co-execute `compile_applet` and `lint_applet` to confirm zero errors.
