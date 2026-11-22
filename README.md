# PKPilot0007 — HD2Markdown Editor

Live: <https://hyangdan2.github.io/PKPilot0007/>

A single-page Markdown editor that runs entirely in the browser. No backend, no build step.

## Layout

The page is an app shell pinned to the viewport — `100vw × 100dvh`, the window itself never
scrolls. A slim 52px app bar sits on top (safe-area aware: `height: calc(52px + env(safe-area-inset-top))`),
then the toolbars (`io-bar`, `doc-bar`, `toolbar`), then `.doc-layout` takes every remaining pixel:
the 264px TOC on the left and the panes on the right, each with its own `overflow-y: auto` scroll
area. Below 1200px the TOC becomes a drawer above the panes; below 900px the panes become a single
column with a two-way **쓰기 / 읽기** switch. The preview runs to the pane edge while the running text
keeps a ~960px measure (`--measure`, 16px/1.95). The editor measures scrolling against the preview
pane (TOC jumps, `IntersectionObserver` root, the *back to top* button), not the window.

Everything that used to sit above and below the workspace — the intro block, the four help cards, the
export bar and the publish panel — now lives behind one icon each: the header `?` opens the help
dialog, and the io-bar holds open / new post / load / publish / export. `@media print` unpins the
shell (`height: auto; overflow: visible`) so the whole document prints or saves as PDF with no chrome.

The top bars carry icons only — every control is an SVG button with an `aria-label` and a `title`
tooltip (17px SVG in a 34px button), so the chrome holds one row down to 320px. The `⚙` gear (between
`?` and the theme switch) opens the GitHub repository settings.

## Writing

- **Toolbar** — H1–H3, bold, italic, strikethrough, inline code, fenced code, bullet/numbered list,
  task list, quote, link, table, image upload and undo (plus `Ctrl/⌘ + B/I/K/1/2/3/S`).
  `Ctrl/⌘ + S` downloads the post as `.md` and `Ctrl/⌘ + O` opens a file. Tab indents by two spaces,
  or shifts a whole selected block.
- **Views** — edit / split / preview on desktop. The view switch is a real tablist
  (`role="tablist"`, `aria-orientation="horizontal"`, roving `tabindex`, `ArrowLeft`/`ArrowRight`/`Home`/`End`).
  On narrow screens the split tab is hidden and the labels read **쓰기 / 읽기**; in 읽기 the
  formatting bar is removed so the document gets every pixel.
- **Preview** — markdown-it (GFM tables, strikethrough, linkify) + highlight.js + task-list checkboxes.
  Rendered HTML passes through DOMPurify before it touches the DOM.
- **Document head** — the preview opens with an eyebrow (`CATEGORY · DATE`, or `MARKDOWN` for a document
  with no Diary fields), the title, the summary, the tags and a collapsible **FRONTMATTER** card. When the
  Diary title is the same as the document's first heading, the title line is dropped so it is not printed twice.
- **TOC** — every `h1`–`h4` in the preview gets a slug id; the 264px sidebar (or the drawer) lists them and
  follows the scroll with an `IntersectionObserver`. A jump scrolls the preview pane, never the window.
- **Code blocks** — each fenced block becomes a card with the language badge and a real **복사** button that
  says **복사됨** after a press.
- **Autosave** — body, diary fields and view mode in `localStorage['hd2_md_editor_v1']`.

## Open

- **File** — the io-bar folder button (or `Ctrl/⌘ + O`) opens `.md / .markdown / .mdown / .txt`; dragging a file
  onto the page works too. The picker is `multiple` and also takes images, so a document and the images it uses
  can be opened in one go: the images stay in memory by file name / relative path and relative `src` values
  (`./img/a.png`, `assets/b.png`) preview in place.
  UTF-8 is used first and EUC-KR is tried as a fallback. A YAML frontmatter block (`--- … ---`) fills
  title / category / date / slug / tags / summary and only the body goes to the editor; without frontmatter the
  whole file is the body. The FILE bar then shows the file name and a *로컬 파일* badge.
- **From the repository** — the io-bar download button opens the *기존 글 불러오기* dialog: the repository's posts
  (`GET /repos/{owner}/{repo}/contents/{path}?ref={branch}`, `.md` only, newest first). Picking one loads it
  (`GET` the file, Base64 → UTF-8) and keeps the original `path` + `sha`; the FILE bar shows a *수정 중* badge.
  *새 글로 전환* (file-plus in the io-bar, shown only for a loaded document) unbinds it and goes back to a new file,
  keeping the body.

## Export

The io-bar's split button stores the body directly (**마크다운으로 저장**), and its caret opens the named actions:
**HTML로 저장**, **마크다운으로 저장** (`.md`), **인쇄 / PDF로 저장**, **마크다운 복사**, **HTML 복사**.
A document with Diary fields exports as `<date>-<slug>.md`; otherwise as `document.md`. Every conversion happens
in the browser.

## Publish

The io-bar upload button opens **저장소에 발행하기**: the top shows the live target badge
(`대상: {repo} · {branch} · {path}`) straight from the settings, then a **YAML Frontmatter 포함**
switch. With it ON the title / category / date / slug / tags / summary fields build frontmatter and a
`<date>-<slug>.md` file name; with it OFF the diary fields fold away and only the file name (optionally
`sub/dir/name.md`) stays — the body is committed as written. The category list follows the settings.
Buttons: **⚙ 저장소 변경** (opens the settings modal), **이 글 .md 저장**, **GitHub 새 파일 ↗**, **복사** and
**저장소에 커밋**.

## Image upload

The toolbar image button takes PNG · JPEG · WebP · GIF (≤5MB) and commits the bytes with the stored PAT to
the configured paths: `imageSrcDir` (original), then `imagePublicDir` when it is non-empty (the extra copy —
empty means one commit only). The body gets `![<original name>](<imageUrlDir>/<file name>)` at the caret.
The file name is lowered to ASCII letters, digits and hyphens; an existing file of that name is overwritten
with its `sha`. Without a PAT the settings dialog opens and the upload is refused.

## GitHub commit

One click from the publish dialog:

1. when a post was loaded from GitHub, its original path is the target and the current `sha` is read first,
   so the commit overwrites that file (a confirm dialog asks before overwriting); the new `sha` from the
   response is stored for the next edit,
2. otherwise `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` picks up an existing `sha`
   (new file = 404, overwrite = 200),
3. `PUT /repos/{owner}/{repo}/contents/{path}` with UTF-8 Base64 content, message `{commit prefix} {file name}`.

## Commit target

The default GitHub target is **`HyangDan2/diary`** (`main`, prefix `diary-src/posts/`, commit message
`post: HD2Lab diary`), the repository that serves <https://hyangdan2.github.io/diary/>. The title bar's **⚙**
gear opens **GitHub 저장소 설정**, which targets any repository:

- **Presets** — `HD2Lab Diary (기본)` and `일반 GitHub 저장소` (`docs/`, `docs: update markdown`, one image
  path, no frontmatter). The general preset keeps the repository field as typed; a custom target clears both
  chips.
- **Fields** — repository (`owner/repo`), branch, posts path, commit message prefix, the image path trio
  (`imageSrcDir` / `imageUrlDir` / `imagePublicDir`), the category list (comma separated, feeds the publish
  select) and the PAT. **기본값 복원** puts the diary values back, **취소** leaves the stored settings alone,
  **저장** writes them.
- **Frontmatter switch** — the publish dialog's toggle is stored too (`useFrontmatter`), so a plain docs repo
  commits the body as written with no YAML.

HD2's Diary used to live under `HyangDan2/HyangDan2.github.io`; a stored target that still names it is moved to
`HyangDan2/diary` on the next load. Everything lives in `localStorage['hd2_md_github_v1']`, and the new fields
merge over the older four-field shape, so a target stored before this change keeps working.

## GitHub token

The PAT is stored only in this browser (`localStorage['hd2_md_pat_v1']`) and is sent only to
`api.github.com`. A fine-grained token scoped to the target repository with **Contents: Read & Write**
is enough. Reading a post list or a file from a **public** repository needs no token at all
(`Authorization` is only added when a PAT is stored).

A commit to `diary-src/posts/` is not visible on `/diary/` by itself: the diary repository commits its
Eleventy build output at the root (`index.html`, `posts/`, `categories/`, `assets/`), so `diary-src` has to be
rebuilt and that output re-committed (see `HyangDan2/diary` → `diary-src/README.md` → Deploy). Other targets
have no build step — the commit is the whole publish.

## Files

```
index.html          the page (52px app bar, io-bar, doc-bar, toolbar, TOC, panes, dialogs)
style.css           Soft Iris / Navy & Lavender tokens + the full-viewport app shell
app.js              markdown-it setup, preview/TOC/doc head, autosave, export, frontmatter, GitHub REST commit
assets/             shared hd2-theme.css / hd2-theme.js (44px floating toggle)
js/vendor/          markdown-it 14.3.3, highlight.js 11.11.1, DOMPurify 3.2.6 (vendored, no CDN)
docs/API.md         what `window.HD2Editor` exposes and the storage keys it owns
```

Theme is the shared one: `./assets/hd2-theme.css` + `./assets/hd2-theme.js` (44px floating toggle).
