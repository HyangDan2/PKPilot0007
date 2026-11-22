# HD2Markdown Editor — API

HD2Lab's Markdown editor (`PKPilot0007`) has no server and no build step. `app.js` is one classic
script in an IIFE; everything it exposes for tests and for the console hangs off `window.HD2Editor`.

- Live: <https://hyangdan2.github.io/PKPilot0007/>
- Product name: **HD2Markdown Editor** (HD2Lab)
- Sibling: `PKPilot0008` **HD2Markdown Viewer** — same app shell, read-only

## 1. `window.HD2Editor`

| Call | Returns | What it does |
| --- | --- | --- |
| `slugify(text)` | string | File-name slug for a Diary post (`<date>-<slug>.md`). |
| `slug(text)` | string | Heading anchor slug used for TOC ids. |
| `currentFileName()` | string | `<date>-<slug>.md` from the Diary fields. |
| `buildFrontmatter()` | string | The `---` YAML block built from the Diary fields. |
| `fullMarkdown()` | string | Frontmatter + body, or just the body when no Diary fields are filled. |
| `renderMarkdown(text)` | string | markdown-it + highlight.js, sanitized by DOMPurify. |
| `utf8ToBase64(text)` | string | UTF-8 → Base64 for the GitHub contents API. |
| `parseFrontmatter(raw)` | `{ data, body, hasFrontmatter }` | Reads the YAML block, returns the body without it. |
| `openMarkdownText(text, source)` | same as above | Puts a document in the editor (`source = { kind, name, path, sha }`). |
| `openLocalFile(file)` | `Promise` | Opens one `File` (UTF-8 first, EUC-KR fallback). |
| `handleFiles(fileList)` | `Promise` | The picker/drop entry point: one document plus any images. |
| `rememberLocalImages(files)` | number | Keeps opened images by file name and relative path (blob URLs). |
| `findLocalImage(value)` | entry \| null | Resolves `./img/a.png` / `a.png` against that map. |
| `listPosts()` / `loadPost(path)` | `Promise` | Repository post list and one post (`GET /repos/…/contents/…`). |
| `detachSource()` | — | *새 글로 전환*: unbinds the loaded post, keeps the body. |
| `decodeBase64Utf8(base64)` | string | Base64 payload from the contents API → text. |
| `commitToGithub()` | `Promise` | Reads the current `sha`, then `PUT` the frontmatter + body. |
| `pickImage()` / `uploadImage(file)` | — / `Promise` | Opens the picker / commits one image to both paths. |
| `imageFileName(name, ext)` | string | `<YYYY-MM-DD>-<ascii-name>.<ext>`. |
| `insertImageMarkdown(alt, url)` | string | Inserts `![alt](url)` at the caret. |
| `setMode(mode)` | — | `'edit' \| 'split' \| 'preview'`; below 900px `split` becomes `edit`. |
| `buildToc()` / `paintPreview()` / `paintDocHead()` | — | Re-render the preview, its TOC, and the document head. |
| `scrollToHeading(id, smooth)` | — | Scrolls the preview pane to a heading (switches to a mode that shows it). |
| `setExportMenu(open)` | — | Opens/closes the export split menu. |
| `getState()` | `{ mode, headings, localImages }` | Small read-only snapshot. |
| `getLoaded()` | `{ kind, name, path, sha }` | What the editor is currently bound to. |

## 2. Storage keys

| Key | Owner | Shape |
| --- | --- | --- |
| `hd2-theme` | shared `assets/hd2-theme.js` | `'light' \| 'dark'` |
| `hd2_md_editor_v1` | autosave | `{ body, updatedAt, diary: { title, category, date, slug, tags, summary }, mode }` |
| `hd2_md_github_v1` | commit target | `{ repo, branch, path, message }` (default `HyangDan2/diary` · `main` · `diary-src/posts/`) |
| `hd2_md_pat_v1` | GitHub PAT | fine-grained token, sent only to `api.github.com` |

The draft is written 520ms after the last edit and once more on `beforeunload`. A stored commit target that still
names `HyangDan2/HyangDan2.github.io` is moved to `HyangDan2/diary` on the next load.

## 3. Shell contract

| Piece | Rule |
| --- | --- |
| `body` | `display:flex; flex-direction:column; height:100dvh; overflow:hidden` — the window never scrolls. |
| `.site-header` | 52px (`calc(52px + env(safe-area-inset-top))` with `padding-top` for the inset). |
| `.io-bar`, `.doc-bar`, `.toolbar`, `.statusbar` | `flex:none` — they stay put while the panes scroll. |
| `.doc-layout` | `grid-template-areas: "toc panes"`; below 1200px `"toc" "panes"` with the TOC as a drawer. |
| `.panes` | `min-height:0` grid; `mode-edit` / `mode-split` / `mode-preview` set `display`. |
| `#editor`, `#docPreview` | Each panel scrolls itself; `.doc-inner` keeps `--measure: 960px`. |
| `@media print` | Chrome hidden, `.panes`/`.doc` unpinned, the preview prints whole. |

The view switch is a tablist with `aria-orientation="horizontal"`, roving `tabindex` and
`ArrowLeft`/`ArrowRight`/`Home`/`End` handling; the TOC toggle and the export split button carry
`aria-expanded`, and `#srStatus` is the polite live region for the flows that need to speak.
