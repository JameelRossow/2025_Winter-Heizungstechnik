const tableBody = document.getElementById('chapter-list');
const statusEl = document.getElementById('home-status');
const errorEl = document.getElementById('home-error');
const MANIFEST_PATH = 'docs/doc_manifest.json';

const STATUS_META = {
  done: { label: 'done', pillClass: 'status-pill--done' },
  in_progress: { label: 'in progress', pillClass: 'status-pill--in-progress' },
  not_started: { label: 'not started', pillClass: 'status-pill--not-started' },
};

const HOME_SCALE_CLASS = 'home--scaled';
const HOME_SCALE_VAR = '--home-scale';
let homeScaleObserver = null;
let homeScaleInitialized = false;

async function initHome() {
  try {
    const chapters = await loadManifest();
    if (!chapters.length) {
      statusEl.textContent = 'Keine Kapitel konfiguriert.';
      return;
    }
    renderChapters(chapters);
    statusEl.textContent = 'Kapitelübersicht bereit.';
    initHomeScaling();
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Fehler beim Laden der Kapitelliste.';
    renderHomeError(error);
  }
}

async function loadManifest() {
  const url = new URL(MANIFEST_PATH, window.location.href);
  url.searchParams.set('t', Date.now().toString());
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`doc_manifest.json nicht geladen (${response.status})`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }
  console.info('Home loaded manifest entries', data.map(({ id, file }) => ({ id, file })));
  return data;
}

function normalizeStatus(rawStatus) {
  const value = (rawStatus ?? '').toString().toLowerCase().trim();
  if (value === 'done') return 'done';
  if (value === 'in progress' || value === 'in_progress') return 'in_progress';
  if (value === 'not started' || value === 'not_started') return 'not_started';
  return 'not_started';
}

function createStatusPill(status) {
  const normalized = normalizeStatus(status);
  const meta = STATUS_META[normalized];
  const pill = document.createElement('span');
  pill.className = `status-pill ${meta?.pillClass ?? STATUS_META.not_started.pillClass}`;
  pill.textContent = meta?.label ?? STATUS_META.not_started.label;
  return pill;
}

function renderChapters(chapters) {
  tableBody.innerHTML = '';
  errorEl.hidden = true;
  errorEl.textContent = '';
  chapters.forEach((chapter) => {
    const row = document.createElement('tr');
    const visible = chapter?.visible_in_viewer !== false;

    const idCell = document.createElement('td');
    idCell.textContent = chapter?.id || '—';

    const titleCell = document.createElement('td');
    const titleStrong = document.createElement('strong');
    titleStrong.textContent = chapter?.title || 'Ohne Titel';
    const metaText = document.createElement('div');
    metaText.className = 'chapter-meta';
    metaText.textContent = visible ? 'sichtbar im Viewer' : 'ausgeblendet (visible_in_viewer=false)';
    titleCell.appendChild(titleStrong);
    titleCell.appendChild(metaText);

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = chapter?.description || '—';

    const statusCell = document.createElement('td');
    statusCell.appendChild(createStatusPill(chapter?.status));

    const actionCell = document.createElement('td');
    if (chapter?.id) {
      const link = document.createElement('a');
      link.className = 'chapter-link';
      link.href = `viewer/index.html#chapter=${encodeURIComponent(chapter.id)}`;
      link.textContent = 'Öffnen';
      actionCell.appendChild(link);
    } else {
      actionCell.textContent = '—';
    }

    row.appendChild(idCell);
    row.appendChild(titleCell);
    row.appendChild(descriptionCell);
    row.appendChild(statusCell);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });
}

function renderHomeError(error) {
  errorEl.hidden = false;
  errorEl.textContent = error?.message ?? 'Unbekannter Fehler beim Laden der Kapitel.';
}

function initHomeScaling() {
  if (homeScaleInitialized) return;
  homeScaleInitialized = true;
  const table = document.querySelector('.chapter-table');
  if (!table) return;

  const root = document.documentElement;

  const applyScale = () => {
    const availableWidth = Math.max(window.innerWidth - 32, 240);
    const neededWidth = Math.max(table.scrollWidth, table.offsetWidth, 1);
    if (neededWidth <= availableWidth + 1) {
      root.classList.remove(HOME_SCALE_CLASS);
      root.style.removeProperty(HOME_SCALE_VAR);
      return;
    }
    const rawScale = availableWidth / neededWidth;
    const scale = Math.max(Math.min(rawScale, 1), 0.3);
    root.style.setProperty(HOME_SCALE_VAR, scale.toFixed(3));
    root.classList.add(HOME_SCALE_CLASS);
  };

  const debouncedApply = () => window.requestAnimationFrame(applyScale);
  window.addEventListener('resize', debouncedApply);
  window.addEventListener('orientationchange', debouncedApply);
  if (typeof ResizeObserver === 'function') {
    homeScaleObserver = new ResizeObserver(debouncedApply);
    homeScaleObserver.observe(table);
  }
  applyScale();
}

window.addEventListener('DOMContentLoaded', initHome);
