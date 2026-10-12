// Characters and monsters, built from simple shapes in the same toon style as the world.
// Every model: { root, anim(dt, state) }  where state = { moving, speed, attack (0..1 swing), hurt, dead }
import * as THREE from "three";
import { toon, outline } from "./world.js";

const SKIN = "#f0c7a0";
function part(geo, mat, x, y, z, parent, ol = .025) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); if (ol) outline(m, ol); return m;
}
const cyl = (a, b, h, s = 8) => new THREE.CylinderGeometry(a, b, h, s);
const ball = r => new THREE.IcosahedronGeometry(r, 2);

// a pivot group so limbs swing from the shoulder / hip
function limb(parent, x, y, z, len, r, mat) {
  const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p);
  part(cyl(r, r * .85, len, 7), mat, 0, -len / 2, 0, p); return p;
}

function humanoid({ body, legs, skin = SKIN, hair = "#2b1d16", hairStyle = "short", scale = 1 }) {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig); rig.scale.setScalar(scale);
  const legL = limb(rig, -.18, .86, 0, .84, .11, toon(legs)), legR = limb(rig, .18, .86, 0, .84, .11, toon(legs));
  const torso = part(cyl(.32, .38, .95), toon(body), 0, 1.3, 0, rig, .03);
  const head = part(ball(.27), toon(skin), 0, 2.02, 0, rig);
  if (hairStyle === "short") part(new THREE.SphereGeometry(.29, 12, 8, 0, 6.3, 0, 1.5), toon(hair), 0, 2.08, 0, rig, 0);
  if (hairStyle === "bun") { part(new THREE.SphereGeometry(.29, 12, 8, 0, 6.3, 0, 1.4), toon(hair), 0, 2.08, 0, rig, 0); part(ball(.13), toon(hair), 0, 2.2, .26, rig); }
  const armL = limb(rig, -.43, 1.72, 0, .75, .08, toon(body)), armR = limb(rig, .43, 1.72, 0, .75, .08, toon(body));
  armL.rotation.z = -.15; armR.rotation.z = .15;
  return { root, rig, legL, legR, armL, armR, torso, head };
}

function humanoidAnim(h) {
  let t = 0;
  return (dt, s) => {
    t += dt * (s.moving ? 9 * (s.speed || 1) : 2);
    const sw = s.moving ? Math.sin(t) * .7 : 0;
    h.legL.rotation.x = sw; h.legR.rotation.x = -sw;
    h.armL.rotation.x = -sw * .8;
    h.armR.rotation.x = s.attack > 0 ? -2.2 * Math.sin(s.attack * Math.PI) : sw * .8;
    h.rig.position.y = s.moving ? Math.abs(Math.sin(t)) * .06 : Math.sin(t) * .015;
    h.rig.rotation.x = s.dead ? -1.45 : 0; if (s.dead) h.rig.position.y = .25;
  };
}

// ---- the three classes ---------------------------------------------------------------------------
export function makeHero(cls) {
  let h;
  if (cls === "mudang") {                    // 무당: white robe, red sash, talisman fan + bells
    h = humanoid({ body: "#f3efe4", legs: "#f3efe4", hair: "#1d1612", hairStyle: "bun" });
    part(cyl(.4, .4, .14), toon("#c8402f"), 0, .95, 0, h.rig);
    part(cyl(.44, .58, .7, 10), toon("#f3efe4"), 0, .55, 0, h.rig, .03);          // long skirt
    const fan = part(new THREE.BoxGeometry(.04, .5, .32), toon("#f2df7a"), 0, -.8, -.12, h.armR, .015); fan.rotation.x = -.4;
    for (let i = 0; i < 3; i++) part(ball(.06), toon("#e0b43a"), -.04 + i * .04, -.8 - i * .07, .08, h.armL, 0);
    part(new THREE.CylinderGeometry(.05, .35, .12, 12), toon("#2b1d16"), 0, 2.33, 0, h.rig, .015); // small hat
  } else if (cls === "geomgaek") {           // 검객: dark blue armour, 갓 hat, sword
    h = humanoid({ body: "#24365a", legs: "#1f2533", hair: "#1d1612" });
    part(cyl(.42, .46, .5, 10), toon("#3a4f7a"), 0, 1.45, 0, h.rig, .03);           // chest plate
    for (const x of [-.5, .5]) part(ball(.18), toon("#566b94"), x, 1.75, 0, h.rig);  // pauldrons
    part(new THREE.CylinderGeometry(.55, .55, .03, 18), toon("#111"), 0, 2.33, 0, h.rig, .015); // 갓 brim
    part(cyl(.17, .2, .3, 12), toon("#111"), 0, 2.48, 0, h.rig, .015);
    const sword = part(new THREE.BoxGeometry(.06, 1.2, .12), toon("#d6dde4"), 0, -1.25, -.1, h.armR, .015);
    part(new THREE.BoxGeometry(.3, .05, .1), toon("#c9a24a"), 0, -.68, -.1, h.armR, .01);
  } else {                                   // 궁수: green tunic, quiver, bow
    h = humanoid({ body: "#3f7a3a", legs: "#5a4632", hair: "#4a2f1d" });
    part(cyl(.4, .4, .12), toon("#8a5a32"), 0, .95, 0, h.rig);
    const quiver = part(cyl(.11, .1, .8), toon("#8a5a32"), .15, 1.5, .3, h.rig); quiver.rotation.z = -.35;
    for (let i = 0; i < 3; i++) part(cyl(.012, .012, .3, 4), toon("#f3efe4"), .25 + i * .04, 1.95, .3, h.rig, 0);
    const bow = part(new THREE.TorusGeometry(.6, .035, 6, 16, Math.PI), toon("#6b3f22"), 0, -.75, 0, h.armL, .012);
    bow.rotation.y = Math.PI / 2; bow.rotation.z = Math.PI / 2;
    part(new THREE.ConeGeometry(.3, .25, 10), toon("#2f5a2c"), 0, 2.32, 0, h.rig, .015);     // hood tip
  }
  // cape for everyone (단청 red trim)
  const cape = part(new THREE.ConeGeometry(.52, 1.4, 8, 1, true), toon(cls === "geomgaek" ? "#7a1f1f" : "#b8382a", { side: THREE.DoubleSide }), 0, 1.25, .2, h.rig, 0);
  return { root: h.root, anim: humanoidAnim(h), height: 2.4 };
}

// ---- NPCs ------------------------------------------------------------------------------------------
export function makeNPC(kind) {
  let h;
  if (kind === "grandma") { h = humanoid({ body: "#d9a6a6", legs: "#5a4a6a", hair: "#cfcac2", hairStyle: "bun", scale: .92 }); part(new THREE.BoxGeometry(.6, .7, .05), toon("#f6f1e6"), 0, 1.2, -.36, h.rig, .01); }
  else if (kind === "smith") { h = humanoid({ body: "#6b5a4a", legs: "#33302d", hair: "#2a2522", scale: 1.08 }); part(new THREE.BoxGeometry(.66, .9, .05), toon("#3b2f26"), 0, 1.2, -.37, h.rig, .01); }
  else if (kind === "guard") { h = humanoid({ body: "#2f4f6e", legs: "#1f2533", hair: "#1d1612" }); part(cyl(.3, .3, .14, 12), toon("#2f4f6e"), 0, 2.27, 0, h.rig, .015); }
  else if (kind === "stranger") {
    h = humanoid({ body: "#2a2438", legs: "#1d1a26", hair: "#1d1a26" });
    part(new THREE.ConeGeometry(.6, 1.9, 10, 1, true), toon("#2a2438", { side: THREE.DoubleSide }), 0, 1.2, 0, h.rig, .03);
    part(new THREE.SphereGeometry(.34, 12, 10, 0, 6.3, 0, 1.9), toon("#2a2438"), 0, 2.05, .03, h.rig, .02);
    const eye = new THREE.MeshBasicMaterial({ color: "#b48cff", toneMapped: false });
    for (const x of [-.09, .09]) part(new THREE.SphereGeometry(.035, 8, 6), eye, x, 2.03, -.25, h.rig, 0);
  } else { h = humanoid({ body: ["#c8402f", "#2f7f86", "#e0a21c"][Math.random() * 3 | 0], legs: "#333", scale: .95 }); }
  const anim = humanoidAnim(h);
  return { root: h.root, anim: (dt, s) => anim(dt, s || {}), height: 2.4, rig: h.rig };
}

// ---- monsters ------------------------------------------------------------------------------------------
export function makeMonster(kind) {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  let t = Math.random() * 10, anim, height;
  if (kind === "dokkaebi" || kind === "pet") {     // 꼬마 도깨비 with 방망이 (the pet 깨비 is a blue one)
    const red = toon(kind === "pet" ? "#4a7bd4" : "#d4553f"), stripe = toon("#e8a33a"), horn = toon("#f3e3b0");
    const legL = limb(rig, -.3, .7, 0, .7, .16, red), legR = limb(rig, .3, .7, 0, .7, .16, red);
    const body = part(ball(.75), red, 0, 1.35, 0, rig, .04); body.scale.set(1, 1.05, .9);
    part(cyl(.66, .7, .38, 10), stripe, 0, .86, 0, rig, .03);
    part(ball(.55), red, 0, 2.35, -.05, rig, .035);
    part(new THREE.ConeGeometry(.13, .55, 7), horn, 0, 2.95, -.02, rig, .02);
    const eyeM = new THREE.MeshBasicMaterial({ color: "#fff36a", toneMapped: false });
    for (const ex of [-.2, .2]) part(new THREE.SphereGeometry(.1, 8, 6), eyeM, ex, 2.42, -.48, rig, 0);
    part(new THREE.BoxGeometry(.5, .12, .1), toon("#f7f2e2"), 0, 2.12, -.5, rig, 0);
    const armR = new THREE.Group(); armR.position.set(.8, 1.75, 0); rig.add(armR);
    part(cyl(.15, .13, .8, 7), red, 0, -.35, 0, armR, .03);
    const club = new THREE.Group(); club.position.set(0, -.75, -.1); armR.add(club);
    part(cyl(.24, .09, 1.5, 8), toon("#8a5a32"), 0, .55, 0, club, .03);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; part(new THREE.ConeGeometry(.07, .2, 5), toon("#d9d3c4"), Math.cos(a) * .22, 1.05, Math.sin(a) * .22, club, 0); }
    club.rotation.x = -.6;
    const armL = limb(rig, -.8, 1.75, 0, .8, .15, red); armL.rotation.z = -.5;
    height = 3.2;
    anim = (dt, s) => {
      t += dt * (s.moving ? 11 : 2.5);
      const sw = s.moving ? Math.sin(t) * .8 : 0; legL.rotation.x = sw; legR.rotation.x = -sw;
      armR.rotation.x = s.attack > 0 ? -2.6 * Math.sin(s.attack * Math.PI) : -.3 + Math.sin(t) * .1;
      rig.position.y = Math.abs(Math.sin(t)) * (s.moving ? .12 : .04);
    };
  } else if (kind === "haetae") {                  // 해태 석상: mossy stone guardian, one horn
    const stone = toon("#a9a69a"), dark = toon("#7d7a70"), moss = toon("#5e8f3e");
    const body = part(new THREE.BoxGeometry(1.4, 1.1, 2.2), stone, 0, 1.25, 0, rig, .05);
    const legs = [];
    for (const [x, z] of [[-.5, -.75], [.5, -.75], [-.5, .75], [.5, .75]]) legs.push(limb(rig, x, .8, z, .8, .22, dark));
    const head = new THREE.Group(); head.position.set(0, 2.05, -1.05); rig.add(head);
    part(new THREE.BoxGeometry(1.1, .95, 1), stone, 0, 0, 0, head, .05);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; part(ball(.26), toon("#8f8b7e"), Math.cos(a) * .6, Math.sin(a) * .5 + .1, .25, head, .02); }  // curly mane
    part(new THREE.ConeGeometry(.12, .5, 6), dark, 0, .75, -.1, head, .02);                                      // the single horn
    const eyeM = new THREE.MeshBasicMaterial({ color: "#7af0ff", toneMapped: false });
    for (const ex of [-.25, .25]) part(new THREE.SphereGeometry(.09, 8, 6), eyeM, ex, .15, -.51, head, 0);
    part(new THREE.BoxGeometry(.7, .14, .1), toon("#efe9da"), 0, -.25, -.52, head, 0);
    part(new THREE.BoxGeometry(1.42, .12, 2.22), moss, 0, 1.84, 0, rig, 0);                                    // moss on its back
    for (let i = 0; i < 5; i++) part(ball(.22), moss, (Math.random() - .5) * 1.1, 1.92, (Math.random() - .5) * 1.8, rig, 0);
    const tail = part(cyl(.12, .2, .9, 6), stone, 0, 1.6, 1.25, rig, .02); tail.rotation.x = .8;
    height = 3.0;
    anim = (dt, s) => {
      t += dt * (s.moving ? 6 : 1.5);
      legs.forEach((l, i) => l.rotation.x = s.moving ? Math.sin(t + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * .5 : 0);
      head.rotation.x = s.attack > 0 ? .5 * Math.sin(s.attack * Math.PI) : Math.sin(t * .5) * .04;
      rig.position.y = s.slam > 0 ? Math.sin(s.slam * Math.PI) * 1.4 : 0;
    };
  } else if (kind === "alien" || kind === "alien_caster") {   // aliens: tall, thin, big head, glowing eyes (decision 3)
    const caster = kind === "alien_caster", skin = toon(caster ? "#8a7ab8" : "#9aa3b0"), dark = toon("#3a3f4a");
    const eyeM = new THREE.MeshBasicMaterial({ color: caster ? "#e2b8ff" : "#7af0ff", toneMapped: false });
    const legL = limb(rig, -.2, 1.2, 0, 1.2, .1, skin), legR = limb(rig, .2, 1.2, 0, 1.2, .1, skin);
    part(cyl(.3, .2, 1.2, 8), dark, 0, 1.8, 0, rig, .03);
    const head = part(ball(.5), skin, 0, 2.85, 0, rig, .035); head.scale.set(1, 1.3, 1.05);
    for (const ex of [-.2, .2]) { const e = part(new THREE.SphereGeometry(.13, 10, 8), eyeM, ex, 2.85, -.43, rig, 0); e.scale.set(1.5, .7, .5); e.rotation.z = ex > 0 ? -.4 : .4; }
    const armL = limb(rig, -.38, 2.3, 0, 1.1, .07, skin), armR = limb(rig, .38, 2.3, 0, 1.1, .07, skin);
    let orb = null, halo = null;
    if (caster) {
      orb = part(new THREE.SphereGeometry(.22, 12, 10), new THREE.MeshBasicMaterial({ color: "#d6a8ff", toneMapped: false }), 0, -1.15, -.1, armR, 0);
      halo = part(new THREE.TorusGeometry(.45, .04, 6, 24), new THREE.MeshBasicMaterial({ color: "#c8a8ff", toneMapped: false }), 0, 3.6, 0, rig, 0); halo.rotation.x = Math.PI / 2;
    }
    height = 3.6;
    anim = (dt, s) => {
      t += dt * (s.moving ? 7 : 1.6);
      const sw = s.moving ? Math.sin(t) * .5 : 0; legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw * .6 + (s.attack > 0 ? -1.8 * Math.sin(s.attack * Math.PI) : 0);
      armR.rotation.x = sw * .6 + (s.attack > 0 ? -2.2 * Math.sin(s.attack * Math.PI) : 0);
      rig.position.y = caster ? .25 + Math.sin(t) * .12 : 0;
      if (halo) halo.rotation.z += dt * 2; if (orb) orb.scale.setScalar(1 + (s.charge || 0) * 1.5);
    };
  } else if (kind === "crab") {                   // 왕꽃게: armoured crab, two big claws; flips onto its back
    const shell = toon("#c8402f"), dark = toon("#8a2a1e"), pale = toon("#f0d8c0");
    const body = part(new THREE.SphereGeometry(1, 16, 10), shell, 0, 1.1, 0, rig, .05); body.scale.set(1.5, .55, 1.1);
    for (const ex of [-.35, .35]) { part(cyl(.05, .05, .5, 6), dark, ex, 1.65, -.7, rig, 0); part(new THREE.SphereGeometry(.1, 8, 6), new THREE.MeshBasicMaterial({ color: "#111" }), ex, 1.92, -.7, rig, 0); }
    const legs = [];
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const p = new THREE.Group(); p.position.set(side * 1.2, 1, -.4 + i * .45); rig.add(p); legs.push(p); const l = part(cyl(.08, .05, 1.2, 6), dark, side * .4, -.35, 0, p, .02); l.rotation.z = side * .9; }
    const claws = [];
    for (const side of [-1, 1]) { const p = new THREE.Group(); p.position.set(side * .9, 1.2, -.9); rig.add(p); claws.push(p);
      part(cyl(.12, .12, .8, 6), shell, 0, 0, -.35, p, .02).rotation.x = Math.PI / 2;
      const pin = part(new THREE.SphereGeometry(.35, 10, 8), shell, 0, .05, -.85, p, .03); pin.scale.set(.8, .6, 1.3); part(new THREE.ConeGeometry(.12, .5, 6), pale, side * .1, .05, -1.3, p, .02).rotation.x = -Math.PI / 2; }
    height = 2.4;
    anim = (dt, s) => {
      t += dt * (s.moving ? 9 : 2);
      legs.forEach((l, i) => l.rotation.x = s.moving ? Math.sin(t + i) * .4 : 0);
      claws.forEach((c, i) => c.rotation.x = s.attack > 0 ? -1 * Math.sin(s.attack * Math.PI) : Math.sin(t * .5 + i) * .1);
      rig.position.y = s.slam > 0 ? Math.sin(s.slam * Math.PI) * 1.2 : 0;
      rig.rotation.z += ((s.flipped ? Math.PI : 0) - rig.rotation.z) * Math.min(1, dt * 8);
      if (s.flipped) rig.position.y = 1.6;
    };
  } else if (kind === "eel") {                    // 장어: an electric eel that floats in the air, sparks along its back
    const skin = toon("#4a5a3a"), belly = toon("#c8c890"), spark = new THREE.MeshBasicMaterial({ color: "#fff36a", toneMapped: false });
    const segs = [];
    for (let i = 0; i < 9; i++) { const sgm = part(new THREE.SphereGeometry(.32 - i * .025, 10, 8), i % 2 ? skin : belly, 0, 1.6, -i * .42 + 1.2, rig, .02); sgm.scale.set(1, .8, 1.2); segs.push(sgm); }
    for (const ex of [-.14, .14]) part(new THREE.SphereGeometry(.06, 6, 5), spark, ex, 1.72, 1.45, rig, 0);
    const sparks = []; for (let i = 0; i < 5; i++) sparks.push(part(new THREE.OctahedronGeometry(.1, 0), spark, 0, 1.95, 1 - i * .7, rig, 0));
    rig.rotation.y = Math.PI;
    height = 2.4;
    anim = (dt, s) => {
      t += dt * (s.moving ? 8 : 3);
      segs.forEach((g, i) => { g.position.x = Math.sin(t - i * .7) * .25; g.position.y = 1.6 + Math.sin(t * .7 - i * .5) * .12; });
      sparks.forEach((p, i) => { p.visible = (Math.floor(t * 3 + i) % 3) === 0 || s.attack > 0; p.position.x = Math.sin(t - i) * .25; });
    };
  } else if (kind === "examghost") {              // 시험 귀신: a pale student ghost with a 합격 headband and an open book
    const pale = toon("#eef0f6", { transparent: true, opacity: .85 }), hair = toon("#1d1612"), red = toon("#c8402f");
    part(new THREE.ConeGeometry(.6, 2.2, 10, 1, true), toon("#e4e8f0", { side: THREE.DoubleSide, transparent: true, opacity: .8 }), 0, 1.4, 0, rig, .03);
    const head = part(ball(.38), pale, 0, 2.75, 0, rig, .03);
    part(new THREE.SphereGeometry(.4, 12, 8, 0, 6.3, 0, 1.4), hair, 0, 2.82, .02, rig, 0);
    part(cyl(.41, .41, .12, 14), red, 0, 2.9, 0, rig, 0);
    const c = document.createElement("canvas"); c.width = 128; c.height = 48; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 128, 48); g.fillStyle = "#c8402f"; g.font = "34px sans-serif"; g.textAlign = "center"; g.fillText("합격", 64, 36);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    part(new THREE.PlaneGeometry(.36, .14), toon("#ffffff", { map: tx }), 0, 2.9, -.42, rig, 0).rotation.y = Math.PI;
    const eyeM = new THREE.MeshBasicMaterial({ color: "#1a1424" });
    for (const ex of [-.13, .13]) part(new THREE.SphereGeometry(.07, 8, 6), eyeM, ex, 2.72, -.34, rig, 0);
    const armR = limb(rig, .45, 2.2, 0, .8, .07, pale), armL = limb(rig, -.45, 2.2, 0, .8, .07, pale);
    const book = part(new THREE.BoxGeometry(.5, .05, .36), toon("#2f5aa8"), 0, -.85, -.15, armL, .015);
    height = 3.3;
    anim = (dt, s) => {
      t += dt * 2;
      rig.position.y = .3 + Math.sin(t) * .15; armL.rotation.x = -1.1; armR.rotation.x = s.attack > 0 ? -2 * Math.sin(s.attack * Math.PI) : -.3 + Math.sin(t) * .1;
      head.rotation.z = Math.sin(t * .6) * .15;
    };
  } else if (kind === "octopus") {                // 문어 왕: the octopus king; arms drop off as it is hurt
    const skin = toon("#a83a5a"), spot = toon("#d06a8a"), gold = toon("#e0b43a");
    const mantle = part(new THREE.SphereGeometry(1.6, 18, 14), skin, 0, 4.2, .4, rig, .06); mantle.scale.set(1, 1.25, 1.1);
    for (let i = 0; i < 8; i++) part(new THREE.SphereGeometry(.18, 8, 6), spot, Math.cos(i) * 1.2, 4.6 + Math.sin(i * 2) * .5, .4 + Math.sin(i) * 1.1, rig, 0);
    const eyeW = toon("#f2e6a0"), pup = new THREE.MeshBasicMaterial({ color: "#111" });
    for (const ex of [-.65, .65]) { part(new THREE.SphereGeometry(.32, 12, 10), eyeW, ex, 3.4, -.9, rig, .02); const p = part(new THREE.BoxGeometry(.32, .1, .05), pup, ex, 3.4, -1.2, rig, 0); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; part(new THREE.ConeGeometry(.16, .5, 5), gold, Math.cos(a) * .6, 6.2, .4 + Math.sin(a) * .6, rig, .02); }
    part(cyl(.65, .7, .25, 14), gold, 0, 5.95, .4, rig, .02);
    const arms = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.cos(a) * .9, 2.6, .4 + Math.sin(a) * .9); g.rotation.y = -a; rig.add(g); arms.push(g);
      const pts = []; for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector3(k * .55, -k * .28 + Math.sin(k) * .15, 0));
      part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .22, 7), skin, 0, 0, 0, g, .03);
    }
    height = 6.6;
    anim = (dt, s) => {
      t += dt * 1.6;
      arms.forEach((g, i) => { g.rotation.z = Math.sin(t + i) * .25 + (s.attack > 0 ? .8 * Math.sin(s.attack * Math.PI) : 0); g.visible = i < (s.arms ?? 8); });
      rig.position.y = Math.sin(t * .8) * .2; mantle.scale.y = 1.25 + Math.sin(t * 1.3) * .05;
    };
  } else if (kind === "jangseung") {              // 장승: a carved village guardian post that woke up and hops
    const wood = toon("#8a5a32"), dark = toon("#5a3a22"), red = toon("#b8382a"), white = toon("#f3efe4"), black = toon("#1d1612");
    const post = part(cyl(.48, .55, 3.2, 10), wood, 0, 1.6, 0, rig, .04);
    part(cyl(.5, .5, .5, 10), red, 0, 2.7, 0, rig, .03);
    part(new THREE.CylinderGeometry(.85, .85, .08, 16), black, 0, 3.32, 0, rig, .02);                 // 관모 hat brim
    part(cyl(.32, .38, .55, 12), black, 0, 3.6, 0, rig, .02);
    for (const ex of [-.2, .2]) { part(ball(.16), white, ex, 2.65, -.42, rig, .015); part(new THREE.SphereGeometry(.07, 8, 6), black, ex, 2.65, -.56, rig, 0); }
    part(new THREE.BoxGeometry(.1, .35, .12), dark, 0, 2.38, -.5, rig, 0);                              // nose
    part(new THREE.BoxGeometry(.5, .14, .1), black, 0, 2.08, -.5, rig, 0);                            // mouth
    for (const tx of [-.2, .2]) part(new THREE.ConeGeometry(.05, .16, 4), white, tx, 2.13, -.53, rig, 0);
    const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#8a5a32"; g.fillRect(0, 0, 64, 256); g.fillStyle = "#1d1612"; g.font = "44px serif"; g.textAlign = "center"; [..."천하대장"].forEach((ch, i) => g.fillText(ch, 32, 52 + i * 56));
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    part(new THREE.PlaneGeometry(.42, 1.6), toon("#ffffff", { map: tx }), 0, 1.05, -.56, rig, 0).rotation.y = Math.PI;
    height = 3.9;
    anim = (dt, s) => {
      t += dt * (s.moving ? 7 : 1.5);
      rig.position.y = s.slam > 0 ? Math.sin(s.slam * Math.PI) * 1.6 : s.moving ? Math.abs(Math.sin(t)) * .4 : 0;
      rig.rotation.x = s.attack > 0 ? -.5 * Math.sin(s.attack * Math.PI) : 0;
      rig.rotation.z = s.moving ? Math.sin(t) * .05 : 0;
    };
  } else if (kind === "geuseundae") {             // 그슨대: a shadow that grows taller the longer it fights
    const shade = toon("#1a1424", { transparent: true, opacity: .88 }), eyeM = new THREE.MeshBasicMaterial({ color: "#f4f0ff", toneMapped: false });
    part(new THREE.ConeGeometry(.8, 2.6, 10, 1, true), toon("#1a1424", { side: THREE.DoubleSide, transparent: true, opacity: .88 }), 0, 1.3, 0, rig, .03);
    part(ball(.45), shade, 0, 2.8, 0, rig, .03).scale.set(.9, 1.2, .9);
    for (const ex of [-.15, .15]) { const e = part(new THREE.SphereGeometry(.08, 8, 6), eyeM, ex, 2.85, -.38, rig, 0); e.scale.set(1.4, .6, .5); }
    const arms = [];
    for (const side of [-1, 1]) { const p = new THREE.Group(); p.position.set(side * .45, 2.25, 0); rig.add(p); arms.push(p);
      part(cyl(.07, .04, 1.6, 6), shade, 0, -.8, 0, p, .015); for (let k = 0; k < 3; k++) part(new THREE.ConeGeometry(.04, .3, 4), shade, (k - 1) * .06, -1.7, 0, p, 0); }
    height = 3.4;
    anim = (dt, s) => {
      t += dt * 2.2;
      rig.position.y = .2 + Math.sin(t) * .12;
      arms.forEach((p, i) => { p.rotation.x = s.attack > 0 ? -2 * Math.sin(s.attack * Math.PI) : -.2 + Math.sin(t + i) * .15; p.rotation.z = (i ? -1 : 1) * .25; });
    };
  } else {                                          // 덩굴 귀신: a twist of vines with a glowing face
    const vine = toon("#3f6e2a"), leaf = toon("#6fbb48"), bark = toon("#5a4030");
    const strands = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, pts = [];
      for (let k = 0; k <= 6; k++) { const f = k / 6; pts.push(new THREE.Vector3(Math.cos(a + f * 3) * (.45 - f * .25), f * 2.4, Math.sin(a + f * 3) * (.45 - f * .25))); }
      strands.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .1, 5), vine, 0, 0, 0, rig, .02));
    }
    const head = part(ball(.45), bark, 0, 2.55, 0, rig, .03);
    const eyeM = new THREE.MeshBasicMaterial({ color: "#d6ff5a", toneMapped: false });
    for (const ex of [-.16, .16]) part(new THREE.SphereGeometry(.08, 8, 6), eyeM, ex, 2.6, -.4, rig, 0);
    for (let i = 0; i < 14; i++) part(ball(.18 + Math.random() * .12), leaf, (Math.random() - .5) * 1.1, 1 + Math.random() * 2, (Math.random() - .5) * 1.1, rig, 0);
    const arms = [];
    for (const side of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(side * .45, 1.9, 0); rig.add(p); arms.push(p);
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * .5, -.3, -.2), new THREE.Vector3(side * .7, -.9, -.4)];
      part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, .07, 5), vine, 0, 0, 0, p, .015);
    }
    height = 3.2;
    anim = (dt, s) => {
      t += dt * 2;
      rig.rotation.y = Math.sin(t * .7) * .15; rig.position.y = .15 + Math.sin(t) * .1;
      arms.forEach((p, i) => p.rotation.x = s.attack > 0 ? -1.6 * Math.sin(s.attack * Math.PI) : Math.sin(t + i) * .2);
    };
  }
  return { root, rig, height, anim: (dt, s) => { anim(dt, s); if (s.dead) { rig.rotation.z = Math.min(1.5, (rig.rotation.z || 0) + dt * 3); rig.position.y = Math.max(-.6, rig.position.y - dt); } } };
}
