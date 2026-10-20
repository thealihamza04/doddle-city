import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const INK = "#1a1a1a";
const BLOCK = 12;
const CELLS = 10; // cells per side
const SPAN = CELLS * BLOCK; // wrapping world size
const ACC = ["#e8452c", "#2f4fb5", "#f5d22e", "#f08a24", "#6f9a3a"];

const outline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const inkMat = new THREE.MeshBasicMaterial({ color: INK });
const flat = new Map<string, THREE.Material>();
const mat = (c: string) => {
  if (!flat.has(c)) flat.set(c, new THREE.MeshLambertMaterial({ color: c }));
  return flat.get(c)!;
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// window-doodle facade texture
const facade = (() => {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.strokeRect(2, 2, 252, 252);
  g.lineWidth = 4;
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++) {
      const px = 28 + x * 76, py = 26 + y * 78;
      g.strokeRect(px, py, 48, 50);
      g.beginPath(); g.moveTo(px + 24, py); g.lineTo(px + 24, py + 50); g.stroke();
      g.beginPath(); g.moveTo(px, py + 25); g.lineTo(px + 48, py + 25); g.stroke();
    }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
const facadeMats = new Map<string, THREE.Material>();
const facadeMat = (floors: number, c: string) => {
  const k = floors + c;
  if (!facadeMats.has(k)) {
    const t = facade!.clone();
    t.repeat.set(1, floors);
    t.needsUpdate = true;
    facadeMats.set(k, new THREE.MeshLambertMaterial({ map: t, color: c }));
  }
  return facadeMats.get(k)!;
};

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  roof: new THREE.ConeGeometry(0.75, 1, 4),
  dome: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  trunk: new THREE.CylinderGeometry(0.12, 0.15, 1, 8),
  leaf: new THREE.SphereGeometry(1, 12, 10),
  cone: new THREE.ConeGeometry(0.9, 2.4, 10),
  pole: new THREE.CylinderGeometry(0.07, 0.07, 1, 6),
  lamp: new THREE.SphereGeometry(0.22, 10, 8),
  disc: new THREE.CylinderGeometry(0.45, 0.45, 0.06, 8),
  wheel: new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12),
  puff: new THREE.SphereGeometry(1, 12, 10),
};

function Ink({ g, c, o = 1.06, ...p }: { g: THREE.BufferGeometry; c: string | THREE.Material; o?: number } & Record<string, unknown>) {
  return (
    <group {...p}>
      <mesh geometry={g} material={typeof c === "string" ? mat(c) : c} />
      <mesh geometry={g} material={outline} scale={o} />
    </group>
  );
}

function Building({ r }: { r: () => number }) {
  const floors = 2 + Math.floor(r() * 5);
  const w = 3 + r() * 3, d = 3 + r() * 3, h = floors * 1.4;
  const tint = r() < 0.15 ? ACC[Math.floor(r() * ACC.length)]! : "#ffffff";
  const roof = r();
  return (
    <group position={[(r() - 0.5) * 3, 0, (r() - 0.5) * 3]}>
      <Ink g={G.box} c={facadeMat(floors, tint)} position={[0, h / 2, 0]} scale={[w, h, d]} o={1.03} />
      {roof < 0.4 && <Ink g={G.roof} c="#ffffff" position={[0, h + 0.6, 0]} rotation-y={Math.PI / 4} scale={[w, 1.2, d]} />}
      {roof >= 0.4 && roof < 0.6 && <Ink g={G.dome} c="#ffffff" position={[0, h, 0]} scale={[w * 0.8, 1.6, d * 0.8]} />}
      {roof >= 0.6 && <Ink g={G.box} c="#ffffff" position={[w * 0.2, h + 0.4, 0]} scale={[0.6, 0.8, 0.6]} />}
    </group>
  );
}

function Tree({ r, x, z }: { r: () => number; x: number; z: number }) {
  const cone = r() < 0.4;
  const c = r() < 0.25 ? "#6f9a3a" : "#ffffff";
  return (
    <group position={[x, 0, z]}>
      <Ink g={G.trunk} c="#ffffff" position={[0, 0.5, 0]} />
      {cone ? <Ink g={G.cone} c={c} position={[0, 2, 0]} /> : <Ink g={G.leaf} c={c} position={[0, 1.8, 0]} scale={[0.9, 1.2, 0.9]} />}
    </group>
  );
}

function CornerProp({ kind }: { kind: number }) {
  if (kind === 0)
    return (
      <group>
        <Ink g={G.pole} c="#ffffff" position={[0, 1.5, 0]} scale={[1, 3, 1]} />
        <Ink g={G.lamp} c="#f5d22e" position={[0, 3.1, 0]} />
      </group>
    );
  if (kind === 1)
    return (
      <group>
        <Ink g={G.pole} c="#ffffff" position={[0, 1.2, 0]} scale={[1, 2.4, 1]} />
        <Ink g={G.box} c="#ffffff" position={[0, 2.8, 0]} scale={[0.5, 1.3, 0.5]} />
        {["#e8452c", "#f5d22e", "#6f9a3a"].map((c, i) => (
          <mesh key={c} geometry={G.lamp} material={mat(c)} position={[0, 3.2 - i * 0.4, 0.22]} scale={0.6} />
        ))}
      </group>
    );
  return (
    <group>
      <Ink g={G.pole} c="#ffffff" position={[0, 1, 0]} scale={[1, 2, 1]} />
      <Ink g={G.disc} c="#e8452c" position={[0, 2.2, 0]} rotation-x={Math.PI / 2} />
    </group>
  );
}

function Cell({ seed }: { seed: number }) {
  const content = useMemo(() => {
    const r = rng(seed * 9973 + 17);
    const t = r();
    return (
      <>
        {t < 0.6 ? <Building r={r} /> : Array.from({ length: 2 + Math.floor(r() * 3) }, (_, i) => <Tree key={i} r={r} x={(r() - 0.5) * 7} z={(r() - 0.5) * 7} />)}
        {t < 0.6 && r() < 0.6 && <Tree r={r} x={3.8} z={-3.8} />}
        {r() < 0.55 && (
          <group position={[-4.6, 0, -4.6]}>
            <CornerProp kind={Math.floor(r() * 3)} />
          </group>
        )}
      </>
    );
  }, [seed]);
  return <>{content}</>;
}

function wrap(v: number, c: number) {
  return v - Math.round((v - c) / SPAN) * SPAN;
}

function useCenter() {
  return useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
}

function Blocks() {
  const controls = useCenter();
  const cells = useMemo(() => {
    const a: { i: number; j: number }[] = [];
    for (let i = 0; i < CELLS; i++) for (let j = 0; j < CELLS; j++) a.push({ i, j });
    return a;
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const c = controls?.target ?? new THREE.Vector3();
    cells.forEach((cell, k) => {
      const g = refs.current[k];
      if (!g) return;
      g.position.set(wrap(cell.i * BLOCK + BLOCK / 2, c.x), 0, wrap(cell.j * BLOCK + BLOCK / 2, c.z));
    });
  });
  return (
    <>
      {cells.map((cell, k) => (
        <group key={k} ref={(el) => { refs.current[k] = el; }}>
          <Cell seed={cell.i * 31 + cell.j * 7 + 1} />
        </group>
      ))}
    </>
  );
}

function Car({ color, van }: { color: string; van: boolean }) {
  return (
    <group>
      <Ink g={G.box} c={color} position={[0, 0.65, 0]} scale={[1.3, 0.7, 2.6]} />
      <Ink g={G.box} c="#ffffff" position={[0, 1.25, van ? 0 : -0.2]} scale={[1.2, 0.6, van ? 2.4 : 1.4]} />
      {[[-0.65, 0.85], [0.65, 0.85], [-0.65, -0.85], [0.65, -0.85]].map(([x, z], i) => (
        <mesh key={i} geometry={G.wheel} material={inkMat} position={[x!, 0.32, z!]} rotation-z={Math.PI / 2} />
      ))}
    </group>
  );
}

function Traffic() {
  const controls = useCenter();
  const cars = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 22 }, () => {
      const onX = r() < 0.5;
      const lane = Math.floor(r() * CELLS) * BLOCK + (r() < 0.5 ? -0.6 : 0.6);
      return { onX, lane, pos: r() * SPAN, sp: (r() < 0.5 ? 1 : -1) * (4 + r() * 3), color: r() < 0.45 ? ACC[Math.floor(r() * ACC.length)]! : "#ffffff", van: r() < 0.3 };
    });
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const c = controls?.target ?? new THREE.Vector3();
    cars.forEach((car, k) => {
      car.pos += car.sp * dt;
      const g = refs.current[k];
      if (!g) return;
      if (car.onX) g.position.set(wrap(car.pos, c.x), 0, wrap(car.lane, c.z));
      else g.position.set(wrap(car.lane, c.x), 0, wrap(car.pos, c.z));
      g.rotation.y = car.onX ? (car.sp > 0 ? Math.PI / 2 : -Math.PI / 2) : car.sp > 0 ? 0 : Math.PI;
    });
  });
  return (
    <>
      {cars.map((car, k) => (
        <group key={k} ref={(el) => { refs.current[k] = el; }}>
          <Car color={car.color} van={car.van} />
        </group>
      ))}
    </>
  );
}

function Cloud() {
  return (
    <group>
      {[[0, 0, 0, 1.4], [1.5, -0.2, 0.2, 1], [-1.5, -0.3, 0, 1.1], [0.6, 0.5, -0.4, 0.9]].map(([x, y, z, s], i) => (
        <Ink key={i} g={G.puff} c="#ffffff" position={[x!, y!, z!]} scale={s} o={1.05} />
      ))}
    </group>
  );
}

function Plane() {
  return (
    <group>
      <Ink g={G.box} c="#ffffff" scale={[0.8, 0.8, 4]} />
      <Ink g={G.box} c="#ffffff" scale={[5, 0.12, 1]} />
      <Ink g={G.box} c="#e8452c" position={[0, 0.6, -1.7]} scale={[0.12, 1, 0.6]} />
    </group>
  );
}

function Heli({ rotor }: { rotor: React.RefObject<THREE.Group | null> }) {
  return (
    <group>
      <Ink g={G.leaf} c="#2f4fb5" scale={[0.9, 0.8, 1.2]} />
      <Ink g={G.box} c="#ffffff" position={[0, 0.2, -1.8]} scale={[0.2, 0.2, 2]} />
      <group ref={rotor} position={[0, 0.95, 0]}>
        <mesh geometry={G.box} material={inkMat} scale={[4, 0.05, 0.2]} />
        <mesh geometry={G.box} material={inkMat} scale={[0.2, 0.05, 4]} />
      </group>
    </group>
  );
}

function Sky() {
  const controls = useCenter();
  const clouds = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 10 }, () => ({ x: r() * SPAN, z: r() * SPAN, y: 13 + r() * 5 }));
  }, []);
  const cRefs = useRef<(THREE.Group | null)[]>([]);
  const plane = useRef<THREE.Group>(null);
  const heli = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const c = controls?.target ?? new THREE.Vector3();
    const t = state.clock.elapsedTime;
    clouds.forEach((cl, k) => {
      cl.x += 0.8 * dt;
      cRefs.current[k]?.position.set(wrap(cl.x, c.x), cl.y, wrap(cl.z, c.z));
    });
    if (plane.current) {
      plane.current.position.set(wrap(t * 9, c.x), 17, wrap(-20, c.z));
      plane.current.rotation.y = Math.PI / 2;
    }
    if (heli.current) {
      heli.current.position.set(c.x + Math.cos(t * 0.3) * 18, 11 + Math.sin(t) * 0.4, c.z + Math.sin(t * 0.3) * 18);
      heli.current.rotation.y = -t * 0.3;
    }
    if (rotor.current) rotor.current.rotation.y += dt * 20;
  });
  return (
    <>
      {clouds.map((_, k) => (
        <group key={k} ref={(el) => { cRefs.current[k] = el; }}>
          <Cloud />
        </group>
      ))}
      <group ref={plane}><Plane /></group>
      <group ref={heli}><Heli rotor={rotor} /></group>
    </>
  );
}

export function CityProps() {
  return (
    <>
      <Blocks />
      <Traffic />
      <Sky />
    </>
  );
}
