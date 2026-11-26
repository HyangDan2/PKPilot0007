/* ==========================================================================
   HD2Markdown Editor · PKPilot0007
   Full-viewport app shell (52px app bar) · GFM preview · autosave · TOC ·
   code copy · print · Diary frontmatter · image upload · GitHub commit
   ========================================================================== */
(function () {
    'use strict';

    /* ---------------------------------------------------------------- constants */
    const APP_NAME = 'HD2Markdown Editor';
    const DRAFT_KEY = 'hd2_md_editor_v1';
    const GH_KEY = 'hd2_md_github_v1';
    const PAT_KEY = 'hd2_md_pat_v1';
    /* One commit target any repository can use: the diary values are the defaults, and every path
       the workspace touches — posts, images, categories, frontmatter — is read from here. */
    const GH_DEFAULTS = {
        repo: 'HyangDan2/diary',
        branch: 'main',
        path: 'diary-src/posts/',
        message: 'post: HD2Lab diary',
        imageSrcDir: 'diary-src/assets/images/',
        imagePublicDir: 'assets/images/',
        /* The diary repo is served at /diary/, so the built copy above arrives on the site there. */
        imageUrlDir: '/diary/assets/images/',
        categories: ['devlog', 'architecture', 'troubleshooting', 'notes'],
        useFrontmatter: true,
    };
    const GH_PRESETS = {
        diary: GH_DEFAULTS,
        general: {
            repo: '',
            branch: 'main',
            path: 'docs/',
            message: 'docs: update markdown',
            imageSrcDir: 'assets/images/',
            imagePublicDir: '',
            imageUrlDir: './assets/images/',
            categories: ['docs', 'notes', 'guide'],
            useFrontmatter: false,
        },
    };
    const DEFAULT_GH = GH_DEFAULTS;
    /* kept in sync with the stored settings so the diary fields and the frontmatter follow it */
    let CATEGORIES = GH_DEFAULTS.categories.slice();
    /* HD2's Diary used to live in HyangDan2/HyangDan2.github.io; a stored target that still points
       there would recreate `diary-src/` in the portal repo, so it is moved to the diary repo once. */
    const LEGACY_GH_REPO = 'HyangDan2/HyangDan2.github.io';
    const MD_EXT = /\.(md|markdown|mdown|txt)$/i;
    const IMAGE_NAME_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico|tiff?|heic|heif)$/i;
    const MAX_LOCAL_BYTES = 2 * 1024 * 1024;
    const CONTENTS_API = 'https://api.github.com/repos/';
    const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
    const IMAGE_EXTS = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

    const SAMPLE = [
        '# 마크다운으로 기록하기',
        '',
        'HD2Lab의 글은 **마크다운 한 파일**로 끝납니다. 여기서 쓰고, 확인하고, 그대로 커밋합니다.',
        '',
        '## 왜 브라우저에서 쓸까요',
        '',
        '- 서버가 없습니다 — 모든 변환이 이 페이지 안에서 일어납니다',
        '- 초안은 자동 저장됩니다',
        '- [x] 실시간 미리보기',
        '- [ ] Diary frontmatter 자동 생성',
        '',
        '> 문장은 짧게, 근거는 길게.',
        '',
        '| 항목 | 값 |',
        '| --- | --- |',
        '| 렌더러 | markdown-it 14 |',
        '| 하이라이트 | highlight.js 11 |',
        '',
        '```js',
        "const md = markdownit({ html: true, linkify: true });",
        "console.log(md.render('# hello'));",
        '```',
    ].join('\n');

    /* ---------------------------------------------------------------- dom */
    const $ = (id) => document.getElementById(id);
    const el = {
        editorApp: $('editorApp'),
        editor: $('editor'),
        preview: $('preview'),
        docPreview: $('docPreview'),
        panes: $('panes'),
        paneEdit: $('pane-edit'),
        panePreview: $('pane-preview'),
        docFileName: $('docFileName'),
        loadBadge: $('loadBadge'),
        btnOpenLocal: $('btnOpenLocal'),
        btnNewDoc: $('btnNewDoc'),
        fileInput: $('fileInput'),
        imageInput: $('imageInput'),
        btnUploadImage: $('btnUploadImage'),
        dropOverlay: $('dropOverlay'),
        postList: $('postList'),
        btnListPosts: $('btnListPosts'),
        btnLoadPost: $('btnLoadPost'),
        loadTarget: $('loadTarget'),
        loadStatus: $('loadStatus'),
        wordCount: $('wordCount'),
        charCount: $('charCount'),
        saveState: $('saveState'),
        toast: $('toast'),
        srStatus: $('srStatus'),
        docTitle: $('docTitle'),
        docEyebrow: $('docEyebrow'),
        docSummary: $('docSummary'),
        docTags: $('docTags'),
        fmCard: $('fmCard'),
        fmList: $('fmList'),
        fmHint: $('fmHint'),
        tocPanel: $('tocPanel'),
        tocNav: $('tocNav'),
        btnToc: $('btnToc'),
        btnTocClose: $('btnTocClose'),
        btnTop: $('btnTop'),
        tabEdit: $('tab-edit'),
        tabSplit: $('tab-split'),
        tabPreview: $('tab-preview'),
        helpDialog: $('helpDialog'),
        publishDialog: $('publishDialog'),
        publishForm: $('publishForm'),
        publishTarget: $('publishTarget'),
        loadDialog: $('loadDialog'),
        exportMenu: $('exportMenu'),
        btnExportMenu: $('btnExportMenu'),
        fmTitle: $('fmTitle'),
        fmCategory: $('fmCategory'),
        fmDate: $('fmDate'),
        fmSlug: $('fmSlug'),
        fmTags: $('fmTags'),
        fmSummary: $('fmSummary'),
        fmFilename: $('fmFilename'),
        fmFrontmatter: $('fmFrontmatter'),
        publishStatus: $('publishStatus'),
        ghNewFile: $('ghNewFile'),
        fmToggle: $('fmToggle'),
        fmSlugLabel: $('fmSlugLabel'),
        fmPreview: $('fmPreview'),
        fmFrontmatterCol: $('fmFrontmatterCol'),
        btnCopyPost: $('btnCopyPost'),
        ghDialog: $('ghDialog'),
        ghForm: $('ghForm'),
        ghRepo: $('ghRepo'),
        ghBranch: $('ghBranch'),
        ghPath: $('ghPath'),
        ghMessage: $('ghMessage'),
        ghImageSrc: $('ghImageSrc'),
        ghImageUrl: $('ghImageUrl'),
        ghImagePublic: $('ghImagePublic'),
        ghCategories: $('ghCategories'),
        ghRepoHint: $('ghRepoHint'),
        ghToken: $('ghToken'),
        ghState: $('ghState'),
    };

    const state = {
        mode: 'split',
        savedAt: 0,
        savedMode: '',
        dirty: false,
        committing: false,
        loadedKind: '',
        exportMetadata: '',
        exportSource: null,
        loadedName: '',
        loadedPath: '',
        loadedSha: '',
        listing: false,
        loading: false,
        uploading: false,
        imageCaret: -1,
        headings: [],
        headingIds: [],
        observer: null,
        tocSignature: '',
        localImages: new Map(),
        localDocPath: '',
        folderRoot: '',
    };

    const mediaNarrow = () => window.matchMedia('(max-width: 900px)').matches;
    const mediaTocDrawer = () => window.matchMedia('(max-width: 1200px)').matches;
    const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ---------------------------------------------------------------- markdown */
    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        highlight(code, language) {
            const lang = String(language || '').trim().toLowerCase();
            if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                try {
                    return wrapCode(window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value, lang);
                } catch (error) { /* fall through */ }
            }
            return wrapCode(md.utils.escapeHtml(code), lang || 'text');
        },
    });

    function wrapCode(inner, lang) {
        const label = md.utils.escapeHtml(lang || 'text');
        return `<pre class="code-block" data-lang="${label}"><code class="hljs language-${label}">${inner}</code></pre>`;
    }

    /* GFM task lists (markdown-it has tables + strikethrough built in; checkboxes do not) */
    function taskLists(instance) {
        instance.core.ruler.after('inline', 'gfm-task-lists', (mdState) => {
            const tokens = mdState.tokens;
            for (let i = 2; i < tokens.length; i += 1) {
                const token = tokens[i];
                if (token.type !== 'inline') continue;
                if (!tokens[i - 1] || tokens[i - 1].type !== 'paragraph_open') continue;
                if (!tokens[i - 2] || tokens[i - 2].type !== 'list_item_open') continue;
                const match = /^\[([ xX])\][ \t]+/.exec(token.content);
                if (!match) continue;

                const checked = match[1].toLowerCase() === 'x';
                token.content = token.content.slice(match[0].length);
                const parsed = instance.parseInline(token.content, mdState.env);
                token.children = parsed[0] ? parsed[0].children : [];

                const box = new mdState.Token('html_inline', '', 0);
                box.content = `<input type="checkbox" disabled${checked ? ' checked' : ''}> `;
                token.children.unshift(box);

                tokens[i - 2].attrJoin('class', 'task-item');
                for (let j = i - 3; j >= 0; j -= 1) {
                    if (tokens[j].type === 'bullet_list_open') {
                        tokens[j].attrJoin('class', 'task-list');
                        break;
                    }
                }
            }
        });
    }
    md.use(taskLists);

    md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
    md.renderer.rules.table_close = () => '</table></div>';

    const linkOpen = md.renderer.rules.link_open;
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const href = tokens[idx].attrGet('href') || '';
        if (/^https?:/i.test(href)) {
            tokens[idx].attrSet('target', '_blank');
            tokens[idx].attrSet('rel', 'noopener noreferrer');
        }
        return linkOpen ? linkOpen(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
    };

    function renderMarkdown(text) {
        const raw = md.render(text || '');
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'checked', 'disabled'] });
        }
        return raw;
    }

    /* ---------------------------------------------------------------- utils */
    function pad(value) { return String(value).padStart(2, '0'); }

    function todayKst() {
        const now = new Date();
        return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }

    function timeLabel(date) {
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function slugify(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/['"’`]/g, '')
            .replace(/[^a-z0-9가-힣]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-')
            .slice(0, 60);
    }

    /* heading anchors inside the preview (same slug rule as the viewer) */
    function slug(text) {
        return String(text || '')
            .toLowerCase()
            .trim()
            .replace(/[^\w가-힣\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-{2,}/g, '-')
            .slice(0, 60) || 'section';
    }

    function tagList() {
        return el.fmTags.value
            .split(',')
            .map((tag) => tag.trim().replace(/^#/, ''))
            .filter(Boolean);
    }

    function yamlString(value) {
        return '"' + String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n+/g, ' ').trim() + '"';
    }

    function currentSlug() {
        const typed = slugify(el.fmSlug.value);
        if (typed) return typed;
        return slugify(el.fmTitle.value) || `post-${(el.fmDate.value || todayKst()).replace(/-/g, '')}`;
    }

    function currentFileName() {
        if (!frontmatterEnabled()) return plainFileName();
        return `${el.fmDate.value || todayKst()}-${currentSlug()}.md`;
    }

    /* frontmatter OFF: the author names the file, and may put it in a sub-folder (`docs/guide.md`) */
    function plainFileName() {
        const typed = String(el.fmSlug.value || '').trim().replace(/^\/+/, '');
        const base = typed || slugify(bodyTitle()) || 'document';
        return /(\.md|\.markdown)$/i.test(base) ? base : `${base}.md`;
    }

    function frontmatterEnabled() {
        if (el.fmToggle) return Boolean(el.fmToggle.checked);
        return githubSettings().useFrontmatter;
    }

    function hasDiaryFields() {
        return Boolean(el.fmTitle.value.trim() || el.fmSlug.value.trim());
    }

    function bodyText() {
        return el.editor.value.replace(/\s+$/, '');
    }

    function fullMarkdown() {
        const body = bodyText();
        if (!frontmatterEnabled() || !hasDiaryFields()) return body ? `${body}\n` : '';
        return `${buildFrontmatter()}\n\n${body}\n`;
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function download(name, content, type) {
        const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    async function copyText(text, okMessage) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const helper = document.createElement('textarea');
                helper.value = text;
                helper.setAttribute('readonly', '');
                helper.style.position = 'fixed';
                helper.style.top = '-1000px';
                document.body.appendChild(helper);
                helper.select();
                document.execCommand('copy');
                helper.remove();
            }
            toast(okMessage || '복사했습니다.', 'ok');
        } catch (error) {
            toast('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.', 'err');
        }
    }

    let toastTimer = 0;
    function toast(message, kind) {
        el.toast.innerHTML = message;
        el.toast.className = 'toast' + (kind === 'err' ? ' is-err' : kind === 'ok' ? ' is-ok' : kind === 'warn' ? ' is-warn' : '');
        el.toast.hidden = false;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => { el.toast.hidden = true; }, 4200);
    }

    function announce(message) {
        if (el.srStatus) el.srStatus.textContent = message;
    }

    function setStatus(node, message, kind) {
        node.innerHTML = message;
        node.classList.toggle('is-ok', kind === 'ok');
        node.classList.toggle('is-warn', kind === 'warn');
        node.classList.toggle('is-err', kind === 'err');
    }

    /* ---------------------------------------------------------------- frontmatter parsing */
    function stripBom(text) {
        return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    }

    function unquote(value) {
        const text = String(value == null ? '' : value).trim();
        if (text.length >= 2 && text[0] === '"' && text.charAt(text.length - 1) === '"') {
            return text.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
        }
        if (text.length >= 2 && text[0] === "'" && text.charAt(text.length - 1) === "'") {
            return text.slice(1, -1).replace(/''/g, "'").trim();
        }
        return text;
    }

    function parseYamlBlock(block) {
        const data = {};
        let key = '';
        block.split('\n').forEach((line) => {
            if (!line.trim() || /^\s*#/.test(line)) return;
            const item = /^\s*-\s+(.*)$/.exec(line);
            if (item && key) {
                if (!Array.isArray(data[key])) data[key] = data[key] ? [data[key]] : [];
                data[key].push(unquote(item[1]));
                return;
            }
            const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
            if (!pair) return;
            key = pair[1].toLowerCase();
            const rawValue = pair[2].trim();
            if (!rawValue) { data[key] = ''; return; }
            if (/^\[[\s\S]*\]$/.test(rawValue)) {
                data[key] = rawValue.slice(1, -1).split(',').map((part) => unquote(part)).filter((part) => part !== '');
                return;
            }
            data[key] = unquote(rawValue);
        });
        return data;
    }

    function parseFrontmatter(raw) {
        const text = stripBom(String(raw == null ? '' : raw)).replace(/\r\n?/g, '\n');
        if (!/^---[ \t]*\n/.test(text)) return { data: {}, body: text, hasFrontmatter: false };
        const lines = text.split('\n');
        let end = -1;
        for (let i = 1; i < lines.length; i += 1) {
            if (/^---[ \t]*$/.test(lines[i])) { end = i; break; }
        }
        if (end === -1) return { data: {}, body: text, hasFrontmatter: false };
        const data = parseYamlBlock(lines.slice(1, end).join('\n'));
        const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
        return { data, body, hasFrontmatter: true };
    }

    function firstValue(data, keys) {
        for (let i = 0; i < keys.length; i += 1) {
            const value = data[keys[i]];
            if (Array.isArray(value)) {
                if (value.length) return value.join(', ');
                continue;
            }
            if (value != null && String(value).trim()) return String(value).trim();
        }
        return '';
    }

    function setCategoryValue(value) {
        const wanted = String(value || '').trim();
        if (!wanted) return;
        const options = Array.prototype.slice.call(el.fmCategory.options);
        const exact = options.filter((option) => option.value === wanted)[0];
        if (exact) { el.fmCategory.value = exact.value; return; }
        /* keep the file's own wording instead of silently re-casing the category */
        const option = new Option(wanted, wanted, true, true);
        el.fmCategory.add(option);
        el.fmCategory.value = wanted;
    }

    function applyDiaryData(data) {
        el.fmTitle.value = firstValue(data, ['title']);
        el.fmSlug.value = firstValue(data, ['slug']);
        el.fmTags.value = firstValue(data, ['tags', 'keywords']);
        el.fmSummary.value = firstValue(data, ['summary', 'description', 'excerpt']);
        const date = firstValue(data, ['date', 'published', 'pubdate']);
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) el.fmDate.value = date;
        const category = firstValue(data, ['category', 'categories', 'section']);
        if (category) setCategoryValue(category);
    }

    function clearDiaryFields() {
        el.fmTitle.value = '';
        el.fmSlug.value = '';
        el.fmTags.value = '';
        el.fmSummary.value = '';
        el.fmDate.value = todayKst();
        setCategoryValue(CATEGORIES[0]);
    }

    function buildFrontmatter() {
        const tags = tagList();
        const lines = [
            '---',
            `title: ${yamlString(el.fmTitle.value.trim() || '제목 없음')}`,
            `date: ${el.fmDate.value || todayKst()}`,
            `category: ${yamlString(el.fmCategory.value || CATEGORIES[0])}`,
        ];
        const summary = el.fmSummary.value.trim();
        if (summary) lines.push(`summary: ${yamlString(summary)}`);
        lines.push(`tags: [${tags.map(yamlString).join(', ')}]`);
        lines.push('layout: post');
        if (state.exportMetadata) lines.push(state.exportMetadata);
        lines.push('---');
        return lines.join('\n');
    }

    /* ---------------------------------------------------------------- local image map */
    function normalizePath(value) {
        let out = String(value == null ? '' : value).trim();
        if (!out) return '';
        try { out = decodeURIComponent(out); } catch (error) { /* keep the raw string */ }
        return out
            .replace(/\\/g, '/')
            .split('?')[0]
            .split('#')[0]
            .replace(/^\.\//, '')
            .replace(/^\/+/, '')
            .toLowerCase();
    }

    function isImageFile(file) {
        if (!file) return false;
        return /^image\//i.test(file.type || '') || IMAGE_NAME_RE.test(file.name || '');
    }

    function clearLocalImages() {
        const urls=new Set(Array.from(state.localImages.values(),entry=>entry.url));
        urls.forEach(url=>URL.revokeObjectURL(url));state.localImages.clear();
    }
    function rememberLocalImages(files) {
        let added=0;
        Array.from(files||[]).forEach(item=>{
            const record=window.PortableImport.fileRecord(item);
            if(!record||!isImageFile(record.file))return;
            const key=normalizePath(record.relative||record.file.name);
            const previous=state.localImages.get(key);
            if(previous)URL.revokeObjectURL(previous.url);
            state.localImages.set(key,{file:record.file,name:record.file.name,relative:normalizePath(record.relative),url:URL.createObjectURL(record.file)});
            added++;
        });
        return added;
    }
    function findLocalImage(value) {
        return window.HD2Paths.findInLocalMap(state.localImages,value,state.localDocPath,state.folderRoot);
    }

    function previewImageSrc(raw) {
        const value = String(raw || '').trim();
        if (!value) return '';
        if (/^(?:data:|blob:)/i.test(value)) return value;
        const local = findLocalImage(value);
        if (local) return local.url;
        if (/^https?:\/\//i.test(value) || /^\/\//.test(value)) return value;
        if (state.loadedKind === 'local') return '';
        return value;
    }

    function refreshImageSources() {
        el.preview.querySelectorAll('img').forEach(image=>{
            const raw=image.getAttribute('data-origin-src')||image.getAttribute('src');
            if(!raw)return;
            image.setAttribute('data-origin-src',raw);
            const next=previewImageSrc(raw);
            if(next)image.setAttribute('src',next);
            else {image.removeAttribute('src');image.title='이미지 파일을 찾을 수 없습니다: '+raw;}
        });
        el.preview.querySelectorAll('a[href]').forEach(link=>{
            const raw=link.getAttribute('data-origin-href')||link.getAttribute('href');
            const local=findLocalImage(raw);
            if(local){link.setAttribute('data-origin-href',raw);link.setAttribute('href',local.url);}
        });
    }

    function htmlExportSrc(raw) {
        const value = String(raw || '');
        if (!value) return '';
        if (/^(?:data:|https?:)/i.test(value)) return value;
        return value;
    }

    /* ---------------------------------------------------------------- preview */
    function paintPreview() {
        el.preview.innerHTML = renderMarkdown(el.editor.value);
        wrapCodeBlocks();
        refreshImageSources();
        buildToc();
        paintStats();
        paintDocHead();
        syncTopButton();
        hintActiveFromHeadings();
    }

    /* the <pre> becomes a card with a language badge and a real copy button */
    function wrapCodeBlocks() {
        el.preview.querySelectorAll('pre.code-block').forEach((pre) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'md-code';
            const head = document.createElement('div');
            head.className = 'md-code-head';
            const lang = pre.getAttribute('data-lang') || 'text';
            head.innerHTML = `<span class="md-code-lang">${escapeHtml(lang)}</span><button type="button" class="md-copy">복사</button>`;
            pre.removeAttribute('data-lang');
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(head);
            wrapper.appendChild(pre);

            const button = head.querySelector('.md-copy');
            button.addEventListener('click', async () => {
                const code = pre.querySelector('code') || pre;
                await copyText(code.textContent || '', '코드를 복사했습니다.');
                button.textContent = '복사됨';
                button.classList.add('is-done');
                window.setTimeout(() => { button.textContent = '복사'; button.classList.remove('is-done'); }, 1800);
            });
        });
    }

    function paintStats() {
        const text = el.editor.value;
        /* count prose tokens, not markdown punctuation */
        const prose = text
            .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+[.)])\s+/gm, '')
            .replace(/\[[ xX]\]/g, ' ')
            .replace(/[>*_`~|]/g, ' ')
            .trim();
        const words = prose ? prose.split(/\s+/).filter(Boolean).length : 0;
        el.wordCount.textContent = words.toLocaleString('ko-KR');
        el.charCount.textContent = text.length.toLocaleString('ko-KR');
    }

    function bodyTitle() {
        const hit = /^#\s+(.+)$/m.exec(el.editor.value);
        return hit ? hit[1].trim() : '';
    }

    /* the document head reads what the Diary fields say about this post */
    function paintDocHead() {
        const inBody = bodyTitle();
        const title = el.fmTitle.value.trim() || inBody || '제목 없음';
        el.docTitle.textContent = title;
        /* a post whose frontmatter title is its first heading would print the same line twice */
        el.docTitle.hidden = Boolean(inBody) && inBody === title;
        const eyebrowParts = [];
        if (hasDiaryFields()) {
            if (el.fmCategory.value) eyebrowParts.push(String(el.fmCategory.value).toUpperCase());
            if (el.fmDate.value) eyebrowParts.push(String(el.fmDate.value));
        }
        el.docEyebrow.textContent = eyebrowParts.length ? eyebrowParts.join(' · ') : 'MARKDOWN';
        const summary = el.fmSummary.value.trim();
        el.docSummary.textContent = summary;
        el.docSummary.hidden = !summary;
        const tags = tagList();
        el.docTags.innerHTML = tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('');
        paintFrontmatterCard();
        /* the tab names the post once it is a real document (Diary fields or an opened file),
           and stays the product name for the start-up sample */
        const named = hasDiaryFields() || Boolean(state.loadedName);
        document.title = named && title !== '제목 없음' ? `${title} · ${APP_NAME}` : APP_NAME;
    }

    function paintFrontmatterCard() {
        const rows = [];
        if (hasDiaryFields()) {
            rows.push(['title', el.fmTitle.value.trim() || '제목 없음']);
            rows.push(['date', el.fmDate.value || todayKst()]);
            rows.push(['category', el.fmCategory.value || CATEGORIES[0]]);
            const summary = el.fmSummary.value.trim();
            if (summary) rows.push(['summary', summary]);
            rows.push(['tags', tagList().join(', ')]);
            rows.push(['layout', 'post']);
        }
        if (!rows.length) {
            el.fmCard.hidden = true;
            el.fmList.innerHTML = '';
            el.fmHint.textContent = '';
            return;
        }
        el.fmList.innerHTML = rows
            .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
            .join('');
        el.fmHint.textContent = `${rows.length} field${rows.length === 1 ? '' : 's'}`;
        el.fmCard.hidden = false;
    }

    /* ---------------------------------------------------------------- toc */
    const previewScroller = () => el.docPreview;

    function setActiveToc(id) {
        el.tocNav.querySelectorAll('.toc-link').forEach((link) => {
            link.classList.toggle('is-active', link.dataset.target === id);
        });
    }

    function closeTocDrawer() {
        el.tocPanel.classList.remove('is-open');
        el.btnToc.setAttribute('aria-expanded', 'false');
        el.btnToc.setAttribute('aria-label', '목차 열기');
    }

    function revealTocLink(link) {
        const nav = el.tocNav;
        if (!nav || !link || !nav.scrollHeight) return;
        const navBox = nav.getBoundingClientRect();
        const linkBox = link.getBoundingClientRect();
        if (linkBox.top < navBox.top + 8) nav.scrollTop -= navBox.top + 8 - linkBox.top;
        else if (linkBox.bottom > navBox.bottom - 8) nav.scrollTop += linkBox.bottom - (navBox.bottom - 8);
    }

    /* the preview pane scrolls itself — the window never scrolls */
    function scrollToHeading(id, smooth) {
        const target = id && document.getElementById(id);
        if (!target) return;
        if (state.mode === 'edit') setMode(mediaNarrow() ? 'preview' : 'split');
        const pane = previewScroller();
        if (!pane) return;
        const offset = 14;
        const top = target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - offset;
        const behavior = smooth === false || reduceMotion() ? 'auto' : 'smooth';
        if (typeof pane.scrollTo === 'function') pane.scrollTo({ top: Math.max(0, top), behavior });
        else pane.scrollTop = Math.max(0, top);
        setActiveToc(id);
    }

    function hintActiveFromHeadings() {
        const headings = state.headings || [];
        const pane = previewScroller();
        if (!headings.length || !pane || !pane.clientHeight) return;
        const line = pane.getBoundingClientRect().top + 28;
        let current = headings[0];
        for (let i = 0; i < headings.length; i += 1) {
            if (headings[i].getBoundingClientRect().top <= line) current = headings[i];
            else break;
        }
        if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2) current = headings[headings.length - 1];
        if (!current || !current.id) return;
        setActiveToc(current.id);
        revealTocLink(el.tocNav.querySelector(`.toc-link[data-target="${current.id}"]`));
    }

    function observeHeadings(headings) {
        if (state.observer) { state.observer.disconnect(); state.observer = null; }
        if (!('IntersectionObserver' in window) || !headings.length) return;
        state.observer = new IntersectionObserver(() => hintActiveFromHeadings(), {
            root: previewScroller() || null,
            rootMargin: '0px 0px -60% 0px',
            threshold: 0,
        });
        headings.forEach((heading) => state.observer.observe(heading));
    }

    function buildToc() {
        const headings = Array.from(el.preview.querySelectorAll('h1, h2, h3, h4'));
        const signature = headings.map((heading) => `${heading.tagName}:${heading.textContent}`).join('|');

        /* the preview is re-rendered on every keystroke: the same headings keep the same anchors,
           only their DOM nodes are new, so the ids are put back instead of rebuilding the list */
        if (signature === state.tocSignature && state.headingIds.length === headings.length) {
            headings.forEach((heading, index) => { if (state.headingIds[index]) heading.id = state.headingIds[index]; });
            state.headings = headings;
            observeHeadings(headings);
            return;
        }
        state.tocSignature = signature;
        state.headings = [];
        state.headingIds = [];

        if (!headings.length) {
            el.tocNav.innerHTML = '<p class="toc-empty">제목을 넣으면 목차가 만들어집니다.</p>';
            return;
        }

        const used = new Set();
        const items = headings.map((heading) => {
            let id = slug(heading.textContent);
            let candidate = id;
            let index = 2;
            while (used.has(candidate)) { candidate = `${id}-${index}`; index += 1; }
            used.add(candidate);
            heading.id = candidate;
            return { id: candidate, level: Number(heading.tagName.slice(1)), text: heading.textContent.trim() };
        });
        state.headingIds = items.map((item) => item.id);

        const list = document.createElement('ul');
        list.className = 'toc-list';
        const stack = [{ level: 0, list }];
        items.forEach((item) => {
            while (stack.length > 1 && item.level < stack[stack.length - 1].level) stack.pop();
            if (item.level > stack[stack.length - 1].level && stack[stack.length - 1].list.lastElementChild) {
                const sub = document.createElement('ul');
                sub.className = 'toc-list';
                stack[stack.length - 1].list.lastElementChild.appendChild(sub);
                stack.push({ level: item.level, list: sub });
            }
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'toc-link';
            link.href = `#${item.id}`;
            link.dataset.level = String(item.level);
            link.dataset.target = item.id;
            link.textContent = item.text;
            /* the preview pane scrolls, not the window: jump by hand so the address bar stays clean */
            link.addEventListener('click', (event) => {
                event.preventDefault();
                if (mediaTocDrawer()) closeTocDrawer();
                scrollToHeading(item.id);
            });
            li.appendChild(link);
            stack[stack.length - 1].list.appendChild(li);
        });
        el.tocNav.innerHTML = '';
        el.tocNav.appendChild(list);
        el.tocNav.scrollTop = 0;
        state.headings = headings;
        observeHeadings(headings);
    }

    function syncTopButton() {
        if (!el.btnTop) return;
        const on = previewScroller().scrollTop > 320;
        el.btnTop.classList.toggle('is-on', on);
        el.btnTop.hidden = !on;
    }

    function resetPaneScroll() {
        const pane = previewScroller();
        if (pane) pane.scrollTop = 0;
        if (el.tocNav) el.tocNav.scrollTop = 0;
        syncTopButton();
    }

    /* ---------------------------------------------------------------- view modes */
    function setMode(mode) {
        const narrow = mediaNarrow();
        let next = mode;
        if (narrow && next === 'split') next = 'edit';
        if (next !== 'edit' && next !== 'split' && next !== 'preview') next = 'split';
        state.mode = next;
        el.panes.className = 'panes mode-' + next;
        el.editorApp.classList.toggle('is-read', next === 'preview');
        document.querySelectorAll('.view-tab').forEach((tab) => {
            const active = tab.dataset.view === next;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
            tab.tabIndex = active ? 0 : -1;
        });
        if (el.tabSplit) el.tabSplit.hidden = narrow;
        if (next !== 'preview') {
            hintActiveFromHeadings();
            syncTopButton();
        }
    }

    /* ---------------------------------------------------------------- open document */
    function paintLoaded() {
        const loaded = Boolean(state.loadedKind && state.loadedName);
        el.loadBadge.hidden = !loaded;
        el.btnNewDoc.hidden = !loaded;
        if (loaded) {
            const github = state.loadedKind === 'github';
            el.loadBadge.textContent = github ? '수정 중' : '로컬 파일';
            el.loadBadge.classList.toggle('is-local', !github);
            el.loadBadge.title = state.loadedPath ? `원본 경로: ${state.loadedPath}` : `원본 파일: ${state.loadedName}`;
        }
        paintFileName();
    }

    function openMarkdownText(text, source) {
        const parsed = parseFrontmatter(text);
        if (parsed.hasFrontmatter) applyDiaryData(parsed.data);
        else clearDiaryFields();
        const normalized = stripBom(String(text)).replace(/\r\n?/g, '\n');
        const fm = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(normalized);
        // Retain unsupported fields verbatim rather than losing cover/thumbnail metadata.
        const managed = /^(?:title|date|published|pubdate|category|categories|section|summary|description|excerpt|tags|keywords|layout|slug)\s*:/i;
        state.exportMetadata = fm ? fm[1].split(/\n(?=[A-Za-z0-9_-]+\s*:)/).filter(block=>!managed.test(block)).join('\n') : '';
        state.exportSource = source && source.kind === 'github' ? { ...githubSettings(), path: source.path } : null;

        const body = parsed.body.replace(/\s+$/, '');
        el.editor.value = body ? `${body}\n` : '';

        state.loadedKind = (source && source.kind) || 'local';
        state.localDocPath = state.loadedKind==='local' ? (source?.localPath||source?.name||'') : '';
        if(state.loadedKind!=='local') {state.folderRoot='';clearLocalImages();}
        state.loadedName = (source && source.name) || '';
        state.loadedPath = (source && source.path) || '';
        state.loadedSha = (source && source.sha) || '';

        paintLoaded();
        paintPreview();
        paintDiary();
        resetPaneScroll();
        scheduleSave();
        return parsed;
    }

    function decodeBase64Utf8(base64) {
        const binary = window.atob(String(base64 || '').replace(/\s+/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    }

    async function readFileText(file) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch (error) {
            try {
                return new TextDecoder('euc-kr').decode(bytes);
            } catch (other) {
                return new TextDecoder('utf-8').decode(bytes);
            }
        }
    }

    async function openLocalFile(file, relative) {
        if (!file) return;
        if (!MD_EXT.test(file.name || '')) {
            toast('.md · .markdown · .txt 파일만 열 수 있습니다. 다른 파일을 선택해 주세요.', 'err');
            return;
        }
        if (file.size > MAX_LOCAL_BYTES) {
            toast('2MB 이하의 파일만 열 수 있습니다. 파일을 나누어 열어 주세요.', 'err');
            return;
        }
        try {
            const text = await readFileText(file);
            const parsed = openMarkdownText(text, { kind: 'local', name: file.name, path: '', sha: '', localPath: relative||file.webkitRelativePath||file.name });
            el.saveState.textContent = `${file.name} 파일을 열었습니다`;
            el.saveState.classList.add('is-ok');
            toast(`${file.name} 파일을 열었습니다.${parsed.hasFrontmatter ? '' : ' Frontmatter가 없어 본문만 불러왔습니다.'}`, 'ok');
            announce(`${file.name} 파일을 열었습니다.`);
        } catch (error) {
            toast('파일을 읽지 못했습니다. 다른 파일로 다시 시도해 주세요.', 'err');
        }
    }

    async function handleFiles(fileList) {
        let records=Array.from(fileList||[]).map(window.PortableImport.fileRecord).filter(Boolean);
        if(!records.length)return;
        const zip=records.find(r=>window.PortableImport.isZip(r.file));
        if(zip){
            if(records.length!==1){toast('ZIP은 한 번에 하나만 열어 주세요.','err');return;}
            try{records=await window.PortableImport.readPackage(zip.file,window.JSZip);}
            catch(error){toast('ZIP 열기 실패: '+escapeHtml(error.message),'err');return;}
        }
        const docs=records.filter(r=>MD_EXT.test(r.file.name||''));
        const images=records.filter(r=>isImageFile(r.file));
        if(docs.length){
            clearLocalImages();
            docs.sort((a,b)=>String(a.relative).localeCompare(String(b.relative)));
            const primary=docs[0];
            state.folderRoot=window.PortableImport.packageRoot(primary.relative,(primary.relative||'').split('/').slice(0,1).join('/'));
            rememberLocalImages(images);
            await openLocalFile(primary.file,primary.relative);
            if(images.length)toast('문서와 이미지 '+images.length+'개를 함께 열었습니다.','ok');
            return;
        }
        if(rememberLocalImages(images)){paintPreview();toast('이미지를 추가했습니다.','ok');return;}
        toast('MD, ZIP 또는 이미지 파일을 열어 주세요.','err');
    }

    /* ---------------------------------------------------------------- diary preview */
    function paintDiary() {
        const plain = !frontmatterEnabled();
        el.fmFilename.textContent = currentFileName();
        el.fmFrontmatter.textContent = plain
            ? '— Frontmatter 없이 본문만 커밋합니다.'
            : (hasDiaryFields() ? buildFrontmatter() : '— 제목을 채우면 frontmatter가 만들어집니다.');
        el.ghNewFile.href = newFileUrl();
        paintFileName();
    }

    function paintFileName() {
        if (state.loadedName) {
            el.docFileName.textContent = state.loadedName;
            el.docFileName.title = state.loadedPath ? `원본 경로: ${state.loadedPath}` : `원본 파일: ${state.loadedName}`;
            return;
        }
        const named = hasDiaryFields() || !frontmatterEnabled();
        el.docFileName.textContent = named ? currentFileName() : 'untitled.md';
        el.docFileName.removeAttribute('title');
    }

    /* ---------------------------------------------------------------- autosave */
    let saveTimer = 0;
    function scheduleSave() {
        state.dirty = true;
        el.saveState.textContent = '저장 중…';
        el.saveState.classList.remove('is-ok');
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(saveDraft, 520);
    }

    function saveDraft() {
        const payload = {
            body: el.editor.value,
            updatedAt: Date.now(),
            diary: {
                title: el.fmTitle.value,
                category: el.fmCategory.value,
                date: el.fmDate.value,
                slug: el.fmSlug.value,
                tags: el.fmTags.value,
                summary: el.fmSummary.value,
            },
            mode: state.mode,
            exportMetadata: state.exportMetadata,
            exportSource: state.exportSource,
        };
        try {
            window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
            state.savedAt = Date.now();
            state.dirty = false;
            el.saveState.textContent = `자동 저장됨 · ${timeLabel(new Date(state.savedAt))}`;
            el.saveState.classList.add('is-ok');
        } catch (error) {
            el.saveState.textContent = '자동 저장할 수 없습니다 (저장 공간 부족)';
            el.saveState.classList.add('is-warn');
        }
    }

    function loadDraft() {
        let stored = null;
        try {
            stored = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null');
        } catch (error) {
            stored = null;
        }
        el.fmDate.value = todayKst();
        if (stored && typeof stored.body === 'string' && stored.body.trim()) {
            el.editor.value = stored.body;
            state.exportMetadata = typeof stored.exportMetadata === 'string' ? stored.exportMetadata : '';
            state.exportSource = stored.exportSource || null;
            const diary = stored.diary || {};
            el.fmTitle.value = diary.title || '';
            if (diary.category) setCategoryValue(diary.category);
            el.fmDate.value = diary.date || todayKst();
            el.fmSlug.value = diary.slug || '';
            el.fmTags.value = diary.tags || '';
            el.fmSummary.value = diary.summary || '';
            if (stored.mode) state.savedMode = stored.mode;
            if (stored.updatedAt) {
                el.saveState.textContent = `초안 복원됨 · ${timeLabel(new Date(stored.updatedAt))}`;
                el.saveState.classList.add('is-ok');
            }
        } else {
            el.editor.value = SAMPLE;
            el.saveState.textContent = '샘플 문서로 시작했습니다. 지우고 쓰면 됩니다.';
        }
    }

    /* ---------------------------------------------------------------- editing helpers */
    function focusEditor() {
        if (state.mode === 'preview') setMode(mediaNarrow() ? 'edit' : 'split');
        el.editor.focus();
    }

    function replaceSelection(before, after, placeholder) {
        const textarea = el.editor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const selected = value.slice(start, end) || placeholder || '';
        const insert = before + selected + (after || '');
        textarea.value = value.slice(0, start) + insert + value.slice(end);
        const caretStart = start + before.length;
        textarea.selectionStart = caretStart;
        textarea.selectionEnd = caretStart + selected.length;
        focusEditor();
        onInput();
    }

    function prefixLines(prefix, numbered) {
        const textarea = el.editor;
        const value = textarea.value;
        const start = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
        let end = value.indexOf('\n', textarea.selectionEnd);
        if (end === -1) end = value.length;
        const block = value.slice(start, end);
        const lines = block.split('\n');
        const changed = lines
            .map((line, index) => (numbered ? `${index + 1}. ${line.replace(/^\s*(\d+[.)]|[-*+])\s+/, '')}` : `${prefix}${line.replace(/^\s*([-*+]|\d+[.)])\s+/, '')}`))
            .join('\n');
        textarea.value = value.slice(0, start) + changed + value.slice(end);
        textarea.selectionStart = start;
        textarea.selectionEnd = start + changed.length;
        focusEditor();
        onInput();
    }

    function insertBlock(text) {
        const textarea = el.editor;
        const start = textarea.selectionStart;
        const value = textarea.value;
        const needsLeading = start > 0 && value[start - 1] !== '\n';
        const snippet = (needsLeading ? '\n' : '') + text;
        textarea.value = value.slice(0, start) + snippet + value.slice(textarea.selectionEnd);
        const caret = start + snippet.length;
        textarea.setSelectionRange(caret, caret);
        focusEditor();
        onInput();
    }

    const ACTIONS = {
        h1: () => prefixLines('# '),
        h2: () => prefixLines('## '),
        h3: () => prefixLines('### '),
        bold: () => replaceSelection('**', '**', '굵게'),
        italic: () => replaceSelection('*', '*', '기울임'),
        strike: () => replaceSelection('~~', '~~', '취소선'),
        code: () => replaceSelection('`', '`', 'code'),
        codeblock: () => insertBlock("```js\nconsole.log('hello');\n```\n"),
        ul: () => prefixLines('- '),
        ol: () => prefixLines('', true),
        task: () => prefixLines('- [ ] '),
        quote: () => prefixLines('> '),
        link: () => replaceSelection('[', '](https://)', '링크 텍스트'),
        table: () => insertBlock('| 항목 | 값 |\n| --- | --- |\n| 예시 | 내용 |\n'),
        image: () => pickImage(),
        undo: () => {
            focusEditor();
            try { document.execCommand('undo'); } catch (error) { /* native undo only */ }
        },
    };

    /* ---------------------------------------------------------------- image upload */
    function imageExtension(name) {
        const match = /\.([A-Za-z0-9]+)$/.exec(String(name || ''));
        const ext = match ? match[1].toLowerCase() : '';
        return Object.prototype.hasOwnProperty.call(IMAGE_EXTS, ext) ? ext : '';
    }

    function imageFileName(originalName, ext) {
        const raw = String(originalName || '');
        const dot = raw.lastIndexOf('.');
        const base = dot > 0 ? raw.slice(0, dot) : raw;
        const cleaned = base
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40)
            .replace(/-+$/g, '') || 'image';
        return `${todayKst()}-${cleaned}.${ext}`;
    }

    /* repository path join: `docs/` + `guide.md` → `docs/guide.md`, never doubled */
    function joinPath(dir, name) {
        const left = String(dir == null ? '' : dir).trim().replace(/^\/+/, '').replace(/\/+$/, '');
        const right = String(name == null ? '' : name).trim().replace(/^\/+/, '');
        if (!right) return left;
        if (!left) return right;
        if (right === left || right.indexOf(left + '/') === 0) return right;
        return `${left}/${right}`;
    }

    /* URL join keeps a prefix as written — `./assets/images/` and `/diary/assets/images/` */
    function joinUrl(prefix, name) {
        const left = String(prefix == null ? '' : prefix).trim();
        const right = String(name == null ? '' : name).trim().replace(/^\/+/, '');
        if (!right) return left;
        if (!left) return right;
        return /\/$/.test(left) ? left + right : `${left}/${right}`;
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
            reader.readAsDataURL(file);
        });
    }

    async function putRepoFile(token, settings, path, content, message) {
        const api = `https://api.github.com/repos/${settings.repo}/contents/${encodePath(path)}`;
        const headers = apiHeaders(token);
        const head = await fetch(`${api}?ref=${encodeURIComponent(settings.branch)}`, { headers });
        let sha = null;
        if (head.ok) {
            const meta = await head.json();
            sha = meta.sha;
        } else if (head.status !== 404) {
            throw new Error(describeError(head.status, '기존 파일 확인'));
        }
        const payload = { message, content, branch: settings.branch };
        if (sha) payload.sha = sha;
        const put = await fetch(api, {
            method: 'PUT',
            headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
            body: JSON.stringify(payload),
        });
        if (!put.ok) throw new Error(describeError(put.status, sha ? '이미지 덮어쓰기' : '이미지 업로드'));
        return { sha, result: await put.json() };
    }

    function insertImageMarkdown(alt, url) {
        const textarea = el.editor;
        const value = textarea.value;
        const fallback = Number.isInteger(textarea.selectionStart) ? textarea.selectionStart : value.length;
        const position = Number.isInteger(state.imageCaret) && state.imageCaret >= 0 ? state.imageCaret : fallback;
        const at = Math.max(0, Math.min(position, value.length));
        const markdown = `![${alt}](${url})`;
        const leading = at > 0 && value.charAt(at - 1) !== '\n' ? '\n' : '';
        const trailing = value.charAt(at) === '\n' || at === value.length ? '\n' : '\n\n';
        const snippet = `${leading}${markdown}${trailing}`;
        textarea.value = value.slice(0, at) + snippet + value.slice(at);
        const caret = at + snippet.length;
        textarea.setSelectionRange(caret, caret);
        focusEditor();
        onInput();
        return markdown;
    }

    function pickImage() {
        if (state.uploading) return;
        if (!getToken()) {
            openSettings();
            toast('이미지를 저장소에 올리려면 먼저 GitHub 토큰을 등록해 주세요.', 'err');
            return;
        }
        state.imageCaret = el.editor.selectionStart;
        el.imageInput.click();
    }

    async function uploadImage(file) {
        if (!file || state.uploading) return;
        const token = getToken();
        if (!token) {
            openSettings();
            toast('이미지를 저장소에 올리려면 먼저 GitHub 토큰을 등록해 주세요.', 'err');
            return;
        }
        const ext = imageExtension(file.name);
        if (!ext) {
            toast('PNG · JPEG · WebP · GIF 이미지만 올릴 수 있습니다.', 'err');
            return;
        }
        if (file.size > IMAGE_MAX_BYTES) {
            toast('5MB 이하 이미지만 올릴 수 있습니다.', 'err');
            return;
        }

        const settings = githubSettings();
        const filename = imageFileName(file.name, ext);
        const alt = String(file.name).replace(/\.[^.]+$/, '') || '이미지';
        const sourcePath = joinPath(settings.imageSrcDir, filename);
        /* an empty extra copy path means one commit only */
        const publicPath = String(settings.imagePublicDir || '').trim() ? joinPath(settings.imagePublicDir, filename) : '';
        const imageUrl = joinUrl(settings.imageUrlDir, filename);
        const button = el.btnUploadImage;
        state.uploading = true;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        setStatus(el.publishStatus, `<code>${escapeHtml(filename)}</code> 이미지를 올리는 중입니다.`);
        let sourceDone = false;
        try {
            const content = await fileToBase64(file);
            const source = await putRepoFile(token, settings, sourcePath, content, `chore(assets): 이미지 원본 추가 — ${filename}`);
            sourceDone = true;
            const published = publicPath
                ? await putRepoFile(token, settings, publicPath, content, `chore(assets): 이미지 배포본 추가 — ${filename}`)
                : null;
            rememberLocalImages([file]);
            const uploaded = findLocalImage(file.name);
            if (uploaded) state.localImages.set(normalizePath(imageUrl), uploaded);
            insertImageMarkdown(alt, imageUrl);
            const overwritten = Boolean(source.sha || (published && published.sha));
            const places = publicPath
                ? `<code>${escapeHtml(sourcePath)}</code>와 <code>${escapeHtml(publicPath)}</code>`
                : `<code>${escapeHtml(sourcePath)}</code>`;
            setStatus(
                el.publishStatus,
                `이미지 <code>${escapeHtml(filename)}</code>을(를) ${places}에 올리고 본문에 삽입했습니다.${overwritten ? ' 같은 이름의 파일이 있어 덮어썼습니다.' : ''}`,
                'ok'
            );
            toast(`이미지를 올리고 본문에 삽입했습니다.${overwritten ? ' 같은 이름의 파일을 덮어썼습니다.' : ''}`, 'ok');
        } catch (error) {
            const message = sourceDone
                ? `이미지 원본은 올렸지만 <code>${escapeHtml(publicPath || '배포본 경로')}</code> 복제본을 올리지 못했습니다. 같은 파일로 다시 시도해 주세요. (${error.message})`
                : `이미지를 올리지 못했습니다. ${error.message}`;
            setStatus(el.publishStatus, escapeHtml(message), 'err');
            toast(message, 'err');
        } finally {
            state.uploading = false;
            button.disabled = false;
            button.removeAttribute('aria-busy');
        }
    }

    /* ---------------------------------------------------------------- github settings */
    function readGithubStore() {
        let stored = null;
        try { stored = JSON.parse(window.localStorage.getItem(GH_KEY) || '{}'); } catch (error) { stored = null; }
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    }

    /* the new fields are merged over whatever is stored, so an older four-field target keeps working */
    function writeGithubStore(patch) {
        const next = Object.assign({}, readGithubStore(), patch);
        try {
            window.localStorage.setItem(GH_KEY, JSON.stringify(next));
            return true;
        } catch (error) {
            return false;
        }
    }

    /* an empty string is a real choice for the optional paths (root, one copy, no URL prefix) */
    function storedText(stored, key, fallback) {
        return typeof stored[key] === 'string' ? stored[key] : fallback;
    }

    function parseCategoryList(value) {
        const list = Array.isArray(value) ? value : String(value == null ? '' : value).split(',');
        const out = [];
        list.forEach((item) => {
            const name = String(item == null ? '' : item).trim();
            if (name && out.indexOf(name) === -1) out.push(name);
        });
        return out;
    }

    function githubSettings() {
        const stored = readGithubStore();
        const migrated = stored.repo === LEGACY_GH_REPO;
        const typedRepo = typeof stored.repo === 'string' ? stored.repo.trim() : GH_DEFAULTS.repo;
        const categories = parseCategoryList(stored.categories);
        const settings = {
            repo: (migrated ? GH_DEFAULTS.repo : typedRepo) || GH_DEFAULTS.repo,
            branch: (typeof stored.branch === 'string' ? stored.branch.trim() : '') || GH_DEFAULTS.branch,
            path: storedText(stored, 'path', GH_DEFAULTS.path),
            message: storedText(stored, 'message', GH_DEFAULTS.message),
            imageSrcDir: storedText(stored, 'imageSrcDir', GH_DEFAULTS.imageSrcDir),
            imagePublicDir: storedText(stored, 'imagePublicDir', GH_DEFAULTS.imagePublicDir),
            imageUrlDir: storedText(stored, 'imageUrlDir', GH_DEFAULTS.imageUrlDir),
            categories: categories.length ? categories : GH_DEFAULTS.categories.slice(),
            useFrontmatter: typeof stored.useFrontmatter === 'boolean' ? stored.useFrontmatter : GH_DEFAULTS.useFrontmatter,
        };
        CATEGORIES = settings.categories.slice();
        if (migrated) {
            writeGithubStore({ repo: settings.repo, branch: settings.branch, path: settings.path, message: settings.message });
        }
        return settings;
    }

    function paintCategoryOptions(categories) {
        const list = (categories && categories.length ? categories : GH_DEFAULTS.categories).slice();
        const current = el.fmCategory.value;
        el.fmCategory.innerHTML = '';
        list.forEach((name) => el.fmCategory.append(new Option(name, name)));
        /* a saved category outside the new list falls back to the first one */
        if (current && list.indexOf(current) !== -1) el.fmCategory.value = current;
        else el.fmCategory.value = list[0];
    }

    function getToken() {
        try { return window.localStorage.getItem(PAT_KEY) || ''; } catch (error) { return ''; }
    }

    function newFileUrl() {
        const settings = githubSettings();
        const prefix = settings.path.replace(/^\/+|\/+$/g, '');
        return `https://github.com/${settings.repo}/new/${settings.branch}/${prefix}`;
    }

    function paintGhState() {
        const token = getToken();
        if (token) {
            el.ghState.textContent = `토큰 저장됨 · ${token.slice(0, 7)}···`;
            el.ghState.classList.add('is-ok');
            el.ghState.classList.remove('is-warn');
        } else {
            el.ghState.textContent = '토큰 없음';
            el.ghState.classList.remove('is-ok');
        }
    }

    function showDialog(dialog) {
        if (typeof dialog.showModal === 'function') {
            if (!dialog.open) dialog.showModal();
        } else {
            dialog.setAttribute('open', '');
        }
    }

    function openSettings(reason) {
        const settings = githubSettings();
        paintGithubForm(settings);
        if (reason) toast(reason, 'err');
        showDialog(el.ghDialog);
        el.ghRepo.focus();
    }

    function currentFormSettings() {
        return {
            repo: el.ghRepo.value.trim(),
            branch: el.ghBranch.value.trim(),
            path: el.ghPath.value.trim(),
            message: el.ghMessage.value.trim(),
            imageSrcDir: el.ghImageSrc.value.trim(),
            imagePublicDir: el.ghImagePublic.value.trim(),
            imageUrlDir: el.ghImageUrl.value.trim(),
            categories: parseCategoryList(el.ghCategories.value),
        };
    }

    function sameCategoryList(a, b) {
        return a.length === b.length && a.every((item, index) => item === b[index]);
    }

    /* which preset the fields currently describe (empty when the target is custom) */
    function detectPreset(form) {
        const diary = GH_PRESETS.diary;
        if (form.repo === diary.repo && form.path === diary.path && form.message === diary.message &&
            form.imageSrcDir === diary.imageSrcDir && form.imagePublicDir === diary.imagePublicDir &&
            form.imageUrlDir === diary.imageUrlDir && sameCategoryList(form.categories, diary.categories)) return 'diary';
        const general = GH_PRESETS.general;
        if (form.path === general.path && form.message === general.message &&
            form.imageSrcDir === general.imageSrcDir && form.imagePublicDir === general.imagePublicDir &&
            form.imageUrlDir === general.imageUrlDir && sameCategoryList(form.categories, general.categories)) return 'general';
        return '';
    }

    function paintPresetChips() {
        const active = detectPreset(currentFormSettings());
        document.querySelectorAll('[data-preset]').forEach((chip) => {
            const on = chip.dataset.preset === active;
            chip.classList.toggle('is-active', on);
            chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function paintRepoHint() {
        if (!el.ghRepoHint) return;
        el.ghRepoHint.hidden = /^[^\s/]+\/[^\s/]+$/.test(el.ghRepo.value.trim());
    }

    function paintGithubForm(settings) {
        el.ghRepo.value = settings.repo;
        el.ghBranch.value = settings.branch;
        el.ghPath.value = settings.path;
        el.ghMessage.value = settings.message;
        el.ghImageSrc.value = settings.imageSrcDir;
        el.ghImagePublic.value = settings.imagePublicDir;
        el.ghImageUrl.value = settings.imageUrlDir;
        el.ghCategories.value = settings.categories.join(', ');
        el.ghToken.value = getToken();
        paintPresetChips();
        paintRepoHint();
        paintGhState();
    }

    function fillFromPreset(preset) {
        el.ghBranch.value = preset.branch;
        el.ghPath.value = preset.path;
        el.ghMessage.value = preset.message;
        el.ghImageSrc.value = preset.imageSrcDir;
        el.ghImagePublic.value = preset.imagePublicDir;
        el.ghImageUrl.value = preset.imageUrlDir;
        el.ghCategories.value = preset.categories.join(', ');
        if (el.fmToggle) el.fmToggle.checked = preset.useFrontmatter;
    }

    /* the general preset keeps the repository as typed, so switching presets never loses it */
    function applyPreset(name) {
        const preset = GH_PRESETS[name];
        if (!preset) return;
        if (name !== 'general') el.ghRepo.value = preset.repo;
        fillFromPreset(preset);
        paintPresetChips();
        paintRepoHint();
        toast(name === 'diary'
            ? 'HD2Lab Diary 기본값을 채웠습니다. 저장을 누르면 적용됩니다.'
            : '일반 저장소 기본값을 채웠습니다. 저장소(owner/repo)를 확인하고 저장해 주세요.', 'ok');
    }

    function restoreSettingsDefaults() {
        el.ghRepo.value = GH_PRESETS.diary.repo;
        fillFromPreset(GH_PRESETS.diary);
        paintPresetChips();
        paintRepoHint();
        toast('기본값으로 되돌렸습니다. 저장을 누르면 적용됩니다.', 'ok');
    }

    function saveGithubSettings() {
        const form = currentFormSettings();
        if (!/^[^\s/]+\/[^\s/]+$/.test(form.repo)) {
            toast('저장소를 owner/repo 형식으로 입력해 주세요.', 'err');
            el.ghRepo.focus();
            return;
        }
        const categories = form.categories.length ? form.categories : GH_DEFAULTS.categories.slice();
        const saved = writeGithubStore({
            repo: form.repo,
            branch: form.branch || GH_DEFAULTS.branch,
            path: form.path,
            message: form.message,
            imageSrcDir: form.imageSrcDir,
            imagePublicDir: form.imagePublicDir,
            imageUrlDir: form.imageUrlDir,
            categories,
            useFrontmatter: el.fmToggle ? Boolean(el.fmToggle.checked) : GH_DEFAULTS.useFrontmatter,
        });
        if (!saved) {
            toast('설정을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.', 'err');
            return;
        }
        const token = el.ghToken.value.trim();
        if (token) {
            try { window.localStorage.setItem(PAT_KEY, token); } catch (error) { /* storage full */ }
        }
        const settings = githubSettings();
        paintCategoryOptions(settings.categories);
        paintGhState();
        paintPresetChips();
        paintPublishTarget(settings);
        applyPublishMode();
        el.ghNewFile.href = newFileUrl();
        toast('GitHub 저장소 설정을 저장했습니다.', 'ok');
        if (el.ghDialog.open) el.ghDialog.close();
        setStatus(el.publishStatus, `커밋 대상 <strong>${escapeHtml(settings.repo)}</strong> · <code>${escapeHtml(settings.branch)}</code> · <code>${escapeHtml(settings.path || '루트')}</code>. 이제 <strong>저장소에 커밋</strong>을 누르면 됩니다.`, 'ok');
    }

    function forgetToken() {
        try { window.localStorage.removeItem(PAT_KEY); } catch (error) { /* ignore */ }
        el.ghToken.value = '';
        paintGhState();
        toast('저장된 토큰을 지웠습니다.');
    }

    /* ---------------------------------------------------------------- publish target */
    function publishTargetLabel(settings) {
        const prefix = String(settings.path || '').trim().replace(/^\/+|\/+$/g, '');
        return `대상: ${settings.repo} · ${settings.branch} · ${prefix || '루트'}`;
    }

    function paintPublishTarget(settings) {
        if (!el.publishTarget) return;
        el.publishTarget.textContent = publishTargetLabel(settings || githubSettings());
    }

    /* frontmatter ON: the diary fields build a YAML block; OFF: only the file name, body as written */
    function applyPublishMode() {
        const on = frontmatterEnabled();
        if (el.publishForm) el.publishForm.classList.toggle('is-plain', !on);
        if (el.fmFrontmatterCol) el.fmFrontmatterCol.hidden = !on;
        if (el.fmPreview) el.fmPreview.classList.toggle('is-single', !on);
        if (el.fmSlugLabel) el.fmSlugLabel.textContent = on ? '파일명 / 슬러그' : '파일명 / 경로';
        if (el.fmSlug) el.fmSlug.placeholder = on ? 'markdown-editor-viewer' : 'docs/guide.md';
        paintDiary();
        paintDocHead();
    }

    function openPublish() {
        const settings = githubSettings();
        paintCategoryOptions(settings.categories);
        paintPublishTarget(settings);
        if (el.fmToggle) el.fmToggle.checked = settings.useFrontmatter;
        applyPublishMode();
        showDialog(el.publishDialog);
        el.fmTitle.focus();
        el.fmTitle.select();
    }

    function onFrontmatterToggle() {
        const on = Boolean(el.fmToggle.checked);
        writeGithubStore({ useFrontmatter: on });
        applyPublishMode();
        announce(on ? 'YAML Frontmatter를 포함합니다.' : 'Frontmatter 없이 본문만 커밋합니다.');
    }

    /* ---------------------------------------------------------------- load from GitHub */
    let postIndex = new Map();

    function loadTargetLabel(settings) {
        const prefix = String(settings.path || '').trim().replace(/^\/+|\/+$/g, '');
        return `${settings.repo} · ${settings.branch} · ${prefix || '루트'}`;
    }

    function requestHeaders() {
        const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

    function readErrorMessage(status, stage) {
        if (status === 403 || status === 429) {
            return `${stage} 실패 — GitHub 요청 한도를 넘었습니다. 잠시 뒤 다시 시도하시거나 GitHub 설정에 PAT를 등록해 주세요.`;
        }
        return describeError(status, stage);
    }

    function paintPostOptions(posts, settings) {
        postIndex = new Map();
        el.postList.innerHTML = '';
        if (!posts.length) {
            el.postList.append(new Option('불러올 글이 없습니다.', ''));
            el.postList.disabled = true;
            el.btnLoadPost.disabled = true;
            return;
        }
        el.postList.append(new Option(`글 ${posts.length}건 · 고르면 바로 열립니다`, ''));
        posts.forEach((post) => {
            postIndex.set(post.path, post);
            el.postList.append(new Option(post.name, post.path));
        });
        el.postList.disabled = false;
        el.postList.value = '';
        el.btnLoadPost.disabled = true;
        el.loadTarget.textContent = loadTargetLabel(settings);
    }

    async function listPosts() {
        if (state.listing) return;
        const settings = githubSettings();
        const prefix = String(settings.path || '').trim().replace(/^\/+|\/+$/g, '');
        const url = `${CONTENTS_API}${settings.repo}/contents/${encodePath(prefix)}?ref=${encodeURIComponent(settings.branch)}`;
        state.listing = true;
        el.btnListPosts.disabled = true;
        el.btnListPosts.textContent = '불러오는 중…';
        el.loadTarget.textContent = loadTargetLabel(settings);
        setStatus(el.loadStatus, '글 목록을 불러오는 중입니다.');
        try {
            const response = await fetch(url, { headers: requestHeaders() });
            if (!response.ok) throw new Error(readErrorMessage(response.status, '목록 조회'));
            const items = await response.json();
            if (!Array.isArray(items)) throw new Error('목록 형식이 올바르지 않습니다. 저장소 이름과 경로 접두사를 확인해 주세요.');
            const posts = items
                .filter((item) => item && item.type === 'file' && /\.(md|markdown)$/i.test(item.name || ''))
                .sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
            paintPostOptions(posts, settings);
            if (!posts.length) {
                setStatus(el.loadStatus, `<code>${escapeHtml(prefix || '루트')}</code>에 마크다운 글이 없습니다. GitHub 설정에서 경로 접두사를 확인해 주세요.`, 'warn');
                return;
            }
            setStatus(el.loadStatus, `글 ${posts.length}건을 불러왔습니다. 목록에서 고르면 바로 열립니다.`, 'ok');
            announce(`글 ${posts.length}건을 불러왔습니다.`);
        } catch (error) {
            postIndex = new Map();
            el.postList.innerHTML = '<option value="">목록을 불러오지 못했습니다.</option>';
            el.postList.disabled = true;
            el.btnLoadPost.disabled = true;
            setStatus(el.loadStatus, escapeHtml(error.message), 'err');
            toast(error.message, 'err');
        } finally {
            state.listing = false;
            el.btnListPosts.disabled = false;
            el.btnListPosts.textContent = '목록 불러오기';
        }
    }

    async function loadPost(path) {
        const target = path || el.postList.value;
        if (!target || state.loading) return;
        const settings = githubSettings();
        const url = `${CONTENTS_API}${settings.repo}/contents/${encodePath(target)}?ref=${encodeURIComponent(settings.branch)}`;
        state.loading = true;
        const label = el.btnLoadPost.textContent;
        el.btnLoadPost.disabled = true;
        el.btnLoadPost.textContent = '여는 중…';
        setStatus(el.loadStatus, `<code>${escapeHtml(target)}</code> 파일을 여는 중입니다.`);
        try {
            const response = await fetch(url, { headers: requestHeaders() });
            if (!response.ok) throw new Error(readErrorMessage(response.status, '글 불러오기'));
            const meta = await response.json();
            let text;
            if (meta && meta.encoding === 'base64' && typeof meta.content === 'string' && meta.content) {
                text = decodeBase64Utf8(meta.content);
            } else {
                const raw = await fetch(url, { headers: Object.assign({ Accept: 'application/vnd.github.raw' }, requestHeaders()) });
                if (!raw.ok) throw new Error(readErrorMessage(raw.status, '본문 내려받기'));
                text = await raw.text();
            }
            const name = (meta && meta.name) || target.split('/').pop();
            openMarkdownText(text, { kind: 'github', name, path: (meta && meta.path) || target, sha: (meta && meta.sha) || '' });
            setStatus(el.loadStatus, `<code>${escapeHtml((meta && meta.path) || target)}</code> 글을 열었습니다. 수정한 뒤 <strong>저장소에 커밋</strong>을 누르면 같은 경로로 덮어씁니다.`, 'ok');
            toast(`${name} 글을 불러왔습니다.`, 'ok');
            announce(`${name} 글을 불러왔습니다.`);
            if (el.loadDialog.open) el.loadDialog.close();
        } catch (error) {
            setStatus(el.loadStatus, escapeHtml(error.message), 'err');
            toast(error.message, 'err');
        } finally {
            state.loading = false;
            el.btnLoadPost.disabled = !el.postList.value;
            el.btnLoadPost.textContent = label;
        }
    }

    function detachSource() {
        if (!state.loadedKind) return;
        const previous = state.loadedPath || state.loadedName;
        state.exportMetadata = '';
        state.loadedKind = '';
        state.loadedName = '';
        state.loadedPath = '';
        state.loadedSha = '';
        el.postList.value = '';
        el.btnLoadPost.disabled = true;
        el.fmTitle.value = '';
        el.fmSlug.value = '';
        el.fmTags.value = '';
        el.fmSummary.value = '';
        el.fmDate.value = todayKst();
        paintLoaded();
        paintDiary();
        paintDocHead();
        scheduleSave();
        setStatus(el.loadStatus, `<code>${escapeHtml(previous)}</code>과의 연결을 해제했습니다. 제목과 슬러그를 비웠으므로 새 파일 이름으로 저장됩니다.`, 'ok');
        setStatus(el.publishStatus, '새 글을 쓰는 중입니다. <strong>제목</strong>과 <strong>날짜</strong>로 파일 이름이 정해집니다.');
        toast('새 글로 전환했습니다. 본문은 그대로 두고 제목·태그·요약을 비웠습니다.', 'ok');
    }

    /* ---------------------------------------------------------------- github commit */
    function utf8ToBase64(text) {
        const bytes = new TextEncoder().encode(text);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return window.btoa(binary);
    }

    function apiHeaders(token) {
        return {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        };
    }

    function encodePath(path) {
        return path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    }

    async function commitToGithub() {
        if (state.committing) return;
        const token = getToken();
        if (!token) {
            setStatus(el.publishStatus, '먼저 GitHub 토큰을 등록해야 합니다. <strong>GitHub 설정</strong>에서 PAT를 저장하거나, <strong>이 글 .md 저장</strong>으로 받아 GitHub에 직접 올려도 됩니다.', 'warn');
            openSettings('GitHub PAT가 없습니다. 설정에서 한 번만 등록하면 됩니다.');
            return;
        }
        if (!bodyText().trim()) {
            setStatus(el.publishStatus, '본문이 비어 있습니다. 내용을 먼저 써 주세요.', 'err');
            return;
        }
        if (frontmatterEnabled() && !el.fmTitle.value.trim()) {
            setStatus(el.publishStatus, 'YAML frontmatter의 <strong>제목</strong>이 비어 있습니다. 제목을 채우거나 <strong>YAML Frontmatter 포함</strong>을 꺼 주세요.', 'err');
            el.fmTitle.focus();
            return;
        }

        const settings = githubSettings();
        const editing = Boolean(state.loadedPath);
        const fileName = currentFileName();
        const path = editing ? state.loadedPath : joinPath(settings.path, fileName);
        const content = fullMarkdown();
        const api = `https://api.github.com/repos/${settings.repo}/contents/${encodePath(path)}`;
        const headers = apiHeaders(token);
        const commitName = path.split('/').pop() || fileName;
        const messagePrefix = String(settings.message || '').trim();
        const commitMessage = messagePrefix ? `${messagePrefix} ${commitName}` : `update ${commitName}`;

        if (editing && !window.confirm(`불러온 글 "${path}"을(를) 덮어씁니다. 계속할까요?`)) {
            setStatus(el.publishStatus, '덮어쓰기를 취소했습니다. 새 파일로 저장하려면 파일 바의 <strong>새 글로 전환</strong>을 눌러 주세요.');
            return;
        }

        state.committing = true;
        const commitButton = $('btnCommit');
        commitButton.disabled = true;
        commitButton.textContent = '커밋 중…';
        setStatus(el.publishStatus, `<code>${path}</code> 확인 중…`);

        try {
            let sha = null;
            const head = await fetch(`${api}?ref=${encodeURIComponent(settings.branch)}`, { headers });
            if (head.ok) {
                const meta = await head.json();
                sha = meta.sha;
            } else if (editing) {
                throw new Error('불러온 원본 글을 찾지 못했습니다 (404). 새 글로 저장하려면 덮어쓰기를 취소하고 “새 글로 전환”을 눌러 주세요.');
            } else if (head.status !== 404) {
                throw new Error(describeError(head.status, '기존 파일 확인'));
            }

            const payload = {
                message: commitMessage,
                content: utf8ToBase64(content),
                branch: settings.branch,
            };
            if (sha) payload.sha = sha;

            const put = await fetch(api, {
                method: 'PUT',
                headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
                body: JSON.stringify(payload),
            });

            if (!put.ok) throw new Error(describeError(put.status, sha ? '파일 덮어쓰기' : '새 파일 생성'));

            const result = await put.json();
            if (editing) {
                state.loadedSha = (result.content && result.content.sha) || state.loadedSha;
                state.loadedPath = (result.content && result.content.path) || state.loadedPath;
                paintLoaded();
            }
            const url = (result.commit && result.commit.html_url) || `https://github.com/${settings.repo}/commit/${result.commit && result.commit.sha}`;
            const action = sha ? '덮어썼습니다' : '새로 만들었습니다';
            const buildNote = /(^|\/)diary-src\//.test(path)
                ? '<br>Diary 화면에 나타나려면 <code>diary-src</code> 빌드 후 저장소 루트 산출물(<code>index.html</code> · <code>posts/</code> · <code>categories/</code> · <code>assets/</code>)을 함께 커밋해야 합니다.'
                : '';
            setStatus(
                el.publishStatus,
                `커밋 완료 — <code>${escapeHtml(path)}</code>를 ${action}. <a href="${url}" target="_blank" rel="noopener">커밋 ${String((result.commit && result.commit.sha) || '').slice(0, 7)} 보기 ↗</a>${buildNote}`,
                'ok'
            );
            toast(`커밋 완료 · ${path}`, 'ok');
            announce('커밋을 마쳤습니다.');
        } catch (error) {
            setStatus(el.publishStatus, `${escapeHtml(error.message)}<br>토큰 권한(Contents: Read &amp; Write)과 저장소 이름을 확인해 주세요.`, 'err');
            toast(error.message, 'err');
        } finally {
            state.committing = false;
            commitButton.disabled = false;
            commitButton.textContent = '저장소에 커밋';
        }
    }

    function describeError(status, stage) {
        const map = {
            401: '토큰이 유효하지 않습니다 (401).',
            403: '권한이 없습니다 (403). Fine-grained 토큰에 Contents: Read & Write를 줘야 합니다.',
            404: '저장소나 경로를 찾지 못했습니다 (404). 저장소 이름·브랜치를 확인해 주세요.',
            409: '동시에 수정됐습니다 (409). 잠시 뒤 다시 시도해 주세요.',
            422: '요청이 거부됐습니다 (422). 경로나 브랜치가 올바른지 확인해 주세요.',
        };
        return map[status] ? `${stage} 실패 — ${map[status]}` : `${stage} 실패 — HTTP ${status}`;
    }

    /* ---------------------------------------------------------------- exports */
    function absoluteImageCandidates(value) {
        const raw=String(value||'').trim();
        if(state.loadedKind==='local'&&!/^(?:https?:|blob:|\/\/)/i.test(raw))return [];
        if (/^https?:\/\//i.test(raw)) return [raw];
        if (/^\/\//.test(raw)) return [location.protocol+raw];
        if (/^blob:/i.test(raw)) return [raw];
        if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return [];
        const settings=state.exportSource||githubSettings();
        if(!settings.repo||!settings.branch) return [];
        const root='https://raw.githubusercontent.com/'+settings.repo+'/'+encodeURIComponent(settings.branch)+'/';
        const result=[];
        const add=path=>{try{const url=new URL(path,root);if(url.href.startsWith(root)&&!result.includes(url.href))result.push(url.href)}catch(error){}};
        const prefix=String(settings.imageUrlDir||'').replace(/^\.\//,'').replace(/^\/+|\/+$/g,'');
        const clean=raw.replace(/^\.\//,'').replace(/^\/+/,'');
        if(prefix && clean.startsWith(prefix+'/')) {
            const suffix=clean.slice(prefix.length+1);
            if(settings.imageSrcDir) add(joinPath(settings.imageSrcDir,suffix));
            if(settings.imagePublicDir) add(joinPath(settings.imagePublicDir,suffix));
        }
        if(!raw.startsWith('/')) {
            const sourcePath=state.exportSource?.path||state.loadedPath||joinPath(settings.path,currentFileName());
            try {add(new URL(raw,new URL(sourcePath,root)).href)} catch(error){}
        }
        add(clean);
        return result;
    }
    const MIME_EXT = {
        'image/png': 'png', 'image/apng': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
        'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg',
        'image/bmp': 'bmp', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
        'image/tiff': 'tif', 'image/heic': 'heic', 'image/heif': 'heif',
    };

    function extensionFromMime(mime) {
        return MIME_EXT[String(mime || '').toLowerCase().split(';')[0].trim()] || '';
    }

    function extensionFromName(name) {
        const hit = /\.([a-z0-9]{1,5})$/i.exec(String(name || '').split(/[?#]/)[0]);
        if (!hit) return '';
        const ext = hit[1].toLowerCase();
        return ext === 'jpeg' ? 'jpg' : ext === 'tiff' ? 'tif' : ext;
    }

    function sniffExtension(bytes) {
        if (!bytes || bytes.length < 4) return '';
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpg';
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
        if (bytes[0] === 0x42 && bytes[1] === 0x4D) return 'bmp';
        if (bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
            && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
        return '';
    }

    function looksLikeSvg(bytes) {
        if (!bytes || !bytes.length) return false;
        const head = String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, 0, Math.min(bytes.length, 256)));
        return /^\s*(?:<\?xml|<!--|<svg)/i.test(head);
    }

    function decodeDataImage(value) {
        const hit = /^data:(image\/[a-z0-9.+-]+)((?:;[^,;]*)*),([\s\S]*)$/i.exec(String(value || ''));
        if (!hit) return null;
        const mime = hit[1].toLowerCase();
        const params = hit[2] || '';
        const payload = hit[3] || '';
        try {
            if (/;base64/i.test(params)) {
                const binary = window.atob(payload.replace(/[\s\r\n]+/g, ''));
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
                return bytes.length ? { bytes, ext: extensionFromMime(mime) || 'png' } : null;
            }
            const bytes = new TextEncoder().encode(decodeURIComponent(payload));
            return bytes.length ? { bytes, ext: extensionFromMime(mime) || 'svg' } : null;
        } catch (error) {
            return null;
        }
    }

    function bytesFrom(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.onerror = () => reject(reader.error || new Error('read error'));
            reader.readAsArrayBuffer(file);
        });
    }


    /* one image url → bytes, from an inline data uri, a file the user opened, or the network */
    async function collectImage(url) {
        const value = String(url || '').trim();
        if (!value) return null;
        if (/^data:/i.test(value)) return decodeDataImage(value);

        if (!/^(?:https?:)?\/\//i.test(value)) {
            const local = findLocalImage(value);
            if (local) {
                try {
                    const bytes = await bytesFrom(local.file);
                    if (bytes.length) {
                        const ext = extensionFromMime(local.file.type)
                            || extensionFromName(local.file.name)
                            || sniffExtension(bytes)
                            || (looksLikeSvg(bytes) ? 'svg' : 'png');
                        return { bytes, ext, origin: 'local' };
                    }
                } catch (error) { /* fall through to fetch */ }
            }
        }

        for (const absolute of absoluteImageCandidates(value)) {
            try {
                const response = await fetch(absolute, { mode: 'cors', credentials: 'omit' });
                if (!response.ok) continue;
                const blob = await response.blob();
                if (/^(?:text\/html|application\/json)(?:;|$)/i.test(blob.type)) continue;
                const bytes = new Uint8Array(await blob.arrayBuffer());
                if (!bytes.length) continue;
                const ext = extensionFromMime(blob.type)
                    || extensionFromName(absolute)
                    || sniffExtension(bytes)
                    || (looksLikeSvg(bytes) ? 'svg' : 'png');
                return { bytes, ext, origin: 'remote' };
            } catch (error) { /* try the next candidate */ }
        }
        return null;
    }


    async function buildPortablePost() {
        let markdown=fullMarkdown();
        if(!markdown.trim())throw Error('내보낼 내용이 없습니다.');
        if(state.exportMetadata && !/^---\n/.test(markdown)) markdown='---\n'+state.exportMetadata+'\n---\n\n'+markdown;
        const base=currentFileName().split(/[\\/]/).pop().replace(/\.(?:md|markdown)$/i,'')||'document';
        const bundle=await window.PortableExport.buildBundle(markdown,collectImage,base);
        return {base,bundle};
    }
    async function exportZip() {
        const button=$('btnExportZip');
        if(button.disabled)return;
        button.disabled=true;
        try {
            const {base,bundle}=await buildPortablePost();
            const zip=new window.JSZip();
            zip.folder('posts'); zip.folder('assets');
            zip.file('posts/'+base+'.md',bundle.markdown);
            bundle.assets.forEach(asset=>zip.file(asset.path,asset.bytes,{binary:true}));
            const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
            const url=URL.createObjectURL(blob), link=document.createElement('a');
            link.href=url;link.download=base+'.zip';document.body.appendChild(link);link.click();link.remove();
            setTimeout(()=>URL.revokeObjectURL(url),1000);
            toast('표준 ZIP 저장 완료 · 이미지 '+bundle.images+'개','ok');
        } catch(error) {toast('ZIP 저장 실패: '+escapeHtml(error.message),'err');}
        finally {button.disabled=false;}
    }

    async function downloadPost() {
        try {
            const {base,bundle}=await buildPortablePost();
            download(base+'.md',bundle.markdown,'text/markdown;charset=utf-8');
            toast(bundle.images?'MD 저장 완료 · 이미지는 동일한 ZIP의 assets/를 사용하세요.':'마크다운 파일을 내려받았습니다.',bundle.images?'warn':'ok');
            announce('마크다운 파일을 내려받았습니다.');
        } catch(error) {toast('MD 저장 실패: '+escapeHtml(error.message),'err');}
    }

    function exportHtml() {
        const clone = el.preview.cloneNode(true);
        clone.querySelectorAll('.md-code-head').forEach((node) => node.remove());
        clone.querySelectorAll('img').forEach((image) => {
            const raw = image.getAttribute('data-origin-src') || image.getAttribute('src');
            if (!raw) return;
            image.setAttribute('src', htmlExportSrc(raw));
            image.removeAttribute('data-origin-src');
        });
        const title = el.fmTitle.value.trim() || bodyTitle() || 'HD2Lab Document';
        const html = standaloneHtml(title, clone.innerHTML);
        const name = (hasDiaryFields() ? currentSlug() : 'document') + '.html';
        download(name, html, 'text/html;charset=utf-8');
        toast('단독 HTML 파일을 내려받았습니다.', 'ok');
    }

    function standaloneHtml(title, bodyHtml) {
        const safeTitle = escapeHtml(title || 'HD2Lab Document');
        return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<style>
:root{color-scheme:light dark;--bg:#FAFAFD;--fg:#1D192B;--body:#3F3950;--accent:#8B6CE8;--line:#E8E4F2;--soft:#F7F5FE}
@media (prefers-color-scheme:dark){:root{--bg:#0B1020;--fg:#EEF2FF;--body:#C6D0E9;--accent:#A78BFA;--line:#253154;--soft:#1A2340}}
*{box-sizing:border-box}
body{margin:0;padding:48px 20px 72px;background:var(--bg);color:var(--body);font:16px/1.9 system-ui,-apple-system,"Pretendard","Segoe UI","Apple SD Gothic Neo",sans-serif}
main{max-width:760px;margin:0 auto}
h1,h2,h3,h4{color:var(--fg);line-height:1.3;letter-spacing:-.03em;margin:34px 0 12px}
h1{font-size:30px}h2{font-size:23px;padding-top:16px;border-top:1px solid var(--line)}h3{font-size:19px}
p{margin:0 0 15px}a{color:var(--accent)}
ul,ol{padding-left:22px}li{margin-bottom:6px}
blockquote{margin:20px 0;padding:4px 0 4px 16px;border-left:3px solid var(--accent);color:var(--fg)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em;padding:2px 6px;border:1px solid var(--line);border-radius:4px;background:var(--soft)}
pre{position:relative;margin:20px 0;padding:34px 16px 16px;border:1px solid var(--line);border-radius:6px;background:var(--soft);overflow-x:auto;font-size:12.5px;line-height:1.7}
pre::before{content:attr(data-lang);position:absolute;top:10px;right:13px;color:var(--accent);font-size:9px;letter-spacing:.16em;text-transform:uppercase}
pre code{padding:0;border:none;background:none}
img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px}
table{width:100%;border-collapse:collapse;font-size:13px;margin:20px 0}
th,td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left}
th{color:var(--accent);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:6px}
hr{border:0;height:1px;background:var(--line);margin:28px 0}
input[type=checkbox]{accent-color:var(--accent)}
footer{margin:56px auto 0;max-width:760px;color:#8B8598;font-size:11px;letter-spacing:.14em;text-transform:uppercase;border-top:1px solid var(--line);padding-top:18px}
@media print{body{padding:0;background:#fff;color:#000}footer{display:none}pre,table{break-inside:avoid}}
</style>
</head>
<body>
<main>
${bodyHtml}
</main>
<footer>HD2Markdown Editor</footer>
</body>
</html>
`;
    }

    /* ---------------------------------------------------------------- export menu */
    function setExportMenu(open) {
        if (!el.exportMenu || !el.btnExportMenu) return;
        el.exportMenu.hidden = !open;
        el.btnExportMenu.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    /* ---------------------------------------------------------------- handlers */
    function onInput() {
        paintPreview();
        paintDiary();
        scheduleSave();
    }

    function wireToolbar() {
        document.querySelectorAll('.tool[data-act]').forEach((button) => {
            button.addEventListener('click', () => {
                const action = ACTIONS[button.dataset.act];
                if (action) action();
            });
        });
    }

    function wireViews() {
        const tablist = document.querySelector('.view-switch');
        const items = () => Array.from(document.querySelectorAll('.view-tab')).filter((tab) => !tab.hidden);
        document.querySelectorAll('.view-tab').forEach((tab) => {
            tab.addEventListener('click', () => setMode(tab.dataset.view));
        });
        tablist.addEventListener('keydown', (event) => {
            const list = items();
            const index = list.indexOf(document.activeElement);
            if (index === -1) return;
            let next = -1;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % list.length;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + list.length) % list.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = list.length - 1;
            if (next === -1) return;
            event.preventDefault();
            list[next].focus();
            setMode(list[next].dataset.view);
        });
        window.addEventListener('resize', () => setMode(state.mode));
    }

    function wireKeys() {
        el.editor.addEventListener('keydown', (event) => {
            const meta = event.metaKey || event.ctrlKey;
            if (meta && !event.altKey) {
                const key = event.key.toLowerCase();
                const map = { b: 'bold', i: 'italic', k: 'link' };
                if (map[key]) {
                    event.preventDefault();
                    ACTIONS[map[key]]();
                    return;
                }
                if (key === 's') {
                    event.preventDefault();
                    downloadPost();
                    return;
                }
                if (key === 'o') {
                    event.preventDefault();
                    el.fileInput.click();
                    return;
                }
                if (key === '1' || key === '2' || key === '3') {
                    event.preventDefault();
                    ACTIONS['h' + key]();
                    return;
                }
            }
            if (event.key === 'Tab') {
                event.preventDefault();
                const start = el.editor.selectionStart;
                const end = el.editor.selectionEnd;
                const value = el.editor.value;
                if (start !== end && value.slice(start, end).includes('\n')) {
                    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                    const block = value.slice(lineStart, end);
                    const shifted = block.split('\n').map((line) => '  ' + line).join('\n');
                    el.editor.value = value.slice(0, lineStart) + shifted + value.slice(end);
                    el.editor.selectionStart = lineStart;
                    el.editor.selectionEnd = lineStart + shifted.length;
                } else {
                    el.editor.value = value.slice(0, start) + '  ' + value.slice(end);
                    el.editor.selectionStart = el.editor.selectionEnd = start + 2;
                }
                onInput();
            }
        });
    }

    function wireLoad() {
        el.btnOpenLocal.addEventListener('click', () => el.fileInput.click());
        $('btnOpenLocalFolder').addEventListener('click',()=>$('folderInput').click());
        $('folderInput').addEventListener('change',event=>{handleFiles(Array.from(event.target.files||[]));event.target.value='';});
        el.fileInput.addEventListener('change', () => {
            const files = el.fileInput.files;
            handleFiles(files);
            el.fileInput.value = '';
        });
        el.btnNewDoc.addEventListener('click', detachSource);
        el.btnListPosts.addEventListener('click', listPosts);
        el.btnLoadPost.addEventListener('click', () => loadPost(el.postList.value));
        el.postList.addEventListener('change', () => {
            const path = el.postList.value;
            el.btnLoadPost.disabled = !path;
            if (path) loadPost(path);
        });
        $('btnLoadDialog').addEventListener('click', () => {
            el.loadTarget.textContent = loadTargetLabel(githubSettings());
            showDialog(el.loadDialog);
            if (!el.postList.options.length || el.postList.disabled) el.btnListPosts.focus();
        });
        wireDropZone();
    }

    function entryFiles(entry, out) {
        return new Promise((resolve) => {
            if (!entry) { resolve(); return; }
            if (entry.isFile) {
                entry.file(
                    (file) => {
                        out.push({ file, relative: String(entry.fullPath || file.name || '').replace(/^\/+/, '') });
                        resolve();
                    },
                    () => resolve(),
                );
                return;
            }
            if (!entry.isDirectory) { resolve(); return; }
            const reader = entry.createReader();
            const readBatch = () => {
                /* readEntries hands over at most 100 entries per call, so keep asking */
                reader.readEntries((entries) => {
                    if (!entries || !entries.length) { resolve(); return; }
                    Promise.all(entries.map((child) => entryFiles(child, out))).then(readBatch, readBatch);
                }, () => resolve());
            };
            readBatch();
        });
    }

    /* the entries must be taken while the drop event is still being handled */
    function readDroppedEntries(dataTransfer) {
        const items = dataTransfer && dataTransfer.items ? Array.from(dataTransfer.items) : [];
        const handles = items
            .map((item) => (item && typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
            .filter(Boolean);
        if (!handles.length) return Promise.resolve(null);
        const records = [];
        const roots = [];
        return handles.reduce((chain, entry) => chain.then(() => {
            if (entry.isDirectory) {
                const root = String(entry.fullPath || '').replace(/^\/+/, '').split('/')[0] || entry.name || '';
                if (root && !roots.includes(root)) roots.push(root);
            }
            return entryFiles(entry, records);
        }), Promise.resolve()).then(() => ({ records, folderRoot: roots[0] || '' }));
    }

    function wireDropZone() {
        let depth = 0;
        const carriesFiles = (event) => {
            const transfer = event.dataTransfer;
            if (!transfer) return false;
            const types = transfer.types ? Array.prototype.slice.call(transfer.types) : [];
            return types.indexOf('Files') !== -1;
        };
        window.addEventListener('dragenter', (event) => {
            if (!carriesFiles(event)) return;
            event.preventDefault();
            depth += 1;
            el.dropOverlay.hidden = false;
        });
        window.addEventListener('dragover', (event) => {
            if (!carriesFiles(event)) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
            el.dropOverlay.hidden = false;
        });
        window.addEventListener('dragleave', (event) => {
            if (!carriesFiles(event)) return;
            depth = Math.max(0, depth - 1);
            if (!depth) el.dropOverlay.hidden = true;
        });
        window.addEventListener('drop', (event) => {
            if (!carriesFiles(event)) return;
            event.preventDefault();
            depth = 0;
            el.dropOverlay.hidden = true;
            const plain=Array.from(event.dataTransfer.files||[]);
            readDroppedEntries(event.dataTransfer).then(result=>handleFiles(result&&result.records.length?result.records:plain)).catch(()=>handleFiles(plain));
        });
        window.addEventListener('dragend', () => { depth = 0; el.dropOverlay.hidden = true; });
        window.addEventListener('blur', () => { depth = 0; el.dropOverlay.hidden = true; });
    }

    /* a form inside <dialog method="dialog"> would close on Enter — keep the fields usable */
    function wireDialogs() {
        [el.publishDialog, el.loadDialog, el.ghDialog].forEach((dialog) => {
            const form = dialog.querySelector('form');
            if (!form) return;
            form.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target && event.target.tagName === 'INPUT') {
                    event.preventDefault();
                }
            });
        });
        $('btnHelp').addEventListener('click', () => showDialog(el.helpDialog));
        $('btnPublish').addEventListener('click', openPublish);
    }

    function wireExport() {
        el.btnExportMenu.addEventListener('click', (event) => {
            event.stopPropagation();
            setExportMenu(el.exportMenu.hidden);
        });
        el.exportMenu.addEventListener('click', (event) => {
            const item = event.target.closest('[data-export]');
            if (!item) return;
            setExportMenu(false);
            const action = item.dataset.export;
            if (action === 'html') exportHtml();
            else if (action === 'md') downloadPost();
            else if (action === 'zip') exportZip();
            else if (action === 'print') window.print();
            else if (action === 'copy-md') copyText(fullMarkdown(), '마크다운을 복사했습니다.');
            else if (action === 'copy-html') copyText(renderMarkdown(el.editor.value), 'HTML을 복사했습니다.');
        });
        document.addEventListener('click', (event) => {
            if (event.target.closest && event.target.closest('.split-btn')) return;
            setExportMenu(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setExportMenu(false);
        });
    }

    function wireToc() {
        el.btnToc.addEventListener('click', () => {
            const open = el.tocPanel.classList.toggle('is-open');
            el.btnToc.setAttribute('aria-expanded', open ? 'true' : 'false');
            el.btnToc.setAttribute('aria-label', open ? '목차 닫기' : '목차 열기');
            if (open) el.tocNav.scrollTop = 0;
        });
        el.btnTocClose.addEventListener('click', closeTocDrawer);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && el.tocPanel.classList.contains('is-open')) closeTocDrawer();
        });
        el.btnTop.addEventListener('click', () => {
            const pane = previewScroller();
            const behavior = reduceMotion() ? 'auto' : 'smooth';
            if (typeof pane.scrollTo === 'function') pane.scrollTo({ top: 0, behavior });
            else pane.scrollTop = 0;
            const first = el.tocNav.querySelector('.toc-link');
            setActiveToc(first ? first.dataset.target : '');
        });
        el.docPreview.addEventListener('scroll', () => {
            if (el.docPreview._raf) return;
            el.docPreview._raf = window.requestAnimationFrame(() => {
                el.docPreview._raf = 0;
                syncTopButton();
                hintActiveFromHeadings();
            });
        }, { passive: true });
    }

    function wireActions() {
        $('btnDownloadMd').addEventListener('click', downloadPost);
        $('btnDownloadPost').addEventListener('click', downloadPost);
        $('btnReset').addEventListener('click', () => {
            if (!window.confirm('작성 중인 본문과 Diary 입력값을 모두 지웁니다. 계속할까요?')) return;
            try { window.localStorage.removeItem(DRAFT_KEY); } catch (error) { /* ignore */ }
            el.editor.value = '';
            el.fmTitle.value = '';
            el.fmSlug.value = '';
            el.fmTags.value = '';
            el.fmSummary.value = '';
            el.fmDate.value = todayKst();
            setCategoryValue(CATEGORIES[0]);
            el.saveState.textContent = '초기화됨 · 아직 저장된 초안 없음';
            el.saveState.classList.remove('is-ok');
            detachSilently();
            onInput();
            el.editor.focus();
        });
        $('btnOpenSettings').addEventListener('click', () => openSettings());
        $('btnSettings').addEventListener('click', () => openSettings());
        $('btnSaveSettings').addEventListener('click', saveGithubSettings);
        $('btnRestoreDefaults').addEventListener('click', restoreSettingsDefaults);
        $('btnCancelSettings').addEventListener('click', () => { if (el.ghDialog.open) el.ghDialog.close(); });
        document.querySelectorAll('[data-preset]').forEach((chip) => {
            chip.addEventListener('click', () => applyPreset(chip.dataset.preset));
        });
        if (el.ghForm) {
            el.ghForm.addEventListener('input', () => { paintPresetChips(); paintRepoHint(); });
        }
        if (el.fmToggle) el.fmToggle.addEventListener('change', onFrontmatterToggle);
        if (el.btnCopyPost) el.btnCopyPost.addEventListener('click', () => copyText(fullMarkdown(), '마크다운을 복사했습니다.'));
        $('btnForgetToken').addEventListener('click', forgetToken);
        $('btnCommit').addEventListener('click', commitToGithub);

        [el.fmTitle, el.fmCategory, el.fmDate, el.fmSlug, el.fmTags, el.fmSummary].forEach((input) => {
            input.addEventListener('input', () => { paintDiary(); paintDocHead(); scheduleSave(); });
            input.addEventListener('change', () => { paintDiary(); paintDocHead(); scheduleSave(); });
        });

        el.editor.addEventListener('input', onInput);

        el.imageInput.addEventListener('change', () => {
            const file = el.imageInput.files && el.imageInput.files[0];
            el.imageInput.value = '';
            uploadImage(file);
        });
    }

    function detachSilently() {
        state.exportMetadata = '';
        state.exportSource = null;
        state.loadedKind = '';
        state.loadedName = '';
        state.loadedPath = '';
        state.loadedSha = '';
        paintLoaded();
        paintDiary();
        paintDocHead();
    }

    /* ---------------------------------------------------------------- boot */
    function boot() {
        if (!window.markdownit) {
            el.saveState.textContent = '렌더러를 불러오지 못했습니다. 새로고침해 주세요.';
            return;
        }
        loadDraft();
        paintLoaded();
        paintPreview();
        paintDiary();
        paintDocHead();
        paintGhState();
        const settings = githubSettings();
        paintCategoryOptions(settings.categories);
        paintGithubForm(settings);
        paintPublishTarget(settings);
        if (el.fmToggle) el.fmToggle.checked = settings.useFrontmatter;
        applyPublishMode();
        setMode(state.savedMode || (mediaNarrow() ? 'edit' : 'split'));
        wireToolbar();
        wireViews();
        wireKeys();
        wireActions();
        wireLoad();
        wireDialogs();
        wireExport();
        wireToc();
        el.ghNewFile.href = newFileUrl();
        window.addEventListener('beforeunload', () => {
            if (state.dirty) saveDraft();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    /* exposed for tests */
    window.HD2Editor = {
        slugify,
        slug,
        currentFileName,
        buildFrontmatter,
        fullMarkdown,
        exportZip,
        renderMarkdown,
        utf8ToBase64,
        commitToGithub,
        setMode,
        parseFrontmatter,
        openMarkdownText,
        openLocalFile,
        handleFiles,
        rememberLocalImages,
        findLocalImage,
        listPosts,
        loadPost,
        detachSource,
        decodeBase64Utf8,
        pickImage,
        uploadImage,
        imageFileName,
        joinPath,
        joinUrl,
        insertImageMarkdown,
        buildToc,
        paintPreview,
        paintDocHead,
        scrollToHeading,
        setExportMenu,
        githubSettings,
        openSettings,
        saveGithubSettings,
        applyPreset,
        restoreSettingsDefaults,
        openPublish,
        frontmatterEnabled,
        applyPublishMode,
        paintCategoryOptions,
        getState: () => ({ mode: state.mode, headings: state.headings.length, localImages: state.localImages.size }),
        getSettings: () => githubSettings(),
        getLoaded: () => ({ kind: state.loadedKind, name: state.loadedName, path: state.loadedPath, sha: state.loadedSha }),
    };
})();

/* ---------- HD2Lab title bar: theme switch and the ⋮ portal menu ----------
   Same two controls every current HD2Lab app keeps in its title bar, in the
   same places: help (?), the light/dark switch, and the ⋮ menu holding the way
   back to the portal, the app catalog, the sibling app and the source. */
(function () {
    'use strict';

    var root = document.documentElement;
    var themeBtn = document.getElementById('btnTheme');
    var menuBtn = document.getElementById('btnPortalMenu');
    var menu = document.getElementById('portalMenu');

    /* --- theme switch (the floating shared toggle is hidden on this page) --- */
    function isDark() {
        return root.getAttribute('data-theme') === 'dark';
    }

    function paintTheme() {
        if (!themeBtn) return;
        var dark = isDark();
        var text = dark ? '라이트 모드로 전환' : '다크 모드로 전환 (네이비 & 라벤더)';
        themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        themeBtn.setAttribute('aria-label', text);
        themeBtn.setAttribute('title', text);
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            if (window.HD2Theme && typeof window.HD2Theme.toggle === 'function') {
                window.HD2Theme.toggle();
            } else {
                var next = isDark() ? 'light' : 'dark';
                root.setAttribute('data-theme', next);
                try { window.localStorage.setItem('hd2-theme', next); } catch (error) { /* storage off */ }
            }
        });
        window.addEventListener('hd2-theme-change', paintTheme);
        paintTheme();
    }

    /* --- ⋮ menu --- */
    function setMenu(open) {
        if (!menu || !menuBtn) return;
        if (open) menu.removeAttribute('hidden');
        else menu.setAttribute('hidden', '');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function menuOpen() {
        return !!(menu && !menu.hasAttribute('hidden'));
    }

    if (menuBtn && menu) {
        menuBtn.addEventListener('click', function (event) {
            event.stopPropagation();
            setMenu(!menuOpen());
        });

        document.addEventListener('pointerdown', function (event) {
            if (!menuOpen()) return;
            if (menuBtn.contains(event.target) || menu.contains(event.target)) return;
            setMenu(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && menuOpen()) {
                setMenu(false);
                menuBtn.focus();
            }
        });

        menu.addEventListener('click', function (event) {
            if (event.target.closest('a')) setMenu(false);
        });

        window.addEventListener('blur', function () { setMenu(false); });
    }
})();
