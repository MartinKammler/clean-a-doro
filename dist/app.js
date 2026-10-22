const $ = (id) => document.getElementById(id);

const PHASES = ["clean", "short", "medium", "long"];
const NUMBER_FIELDS = {
  clean: [1, 240],
  short: [1, 240],
  medium: [1, 240],
  long: [1, 240],
  every: [1, 99],
  superEvery: [1, 99],
};
const SOUNDS = ["chime", "bell", "soft", "none"];
const defaults = {
  clean: 10,
  short: 10,
  medium: 30,
  long: 60,
  every: 3,
  superEvery: 6,
  sound: "chime",
  volume: 65,
};

const toInt = (value, min, max, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function sanitizeSettings(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [k, [min, max]] of Object.entries(NUMBER_FIELDS))
    out[k] = toInt(src[k], min, max, defaults[k]);
  out.sound = SOUNDS.includes(src.sound) ? src.sound : defaults.sound;
  out.volume = toInt(src.volume, 0, 100, defaults.volume);
  return out;
}

const freshState = () => ({
  phase: "clean",
  round: 0,
  remaining: cfg.clean * 60000,
  running: false,
  awaiting: false,
  end: 0,
});

function sanitizeState(raw) {
  if (!raw || typeof raw !== "object" || !PHASES.includes(raw.phase))
    return freshState();
  const full = cfg[raw.phase] * 60000;
  return {
    phase: raw.phase,
    round: toInt(raw.round, 0, 1e6, 0),
    remaining: toInt(raw.remaining, 0, full, full),
    running: raw.running === true,
    awaiting: raw.awaiting === true,
    end: Number.isFinite(Number(raw.end)) ? Number(raw.end) : 0,
  };
}

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

let cfg = sanitizeSettings(readJSON("cad-settings"));
let lang = "de";
try {
  lang = localStorage.getItem("cad-lang") || "de";
} catch {}
if (!["de", "en"].includes(lang)) lang = "de";
let state = sanitizeState(readJSON("cad-state"));

let audio = null;
let voices = [];
let wake = null;
let alarmLoop = null;
let busy = false;
let notifyAsked = false;

const words = {
  de: {
    tag: "Ein bisschen sauberer. Ganz entspannt.",
    settings: "Einstellungen",
    headline: "Kleine Schritte.<br>Sauberes Zuhause.",
    sub: "Ein Raum. Ein Anfang. Die Pause gehört dazu.",
    stop: "■  Stop / Abbruch",
    rhythm: "Dein Rhythmus",
    repeat: "Und dann wieder von vorn.",
    gentle: "Nicht alles auf einmal. Zehn Minuten sind ein guter Anfang.",
    local: "Deine Einstellungen bleiben auf diesem Gerät.",
    install: "App installieren ↗",
    notice:
      "Für zuverlässige Signaltöne die App geöffnet lassen. Bei gesperrtem Bildschirm kann der Browser Töne verzögern.",
    settingsHint:
      "Dein Tempo, deine Pausen. Änderungen starten einen neuen Ablauf.",
    sound: "Signalton",
    test: "♫ Ton anhören",
    volume: "Lautstärke",
    soundNote:
      "Die integrierten Töne werden synthetisch erzeugt. Keine externen Audioaufnahmen.",
    save: "Speichern & zurücksetzen",
    installHelp:
      "Im Browser-Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen. Auf iPhone/iPad: Safari → Teilen → Zum Home-Bildschirm. Nach dem ersten Laden auch offline nutzbar.",
    close: "Schließen",
    clean: "Putzen",
    short: "Kurze Pause",
    medium: "Lange Pause",
    long: "Große Pause",
    every: "Lange Pause alle … Runden",
    superEvery: "Große Pause alle … Runden",
    start: "▶  Los geht’s",
    resume: "▶  Weiter",
    pause: "Ⅱ  Anhalten",
    hint: "Schnapp dir eine kleine Aufgabe.",
    breakHint: "Durchatmen. Diese Zeit gehört dir.",
    doneHint: "Geschafft! Starte die nächste Phase, wenn du bereit bist.",
    dismiss: (next) => `✓ ${next} starten`,
    notifyTitle: "Clean-a-Doro: Zeit ist um",
    notifyBody: (next) => `Als Nächstes: ${next}. Tippen zum Öffnen.`,
    langLabel: "Switch to English",
    round: "Runde",
    next: "Danach",
    after: "Nach",
    rounds: "Runden",
    each: "Nach jeder Runde",
    minute: "Min.",
    chime: "Heller Chime",
    bell: "Glocke",
    soft: "Sanfte Töne",
    none: "Lautlos",
    theme: "Farbschema",
    mode: "Darstellung",
    lookNote: "Farben gelten sofort und setzen den Timer nicht zurück.",
    mint: "Mint",
    blue: "Blau",
    red: "Rot",
    green: "Grün",
    yellow: "Gelb",
    contrast: "Hoher Kontrast",
    auto: "Automatisch (wie System)",
    light: "Hell",
    dark: "Dunkel",
  },
  en: {
    tag: "A little cleaner. A little calmer.",
    settings: "Settings",
    headline: "Small steps.<br>A happier home.",
    sub: "One room. One start. Breaks are part of it.",
    stop: "■  Stop / reset",
    rhythm: "Your rhythm",
    repeat: "Then do it all again.",
    gentle: "Not all at once. Ten minutes is a lovely start.",
    local: "Your settings stay on this device.",
    install: "Install app ↗",
    notice:
      "Keep the app open for reliable sounds. When the screen is locked, your browser may delay alerts.",
    settingsHint: "Your pace, your breaks. Saving starts a fresh session.",
    sound: "Alert sound",
    test: "♫ Preview sound",
    volume: "Volume",
    soundNote: "Built-in sounds are synthesized. No external audio recordings.",
    save: "Save & reset",
    installHelp:
      "In your browser menu, choose “Install app” or “Add to home screen”. On iPhone/iPad: Safari → Share → Add to Home Screen. Works offline after the first load.",
    close: "Close",
    clean: "Cleaning",
    short: "Short break",
    medium: "Long break",
    long: "Extended break",
    every: "Long break every … rounds",
    superEvery: "Extended break every … rounds",
    start: "▶  Let’s start",
    resume: "▶  Continue",
    pause: "Ⅱ  Pause timer",
    hint: "Pick one small thing to tackle.",
    breakHint: "Take a breath. This time is yours.",
    doneHint: "Done! Start the next phase when you are ready.",
    dismiss: (next) => `✓ Start ${next.toLowerCase()}`,
    notifyTitle: "Clean-a-Doro: time’s up",
    notifyBody: (next) => `Up next: ${next}. Tap to open.`,
    langLabel: "Auf Deutsch umschalten",
    round: "Round",
    next: "Up next",
    after: "After",
    rounds: "rounds",
    each: "After each round",
    minute: "min",
    chime: "Bright chime",
    bell: "Bell",
    soft: "Soft notes",
    none: "Silent",
    theme: "Color scheme",
    mode: "Appearance",
    lookNote: "Colors apply right away and do not reset the timer.",
    mint: "Mint",
    blue: "Blue",
    red: "Red",
    green: "Green",
    yellow: "Yellow",
    contrast: "High contrast",
    auto: "Automatic (system)",
    light: "Light",
    dark: "Dark",
  },
};
const t = (k) => words[lang][k];

function persist() {
  try {
    localStorage.setItem("cad-state", JSON.stringify(state));
    localStorage.setItem("cad-settings", JSON.stringify(cfg));
    localStorage.setItem("cad-lang", lang);
  } catch {}
}

function breakFor(n) {
  return n % cfg.superEvery === 0
    ? "long"
    : n % cfg.every === 0
      ? "medium"
      : "short";
}

const nextPhase = () =>
  state.phase === "clean" ? breakFor(state.round + 1) : "clean";

function render() {
  document.documentElement.lang = lang;
  document
    .querySelectorAll("[data-t]")
    .forEach((el) => (el.innerHTML = t(el.dataset.t)));
  $("lang").textContent = lang === "de" ? "EN" : "DE";
  $("lang").setAttribute("aria-label", t("langLabel"));
  $("steps").innerHTML = PHASES.map((p, i) => {
    const label =
      i === 0
        ? t("clean")
        : i === 1
          ? t("each")
          : `${t("after")} ${i === 2 ? cfg.every : cfg.superEvery} ${t("rounds")}`;
    return `<div class="step" data-phase="${p}"><small>${label}</small><strong>${cfg[p]}</strong> <span>${t("minute")}</span></div>`;
  }).join("");
  // One full cycle as a strip, each segment as wide as its duration.
  let segments = "";
  for (let n = 1; n <= cfg.superEvery; n++) {
    const b = breakFor(n);
    segments +=
      `<i data-phase="clean" style="flex-grow:${cfg.clean}"></i>` +
      `<i data-phase="${b}" style="flex-grow:${cfg[b]}"></i>`;
  }
  $("cycle").innerHTML = segments;
  lastNow = -1;
  document
    .querySelectorAll("#sound option, #theme option, #mode option")
    .forEach((o) => (o.textContent = t(o.value)));
  lastHint = null;
  update();
}

let lastHint = null;
let lastNow = -1;
function update() {
  const ms = state.running
    ? Math.max(0, state.end - Date.now())
    : state.remaining;
  const seconds = Math.ceil(ms / 1000);
  const clock =
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0");
  $("clock").textContent = clock;
  $("phase").textContent = t(state.phase);
  $("round").textContent =
    t("round") +
    " " +
    (state.phase === "clean" ? state.round + 1 : state.round);

  const next = nextPhase();
  let hint, label;
  if (state.awaiting) {
    hint = t("doneHint");
    label = t("dismiss")(t(next));
  } else {
    hint = t(state.phase === "clean" ? "hint" : "breakHint");
    label = t(
      state.running
        ? "pause"
        : state.remaining < cfg[state.phase] * 60000
          ? "resume"
          : "start",
    );
  }
  // Only touch the live region when the text changes, so screen readers
  // announce phase changes without being spammed every 250 ms.
  if (hint !== lastHint) {
    $("hint").textContent = hint;
    lastHint = hint;
  }
  $("start").textContent = label;
  $("next").textContent =
    t("next") + ": " + cfg[next] + " " + t("minute") + " " + t(next);
  const done = Math.max(
    0,
    Math.min(100, 100 - (ms / (cfg[state.phase] * 60000)) * 100),
  );
  $("ring").style.strokeDashoffset = 100 - done;
  // Round caps would otherwise draw a lone dot at 0 %.
  $("ring").style.opacity = done > 0.2 ? 1 : 0;

  // Mark where we are in the cycle strip.
  const inCycle =
    state.phase === "clean"
      ? (state.round % cfg.superEvery) * 2
      : ((state.round - 1 + cfg.superEvery) % cfg.superEvery) * 2 + 1;
  if (inCycle !== lastNow) {
    const segs = $("cycle").children;
    segs[lastNow]?.classList.remove("now");
    segs[inCycle]?.classList.add("now");
    lastNow = inCycle;
  }

  document.body.classList.toggle("break", state.phase !== "clean");
  document.body.classList.toggle("ringing", !!state.awaiting);
  document.title = clock + " · " + t(state.phase) + " · Clean-a-Doro";
}

/* ---------- Audio ---------- */

async function unlock() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state !== "running") await audio.resume();
  } catch {}
}

function stopVoices() {
  for (const o of voices) {
    try {
      o.stop();
    } catch {}
  }
  voices = [];
}

function play(sound = cfg.sound, volume = cfg.volume) {
  if (sound === "none" || !audio) return;
  // A context that sat idle for a whole cleaning phase may have been
  // suspended by the OS; try to wake it before scheduling notes.
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const notes =
    sound === "bell"
      ? [659, 988]
      : sound === "soft"
        ? [392, 494, 587]
        : [523.25, 659.25, 783.99];
  notes.forEach((hz, i) => {
    const o = audio.createOscillator(),
      g = audio.createGain(),
      at = audio.currentTime + i * 0.22;
    o.type = "sine";
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime((volume / 100) * 0.25, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, at + 1.5);
    o.connect(g);
    g.connect(audio.destination);
    o.onended = () => (voices = voices.filter((v) => v !== o));
    o.start(at);
    o.stop(at + 1.6);
    voices.push(o);
  });
}

/* ---------- Wake lock ---------- */

async function wakeLock() {
  const wanted = (state.running || state.awaiting) && !document.hidden;
  try {
    if (wanted && navigator.wakeLock) {
      if (!wake || wake.released) {
        wake = await navigator.wakeLock.request("screen");
        wake.addEventListener("release", () => (wake = null));
      }
    } else if (!wanted && wake) {
      const w = wake;
      wake = null;
      await w.release();
    }
  } catch {}
}

/* ---------- Notifications ---------- */

async function askNotify() {
  if (notifyAsked || !("Notification" in window)) return;
  notifyAsked = true;
  try {
    if (Notification.permission === "default")
      await Notification.requestPermission();
  } catch {}
}

async function notify() {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !document.hidden
  )
    return;
  const next = t(nextPhase());
  const options = {
    body: t("notifyBody")(next),
    tag: "cad-alarm",
    renotify: true,
    requireInteraction: true,
    icon: "icon-192.png",
    badge: "icon-192.png",
    vibrate: [300, 150, 300, 150, 300],
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(t("notifyTitle"), options);
    else new Notification(t("notifyTitle"), options);
  } catch {}
}

async function clearNotify() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const list = (await reg?.getNotifications({ tag: "cad-alarm" })) || [];
    list.forEach((n) => n.close());
  } catch {}
}

/* ---------- Alarm ---------- */

function startAlarmLoop() {
  play();
  clearInterval(alarmLoop);
  alarmLoop = setInterval(() => play(), 3500);
}

function silence() {
  clearInterval(alarmLoop);
  alarmLoop = null;
  stopVoices();
  clearNotify();
}

function tick() {
  if (state.running && Date.now() >= state.end) {
    state.remaining = 0;
    state.running = false;
    state.awaiting = true;
    startAlarmLoop();
    notify();
    persist();
    wakeLock();
  }
  update();
}

/* ---------- Controls ---------- */

$("start").onclick = async () => {
  if (busy) return;
  busy = true;
  try {
    if (state.awaiting) {
      // Advance synchronously before any await so a second tap
      // cannot advance the phase twice.
      state.awaiting = false;
      if (state.phase === "clean") {
        state.round++;
        state.phase = breakFor(state.round);
      } else state.phase = "clean";
      state.remaining = cfg[state.phase] * 60000;
      state.end = Date.now() + state.remaining;
      state.running = true;
      silence();
    } else if (state.running) {
      state.remaining = Math.max(0, state.end - Date.now());
      state.running = false;
    } else {
      state.end = Date.now() + state.remaining;
      state.running = true;
    }
    persist();
    update();
    await unlock();
    wakeLock();
    askNotify();
  } finally {
    busy = false;
  }
};

function reset() {
  silence();
  state = freshState();
  persist();
  wakeLock();
  render();
}
$("stop").onclick = reset;

$("lang").onclick = () => {
  lang = lang === "de" ? "en" : "de";
  persist();
  render();
};

$("settings").onclick = () => {
  $("fields").innerHTML = Object.entries(NUMBER_FIELDS)
    .map(
      ([k, [min, max]]) =>
        `<label><span>${t(k)}${PHASES.includes(k) ? " (" + t("minute") + ")" : ""}</span><input type="number" id="cfg-${k}" min="${min}" max="${max}" step="1" required value="${cfg[k]}"></label>`,
    )
    .join("");
  $("sound").value = cfg.sound;
  $("volume").value = cfg.volume;
  $("theme").value = look.theme;
  $("mode").value = look.mode;
  $("dialog").showModal();
};
$("theme").onchange = $("mode").onchange = () => {
  look = { theme: $("theme").value, mode: $("mode").value };
  saveLook();
  applyLook();
};
$("close").onclick = () => $("dialog").close();
$("test").onclick = async () => {
  await unlock();
  play($("sound").value, Number($("volume").value));
};
$("form").onsubmit = (e) => {
  e.preventDefault();
  const raw = { sound: $("sound").value, volume: $("volume").value };
  for (const k of Object.keys(NUMBER_FIELDS)) raw[k] = $("cfg-" + k).value;
  cfg = sanitizeSettings(raw);
  $("dialog").close();
  reset();
};

let installPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
$("install").onclick = async () => {
  if (installPrompt) {
    await installPrompt.prompt();
    installPrompt = null;
  } else $("installDialog").showModal();
};
$("installClose").onclick = () => $("installDialog").close();

// After a reload the browser blocks audio until the user interacts.
// Any tap unlocks it so a pending alarm becomes audible again.
document.addEventListener(
  "pointerdown",
  () => {
    if (!audio || audio.state !== "running") unlock();
  },
  { capture: true },
);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    tick();
    clearNotify();
  }
  wakeLock();
});
window.addEventListener("pagehide", persist);

if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});

render();
if (state.awaiting) startAlarmLoop();
tick();
wakeLock();
setInterval(tick, 250);
