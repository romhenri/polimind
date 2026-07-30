# New quiz — workflow

## 1. Data file

- Create `public/data/<slug>.json`.![alt text](../../../../Applications/Convo.app/Contents/Resources/app.asar/dist/renderer/assets/convo-icon-4Vs9NSrR.png)
- `<slug>` = filename without `.json` (used in URLs and `fetch`).

## 2. JSON content (metadata)

| Field | Required | Notes |
|-------|----------|--------|
| `id` | yes | Must equal `<slug>`. Used for `/quiz/<id>` and must match the filename. |
| `name` | yes | Title in the UI. |
| `description` | yes | Card body text. |
| `icon` | no | Legacy/unused by the UI. Card icons are resolved from `id` via `src/utils/iconMapper.ts` (`getQuizIcon`); add an entry there for a new `id`, otherwise the `category` fallback icon is used. |
| `color` | yes | Key in `src/utils/colorMapper.ts` (`AVAILABLE_COLORS`) — 16 predefined earthy/terracotta tones. Returns a hex applied to the card icon tile. Unknown key → neutral fallback. |
| `category` | yes | Drives category filters on the home page. |
| `tags` | yes | String array; home search matches name and tags. |
| `questions` | yes | Question array (see below). |
| `hardness` | no | `easy` \| `medium` \| `hard`; omitted → treated as `easy` in the listing. |
| `seq` | no | Integer in JSON as **number** or **numeric string** (e.g. `"0"`, `"12"`). **Home list order** (see §4): after `category` and first `tags[]` value, lower `seq` sorts first. Omit or invalid → treated as **+∞** (any finite `seq` is listed before). |
| `lang` | no | e.g. `pt` — affects True/False labels and helper copy where applicable. |
| `type` | no | `options` (default), `bool`, or `classify` — sets question shape. |

## 3.1. `options` type (default)

Each item:

- `question`: string
- `options`: string array (multiple choices)
- `correctAnswer`: number — **index** of the correct option in `options`
- `explain`: optional string

## 3.2. `bool` type

In the root JSON: `"type": "bool"`.

Each item:

- `question`: string
- `result`: boolean — correct answer
- `explain`: optional string

(User answer: index `1` = true, `0` = false; see `isAnswerCorrect` in `src/types/quiz.ts`.)

## 3.3. `classify` type

In the root JSON: `"type": "classify"`. Instead of a `questions` array, the quiz declares `facets` and `entities`; the engine expands them into questions at load time (`src/utils/classify/generate.ts`) and validates the data (`src/utils/classify/validate.ts` — invalid data fails loudly with the quiz id and JSON path).

Root fields:

- `config` (optional):
  - `mode`: `"sequential"` asks every facet in an entity's `answers` back to back, in `facets` declaration order; `"single"` (default) picks one random facet per entity.
  - `optionCount`: choices shown, including the correct one. Default 4; clamped to the facet's group count.
  - `shuffleEntities`: default `true`.
- `facets[]`: classification dimensions.
  - `id`, `label`, `prompt` (supports the `{entity}` placeholder).
  - `groups[]`: `id`, `label`, optional `hint` (rendered as secondary text), optional `parentGroup`.
  - optional `parent`: id of another facet; when set, every group needs a valid `parentGroup` in that facet, and distractor sampling prefers up to 2 sibling groups (same `parentGroup` as the correct answer).
- `entities[]`: `id`, `entity` (display name), optional `subtitle`, `answers` (facet id → group id, at least one), optional `explain` (facet id → text shown after answering).

One question = one (entity, facet) pair. The correct group plus sampled distractors from the same facet's pool are shuffled with a per-session seed (stable across re-renders, re-rolled on restart). Validation rules: answers resolve to real groups, ≥2 groups per facet, valid `parent`/`parentGroup` references, unique facet/group/entity ids.

Classify quizzes live in `public/data/classify/<slug>.json`; the listing API and quiz page also look there. Seed examples: `public/data/classify/dino-classification.json` (two facets, sequential) and `public/data/classify/ml-learning-paradigms.json` (single facet).

## 4. Listing on the home page (automatic)

- Any `public/data/<slug>.json` is picked up automatically: `GET /api/quiz-slugs` reads the `public/data` folder and the home page loads each listed slug.
- **Excluded from the home list** (file is still at `/data/...` if you link to it manually):
  - `index.json` (reserved for a possible future manifest).
  - Filenames starting with `_` (e.g. `_draft.json`) — use for quizzes you do not want on the grid; the URL slug would include the leading underscore (e.g. `/quiz/_draft`).
- Order of `slugs` from `GET /api/quiz-slugs` is: **category** (A–Z), **first tag** (A–Z), **`seq`** (0, 1, …; omitted/invalid = +∞, so always after finite values in that group), **name** (A–Z) — computed on the server from each JSON file.

## 5. Runtime (reference)

- Home: `GET /api/quiz-slugs` returns `{ slugs: string[] }` (ordered as above), then `fetch(/data/${slug}.json)` for each slug in that order.
- Quiz page: `fetch(/data/${subject}.json)` where `subject` comes from `/quiz/[subject]`.
- Therefore: **`id` = `<slug>` = URL segment** = filename (without `.json`).
  
- If any tag (normalized) equals `math`, the quiz page enables math rendering where the component supports it (`src/app/quiz/[subject]/page.tsx`).
