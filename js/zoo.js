// The zookeeper's animals (Danny 2026-10-19: "a new class, the zookeeper, he can summon animals to fight for his side"). Models: Quaternius
// Animated Animal Pack + the sheep of the Farm Animal Pack (CC0, assets/animals/); the zebra is the animated horse with stripes painted
// on per vertex (the pack has no textures). Built like the people: toon colours, an outline that follows the skin, one mixer each.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { toon } from "./world.js?v=mvf37cpq";

// h = height in metres; move / attack = clip names (the sheep only has Idle and Jump, so it hops)
export const ANIMALS = {
  sheep:  { ko: "양", en: "sheep", icon: "🐑", file: "Sheep", h: .95, move: "Jump", attack: "Jump" },
  shiba:  { ko: "시바견", en: "Shiba Inu", icon: "🐕", file: "ShibaInu", h: .85, move: "Gallop", attack: "Attack" },
  fox:    { ko: "여우", en: "fox", icon: "🦊", file: "Fox", h: .8, move: "Gallop", attack: "Attack" },
  wolf:   { ko: "늑대", en: "wolf", icon: "🐺", file: "Wolf", h: 1.1, move: "Gallop", attack: "Attack" },
  zebra:  { ko: "얼룩말", en: "zebra", icon: "🦓", file: "Horse", zebra: true, h: 1.75, move: "Gallop", attack: "Attack_Kick" },
  deer:   { ko: "사슴", en: "deer", icon: "🦌", file: "Deer", h: 1.5, move: "Gallop", attack: "Attack_Headbutt" },
  alpaca: { ko: "알파카", en: "alpaca", icon: "🦙", file: "Alpaca", h: 1.8, move: "Gallop", attack: "Attack_Headbutt" },
  stag:   { ko: "수사슴", en: "stag", icon: "🫎", file: "Stag", h: 2.0, move: "Gallop", attack: "Attack_Headbutt" },
  bull:   { ko: "황소", en: "bull", icon: "🐂", file: "Bull", h: 1.65, move: "Gallop", attack: "Attack_Headbutt" },
};
const lib = {}, loader = new GLTFLoader();
let ready = false, loading = null;
export function loadZoo() {
  if (!loading) loading = Promise.all(Object.values(ANIMALS).map(async a => {
    if (lib[a.file]) return; const g = await loader.loadAsync(`assets/animals/${a.file}.glb`);
    for (const c of g.animations) c.name = c.name.replace(/^.*\|/, "");   /* "AnimalArmature|Walk" -> "Walk" (the files hold both) */
    lib[a.file] = g;
  })).then(() => { ready = true; }).catch(e => { console.warn("animals not loaded", e); loading = null; });
  return loading;
}
export const zooReady = () => ready;

function outlineMat(t) {
  const m = new THREE.MeshBasicMaterial({ color: "#2a1f17", side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${t.toFixed(6)};`); };
  m.customProgramCacheKey = () => "outline" + t.toFixed(6);
  return m;
}
// black and white stripes across the body, by position along its length
function stripes(o) {
  const g = o.geometry.clone(), p = g.attributes.position; g.computeBoundingBox(); const sz = g.boundingBox.getSize(new THREE.Vector3());
  const alongX = sz.x >= sz.z, len = Math.max(sz.x, sz.z), col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = (alongX ? p.getX(i) : p.getZ(i)) / len, w = Math.sin(v * Math.PI * 22 + p.getY(i) / sz.y * 2.2) > .15 ? .05 : .95; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = w; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); o.geometry = g; o.material = toon("#ffffff", { vertexColors: true });
}

export function makeAnimal(kind) {
  const A = ANIMALS[kind], src = lib[A.file];
  const scene = SkeletonUtils.clone(src.scene), root = new THREE.Group(), inner = new THREE.Group(), parts = [];
  scene.traverse(o => {
    if (!o.isMesh) return;
    const mn = o.material.name || "";
    if (A.zebra && /^Main/.test(mn)) stripes(o);
    else o.material = toon(A.zebra && /Hair|Muzzle|Hooves/.test(mn) ? "#151515" : "#" + o.material.color.getHexString());
    o.castShadow = true; o.frustumCulled = false; parts.push(o);
  });
  let gy = 0; for (const o of parts) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; gy = Math.max(gy, b.max.y - b.min.y, b.max.z - b.min.z); }
  const om = outlineMat(.02 * gy / 1.6);
  for (const o of parts) { const l = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, om) : new THREE.Mesh(o.geometry, om); if (o.isSkinnedMesh) l.bind(o.skeleton, o.bindMatrix); l.position.copy(o.position); l.quaternion.copy(o.quaternion); l.scale.copy(o.scale); l.frustumCulled = false; l.raycast = () => {}; o.parent.add(l); }
  inner.add(scene); root.add(inner);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3(); for (const o of parts) box.expandByObject(o);
  inner.scale.setScalar(A.h / Math.max(.01, box.max.y - box.min.y));
  inner.rotation.y = Math.PI;   // the animals face +z, our characters face -z
  const mixer = new THREE.AnimationMixer(scene), acts = {};
  const act = n => acts[n] || (acts[n] = (c => c && mixer.clipAction(c))(THREE.AnimationClip.findByName(src.animations, n)));
  let cur = null, oneShot = null, dead = false;
  const play = (n, f = .2) => { const a = act(n); if (!a || a === cur) return; a.reset().setEffectiveWeight(1).fadeIn(f).play(); if (cur) cur.fadeOut(f); cur = a; };
  const once = (n, f = .1) => { const a = act(n); if (!a) return; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.fadeIn(f).play(); if (cur) cur.fadeOut(f); oneShot = a;
    if (n !== "Death") setTimeout(() => { if (oneShot === a) { a.fadeOut(.15); oneShot = null; if (cur) cur.fadeIn(.15); } }, a.getClip().duration * 900); };
  play("Idle", 0); mixer.update(Math.random() * 2);
  return {
    root, height: A.h + .3,
    trigger(evt) { if (dead) return; if (evt === "attack") once(A.attack); else if (evt === "hit" && act("Idle_HitReact_Left")) once("Idle_HitReact_Left"); },
    anim(dt, s = {}) {
      if (s.dead) { if (!dead) { dead = true; if (act("Death")) once("Death"); } mixer.update(dt); return; }
      play(s.moving ? (s.walk && act("Walk") ? "Walk" : A.move) : "Idle"); mixer.update(dt);
    },
  };
}
