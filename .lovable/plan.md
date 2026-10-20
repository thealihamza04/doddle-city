# Doodle Crowd — infinite 3D city of walking characters

A full-screen 3D scene in the style of the reference: cream background, thick black outlines, mostly uncolored doodle characters with a few bold colored ones (red mushroom, blue cat, yellow, orange, green). Viewed from above like a slow drone shot over Times Square.

## What you'll see
- An endless ground plane (cream paper with faint ink crosswalk/street lines) that tiles forever as you move.
- Hundreds of doodle characters (round heads, big googly eyes, hats, beanies, fluffy hair, cats, mushrooms, carrots) walking along streets, crossing, pausing, turning — each with a gentle walk bob.
- About 1 in 8 characters filled with a bold accent color; the rest white with black outlines.
- Camera slowly drifts and orbits on its own (drone feel); drag to pan, scroll to zoom, the world never ends.
- Small title overlay ("Doodle City") in a hand-drawn font, plus a hint "drag to fly".

## Approach
- React Three Fiber, client-only page at `/`.
- Characters built procedurally (toon-shaded primitives + inverted-hull black outlines + flat eye decals) so they match the doodle line style; ~8 character types.
- Infinite world: characters live in a grid of chunks around the camera; chunks recycle as you move, so it is truly endless with steady performance.
- Instanced meshes to keep it smooth on phones.
- Cel-shading look with soft fog fading into cream at distance.

## Technical details
- Packages: three, @react-three/fiber@9, @react-three/drei@10.
- Movement: each walker has a heading along a street grid, random turns at intersections, speed variation, delta-time motion.
- Custom MapControls-style pan/zoom plus idle auto-drift.
- Head metadata for the page; verify with screenshot harness.
