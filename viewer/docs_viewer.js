const viewer = document.getElementById('doc-viewer');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('project-title');

const viewerScriptUrl = document.currentScript?.src ?? location.href;
const viewerScriptDir = new URL('.', viewerScriptUrl);
const docsBaseUrl = new URL('../docs/', viewerScriptDir);
const manifestUrl = new URL('doc_manifest.json', docsBaseUrl).href;
const chapterPanelButton = document.getElementById('chapter-menu-button');
const chapterPanel = document.getElementById('chapter-panel');
const chapterPanelContent = document.getElementById('chapter-panel-content');
const chapterPanelClose = document.getElementById('chapter-panel-close');
const chapterPanelBackdrop = document.getElementById('chapter-panel-backdrop');
const CHAPTER_HASH_PARAM = 'chapter';
const chapterEntryMap = new Map();
let currentSelectedChapterId = null;
let pendingHoverChapterId = null;
let availableChapters = [];

const markdown = window.markdownit?.({
  html: true,
  linkify: true,
  typographer: true,
});

const STATUS_META = {
  done: { label: 'done', pillClass: 'status-pill--done', entryClass: 'chapter-entry--done' },
  in_progress: {
    label: 'in progress',
    pillClass: 'status-pill--in-progress',
    entryClass: 'chapter-entry--in_progress',
  },
  not_started: {
    label: 'not started',
    pillClass: 'status-pill--not-started',
    entryClass: 'chapter-entry--not_started',
  },
};

function renderMathContent(root) {
  if (!root || typeof window.renderMathInElement !== 'function') {
    return;
  }
  try {
    window.renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
    });
  } catch (mathError) {
    console.error('KaTeX-Rendering fehlgeschlagen', mathError);
  }
}

async function loadManifest() {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Manifest ${manifestUrl} nicht geladen (${response.status})`);
  }
  return response.json();
}

function ensureSanitized(html) {
  return (
    DOMPurify?.sanitize(html, {
      ADD_TAGS: ['math', 'semantics', 'annotation'],
      ADD_ATTR: ['class', 'style'],
    }) ?? html
  );
}

function normalizeStatus(rawStatus) {
  const value = (rawStatus ?? '').toString().toLowerCase().trim();
  if (value === 'done') return 'done';
  if (value === 'in progress' || value === 'in_progress') return 'in_progress';
  if (value === 'not started' || value === 'not_started') return 'not_started';
  return 'not_started';
}

function createStatusBadge(statusKey) {
  const meta = STATUS_META[statusKey] ?? STATUS_META.not_started;
  const pill = document.createElement('span');
  pill.className = `status-pill ${meta.pillClass}`;
  pill.textContent = meta.label;
  return pill;
}

function setupPanel() {
  if (chapterPanelButton) {
    chapterPanelButton.addEventListener('click', () => {
      chapterPanel?.classList.contains('is-open') ? closePanel() : openPanel();
    });
  }
  chapterPanelClose?.addEventListener('click', closePanel);
  chapterPanelBackdrop?.addEventListener('click', closePanel);
  chapterPanel?.addEventListener('mouseleave', revertHoverChapter);
}

function readChapterIdFromHash() {
  const hash = window.location.hash?.replace(/^#/, '') ?? '';
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const value = params.get(CHAPTER_HASH_PARAM);
  return value ? value.trim() : null;
}

function updateHashWithChapterId(chapterId) {
  const params = new URLSearchParams(window.location.hash?.replace(/^#/, '') ?? '');
  if (!chapterId) {
    params.delete(CHAPTER_HASH_PARAM);
  } else {
    params.set(CHAPTER_HASH_PARAM, chapterId);
  }
  const serialized = params.toString();
  const newHash = serialized ? `#${serialized}` : '';
  const target = `${window.location.pathname}${window.location.search}${newHash}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== target) {
    history.replaceState(null, '', target);
  }
}

function handleHashChange() {
  const chapterId = readChapterIdFromHash();
  if (!chapterId || chapterId === currentSelectedChapterId) {
    return;
  }
  if (!availableChapters.some((entry) => entry.id === chapterId)) {
    return;
  }
  currentSelectedChapterId = chapterId;
  scrollToChapter(chapterId, { behavior: 'auto' });
}

async function initViewer() {
  setupPanel();
  if (!viewer) {
    console.error('Viewer container missing');
    return;
  }

  try {
    const manifest = await loadManifest();
    if (!Array.isArray(manifest) || !manifest.length) {
      statusEl.textContent = 'Keine Kapitel vorhanden.';
      return;
    }

    availableChapters = manifest.filter((chapter) => chapter?.visible_in_viewer !== false);
    const chapters = availableChapters;
    if (!chapters.length) {
      statusEl.textContent = 'Keine sichtbaren Kapitel konfiguriert.';
      return;
    }
    const hashChapterId = readChapterIdFromHash();
    if (hashChapterId && chapters.some((chapter) => chapter.id === hashChapterId)) {
      currentSelectedChapterId = hashChapterId;
    } else if (!currentSelectedChapterId) {
      currentSelectedChapterId = chapters[0]?.id;
    }

    renderChapterMenu(chapters);
    await renderChapters(chapters);
    scrollToChapter(currentSelectedChapterId, { behavior: 'auto' });
    statusEl.textContent = 'Bereit';
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Fehler beim Laden der Dokumentation.';
  }
}

async function renderChapters(chapters) {
  for (const chapter of chapters) {
    await appendChapter(chapter);
  }
}

async function appendChapter(chapter) {
  if (!chapter?.file) {
    return;
  }

  try {
    const content = await fetchChapterContent(chapter.file);
    const { content: body, frontmatter } = splitFrontmatter(content);
    const layoutFromFrontmatter = normalizeLayout(frontmatter?.layout);
    const layoutFromManifest = normalizeLayout(chapter?.layout);
    const layoutType = layoutFromFrontmatter || layoutFromManifest || '';
    const forceBefore = resolveBooleanFlag(frontmatter, chapter, 'force_new_page_before');
    const breakAfter = resolveBooleanFlag(frontmatter, chapter, 'page_break_after');
    const rendered = markdown?.render(body) ?? body;
    const safe = ensureSanitized(rendered);
    const nodes = htmlStringToNodes(safe);

    const pages =
      layoutType === 'a4'
        ? paginateChapterContent(chapter, nodes, { forceBefore })
        : [renderSingleChapterPage(chapter, nodes, { layoutType, forceBefore })];

    if (breakAfter && pages.length) {
      pages[pages.length - 1].section.classList.add('page-break-after');
    }

    pages.forEach(({ section }) => {
      renderMathContent(section);
    });

    if (currentSelectedChapterId === chapter.id) {
      markActiveChapter(chapter.id);
    }
  } catch (error) {
    console.error(error);
  }
}

async function fetchChapterContent(file) {
  const url = new URL(file, docsBaseUrl);
  url.searchParams.set('t', Date.now().toString());
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Kapitel ${file} nicht geladen (${response.status})`);
  }
  return response.text();
}

function splitFrontmatter(text) {
  const match = text.match(/^---\s*([\s\S]*?)\s*---\s*/);
  if (!match) {
    return { frontmatter: {}, content: text };
  }
  return {
    frontmatter: jsyaml.load(match[1]) ?? {},
    content: text.slice(match[0].length),
  };
}

function htmlStringToNodes(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return Array.from(template.content.childNodes);
}

function normalizeLayout(layout) {
  return (layout ?? '').toString().trim().toLowerCase();
}

function resolveBooleanFlag(frontmatter, chapter, key) {
  if (Object.prototype.hasOwnProperty.call(frontmatter ?? {}, key)) {
    return normalizeBoolean(frontmatter[key]);
  }
  if (Object.prototype.hasOwnProperty.call(chapter ?? {}, key)) {
    return normalizeBoolean(chapter[key]);
  }
  return false;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return false;
}

function renderSingleChapterPage(chapter, nodes, { layoutType, forceBefore }) {
  const page = createChapterPage(chapter, {
    layoutType,
    pageIndex: 1,
    forceNewPageBefore: forceBefore,
  });
  nodes.forEach((node) => page.contentEl.appendChild(node));
  return page;
}

function paginateChapterContent(chapter, nodes, { forceBefore }) {
  const pages = [];
  let pageIndex = 1;
  let currentPage = createChapterPage(chapter, {
    layoutType: 'a4',
    pageIndex,
    forceNewPageBefore: forceBefore,
  });
  pages.push(currentPage);
  let availableHeight = calculateAvailableContentHeight(currentPage.section);

  nodes.forEach((node) => {
    if (!node) return;
    currentPage.contentEl.appendChild(node);
    if (currentPage.contentEl.scrollHeight > availableHeight + 1) {
      currentPage.contentEl.removeChild(node);
      pageIndex += 1;
      currentPage = createChapterPage(chapter, { layoutType: 'a4', pageIndex });
      pages.push(currentPage);
      availableHeight = calculateAvailableContentHeight(currentPage.section);
      currentPage.contentEl.appendChild(node);
    }
  });

  return pages;
}

function createChapterPage(chapter, { layoutType, pageIndex, forceNewPageBefore }) {
  const section = document.createElement('section');
  section.classList.add('doc-page');
  if (layoutType === 'a4') {
    section.classList.add('doc-page--a4');
  }
  const chapterId = chapter?.id ?? '';
  section.dataset.chapterId = chapterId;
  section.dataset.pageIndex = pageIndex?.toString() ?? '1';
  section.dataset.layout = layoutType || 'default';
  if (chapterId) {
    section.id = pageIndex === 1 ? `chapter-${chapterId}` : `chapter-${chapterId}-p${pageIndex}`;
  }
  if (forceNewPageBefore && pageIndex === 1) {
    section.classList.add('force-new-page-before');
  }
  const contentEl = document.createElement('div');
  contentEl.className = 'doc-content';
  section.appendChild(contentEl);
  viewer.appendChild(section);
  return { section, contentEl };
}

function calculateAvailableContentHeight(section) {
  const styles = window.getComputedStyle(section);
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const paddingBottom = parseFloat(styles.paddingBottom) || 0;
  return section.clientHeight - paddingTop - paddingBottom;
}

function renderChapterMenu(chapters) {
  if (!chapterPanelContent) return;
  chapterPanelContent.innerHTML = '';
  chapterEntryMap.clear();

  const groups = new Map();
  for (const chapter of chapters) {
    if (!chapter?.id) continue;
    const [major, minor = ''] = chapter.id.split('.');
    if (!groups.has(major)) {
      groups.set(major, { parent: null, children: [] });
    }
    const group = groups.get(major);
    if (minor === '0') {
      group.parent = chapter;
    } else {
      group.children.push(chapter);
    }
  }

  groups.forEach((group, key) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'chapter-group';
    if (group.parent) {
      wrapper.appendChild(createChapterButton(group.parent, 'chapter-entry--parent'));
    } else {
      const heading = document.createElement('div');
      heading.className = 'chapter-group__heading';
      heading.textContent = `Kapitel ${key}`;
      wrapper.appendChild(heading);
    }
    if (group.children.length) {
      const childWrapper = document.createElement('div');
      childWrapper.className = 'chapter-group__children';
      group.children.forEach((child) => {
        childWrapper.appendChild(createChapterButton(child, 'chapter-entry--child'));
      });
      wrapper.appendChild(childWrapper);
    }
    chapterPanelContent.appendChild(wrapper);
  });

  markActiveChapter(currentSelectedChapterId);
}

function createChapterButton(chapter, extraClass) {
  const button = document.createElement('button');
  button.type = 'button';
  const normalizedStatus = normalizeStatus(chapter?.status);
  button.className = `chapter-entry${extraClass ? ` ${extraClass}` : ''} ${STATUS_META[normalizedStatus]?.entryClass ?? ''}`;
  button.dataset.status = normalizedStatus;

  const textWrap = document.createElement('div');
  textWrap.className = 'chapter-entry__text';

  const idEl = document.createElement('span');
  idEl.className = 'chapter-entry__id';
  idEl.textContent = chapter.id ?? '';

  const titleEl = document.createElement('span');
  titleEl.className = 'chapter-entry__title';
  titleEl.textContent = chapter.title ?? '';

  textWrap.appendChild(idEl);
  textWrap.appendChild(titleEl);

  button.appendChild(textWrap);
  button.appendChild(createStatusBadge(normalizedStatus));

  button.addEventListener('click', () => {
    currentSelectedChapterId = chapter.id;
    scrollToChapter(chapter.id);
    closePanel();
  });
  button.addEventListener('mouseenter', () => {
    pendingHoverChapterId = chapter.id;
    scrollToChapter(chapter.id, { temporary: true });
  });
  chapterEntryMap.set(chapter.id, button);
  return button;
}

function cssEscapeValue(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

function findChapterNode(chapterId) {
  const anchor = document.getElementById(`chapter-${chapterId}`);
  if (anchor) return anchor;
  if (!chapterId) return null;
  const selector = `[data-chapter-id="${cssEscapeValue(chapterId)}"]`;
  return document.querySelector(selector);
}

function scrollToChapter(chapterId, options = {}) {
  const target = findChapterNode(chapterId);
  if (!target) return;
  const behavior = options.behavior ?? (options.temporary ? 'auto' : 'smooth');
  target.scrollIntoView({ behavior, block: 'start' });
  if (!options.temporary) {
    currentSelectedChapterId = chapterId;
    updateHashWithChapterId(chapterId);
  }
  markActiveChapter(chapterId);
}

function markActiveChapter(chapterId) {
  viewer.querySelectorAll('.doc-page').forEach((section) => {
    section.classList.toggle('active-chapter', section.dataset.chapterId === chapterId);
  });
  chapterEntryMap.forEach((button, id) => {
    button.classList.toggle('active', id === chapterId);
  });
}

function openPanel() {
  chapterPanel?.classList.add('is-open');
  chapterPanelBackdrop?.classList.add('is-visible');
}

function closePanel() {
  chapterPanel?.classList.remove('is-open');
  chapterPanelBackdrop?.classList.remove('is-visible');
  pendingHoverChapterId = null;
  scrollToChapter(currentSelectedChapterId ?? '');
}

function revertHoverChapter() {
  if (!pendingHoverChapterId) return;
  scrollToChapter(currentSelectedChapterId ?? '', { temporary: true });
  pendingHoverChapterId = null;
}

window.addEventListener('DOMContentLoaded', initViewer);
window.addEventListener('hashchange', handleHashChange);
