# "The Seats Nobody Sat In" — script v1 (example)
Format example ONLY: the `references/SCRIPT.md` "Step 5" layout. Never reuse its words or topic; take facts and wording from the new story. `[tags]` are stripped by the linter, so these lines lint as they are once saved to `script.txt`.

## Facts
- Ford built Transit Connect cargo vans in Turkey and imported them with rear seats fitted, declared as passenger vehicles; after customs clearance the seats were stripped out and the vans sold as two-seat cargo vans (US DOJ press release, Ford agrees to pay $365M, March 2024).
- Cargo vans pay the 25 % "chicken tax", passenger vehicles 2.5 %; the tax dates to 1964, a US reply to European (France, West Germany) tariffs on US chicken (Wikipedia, Chicken tax).
- Ford said it could face up to $1.3 billion in penalties; it settled for $365 million in 2024 (Reuters via Yahoo News, "Ford says it could face $1.3 billion in new penalties").

## Gates and route
- Gates: G1 pass (real tariff rule) | G2 pass (workers rip new seats out) | G3 pass (worker, customs agents) | G4 pass (seat paperwork clue; kid's ticket analogy) | G5 pass (chicken fight ends in a bill)
- Track A | mode full | pace 3.2 words/s
- Blocks: `A1.2 > A2.2 > A3.1 > A3.3 > A4.2+A4.5 > A5.4+A5.3 > A6.3+A4.4 > A7.1 > A8.4 > A9.4`

## Fact slots
- `ACTOR_ROLE`: they, the boss, port workers
- `FRAME1_PROP` / `FRAME1_ACT`: a brand-new van seat / bolted in, then ripped out at the port
- `STAKES_LOCK`: a worker asks why they trash a new van
- `SKEPTIC_ROLE`: a worker, then customs agents
- `PLANTED_CLUE`: every van is listed as a passenger van
- `SNAP_EVENT`: customs agents look closer at the pile of seats
- `MECHANISM` + `EVERYDAY_ANALOGY`: 25 % cargo-van tax against 2.5 % for passenger vans / a kid's movie ticket used by an adult
- `IRONIC_FLIP`: a fight over chicken ends in a $365 million bill

## Script
[A1.2] They bolted brand-new seats into every van, just so workers could rip them out at the port.
[A2.2] A worker unbolts a seat nobody's ever sat in and goes, "Wait, we're trashing a new van?"
[A3.1] Yet, every rival company ships their cargo vans completely empty.
[A3.3] Here, the boss has one strict rule. No van leaves the port until the back seats are stripped out, the floor is bolted flat, and the seats are tossed on a pile.
[A4.2] Still, thousands of vans roll off the boat with seats and belts, and roll out of the port completely bare.
[A4.2] Soon, a mountain of new seats fills the room.
[A4.5] The only clue is the paperwork, where every single van is listed as a passenger van.
[A5.4] Years go by.
[A5.4] Nobody stops it.
[A5.3] But why?
[A6.3] Then, customs agents finally take a closer look at the vans.
[A4.4] An agent stares at the pile and goes, "Those seats were never meant to stay."
[A6.3] So government lawyers step in, and Ford warns it could owe up to $1.3 billion.
[A7.1] You see, back in 1964, France and West Germany taxed American chicken, so the US hit back with a 25% tax on cargo vans.
[A7.1] Passenger vans only pay two and a half.
[A8.4] It's like buying a kid's movie ticket for an adult, then ditching the disguise in the lobby.
[A9.4] So, a fight over chicken ended with a $365 million bill.

`LINT SUMMARY: ALL PASS | mode=full track=A | 232w (~72.5s) | 18 sents [18, 17, 10, 7, 25, 20, 9, 16, 3, 3, 2, 11, 15, 16, 24, 8, 17, 11] | FK=4.54 syl=1.28`

## Self-check
- [x] Linter exits 0; summary above.
- [x] Every slot sourced; no invented names.
- [x] Sentence 1 hides the why; the tax first appears at the reveal.
- [x] Clue (passenger paperwork) planted before the reveal, which uses it.
- [x] Closer is ironic and ends the video.

## Zone map (excerpt)
| Lines | Beat | Zone | Spot | Subject | Action on screen |
|---|---|---|---|---|---|
| 1-2 | A1-A2 | 1 port shed | van door | seat (hero object) | worker unbolts and lifts the seat out on "rip"; turns to the camera on "goes" |
| 7 | A4.5 | 1 | office desk | paperwork | close hold, stamp lands on "passenger" |
| 14-15 | A7.1 | 1 | over the pile | tax diagram card | 25 % and 2.5 % count up on their words |
