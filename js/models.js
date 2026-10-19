// Characters and monsters, built from simple shapes in the same toon style as the world.
// Every model: { root, anim(dt, state) }  where state = { moving, speed, attack (0..1 swing), hurt, dead }
import * as THREE from "three";
import { toon, outline } from "./world.js?v=mveyiwdb";

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
  } else if (kind === "muinseok") {               // 무인석: a stone tomb guardian (a civil official with a tall hat and a tablet), stomps
    const rr = (a, b) => a + Math.random() * (b - a), st = toon("#a8a294"), stD = toon("#8a8476"), moss = toon("#7a8a5a");
    const body = part(new THREE.BoxGeometry(1.3, 2.6, 1), st, 0, 1.5, 0, rig, .05); body.scale.set(1, 1, 1);
    part(new THREE.BoxGeometry(1.5, .3, 1.2), stD, 0, .2, 0, rig, .03);
    const head = part(new THREE.BoxGeometry(.9, 1, .85), st, 0, 3.3, 0, rig, .04);
    part(new THREE.BoxGeometry(.95, .7, .7), stD, 0, 4.1, .1, rig, .03);   // the 복두 hat
    part(new THREE.BoxGeometry(1.3, .12, .3), stD, 0, 3.85, .35, rig, .02);
    const eyeM = new THREE.MeshBasicMaterial({ color: "#ffb43a", toneMapped: false });
    for (const ex of [-.2, .2]) part(new THREE.BoxGeometry(.18, .07, .05), eyeM, ex, 3.4, -.44, rig, 0);
    part(new THREE.BoxGeometry(.25, .5, .1), stD, 0, 3.1, -.45, rig, .01);   // the nose
    const armL = limb(rig, -.75, 2.5, -.2, 1.1, .2, st), armR = limb(rig, .75, 2.5, -.2, 1.1, .2, st);
    part(new THREE.BoxGeometry(.3, 1.2, .1), toon("#c8c0ae"), .1, -.9, -.4, armR, .02);   // the 홀 tablet
    for (let i = 0; i < 6; i++) part(new THREE.SphereGeometry(rr(.08, .16), 6, 5), moss, rr(-.6, .6), rr(.5, 3), rr(-.5, .5), rig, 0);
    height = 4.6;
    anim = (dt, s) => {
      t += dt * (s.moving ? 6 : 1.5);
      rig.position.y = s.moving ? Math.abs(Math.sin(t)) * .25 : 0; rig.rotation.z = s.moving ? Math.sin(t) * .06 : 0;
      armL.rotation.x = -.9; armR.rotation.x = s.attack > 0 ? -2.2 * Math.sin(s.attack * Math.PI) : -.9;
      if (s.slam > 0) rig.position.y = Math.sin(s.slam * Math.PI) * 1.6;
      head.rotation.y = Math.sin(t * .3) * .2;
    };
  } else if (kind === "celadon") {                // 청자 도깨비: a jade-green celadon vase with a crane pattern, a goblin face and little legs
    const jade = toon("#8fc4b0"), jadeD = toon("#5f9a86"), crane = toon("#f2f2ee");
    const legL = limb(rig, -.3, .55, 0, .55, .1, jadeD), legR = limb(rig, .3, .55, 0, .55, .1, jadeD);
    const body = part(new THREE.SphereGeometry(.85, 16, 12), jade, 0, 1.4, 0, rig, .04); body.scale.set(1, 1.15, 1);
    part(cyl(.32, .45, .5, 12), jade, 0, 2.45, 0, rig, .03); part(cyl(.42, .32, .18, 12), jadeD, 0, 2.75, 0, rig, .02);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; const c = part(new THREE.BoxGeometry(.32, .08, .02), crane, Math.sin(a) * .86, 1.5 + (i % 2) * .3, Math.cos(a) * .86, rig, 0); c.rotation.y = a; }
    const eyeM = new THREE.MeshBasicMaterial({ color: "#fff36a", toneMapped: false });
    for (const ex of [-.25, .25]) part(new THREE.SphereGeometry(.09, 8, 6), eyeM, ex, 1.75, -.82, rig, 0);
    part(new THREE.BoxGeometry(.4, .08, .05), toon("#2a3a34"), 0, 1.45, -.86, rig, 0);
    const crack = part(new THREE.BoxGeometry(.04, .7, .03), toon("#2a3a34"), .3, 1.3, -.8, rig, 0); crack.rotation.z = .4;
    height = 3.1;
    anim = (dt, s) => {
      t += dt * (s.moving ? 9 : 2);
      legL.rotation.x = s.moving ? Math.sin(t) * .7 : 0; legR.rotation.x = s.moving ? -Math.sin(t) * .7 : 0;
      rig.rotation.z = Math.sin(t * .8) * (s.moving ? .12 : .05); rig.position.y = s.attack > 0 ? Math.sin(s.attack * Math.PI) * .5 : 0;
      body.scale.set(1 + (s.attack > 0 ? .1 * Math.sin(s.attack * Math.PI) : 0), 1.15, 1);
    };
  } else if (kind === "armour" || kind === "general") {   // 빈 갑옷 / 깨어난 장군 갑옷: empty lamellar armour, no one inside, a glow where the face should be
    const big = kind === "general", iron = toon(big ? "#6a4a2a" : "#5a5f66"), lam = toon(big ? "#c8402f" : "#8a3a2a"), gold = toon("#e0b43a"), dark = toon("#1a1416");
    const legL = limb(rig, -.35, 1.1, 0, 1.05, .16, dark), legR = limb(rig, .35, 1.1, 0, 1.05, .16, dark);
    const torso = part(new THREE.CylinderGeometry(.65, .8, 1.6, 10), lam, 0, 1.9, 0, rig, .05);
    for (let r = 0; r < 4; r++) part(new THREE.CylinderGeometry(.82 - r * .03, .84 - r * .03, .08, 10), gold, 0, 1.2 + r * .45, 0, rig, 0);
    part(new THREE.SphereGeometry(.45, 12, 10, 0, 6.3, 0, 1.6), iron, 0, 2.95, 0, rig, .04);   // helmet
    part(new THREE.ConeGeometry(.08, .7, 6), gold, 0, 3.55, 0, rig, .02);
    part(new THREE.CylinderGeometry(.5, .6, .35, 12, 1, true), iron, 0, 2.75, 0, rig, .02);
    const glow = new THREE.MeshBasicMaterial({ color: big ? "#ff5a3a" : "#9ec8ff", toneMapped: false });
    part(new THREE.BoxGeometry(.5, .12, .05), glow, 0, 2.85, -.48, rig, 0);
    const armL = limb(rig, -.85, 2.4, 0, 1.1, .15, iron), armR = limb(rig, .85, 2.4, 0, 1.1, .15, iron);
    const blade = part(new THREE.BoxGeometry(.1, 1.8, .2), toon("#d8dce0"), 0, -1.6, -.3, armR, .02); part(new THREE.BoxGeometry(.4, .08, .3), gold, 0, -.75, -.3, armR, 0);
    const plates = [];
    if (big) for (let i = 0; i < 4; i++) { const p = part(new THREE.BoxGeometry(.7, .6, .14), gold, (i % 2 ? .38 : -.38), 2.2 - Math.floor(i / 2) * .7, -.82, rig, .02); plates.push(p); }
    for (const sx of [-1, 1]) part(new THREE.BoxGeometry(.6, .25, .7), gold, sx * .85, 2.65, 0, rig, .02);   // shoulder guards
    height = 3.9;
    anim = (dt, s) => {
      t += dt * (s.moving ? 7 : 1.5);
      legL.rotation.x = s.moving ? Math.sin(t) * .5 : 0; legR.rotation.x = s.moving ? -Math.sin(t) * .5 : 0;
      armL.rotation.x = s.moving ? -Math.sin(t) * .3 : -.2; armR.rotation.x = s.attack > 0 ? -2.4 * Math.sin(s.attack * Math.PI) : -.4;
      rig.position.y = .12 + Math.sin(t * .5) * .06;   // it floats a little: nobody is inside
      plates.forEach((p, i) => p.visible = i < (s.plates ?? 4));
      glow.color.set(s.charge > 0 ? "#ffffff" : big ? "#ff5a3a" : "#9ec8ff");
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
  } else if (kind === "magpie") {                 // 까치 요괴 (연남동): a big magpie that swoops and pecks; black and white with a blue sheen
    const black = toon("#1d1a24"), white = toon("#f4f2ec"), blue = toon("#2f4fa0"), beakM = toon("#2a2522");
    const body = part(ball(.55), black, 0, 0, 0, rig, .03); body.scale.set(.9, .85, 1.3);
    const fly = new THREE.Group(); fly.position.y = 1.7; rig.add(fly); fly.add(body); body.position.set(0, 0, 0);
    part(ball(.42), white, 0, -.15, .05, fly, 0).scale.set(.85, .7, 1.1);
    const head = part(ball(.34), black, 0, .45, -.6, fly, .025);
    part(new THREE.ConeGeometry(.09, .4, 6), beakM, 0, .42, -1, fly, .01).rotation.x = -Math.PI / 2;
    const eyeM = new THREE.MeshBasicMaterial({ color: "#ff3a3a", toneMapped: false });
    for (const ex of [-.17, .17]) part(new THREE.SphereGeometry(.06, 8, 6), eyeM, ex, .52, -.85, fly, 0);
    const tail = part(new THREE.BoxGeometry(.28, .06, 1.2), blue, 0, .05, 1.1, fly, .015); tail.rotation.x = -.25;
    const wings = [];
    for (const side of [-1, 1]) { const p = new THREE.Group(); p.position.set(side * .45, .2, 0); fly.add(p); wings.push(p);
      part(new THREE.BoxGeometry(1.2, .06, .7), black, side * .6, 0, 0, p, .015); part(new THREE.BoxGeometry(.6, .065, .5), white, side * .5, .005, .05, p, 0); part(new THREE.BoxGeometry(.5, .07, .55), blue, side * 1.05, .005, .1, p, 0); }
    for (const side of [-1, 1]) part(cyl(.03, .03, .5, 5), beakM, side * .15, -.6, .1, fly, 0);
    height = 2.6;
    anim = (dt, s) => {
      t += dt * (s.moving ? 14 : 8);
      wings.forEach((p, i) => p.rotation.z = (i ? -1 : 1) * Math.sin(t) * .7);
      fly.position.y = 1.7 + Math.sin(t * .3) * .2 - (s.attack > 0 ? Math.sin(s.attack * Math.PI) * .8 : 0);
      fly.rotation.x = s.attack > 0 ? .6 * Math.sin(s.attack * Math.PI) : .1; head.rotation.x = s.attack > 0 ? .5 * Math.sin(s.attack * Math.PI) : 0;
    };
  } else if (kind === "book") {                   // 책 귀신 (신촌): a haunted textbook that flaps open and shoots its pages
    const cover = toon("#7a2a2a"), page = toon("#f6f0e0"), gold = toon("#e0b43a");
    const fly = new THREE.Group(); fly.position.y = 1.8; rig.add(fly);
    const halves = [];
    for (const side of [-1, 1]) { const p = new THREE.Group(); fly.add(p); halves.push(p);
      part(new THREE.BoxGeometry(.9, .08, 1.3), cover, side * .45, 0, 0, p, .02); part(new THREE.BoxGeometry(.82, .12, 1.2), page, side * .43, .08, 0, p, 0);
      part(new THREE.BoxGeometry(.5, .085, .08), gold, side * .45, .005, -.45, p, 0); }
    const loose = [];
    for (let i = 0; i < 6; i++) { const pg = part(new THREE.PlaneGeometry(.35, .45), toon("#f6f0e0", { side: THREE.DoubleSide }), 0, 0, 0, fly, 0); loose.push(pg); }
    const eyeM = new THREE.MeshBasicMaterial({ color: "#ffd23d", toneMapped: false });
    for (const ex of [-.25, .25]) part(new THREE.SphereGeometry(.08, 8, 6), eyeM, ex, .2, -.62, fly, 0);
    height = 2.8;
    anim = (dt, s) => {
      t += dt * 3;
      const open = .5 + Math.sin(t * 1.4) * .3 + (s.attack > 0 ? Math.sin(s.attack * Math.PI) * .6 : 0);
      halves[0].rotation.z = open; halves[1].rotation.z = -open;
      fly.position.y = 1.8 + Math.sin(t) * .25; fly.rotation.y = Math.sin(t * .5) * .3;
      loose.forEach((pg, i) => { const a = t * 1.5 + i * 1.05; pg.position.set(Math.cos(a) * 1.1, .3 + Math.sin(a * 1.7) * .4, Math.sin(a) * 1.1); pg.rotation.set(a, a * .7, 0); });
    };
  } else if (kind === "spark") {                  // 전기 도깨비 (당인리 발전소): a yellow goblin full of electricity, a coil on its head, sparks all around
    const yel = toon("#f2c43a"), dark = toon("#3a3f4a"), copper = toon("#c87a3a");
    const legL = limb(rig, -.28, .65, 0, .65, .14, dark), legR = limb(rig, .28, .65, 0, .65, .14, dark);
    const body = part(ball(.7), yel, 0, 1.3, 0, rig, .04);
    for (let k = 0; k < 4; k++) part(cyl(.42 - k * .06, .42 - k * .06, .06, 12), copper, 0, 2.05 + k * .14, 0, rig, 0);
    const tip = part(new THREE.SphereGeometry(.14, 10, 8), new THREE.MeshBasicMaterial({ color: "#bfe8ff", toneMapped: false }), 0, 2.7, 0, rig, 0);
    const eyeM = new THREE.MeshBasicMaterial({ color: "#7af0ff", toneMapped: false });
    for (const ex of [-.24, .24]) part(new THREE.SphereGeometry(.11, 8, 6), eyeM, ex, 1.5, -.62, rig, 0);
    part(new THREE.BoxGeometry(.42, .08, .05), dark, 0, 1.18, -.68, rig, 0);
    const armL = limb(rig, -.68, 1.5, 0, .6, .1, yel), armR = limb(rig, .68, 1.5, 0, .6, .1, yel);
    const sparks = [], sM = new THREE.MeshBasicMaterial({ color: "#fff36a", toneMapped: false });
    for (let i = 0; i < 7; i++) { const sp = part(new THREE.BoxGeometry(.04, .38, .04), sM, 0, 0, 0, rig, 0); sparks.push(sp); }
    height = 2.9;
    anim = (dt, s) => {
      t += dt * (s.moving ? 10 : 3);
      legL.rotation.x = s.moving ? Math.sin(t) * .8 : 0; legR.rotation.x = s.moving ? -Math.sin(t) * .8 : 0;
      armR.rotation.x = s.attack > 0 ? -2.2 * Math.sin(s.attack * Math.PI) : Math.sin(t) * .3; armL.rotation.x = -Math.sin(t) * .3;
      body.scale.setScalar(1 + Math.sin(t * 2.3) * .03); tip.scale.setScalar(1 + Math.random() * .5);
      sparks.forEach((sp, i) => { const a = t * 2 + i * .9; sp.position.set(Math.cos(a) * .9, 1.3 + Math.sin(a * 1.9) * .7, Math.sin(a) * .9); sp.rotation.set(a * 3, 0, a * 2); sp.visible = Math.random() < .7; });
    };
  } else if (kind === "watergh") {                // 물귀신 (선유도공원): a dripping water ghost with long wet hair that grabs your ankles
    const water = toon("#6ab0d8", { transparent: true, opacity: .75 }), hair = toon("#0f1418"), deep = toon("#3a7aa8", { transparent: true, opacity: .8 });
    part(new THREE.ConeGeometry(.75, 2.4, 12, 1, true), toon("#5aa0c8", { side: THREE.DoubleSide, transparent: true, opacity: .7 }), 0, 1.25, 0, rig, .03);
    const head = part(ball(.4), water, 0, 2.7, 0, rig, .03);
    for (let i = 0; i < 9; i++) { const a = (i / 9 - .5) * 2.6 + Math.PI, len = 1.2 + (i % 3) * .3; const h = part(new THREE.BoxGeometry(.09, len, .05), hair, Math.sin(a) * .36, 2.85 - len / 2, Math.cos(a) * .36, rig, 0); h.rotation.x = Math.cos(a) * .12; }
    for (let i = 0; i < 4; i++) { const a = (i / 4 - .375) * 1.4; const h = part(new THREE.BoxGeometry(.09, .9, .05), hair, Math.sin(a) * .3, 2.55, -.36, rig, 0); }
    const eyeM = new THREE.MeshBasicMaterial({ color: "#e8fbff", toneMapped: false });
    for (const ex of [-.13, .13]) part(new THREE.SphereGeometry(.05, 8, 6), eyeM, ex, 2.72, -.39, rig, 0);
    const armL = limb(rig, -.5, 2.1, 0, 1, .07, deep), armR = limb(rig, .5, 2.1, 0, 1, .07, deep);
    const drops = [], dM = toon("#9fd8ff");
    for (let i = 0; i < 6; i++) { const d = part(new THREE.SphereGeometry(.06, 6, 5), dM, 0, 0, 0, rig, 0); drops.push({ d, y: Math.random() * 2.5, x: (Math.random() - .5) * 1.2, z: (Math.random() - .5) * 1.2 }); }
    height = 3.3;
    anim = (dt, s) => {
      t += dt * 2;
      rig.position.y = .1 + Math.sin(t) * .1; head.rotation.z = Math.sin(t * .7) * .12;
      const reach = s.attack > 0 ? Math.sin(s.attack * Math.PI) : 0;
      armL.rotation.x = -1.3 - reach * .6 + Math.sin(t) * .1; armR.rotation.x = -1.3 - reach * .6 - Math.sin(t) * .1;
      for (const p of drops) { p.y -= dt * 2.5; if (p.y < 0) { p.y = 2.4; p.x = (Math.random() - .5) * 1.2; p.z = (Math.random() - .5) * 1.2; } p.d.position.set(p.x, p.y, p.z); }
      if (s.slam > 0) rig.scale.set(1 + s.slam * .25, 1 - s.slam * .2, 1 + s.slam * .25); else rig.scale.setScalar(1);
    };
  } else if (kind === "wisp") {                   // 도깨비불 (사육신 공원): a floating blue-green flame with a face; bursts when it goes out
    const fM = [new THREE.MeshBasicMaterial({ color: "#3ad8c8", transparent: true, opacity: .55, toneMapped: false, depthWrite: false }), new THREE.MeshBasicMaterial({ color: "#9ff8e8", transparent: true, opacity: .8, toneMapped: false, depthWrite: false }), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false })];
    const fly = new THREE.Group(); fly.position.y = 1.6; rig.add(fly);
    const outer = part(new THREE.SphereGeometry(.75, 14, 10), fM[0], 0, 0, 0, fly, 0), mid = part(new THREE.SphereGeometry(.5, 12, 8), fM[1], 0, 0, 0, fly, 0), core = part(new THREE.SphereGeometry(.25, 10, 8), fM[2], 0, 0, 0, fly, 0);
    const tongue = part(new THREE.ConeGeometry(.55, 1.6, 12), fM[0], 0, .95, 0, fly, 0);
    const eyeM = new THREE.MeshBasicMaterial({ color: "#0a2a2a" });
    for (const ex of [-.2, .2]) part(new THREE.SphereGeometry(.09, 8, 6), eyeM, ex, .1, -.62, fly, 0).scale.set(1, 1.5, .5);
    part(new THREE.TorusGeometry(.13, .03, 6, 12, Math.PI), eyeM, 0, -.15, -.66, fly, 0).rotation.z = Math.PI;
    const embers = [];
    for (let i = 0; i < 5; i++) { const e = part(new THREE.SphereGeometry(.08, 6, 5), fM[1], 0, 0, 0, fly, 0); embers.push(e); }
    height = 2.8;
    anim = (dt, s) => {
      t += dt * 4;
      fly.position.y = 1.6 + Math.sin(t * .6) * .3;
      const f = 1 + Math.sin(t * 2.7) * .08 + (s.attack > 0 ? Math.sin(s.attack * Math.PI) * .35 : 0);
      outer.scale.setScalar(f); mid.scale.setScalar(1 + Math.sin(t * 3.3) * .1); tongue.scale.set(f, 1 + Math.sin(t * 2) * .25, f); tongue.rotation.z = Math.sin(t * 1.3) * .2;
      embers.forEach((e, i) => { const a = t * .8 + i * 1.25, y = ((t * .4 + i * .3) % 1.5); e.position.set(Math.cos(a) * .6, .4 + y, Math.sin(a) * .6); e.scale.setScalar(1 - y / 1.5); });
    };
  } else if (kind === "neongob") {                // 네온 도깨비 (이태원): a goblin drawn in neon tubes, pink and cyan, that throws glowing orbs
    const pink = new THREE.MeshBasicMaterial({ color: "#ff3d8b", toneMapped: false, transparent: true }), cyan = new THREE.MeshBasicMaterial({ color: "#35e3ff", toneMapped: false }), dim = toon("#1a1424", { transparent: true, opacity: .55 });
    const tube = (pts, m, r = .07, closed = false) => part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed), 24, r, 6, closed), m, 0, 0, 0, rig, 0);
    part(ball(.8), dim, 0, 1.6, 0, rig, 0).scale.set(1, 1.15, .7);
    const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ring.push([Math.cos(a) * .82, 1.6 + Math.sin(a) * .95, -.3]); } tube(ring, pink, .08, true);
    for (const sx of [-1, 1]) tube([[sx * .35, 2.4, -.3], [sx * .55, 2.85, -.3], [sx * .5, 3.15, -.3]], cyan, .06);
    for (const ex of [-.28, .28]) { const e = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2; e.push([ex + Math.cos(a) * .13, 1.85 + Math.sin(a) * .13, -.62]); } tube(e, cyan, .04, true); }
    tube([[-.35, 1.25, -.62], [-.12, 1.1, -.66], [.12, 1.1, -.66], [.35, 1.25, -.62]], pink, .05);
    const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.3, .75, 0); legR.position.set(.3, .75, 0); rig.add(legL, legR);
    for (const L of [legL, legR]) part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -.75, 0)]), 4, .07, 6), cyan, 0, 0, 0, L, 0);
    const armR = new THREE.Group(); armR.position.set(.8, 1.7, -.2); rig.add(armR);
    part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.2, -.5, -.2), new THREE.Vector3(.2, -.9, -.5)]), 8, .06, 6), pink, 0, 0, 0, armR, 0);
    const orb = part(new THREE.SphereGeometry(.18, 10, 8), cyan, .2, -.95, -.55, armR, 0);
    height = 3.4;
    anim = (dt, s) => {
      t += dt * (s.moving ? 9 : 2.5);
      legL.rotation.x = s.moving ? Math.sin(t) * .7 : 0; legR.rotation.x = s.moving ? -Math.sin(t) * .7 : 0;
      armR.rotation.x = s.attack > 0 ? -2.2 * Math.sin(s.attack * Math.PI) : Math.sin(t * .5) * .2;
      const flick = Math.random() < .04 ? .3 : 1; pink.opacity = flick; orb.scale.setScalar(1 + Math.sin(t * 3) * .2);
      rig.position.y = Math.sin(t * .5) * .05;
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
