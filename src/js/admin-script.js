function toggleCustomCat() {
  var sel = document.getElementById('cat-input');
  var custom = document.getElementById('custom-cat-input');
  if (sel.value === '__custom__') {
    custom.style.display = 'block';
    custom.focus();
  } else {
    custom.style.display = 'none';
    custom.value = '';
  }
}

const REPO = 'VLK77/Photo-Portfolio';
  const BRANCH = 'main';
  let selectedFile = null;
  let detectedRatio = '3/4';

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
      document.getElementById('upload-screen').classList.add('active');
    } catch {
      document.getElementById('token-error').style.display = 'block';
      sessionStorage.removeItem('gh_token');
    }
  }

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
  });

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    selectedFile = file;

    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById('preview-img');
      img.src = e.target.result;
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        const r = w / h;
        if (r > 1.2) detectedRatio = '4/3';
        else if (r < 0.85) detectedRatio = '3/4';
        else detectedRatio = '1/1';
      };
      document.getElementById('preview-name').textContent = file.name + ' · ' + (file.size / 1024 / 1024).toFixed(1) + ' MB';
      document.getElementById('preview-wrap').style.display = 'block';
      document.getElementById('dropzone').style.display = 'none';
      document.getElementById('upload-btn').disabled = false;

      const nameNoExt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      if (!document.getElementById('title-input').value)
        document.getElementById('title-input').value = nameNoExt;
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
    const token = sessionStorage.getItem('gh_token');
    const title = document.getElementById('title-input').value.trim() || selectedFile.name;
    var cat = document.getElementById('cat-input').value;
    if (cat === '__custom__') {
      cat = document.getElementById('custom-cat-input').value.trim().toLowerCase().replace(/\s+/g, '-');
      if (!cat) { setProgress(false); document.getElementById('upload-error').style.display = 'block'; document.getElementById('upload-error').textContent = '\u2715 Error: Please enter a category name'; return; }
    }
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
    const sub = document.getElementById('sub-input').value.trim() ||
      (cat.charAt(0).toUpperCase() + cat.slice(1)) + ' · Praha';
    const filename = selectedFile.name;

    setProgress(true);
    setStep('Uploading photo...', 20);

    try {
      const imgB64 = await fileToBase64(selectedFile);
      const imgRes = await ghPut(`contents/public/${encodeURIComponent(filename)}`, {
        message: `Add photo: ${filename}`,
        content: imgB64
      }, token);
      if (!imgRes.ok) {
        const err = await imgRes.json();
        throw new Error(err.message || 'Image upload failed');
      }

      setStep('Reading gallery...', 50);

      const htmlRes = await fetch(`https://api.github.com/repos/${REPO}/contents/index.html?ref=${BRANCH}`, {
        headers: { Authorization: `token ${token}` }
      });
      const htmlData = await htmlRes.json();
      let html = atob(htmlData.content.replace(/\n/g, ''));

      setStep('Adding to gallery...', 70);

      const newItem = `
    <div class="gallery-item fade-in" data-cat="${cat}" style="aspect-ratio:${detectedRatio};">
      <img src="public/${filename.replace(/ /g, '%20')}" alt="${title}" style="width:100%;height:100%;object-fit:cover;display:block;" draggable="false" oncontextmenu="return false">
      <div class="gallery-item-label"><span>${title}</span><small>${sub}</small></div>
    </div>`;

      const marker = '</div>\n    </div>\n  </section>\n\n  <!-- PANEL 2: About -->\n  <section class="panel panel-about" id="panelAbout">';
      if (!html.includes(marker)) throw new Error('Could not find gallery section in HTML');
      html = html.replace(marker, newItem + '\n\n' + marker);

      // Add filter button if new category doesn't exist yet
      if (html.indexOf('data-cat="' + cat + '">' + catLabel + '</button>') === -1) {
        var btnHtml = '\n          <button class="filter-btn" data-cat="' + cat + '">' + catLabel + '</button>';
        // Insert before the closing </div> of filter-tabs
        var filterClose = html.indexOf('\n        </div>\n  </div>\n\n  <div class="gallery"');
        if (filterClose === -1) filterClose = html.indexOf('</div>\n      </div>\n\n      <div class="gallery"');
        if (filterClose === -1) {
          // Generic: find last filter button and insert after it
          var lastFilterBtn = html.lastIndexOf('</button>\n        </div>');
          if (lastFilterBtn !== -1) {
            html = html.slice(0, lastFilterBtn + 9) + btnHtml + html.slice(lastFilterBtn + 9);
          }
        } else {
          html = html.slice(0, filterClose) + btnHtml + html.slice(filterClose);
        }
      }

      setStep('Saving HTML...', 85);

      const updatedB64 = btoa(unescape(encodeURIComponent(html)));
      const pushRes = await ghPut('contents/index.html', {
        message: `Add ${title} to ${cat} gallery`,
        content: updatedB64,
        sha: htmlData.sha
      }, token);

      if (!pushRes.ok) {
        const err = await pushRes.json();
        throw new Error(err.message || 'HTML update failed');
      }

      setStep('Done!', 100);
      document.getElementById('progress').style.display = 'none';

      const msg = document.getElementById('success-msg');
      msg.style.display = 'block';
      msg.innerHTML = `✓ "${title}" added to <strong>${catLabel}</strong> gallery.<br><span style="color:#3a7a3a;font-size:0.65rem;">GitHub Pages updates in ~1 min → <a href="https://vlakuba.com" target="_blank" style="color:#5a9a5a;">vlakuba.com</a></span>`;

      removeFile();
      document.getElementById('title-input').value = '';
      document.getElementById('sub-input').value = '';
      document.getElementById('upload-btn').disabled = true;

    } catch (err) {
      setProgress(false);
      const errEl = document.getElementById('upload-error');
      errEl.style.display = 'block';
      errEl.textContent = '✕ Error: ' + err.message;
    }
  }

  function ghPut(path, body, token) {
    return fetch(`https://api.github.com/repos/${REPO}/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...body, branch: BRANCH })
    });
  }

  function fileToBase64(file) {
    var MAX_DIM = 1600;
    var QUALITY = 0.80;
    return new Promise(function(res, rej) {
      var reader = new FileReader();
      reader.onerror = rej;
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var w = img.width, h = img.height;
          // Only resize if larger than MAX_DIM
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
            else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
          res(dataUrl.split(',')[1]);
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
    document.getElementById('success-msg').style.display = 'none';
  }

  function setStep(text, pct) {
    document.getElementById('progress-text').textContent = text;
    document.getElementById('progress-bar').style.width = pct + '%';
  }