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
let mobileScaleInitialized = false;
let mobileScaleObserver = null;
let pdfPreviewInitialized = false;
let pdfModal = null;
let pdfModalIframe = null;
let pdfModalTitleEl = null;
let pdfModalCloseButton = null;
let pdfModalTrigger = null;
let scrollSpyScheduled = false;
let scrollSpyInitialized = false;
const VIEWER_MIN_SCALE = 0.55;
const VIEWER_SCALE_EPSILON = 0.001;
const VIEWER_VIEWPORT_PADDING = 32;
const VIEWER_MIN_AVAILABLE_WIDTH = 240;

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
      ADD_TAGS: ['math', 'semantics', 'annotation', 'iframe'],
      ADD_ATTR: [
        'class',
        'style',
        'src',
        'title',
        'loading',
        'allow',
        'allowfullscreen',
        'referrerpolicy',
        'sandbox',
        'width',
        'height',
      ],
      ALLOW_DATA_ATTR: true,
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
    initPdfPreviewInteractions();
    scrollToChapter(currentSelectedChapterId, { behavior: 'auto' });
    statusEl.textContent = 'Bereit';
    initResponsiveScaling();
    initScrollSpy();
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

function initResponsiveScaling() {
  if (mobileScaleInitialized || !viewer) {
    return;
  }
  mobileScaleInitialized = true;
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) {
    return;
  }

  const applyScale = () => {
    const firstPage = viewer.querySelector('.doc-page');
    if (!firstPage) {
      return;
    }
    const baseWidth = Math.max(firstPage.offsetWidth, firstPage.scrollWidth, 1);
    const viewportWidth = root.clientWidth || window.innerWidth || baseWidth;
    const availableWidth = Math.max(viewportWidth - VIEWER_VIEWPORT_PADDING, VIEWER_MIN_AVAILABLE_WIDTH);
    let scale = availableWidth / baseWidth;
    if (scale > 1) {
      scale = 1;
    } else if (scale < VIEWER_MIN_SCALE) {
      scale = VIEWER_MIN_SCALE;
    }
    root.style.setProperty('--viewer-scale', scale.toFixed(3));
    const isScaled = scale < 0.999;
    body.classList.toggle('viewer--scaled', isScaled);
    const isMinScale = scale <= VIEWER_MIN_SCALE + VIEWER_SCALE_EPSILON;
    body.classList.toggle('viewer--minscale', isMinScale);
  };

  const debouncedApply = () => window.requestAnimationFrame(applyScale);

  window.addEventListener('resize', debouncedApply);
  window.addEventListener('orientationchange', debouncedApply);
  if (typeof ResizeObserver === 'function') {
    mobileScaleObserver = new ResizeObserver(debouncedApply);
    mobileScaleObserver.observe(viewer);
  }
  applyScale();
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
  const suppressHighlight = options.suppressHighlight ?? options.temporary ?? false;
  if (!suppressHighlight) {
    markActiveChapter(chapterId);
  }
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

function initPdfPreviewInteractions() {
  if (pdfPreviewInitialized) {
    return;
  }
  pdfPreviewInitialized = true;
  ensurePdfModal();
  document.addEventListener('click', handlePdfPreviewTriggerClick);
  window.addEventListener('keydown', handlePdfModalKeydown);
}

function handlePdfPreviewTriggerClick(event) {
  const trigger = event.target?.closest?.('[data-pdf-open]');
  if (!trigger) {
    return;
  }
  const pdfUrl = trigger.getAttribute('data-pdf-open');
  if (!pdfUrl) {
    return;
  }
  event.preventDefault();
  const title = trigger.getAttribute('data-pdf-title') ?? trigger.dataset?.pdfTitle ?? trigger.title ?? '';
  openPdfModal(pdfUrl, title, trigger);
}

function handlePdfModalKeydown(event) {
  if (event.key === 'Escape' && pdfModal?.classList.contains('is-visible')) {
    event.preventDefault();
    closePdfModal();
  }
}

function ensurePdfModal() {
  if (pdfModal) {
    return;
  }
  pdfModal = document.createElement('div');
  pdfModal.className = 'pdf-modal';
  pdfModal.setAttribute('aria-hidden', 'true');
  pdfModal.innerHTML = `
    <div class="pdf-modal__backdrop" data-pdf-close aria-hidden="true"></div>
    <div class="pdf-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-modal-title">
      <div class="pdf-modal__header">
        <div class="pdf-modal__title" id="pdf-modal-title">PDF Vorschau</div>
        <button type="button" class="pdf-modal__close" data-pdf-close aria-label="PDF-Viewer schließen">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div class="pdf-modal__body">
        <iframe class="pdf-modal__iframe" title="PDF Vorschau" loading="lazy"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(pdfModal);
  pdfModalIframe = pdfModal.querySelector('.pdf-modal__iframe');
  pdfModalTitleEl = pdfModal.querySelector('.pdf-modal__title');
  pdfModalCloseButton = pdfModal.querySelector('.pdf-modal__close');
  const closeElements = pdfModal.querySelectorAll('[data-pdf-close]');
  closeElements.forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      closePdfModal();
    });
  });
}

function openPdfModal(rawUrl, rawTitle, trigger) {
  ensurePdfModal();
  const normalizedUrl = applyPdfViewerParams(resolvePdfUrl(rawUrl), {
    toolbar: '1',
    navpanes: '0',
    zoom: 'page-fit',
  });
  if (!normalizedUrl) {
    return;
  }
  pdfModalTrigger = trigger ?? null;
  if (pdfModalTitleEl) {
    pdfModalTitleEl.textContent = rawTitle?.trim?.() || 'PDF Vorschau';
  }
  if (pdfModalIframe) {
    pdfModalIframe.src = normalizedUrl;
  }
  pdfModal?.classList.add('is-visible');
  pdfModal?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('pdf-modal-open');
  window.requestAnimationFrame(() => {
    pdfModalCloseButton?.focus();
  });
}

function closePdfModal() {
  if (!pdfModal) {
    return;
  }
  pdfModal.classList.remove('is-visible');
  pdfModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('pdf-modal-open');
  if (pdfModalIframe) {
    pdfModalIframe.src = '';
  }
  if (pdfModalTrigger) {
    pdfModalTrigger.focus?.();
    pdfModalTrigger = null;
  }
}

function resolvePdfUrl(rawUrl) {
  const value = (rawUrl ?? '').toString().trim();
  if (!value) {
    return '';
  }
  try {
    return new URL(value, window.location.href).href;
  } catch (error) {
    return value;
  }
}

function applyPdfViewerParams(url, params = {}) {
  if (!url) {
    return '';
  }
  try {
    const parsed = new URL(url, window.location.href);
    const hash = parsed.hash?.replace(/^#/, '') ?? '';
    const hashParams = new URLSearchParams(hash);
    Object.entries(params).forEach(([key, val]) => {
      if (typeof val === 'undefined' || val === null) {
        return;
      }
      hashParams.set(key, val);
    });
    const serialized = hashParams.toString();
    parsed.hash = serialized ? `#${serialized}` : '';
    return parsed.href;
  } catch (error) {
    return url;
  }
}

function initScrollSpy() {
  if (scrollSpyInitialized || !viewer) {
    return;
  }
  scrollSpyInitialized = true;
  const handler = () => scheduleScrollSpyUpdate();
  window.addEventListener('scroll', handler, { passive: true });
  viewer.addEventListener('scroll', handler, { passive: true });
  scheduleScrollSpyUpdate();
}

function scheduleScrollSpyUpdate() {
  if (scrollSpyScheduled) {
    return;
  }
  scrollSpyScheduled = true;
  window.requestAnimationFrame(() => {
    scrollSpyScheduled = false;
    updateActiveChapterFromViewport();
  });
}

function updateActiveChapterFromViewport() {
  if (pendingHoverChapterId) {
    return;
  }
  const chapterId = findChapterClosestToViewport();
  if (!chapterId || chapterId === currentSelectedChapterId) {
    return;
  }
  if (!availableChapters.some((entry) => entry?.id === chapterId)) {
    return;
  }
  currentSelectedChapterId = chapterId;
  markActiveChapter(chapterId);
  updateHashWithChapterId(chapterId);
}

function findChapterClosestToViewport() {
  if (!viewer) {
    return null;
  }
  const pages = Array.from(viewer.querySelectorAll('.doc-page'));
  if (!pages.length) {
    return null;
  }
  const anchorOffset = getViewerAnchorOffset();
  let candidate = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const page of pages) {
    const rect = page.getBoundingClientRect();
    if (rect.bottom <= anchorOffset + 4) {
      continue;
    }
    if (rect.top <= anchorOffset && rect.bottom >= anchorOffset) {
      candidate = page;
      break;
    }
    const delta = Math.abs(rect.top - anchorOffset);
    if (delta < bestDelta) {
      bestDelta = delta;
      candidate = page;
    }
  }

  if (!candidate) {
    candidate = pages[pages.length - 1];
  }
  return candidate?.dataset.chapterId ?? null;
}

function getViewerAnchorOffset() {
  const header = document.querySelector('.viewer-header');
  if (!header) {
    return 0;
  }
  const marginBottom = parseFloat(window.getComputedStyle(header).marginBottom) || 0;
  return (header.offsetHeight || 0) + marginBottom + 16;
}

window.addEventListener('DOMContentLoaded', initViewer);
window.addEventListener('hashchange', handleHashChange);
