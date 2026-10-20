import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const PAPER = "#fbf7ec";
const INK = "#1a1a1a";
const ACCENTS = ["#e8452c", "#2f4fb5", "#f5d22e", "#f08a24", "#6f9a3a", "#2bb3b1", "#f06aa0"];
const BLOCK = 12; // street grid spacing
const R = 60; // half-size of the wrapping world around the camera
const COUNT = 140;
const SPEED_MIN = 1.2;
const SPEED_MAX = 2.6;

// shared resources
const geo = {
  head: new THREE.SphereGeometry(0.6, 20, 16),
  body: new THREE.CapsuleGeometry(0.45, 0.7, 6, 14),
  eye: new THREE.SphereGeometry(0.17, 12, 10),
  pupil: new THREE.SphereGeometry(0.08, 8, 6),
  beanie: new THREE.SphereGeometry(0.63, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  brim: new THREE.CylinderGeometry(0.95, 0.95, 0.06, 20),
  crown: new THREE.CylinderGeometry(0.5, 0.55, 0.45, 20),
  cap: new THREE.SphereGeometry(0.95, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  ear: new THREE.ConeGeometry(0.2, 0.4, 4),
  puff: new THREE.IcosahedronGeometry(0.75, 1),
  dot: new THREE.SphereGeometry(0.14, 8, 6),
};
const gradient = (() => {
  const d = new Uint8Array([90, 200, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const matCache = new Map<string, THREE.Material>();
const toon = (c: string) => {
  if (!matCache.has(c)) matCache.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: gradient }));
  return matCache.get(c)!;
};
const outline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const ink = new THREE.MeshBasicMaterial({ color: INK });
const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });

function Inked({ g, color, s = 1, ...p }: { g: THREE.BufferGeometry; color: string; s?: number } & ThreeElements["group"]) {
  return (
    <group {...p}>
      <mesh geometry={g} material={toon(color)} castShadow />
      <mesh geometry={g} material={outline} scale={1.09 * s} />
    </group>
  );
}

type Kind = "beanie" | "hat" | "mushroom" | "cat" | "fluffy" | "plain";
const KINDS: Kind[] = ["beanie", "hat", "mushroom", "cat", "fluffy", "plain", "plain"];

function Character({ kind, color }: { kind: Kind; color: string }) {
  const skin = color === PAPER ? "#ffffff" : color;
  return (
    <group>
      <Inked g={geo.body} color={kind === "mushroom" && color !== PAPER ? "#2bb3b1" : skin} position={[0, 0.8, 0]} />
      <Inked g={geo.head} color={skin} position={[0, 1.95, 0]} />
      {/* eyes face +z */}
      {[-0.2, 0.2].map((x) => (
        <group key={x} position={[x, 2.05, 0.5]}>
          <mesh geometry={geo.eye} material={white} />
          <mesh geometry={geo.eye} material={outline} scale={1.2} />
          <mesh geometry={geo.pupil} material={ink} position={[0.03, 0, 0.12]} />
        </group>
      ))}
      {kind === "beanie" && <Inked g={geo.beanie} color={skin} position={[0, 2.05, 0]} />}
      {kind === "hat" && (
        <group position={[0, 2.45, 0]}>
          <Inked g={geo.brim} color={skin} />
          <Inked g={geo.crown} color={skin} position={[0, 0.25, 0]} />
        </group>
      )}
      {kind === "mushroom" && (
        <group position={[0, 2.2, 0]}>
          <Inked g={geo.cap} color={color === PAPER ? "#ffffff" : "#e8452c"} />
          {[[0.5, 0.5, 0.3], [-0.4, 0.6, -0.3], [0, 0.85, 0], [-0.3, 0.4, 0.6]].map((p, i) => (
            <mesh key={i} geometry={geo.dot} material={toon("#ffffff")} position={p as [number, number, number]} />
          ))}
        </group>
      )}
      {kind === "cat" &&
        [-0.3, 0.3].map((x) => <Inked key={x} g={geo.ear} color={skin} position={[x, 2.55, 0]} />)}
      {kind === "fluffy" && <Inked g={geo.puff} color={skin} position={[0, 2.1, -0.15]} s={0.98} />}
    </group>
  );
}

type Walker = { x: number; z: number; dir: number; speed: number; pause: number; phase: number; kind: Kind; color: string };
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function makeWalkers(): Walker[] {
  return Array.from({ length: COUNT }, () => {
    const dir = Math.floor(Math.random() * 4);
    const onX = dir % 2 === 0;
    const lane = Math.round((Math.random() * 2 - 1) * (R / BLOCK)) * BLOCK + (Math.random() * 3 - 1.5);
    const free = (Math.random() * 2 - 1) * R;
    return {
      x: onX ? free : lane,
      z: onX ? lane : free,
      dir,
      speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
      pause: 0,
      phase: Math.random() * 10,
      kind: KINDS[Math.floor(Math.random() * KINDS.length)],
      color: Math.random() < 0.14 ? ACCENTS[Math.floor(Math.random() * ACCENTS.length)] : PAPER,
    };
  });
}

function Crowd() {
  const walkers = useMemo(makeWalkers, []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const c = controls?.target ?? new THREE.Vector3();
    const t = state.clock.elapsedTime;
    walkers.forEach((w, i) => {
      if (w.pause > 0) w.pause -= dt;
      else {
        const [dx, dz] = DIRS[w.dir];
        const px = w.x, pz = w.z;
        w.x += dx * w.speed * dt;
        w.z += dz * w.speed * dt;
        // crossed an intersection line? maybe turn or pause
        const along = dx ? w.x : w.z;
        const prev = dx ? px : pz;
        if (Math.floor(along / BLOCK) !== Math.floor(prev / BLOCK)) {
          const r = Math.random();
          if (r < 0.25) w.dir = (w.dir + 1) % 4;
          else if (r < 0.5) w.dir = (w.dir + 3) % 4;
          else if (r < 0.6) w.pause = 0.5 + Math.random() * 2;
          if (r < 0.5) {
            // snap onto the new street
            if (dx) w.x = Math.round(w.x / BLOCK) * BLOCK + (Math.random() * 3 - 1.5);
            else w.z = Math.round(w.z / BLOCK) * BLOCK + (Math.random() * 3 - 1.5);
          }
        }
      }
      // wrap around camera for an endless crowd
      if (w.x - c.x > R) w.x -= 2 * R; else if (w.x - c.x < -R) w.x += 2 * R;
      if (w.z - c.z > R) w.z -= 2 * R; else if (w.z - c.z < -R) w.z += 2 * R;
      const g = refs.current[i];
      if (!g) return;
      const walking = w.pause <= 0;
      const k = t * w.speed * 5 + w.phase;
      g.position.set(w.x, walking ? Math.abs(Math.sin(k)) * 0.25 : 0, w.z);
      const [dx, dz] = DIRS[w.dir];
      const target = Math.atan2(dx, dz);
      let diff = target - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * (1 - Math.exp(-10 * dt));
      g.rotation.z = walking ? Math.sin(k) * 0.08 : 0;
    });
  });

  return (
    <>
      {walkers.map((w, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <Character kind={w.kind} color={w.color} />
        </group>
      ))}
    </>
  );
}

function Ground() {
  const ref = useRef<THREE.Mesh>(null);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const tex = useMemo(() => {
    const s = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const g = cv.getContext("2d")!;
    g.fillStyle = PAPER;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = INK;
    g.lineCap = "round";
    // street edges
    g.lineWidth = 4;
    const w = s * 0.2;
    for (const o of [w / 2, s - w / 2]) {
      g.beginPath(); g.moveTo(0, o); g.lineTo(s, o); g.stroke();
      g.beginPath(); g.moveTo(o, 0); g.lineTo(o, s); g.stroke();
    }
    // crosswalk stripes near corner
    g.lineWidth = 6;
    for (let i = -3; i <= 3; i++) {
      const p = i * 12;
      g.beginPath(); g.moveTo(w / 2 + 14, p); g.lineTo(w / 2 + 50, p); g.stroke();
      g.beginPath(); g.moveTo(p, w / 2 + 14); g.lineTo(p, w / 2 + 50); g.stroke();
    }
    // doodle squiggles on blocks
    g.lineWidth = 2.5;
    for (let i = 0; i < 14; i++) {
      const x = w + Math.random() * (s - 2 * w), y = w + Math.random() * (s - 2 * w);
      g.beginPath();
      g.arc(x, y, 6 + Math.random() * 10, 0, Math.PI * (1 + Math.random()));
      g.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const SIZE = 400;
    t.repeat.set(SIZE / BLOCK, SIZE / BLOCK);
    // texture tile origin centred on street intersections at multiples of BLOCK
    t.offset.set(0.5 - (SIZE / BLOCK / 2) % 1, 0.5 - (SIZE / BLOCK / 2) % 1);
    return t;
  }, []);
  useFrame(() => {
    if (!ref.current || !controls) return;
    // snap the plane to whole blocks so the pattern stays fixed in the world
    ref.current.position.x = Math.round(controls.target.x / BLOCK) * BLOCK;
    ref.current.position.z = Math.round(controls.target.z / BLOCK) * BLOCK;
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshToonMaterial map={tex} gradientMap={gradient} />
    </mesh>
  );
}

function Drone() {
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const camera = useThree((s) => s.camera);
  const idle = useRef(0);
  useFrame((state, raw) => {
    if (!controls) return;
    const dt = Math.min(raw, 0.05);
    idle.current += dt;
    if (idle.current < 2) return;
    const t = state.clock.elapsedTime * 0.05;
    const v = new THREE.Vector3(Math.cos(t), 0, Math.sin(t * 0.7)).multiplyScalar(2.2 * dt);
    controls.target.add(v);
    camera.position.add(v);
  });
  return (
    <MapControls
      makeDefault
      enableDamping
      minDistance={12}
      maxDistance={70}
      maxPolarAngle={1.2}
      onStart={() => (idle.current = 0)}
      onChange={() => {}}
      onEnd={() => (idle.current = 0)}
    />
  );
}

export function DoodleCity() {
  return (
    <div className="fixed inset-0 bg-background">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [18, 26, 26], fov: 45 }}>
        <color attach="background" args={[PAPER]} />
        <fog attach="fog" args={[PAPER, 40, 85]} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[20, 30, 10]} intensity={1.4} />
        <Drone />
        <Ground />
        <Crowd />
      </Canvas>
      <div className="pointer-events-none fixed inset-x-0 top-0 flex items-start justify-between p-6">
        <h1 className="font-doodle text-4xl text-foreground md:text-5xl">Doodle City</h1>
        <p className="font-doodle rounded-full border-2 border-foreground bg-background px-4 py-1 text-sm text-foreground">
          drag to fly · scroll to zoom
        </p>
      </div>
    </div>
  );
}
