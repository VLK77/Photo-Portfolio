/* ===================================================================
   VK ADMIN — Photo manager (add / edit / delete) over index.html
   =================================================================== */

const REPO = 'VLK77/Photo-Portfolio';
const BRANCH = 'main';
const DEFAULT_CATS = ['street', 'nature', 'animals', 'aerial', 'architecture', 'mountains'];

const state = {
  html: '',        // current full index.html text
  htmlSha: null,   // sha of index.html for the next PUT
  photos: []       // [{cat, ratio, src, title, sub}]
};

let selectedFile = null;
let detectedRatio = '3/4';
let editIndex = -1;

/* ===================== AUTH ===================== */
function saveToken() {
  const t = document.getElementById('token-input').value.trim();
  if (!t) return;
  sessionStorage.setItem('gh_token', t);
  verifyToken(t);
}

async function verifyToken(token) {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (!r.ok) throw new Error();
    document.getElementById('token-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('signout-btn').style.display = 'inline-block';
    loadGallery();
  } catch {
    document.getElementById('token-error').style.display = 'block';
    sessionStorage.removeItem('gh_token');
  }
}

function signOut() {
  sessionStorage.removeItem('gh_token');
  location.reload();
}

/* ===================== INIT ===================== */
window.addEventListener('DOMContentLoaded', () => {
  const t = sessionStorage.getItem('gh_token');
  if (t) verifyToken(t);

  const dz = document.getElementById('dropzone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('token-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveToken();
  });

  // grid action delegation
  document.getElementById('grid').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]');
    const dl = e.target.closest('[data-del]');
    if (ed) openEdit(parseInt(ed.dataset.edit, 10));
    if (dl) deletePhoto(parseInt(dl.dataset.del, 10));
  });

  // close modal on backdrop click / esc
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target.id === 'edit-modal') closeEdit();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEdit(); });
});

/* ===================== TABS ===================== */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.getElementById('tab-manage').classList.toggle('active', name === 'manage');
  document.getElementById('tab-add').classList.toggle('active', name === 'add');
}

/* ===================== LOAD GALLERY ===================== */
async function loadGallery() {
  const token = sessionStorage.getItem('gh_token');
  const grid = document.getElementById('grid');
  document.getElementById('grid-loading').style.display = 'block';
  document.getElementById('grid-empty').style.display = 'none';
  grid.innerHTML = '';
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/index.html?ref=${BRANCH}&t=${Date.now()}`, {
      headers: { Authorization: `token ${token}`, 'Cache-Control': 'no-cache' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not read index.html');
    state.htmlSha = data.sha;
    state.html = b64ToUtf8(data.content.replace(/\n/g, ''));
    state.photos = parsePhotos(state.html);
    populateCatSelects();
    renderGrid();
  } catch (err) {
    document.getElementById('grid-loading').textContent = 'Error: ' + err.message;
  }
}

/* ===================== PARSE GALLERY ===================== */
function matchClose(html, openIdx) {
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = openIdx;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += (m[0][1] === '/') ? -1 : 1;
    if (depth === 0) return m.index;
  }
  throw new Error('Unbalanced <div> while parsing gallery');
}

function parsePhotos(html) {
  const start = html.indexOf('<div class="gallery" id="gallery">');
  if (start === -1) throw new Error('Gallery container not found');
  const openEnd = html.indexOf('>', start) + 1;
  const closeStart = matchClose(html, start);
  const inner = html.slice(openEnd, closeStart);
  const doc = new DOMParser().parseFromString('<div id="__w">' + inner + '</div>', 'text/html');
  const items = doc.querySelectorAll('#__w > .gallery-item');
  return [...items].map(it => {
    const img = it.querySelector('img');
    const span = it.querySelector('.gallery-item-label span');
    const small = it.querySelector('.gallery-item-label small');
    let ratio = '3/4';
    const m = (it.getAttribute('style') || '').match(/aspect-ratio:\s*([^;]+)/);
    if (m) ratio = m[1].trim();
    return {
      cat: it.getAttribute('data-cat') || 'street',
      ratio: ratio,
      src: img ? img.getAttribute('src') : '',
      title: span ? span.textContent.trim() : '',
      sub: small ? small.textContent.trim() : ''
    };
  });
}

/* ===================== BUILD / WRITE HTML ===================== */
function replaceDivBlock(html, openTag, newInner) {
  const start = html.indexOf(openTag);
  if (start === -1) throw new Error('Block not found: ' + openTag);
  const openEnd = html.indexOf('>', start) + 1;
  const closeStart = matchClose(html, start);
  return html.slice(0, openEnd) + newInner + html.slice(closeStart);
}

function buildGalleryInner(photos) {
  if (!photos.length) return '\n      ';
  const blocks = photos.map(p =>
    '        <div class="gallery-item fade-in" data-cat="' + p.cat + '" style="aspect-ratio:' + p.ratio + ';">\n' +
    '          <img src="' + p.src + '" alt="' + escAttr(p.title) + '" style="width:100%;height:100%;object-fit:cover;display:block;" draggable="false" oncontextmenu="return false">\n' +
    '          <div class="gallery-item-label"><span>' + escHtml(p.title) + '</span><small>' + escHtml(p.sub) + '</small></div>\n' +
    '        </div>'
  );
  return '\n\n' + blocks.join('\n\n') + '\n\n      ';
}

function buildFiltersInner(cats) {
  let h = '\n          <button class="filter-btn active" data-cat="all">All</button>';
  cats.forEach(c => {
    h += '\n          <button class="filter-btn" data-cat="' + c + '">' + catLabel(c) + '</button>';
  });
  h += '\n        ';
  return h;
}

function rebuildHtml() {
  let html = state.html;
  html = replaceDivBlock(html, '<div class="filter-tabs">', buildFiltersInner(presentCats()));
  html = replaceDivBlock(html, '<div class="gallery" id="gallery">', buildGalleryInner(state.photos));
  return html;
}

async function pushIndex(message) {
  const token = sessionStorage.getItem('gh_token');
  const newHtml = rebuildHtml();
  const res = await ghPut('contents/index.html', {
    message: message,
    content: utf8ToB64(newHtml),
    sha: state.htmlSha
  }, token);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'index.html update failed');
  state.htmlSha = data.content.sha;
  state.html = newHtml;
}

/* ===================== RENDER GRID ===================== */
function renderGrid() {
  const grid = document.getElementById('grid');
  const filter = document.getElementById('filter-cat').value;
  document.getElementById('grid-loading').style.display = 'none';
  grid.innerHTML = '';

  const total = state.photos.length;
  document.getElementById('photo-count').textContent = total + (total === 1 ? ' photo' : ' photos');

  const list = state.photos
    .map((p, i) => ({ p, i }))
    .filter(x => filter === 'all' || x.p.cat === filter);

  if (!list.length) {
    document.getElementById('grid-empty').style.display = 'block';
    return;
  }
  document.getElementById('grid-empty').style.display = 'none';

  list.forEach(({ p, i }) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="card-thumb"><img src="' + p.src + '" alt="" loading="lazy"></div>' +
      '<div class="card-body">' +
        '<div class="card-title">' + (escHtml(p.title) || '<span class="dim">(untitled)</span>') + '</div>' +
        '<div class="card-sub">' + (escHtml(p.sub) || '') + '</div>' +
        '<div class="card-cat">' + escHtml(catLabel(p.cat)) + '</div>' +
      '</div>' +
      '<div class="card-actions">' +
        '<button class="ghost-btn" data-edit="' + i + '">Edit</button>' +
        '<button class="ghost-btn danger" data-del="' + i + '">Delete</button>' +
      '</div>';
    grid.appendChild(card);
  });
}

/* ===================== EDIT ===================== */
function openEdit(i) {
  editIndex = i;
  const p = state.photos[i];
  document.getElementById('edit-thumb').src = p.src;
  document.getElementById('edit-title').value = p.title;
  document.getElementById('edit-sub').value = p.sub;
  setSelect('edit-cat', p.cat);
  setSelect('edit-ratio', p.ratio);
  document.getElementById('edit-custom-cat').style.display = 'none';
  document.getElementById('edit-custom-cat').value = '';
  document.getElementById('edit-error').style.display = 'none';
  document.getElementById('edit-modal').classList.add('open');
}

function closeEdit() {
  document.getElementById('edit-modal').classList.remove('open');
  editIndex = -1;
}

function toggleEditCustom() {
  const sel = document.getElementById('edit-cat');
  const custom = document.getElementById('edit-custom-cat');
  if (sel.value === '__custom__') { custom.style.display = 'block'; custom.focus(); }
  else { custom.style.display = 'none'; custom.value = ''; }
}

async function saveEdit() {
  if (editIndex < 0) return;
  const p = state.photos[editIndex];
  let cat = document.getElementById('edit-cat').value;
  if (cat === '__custom__') {
    cat = cleanCat(document.getElementById('edit-custom-cat').value);
    if (!cat) return showEditError('Please enter a category name');
  }
  const btn = document.getElementById('edit-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    p.title = document.getElementById('edit-title').value.trim();
    p.sub = document.getElementById('edit-sub').value.trim();
    p.cat = cat;
    p.ratio = document.getElementById('edit-ratio').value;
    await pushIndex('Edit "' + (p.title || 'photo') + '"');
    populateCatSelects();
    renderGrid();
    closeEdit();
    toast('Saved · live in ~1 min');
  } catch (err) {
    showEditError(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save changes';
  }
}

function showEditError(msg) {
  const e = document.getElementById('edit-error');
  e.style.display = 'block';
  e.textContent = '✕ ' + msg;
}

/* ===================== DELETE ===================== */
async function deletePhoto(i) {
  const p = state.photos[i];
  if (!confirm('Delete "' + (p.title || 'this photo') + '"?\n\nThis removes it from the gallery and deletes the image file from the repo.')) return;

  const token = sessionStorage.getItem('gh_token');
  const removed = state.photos.splice(i, 1)[0];
  try {
    await pushIndex('Delete "' + (removed.title || 'photo') + '"');
    await deleteImageFile(removed.src, token); // best-effort
    populateCatSelects();
    renderGrid();
    toast('Deleted · live in ~1 min');
  } catch (err) {
    // put it back if the index push failed
    state.photos.splice(i, 0, removed);
    renderGrid();
    toast('Delete failed: ' + err.message, true);
  }
}

async function deleteImageFile(src, token) {
  if (!src || !src.startsWith('public/')) return;
  try {
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/${'contents/' + src}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (!getRes.ok) return; // file already gone / name mismatch
    const meta = await getRes.json();
    await fetch(`https://api.github.com/repos/${REPO}/${'contents/' + src}`, {
      method: 'DELETE',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Delete image ' + src, sha: meta.sha, branch: BRANCH })
    });
  } catch (_) { /* non-fatal */ }
}

/* ===================== ADD PHOTO ===================== */
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('preview-img');
    img.src = e.target.result;
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      if (r > 1.2) detectedRatio = '4/3';
      else if (r < 0.85) detectedRatio = '3/4';
      else detectedRatio = '1/1';
    };
    document.getElementById('preview-name').textContent =
      file.name + ' · ' + (file.size / 1024 / 1024).toFixed(1) + ' MB';
    document.getElementById('preview-wrap').style.display = 'block';
    document.getElementById('dropzone').style.display = 'none';
    document.getElementById('upload-btn').disabled = false;

    if (!document.getElementById('title-input').value) {
      document.getElementById('title-input').value =
        file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }
  };
  reader.readAsDataURL(file);
}

function removeFile() {
  selectedFile = null;
  document.getElementById('preview-wrap').style.display = 'none';
  document.getElementById('dropzone').style.display = 'block';
  document.getElementById('upload-btn').disabled = true;
  document.getElementById('file-input').value = '';
}

async function uploadPhoto() {
  if (!selectedFile) return;
  const token = sessionStorage.getItem('gh_token');
  const title = document.getElementById('title-input').value.trim() ||
    selectedFile.name.replace(/\.[^.]+$/, '');

  let cat = document.getElementById('cat-input').value;
  if (cat === '__custom__') {
    cat = cleanCat(document.getElementById('custom-cat-input').value);
    if (!cat) return uploadError('Please enter a category name');
  }
  const sub = document.getElementById('sub-input').value.trim() ||
    (catLabel(cat) + ' · Praha');
  const ratioSel = document.getElementById('ratio-input').value;
  const ratio = ratioSel === 'auto' ? detectedRatio : ratioSel;

  setProgress(true);
  try {
    setStep('Preparing image…', 15);
    const filename = await uniqueFilename(selectedFile.name, token);
    const imgB64 = await fileToBase64(selectedFile);

    setStep('Uploading photo…', 40);
    const imgRes = await ghPut('contents/public/' + encodeURIComponent(filename), {
      message: 'Add photo: ' + filename,
      content: imgB64
    }, token);
    if (!imgRes.ok) {
      const err = await imgRes.json();
      throw new Error(err.message || 'Image upload failed');
    }

    setStep('Adding to gallery…', 70);
    state.photos.unshift({
      cat: cat, ratio: ratio,
      src: 'public/' + filename.replace(/ /g, '%20'),
      title: title, sub: sub
    });
    await pushIndex('Add "' + title + '" to ' + cat + ' gallery');

    setStep('Done!', 100);
    document.getElementById('progress').style.display = 'none';
    const ok = document.getElementById('upload-success');
    ok.style.display = 'block';
    ok.innerHTML = '✓ "' + escHtml(title) + '" added to <strong>' + escHtml(catLabel(cat)) +
      '</strong>.<br><span class="dim2">Live in ~1 min → ' +
      '<a href="https://vlakuba.com" target="_blank">vlakuba.com</a></span>';

    removeFile();
    document.getElementById('title-input').value = '';
    document.getElementById('sub-input').value = '';
    document.getElementById('upload-btn').disabled = true;
    populateCatSelects();
    renderGrid();
  } catch (err) {
    uploadError(err.message);
  }
}

function uploadError(msg) {
  setProgress(false);
  const e = document.getElementById('upload-error');
  e.style.display = 'block';
  e.textContent = '✕ Error: ' + msg;
}

async function uniqueFilename(name, token) {
  let base = name.replace(/\.[^.]+$/, '')
    .replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  if (!base) base = 'photo';
  let candidate = base + '.jpg', n = 0;
  while (await fileExists('public/' + encodeURIComponent(candidate), token)) {
    n++; candidate = base + '-' + n + '.jpg';
  }
  return candidate;
}

async function fileExists(path, token) {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${token}` }
    });
    return r.ok;
  } catch { return false; }
}

/* ===================== CATEGORY SELECTS ===================== */
function allCats() {
  return [...new Set([...DEFAULT_CATS, ...state.photos.map(p => p.cat)])];
}
function presentCats() {
  const seen = [];
  state.photos.forEach(p => { if (!seen.includes(p.cat)) seen.push(p.cat); });
  return seen;
}
function populateCatSelects() {
  const cats = allCats();
  fillCatSelect('cat-input', cats, true, 'animals');
  fillCatSelect('edit-cat', cats, true);

  const f = document.getElementById('filter-cat');
  const cur = f.value || 'all';
  f.innerHTML = '<option value="all">All categories</option>' +
    cats.map(c => '<option value="' + c + '">' + catLabel(c) + '</option>').join('');
  f.value = [...f.options].some(o => o.value === cur) ? cur : 'all';
}
function fillCatSelect(id, cats, withCustom, fallback) {
  const s = document.getElementById(id);
  const cur = s.value;
  s.innerHTML = cats.map(c => '<option value="' + c + '">' + catLabel(c) + '</option>').join('') +
    (withCustom ? '<option value="__custom__">+ New category…</option>' : '');
  if ([...s.options].some(o => o.value === cur)) s.value = cur;
  else if (fallback && [...s.options].some(o => o.value === fallback)) s.value = fallback;
}
function setSelect(id, value) {
  const s = document.getElementById(id);
  if (![...s.options].some(o => o.value === value)) {
    const o = document.createElement('option');
    o.value = value; o.textContent = catLabel(value);
    s.insertBefore(o, s.firstChild);
  }
  s.value = value;
}
function toggleCustomCat() {
  const sel = document.getElementById('cat-input');
  const custom = document.getElementById('custom-cat-input');
  if (sel.value === '__custom__') { custom.style.display = 'block'; custom.focus(); }
  else { custom.style.display = 'none'; custom.value = ''; }
}

/* ===================== HELPERS ===================== */
function ghPut(path, body, token) {
  return fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, branch: BRANCH })
  });
}

function fileToBase64(file) {
  const MAX_DIM = 1600, QUALITY = 0.80;
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onerror = rej;
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
          else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        res(canvas.toDataURL('image/jpeg', QUALITY).split(',')[1]);
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function setProgress(show) {
  document.getElementById('progress').style.display = show ? 'block' : 'none';
  document.getElementById('upload-btn').disabled = show;
  document.getElementById('upload-error').style.display = 'none';
  document.getElementById('upload-success').style.display = 'none';
}
function setStep(text, pct) {
  document.getElementById('progress-text').textContent = text;
  document.getElementById('progress-bar').style.width = pct + '%';
}

let toastTimer;
function toast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

function catLabel(c) { return c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' '); }
function cleanCat(s) { return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''); }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }
function b64ToUtf8(b64) { return decodeURIComponent(escape(atob(b64))); }
function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
