// Combat effects (Danny 2026-10-17: "every attack looks the same, no dopamine… it should be more obvious that stuff is going on";
// he picked "over the top" as the default). Pooled particles, shockwave rings, glow balls, slash arcs, screen shake and hit-stop.
// No lights are added (adding lights recompiles every material); glow comes from additive meshes and the bloom pass.
import * as THREE from "three";

let scene = null;
const rings = [], glows = [], arcs = [];
const geoChunk = new THREE.IcosahedronGeometry(1, 0), geoSpark = new THREE.BoxGeometry(.35, .35, 1.6), geoBall = new THREE.SphereGeometry(1, 14, 10);
const geoRing = new THREE.RingGeometry(.86, 1, 48), geoStar = new THREE.OctahedronGeometry(1, 0);
const add = (c, o = 1, additive = true) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, side: THREE.DoubleSide });
export const shakeState = { amp: 0, x: 0, y: 0, z: 0 };
export const hitStop = { until: 0 };
export let intensity = 1;   // 1 = over the top (Danny's default); the settings can lower it
export function setIntensity(v) { intensity = v; }

// ---- particles: one InstancedMesh per shape and blend mode, so hundreds of particles cost 6 draw calls ----
// additive particles fade by darkening their colour (black adds nothing); solid ones (dust, water) shrink away
const MAX_PER = 700, pools = {};
const SHAPES = { chunk: geoChunk, spark: geoSpark, star: geoStar };
let snd = () => {};
export function setSound(fn) { snd = fn; }
export function initFx(sc) {
  scene = sc;
  for (const [k, g] of Object.entries(SHAPES)) for (const addv of [true, false]) {
    const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ transparent: !addv, depthWrite: !addv, blending: addv ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false }), MAX_PER);
    m.count = 0; m.frustumCulled = false; m.setColorAt(0, new THREE.Color()); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sc.add(m); pools[k + (addv ? "+" : "")] = { mesh: m, list: [] };
  }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color(), Z = new THREE.Vector3(0, 0, 1);
// o: { n, color (or array), speed, up, size, life, grav, spread, dir (Vector3), shape: "chunk"|"spark"|"star", additive, drag, y, flat }
export function burst(pos, o = {}) {
  if (!scene) return;
  const shape = o.shape || "chunk", pool = pools[shape + (o.additive !== false ? "+" : "")];
  const n = Math.round((o.n ?? 16) * (.4 + .6 * intensity));
  for (let i = 0; i < n && pool.list.length < MAX_PER; i++) {
    const col = Array.isArray(o.color) ? o.color[i % o.color.length] : o.color || "#ffffff";
    const sz = (o.size ?? .14) * (.6 + Math.random() * .8);
    let v;
    if (o.dir) { v = o.dir.clone().normalize(); v.x += (Math.random() - .5) * (o.spread ?? .6); v.y += (Math.random() - .5) * (o.spread ?? .6); v.z += (Math.random() - .5) * (o.spread ?? .6); v.normalize(); }
    else { const a = Math.random() * Math.PI * 2, e = (Math.random() - .3) * Math.PI * (o.flat ? .15 : .6); v = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + (o.up ?? .4), Math.sin(a) * Math.cos(e)); }
    v.multiplyScalar((o.speed ?? 6) * (.5 + Math.random() * .8));
    const life = (o.life ?? .7) * (.6 + Math.random() * .7);
    pool.list.push({ p: new THREE.Vector3(pos.x, (pos.y ?? 0) + (o.y ?? 1.2), pos.z), v, life, max: life, grav: o.grav ?? 9, drag: o.drag ?? 1.5, s0: sz, col: new THREE.Color(col), rx: Math.random() * 6, ry: Math.random() * 6, spin: Math.random() * 10 - 5 });
  }
}
function tickParts(dt) {
  for (const [key, pool] of Object.entries(pools)) {
    const addv = key.endsWith("+"), spark = key.startsWith("spark"), L = pool.list, M = pool.mesh;
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      p.v.y -= p.grav * dt; p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt)); p.p.addScaledVector(p.v, dt);
      if (p.p.y < .05 && p.grav > 0) { p.p.y = .05; p.v.y *= -.35; p.v.x *= .6; p.v.z *= .6; }
      const k = p.life / p.max;
      if (spark) { const sp = p.v.length(); _q.setFromUnitVectors(Z, sp > .001 ? _s.copy(p.v).divideScalar(sp) : Z); _s.set(p.s0, p.s0, p.s0 * (1 + sp * .12)); }
      else { p.rx += p.spin * dt; p.ry += p.spin * dt; _q.setFromEuler(_e.set(p.rx, p.ry, 0)); const sc = p.s0 * (addv ? .4 + .6 * k : Math.min(1, k * 2.2)); _s.set(sc, sc, sc); }
      _m.compose(p.p, _q, _s); M.setMatrixAt(n, _m);
      M.setColorAt(n, addv ? _c.copy(p.col).multiplyScalar(Math.min(1, k * 1.6)) : p.col); n++;
    }
    M.count = n; M.instanceMatrix.needsUpdate = true; if (M.instanceColor) M.instanceColor.needsUpdate = true;
  }
}
// a shockwave ring on the ground (or upright with o.up)
export function ring(pos, o = {}) {
  if (!scene) return;
  const mesh = new THREE.Mesh(geoRing, add(o.color || "#ffffff", o.opacity ?? .9));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(pos.x, (pos.y ?? 0) + (o.y ?? .12), pos.z); mesh.scale.setScalar(o.from ?? .3);
  scene.add(mesh); rings.push({ mesh, t: 0, life: o.life ?? .45, from: o.from ?? .3, to: (o.r ?? 4) * (.7 + .3 * intensity) });
}
// a glowing ball that swells and fades (impact flash, explosion core, pillar with o.pillar)
export function glow(pos, o = {}) {
  if (!scene) return;
  const mesh = new THREE.Mesh(o.pillar ? new THREE.CylinderGeometry(1, 1, 1, 16, 1, true) : geoBall, add(o.color || "#ffffff", o.opacity ?? .85));
  mesh.position.set(pos.x, (pos.y ?? 0) + (o.y ?? 1.2), pos.z);
  scene.add(mesh); glows.push({ mesh, t: 0, life: o.life ?? .25, from: o.from ?? .2, to: (o.r ?? 1.4) * (.7 + .3 * intensity), pillar: !!o.pillar, h: o.h ?? 8, op: o.opacity ?? .85 });
}
// a crescent slash arc (the swordsman's hits)
export function slash(pos, yaw, o = {}) {
  if (!scene) return;
  const g = new THREE.RingGeometry(1.2, 1.9, 24, 1, -.9, 1.8), mesh = new THREE.Mesh(g, add(o.color || "#ffffff", .95));
  mesh.position.set(pos.x, (pos.y ?? 0) + (o.y ?? 1.3), pos.z); mesh.rotation.set(o.tilt ?? -1.2, yaw + Math.PI / 2, Math.random() * .8 - .4, "YXZ");
  mesh.scale.setScalar((o.size ?? 1) * (.8 + .4 * intensity));
  scene.add(mesh); arcs.push({ mesh, t: 0, life: .22, s: mesh.scale.x }); snd("slice", .55, rnd2(.9, 1.2));
}
const rnd2 = (a, b) => a + Math.random() * (b - a);
export function shake(a) { shakeState.amp = Math.min(1.2, Math.max(shakeState.amp, a * intensity)); }
export function stop(sec) { hitStop.until = Math.max(hitStop.until, performance.now() + sec * 1000 * intensity); }

export function fxTick(dt) {
  tickParts(dt);
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.t += dt; const k = r.t / r.life;
    if (k >= 1) { scene.remove(r.mesh); r.mesh.material.dispose(); rings.splice(i, 1); continue; }
    const e = 1 - Math.pow(1 - k, 3); r.mesh.scale.setScalar(r.from + (r.to - r.from) * e); r.mesh.material.opacity = (1 - k) * .9;
  }
  for (let i = glows.length - 1; i >= 0; i--) {
    const g = glows[i]; g.t += dt; const k = g.t / g.life;
    if (k >= 1) { scene.remove(g.mesh); g.mesh.material.dispose(); if (g.pillar) g.mesh.geometry.dispose(); glows.splice(i, 1); continue; }
    const s = g.from + (g.to - g.from) * Math.sqrt(k);
    if (g.pillar) { g.mesh.scale.set(s, g.h * (.3 + .7 * Math.sqrt(k)), s); g.mesh.position.y = g.h * (.3 + .7 * Math.sqrt(k)) / 2; } else g.mesh.scale.setScalar(s);
    g.mesh.material.opacity = g.op * (1 - k);
  }
  for (let i = arcs.length - 1; i >= 0; i--) {
    const a = arcs[i]; a.t += dt; const k = a.t / a.life;
    if (k >= 1) { scene.remove(a.mesh); a.mesh.material.dispose(); a.mesh.geometry.dispose(); arcs.splice(i, 1); continue; }
    a.mesh.scale.setScalar(a.s * (1 + k * .5)); a.mesh.rotation.z += dt * 9; a.mesh.material.opacity = .95 * (1 - k);
  }
  shakeState.amp = Math.max(0, shakeState.amp - dt * 2.6);
  const a = shakeState.amp * shakeState.amp;
  shakeState.x = (Math.random() - .5) * a; shakeState.y = (Math.random() - .5) * a; shakeState.z = (Math.random() - .5) * a;
}

// ---- presets ----
export const EL_COL = { fire: ["#ff7a1a", "#ffcf3a", "#ff3a1a"], water: ["#3ab8ff", "#9fe8ff", "#ffffff"], wood: ["#5ad04a", "#b8f06a", "#2f9a3a"], metal: ["#f2f4ff", "#c8d0e0", "#9fb8ff"], earth: ["#c8903a", "#8a6a3a", "#f0c87a"] };
export const CLASS_COL = { mudang: ["#ffd23d", "#fff2a8", "#ff9a3a"], gungsu: ["#7ae8ff", "#ffffff", "#3ab8ff"], geomgaek: ["#ffffff", "#ffe8a8", "#9fd8ff"] };
// a hit landing on a monster: size grows with the damage of the cast
export function impact(pos, cols, power = 1, weak = false) {
  const p = Math.min(3, power);
  glow(pos, { color: cols[0], r: 1 + p * .9, life: .22 + p * .05 });
  burst(pos, { n: 14 + p * 14, color: cols, speed: 6 + p * 3, size: .12 + p * .05, life: .55 + p * .12, shape: "spark", grav: 6 });
  burst(pos, { n: 6 + p * 6, color: cols, speed: 3 + p * 2, size: .16 + p * .05, life: .8, grav: 10 });
  ring(pos, { color: cols[0], r: 1.8 + p * 1.4, y: 1.2, life: .35 });
  if (weak) { burst(pos, { n: 22, color: ["#ffd23d", "#fff2a8"], speed: 10, size: .2, life: .9, shape: "star", grav: 4 }); ring(pos, { color: "#ffd23d", r: 4 + p, y: .15, life: .5 }); }
  snd(p >= 1.6 ? "punchH" : "punchM", .45 + p * .12, 1.1 - p * .08); if (weak) { snd("bell", .55, 1.1); snd("glass", .35, 1.4); }
  shake(.18 + p * .16); if (p >= 1.6 || weak) stop(.05 + p * .025);
}
export function healFx(pos, big = false) {
  snd("bell", .3, 1.6);
  burst(pos, { n: big ? 40 : 22, color: ["#7bdc86", "#c8ffd0", "#ffffff"], speed: 2.5, up: 2.2, size: .14, life: 1.1, grav: -2.5, drag: .8, y: .3 });
  ring(pos, { color: "#7bdc86", r: big ? 6 : 3, life: .6 }); glow(pos, { color: "#7bdc86", r: big ? 2.6 : 1.6, life: .35 });
}
export function shieldFx(pos, col = "#9ec8ff") { snd("field", .5); glow(pos, { color: col, r: 2.6, life: .5, opacity: .55 }); ring(pos, { color: col, r: 3, life: .5 }); burst(pos, { n: 18, color: [col, "#ffffff"], speed: 3, size: .12, life: .7, grav: 0, shape: "star" }); }
export function pillarFx(pos, col = "#ffd23d") { snd("bell", .55, .8); snd("field", .3, 1.3); glow(pos, { color: col, pillar: true, r: 1.8, h: 14, life: .9, opacity: .6 }); ring(pos, { color: col, r: 5, life: .7 }); burst(pos, { n: 36, color: [col, "#ffffff"], speed: 4, up: 3, size: .16, life: 1.2, grav: -1, shape: "star" }); }
export function waterSplash(pos, r = 4) {
  snd("soft", .9, .6); snd("soft", .6, 1.3); snd("lowboom", .35, 1.4);
  burst(pos, { n: 46, color: ["#5ab8ff", "#bfe8ff", "#ffffff"], speed: 9, up: 1.4, size: .2, life: .9, grav: 16, y: .3, additive: false });
  burst(pos, { n: 20, color: ["#ffffff", "#d8f2ff"], speed: 4, up: 2.6, size: .28, life: 1, grav: 12, y: .2, additive: false });
  ring(pos, { color: "#bfe8ff", r: r * 1.3, life: .6 }); ring(pos, { color: "#ffffff", r: r * .8, life: .4 }); shake(.35);
}
export function dustSlam(pos, r = 4, col = ["#b8a888", "#8a7a62", "#e0d4b8"]) {
  snd("plate", .8, .7); snd("mining", .5, .8); snd("lowboom", .45);
  burst(pos, { n: 40, color: col, speed: 8, up: .8, size: .26, life: .9, grav: 10, y: .3, additive: false, flat: true });
  burst(pos, { n: 14, color: ["#6a6058", "#9a8a78"], speed: 10, up: 1.6, size: .3, life: 1, grav: 18, y: .3, additive: false });
  ring(pos, { color: "#f2e8d0", r: r * 1.25, life: .5 }); shake(.4);
}
export function explosion(pos, cols = ["#ff7a1a", "#ffcf3a", "#ff3a1a"], size = 1) {
  snd("boom", Math.min(1, .45 + .3 * size), 1.15 - .1 * size);
  glow(pos, { color: cols[1] || cols[0], r: 2.4 * size, life: .35 });
  burst(pos, { n: 50 * size, color: cols, speed: 11 * size, size: .22 * size, life: 1, shape: "spark", grav: 6 });
  burst(pos, { n: 26 * size, color: ["#3a3436", "#6a6466"], speed: 4, up: 1.6, size: .35 * size, life: 1.3, grav: -1, drag: 2, additive: false });
  ring(pos, { color: cols[0], r: 6 * size, life: .6 }); shake(.5 * size); stop(.06 * size);
}
export function deathPoof(pos, big = false) {
  snd("soft", .55, 1.2); snd("coins", .35); if (big) snd("lowboom", 1, .8);
  burst(pos, { n: big ? 90 : 28, color: ["#ffffff", "#f2ede4", "#c9c4b8"], speed: big ? 12 : 6, up: 1, size: big ? .3 : .2, life: 1.1, grav: 3, drag: 2, additive: false });
  burst(pos, { n: big ? 40 : 12, color: ["#ffd23d", "#fff2a8"], speed: 7, up: 2, size: .14, life: 1.2, grav: 12, shape: "star" });
  if (big) { explosion(pos, ["#ffd23d", "#ffffff", "#ff9a3a"], 1.6); stop(.25); }
}
