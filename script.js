const STORAGE_KEY = 'sourcebin-lite-v2';
const LANGUAGE_OPTIONS = [
  'plaintext',
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'json',
  'html',
  'css',
  'sql',
  'bash',
  'yaml',
  'markdown',
];

const state = {
  bins: [],
  currentBinId: null,
  activeFileIndex: 0,
};

const el = {
  binTitle: document.getElementById('binTitle'),
  visibility: document.getElementById('visibility'),
  expiration: document.getElementById('expiration'),
  fileName: document.getElementById('fileName'),
  language: document.getElementById('language'),
  editor: document.getElementById('editor'),
  tabs: document.getElementById('tabs'),
  counts: document.getElementById('counts'),
  status: document.getElementById('status'),
  savedBinsList: document.getElementById('savedBinsList'),
  searchBins: document.getElementById('searchBins'),
  newBinBtn: document.getElementById('newBinBtn'),
  saveBinBtn: document.getElementById('saveBinBtn'),
  duplicateBinBtn: document.getElementById('duplicateBinBtn'),
  deleteBinBtn: document.getElementById('deleteBinBtn'),
  addFileBtn: document.getElementById('addFileBtn'),
  removeFileBtn: document.getElementById('removeFileBtn'),
  copyLinkBtn: document.getElementById('copyLinkBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  importJson: document.getElementById('importJson'),
  downloadZipBtn: document.getElementById('downloadZipBtn'),
};

function uid(prefix = 'bin') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultBin() {
  return {
    id: uid(),
    title: 'Untitled Bin',
    visibility: 'public',
    expiration: 'never',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    files: [
      {
        name: 'index.js',
        language: 'javascript',
        content: '',
      },
    ],
  };
}

function setStatus(message) {
  el.status.textContent = message;
}

function currentBin() {
  return state.bins.find((bin) => bin.id === state.currentBinId);
}

function currentFile() {
  const bin = currentBin();
  return bin?.files[state.activeFileIndex];
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bins));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const bin = createDefaultBin();
    state.bins = [bin];
    state.currentBinId = bin.id;
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.bins = Array.isArray(parsed) && parsed.length ? parsed : [createDefaultBin()];
    state.currentBinId = state.bins[0].id;
  } catch {
    state.bins = [createDefaultBin()];
    state.currentBinId = state.bins[0].id;
  }
}

function updateCounts() {
  const file = currentFile();
  const text = file?.content ?? '';
  el.counts.textContent = `${text.length} chars • ${text.split('\n').length} lines`;
}

function renderLanguageOptions() {
  el.language.innerHTML = '';
  LANGUAGE_OPTIONS.forEach((lang) => {
    const option = document.createElement('option');
    option.value = lang;
    option.textContent = lang;
    el.language.appendChild(option);
  });
}

function renderTabs() {
  const bin = currentBin();
  el.tabs.innerHTML = '';
  bin.files.forEach((file, index) => {
    const tab = document.createElement('button');
    tab.className = `tab ${index === state.activeFileIndex ? 'active' : ''}`;
    tab.textContent = file.name;
    tab.addEventListener('click', () => {
      state.activeFileIndex = index;
      renderEditorFromState();
    });
    el.tabs.appendChild(tab);
  });
}

function renderSavedBins() {
  const query = el.searchBins.value.trim().toLowerCase();
  el.savedBinsList.innerHTML = '';

  state.bins
    .filter((bin) => bin.title.toLowerCase().includes(query))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((bin) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const date = new Date(bin.updatedAt).toLocaleString();
      button.textContent = `${bin.title} (${bin.files.length} files)\n${date}`;
      button.addEventListener('click', () => {
        state.currentBinId = bin.id;
        state.activeFileIndex = 0;
        renderAll();
        setStatus(`Loaded bin: ${bin.title}`);
      });
      item.appendChild(button);
      el.savedBinsList.appendChild(item);
    });
}

function renderEditorFromState() {
  const bin = currentBin();
  const file = currentFile();

  el.binTitle.value = bin.title;
  el.visibility.value = bin.visibility;
  el.expiration.value = bin.expiration;

  el.fileName.value = file.name;
  el.language.value = file.language;
  el.editor.value = file.content;

  renderTabs();
  updateCounts();
  saveToStorage();
  renderSavedBins();
}

function renderAll() {
  renderEditorFromState();
}

function persistCurrentFile() {
  const bin = currentBin();
  const file = currentFile();
  file.name = el.fileName.value.trim() || 'untitled.txt';
  file.language = el.language.value;
  file.content = el.editor.value;

  bin.title = el.binTitle.value.trim() || 'Untitled Bin';
  bin.visibility = el.visibility.value;
  bin.expiration = el.expiration.value;
  bin.updatedAt = Date.now();

  renderTabs();
  updateCounts();
  saveToStorage();
  renderSavedBins();
}

function newBin() {
  persistCurrentFile();
  const bin = createDefaultBin();
  state.bins.unshift(bin);
  state.currentBinId = bin.id;
  state.activeFileIndex = 0;
  renderAll();
  setStatus('New bin created');
}

function duplicateBin() {
  persistCurrentFile();
  const bin = currentBin();
  const copy = JSON.parse(JSON.stringify(bin));
  copy.id = uid();
  copy.title = `${copy.title} (copy)`;
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  state.bins.unshift(copy);
  state.currentBinId = copy.id;
  state.activeFileIndex = 0;
  renderAll();
  setStatus('Bin duplicated');
}

function deleteBin() {
  if (state.bins.length === 1) {
    setStatus('Cannot delete the only remaining bin');
    return;
  }

  const target = currentBin();
  const ok = window.confirm(`Delete "${target.title}"?`);
  if (!ok) return;

  state.bins = state.bins.filter((bin) => bin.id !== target.id);
  state.currentBinId = state.bins[0].id;
  state.activeFileIndex = 0;
  renderAll();
  setStatus('Bin deleted');
}

function addFile() {
  const bin = currentBin();
  bin.files.push({
    name: `file-${bin.files.length + 1}.txt`,
    language: 'plaintext',
    content: '',
  });
  state.activeFileIndex = bin.files.length - 1;
  renderAll();
  setStatus('File added');
}

function removeFile() {
  const bin = currentBin();
  if (bin.files.length === 1) {
    setStatus('At least one file is required');
    return;
  }

  bin.files.splice(state.activeFileIndex, 1);
  state.activeFileIndex = Math.max(0, state.activeFileIndex - 1);
  renderAll();
  setStatus('File removed');
}

async function copyShareLink() {
  persistCurrentFile();
  const token = currentBin().id;
  const url = `${location.origin}${location.pathname}?bin=${encodeURIComponent(token)}`;
  try {
    await navigator.clipboard.writeText(url);
    setStatus('Share link copied');
  } catch {
    setStatus(`Copy failed. Link: ${url}`);
  }
}

function downloadFiles() {
  persistCurrentFile();
  const bin = currentBin();
  bin.files.forEach((file) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  setStatus('All files downloaded');
}

function exportJson() {
  persistCurrentFile();
  const bin = currentBin();
  const blob = new Blob([JSON.stringify(bin, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${bin.title.replace(/[^a-z0-9-_]/gi, '_') || 'bin'}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setStatus('Bin exported as JSON');
}

function importJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result || '{}'));
      if (!Array.isArray(imported.files)) {
        throw new Error('Invalid format');
      }
      imported.id = uid();
      imported.title = imported.title || 'Imported Bin';
      imported.visibility = imported.visibility || 'public';
      imported.expiration = imported.expiration || 'never';
      imported.updatedAt = Date.now();
      imported.createdAt = Date.now();
      state.bins.unshift(imported);
      state.currentBinId = imported.id;
      state.activeFileIndex = 0;
      renderAll();
      setStatus('JSON imported');
    } catch {
      setStatus('Failed to import JSON');
    }
  };
  reader.readAsText(file);
}

function loadFromUrlParam() {
  const token = new URLSearchParams(location.search).get('bin');
  if (!token) return;
  const found = state.bins.find((bin) => bin.id === token);
  if (!found) {
    setStatus('Shared bin not found locally');
    return;
  }
  state.currentBinId = found.id;
  state.activeFileIndex = 0;
}

function bindEvents() {
  el.editor.addEventListener('input', persistCurrentFile);
  el.fileName.addEventListener('input', persistCurrentFile);
  el.language.addEventListener('change', persistCurrentFile);
  el.binTitle.addEventListener('input', persistCurrentFile);
  el.visibility.addEventListener('change', persistCurrentFile);
  el.expiration.addEventListener('change', persistCurrentFile);
  el.searchBins.addEventListener('input', renderSavedBins);

  el.newBinBtn.addEventListener('click', newBin);
  el.saveBinBtn.addEventListener('click', () => {
    persistCurrentFile();
    setStatus('Bin saved');
  });
  el.duplicateBinBtn.addEventListener('click', duplicateBin);
  el.deleteBinBtn.addEventListener('click', deleteBin);
  el.addFileBtn.addEventListener('click', addFile);
  el.removeFileBtn.addEventListener('click', removeFile);
  el.copyLinkBtn.addEventListener('click', copyShareLink);
  el.downloadZipBtn.addEventListener('click', downloadFiles);
  el.exportJsonBtn.addEventListener('click', exportJson);
  el.importJson.addEventListener('change', (event) => importJsonFile(event.target.files?.[0]));
}

function init() {
  renderLanguageOptions();
  loadFromStorage();
  loadFromUrlParam();
  bindEvents();
  renderAll();
  setStatus('SourceBin-like editor ready');
}

init();
