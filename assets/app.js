const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function notify(message) {
  const toast = document.createElement('div');
  toast.className = 'toast fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl';
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2600);
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 2);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function setupCompressor() {
  const input = $('#file-input');
  const dropzone = $('#dropzone');
  const list = $('#file-list');
  const results = $('#results');
  const controls = $('#compress-controls');
  const compress = $('#compress-btn');
  const quality = $('#quality');
  const qualityLabel = $('#quality-label');
  const format = $('#output-format');
  let files = [];

  if (!input) return;
  quality.addEventListener('input', () => qualityLabel.textContent = `${quality.value}%`);
  dropzone.addEventListener('click', (e) => { if (!e.target.closest('button')) input.click(); });
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drop-active'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drop-active'));
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('drop-active'); addFiles(e.dataTransfer.files); });
  input.addEventListener('change', e => addFiles(e.target.files));

  function addFiles(incoming) {
    const imageFiles = [...incoming].filter(file => file.type.startsWith('image/'));
    if (!imageFiles.length) return notify('Please choose JPG, PNG, or WebP images.');
    files = [...files, ...imageFiles].slice(0, 20);
    renderQueue();
  }
  function renderQueue() {
    list.innerHTML = '';
    files.forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const row = document.createElement('div');
      row.className = 'queue-row flex items-center gap-3 border-b border-slate-100 py-3 last:border-0';
      row.innerHTML = `<img src="${url}" class="h-12 w-12 rounded-md object-cover" alt="${file.name}"><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-slate-800">${file.name}</p><p class="mt-0.5 text-xs text-slate-500">${formatBytes(file.size)} · Ready to compress</p></div><button data-remove="${i}" class="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Remove ${file.name}"><i class="fa-solid fa-xmark"></i></button>`;
      list.append(row);
    });
    controls.classList.toggle('hidden', !files.length);
    results.classList.add('hidden');
    $$('[data-remove]').forEach(btn => btn.addEventListener('click', () => { files.splice(Number(btn.dataset.remove), 1); renderQueue(); }));
  }
  compress.addEventListener('click', async () => {
    if (!files.length) return;
    compress.disabled = true;
    compress.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Compressing…';
    const qualityValue = Number(quality.value) / 100;
    const mime = format.value === 'original' ? null : `image/${format.value}`;
    const outputs = await Promise.all(files.map(file => compressFile(file, qualityValue, mime)));
    renderResults(outputs);
    compress.disabled = false;
    compress.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Compress images';
  });
  function compressFile(file, q, mime) {
    return new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => {
        const max = 3200, scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const type = mime || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        canvas.toBlob(blob => resolve({ file, blob, type }), type, q);
      }; image.onerror = reject; image.src = URL.createObjectURL(file);
    });
  }
  function renderResults(outputs) {
    const original = outputs.reduce((sum, item) => sum + item.file.size, 0);
    const compressed = outputs.reduce((sum, item) => sum + item.blob.size, 0);
    const saved = Math.max(0, Math.round((1 - compressed / original) * 100));
    results.classList.remove('hidden');
    results.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3"><div><p class="font-semibold text-slate-900"><i class="fa-solid fa-circle-check mr-2 text-emerald-500"></i>${outputs.length} image${outputs.length > 1 ? 's' : ''} compressed</p><p class="mt-1 text-sm text-slate-500">Saved ${saved}% · ${formatBytes(original)} to ${formatBytes(compressed)}</p></div><button id="download-all" class="rounded-lg bg-[#2557d6] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1945b3]"><i class="fa-solid fa-download mr-1.5"></i>Download all</button></div>`;
    $('#download-all').addEventListener('click', () => outputs.forEach((item, i) => {
      const ext = item.type.split('/')[1].replace('jpeg', 'jpg'); const name = item.file.name.replace(/\.[^.]+$/, '');
      const a = document.createElement('a'); a.href = URL.createObjectURL(item.blob); a.download = `${name}-compressed.${ext}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000 + i * 200);
    }));
  }
}
document.addEventListener('DOMContentLoaded', setupCompressor);
