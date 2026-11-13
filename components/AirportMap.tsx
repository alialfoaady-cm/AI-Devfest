// The picture on the welcome screen: an airport seen from above, with one car pinned in the
// parking deck at night. It is drawn, not a live map, so it loads at once and before anyone has
// signed in, and it keeps its own dark colours in both themes, like the bar across the top.
// Decorative: the text beside it says everything it shows.
// The box keeps the drawing's 800:620 shape, so the pin (placed in percent) stays on its bay.
import { MapPin } from "@phosphor-icons/react";

const ROWS = [0, 1, 2, 3];
const BAYS = Array.from({ length: 13 }, (_, i) => i);

export function AirportMap({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden style={style} className={`relative isolate aspect-[40/31] overflow-hidden rounded-2xl bg-[#0c0c0c] ${className}`}>
      <svg viewBox="0 0 800 620" className="absolute inset-0 size-full">
        {/* Two runways, running off both edges. */}
        <g transform="rotate(-24 400 310)">
          {[90, 190].map((y) => (
            <g key={y}>
              <rect x="-200" y={y} width="1200" height="46" rx="4" className="fill-[#1c1c1c]" />
              <line x1="-200" x2="1000" y1={y + 23} y2={y + 23} className="stroke-[#3a3a3a]" strokeWidth="3" strokeDasharray="34 26" />
              {[0, 9, 18, 27].map((dy) => (
                <rect key={dy} x="120" y={y + 6 + dy} width="34" height="5" className="fill-[#3a3a3a]" />
              ))}
            </g>
          ))}
          {/* Taxiways between them and down to the terminal. */}
          <path d="M260 136 V190 M520 136 V190 M390 236 V300 Q390 330 420 330 H560" className="fill-none stroke-[#1c1c1c]" strokeWidth="18" />
        </g>

        {/* The terminal: a long concourse with piers. */}
        <g className="fill-[#242424]">
          <rect x="330" y="318" width="390" height="34" rx="12" />
          <rect x="372" y="268" width="26" height="62" rx="10" />
          <rect x="512" y="268" width="26" height="62" rx="10" />
          <rect x="652" y="268" width="26" height="62" rx="10" />
        </g>
        <text x="525" y="340" textAnchor="middle" className="fill-[#8c8c8c] text-[13px] font-medium tracking-wide">
          Terminal
        </text>

        {/* The road in from the highway, looping past the terminal and the deck. */}
        <path
          d="M-20 560 C140 548 190 470 300 452 S560 470 640 430 S760 372 820 380"
          className="fill-none stroke-[#2a2a2a]"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M-20 560 C140 548 190 470 300 452 S560 470 640 430 S760 372 820 380"
          className="fill-none stroke-[#555]"
          strokeWidth="2"
          strokeDasharray="10 12"
        />

        {/* The parking deck, bay by bay. */}
        <rect x="296" y="476" width="356" height="124" rx="14" className="fill-[#141414] stroke-[#2f2f2f]" strokeWidth="1.5" />
        {ROWS.map((row) =>
          BAYS.map((bay) => (
            <rect
              key={`${row}-${bay}`}
              x={312 + bay * 25}
              y={488 + row * 26}
              width="19"
              height="20"
              rx="3"
              className={row === 1 && bay === 8 ? "fill-green" : (row * 5 + bay * 3) % 4 === 0 ? "fill-[#1d1d1d]" : "fill-[#2e2e2e]"}
            />
          )),
        )}
        <text x="300" y="468" className="fill-[#8c8c8c] text-[13px] font-medium tracking-wide">
          Parking
        </text>
      </svg>

      {/* The pin sits on the green bay: (521.5, 524) in the drawing. */}
      <div className="absolute" style={{ left: `${(521.5 / 800) * 100}%`, top: `${(524 / 620) * 100}%` }}>
        <span className="ping absolute -left-2 -top-2 size-4 rounded-full bg-green" />
        <div className="absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center">
          <span className="mb-0.5 whitespace-nowrap rounded-full bg-green px-3 py-0.5 font-semibold tabular-nums text-on-green">B-214</span>
          <MapPin size={44} weight="fill" className="-mb-1 text-green" />
        </div>
      </div>
    </div>
  );
}
