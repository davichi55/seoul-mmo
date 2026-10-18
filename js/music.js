// Music (decision 30): calm in safe places, tense in fights, uneasy at night (later: very anxious near aliens).
// All CC0 from OpenGameArt — see assets/music/CREDITS.txt. Two <audio> players crossfade when the mood changes.
// Danny 2026-10-18: every file is normalised to the same loudness (−20 dB mean; the alien track was 25 dB quieter and felt like
// silence), and going back to a mood picks its track up where it was instead of a new track from the start.
const M = "assets/music/";
const MOODS = {
  station: ["calm1-home.ogg", "calm2-friends.ogg", "calm6-innocence.ogg"],
  day: ["calm3-peaceful.ogg", "calm5-summer.ogg", "calm4-sandcastles.ogg"],
  night: ["scifi-sector.mp3", "scifi-pulse.mp3"],
  fight: ["action1-witches.ogg", "action2-army.ogg", "action3-battle.ogg"],
  alien: ["scifi-urgent.mp3"],
};
const FADE = 1.8;
let volume = .35, mood = null, last = {}, players = [], cur = null, unlocked = false;
const saved = {};   // mood → { src, t }: where its track was when we left it
function make() { const a = new Audio(); a.preload = "auto"; a.volume = 0; const p = { el: a, target: 0, mood: null }; a.onended = () => { if (p === cur) next(true); }; return p; }
function pickTrack(m) { const list = MOODS[m], opts = list.filter(t => t !== last[m]); const t = opts[Math.floor(Math.random() * opts.length)] || list[0]; last[m] = t; return M + t; }
function next(fresh) {
  if (!mood || !unlocked) return;
  if (!players.length) players = [make(), make()];
  if (cur?.mood && !cur.el.ended) saved[cur.mood] = { src: cur.el.src, t: cur.el.currentTime };
  const back = !fresh && players.find(p => p !== cur && p.mood === mood && p.el.src && !p.el.ended);
  if (back) {   // still fading out (or paused) with this mood's track: just bring it back
    if (cur) cur.target = 0;
    back.target = 1; cur = back; if (back.el.paused) back.el.play().catch(() => {});
    return;
  }
  const idle = players.find(p => p !== cur) || players[0], sv = !fresh && saved[mood];
  idle.el.src = sv ? sv.src : pickTrack(mood); idle.el.loop = mood === "fight"; idle.el.volume = 0; idle.mood = mood;
  if (sv && sv.t > 0) idle.el.addEventListener("loadedmetadata", () => { try { idle.el.currentTime = sv.t; } catch (e) {} }, { once: true });
  else idle.el.currentTime = 0;
  idle.el.play().catch(() => {});
  if (cur) cur.target = 0;
  idle.target = 1; cur = idle;
}
export function unlockMusic() { if (unlocked) return; unlocked = true; if (mood) next(); }
export function setMusicMood(m) { if (m === mood) return; mood = m; next(); }
export function setMusicVolume(v) { volume = v; }
export function musicTick(dt) {
  for (const p of players) {
    const want = p.target * volume, v = p.el.volume, step = dt / FADE * Math.max(volume, .05);   /* a whole fade takes FADE s at any volume */
    p.el.volume = Math.max(0, Math.min(1, v < want ? Math.min(want, v + step) : Math.max(want, v - step)));
    if (p.target === 0 && p.el.volume === 0 && !p.el.paused) p.el.pause();
  }
}
