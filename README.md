# Sayara (AI-Devfest)

A hackathon project. Travellers lend their parked car at the airport, earn credits, and spend the credits on a car where they land.

**If you are an AI assistant helping on this project, read this whole file first.** It is the single source of truth for the idea, the rules, the judging criteria, what is decided and what is still open. Section 12 lists how to work on it.

---

## 1. The idea in one sentence

Your car sits at the airport while you travel. Lend it to someone landing in your city, earn credits, and spend them on a car where you land.

## 2. The problem

- Flying out means paying for airport parking: about $100–200 a week (estimate, not verified).
- Landing somewhere means paying for a rental car: about $300–600 a week (estimate, not verified).
- Meanwhile cars sit unused in airport lots while the people arriving in that city need cars.

## 3. How it works

1. **Lend.** Before flying out, the owner lists their car: model, seats, airport, and the dates they are away. They park it, drop a pin on the spot, and leave the key in a Sayara locker at the airport.
2. **Earn.** While the owner is away, travellers landing at that airport can borrow the car. Each borrowed day earns the owner 35 credits (1 credit = 1 mile, and a day includes 35), paid when the car comes back.
3. **Spend.** At their destination, the owner searches that airport for cars free on their dates and books one with credits. They get the locker code, find the car by its pin, and drive it.
4. **Return.** The borrower returns the car before their flight home. The owner gets the credits.

It is **not** a direct swap. Any number of travellers can use a car one after another, as long as it is back before its owner lands. Think of it as an airport car-lending library paid for in credits.

## 4. Judging criteria (this decides every design choice)

Each submission is scored out of 25, five points per criterion. How well IBM technology is used is also graded.

| Criterion | What judges look for | What it means for Sayara |
|---|---|---|
| Completeness and feasibility | A thought-out plan, a working proof of concept, a clear use of **IBM technology** | One demo flow that works every time; IBM AI doing a visible job |
| Creativity and innovation | An original use of AI on the stated issue; different from what is on the market | The credit system (no cash) and the AI photo check at each handover |
| Design and usability | Good design, easy to use, quick to adopt | A phone-friendly flow with few steps |
| Effectiveness and efficiency | A relevant issue within the hackathon theme, measurable impact, room to scale | A dollar figure on screen; more airports as the scaling story |
| Michigan impact | Keeps value, jobs and opportunity in Michigan; positions Michigan as a technology innovator | See section 5 |

## 5. Michigan angle

Status: **proposed, not yet confirmed by the team.**

- Home airport in the demo: Detroit Metro (DTW).
- Story: the Motor City invents a new way to use cars. Money that now goes to national rental chains stays with Michigan car owners.
- Show a number on screen, for example "$412 kept in Michigan this trip", worked out from the parking and rental costs avoided.
- Known weak spot: the criterion says "value, jobs and opportunity". Sayara keeps value with residents but creates no jobs, and it takes revenue from airport parking and local rental desks. The pitch needs a rehearsed answer to that.

## 6. Rules

These are the booking rules. Treat them as fixed.

- 1 credit = 1 mile. A day includes 35 miles, so a day costs 35 credits. A trip from Dec 20 to Dec 27 is 7 days: 245 credits, with 245 miles included. (The first version charged 1 credit per day; the iPhone app on the `app` branch still does.)
- A car shows up in a search only if it is at the chosen airport, is not the searcher's own car, and its free window covers the whole trip.
- **The owner's return date is a hard cutoff.** Nobody can book past the date the owner lands.
- Two bookings on the same car cannot overlap. Back-to-back is allowed: one person returns on Dec 27 and the next picks up on Dec 27.
- A user cannot book without enough credits. Credits are taken when the booking is made.
- The owner earns the credits **when the car is returned**, not when it is booked.
- A returned booking cannot be returned a second time.
- A trip must be at least 1 day.
- Any price can be paid in credits, in dollars, or part in each: 1 credit = $1.50. Credits are used first and dollars cover the rest. There is no payment provider yet, so the dollar part is recorded and nothing is charged. The owner is always paid in credits.
- Insurance is bought per trip, before pickup, on the Insurance tab: 10 credits a day ($15). With it, Sayara pays for damage the owner confirms. Without it, the borrower pays. It records who is responsible; no repair money moves in the app.
- Either person on a trip can cancel it before pickup. The borrower gets their payment back. Whoever cancels pays the other person's parking for the trip's days (estimated at $20 a day, paid to them in credits) plus a 15% cut for Sayara. A cancelled trip frees the car's dates. By the team's choice the app shows this fee only in the cancel window, not on listings or at booking.
- Planned, not built: a late return costs the borrower extra credits.
- Each mile past a trip's total costs 1 more credit. It moves from the borrower to the owner when the car is returned, and can take the borrower below zero. The miles come from the two dashboard photos; if the odometer cannot be read there is no charge. `mileageCharge` in `lib/rules.ts` takes a different rate as its third argument, for a rate worked out per car.

## 7. Features, in build order

### Built in a local prototype (not in this repository yet)
- Find a car: pick an airport and dates, get the available cars
- Book with credits
- Lend my car: list a car with the dates the owner is away
- My trips: return a car, and see who borrowed your car and what you earned
- A user switcher (two demo users) so one laptop can show both sides
- A reset button, sample data, and tests for every rule in section 6

The prototype is a plain HTML, CSS and JavaScript web app with no build step. It saves data in the browser's localStorage, and its demo airports are Toronto (YYZ) and Vancouver (YVR).

### Must build next
1. **AI photo check-in and check-out** (the feature that carries the demo)
   - At pickup and at return, the app walks the user through the same 6 photos: front, back, left side, right side, interior, and the dashboard (odometer and fuel). An outline on screen keeps the angles the same.
   - Each before photo and after photo is sent to an AI vision model, which returns JSON:
     ```json
     {
       "new_damage": [{"location": "rear bumper, left", "type": "scratch", "severity": "minor", "confidence": 0.8}],
       "odometer_km": 48210,
       "fuel_level": "1/2",
       "notes": "Photo 2 is darker; dirt on door, not damage"
     }
     ```
   - Show the before and after photos side by side with the damage marked, plus kilometres driven and fuel used.
   - **The AI flags damage, and the owner confirms or disputes it. The AI never decides who pays.**
   - Low-confidence results show as "unsure", not as damage. Warn the user when a photo is too dark.
2. **Locker code.** It appears only after the check-in photos are done. A fake 4-digit code is fine.
3. **Car location.** Show the parking pin on a static map image.
4. **Impact number.** Show the dollars kept in Michigan (section 5).

### Only if there is time
5. **Trip search in plain words.** The user types, for example, *"Flying to Detroit Dec 20–27, 2 adults, 3 kids, going skiing"*. The AI turns that into an airport, dates and needs (7 seats, room for skis, winter tires). The app's own database finds the matching cars, and the AI ranks them with a one-line reason each. The AI must **never** make up cars or dates. Keep the plain search form as a backup.
6. A shared database, so two phones see the same bookings.
7. Sign-in.

### Not in the hackathon build
Real lockers, ID checks, payments and cash rentals, insurance, km-based pricing, a native mobile app.

## 8. Data model

```js
users:       { id, name, credits }
cars:        { id, ownerId, airport, model, seats, from, to }   // from/to = the owner's away window
bookings:    { id, carId, userId, from, to, days, status }      // status: "booked" | "returned"
inspections: { id, bookingId, phase, photos, aiResult, ownerDecision }  // planned; phase: "pickup" | "return"; photos: 6 URLs
```

Dates are `"YYYY-MM-DD"` strings, which compare correctly as text.

The rule functions in the prototype, for anyone rebuilding them:

```js
tripDays(from, to)                               // whole days between two dates
overlaps(a, b)                                   // a.from < b.to && b.from < a.to
availableCars(state, airport, from, to, userId)  // applies the search rules in section 6
book(state, userId, carId, from, to)             // checks the rules, takes credits, adds a booking
returnCar(state, bookingId)                      // marks it returned, pays the owner
```

## 9. Tech stack

| Part | Choice | Status |
|---|---|---|
| App | Next.js (App Router), TypeScript, Tailwind CSS. One repo: the pages and the server routes live together | Built |
| Accounts | Email and password. Passwords are stored as salted scrypt hashes; the browser holds a random session token in an httpOnly cookie (`lib/server/auth.ts`) | Built |
| Browsing | Anyone can open every section without an account and see the cars, their photos and the days they are free. Pressing Book or listing a car opens the sign-in window; the server refuses every change from a visitor. A visitor is never sent a parking spot, a trip photo or anyone's name beyond an owner's first name (`viewFor` in `lib/server/actions.ts`) | Built |
| Data | One JSON file on the server, `.data/sayara.json`, plus uploaded photos in `.data/photos/` (`lib/server/db.ts`). Every phone and laptop that opens the site shares it | Built. A file on one machine's disk: fine for one server, not for serverless hosting |
| Changes | The browser never edits data. It posts an action to `/api/action`; the server checks who is signed in and what they sent, then runs the pure rules (`lib/server/actions.ts`) | Built |
| Privacy | `/api/state` sends each user only what they may see: a car's pin and spot number only to its owner and to people who booked it, trip photos only to the two people on that trip, nobody else's balance | Built |
| Booking rules | Pure functions in `lib/rules.ts`, one Vitest test per rule in section 6 | Built |
| Phone photos | `<input type="file" accept="image/*" capture>`, shrunk in the browser to 720 px on the long edge before upload | Built |
| AI, mock mode | `lib/inspection/mock.ts` returns canned answers so the flow runs with no credentials. This is the default, and the only mode where the drawn sample photos are offered | Built |
| AI, real | IBM watsonx.ai, called only from the server in `lib/inspection/watsonx.ts` | **Not built yet.** The model is not chosen |
| Map | Google Maps JavaScript API for the parking pin (`components/ParkingMap.tsx`). The owner drags the map under a fixed pin; the borrower sees the pin and the spot number | Built. Needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |

An earlier plan used a plain HTML and JavaScript app, and before that Google Gemini and Firebase. Both are replaced. The first Next.js build kept everything in the browser's localStorage with two built-in demo users; that is replaced by real accounts and the server-side data file.

### Run it

```bash
npm install
npm run dev      # http://localhost:3000, mock AI
npm test         # booking rules, inspection checks, and who may do and see what
```

- **Settings:** copy `.env.example` to `.env.local` (git-ignored).
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: the Google Maps key. It is meant for the browser, so it is the one variable with the `NEXT_PUBLIC_` prefix. Without it the map loads with Google's "for development purposes only" notice.
  - `INSPECTION_PROVIDER=mock` or `watsonx`, and the IBM variables. Never give these the `NEXT_PUBLIC_` prefix, or the key reaches the browser.
- **Two devices, or in front of judges:** use the production build, `npm run build` then `npm start -- -H 0.0.0.0`, and open `http://<laptop-ip>:3000` on the phone. Both see the same cars and trips, because the data is on the laptop. The dev server refuses to load the app for any host other than `localhost`.
- **Start over:** stop the server and delete the `.data` folder. A new data file starts with 50 demo listings at 8 US airports (`lib/seed/listings.json`, photos in `public/cars/`, credits in `public/cars/CREDITS.md`); their made-up owners have no accounts. Create an account to borrow one, or list your own car and sign in as someone else to borrow it. New accounts start with 245 credits, a first week (`STARTING_CREDITS` in `lib/config.ts`).
- **Sample photos:** drawn placeholders in `public/samples`, made by `node scripts/make-samples.mjs`, offered on the photo steps only while the AI is the mock.

### How the photo check is wired

1. `ReturnCheck` in `components/trip/steps.tsx` calls `compareInspection(before, after, slot)` from `lib/inspection/client.ts` once per photo slot.
2. That function stitches the pair into one image (`lib/inspection/stitch.ts`: pickup on the left, return on the right, at most 1120 px) and posts it to `/api/inspect`. Stitching needs a canvas, so it happens in the browser. To change how the pair is packed, change `stitch.ts` and the prompt.
3. The route picks an adapter from `INSPECTION_PROVIDER`. Every adapter has the shape in `lib/inspection/adapter.ts`: one stitched image and a slot in, the model's raw answer out.
4. `lib/inspection/validate.ts` checks the answer against the JSON shape in section 7. A failed check gives `null`.
5. `lib/inspection/verdict.ts` decides what the screen says: `null` or a finding under 60% confidence is "unsure", never "damage". The 60% line is `MIN_DAMAGE_CONFIDENCE` in `lib/config.ts`.

Two additions to the data model in section 8: the AI result carries `odometer_before_km` next to `odometer_km` (kilometres driven needs both readings, and the stitched image shows both dashboards), and a return inspection stores one AI result per photo slot plus `aiProvider`.

### Where things are

| Folder | What is in it |
|---|---|
| `app/` | The screens: `page.tsx` (find a car), `trips/`, `lend/`. And the server routes under `app/api/`: `auth`, `state`, `action`, `photo`, `inspect` |
| `components/` | What the screens are built from: the shell, the sign-in window, the search bar and dropdown, the map, the photo steps, the return report |
| `lib/` | The rules and data shapes, shared by browser and server: `rules.ts`, `cars.ts`, `inspections.ts`, `types.ts`, `config.ts` |
| `lib/server/` | Server only: the data file (`db.ts`), accounts (`auth.ts`), and what each user may do and see (`actions.ts`) |
| `lib/inspection/` | The photo comparison: stitching, the adapter, validation, verdicts. `watsonx.ts` goes here |
| `lib/store.ts` | The browser's copy of the data: fetches it, refreshes it every few seconds, sends actions |

Shared by everyone, so change with care: `lib/types.ts`, `lib/config.ts`, `app/globals.css`, `components/ui.tsx`.

## 10. The demo (3 minutes)

Use a **toy car** for the photos. Add the "damage" with washable marker or a sticker. Use only made-up users, cars and locker codes.

1. **Hook (15 s):** "Airport parking costs $150 a week. A rental costs $400. Your car is sitting in a lot doing nothing."
2. **Lend:** user B lists a car at their home airport.
3. **Earn:** user A's car sits at DTW. User B lands in Detroit, books it for 7 days, does the photo check-in, and the locker code unlocks.
4. **Return:** user B does the photo check-out on the toy car with fresh marker "damage". The AI spots the scratch. User A's credits go up by 245, plus 1 for each mile past the 245 included.
5. **Spend:** user A lands at user B's airport, searches, and books a car with those credits.
6. **Close:** "No money changed hands. Two cars got used instead of sitting in a lot, and the savings stayed in Michigan."

Run the demo at least 5 times beforehand. Record a backup video in case the Wi-Fi or the AI service fails during judging.

## 11. Hard questions, and answers to rehearse

- **"What about insurance?"** "For the prototype we assume an insurance partner that gives per-trip coverage, the way Turo does. That is the first thing we would lock in before launch."
- **"Why not Turo?"** "Turo is a rental marketplace where you pay cash. We are a credit system: lend your car while you are away and borrow one where you land, with no money changing hands."
- **"What if there aren't enough cars?"** "A car does not need a direct swap partner. Anyone landing at that airport can use it, one after another, so it only takes a few cars per airport to start. Later, people can rent with cash when no car is available on credits."
- **"What if someone damages the car?"** "Every handover has an AI photo check. The AI flags new damage, the owner confirms it, and the borrower loses credits."
- **"What stops someone from stealing the car?"** "Verified accounts, the photo record, and a locker code that unlocks only after check-in. A real launch would add ID checks."
- **"Does this cost Michigan jobs?"** No answer yet. See section 5.

### Known risks
- Insurance and legal questions are not solved. They are an answer in the pitch, not a feature.
- Vacation cities get many travellers arriving and few locals leaving, so credits pile up in home cities and cars run short in vacation spots. Cash rentals are the planned fix.
- The car's registration papers usually stay in the car and show the owner's home address. Tell owners to clear "Home" from the GPS and take out the garage opener.
- Whether an AI model reliably spots small scratches between two photos has not been tested. Test it on the toy car first.

## 12. For AI assistants working on this project

- Build the smallest thing that makes the demo in section 10 work. It is a 12-hour hackathon.
- Keep the rules in section 6 exactly as written. If a change breaks one, say so before making it.
- Use IBM technology for every AI feature.
- The AI flags; a person decides. Never let a model settle who pays for damage.
- The database is the source of truth for cars and dates. A model may read a request and rank results, but must not invent cars, dates or prices.
- Use only made-up data. No real names, addresses, licence plates, keys or locker codes.
- The dollar figures in this file are estimates. Do not present them as facts.
- Do not treat anything in section 13 as decided.

## 13. Open questions

1. What is the hackathon's theme or stated issue? Two judging criteria score against it.
2. May code written before the event be used?
3. Which IBM models does the event provide, and can one of them compare two photos?
4. Does the demo run on one laptop, or on a phone plus a laptop?
5. Is the Michigan angle in section 5 the one the team wants?
