# Script builder

Read at the topic and script steps. Steps 0-5 in order; no script goes to the user until the linter exits 0. The block skeletons are structure only: fill them with this story's facts in our own words, never reference lines, names or scenarios. Every slot is a sourced fact; never invent one to fill a block. Study data behind the numbers: `reports/script_findings.md` (not needed to write).

## Step 0: topic gates (all 5 must pass)
| Gate | Passes when |
|---|---|
| `G1_REAL_MECHANISM` | A real, checkable cause: event, physical law, legal loophole, psychological or statistical effect. Pure fiction fails. |
| `G2_DRAWABLE_WRONG_ACT` | Frame 1 can show a person doing a concrete act with one drawable prop that looks foolish, suicidal or backwards. |
| `G3_SKEPTIC_PRESENT` | A boss, rival, crowd, guard or enemy mocks, doubts or punishes the act (Track B: the system itself is the trap). |
| `G4_CLUE_AND_ANALOGY` | One small physical detail to plant early, and one everyday analogy for the reveal. |
| `G5_IRONIC_REVERSAL` | The payoff lands back on the skeptic, rival or system, with no moral. |

Any gate fails: tell the user which, propose one reframe of the same topic that passes all 5, and stop.

## Step 1: track and mode
Track (first match wins):
| Track | When | Beats |
|---|---|---|
| **A** (default) | An unnamed person or group does a weird physical act against skeptics or rivals | A1-A9 paradox-payoff story |
| **B** | A legal loophole, institutional trap or brain/body trick with no single hero; the viewer is "you" | B1-B6 second-person walk-through |
| **C** (fallback) | 4-5 escalating tiers of an invention or weapon, no protagonist | C1-C4 levels chain |

Mode:
| Mode | When | Words (target / hard) | Sentences | Shape |
|---|---|---|---|---|
| `full` (default) | Several rounds against a rival or crowd | 215-240 / 195-250 | 15-18 | 2+ setups of 18+ words (3-4 ideal), 2+ punches of 7 or fewer, length stdev 5+ |
| `compact` | One experiment or one loophole | 145-165 / 135-175 | 10-14 | 1+ setup of 18+ words, 1+ punch, stdev 3.4+ |

Words are the budget; seconds follow from the user's measured pace (3.0-3.6 words/s on past takes, so full runs about 60-80 s).

## Step 2: fact slots (fill all before drafting)
Unnamed roles only (`he`, `a blacksmith`, `the youngest engineer`, `you`); never invent a first name. `MECHANISM` never appears in `FRAME1_ACT` or `STAKES_LOCK`.
```
ACTOR_ROLE        unnamed role or pronoun
FRAME1_PROP       one concrete drawable object in frame 1 (becomes the hero object)
FRAME1_ACT        the wrong-looking act done to it
STAKES_LOCK       danger, competition or crowd reaction
SKEPTIC_ROLE      who mocks or opposes
PLANTED_CLUE      one measurable or visible oddity, planted in the escalation
SNAP_EVENT        the visible turning point
MECHANISM         the real explanation, held for the reveal (~72 %)
EVERYDAY_ANALOGY  a household or street object that mirrors the mechanism
IRONIC_FLIP       how the outcome lands on the skeptic or calls back FRAME1_PROP
```

## Step 3: assemble from blocks (one block per beat, fill the slots)

### Track A
**A1 Hook claim** (S1, 0-4 s, 12-19 words, simple past or "If you...", no `?`, no year, no name, mechanism hidden)
| ID | When | Skeleton |
|---|---|---|
| A1.1 | Extreme warning tied to the prop | `He put [PROP] in [holder] and told [authority] if [tiny trigger], [extreme command].` |
| A1.2 | Alters or damages a normal object | `They [cut/bent/painted/bolted] [PROP] [oddly exact way].` |
| A1.3 | Calm or silly act in mortal danger | `He [mundane act with PROP], with [deadly threat] close enough to see.` |
| A1.4 | Wastes money or an advantage | `He [spent/bet/threw away] [valuable thing] on [worst possible target].` |
| A1.5 | Eerie repeated micro-act | `A man [nightly act] with [one hyper-specific detail].` |
| A1.6 | Ordinary act, backwards result | `If you [simple act with PROP], [opposite consequence].` |

**A2 Hook lock** (S2, 4-9 s, 12-22 words, switch to historical present; S1+S2 = 25-41 words). Prefer A2.1 / A2.2; never explain mechanics here.
| ID | When | Skeleton |
|---|---|---|
| A2.1 | A crowd is watching | `The whole [room/crowd] bursts out laughing, because [why he looks foolish].` |
| A2.2 | Partner or boss beside him | `His [SKEPTIC] grabs him and goes, "[incredulous question, 9 words or fewer]?"` |
| A2.3 | An unaware person walks off | `The [other person] just shrugs, says, "[5 words or fewer]," and walks out.` |
| A2.4 | One stakes fact needed | `You see, [rivals racing / high-stakes rule], and [why failure costs everything].` |
| A2.5 | Hero against sensible peers | `And while everyone else [urgent normal prep], he's in the corner still [FRAME1_ACT].` |
| A2.6 | Obsessive precision | `A [ROLE] measures [exact amount] and makes them redo it because [missed by a hair].` |

**A3 Baseline or rival** (9-16 s, 20-35 words)
| ID | When | Skeleton |
|---|---|---|
| A3.1 | Rival does it the textbook way | `The other [rival] builds it the normal way and finishes first. Theirs works silently, while his [looks broken].` |
| A3.2 | Authority orders a stop | `[SKEPTIC] yells that [he's ruining everything]. But he doesn't look up. All he says is, "[5 words or fewer]."` |
| A3.3 | One strict rule | `Here, [he/the boss] has one strict rule. Every [subject] must [constraint], and [he waits right there].` |
| A3.4 | Slow-burn anomaly | `The first [night], nobody notices, because who checks their [object]? But by the end of the week, [absurd symptom].` |
| A3.5 | Premature celebration | `The second the door closes, [ROLE] grabs [prize]. By midnight, he's already bought [1], [2] and [3], at least in his head.` |

**A4 Escalation** (16-36 s, 65-90 words, present tense plus time jumps). One of A4.1-A4.3, plus A4.4 and A4.5; at least two 20-28 word sentences.
| ID | When | Skeleton |
|---|---|---|
| A4.1 | Stranger parts stacked on the prop | `But it gets weirder. He bolts [part A] onto [PROP], adds [part B], and [guards it].` |
| A4.2 | Three measurable stages | `Then [season] comes, and something weird happens. At [stage 1], [measure 1]. By [stage 2], [measure 2]. And by [stage 3], [extreme].` |
| A4.3 | The obvious fix doubles it | `So [victims] [obvious fix] so it can't happen again. Yet [the problem doubles].` |
| A4.4 | Mocker quote (required) | `[SKEPTIC] looks at [PROP], laughs, and goes, "[sarcastic taunt, 10 words or fewer]."` |
| A4.5 | Planted clue (required) | `The only clue is [PLANTED_CLUE].` |

**A5 Fake-out and viewer question** (36-43 s, 15-28 words). A5.1, A5.2 or A5.4, plus A5.3.
| ID | When | Skeleton |
|---|---|---|
| A5.1 | Plan seems to fail | `[Time jump], [trigger fires], but nothing happens. Now they laugh even harder and [write him off].` |
| A5.2 | Locked into danger | `As [ROLE] [commits], he finally sees [trap ahead]. But, it's too late.` |
| A5.3 | Viewer question (required, 2-6 words) | `Wait, what?` / `Wait, [clue word]?` / `But why?` / `But how?` / `So how does this keep happening?` |
| A5.4 | Countdown | `So, he waits. [Time 1] goes by, then [time 2], until finally [door opens].` |

**A6 Snap** (43-48 s, 15-25 words, short punches)
| ID | When | Skeleton |
|---|---|---|
| A6.1 | One, two, all | `Then, one [night], [one unit triggers]. Then another. Then all [N] at once.` |
| A6.2 | Waits to zero margin | `Everyone screams at him to act, but he waits until [threat inches away]. That's when he [acts].` |
| A6.3 | Surprise entrance | `Then, one morning, [inspectors] walk straight in, except now [badge / huge bill], followed by [consequence].` |
| A6.4 | Split-screen climax | `On the [most extreme] day, his [weird setup] finally [works]. And [far away], the rival's [perfect version] fails.` |
| A6.5 | Quiet aftermath | `The next morning, [the proud place] is [rubble / empty].` |

**A7 Reveal** (48-55 s, 20-32 words, starts at ~72 %)
| ID | When | Skeleton |
|---|---|---|
| A7.1 | Real rule or history (default) | `You see, [back in <year>], [MECHANISM, explaining the clue].` |
| A7.2 | Named effect | `Well, it's called [term]. / That's because [plain cause and effect].` |
| A7.3 | Inside the machine | `Inside the [PROP] sat [A] linked to [B]. The slightest [input] pushed [A] into [B], snapping [C] open.` |
| A7.4 | Secret motive | `You see, [ROLE] had [secret setup] and kept [clue] the whole time.` |

**A8 Analogy** (15-25 words; required for physics, maths, tax, law, psychology)
| ID | When | Skeleton |
|---|---|---|
| A8.1 | Surface, fluid, resistance | `Ever [kitchen action]? [Part A reacts], but [part B stays still] because [cause], and [story object] works the same way.` |
| A8.2 | Reflex | `Think about the last time you [dropped something]. You [caught it] before thinking, because your body didn't wait for a decision.` |
| A8.3 | Speed, force, scale | `A [bike] can take a [sharp turn] slowly, but take it fast and it flips.` |
| A8.4 | Counting, price, label trick | `It's like [everyday ticket/label comparison]. [One-line link to the clue].` |

**A9 Ironic closer** (8-18 words, hard stop: no moral, no call to action)
| ID | When | Skeleton |
|---|---|---|
| A9.1 | Hero safe, rival crashes | `So [ROLE] glides through without a scratch, right as [SKEPTIC] slams into the trap they mocked.` |
| A9.2 | Silences the laughing crowd | `So, while the room is still laughing, [proof arrives], and by the time it stops, nobody's laughing.` |
| A9.3 | One unit against all | `One [unit] meant [a tremor]. All [N] meant [the disaster] was right under them.` |
| A9.4 | Cold ledger irony | `So [tiny origin] ended with [huge ironic bill].` |
| A9.5 | Callback to the prop | `So [final action], leaving them holding [payoff] instead of [PROP].` |

### Track B
| Beat | Words | Blocks |
|---|---|---|
| B1 paradox | 10-16 | B1.1 `[Act] is illegal in [place], but [system] found something way worse.` / B1.2 `If you [use system], [hidden cost] and nobody notices.` |
| B2 immersion lock | 14-26 | B2.1 `Imagine [authority] walks you into [room] with no [tool] and no [work].` / B2.2 `Yet, there's a [banned place] on almost every street. Inside, [sensory detail].` |
| B3 surface bait | 20-30 | B3.1 `And you're thinking, "Wait, [I get paid for this]?" At first, it's paradise.` / B3.2 `So, you win [prize] and try to cash it in. But the counter won't give you a cent.` |
| B4 uncanny escalation | 40-55 | B4.1 `Then, [signal 1]. [Signal 2], and [your spot is replaced]. Still, [veteran] looks fine, so you carry on.` / B4.2 `Now, here's the weird part. The second [you drift off], [trigger jolts you back].` |
| B5 glitch | 18-28 | B5.1 `Then, one Monday, [veteran] is gone. His desk is cleared, and nobody says where he went.` / B5.2 `You follow the guy ahead of you to a tiny window in a wall with no sign.` |
| B6 reveal and closer | 30-45 | B6.1 `You see, the law bans [X], but nothing bans [Y]. So they just wait, because nobody can stand [Y] forever.` / B6.2 `Because the machine never [moved you]; it [deleted you and built a copy]. So be honest, would you still step inside?` |

### Track C
- **C1 hook** (14-20 words): `If you got hit by [tier 1], you'd actually be one of the lucky ones.`
- **C2 tiers 1-2** (40-55): `In the [century], [tier 1] would [baseline damage]. [Underdogs] couldn't afford that, so they fired back with [tier 2].`
- **C3 tiers 3-4** (80-100): `But [side A] had a nastier idea called [tier 3]. They [three-step prep], and minutes later [visible effect]. Not to be outdone, [side B] fired back with [tier 4], a [description] that [effect].`
- **C4 tier 5 closer** (35-45): `Eventually, [defence improved], and [tier 4] just bounced off. So [builder] built [tier 5], firing a single [huge unit] made to end it in one shot.`

### Style (all tracks)
- Openers: over 1 in 4 sentences start with `So,` `But` `And` `Yet,`; others with `You see,` `Wait,` `Well,` `Still,` `Instead,` `Imagine` or a time jump (`Weeks later,` `The next morning,` `By midnight,` `Then, one night,` `Eventually,`).
- Spoken verbs: grabs, snaps, slams, rips, yanks, bolts, creeps, drags, shrugs, goes (for speech).
- 4th-grade wording (FK 3.5-5.5), two-thirds one-syllable words, active voice, contractions. Long sentences are 3-4 short clauses chained with commas and "and", never dense prose. Quotes 10 words or fewer.
- No comic asides unless the user asks; humour comes from real facts. Never describe what the viewer already sees. No stock refrains ("Luckily / Unluckily"); a repeated line only when it is a fact.
- Pauses trimmed to 0.2 s (Voice step); no dramatic long pauses.

## Step 4: lint and repair (at most 3 passes)
Save the spoken lines only to `src/videos/<name>/script.txt` (also the recording sheet), then
`python scripts/lint_script.py src/videos/<name>/script.txt --mode <full|compact> --track <A|B|C> --wps <measured>`
Exit 1: apply the fix for each `[FAIL]`, re-run. `WARN` is fine.
| Code | Fix |
|---|---|
| `WORD_COUNT` | Short: add one physical step or a short mocker reaction in A4. Long: cut adjectives, merge setup clauses in A3-A4. |
| `S1_QUESTION` / `S1_YEAR` / `S1_LEN` | S1 declarative (A1 / B1), year moved to S2 or A3, 12-19 words. |
| `HOOK_LEN` | Resize S2 so S1+S2 is 25-41 words. |
| `WAVEFORM_LONG` | Chain 3-4 short clauses in A4 or A7 into one 21-28 word sentence. |
| `WAVEFORM_PUNCH` / `WAVEFORM_STDEV` | Split a turn in A5 / A6 into a 2-6 word punch, placed right after a 22+ word setup. |
| `READABILITY` | Swap long Latin words for short plain ones. |
| `OPENERS` | Start 2-3 causal sentences with So / But / And / Yet, 1-2 with a time jump. |
| `REVEAL_PIVOT` | Open A7 with `You see,` or `Well, it's called`. |
| `BANNED_WORDS` / `PASSIVE_VOICE` | Delete academic words and calls to action; rewrite "was X-ed by Y" as "Y X-ed". |

## Step 5: SCRIPT.md layout (`src/videos/<name>/SCRIPT.md`; format `templates/SCRIPT_example.md`)
1. Facts with sources.
2. Gates (G1-G5 pass), track, mode, block sequence (e.g. `A1.2 > A2.2 > A3.1 > A4.2+A4.4+A4.5 > A5.2+A5.3 > A6.4 > A7.1 > A8.3 > A9.1`).
3. The fact slots.
4. The script, one sentence per line, each tagged with its beat.
5. The linter's `LINT SUMMARY` line, then the self-check, then the zone map.

## Zone map (after the self-check)
A table: script lines | beat | zone | spot | subject (person or hero object) | action on screen.
- Lines in one place share a zone; the camera moves between spots in one long take. A new zone only for another place or another time (a cut).
- Aim for 2-3 zones. Typical Track A: the act and mockers (A1-A5) in zone 1, the snap where it happens (often zone 1 again or zone 2), the reveal and analogy as overlays or a cut-away over the snap zone (`LOOK.md` "Show the mechanism"); the closer back on the skeptic. A line that needs a new place: reword it so it plays where the camera already is.
- Cast from the slots: `ACTOR_ROLE`, `SKEPTIC_ROLE` (and a crowd for A2.1) get actors; Track B "you" is the camera's point of view with one stand-in actor; Track C has no hero, each tier is its own hero object.
- `FRAME1_PROP` is the hero object: frame 1 shows `FRAME1_ACT`, `PLANTED_CLUE` gets a close hold on its line, the snap acts on it, the closer calls it back.
- A line about an object makes it the subject: a close hold and an action (`LOOK.md` "Hero objects"). Each action is shown step by step (pick up, carry, set down, use); one hero object carries through the story, each stage visibly on top of the last.
- The visual for a line lands on its word. Every line gets its own visual; a line that only explains gets a diagram, numbers or a comparison object. The analogy line shows its everyday object.

## Self-check before showing the user
- [ ] Linter exits 0; its summary line is in `SCRIPT.md`.
- [ ] Every slot is a sourced fact; no invented names.
- [ ] Sentence 1 hides the why; the mechanism first appears at the reveal (~72 %).
- [ ] The clue is planted before the reveal, and the reveal uses it and answers the hook.
- [ ] The closer is ironic, lands on the skeptic or prop, and ends the video (no moral, no call to action).
