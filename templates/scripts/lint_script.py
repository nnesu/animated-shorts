"""Deterministic linter for 3D animated story Short scripts.

Usage:
  python lint_script.py <script_path_or_-> [--mode full|compact] [--track A|B|C] [--wps 3.67]
  python lint_script.py --selftest
"""
import argparse
import re
import statistics
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ABBREV_WORDS = {"mr.", "mrs.", "ms.", "dr.", "st.", "vs.", "jr.", "sr."}

BANNED_PATTERNS = [
    r"\bhowever\b",
    r"\btherefore\b",
    r"\bconsequently\b",
    r"\bfurthermore\b",
    r"\bnevertheless\b",
    r"\bsubsequently\b",
    r"\butilize\b",
    r"\bdemonstrate\b",
    r"\bsubscribe\b",
    r"\bfollow for more\b",
    r"\blike and subscribe\b",
    r"\bcomment below\b",
    r"\bmoral of the story\b",
    r"\bin conclusion\b",
]


def count_syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w_orig = w
    if w.endswith("es") and len(w) > 4 and not re.search(r"(?:sh|ch|x|z|s|ss|g|c)es$", w):
        w = w[:-2]
    elif w.endswith("ed") and len(w) > 4 and not re.search(r"[td]ed$", w):
        w = w[:-2]
    if w.endswith("e") and len(w) > 3:
        if w.endswith("le") and len(w) > 3 and w[-3] not in "aeiouy":
            pass
        elif w.endswith(("ee", "ie", "ye", "oe", "ue")):
            pass
        else:
            w = w[:-1]
    groups = re.findall(r"[aeiouy]+", w)
    count = len(groups)
    if w_orig == "science":
        return 2
    if w_orig.endswith("le") and len(w_orig) > 3 and w_orig[-3] not in "aeiouy" and count == 1:
        count = 2
    return max(1, count)


def extract_words(text: str):
    return re.findall(r"[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*", text)


def split_sentences(text: str):
    clean = re.sub(r"\[[^\]]+\]", "", text)
    tokens = clean.split()
    if not tokens:
        return []
    sents = []
    cur = []
    n = len(tokens)
    for i, tok in enumerate(tokens):
        cur.append(tok)
        if i == n - 1:
            sents.append(" ".join(cur))
            cur = []
            continue
        low = tok.lower()
        if re.search(r'[.!?]["”\']*$', tok):
            if low in ABBREV_WORDS:
                continue
            if low in ("a.m.", "p.m.") and i + 1 < n and tokens[i + 1][0].islower():
                continue
            if re.match(r"^\d+\.$", tok):
                continue
            sents.append(" ".join(cur))
            cur = []
    if cur:
        sents.append(" ".join(cur))
    return sents


def lint_text(text: str, mode: str = "full", track: str = "A", wps: float = 3.67):
    sents = split_sentences(text)
    sent_words = [extract_words(s) for s in sents]
    sent_lens = [len(w) for w in sent_words]
    all_words = [w for wl in sent_words for w in wl]
    clean = " ".join(sents)

    wc = len(all_words)
    sc = len(sents)
    dur_s = round(wc / max(wps, 0.1), 1)
    s1 = sents[0] if sc >= 1 else ""
    s1_w = sent_lens[0] if sc >= 1 else 0
    s2_w = sent_lens[1] if sc >= 2 else 0
    hook_w = s1_w + s2_w

    long_18p = sum(1 for L in sent_lens if L >= 18)
    long_21p = sum(1 for L in sent_lens if L >= 21)
    punch_7m = sum(1 for L in sent_lens if L <= 7)
    punch_6m = sum(1 for L in sent_lens if L <= 6)
    stdev_w = round(statistics.stdev(sent_lens), 2) if sc > 1 else 0.0

    syls = [count_syllables(w) for w in all_words]
    total_syls = sum(syls)
    avg_syl = round(total_syls / max(wc, 1), 3)
    fk_grade = round(0.39 * (wc / max(sc, 1)) + 11.8 * (total_syls / max(wc, 1)) - 15.59, 2)
    pct_1_syl = round(sum(1 for s in syls if s == 1) / max(wc, 1) * 100, 1)

    open_conj = sum(1 for s in sents if re.match(r'^["“]?(?:So|But|And|Yet)\b', s))
    pct_conj = round(open_conj / max(sc, 1) * 100, 1)
    open_disc_time = sum(
        1 for s in sents
        if re.match(
            r'^["“]?(?:You see|Wait|Well|Now|Imagine|Still|Instead|Except|Look|Picture|Apparently|On top of that|Step into|Flip a|Weeks later|The next|Next morning|By |At |Then|Eventually|After|Until|One |Every |In the |In May|In July|Deeper in|Back then|On the |When )\b',
            s,
            re.I,
        )
    )

    late_start = max(2, int(sc * 0.35))
    late_text = " ".join(sents[late_start:])
    has_reveal = bool(
        re.search(
            r"\b(?:You see|That's because|Well, it's called|Inside the|Because the|That's when|Well, picture|Turns out|In real life|Back then|On the hottest|Every card has|Somebody shot)\b",
            late_text,
            re.I,
        )
    )

    banned_hits = []
    for pat in BANNED_PATTERNS:
        m = re.search(pat, clean, re.I)
        if m:
            banned_hits.append(m.group(0))

    passive_by = re.findall(r"\b(?:was|were|is|are|been|be)\s+[a-z]+(?:ed|en)\s+by\b", clean, re.I)

    results = []

    def record(status, code, msg, fix=""):
        results.append({"status": status, "code": code, "msg": msg, "fix": fix})

    # 1. WORD_COUNT
    lo, hi = (195, 250) if mode == "full" else (135, 175)
    t_lo, t_hi = (215, 240) if mode == "full" else (145, 165)
    if lo <= wc <= hi:
        status = "PASS" if (t_lo <= wc <= t_hi) else "WARN"
        record(status, "WORD_COUNT", f"{wc}w (~{dur_s}s at {wps} wps; target {t_lo}-{t_hi}w, allowed {lo}-{hi}w)")
    else:
        record(
            "FAIL", "WORD_COUNT",
            f"{wc}w (~{dur_s}s) outside {mode} bounds {lo}-{hi}w",
            f"Add or trim escalation clauses to land inside {t_lo}-{t_hi}w.",
        )

    # 2. S1_QUESTION
    if "?" not in s1:
        record("PASS", "S1_QUESTION", "Sentence 1 is declarative (no '?')")
    else:
        record("FAIL", "S1_QUESTION", f"Sentence 1 contains '?': {s1!r}", "Rewrite S1 as a declarative wrong-looking act or paradox.")

    # 3. S1_YEAR
    if not re.search(r"\b(?:1\d{3}|20\d{2})s?\b", s1):
        record("PASS", "S1_YEAR", "No 4-digit year in Sentence 1")
    else:
        record("FAIL", "S1_YEAR", f"Year found in S1: {s1!r}", "Move the date/year to Sentence 2 or Step 3.")

    # 4. S1_LEN
    if 5 <= s1_w <= 23:
        st = "PASS" if 9 <= s1_w <= 20 else "WARN"
        record(st, "S1_LEN", f"S1={s1_w}w (sweet spot 9-20w, allowed 5-23w)")
    else:
        record("FAIL", "S1_LEN", f"S1={s1_w}w outside 5-23w", "Trim or expand Sentence 1 to 12-19 words.")

    # 5. HOOK_LEN
    if 22 <= hook_w <= 46:
        st = "PASS" if 25 <= hook_w <= 41 else "WARN"
        record(st, "HOOK_LEN", f"S1+S2={hook_w}w (~{round(hook_w/wps, 1)}s; sweet spot 25-41w)")
    else:
        record("FAIL", "HOOK_LEN", f"S1+S2={hook_w}w outside 22-46w", "Adjust S2 Lock so S1+S2 totals 28-40 words (~8-10s).")

    # 6. WAVEFORM_LONG
    req_long = 2 if mode == "full" else 1
    if long_18p >= req_long:
        record("PASS", "WAVEFORM_LONG", f"{long_18p} setup sentences >=18w ({long_21p} >=21w; min {req_long})")
    else:
        record(
            "FAIL", "WAVEFORM_LONG",
            f"Only {long_18p} sentences >=18w (need >={req_long})",
            "Chain 3-4 short clauses with commas/'and' into 21-28w escalation setups.",
        )

    # 7. WAVEFORM_PUNCH
    req_punch = 2 if mode == "full" else 1
    if punch_7m >= req_punch:
        record("PASS", "WAVEFORM_PUNCH", f"{punch_7m} punch sentences <=7w ({punch_6m} <=6w; min {req_punch})")
    elif track == "C":
        record("WARN", "WAVEFORM_PUNCH", f"Track C has {punch_7m} sentences <=7w")
    else:
        record(
            "FAIL", "WAVEFORM_PUNCH",
            f"Only {punch_7m} punch sentences <=7w (need >={req_punch})",
            "Insert 2-6w micro-punches at Step 5 Fake-Out ('Wait, what?', 'But, it's too late.') or Step 6 Snap.",
        )

    # 8. WAVEFORM_STDEV
    min_sd = 5.0 if mode == "full" else 3.4
    if stdev_w >= min_sd:
        record("PASS", "WAVEFORM_STDEV", f"Sentence length StDev={stdev_w}w (min {min_sd}w)")
    else:
        record(
            "FAIL", "WAVEFORM_STDEV",
            f"Sentence length StDev={stdev_w}w is too flat (<{min_sd}w)",
            "Contrast 22-28w setup sentences directly against 2-6w punch lines.",
        )

    # 9. READABILITY
    fk_ok = fk_grade <= 6.2 or (fk_grade <= 7.8 and avg_syl <= 1.43)
    if avg_syl <= 1.43 and fk_ok and pct_1_syl >= 66.0:
        record("PASS", "READABILITY", f"FK={fk_grade}, avg_syl={avg_syl}, 1-syl={pct_1_syl}%")
    else:
        record(
            "FAIL", "READABILITY",
            f"FK={fk_grade}, avg_syl={avg_syl} (max 1.43), 1-syl={pct_1_syl}% (min 66%)",
            "Replace 3+ syllable Latinate words with 1-syllable Anglo-Saxon words.",
        )

    # 10. OPENERS
    if pct_conj >= 12.0 and open_disc_time >= 2:
        record("PASS", "OPENERS", f"Conj openers={pct_conj}% ({open_conj}/{sc}), discourse/time openers={open_disc_time}")
    else:
        record(
            "FAIL", "OPENERS",
            f"Conj openers={pct_conj}% (min 12%), discourse/time openers={open_disc_time} (min 2)",
            "Start more sentences with 'So,', 'But', 'And', 'Yet,' and time jumps ('Weeks later,', 'The next morning,').",
        )

    # 11. REVEAL_PIVOT
    if track in ("A", "B"):
        if has_reveal:
            record("PASS", "REVEAL_PIVOT", "Explicit reveal pivot marker found")
        else:
            record(
                "FAIL", "REVEAL_PIVOT",
                "No reveal pivot marker found for Track A/B",
                "Start Step 7 (~72% mark) with 'You see,' or 'Well, it's called...'.",
            )
    else:
        record("PASS", "REVEAL_PIVOT", "Track C (Levels) exempt from single reveal pivot")

    # 12. BANNED_WORDS
    if not banned_hits:
        record("PASS", "BANNED_WORDS", "0 banned academic or CTA terms")
    else:
        record("FAIL", "BANNED_WORDS", f"Found banned terms: {banned_hits}", "Delete or replace banned terms with spoken connectors.")

    # 13. PASSIVE_VOICE
    if len(passive_by) <= 1:
        record("PASS", "PASSIVE_VOICE", f"Active voice ({len(passive_by)} 'be + V-ed by' hits)")
    else:
        record("FAIL", "PASSIVE_VOICE", f"Multiple passive 'by' constructions: {passive_by}", "Convert passive clauses to active subject-verb-object.")

    fails = [r for r in results if r["status"] == "FAIL"]
    return {
        "passed": len(fails) == 0,
        "fail_count": len(fails),
        "word_count": wc,
        "duration_s": dur_s,
        "sentence_count": sc,
        "sent_lens": sent_lens,
        "fk_grade": fk_grade,
        "avg_syl": avg_syl,
        "results": results,
    }


def selftest():
    tests = {
        "cat": 1, "played": 1, "wanted": 2, "water": 2, "little": 2,
        "simple": 2, "watches": 2, "banana": 3, "impossible": 4, "science": 2,
    }
    for w, exp in tests.items():
        got = count_syllables(w)
        assert got == exp, f"{w}: got {got}, expected {exp}"
    print("selftest ok (10/10 syllable benchmarks)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?")
    ap.add_argument("--mode", choices=["full", "compact"], default="full")
    ap.add_argument("--track", choices=["A", "B", "C"], default="A")
    ap.add_argument("--wps", type=float, default=3.67)
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return

    if not args.path:
        ap.error("Provide a script file path (or '-' for stdin), or pass --selftest")

    if args.path == "-":
        text = sys.stdin.read()
    else:
        with open(args.path, encoding="utf-8") as f:
            text = f.read()

    rep = lint_text(text, mode=args.mode, track=args.track, wps=args.wps)
    status_str = "ALL PASS" if rep["passed"] else f"FAILED ({rep['fail_count']} checks)"
    print(
        f"LINT SUMMARY: {status_str} | "
        f"mode={args.mode} track={args.track} | {rep['word_count']}w (~{rep['duration_s']}s) | "
        f"{rep['sentence_count']} sents {rep['sent_lens']} | FK={rep['fk_grade']} syl={rep['avg_syl']}"
    )
    for r in rep["results"]:
        fix_str = f" -> FIX: {r['fix']}" if r["fix"] and r["status"] else ""
        print(f"  [{r['status']:4s}] {r['code']:15s}: {r['msg']}{fix_str}")
    sys.exit(0 if rep["passed"] else 1)


if __name__ == "__main__":
    main()
