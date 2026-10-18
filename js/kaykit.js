// KayKit Adventurers 1.0 (Kay Lousberg, CC0 - assets/kaykit/LICENSE.txt): animated characters for the classes and NPCs.
// Each .glb carries its texture and 76 animations. We swap the materials to the same toon shading as the world,
// add a cel outline that follows the skin, and show only the props a character should hold.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { toon } from "./world.js?v=mvdska9d";

const FILES = { knight: "Knight", mage: "Mage", rogue: "Rogue", hooded: "Rogue_Hooded", barbarian: "Barbarian" };
const lib = {};
let ready = false;

// measured on the rig 2026-10-11: +X on the upper arm lifts it up, -X on the spine leans forward
export const EMOTE = { waveUp: 2.4, waveLow: 0, bow: -.35, upAxis: new THREE.Vector3(1, 0, 0), lowAxis: new THREE.Vector3(0, 0, 1), bowAxis: new THREE.Vector3(1, 0, 0) };
export async function loadKayKit() {
  const loader = new GLTFLoader();
  try {
    await Promise.all(Object.entries(FILES).map(async ([k, f]) => { const g = await loader.loadAsync(`assets/kaykit/${f}.glb`); lib[k] = g; }));
    ready = true;
  } catch (e) { console.warn("KayKit models not loaded, using the built-in shapes", e); }
  return ready;
}
export const kayReady = () => ready;

// outline: a back-face copy pushed out along the normal BEFORE skinning, so it bends with the character
function outlineMat(t) {
  const m = new THREE.MeshBasicMaterial({ color: "#2a1f17", side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${t.toFixed(4)};`); };
  return m;
}

// what each role holds (mesh node names in the .glb); every other prop is hidden
const ROLES = {
  geomgaek: { file: "knight", show: ["1H_Sword", "Round_Shield", "Knight_Helmet", "Knight_Cape"], attack: "1H_Melee_Attack_Chop", cast: "Blocking", idle: "Idle", hit: "Block_Hit" },
  mudang: { file: "mage", show: ["1H_Wand", "Mage_Hat", "Mage_Cape"], attack: "Spellcast_Shoot", cast: "Spellcasting", idle: "Idle", hit: "Hit_A" },
  gungsu: { file: "rogue", show: ["2H_Crossbow", "Rogue_Cape"], attack: "2H_Ranged_Shoot", cast: "2H_Ranged_Aiming", idle: "Idle", hit: "Hit_A" },
  stranger: { file: "hooded", show: ["Rogue_Cape"], tint: "#7a6aa8", idle: "Idle" },
  trader: { file: "mage", show: ["Mage_Hat", "Spellbook_open"], tint: "#f0d8a8", idle: "Idle", busy: "Interact" },
  minsu: { file: "rogue", show: ["Rogue_Cape"], tint: "#c8d8f0", idle: "Idle" },
  jieun: { file: "mage", show: [], tint: "#ffd6e0", idle: "Sit_Floor_Idle" },
  teacher: { file: "mage", show: ["Mage_Hat", "Spellbook_open"], tint: "#efe6ff", idle: "Idle" },
  sua: { file: "mage", show: ["Mage_Cape"], tint: "#ffd8e4", idle: "Idle" },
  clerk: { file: "rogue", show: [], tint: "#c8e0ff", idle: "Idle" },
  mike: { file: "rogue", show: [], tint: "#f3e2c4", idle: "Idle" },
  gangsa: { file: "rogue", show: [], tint: "#d8d0e8", idle: "Idle" },
  handong: { file: "mage", show: [], tint: "#f0dcc8", idle: "Idle" },
  dealer: { file: "hooded", show: ["Rogue_Cape"], tint: "#6a7a8a", idle: "Idle" },
  qm: { file: "mage", show: ["Mage_Hat"], tint: "#ffe08a", idle: "Idle" },
  stuA: { file: "rogue", show: [], tint: "#c8d4ec", idle: "Idle" },
  sqBusker: { file: "rogue", show: ["Rogue_Cape"], tint: "#e8b8d8", idle: "Idle" },
  sqTourist: { file: "rogue", show: [], tint: "#f8e8b0", idle: "Idle" },
  sqPc: { file: "barbarian", show: [], tint: "#c8c8d8", idle: "Idle" },
  sqFisher: { file: "barbarian", show: [], tint: "#a8c8b8", idle: "Idle" },
  sqBike: { file: "knight", show: [], tint: "#b8e8a8", idle: "Idle" },
  sqPhoto: { file: "mage", show: [], tint: "#ffd0d8", idle: "Idle" },
  sqGongsi: { file: "rogue", show: [], tint: "#d0d8e8", idle: "Idle" },
  sqFlorist: { file: "mage", show: [], tint: "#ffd8c8", idle: "Idle" },
  sqStudent: { file: "rogue", show: [], tint: "#c8d8f8", idle: "Idle" },
  sqEngineer: { file: "barbarian", show: [], tint: "#e8c86a", idle: "Idle" },
  sqResearcher: { file: "mage", show: [], tint: "#e0f0f0", idle: "Idle" },
  sqCaretaker: { file: "mage", show: [], tint: "#d8d0c0", idle: "Idle" },
  sqShop: { file: "rogue", show: ["Rogue_Cape"], tint: "#f0b8d8", idle: "Idle" },
  sgA: { file: "rogue", show: [], tint: "#c8b8e8", idle: "Idle" },
  sgB: { file: "hooded", show: [], tint: "#a8c8b8", idle: "Idle" },
  sgC: { file: "knight", show: [], tint: "#d8c8a8", idle: "Idle" },
  sgD: { file: "barbarian", show: [], tint: "#b8c8e8", idle: "Idle" },
  sqDocent: { file: "mage", show: ["Spellbook_open"], tint: "#e8dcc0", idle: "Idle" },
  stuB: { file: "rogue", show: [], tint: "#d8e4d0", idle: "Idle" },
  stuC: { file: "hooded", show: [], tint: "#b8b8c8", idle: "Idle" },
  gayoung: { file: "rogue", show: ["Rogue_Cape"], tint: "#e8c8a8", idle: "Idle" },
  smith: { file: "barbarian", show: ["Barbarian_Cape"], idle: "Idle", busy: "Interact" },
  sitterA: { file: "mage", show: [], idle: "Sit_Floor_Idle", tint: "#d8c8b8" },
  sitterB: { file: "rogue", show: ["Rogue_Cape"], idle: "Sit_Floor_Idle", tint: "#c8d8c0" },
};
const BODY = /_(Body|Head|Head_Hooded|ArmLeft|ArmRight|LegLeft|LegRight)$/;

export function makeKay(role, height = 2.2) {
  const R = ROLES[role], src = lib[R.file];
  const scene = SkeletonUtils.clone(src.scene);
  const root = new THREE.Group(), inner = new THREE.Group();
  inner.add(scene); root.add(inner);
  inner.rotation.y = Math.PI;                       // KayKit faces +z, our characters face -z
  const mats = new Map();
  const skinned = [];
  scene.traverse(o => {
    if (!o.isMesh) return;
    const keep = BODY.test(o.name) || R.show.includes(o.name);
    if (!keep) { o.visible = false; return; }
    if (!mats.has(o.material)) { const m = toon("#ffffff", { map: o.material.map, side: THREE.DoubleSide }); if (R.tint) m.color.set(R.tint); mats.set(o.material, m); }
    o.material = mats.get(o.material); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    skinned.push(o);
  });
  // scale to the world's character height
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const o of skinned) if (BODY.test(o.name) || /Hat|Helmet/.test(o.name)) box.expandByObject(o);   // hidden props don't count
  const s = height / Math.max(.1, box.max.y - box.min.y);
  inner.scale.setScalar(s);
  const om = outlineMat(.03);
  for (const o of skinned) {
    const ol = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, om) : new THREE.Mesh(o.geometry, om);
    if (o.isSkinnedMesh) ol.bind(o.skeleton, o.bindMatrix);
    ol.position.copy(o.position); ol.quaternion.copy(o.quaternion); ol.scale.copy(o.scale); ol.frustumCulled = false; ol.raycast = () => {};
    o.parent.add(ol);
  }
  const bones = {}; scene.traverse(o => { if (o.isBone) bones[o.name.replace(/[^a-z]/gi, "").toLowerCase()] = o; });
  let emote = null;   // { name, t, dur }: wave / bow, drawn on top of the playing animation
  const mixer = new THREE.AnimationMixer(scene);
  const clip = n => THREE.AnimationClip.findByName(src.animations, n);
  const actions = {};
  const act = n => actions[n] || (actions[n] = clip(n) ? mixer.clipAction(clip(n)) : null);
  let cur = null, oneShot = null, deadPlayed = false;
  function play(n, fade = .2) {
    const a = act(n); if (!a || a === cur) return;
    a.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (cur) cur.fadeOut(fade); cur = a;
  }
  function once(n, fade = .1) {
    const a = act(n); if (!a) return;
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.setEffectiveWeight(1); a.fadeIn(fade).play();
    if (cur) cur.fadeOut(fade);                     // the loop steps aside so the one-shot plays at full strength
    oneShot = a;
    const dur = a.getClip().duration;
    if (!n.startsWith("Death")) setTimeout(() => { if (oneShot === a) { a.fadeOut(.15); oneShot = null; if (cur) cur.fadeIn(.15); } }, dur * 1000 * .9);
  }
  play(R.idle || "Idle", 0);
  let busyT = 4 + Math.random() * 6;
  return {
    root, height: height + .2,
    emote(name) { emote = { name, t: 0, dur: name === "wave" ? 2.4 : 1.8 }; },
    trigger(evt) { if (evt === "attack" && R.attack) once(R.attack); else if (evt === "hit" && R.hit && !deadPlayed) once(R.hit); },
    anim(dt, s = {}) {
      if (s.dead) { if (!deadPlayed) { deadPlayed = true; once("Death_A"); } mixer.update(dt); return; }
      if (deadPlayed) { deadPlayed = false; const d = act("Death_A"); if (d) d.stop(); cur = null; }
      if (s.moving) play(s.walk ? "Walking_A" : "Running_A");
      else if (s.casting && R.cast) play(R.cast);
      else if (R.busy && (busyT -= dt) < 0) { busyT = 6 + Math.random() * 8; once(R.busy, .3); play(R.idle); }
      else play(R.idle || "Idle");
      mixer.update(dt);
      if (emote) {
        if (s.moving || s.dead) emote = null;
        else {
          emote.t += dt; const t = emote.t, e = Math.min(1, t / .35, (emote.dur - t) / .35);
          if (t >= emote.dur) emote = null;
          else if (emote.name === "wave") { const ua = bones.upperarmr, la = bones.lowerarmr; if (ua) ua.rotateOnAxis(EMOTE.upAxis, EMOTE.waveUp * e); if (la) la.rotateOnAxis(EMOTE.lowAxis, EMOTE.waveLow * e + Math.sin(t * 11) * .45 * e); }
          else { if (bones.spine) bones.spine.rotateOnAxis(EMOTE.bowAxis, EMOTE.bow * e); if (bones.chest) bones.chest.rotateOnAxis(EMOTE.bowAxis, EMOTE.bow * .6 * e); if (bones.head) bones.head.rotateOnAxis(EMOTE.bowAxis, EMOTE.bow * .4 * e); }
        }
      }
    },
  };
}
