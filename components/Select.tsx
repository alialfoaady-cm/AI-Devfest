"use client";

// The app's dropdown. Its two looks match `field` and `Segment` in ui.tsx: change them together.
// It replaces the browser's own <select> so the list can carry a tag per
// option (an airport's three-letter code, set like a bag tag) and look the same on every device.
// Keyboard and screen-reader behaviour follow the standard select-only combobox pattern:
// arrows, Home, End, Enter, Space, Escape, and typing a letter to jump.

import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { segmentLabel, segmentShape } from "./ui";

export type SelectOption = { value: string; label: string; tag?: string };

const LOOK = {
  /** A form field with its label above. */
  field: {
    label: "block font-medium",
    button: "mt-1.5 flex h-14 w-full items-center gap-2 rounded-xl bg-surface-2 px-4 text-left",
    value: "flex min-w-0 flex-1 items-center gap-2",
  },
  /** One part of a `searchBar`: the whole segment is the button. */
  segment: {
    label: segmentLabel,
    button: `block w-full rounded-[inherit] ${segmentShape} hover:bg-surface-2 aria-expanded:bg-canvas aria-expanded:shadow-[0_3px_12px_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.1)]`,
    value: "flex h-5 items-center gap-2 text-sm text-ink-soft",
  },
};

export function Select({
  label,
  value,
  options,
  onChange,
  variant = "field",
  align = "start",
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  variant?: keyof typeof LOOK;
  /** Which edge of the control the list lines up with. Use "end" for a control near the right edge. */
  align?: "start" | "end";
}) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = Math.max(0, options.findIndex((option) => option.value === value));
  const current = options[selected];
  const look = LOOK[variant];

  // A tap anywhere else closes the list. (Blur alone is not enough: phones do not focus buttons on tap.)
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  function show() {
    setActive(selected);
    setOpen(true);
  }

  function choose(index: number) {
    setOpen(false);
    if (options[index].value !== value) onChange(options[index].value);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const { key } = event;
    const last = options.length - 1;

    if (key.length === 1 && key !== " ") {
      // Typing jumps to a match, as a native select does: "t" for Toronto, "dtw" for the code.
      const now = Date.now();
      const text = (now - typed.current.at > 600 ? "" : typed.current.text) + key.toLowerCase();
      typed.current = { text, at: now };
      const hit = options.findIndex((o) => o.tag?.toLowerCase().startsWith(text) || o.label.toLowerCase().startsWith(text));
      if (hit >= 0) (open ? setActive : choose)(hit);
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (key === "Tab") return choose(active); // keep the highlighted choice and let focus move on
    const moves: Record<string, () => void> = {
      Escape: () => setOpen(false),
      ArrowDown: () => setActive(Math.min(active + 1, last)),
      ArrowUp: () => setActive(Math.max(active - 1, 0)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => choose(active),
      " ": () => choose(active),
    };
    if (moves[key]) {
      event.preventDefault();
      moves[key]();
    }
  }

  return (
    <div ref={wrap} className="relative">
      {variant === "field" && (
        <span id={`${id}-label`} className={look.label} onClick={() => button.current?.focus()}>
          {label}
        </span>
      )}
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        // Space activates a button on key-up; the choice was already made on key-down.
        onKeyUp={(event) => event.key === " " && event.preventDefault()}
        className={`${look.button} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink`}
      >
        {variant === "segment" && (
          <span id={`${id}-label`} className={look.label}>
            {label}
          </span>
        )}
        <span className={look.value}>
          <span id={`${id}-value`} className="flex min-w-0 items-baseline gap-2">
            {current.tag && <span className="text-sm font-bold tracking-wider">{current.tag}</span>}
            <span className="truncate">{current.label}</span>
          </span>
          <CaretDown
            size={16}
            weight="bold"
            aria-hidden
            className={`ml-auto shrink-0 text-ink-soft transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          // Keep focus on the button while an option is pressed, so the keyboard keeps working after a click.
          onMouseDown={(event) => event.preventDefault()}
          className={`pop absolute top-full z-20 mt-3 max-h-80 w-max min-w-full max-w-[calc(100vw-2rem)] overflow-auto rounded-3xl border border-line bg-surface p-2 shadow-[0_8px_28px_rgb(0_0_0/0.28)] ${
            align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          }`}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === selected}
              onClick={() => choose(index)}
              onPointerMove={() => setActive(index)}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-2 ${index === active ? "bg-surface-2" : ""}`}
            >
              {option.tag && (
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-wider transition-colors duration-150 ${
                    index === selected ? "bg-green text-on-green" : "bg-line"
                  }`}
                >
                  {option.tag}
                </span>
              )}
              <span className="font-medium">{option.label}</span>
              <Check
                size={18}
                weight="bold"
                aria-hidden
                className={`ml-auto shrink-0 pl-0.5 text-green-ink ${index === selected ? "" : "invisible"}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
