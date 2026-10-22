// Loaded in <head> so the chosen colours apply before the first paint.
// Colour choices are stored apart from the timer settings, so changing
// them never resets a running session.
const THEMES = ["mint", "blue", "red", "green", "yellow", "contrast"];
const MODES = ["auto", "light", "dark"];
const darkQuery = matchMedia("(prefers-color-scheme: dark)");

function readLook() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem("cad-look"));
  } catch {}
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    theme: THEMES.includes(src.theme) ? src.theme : "mint",
    mode: MODES.includes(src.mode) ? src.mode : "auto",
  };
}

function saveLook() {
  try {
    localStorage.setItem("cad-look", JSON.stringify(look));
  } catch {}
}

function applyLook() {
  const root = document.documentElement;
  root.dataset.theme = look.theme;
  root.dataset.scheme =
    look.mode === "auto" ? (darkQuery.matches ? "dark" : "light") : look.mode;
  // Keep the browser / status bar in step with the page background.
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.content = bg;
    m.removeAttribute("media");
  });
}

let look = readLook();
applyLook();
darkQuery.addEventListener("change", applyLook);
