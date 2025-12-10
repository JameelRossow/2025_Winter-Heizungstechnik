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
const HOME_MIN_SCALE_CLASS = 'home--minscale';
const HOME_SCALE_VAR = '--home-scale';
const HOME_SCALE_ROOT_SELECTOR = '.home-scale-root';
const HOME_MIN_SCALE = 0.55;
const HOME_SCALE_EPSILON = 0.001;
const HOME_BASE_WIDTH_FALLBACK = 960;
let homeScaleObserver = null;
let homeScaleListenersAttached = false;

async function initHome() {
  try {
    const chapters = await loadManifest();
    if (!chapters.length) {
      statusEl.textContent = 'Keine Kapitel konfiguriert.';
      scheduleHomeScaleUpdate();
      return;
    }
    renderChapters(chapters);
    statusEl.textContent = 'Kapitelübersicht bereit.';
    scheduleHomeScaleUpdate();
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Fehler beim Laden der Kapitelliste.';
    renderHomeError(error);
    scheduleHomeScaleUpdate();
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
    idCell.textContent = chapter?.id || '--';

    const titleCell = document.createElement('td');
    const titleStrong = document.createElement('strong');
    titleStrong.textContent = chapter?.title || 'Ohne Titel';
    const metaText = document.createElement('div');
    metaText.className = 'chapter-meta';
    metaText.textContent = visible ? 'sichtbar im Viewer' : 'ausgeblendet (visible_in_viewer=false)';
    titleCell.appendChild(titleStrong);
    titleCell.appendChild(metaText);

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = chapter?.description || '--';

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
      actionCell.textContent = '--';
    }

    row.appendChild(idCell);
    row.appendChild(titleCell);
    row.appendChild(descriptionCell);
    row.appendChild(statusCell);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });
  scheduleHomeScaleUpdate();
}

function renderHomeError(error) {
  errorEl.hidden = false;
  errorEl.textContent = error?.message ?? 'Unbekannter Fehler beim Laden der Kapitel.';
}

function updateHomeScale() {
  const rootEl = document.querySelector(HOME_SCALE_ROOT_SELECTOR);
  const htmlEl = document.documentElement;
  const body = document.body;
  if (!rootEl || !htmlEl || !body) {
    return;
  }
  const measuredWidth = rootEl.offsetWidth;
  const baseWidth = measuredWidth > 0 ? measuredWidth : HOME_BASE_WIDTH_FALLBACK;
  const viewportWidth = Math.max(window.innerWidth || htmlEl.clientWidth || baseWidth, 320);
  let scale = viewportWidth / baseWidth;
  if (scale > 1) {
    scale = 1;
  } else if (scale < HOME_MIN_SCALE) {
    scale = HOME_MIN_SCALE;
  }
  htmlEl.style.setProperty(HOME_SCALE_VAR, scale.toFixed(3));
  const isScaled = scale < 0.999;
  body.classList.toggle(HOME_SCALE_CLASS, isScaled);
  const isMinScale = scale <= HOME_MIN_SCALE + HOME_SCALE_EPSILON;
  body.classList.toggle(HOME_MIN_SCALE_CLASS, isMinScale);
}

function scheduleHomeScaleUpdate() {
  window.requestAnimationFrame(updateHomeScale);
}

function initHomeScaling() {
  if (homeScaleListenersAttached) {
    return;
  }
  homeScaleListenersAttached = true;
  window.addEventListener('resize', scheduleHomeScaleUpdate);
  window.addEventListener('orientationchange', scheduleHomeScaleUpdate);
  window.addEventListener('load', scheduleHomeScaleUpdate);

  if (typeof ResizeObserver === 'function') {
    const rootEl = document.querySelector(HOME_SCALE_ROOT_SELECTOR);
    if (rootEl) {
      homeScaleObserver = new ResizeObserver(scheduleHomeScaleUpdate);
      homeScaleObserver.observe(rootEl);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initHome();
  initHomeScaling();
  scheduleHomeScaleUpdate();
});
