---
name: polimind-quiz
description: Generate a new polimind quiz JSON file directly in public/data/ from a subject, instead of calling the app's generation API. Use this whenever the user asks for a new quiz, says "/polimind-quiz <subject>", wants to add a quiz about some topic, asks for questions on a subject to be added to the app, or mentions generating quiz data, quiz JSON, a classify quiz, or a bool/true-false quiz for this project. Also use when the user names a subject plus a question count or difficulty and expects a quiz file out of it.
---

# polimind-quiz

Write a quiz JSON file into this repo the same way the app's generation endpoint would, but with the questions authored by you.

## Arguments

Free-form, comma separated, order irrelevant, everything but the subject optional:

`<subject>[, options|bool|classify][, <N> questions][, easy|medium|hard][, pt|en]`

Examples:
- `Linguagens Formais, options, 10 questions, easy` → subject "Linguagens Formais", type `options`, 10 questions, hardness `easy`
- `Dijkstra` → subject only; fill the rest from the defaults below
- `Fungi, classify` → a classify quiz about fungi

Defaults when unspecified: type `options`, 10 questions, hardness `medium`, and `lang` matching the language the subject was written in (`Linguagens Formais` → `pt`, `Formal Languages` → `en`). The subject's language is a strong signal about who the quiz is for, so write every question, option and explanation in that language too.

Only stop to ask the user something if the subject itself is ambiguous enough that you'd write a different quiz depending on the answer (e.g. "trees": data structure or botany?). Everything else has a workable default; pick it and say what you picked.

## Steps

1. **Read `QUIZ.md` at the repo root.** It is the authoritative spec for the file layout, the metadata fields, and the three question shapes (`options`, `bool`, `classify`). Follow it rather than guessing from memory, since it changes as the app changes.
2. **Pick the slug.** Kebab-case, English, descriptive, no accents: `Linguagens Formais` → `formal-languages`. Check `ls public/data/` and `ls public/data/classify/` first, if the slug is taken, either extend it (`computer-networks2` style, as the repo already does) or, if the user is clearly asking to replace, confirm before overwriting. `id` must equal the slug must equal the filename.
3. **Pick `icon`, `color`, `category`, `subcategory`, `tags`.** Read `src/utils/iconMapper.ts` (`ICON_BY_NAME`, `ICON_BY_CATEGORY`) and `src/utils/colorMapper.ts` (`AVAILABLE_COLORS`) for the current valid values, inventing a name silently falls back to a generic book icon and a gray tile, which looks broken on the home grid. Reuse an existing `category` and `subcategory` (`grep -h '"subcategory"' public/data/*.json | sort -u`) so the quiz joins an existing filter group instead of creating a lonely one. Give 2-4 lowercase tags; the home search matches on name and tags.
4. **Write the questions** (see the quality bar below).
5. **Save** to `public/data/<slug>.json`, or `public/data/classify/<slug>.json` for `classify`. Two-space indent, matching the existing files.
6. **Validate** with the check below, then tell the user the slug, the local URL `/quiz/<slug>`, and anything you had to decide for them.

## Question quality

This is the part that actually matters. The JSON scaffolding is mechanical, the questions are the product.

- **Test understanding, not recall of phrasing.** Prefer "why does X hold" / "what happens if" / "which of these is the counterexample" over "what is the definition of X". A learner who understood the topic should get it right; one who memorized a slide might not.
- **Distractors must be plausible.** Every wrong option should be something a reasonable learner might actually believe: a common misconception, an adjacent concept, an off-by-one on a complexity class. Joke options and obviously-absurd options make the question free, which wastes it.
- **Vary the correct index.** If `correctAnswer` is `1` in eight of ten questions the quiz is guessable without reading. Spread the correct answers across positions roughly evenly.
- **Spread the difficulty inside the requested band.** For `easy`, most questions are core definitions with one or two applications; for `hard`, most are edge cases, trade-offs and multi-step reasoning. The hardness label describes the center of the range, not a uniform level.
- **Cover the topic, do not circle one corner.** Sketch the sub-areas of the subject first, then allocate questions across them so a 10-question quiz spans the syllabus rather than asking the same idea five ways.
- **Always write `explain`.** It's optional in the schema but it's where the learning happens: say why the right answer is right, and when a distractor is a known trap, say why it's wrong. Two sentences is plenty.
- **`bool` statements need real ambiguity.** A true/false quiz where every false statement is false because a word was swapped for its opposite is a pattern-matching exercise. Mix in statements that are false because of a subtle scope or condition error, and keep true/false roughly balanced.
- **`classify` needs entities that discriminate.** Pick entities where the classification is genuinely learnable but not obvious from the name, and make sure every group has at least a couple of entities so the distractor pool isn't degenerate.

## Validate before reporting done

```bash
python3 scripts/validate-quiz.py <slug>
```

It catches the mistakes that make a quiz load blank, render gray or 404, which is otherwise the failure mode the user finds instead of you: id/filename disagreement, an `icon` or `color` that is not a key in the mappers, an out-of-range `correctAnswer`, duplicate options, a `bool` quiz using `correctAnswer` instead of `result`, and broken classify references. It also prints the `correctAnswer` spread and the true/false balance, so fix a skew before reporting done rather than shipping a guessable quiz.

The file is picked up by the home page automatically, no registration step, no code change. Prefix the filename with `_` only if the user wants it hidden from the grid.
