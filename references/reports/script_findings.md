# Script findings (study data behind references/SCRIPT.md)

> **Privacy & Originality Compliance:** Per `.claude/skills/cartoon-3d-short/SKILL.md`, this file contains **zero** reference channel names, video IDs, or verbatim reference lines. All findings below are statistical and structural rules derived from the 32-video 3D animation cohort (`22` Outliers at `7.9×–48.7×` channel median vs. `4` Underperformer controls at `0.2×–1.4×` channel median).

---

## Part 1: Empirical Findings (What Separates Outliers from Flops)

### 1.1 Archetype Hit Rates (32-Video 3D Cohort)
| Archetype | Share of Cohort | Outlier Hit Rate | Median Views | Median Views/Day | Median Duration | Median Words | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| **Track A: Paradox-Payoff Story** *(Unnamed actor does wrong-looking act → mockers + 3 escalation rounds → Snap → `"You see,"` real mechanism)* | `20 / 32` (`62.5%`) | **80.0%** (`16/20`) | **9.77M** | **448k/d** | `60.5s` | `226w` | **Primary Default** |
| **Track B: 2nd-Person System / Loophole** *(Rule paradox → `"Imagine..."` puts `"you"` inside system → step-by-step walk → loophole reveal)* | `7 / 32` (`21.9%`) | **57.1%** (`4/7`) | **7.32M** | **163k/d** | `54.0s` | `198w` | **Secondary** (legal/psych traps with no historical hero) |
| **Track C: Escalating Levels / Fact-Explainer** | `3 / 32` (`9.4%`) | `66.7%` (`2/3`) | `9.61M` | `253k/d` | `47.0s` | `163w` | **Fallback** (only when 4–5 weapon/tech tiers exist; textbook Q&A flopped at `329k`) |
| **Pure Fiction Twist** *(Invented towns/rules + named protagonist)* | `2 / 32` (`6.2%`) | **0.0%** (`0/2`) | **2.22M** | **91k/d** | `72.0s` | `271w` | **Hard Ban** (`G1_REAL_MECHANISM`) |

---

### 1.2 Hook Sentence Techniques (Sentence 1 Claim + Sentence 2 Lock)

#### Sentence 1 (Claim) Performance
- **Timing & Length:** Outliers average **`14.5 words` (`4.08s` mean / `3.90s` median)** vs. Underperformers at **`11.3 words` (`3.21s`)**. Sweet spot: **`12–19 words`** (`9–20w` pass band).
- **3 Winning Syntactic Forms:**
  1. **Counter-Intuitive Visual Act (`72.2%` outlier rate, `13/18`, med `9.54M`):** `[He / They / A <role>] [Simple Past verb] [concrete drawable prop] [condition making it look foolish or suicidal].`
  2. **Rule / Ban Paradox (`75.0%` outlier rate, `3/4`, med `13.05M`):** `[Strict ban or impossibility], yet/but [opposite reality happens everywhere].`
  3. **Conditional Paradox (`71.4%` outlier rate, `5/7`, med `9.61M`):** `If you [perform ordinary physical act], [backwards or extreme consequence happens].`
- **Hard S1 Rules (100% of Outliers Obey):**
  - **Hide the mechanism ("the why")** until `~72%` of the video.
  - **`0` questions (`?`) in Sentence 1:** `0 / 22` outliers open with a question; the only question-opener in the cohort flopped (`329k`).
  - **`0` 4-digit years and `0` invented character names** in Sentence 1.

#### Sentence 2 (Lock) Performance
- **Combined Hook (`S1 + S2`) Investment:** Outliers spend **`32.0 words` (`8.93s` mean / `9.27s` median = `16.1%` of runtime)** across `S1 + S2`, whereas Underperformers rush through `S1 + S2` in **`21.8 words` (`5.99s` mean / `5.55s` median)**.
- **S2 Lock Ranking by Outlier Hit Rate:**
  1. **Onlooker / Partner Reaction Contrast (`100.0%` hit rate, `5/5`, med `10.36M`, `768k/d`):** Crowd bursts out laughing (`A2.1`) or partner/boss grabs the hero and asks a `<=9w` incredulous question (`A2.2`).
  2. **Contradiction / Obsessive Precision Twist (`80.0%` hit rate, `8/10`, med `9.53M`):** Escalates the anomaly with `Yet,` or an obsessively exact measurement (`A2.5` / `A2.6`).
  3. **`"Imagine..."` 2nd-Person Immersion (`75.0%` hit rate, `3/4`, med `8.62M`):** Drops the viewer inside the room/street (`B2.1`).
  4. **`"You see,"` High-Stakes Backstory (`62.5%` hit rate, `5/8`, med `11.94M`):** Supplies 1 missing piece of stakes/competition *without* revealing the mechanism (`A2.4`).
  5. **Plain Mechanics / Worldbuilding Follow-On (`20.0%` hit rate, `1/5`, med `3.86M`):** Explaining mechanics in S2 fails `80%` of the time.

---

### 1.3 Cadence & Sentence-Length Waveform (Measured from Word-Level Timestamps)

| Cadence Metric (Mean / Median) | Tier 1 Mega (`n=14`) | All Outliers (`n=22`) | Tier 4 Flops (`n=4`) | Rule Derived |
|---|---:|---:|---:|---|
| **Duration (s)** | `59.4 / 61.0s` | **`57.5 / 60.5s`** | `53.0 / 51.5s` | Bimodal sweet spots: **Full `58–65s`** (`17/22`) or **Compact `39–47s`** (`5/22`). Ban `<38s` & `>68s`. |
| **Word Count** | `217.6 / 228.0w` | **`210.4 / 220.0w`** | `194.8 / 186.0w` | **Full `215–240w`** (hard `195–250w`); **Compact `145–165w`** (hard `135–175w`). |
| **Gross Speaking Rate** | `3.67 / 3.68 wps` | **`3.66 wps (219.7 wpm)`** | `3.69 wps (221.4 wpm)` | Constant **`~3.67 wps` (`220 wpm`)** across the entire cohort. |
| **Net Speaking Rate** | `3.71 / 3.73 wps` | **`3.70 wps (222.2 wpm)`** | `3.76 wps (225.6 wpm)` | Zero speed-up/slow-down gimmicks. |
| **Sentence Count** | `16.1 / 16.5` | **`14.9 / 15.5`** | `16.0 / 16.0` | `15–18` sentences (Full), `10–14` (Compact). |
| **Sentence Length StDev** | `7.22 / 7.40w` | **`7.24 / 7.11w`** | **`5.46 / 5.49w`** | High variance (`StDev >= 5.0w` Full) is mandatory; flops have flat sentence lengths. |
| **Long Setups (`21+w` %)** | `20.1%` | **`23.0%`** | **`4.5%`** | Outliers use **5× more `21+w` multi-clause setups** than flops (`>=2` sentences `>=18w` required). |
| **Micro-Punches (`1–6w` %)** | `18.9%` | **`16.8%`** (`19/22`) | `15.1%` | Snap long setups with `2–6w` punches (`"Wait, what?"`, `"But why?"`, `"Then another."`). |
| **Mid-Sentence Word Onset Gap** | `230 ms` (`med 240`) | **`230 ms` (`med 240`)** | `220 ms` | Steady word-to-word flow. |
| **Sentence-Boundary Onset Gap** | `507 ms` (`P90: 663`) | **`504 ms` (`P90: 663`)** | `520 ms` (`P90: 696`) | `500 ms` onset gap = **`~0.20–0.25s` actual silence** (`0.0` median gaps `>=800 ms`). |
| **Mechanism Reveal Onset** | `43.6s` (`74.6%`) | **`42.8s` (`71.8%` med)** | `19.8s` (`56.7%`) | Hold the `"You see,"` reveal until **`~70–75%`** of runtime (`~42–46s` in a 60s video). |

---

### 1.4 Grammar Level & Sentence Structure

| Grammar Metric | Tier 1 Mega (`n=14`) | All Outliers (`n=22`) | Target / Constraint |
|---|---:|---:|---|
| **Flesch-Kincaid Grade** | **`4.76` mean / `4.75` med** | **`5.18` mean / `5.02` med** | **4th–5th Grade (`3.5–5.5` target, `<=6.2` hard)**. |
| **Flesch Reading Ease** | `85.5` mean / `85.9` med | `84.1` mean / `85.8` med | Conversational spoken English (`80–92`). |
| **Avg Syllables / Word** | `1.27` mean / `1.25` med | `1.28` mean / `1.26` med | Hard cap **`<= 1.43` syllables/word**. |
| **1-Syllable Words (%)** | `76.6%` (`med 78.3%`) | `76.2%` (`med 77.8%`) | Floor **`>= 66%` monosyllabic words** (`3+` syl words `= 4.7%`; `9+`-char words `= 2.04%`). |
| **Clause Length & Commas** | `6.65w/clause`, `1.12 commas/s` | `7.19w/clause`, `1.08 commas/s` | Long `21–28w` sentences are chained from 3–4 short `~7w` clauses, never dense academic prose. |
| **Active Voice** | `0.25` passive/100w (`med 0.0`) | `0.25` passive/100w (`med 0.0`) | Near-100% active voice (`<=1` passive `"by"` clause per script). |
| **Past → Present Tense Shift** | — | **`16/20` Story scripts** | Open S1 in **Simple Past** (`He bolted...`), then snap S2–Closer into **Historical Present** (`unbolts`, `goes`, `walks`). |
| **Conjunction Openers (`So/But/And/Yet`)** | `26.8%` (`med 28.0%`) | **`26.4%` (`med 26.2%`)** | Over 1 in 4 sentences starts with `So,`, `But`, `And`, or `Yet,` (floor `>=12%`). |
| **Oral Discourse Openers** | `12.4%` | **`11.7%`** | `You see,`, `Wait,`, `Well,`, `Still,`, `Instead,`, `Except`, `Imagine`. |
| **Time-Jump Openers** | `13.2%` | **`12.3%`** | `Weeks later,`, `The next morning,`, `By midnight,`, `Then, one night,`, `Within a year,`. |
| **`"You see,"` + Questions + Quotes** | — | **`17/22` `"You see"` · `17/22` `?` · `8/22` quotes** | Mid-script viewer-proxy question (`2–6w`, never in S1) + `<=10w` mocker quote + `"You see,"` reveal + everyday analogy. |

---

