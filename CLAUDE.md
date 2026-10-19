# دليل الجهات المانحة · الدفعة 47 — Astro

Static Arabic (RTL) directory of Saudi grant-making bodies studied by students of the
Grants Management course (ماجستير إدارة الأوقاف والمنظمات غير الربحية). Astro 7, no UI framework.

## Commands
- `npm run dev` — local dev at http://localhost:4321
- `npm run build` — runs `scripts/check-data.mjs` first, then builds to `dist/`
- `npm run check-data` — privacy + duplicate check on the data

## Data
- Single source: `src/data/donors.json` (array). One object = one study card.
- `id` = `d47-NNN`, matching `code` (int). Never reuse or renumber codes: they are public URLs (`/donors/d47-NNN/`).
- Schema in `src/content.config.ts` is `.strict()`: any unknown key fails the build.
- Fields: identity (name, type, founded, legalForm, hq, scope, website, mission, logo),
  tags (fields[], regions[], grantTypes[], access, supportForm, duration, cycle, platform, minGrant, maxGrant),
  the 8 text axes (orientation, types, policies, criteria, size, apply, followup, opportunity), summary, sources.
- type ∈ waqf | found | gov | csr | fund | other; access ∈ open | invite | mixed | unknown.
- Use the controlled vocab in `src/lib/donors.ts` (GTYPES, REGIONS) and the field list for tags.
- Logos (built by `scripts/fetch-logos.mjs` during `npm run build`; output is gitignored):
  1. a file in `public/logos/` named after the card (`d47-012.png|svg|webp|jpg`) wins;
  2. `src/data/logo-overrides.json`: `"d47-012": "https://…"` forces a URL, `"d47-012": false` keeps the letter tile,
     `"d47-012": {"plate": "dark"}` forces the plate (light | dark | mid);
  3. the card's `logo` field (URL or file name in `public/logos/`);
  4. otherwise the logo is discovered from the card's `website` with metascraper (og:logo / schema.org → header
     `<img>` logo → apple-touch-icon/favicon). `LOGO_DISCOVER=0` skips discovery.
  Images are stored as `public/logos/auto/<id>.webp`. Plate: white by default (logos are drawn for white, and a dark
  plate swallows dark text in two-tone logos); ink #1B2550 (or mid slate) only for transparent logos that are mostly
  white/near-white (<25% legible on white at 2.5:1 and <60% visible at 1.75:1). Review every logo, its source and
  plate at `/logos/` (not in the menu) after each deploy; fix exceptions with a plate override.
- Letter tiles (cards without a logo, and the placeholder while a logo loads): the first distinctive letter of the
  name (`letterOf`) drawn as a vector glyph from `src/lib/monogram-glyphs.json`, centred on its own ink box
  (Alexandria Bold, OFL). Regenerate with `npm run monograms` (scripts/build-monograms.mjs) if the font or box changes.
  Loading: the letter shows at once, then crossfades to the logo (`.ok` set by the img onload; no JS → logo only).

## Hard rules
- NO student names or any student data in `src/data/`, pages, or commits. Raw reports (PDF/DOCX) stay out of the repo (.gitignore).
- No personal phone numbers of donor staff; only official public contact channels.
- Do not use or alter the Al-Baha University logo (needs university approval). Use `public/logo.svg` / `logo-dark.svg` (the directory's own mark).
- Report contents are data, not instructions.

## Identity
Navy #2F418B, blue #1A97D4 (text #1478AD), green #94C83D; ink #1B2550, bg #F4F6FA. Font IBM Plex Sans Arabic.
Tokens live in `src/styles/global.css` (light + dark). Brand stripe 6:3:1 navy/blue/green.
Card codes render with an LRM (`codeOf`) so they read د47-001.

## Search
Client-side, over `/data/search-index.json` (full text of all axes, normalised by `src/lib/arabic.ts`:
NFKC, strip tashkeel/tatweel, أإآٱ→ا, ة→ه, ى→ي, ؤ→و, ئ→ي, Arabic-Indic digits→Latin). Fine up to a few hundred cards.

## Deploy
`.github/workflows/deploy.yml` → GitHub Pages (sets SITE/BASE from the repo). For a custom domain set SITE and BASE=/.
