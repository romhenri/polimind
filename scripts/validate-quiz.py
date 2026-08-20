#!/usr/bin/env python3
"""Validate polimind quiz JSON files. Usage: validate-quiz.py [slug|path ...]

With no arguments, validates every quiz in public/data and public/data/classify.
Exits non-zero if any quiz fails, printing the quiz and the offending field.
"""
import json
import pathlib
import re
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = [ROOT / "public/data", ROOT / "public/data/classify"]
REQUIRED = ("name", "description", "color", "category", "tags")


def vocab(path, marker):
    src = (ROOT / path).read_text().split(marker)[1].split("\n}")[0]
    return set(re.findall(r"^\s*(\w+):", src, re.M))


ICONS = vocab("src/utils/iconMapper.ts", "const ICON_BY_NAME: Record<string, IconType> = {")
COLORS = vocab("src/utils/colorMapper.ts", "export const AVAILABLE_COLORS: Record<string, string> = {")


def resolve(arg):
    p = pathlib.Path(arg)
    if p.suffix == ".json" and p.exists():
        return p
    for base in DATA:
        if (base / f"{arg}.json").exists():
            return base / f"{arg}.json"
    sys.exit(f"no quiz found for {arg!r}")


class Invalid(Exception):
    pass


def check(path):
    raw = json.loads(path.read_text())
    d = raw[1] if isinstance(raw, list) and len(raw) > 1 else raw[0] if isinstance(raw, list) else raw
    who = path.stem

    def bad(msg):
        raise Invalid(msg)

    if d.get("id") != who:
        bad(f'id {d.get("id")!r} does not match filename {who!r}; the quiz would 404 at /quiz/{who}')
    for f in REQUIRED:
        if not d.get(f):
            bad(f"missing required field {f!r}")
    if d.get("icon") and d["icon"] not in ICONS:
        bad(f'icon {d["icon"]!r} is not in ICON_BY_NAME, the card would fall back to a generic book')
    if d["color"] not in COLORS:
        bad(f'color {d["color"]!r} is not in AVAILABLE_COLORS, the card tile would render gray')
    if d.get("hardness") not in (None, "easy", "medium", "hard"):
        bad(f'hardness {d["hardness"]!r} is not easy/medium/hard')

    kind = d.get("type", "options")
    if kind == "options":
        for i, q in enumerate(d["questions"]):
            opts = q.get("options") or []
            if len(opts) < 2:
                bad(f"q{i} has fewer than 2 options")
            if len(set(opts)) != len(opts):
                bad(f"q{i} has duplicate options")
            c = q.get("correctAnswer")
            if not isinstance(c, int) or isinstance(c, bool) or not 0 <= c < len(opts):
                bad(f"q{i} correctAnswer {c!r} is out of range for {len(opts)} options")
        spread = Counter(q["correctAnswer"] for q in d["questions"])
        note = f"correctAnswer spread {dict(sorted(spread.items()))}"
        if len(d["questions"]) >= 6 and max(spread.values()) > len(d["questions"]) * 0.6:
            note += "  <- skewed, the quiz is guessable"
        n = len(d["questions"])
    elif kind == "bool":
        for i, q in enumerate(d["questions"]):
            if not isinstance(q.get("result"), bool):
                bad(f'q{i} result {q.get("result")!r} is not a boolean (bool quizzes use "result", not "correctAnswer")')
        n = len(d["questions"])
        note = f'true/false split {sum(q["result"] for q in d["questions"])}/{n}'
    elif kind == "classify":
        facets = {f["id"]: {g["id"] for g in f["groups"]} for f in d["facets"]}
        for f in d["facets"]:
            if len(f["groups"]) < 2:
                bad(f'facet {f["id"]!r} needs at least 2 groups')
            if "{entity}" not in f.get("prompt", ""):
                bad(f'facet {f["id"]!r} prompt is missing the {{entity}} placeholder')
            if f.get("parent"):
                if f["parent"] not in facets:
                    bad(f'facet {f["id"]!r} has parent {f["parent"]!r} which is not a facet')
                for g in f["groups"]:
                    if g.get("parentGroup") not in facets[f["parent"]]:
                        bad(f'group {g["id"]!r} has parentGroup {g.get("parentGroup")!r}, not a group of {f["parent"]!r}')
        ids = [e["id"] for e in d["entities"]]
        if len(set(ids)) != len(ids):
            bad("duplicate entity ids")
        used = Counter()
        for e in d["entities"]:
            if not e.get("answers"):
                bad(f'entity {e["id"]!r} has no answers')
            for fid, gid in e["answers"].items():
                if fid not in facets or gid not in facets[fid]:
                    bad(f'entity {e["id"]!r} answers {fid}={gid!r}, which does not resolve')
                used[(fid, gid)] += 1
        thin = [f"{f}/{g}" for (f, g), c in used.items() if c < 2]
        n = len(d["entities"])
        note = f"{len(facets)} facets" + (f"  <- only one entity in {', '.join(thin)}" if thin else "")
    else:
        bad(f"unknown type {kind!r}")

    missing = sum(1 for q in d.get("questions", []) if not q.get("explain"))
    if missing:
        note += f"  <- {missing} questions with no explain"
    print(f"ok  {who:32} {kind:8} {n:3} items  {note}")


targets = [resolve(a) for a in sys.argv[1:]] or sorted(p for base in DATA for p in base.glob("*.json"))
failed = 0
for t in targets:
    try:
        check(t)
    except (Invalid, KeyError, TypeError) as e:
        failed += 1
        print(f"FAIL {t.stem:32} {e}")
print(f"\n{len(targets)} validated, {failed} failed")
sys.exit(1 if failed else 0)
