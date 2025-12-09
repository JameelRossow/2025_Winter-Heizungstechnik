const viewer = document.getElementById('doc-viewer');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('project-title');

const manifestUrl = '../docs/doc_manifest.json';
const chapterPanelButton = document.getElementById('chapter-menu-button');
const chapterPanel = document.getElementById('chapter-panel');
const chapterPanelContent = document.getElementById('chapter-panel-content');
const chapterPanelClose = document.getElementById('chapter-panel-close');
const chapterPanelBackdrop = document.getElementById('chapter-panel-backdrop');
const chapterEntryMap = new Map();
let currentSelectedChapterId = null;
let pendingHoverChapterId = null;

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

    const chapters = manifest.filter((chapter) => chapter?.visible_in_viewer !== false);
    if (!chapters.length) {
      statusEl.textContent = 'Keine sichtbaren Kapitel konfiguriert.';
      return;
    }
    if (!currentSelectedChapterId) {
      currentSelectedChapterId = chapters[0]?.id;
    }

    renderChapterMenu(chapters);
    await renderChapters(chapters);
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

  const section = document.createElement('section');
  section.classList.add('doc-page');
  section.dataset.chapterId = chapter.id ?? '';

  const anchorId = `chapter-${chapter.id ?? ''}`;
  if (anchorId) {
    section.id = anchorId;
  }

  try {
    const content = await fetchChapterContent(chapter.file);
    const { content: body } = splitFrontmatter(content);
    const rendered = markdown?.render(body) ?? body;
    const safe = ensureSanitized(rendered);
    const wrap = document.createElement('div');
    wrap.className = 'doc-content';
    wrap.innerHTML = safe;
    section.appendChild(wrap);
    viewer.appendChild(section);
    renderMathContent(section);
    if (currentSelectedChapterId === chapter.id) {
      markActiveChapter(chapter.id);
    }
  } catch (error) {
    console.error(error);
  }
}

async function fetchChapterContent(file) {
  const url = new URL(`../docs/${file}`, location.href);
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

function scrollToChapter(chapterId, options = {}) {
  const target = document.getElementById(`chapter-${chapterId}`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (!options.temporary) {
    currentSelectedChapterId = chapterId;
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
