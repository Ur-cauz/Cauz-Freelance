# Site content

All copy on https://cauz.is-a.dev comes from the three JSON files in this folder.
Edit them (by hand or from the homelab dashboard), commit, and Vercel redeploys.

Every file is validated by `lib/content.ts` during `next build`. If a field is
missing, too long, or has the wrong type, the build fails with a message like
`content/projects.json: projects[2].github must be an https:// or mailto: URL`
and the live site keeps the previous deploy.

Rules for all files:

- UTF-8 JSON, no comments, no trailing commas.
- Text fields are plain strings (no HTML, no Markdown).
- URLs must start with `https://` (or `mailto:` for email links).
- Only real content. Leave a list empty rather than adding placeholders; empty
  sections are hidden.

## `projects.json`

An array, shown top to bottom in "Selected work".

| Field         | Type       | Required | Limit      | Notes                              |
|---------------|------------|----------|------------|------------------------------------|
| `name`        | string     | yes      | 80 chars   |                                    |
| `description` | string     | yes      | 400 chars  | One or two sentences.              |
| `stack`       | string[]   | yes      | 80 each    | First 2 are shown as tags.         |
| `language`    | string     | no       | 40 chars   | Main language chip.                |
| `stars`       | integer    | no       |            | GitHub stars; shown when above 0.  |
| `live`        | URL        | no       |            | Live site. Omit if there is none.  |
| `github`      | URL        | no       |            | Source code.                       |

```json
{ "name": "Luminote", "description": "…", "stack": ["AI", "Notes"], "live": "https://…", "github": "https://github.com/…" }
```

## `testimonials.json`

An array. The section is hidden while the array is empty. Only add quotes you
have permission to publish, from a real person.

| Field   | Type   | Required | Limit     | Notes                          |
|---------|--------|----------|-----------|--------------------------------|
| `quote` | string | yes      | 600 chars | Without surrounding quotes.    |
| `name`  | string | yes      | 100 chars | Person's name.                 |
| `role`  | string | no       | 100 chars | e.g. "Founder, Company".       |

## `site.json`

A single object.

| Field             | Type                                   | Notes                                              |
|-------------------|----------------------------------------|----------------------------------------------------|
| `name`            | string (60)                            | Logo / name.                                       |
| `role`            | string (120)                           | Line above the headline.                           |
| `headline`        | string (120)                           | Hero `<h1>`.                                       |
| `intro`           | string (400)                           | Hero paragraph.                                    |
| `about`           | string (1200)                          | About paragraph.                                   |
| `now`             | string (400)                           | "Right now" line.                                  |
| `email`           | string (254)                           | Shown as the fallback contact.                     |
| `socials`         | `{ label, href }[]`                    | Footer links. `href` is a URL.                     |
| `services`        | `{ title, note, items: string[] }[]`   | "What I do" list.                                  |
| `process`         | `{ title, copy (300) }[]`              | "How it works" steps.                              |
| `contactServices` | string[]                               | Options in the form's "What do you need?" select. The API only accepts these values. |
| `footerNote`      | string (200)                           | Small print in the footer.                         |
| `seo`             | `{ title, description, url, ogImage, ogImageAlt }` | Page title, meta description, canonical URL and Open Graph image. |


The project list is curated by hand from the public GitHub repos (no forks, archives, tutorials, tiny or private repos). Do not add private repos or their names.
