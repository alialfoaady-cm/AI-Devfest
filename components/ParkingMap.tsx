"use client";

// Where a car is parked, on Google Maps. The pin is always drawn at the middle of the map:
// an owner drags the map under it (pass onMove); everyone else gets a still map centred on the car.
// No types package: only the few Maps calls used here are typed, below.

import { MapPin } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Pin } from "@/lib/types";
import { useTheme, type Theme } from "./theme";

type GMap = {
  getCenter(): { lat(): number; lng(): number } | undefined;
  panTo(point: Pin): void;
  setOptions(options: Record<string, unknown>): void;
  addListener(event: string, handler: () => void): unknown;
};
type MapsLibrary = { Map: new (element: HTMLElement, options: Record<string, unknown>) => GMap };

declare global {
  interface Window {
    google?: { maps: { importLibrary(name: "maps"): Promise<MapsLibrary> } };
    __sayaraMaps?: () => void;
    gm_authFailure?: () => void;
  }
}

// The map in the app's own neutrals, one set per theme. `styles` works with any key and needs no map ID.
const paint = (land: string, built: string, road: string, highway: string, water: string, label: string, halo: string) => [
  { elementType: "geometry", stylers: [{ color: land }] },
  { elementType: "labels.text.fill", stylers: [{ color: label }] },
  { elementType: "labels.text.stroke", stylers: [{ color: halo }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: road }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: highway }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: built }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: built }] },
  { featureType: "transit.station.airport", elementType: "geometry", stylers: [{ color: built }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: water }] },
];
const STYLES: Record<Theme, unknown[]> = {
  light: paint("#f5f5f5", "#ebebeb", "#ffffff", "#dcdcdc", "#d9e4ea", "#5c5c5c", "#ffffff"),
  dark: paint("#161616", "#1f1f1f", "#2c2c2c", "#3a3a3a", "#0b1418", "#a8a8a8", "#000000"),
};
const LAND: Record<Theme, string> = { light: "#f5f5f5", dark: "#161616" };

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

let library: Promise<MapsLibrary> | null = null;
function loadMaps(): Promise<MapsLibrary> {
  library ??= new Promise<MapsLibrary>((resolve, reject) => {
    const ready = () => window.google!.maps.importLibrary("maps").then(resolve, reject);
    if (window.google?.maps) return void ready();
    window.__sayaraMaps = ready;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&loading=async&callback=__sayaraMaps`;
    script.async = true;
    script.onerror = () => {
      library = null; // let the next map try again
      reject(new Error("Google Maps did not load."));
    };
    document.head.append(script);
  });
  return library;
}

export function ParkingMap({
  center,
  label,
  onMove,
  className = "",
}: {
  center: Pin;
  /** Rides on the pin: the bay number, or the car's name before it is booked. */
  label?: string;
  /** Pass it to let the user drag the map; called with the new middle each time the map settles. */
  onMove?: (pin: Pin) => void;
  className?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<GMap | null>(null);
  const reported = useRef(center); // the last middle the parent knows about
  const moved = useRef(onMove);
  const [lifted, setLifted] = useState(false);
  const [problem, setProblem] = useState("");
  const editable = Boolean(onMove);
  const theme = useTheme();
  const themeNow = useRef(theme);

  useEffect(() => {
    moved.current = onMove;
    themeNow.current = theme;
  });

  // No key: Google would cover a small map with its own warning, so people who are only looking
  // get a still tile with the pin. The owner's editor still loads the live map, warning and all.
  const still = !KEY && !editable;

  useEffect(() => {
    if (still) return;
    let cancelled = false;
    window.gm_authFailure = () => setProblem("Google Maps turned down the API key. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
    loadMaps().then(
      ({ Map }) => {
        if (cancelled || !element.current) return;
        const created = new Map(element.current, {
          center: reported.current,
          zoom: 18,
          styles: STYLES[themeNow.current],
          backgroundColor: LAND[themeNow.current],
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: editable ? "greedy" : "none",
          keyboardShortcuts: editable, // arrow keys pan the map: the keyboard way to move the pin
        });
        map.current = created;
        created.addListener("dragstart", () => setLifted(true));
        created.addListener("idle", () => {
          setLifted(false);
          const middle = created.getCenter();
          if (!middle || !moved.current) return;
          const next = { lat: middle.lat(), lng: middle.lng() };
          if (next.lat === reported.current.lat && next.lng === reported.current.lng) return;
          reported.current = next;
          moved.current(next);
        });
      },
      () => setProblem("The map could not load. Check the connection and reload."),
    );
    return () => {
      cancelled = true;
    };
  }, [editable, still]);

  // The theme changed while the map was open: repaint it.
  useEffect(() => {
    map.current?.setOptions({ styles: STYLES[theme] });
  }, [theme]);

  // The parent moved the pin itself ("Use my location", or another car was picked): follow it.
  useEffect(() => {
    if (center.lat === reported.current.lat && center.lng === reported.current.lng) return;
    reported.current = center;
    map.current?.panTo(center);
  }, [center]);

  return (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      <div
        ref={element}
        className={`absolute inset-0 ${still ? "bg-[repeating-linear-gradient(90deg,transparent_0_38px,var(--line)_38px_39px),repeating-linear-gradient(0deg,transparent_0_38px,var(--line)_38px_39px)]" : ""}`}
        aria-label={editable ? "Map. Drag it, or use the arrow keys, to put the pin on your car." : "Map of where the car is parked"}
      />

      {problem ? (
        <p className="absolute inset-0 flex items-center justify-center bg-surface p-6 text-center font-medium">{problem}</p>
      ) : (
        <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
          {!editable && <span className="ping absolute -left-2 -top-2 size-4 rounded-full bg-green" />}
          <span
            className={`absolute -left-1.5 -top-1 h-2 w-3 rounded-[50%] bg-black/40 transition-[scale,opacity] duration-150 ease-out ${
              lifted ? "scale-150 opacity-40" : ""
            }`}
          />
          <div
            className={`absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center transition-[translate] duration-150 ease-out ${
              lifted ? "-translate-y-3" : ""
            }`}
          >
            {label && (
              <span className="mb-0.5 whitespace-nowrap rounded-full bg-green px-3 py-0.5 font-semibold tabular-nums text-on-green">
                {label}
              </span>
            )}
            <MapPin size={44} weight="fill" className="-mb-1 text-green" />
          </div>
        </div>
      )}
    </div>
  );
}

/** A plain link out, for walking directions or when the embedded map is not enough. */
export const mapsLink = (pin: Pin) => `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`;
