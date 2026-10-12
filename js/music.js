// Music (decision 30): calm in safe places, tense in fights, uneasy at night (later: very anxious near aliens).
// All CC0 from OpenGameArt — see assets/music/CREDITS.txt. Two <audio> players crossfade when the mood changes.
const M = "assets/music/";
const MOODS = {
  station: ["calm1-home.ogg", "calm2-friends.ogg", "calm6-innocence.ogg"],
  day: ["calm3-peaceful.ogg", "calm5-summer.ogg", "calm4-sandcastles.ogg"],
  night: ["scifi-sector.mp3", "scifi-pulse.mp3"],
  fight: ["action1-witches.ogg", "action2-army.ogg", "action3-battle.ogg"],
  alien: ["scifi-urgent.mp3"],
};
const FADE = 1.8;
let volume = .5, mood = null, last = {}, players = [], cur = null, unlocked = false;
function make() { const a = new Audio(); a.preload = "auto"; a.volume = 0; a.onended = () => { if (a === cur?.el) next(); }; return { el: a, target: 0 }; }
function pickTrack(m) { const list = MOODS[m], opts = list.filter(t => t !== last[m]); const t = opts[Math.floor(Math.random() * opts.length)] || list[0]; last[m] = t; return M + t; }
function next() {
  if (!mood || !unlocked) return;
  if (!players.length) players = [make(), make()];
  const idle = players.find(p => p !== cur) || players[0];
  idle.el.src = pickTrack(mood); idle.el.currentTime = 0; idle.el.loop = mood === "fight"; idle.el.volume = 0;
  idle.el.play().catch(() => {});
  if (cur) cur.target = 0;
  idle.target = 1; cur = idle;
}
export function unlockMusic() { if (unlocked) return; unlocked = true; if (mood) next(); }
export function setMusicMood(m) { if (m === mood) return; mood = m; next(); }
export function setMusicVolume(v) { volume = v; }
export function musicTick(dt) {
  for (const p of players) {
    const want = p.target * volume, v = p.el.volume, step = dt / FADE;
    p.el.volume = Math.max(0, Math.min(1, v < want ? Math.min(want, v + step) : Math.max(want, v - step)));
    if (p.target === 0 && p.el.volume === 0 && !p.el.paused) p.el.pause();
  }
}
