---
name: polimind-edit
description: Edit an existing polimind quiz in public/data, either its questions or its metadata (name, description, icon, color, category, subcategory, tags, hardness, seq, lang, type). Use this whenever the user wants to change, fix, reword, translate, retag, recolor, recategorize, reorder or delete anything in a quiz that already exists; says "/polimind-edit", "fix question 3", "this answer is wrong", "change the color of X", "move this quiz to another category", "add explanations to", "the icon is wrong"; or wants a batch metadata change across many quiz files at once. Use it for corrections and edits to existing quizzes, as opposed to polimind-quiz which authors new ones.
---

# polimind-edit

Change an existing quiz in place, without breaking the invariants that make it load.

Read `QUIZ.md` at the repo root for the authoritative schema before making a structural change. For a small edit to wording you already understand, go straight to the file.

## 1. Find the quiz

Quizzes live in two folders and the user will usually name the topic, not the slug:

```bash
ls public/data public/data/classify | grep -i <term>
grep -ril "<topic>" public/data --include=*.json | head
```

If several match, say which you found and ask rather than guessing. Editing the wrong quiz is invisible until someone notices the change did not appear.

Two shapes exist on disk. Most files are a JSON object; nine older ones are that object wrapped in an array, `[ {...} ]`, and `src/utils/loadQuizzes.ts` handles both via `parsed[1] || parsed[0]`. Preserve whichever shape the file already has. Silently unwrapping one turns an edit into a diff nobody asked for.

## 2. Know the vocabulary before changing metadata

Four fields only accept values that exist elsewhere in the codebase. Writing anything else does not error, it just degrades quietly, which is the worst kind of failure because it survives review:

| Field | Valid values live in | What a wrong value does |
|---|---|---|
| `icon` | `ICON_BY_NAME` in `src/utils/iconMapper.ts` | falls back to the category icon, then a generic book |
| `color` | `AVAILABLE_COLORS` in `src/utils/colorMapper.ts` (16 tones) | card tile renders neutral gray |
| `category` | `computer_science`, `mathematics`, `history`, `sciences`, `general` | creates a new home-page filter with one quiz in it |
| `subcategory` | free text, but reuse an existing one | same, a lonely filter group |

```bash
grep -h '"subcategory"' public/data/*.json public/data/classify/*.json | sort -u
grep -h '"category"' public/data/*.json public/data/classify/*.json | sort | uniq -c
```

Introducing a genuinely new subcategory is fine when a topic really has no home, but say so, since it changes what the user sees on the home page.

`hardness` is `easy` / `medium` / `hard`. `seq` orders within a category plus first-tag group. `lang` (`pt` / `en`) drives the True/False labels, so a quiz whose questions are Portuguese but whose `lang` says `en` will render mismatched buttons.

## 3. The edits that go wrong, and why

**Renaming the quiz id.** `id`, filename and URL segment are the same string. Change one and you must change all: `git mv public/data/old.json public/data/new.json` and update `id` inside. Anything linking to `/quiz/old` breaks, so mention that rather than assuming nobody bookmarked it.

**Removing or reordering options.** `correctAnswer` is an index, not a value. Deleting an option above the correct one silently shifts the right answer to a wrong string, and the quiz still loads, so nothing catches it but a human playing it. When you touch an `options` array, re-derive the index from the answer text:

```python
q["correctAnswer"] = q["options"].index("<the text that is actually correct>")
```

**Editing the wrong field for the type.** `options` quizzes use `correctAnswer` (an index), `bool` quizzes use `result` (a boolean). A `correctAnswer` added to a bool quiz is ignored, so the fix appears to do nothing.

**Renaming a classify group or facet id.** Ids are referenced from three places: every entity's `answers`, every entity's `explain`, and the `parentGroup` of any child facet. Rename all of them together or the validator will reject the file. Prefer changing only the `label`, which is what the user sees, and leaving the id alone.

**Changing `type` after the fact.** Switching `options` to `bool` or to `classify` means rewriting every question into the other shape. Confirm that is really what the user wants before rewriting ten questions.

## 4. Question edits

The user usually reports a symptom ("question 4 is wrong"). Check the whole question before editing: often the stem is fine and only the marked answer is off, or the answer is right and an explanation contradicts it.

When you change an answer, update `explain` to match. An explanation that argues for the old answer is more confusing than no explanation at all.

Opportunistic improvements are welcome when they are in the same spirit as the request (adding a missing `explain` while fixing that question's answer). Rewriting the other nine questions because you would have phrased them differently is not, since the user then has to review a diff they did not ask for. If you spot other problems, list them and let the user choose.

For adding questions, match the existing quiz in tone, length and difficulty, and keep the `correctAnswer` spread balanced across positions so the quiz does not become guessable.

## 5. Bulk edits

For "set X on all quizzes in category Y" or "add subcategory to the ones missing it", a short Python loop beats editing files by hand, and it keeps the change uniform:

```bash
python3 - <<'PY'
import json, pathlib
for p in pathlib.Path("public/data").glob("*.json"):
    raw = json.loads(p.read_text())
    d = raw[1] if isinstance(raw, list) and len(raw) > 1 else raw[0] if isinstance(raw, list) else raw
    if d.get("category") == "general" and not d.get("subcategory"):
        d["subcategory"] = "General Knowledge"
        p.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n")
        print("updated", p.stem)
PY
```

Note it dumps `raw`, not `d`, so array-wrapped files stay wrapped. Print what changed; a bulk edit that reports nothing gives the user no way to check it did the right thing.

Rewriting a file through `json.dumps` reflows the whole thing, which is fine for a bulk pass but noisy for a one-line fix. For a single small change, edit the text in place instead so the diff shows only what moved.

## 6. Validate and report

```bash
python3 scripts/validate-quiz.py <slug>        # one quiz
python3 scripts/validate-quiz.py               # every quiz, useful after a bulk edit
```

It checks id/filename agreement, required fields, icon and color resolution, per-type question structure, classify reference integrity, and reports the `correctAnswer` spread and true/false balance so a skew is visible.

Then tell the user what changed, in terms of what they will see: the slug, `/quiz/<slug>`, and any knock-on effect such as a new filter appearing on the home page or a URL that no longer resolves.

## Examples

**Input:** "the Statistics quiz in Portuguese is filed under Algebra & Calculus, that's wrong"
Locate `hipoteses-estatistica`, change `subcategory` to the existing `Statistics & Probability`, leave everything else untouched, validate, report that it now appears under a different home-page filter.

**Input:** "question 3 of heaps has two correct answers"
Read the question, decide which distractor is genuinely wrong, reword that one option only, keep `correctAnswer` pointing at the same text, update `explain` if it referenced the removed ambiguity.

**Input:** "make all the dinosaur quizzes use the dinosaur icon"
Glob the matching files, set `icon`, confirm `dinosaur` is a key in `ICON_BY_NAME` first, print each file changed, then run the full validator.
