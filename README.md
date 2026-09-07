# Sacrament Meeting Planner

A small Next.js (App Router) app for planning, publishing and printing sacrament
meeting programs for a ward. Built for BYU-Idaho WDD 430.

The interface is available in **English, Spanish and Portuguese**.

## Features

- Public list of meetings with search and pagination
- Meeting detail page with a print-friendly program
- `/meetings/current` redirects to the meeting for the current week
- Admin area (sign-in required) to create, edit and delete meetings
- REST endpoints under `/api/meetings`
- Trilingual UI: English, Spanish (Español), Portuguese (Português)
- Hymn titles and numbers shown from the hymnbook of the active language

## Getting started

```bash
yarn install
yarn dev
```

The app runs at http://localhost:3000.

### Environment variables

Create a `.env.local` file with:

| Variable       | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `DATABASE_URL` | Neon Postgres connection string                    |
| `AUTH_SECRET`  | Secret used by NextAuth to sign the session cookie |

`AUTH_SECRET` can be generated with `yarn dlx auth secret`.

### Database migrations

The schema lives in `db/migrations/` as numbered SQL files. To apply everything
that has not run yet:

```bash
yarn migrate
```

The runner records each applied file in the `schema_migrations` table, so it is
safe to run repeatedly. To add a change, create the next numbered file (for
example `003_add_organizations.sql`) and run the command again. Never edit a
migration that has already been applied: add a new one.

**Always run `yarn migrate` before deploying code that depends on the new
migration.** Code in this app queries new tables/columns unconditionally
(for example the home page reads the `unit` table), so deploying ahead of the
migration can break pages for every visitor until the migration is applied.

## How the translations work

There is no external i18n library, and no `/es` or `/pt` URL prefixes. The
language is a preference stored in a `locale` cookie:

- `lib/i18n/dictionaries/en.ts` holds the English strings **and defines the key
  set**. `es.ts` and `pt.ts` are typed as `Dictionary`, so a missing or
  misspelled key fails `tsc` instead of silently rendering English.
- `lib/i18n/server.ts` exposes `getLocale()` and `getT()` for Server Components
  and Server Actions (including the Zod validation messages).
- `lib/i18n/client.tsx` exposes `<I18nProvider>` plus the `useT()` and
  `useLocale()` hooks. The root layout resolves the locale once and provides it,
  so Client Components never read the cookie themselves.
- `components/LocaleSwitcher.tsx` (in the header) posts to the
  `setLocaleAction` Server Action, which writes the cookie and revalidates the
  layout so every page comes back in the new language.
- Dates are formatted with `formatMeetingDate()`, which maps the locale to
  `en-US`, `es-ES` or `pt-BR`.

## Hymns across languages

The hymnbooks of The Church of Jesus Christ of Latter-day Saints do not share
numbering: "Redeemer of Israel" is number 6 in English, 5 in Spanish and 50 in
Portuguese, with a different title in each. `lib/hymns.ts` holds a table of
~203 hymns (of the ~341 in the English hymnbook) mapping each to its official
Spanish and/or Portuguese counterpart, and `localizeHymn()` swaps both the
number and the title on the meeting detail page.

Two deliberate rules:

- The match is made on the stored English **title**, never on the stored number.
  A number belongs to whichever hymnbook the clerk had in hand, so trusting it
  would mislabel hymns.
- A hymn with no counterpart in that hymnbook (for example "With Humble Heart",
  English 171) stays in English rather than being invented.

The mapping comes from the Church's own official cross-reference PDFs —
"Tabela de Referência Cruzada de Hinos em Português" and "Tabla de correlación
entre los himnos en inglés y español" — merged and cross-checked against each
other and against churchofjesuschrist.org. Coverage: every hymn in the
(smaller) Portuguese hymnal, plus every hymn in the Spanish hymnal. A hymn
present in the table but missing one language has no official translation
into that language (e.g. "With Humble Heart" has neither); a hymn absent from
the table entirely was never captured by either source document (rare —
mostly patriotic, men's/women's, or very old restoration-era hymns). To add
one, append an entry to `HYMN_TABLE` in `lib/hymns.ts`.

### Adding a language

1. Add the code to `LOCALES`, `LOCALE_LABELS` and `DATE_LOCALES` in
   `lib/i18n/config.ts`.
2. Copy `lib/i18n/dictionaries/en.ts` to the new file, translate the values, and
   type it as `Dictionary`.
3. Register it in the `DICTIONARIES` map in `lib/i18n/index.ts`.

### Adding a new string

Add the key to `en.ts` first. TypeScript will then flag `es.ts` and `pt.ts`
until both are translated.

## Scripts

| Command      | Description               |
| ------------ | ------------------------- |
| `yarn dev`   | Development server        |
| `yarn build` | Production build          |
| `yarn start` | Run the production build  |
| `yarn lint`  | ESLint                    |
