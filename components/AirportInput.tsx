"use client";

// The Where part of the search bar: a text box that suggests airports as you type a name or a code.
// It follows the editable combobox pattern. Select.tsx is the pick-only one; the list looks the same in both.

import { Check } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import type { SelectOption } from "./Select";
import { segmentLabel, segmentShape } from "./ui";

export function AirportInput({ value, options, onChange }: { value: string; options: SelectOption[]; onChange: (value: string) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // null: not typing, so the box shows the chosen airport. A string: what has been typed since it was focused.
  const [text, setText] = useState<string | null>(null);
  // -1: nothing highlighted yet, so Enter searches with the airport already chosen.
  const [active, setActive] = useState(-1);

  const current = options.find((option) => option.value === value);
  const query = (text ?? "").trim().toLowerCase();
  const matches = query ? options.filter((o) => o.label.toLowerCase().includes(query) || o.tag?.toLowerCase().startsWith(query)) : options;
  const open = text !== null;

  function choose(option: SelectOption) {
    if (option.value !== value) onChange(option.value);
    input.current?.blur(); // closes the list and shows the choice
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(Math.max(0, Math.min(active + step, matches.length - 1)));
    } else if (event.key === "Escape") {
      input.current?.blur();
    } else if (event.key === "Enter" && matches[active]) {
      choose(matches[active]); // not prevented: Enter also sends the search form
    }
  }

  return (
    <div className="relative">
      <label
        className={`block cursor-text rounded-[inherit] ${segmentShape} hover:bg-surface-2 focus-within:bg-canvas focus-within:shadow-[0_3px_12px_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.1)]`}
      >
        <span className={segmentLabel}>Where</span>
        <input
          ref={input}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Search airports"
          // 16px on phones: iOS zooms the page when a smaller text box is focused.
          // No ring on the box itself: the whole segment lifts while it has focus.
          className="block h-5 w-full truncate bg-transparent text-base text-ink outline-none! placeholder:text-ink-soft sm:text-sm"
          value={text ?? (value && current ? current.label : "")}
          onFocus={() => {
            setText("");
            setActive(-1);
          }}
          onBlur={() => setText(null)}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </label>

      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Airports"
          // Keep focus in the box while an option is pressed, or the list would close before the click lands.
          onMouseDown={(event) => event.preventDefault()}
          className="pop absolute left-0 top-full z-20 mt-3 max-h-80 w-max min-w-full max-w-[calc(100vw-2rem)] origin-top-left overflow-auto rounded-3xl border border-line bg-surface p-2 shadow-[0_8px_28px_rgb(0_0_0/0.28)]"
        >
          {matches.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => choose(option)}
              onPointerMove={() => setActive(index)}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-2 ${index === active ? "bg-surface-2" : ""}`}
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-wider ${
                  option.value === value ? "bg-green text-on-green" : "bg-line"
                }`}
              >
                {option.tag}
              </span>
              <span className="font-medium">{option.label}</span>
              <Check size={18} weight="bold" aria-hidden className={`ml-auto shrink-0 pl-0.5 text-green-ink ${option.value === value ? "" : "invisible"}`} />
            </li>
          ))}
          {matches.length === 0 && <li className="px-3 py-4 text-ink-soft">No airport matches &ldquo;{text?.trim()}&rdquo;.</li>}
        </ul>
      )}
    </div>
  );
}
