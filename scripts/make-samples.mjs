// Draws the 12 placeholder photos in public/samples. Run: node scripts/make-samples.mjs
// The return set adds a scratch on the back and a darker left side, matching lib/inspection/mock.ts.
import { writeFileSync } from "node:fs";

const W = 800, H = 600, BODY = "#2f6fd0", GLASS = "#b9d4ee", DARK = "#1c2433";
const wheel = (x, y, r = 46) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${DARK}"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#9aa3b2"/>`;

const side = (flip) => `<g transform="${flip ? `translate(${W},0) scale(-1,1)` : ""}">
  <path d="M90 400 L110 320 L250 300 L330 210 L560 210 L640 300 L700 320 L715 400 Z" fill="${BODY}"/>
  <path d="M345 225 L440 225 L440 298 L285 298 Z M460 225 L550 225 L610 298 L460 298 Z" fill="${GLASS}"/>
  <rect x="690" y="330" width="26" height="22" rx="4" fill="#ffd34d"/><rect x="88" y="330" width="22" height="26" rx="4" fill="#d83a2e"/>
  ${wheel(230, 400)}${wheel(590, 400)}</g>`;

const end = (rear) => `
  <path d="M220 420 L220 300 L275 190 L525 190 L580 300 L580 420 Z" fill="${BODY}"/>
  <path d="M290 205 L510 205 L548 290 L252 290 Z" fill="${GLASS}"/>
  <rect x="235" y="315" width="70" height="34" rx="8" fill="${rear ? "#d83a2e" : "#ffe9a3"}"/><rect x="495" y="315" width="70" height="34" rx="8" fill="${rear ? "#d83a2e" : "#ffe9a3"}"/>
  <rect x="340" y="360" width="120" height="34" rx="4" fill="#f4f5f7"/><text x="400" y="384" font-family="sans-serif" font-size="20" text-anchor="middle" fill="${DARK}">DEMO</text>
  <rect x="210" y="405" width="380" height="30" rx="8" fill="${DARK}"/>
  <rect x="235" y="430" width="50" height="50" rx="8" fill="${DARK}"/><rect x="515" y="430" width="50" height="50" rx="8" fill="${DARK}"/>`;

const interior = `
  <rect x="80" y="120" width="640" height="380" rx="30" fill="#3a4354"/>
  <rect x="140" y="230" width="220" height="240" rx="28" fill="#6b7689"/><rect x="170" y="150" width="160" height="90" rx="20" fill="#6b7689"/>
  <rect x="440" y="230" width="220" height="240" rx="28" fill="#6b7689"/><rect x="470" y="150" width="160" height="90" rx="20" fill="#6b7689"/>
  <rect x="375" y="300" width="50" height="170" rx="10" fill="${DARK}"/>`;

const dash = (km, fuel) => `
  <rect x="60" y="150" width="680" height="330" rx="40" fill="${DARK}"/>
  <circle cx="250" cy="310" r="120" fill="#0f141d" stroke="#9aa3b2" stroke-width="6"/><line x1="250" y1="310" x2="320" y2="250" stroke="#ff5a4d" stroke-width="8"/>
  <circle cx="560" cy="310" r="120" fill="#0f141d" stroke="#9aa3b2" stroke-width="6"/>
  <text x="560" y="275" font-family="sans-serif" font-size="26" text-anchor="middle" fill="#9aa3b2">FUEL ${fuel}</text>
  <rect x="455" y="300" width="210" height="56" rx="8" fill="#e9f2e4"/><text x="560" y="340" font-family="monospace" font-size="36" text-anchor="middle" fill="${DARK}">${km} km</text>`;

const SCRATCH = `<path d="M250 425 l34 -9 l28 6 l40 -8" stroke="#f4f5f7" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M262 434 l52 -5" stroke="#f4f5f7" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const SHADE = `<rect width="${W}" height="${H}" fill="#000" opacity="0.45"/>`;

const draw = (inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#c9ced6"/><rect y="440" width="${W}" height="160" fill="#8b929e"/>
  <rect x="40" y="520" width="14" height="80" fill="#ffc914"/><rect x="746" y="520" width="14" height="80" fill="#ffc914"/>
  ${inner}
  <text x="24" y="40" font-family="sans-serif" font-size="22" fill="${DARK}">Sample photo: ${label}</text></svg>`;

const shots = {
  "pickup-front": end(false), "return-front": end(false),
  "pickup-back": end(true), "return-back": end(true) + SCRATCH,
  "pickup-left": side(false), "return-left": side(false) + SHADE,
  "pickup-right": side(true), "return-right": side(true),
  "pickup-interior": interior, "return-interior": interior,
  "pickup-dashboard": dash(48210, "3/4"), "return-dashboard": dash(48682, "1/2"),
};

for (const [name, inner] of Object.entries(shots)) {
  writeFileSync(new URL(`../public/samples/${name}.svg`, import.meta.url), draw(inner, name.replace("-", ", ")));
}
console.log(`Wrote ${Object.keys(shots).length} sample photos.`);
