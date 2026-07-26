const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbylbk4AxV9PJDl8VRi-o9wIOIxrxTNsd5MJyFGnATirp2643hXXk0qnKjPQMR4VxlQ/exec';

const storageKeys = {
  gasUrl: 'careLite.gasUrl',
  serviceTypes: 'careLite.serviceTypes'
};

const $ = (id) => document.getElementById(id);

const state = {
  token: '',
  provider: null,
  serviceTypes: [],
  records: [],
  editingRecordId: '',
  isSaving: false,
  toastTimer: null,
  editingPhotos: [],
  photoLoadVersion: 0,
  photoViewState: 'blank'
};

const els = {
  setupPanel: $('setupPanel'),
  gasUrl: $('gasUrl'),
  loginPanel: $('loginPanel'),
  providerBar: $('providerBar'),
  providerName: $('providerName'),
  currentRecipient: $('currentRecipient'),
  recordPanel: $('recordPanel'),
  notePanel: $('notePanel'),
  photoPanel: $('photoPanel'),
  savePanel: $('savePanel'),
  historyPanel: $('historyPanel'),
  logoutButton: $('logoutButton'),
  providerId: $('providerId'),
  pin: $('pin'),
  loginButton: $('loginButton'),
  serviceDate: $('serviceDate'),
  itemsList: $('itemsList'),
  addItemButton: $('addItemButton'),
  note: $('note'),
  photos: $('photos'),
  photoList: $('photoList'),
  selectedPhotoPreview: $('selectedPhotoPreview'),
  saveButton: $('saveButton'),
  cancelEditButton: $('cancelEditButton'),
  historyList: $('historyList'),
  historyFromDate: $('historyFromDate'),
  historyToDate: $('historyToDate'),
  refreshHistoryButton: $('refreshHistoryButton'),
  toast: $('toast'),
  itemTemplate: $('itemTemplate')
};

function todayText() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showToast(message, autoHideMs = 2200) {
  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
    state.toastTimer = null;
  }

  els.toast.textContent = message;
  els.toast.classList.remove('hidden');

  if (autoHideMs > 0) {
    state.toastTimer = setTimeout(() => {
      hideToast();
    }, autoHideMs);
  }
}

function hideToast() {
  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
    state.toastTimer = null;
  }
  els.toast.classList.add('hidden');
}

function setBusy(button, busy) {
  button.disabled = busy;
}

function getGasUrl() {
  var url = els.gasUrl.value.trim() || DEFAULT_GAS_URL;
  els.gasUrl.value = url;
  return url;
}

async function callApi(action, payload = {}, useAuth = true) {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('GAS URL을 입력하세요.');
  localStorage.setItem(storageKeys.gasUrl, gasUrl);

  const request = {
    action,
    requestId: `provider_local_${Date.now()}`,
    payload
  };

  if (useAuth) {
    request.auth = { providerSessionToken: state.token };
  }

  let response;
  if (location.protocol.startsWith('http')) {
    response = await fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify({ gasUrl, request })
    });
  } else {
    response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(request)
    });
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error && data.error.message ? data.error.message : '요청 실패');
  }
  return data.data || {};
}

function padHour(value) {
  let hour = Number(value);
  if (!Number.isFinite(hour)) hour = 0;
  if (hour < 0) hour = 23;
  if (hour > 23) hour = 0;
  return String(hour).padStart(2, '0');
}

function normalizeMinute(value) {
  return String(value) === '30' ? '30' : '00';
}

function setMinute(control, minute) {
  control.dataset.minute = normalizeMinute(minute);
  control.querySelectorAll('.minute-toggle button').forEach((button) => {
    button.classList.toggle('active', button.dataset.minute === control.dataset.minute);
  });
}

function formatTime(control) {
  const input = control.querySelector('.hour-input');
  input.value = padHour(input.value);
  return `${input.value}:${normalizeMinute(control.dataset.minute)}`;
}

function setTime(control, timeText) {
  const parts = String(timeText || '09:00').split(':');
  control.querySelector('.hour-input').value = padHour(parts[0]);
  setMinute(control, parts[1]);
}

function changeHour(input, delta) {
  input.value = padHour(Number(input.value || 0) + delta);
}

function createTimeControl(control, timeText) {
  control.innerHTML = '';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '-';

  const input = document.createElement('input');
  input.className = 'hour-input';
  input.inputMode = 'numeric';
  input.maxLength = 2;

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';

  const minuteWrap = document.createElement('div');
  minuteWrap.className = 'minute-toggle';

  const m00 = document.createElement('button');
  m00.type = 'button';
  m00.textContent = '00';
  m00.dataset.minute = '00';

  const m30 = document.createElement('button');
  m30.type = 'button';
  m30.textContent = '30';
  m30.dataset.minute = '30';

  minus.addEventListener('click', () => changeHour(input, -1));
  plus.addEventListener('click', () => changeHour(input, 1));
  input.addEventListener('blur', () => { input.value = padHour(input.value); });
  m00.addEventListener('click', () => setMinute(control, '00'));
  m30.addEventListener('click', () => setMinute(control, '30'));

  minuteWrap.append(m00, m30);
  control.append(minus, input, plus, minuteWrap);
  setTime(control, timeText);
}

function openMainPanels() {
  document.body.classList.remove('login-mode');
  document.body.classList.add('main-mode');
  els.setupPanel.classList.add('hidden');
  els.loginPanel.classList.add('hidden');
  els.providerBar.classList.remove('hidden');
  els.recordPanel.classList.remove('hidden');
  els.notePanel.classList.remove('hidden');
  els.photoPanel.classList.remove('hidden');
  els.savePanel.classList.remove('hidden');
  els.historyPanel.classList.remove('hidden');
  els.logoutButton.classList.remove('hidden');
}

function closeMainPanels() {
  document.body.classList.add('login-mode');
  document.body.classList.remove('main-mode');
  els.setupPanel.classList.add('hidden');
  els.loginPanel.classList.remove('hidden');
  els.providerBar.classList.add('hidden');
  els.recordPanel.classList.add('hidden');
  els.notePanel.classList.add('hidden');
  els.photoPanel.classList.add('hidden');
  els.savePanel.classList.add('hidden');
  els.historyPanel.classList.add('hidden');
  els.logoutButton.classList.add('hidden');
}

function applyProvider(provider) {
  state.provider = provider;
  els.providerName.textContent = provider.name || provider.providerId || '-';
  els.currentRecipient.textContent = provider.currentRecipientName || '수여자 미지정';
  openMainPanels();
}

function clearSession() {
  state.token = '';
  state.provider = null;
  state.records = [];
  state.editingRecordId = '';
  els.providerId.value = '';
  els.pin.value = '';
  renderHistory([]);
  resetEditMode();
  closeMainPanels();
}

function applyServiceTypes(serviceTypes) {
  state.serviceTypes = serviceTypes || [];
  document.querySelectorAll('.item-type').forEach(fillServiceTypeOptions);
}

function loadCachedServiceTypes() {
  try {
    const cached = JSON.parse(localStorage.getItem(storageKeys.serviceTypes) || '[]');
    if (Array.isArray(cached) && cached.length > 0) {
      applyServiceTypes(cached);
      return true;
    }
  } catch (error) {
    localStorage.removeItem(storageKeys.serviceTypes);
  }
  return false;
}

async function loadServiceTypes() {
  if (loadCachedServiceTypes()) {
    return;
  }
  const data = await callApi('getServiceTypes', {}, false);
  const serviceTypes = data.serviceTypes || [];
  localStorage.setItem(storageKeys.serviceTypes, JSON.stringify(serviceTypes));
  applyServiceTypes(serviceTypes);
}

function fillServiceTypeOptions(select) {
  const selected = select.value || select.dataset.selected || '';
  select.innerHTML = '';

  state.serviceTypes.forEach((type) => {
    const option = document.createElement('option');
    option.value = type.serviceTypeId;
    option.textContent = type.name;
    select.appendChild(option);
  });

  if (selected) select.value = selected;
  if (!select.value && state.serviceTypes[0]) select.value = state.serviceTypes[0].serviceTypeId;
}

function defaultNextTimes() {
  const last = els.itemsList.lastElementChild;
  if (!last) return { startTime: '09:00', endTime: '10:00' };
  const lastEnd = formatTime(last.querySelector('.item-end'));
  const endHour = Math.min(23, Number(lastEnd.slice(0, 2)) + 1);
  return { startTime: lastEnd, endTime: `${String(endHour).padStart(2, '0')}:${lastEnd.slice(3)}` };
}

function addItem(defaults = {}, options = {}) {
  const times = defaults.startTime ? defaults : defaultNextTimes();
  const node = els.itemTemplate.content.firstElementChild.cloneNode(true);
  const type = node.querySelector('.item-type');
  const startControl = node.querySelector('.item-start');
  const endControl = node.querySelector('.item-end');
  const removeButton = node.querySelector('.remove-item');

  type.dataset.selected = defaults.serviceTypeId || '';
  fillServiceTypeOptions(type);
  createTimeControl(startControl, times.startTime || '09:00');
  createTimeControl(endControl, times.endTime || '10:00');

  if (options.hideRemove) {
    removeButton.classList.add('hidden');
  }

  removeButton.addEventListener('click', () => {
    if (els.itemsList.children.length <= 1) {
      showToast('제공 서비스는 1개 이상 필요합니다.', 1800);
      return;
    }
    node.remove();
  });

  els.itemsList.appendChild(node);
}

function collectItems() {
  return Array.from(els.itemsList.children).map((row) => ({
    serviceTypeId: row.querySelector('.item-type').value,
    startTime: formatTime(row.querySelector('.item-start')),
    endTime: formatTime(row.querySelector('.item-end'))
  }));
}

function getWorkRange(items) {
  const starts = items.map((item) => item.startTime).sort();
  const ends = items.map((item) => item.endTime).sort();
  return {
    workStartTime: starts[0] || '',
    workEndTime: ends[ends.length - 1] || ''
  };
}

function resetEditMode() {
  state.photoLoadVersion += 1;
  state.editingRecordId = '';
  els.saveButton.textContent = '저장';
  els.cancelEditButton.classList.add('hidden');
  els.serviceDate.value = todayText();
  els.note.value = '';
  els.photos.value = '';
  state.editingPhotos = [];
  state.photoViewState = 'blank';
  if (els.photoList) els.photoList.innerHTML = '';
  renderPhotoControls();
  els.itemsList.innerHTML = '';
}

function setTodayHistoryRange() {
  const today = todayText();
  els.historyFromDate.value = today;
  els.historyToDate.value = today;
}

function showHistoryLoading() {
  els.historyList.innerHTML = '';
  const loading = document.createElement('p');
  loading.className = 'history-empty';
  loading.textContent = '오늘 기록을 불러오는 중입니다.';
  els.historyList.appendChild(loading);
}
function renderHistory(records = state.records, options = {}) {
  const showEmpty = options.showEmpty !== false;
  els.historyList.innerHTML = '';

  if (!records || records.length === 0) {
    if (showEmpty) {
      const empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = '표시할 기록이 없습니다.';
      els.historyList.appendChild(empty);
    }
    return;
  }

  records.forEach((record) => {
    const services = (record.items || [])
      .map((item) => item.serviceTypeName || item.serviceTypeId)
      .filter(Boolean)
      .join(', ');

    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `<strong>${record.serviceDate} ${record.recipientName || ''}</strong><span>${record.workStartTime}-${record.workEndTime} · ${record.totalDurationMinutes || 0}분${services ? ' · ' + services : ''}</span>`;
    card.addEventListener('click', () => handleRecordClick(record));
    els.historyList.appendChild(card);
  });
}

function normalizeDateText(value) {
  var text = String(value || '').trim();
  var match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
}

function isTodayRecord(record) {
  return normalizeDateText(record.serviceDate) === todayText();
}
function handleRecordClick(record) {
  beginEdit(record);
}

function showRecordDetail(record) {
  const lines = [];
  lines.push(`${record.serviceDate} ${record.recipientName || ''}`);
  lines.push(`${record.workStartTime}-${record.workEndTime}`);
  (record.items || []).forEach((item) => {
    lines.push(`${item.startTime}-${item.endTime} ${item.serviceTypeName || item.serviceTypeId}`);
  });
  if (record.note) lines.push(`특이사항: ${record.note}`);
  showToast(lines.join('\n'));
}

function hasPhotoFileId(value) {
  var text = String(value || '').trim();
  var lower = text.toLowerCase();
  if (!text) return false;
  if (text === '-' || lower === 'undefined' || lower === 'null' || lower === 'none') return false;
  if (lower === 'true' || lower === 'false') return false;
  if (/^0+$/.test(text)) return false;
  return text.length >= 10;
}
function extractRecordPhotos(record) {
  const photos = [];
  if (hasPhotoFileId(record.photo1FileId)) {
    photos.push({
      seq: 1,
      fileId: record.photo1FileId,
      name: record.photo1OriginalName || record.photo1FileName || '사진'
    });
  }
  return photos;
}

function clearPhotoInput() {
  els.photos.value = '';
  if (els.selectedPhotoPreview) els.selectedPhotoPreview.innerHTML = '';
}

function openPhotoPicker() {
  els.photos.click();
}

function markPhotoForDelete() {
  state.photoLoadVersion += 1;
  state.editingPhotos = [];
  state.photoViewState = 'none';
  if (els.photoList) {
    els.photoList.innerHTML = '<input type="hidden" class="remove-photo" value="1">';
  }
  clearPhotoInput();
  renderPhotoControls();
}

function renderSelectedPhotoPreview() {
  renderPhotoControls();
}

function renderPhotoControls() {
  if (!els.selectedPhotoPreview) return;
  els.selectedPhotoPreview.innerHTML = '';

  const file = (els.photos.files || [])[0];
  const existingPhoto = state.editingPhotos.find(function(photo) {
    return photo && hasPhotoFileId(photo.fileId);
  });

  const row = document.createElement('div');
  row.className = 'photo-existing photo-control-card';

  if (file) {
    const img = document.createElement('img');
    img.className = 'photo-thumb';
    img.alt = '사진';
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    row.appendChild(img);
  } else if (existingPhoto && existingPhoto.dataUrl) {
    const img = document.createElement('img');
    img.className = 'photo-thumb';
    img.alt = '사진';
    img.src = existingPhoto.dataUrl;
    row.appendChild(img);
  } else {
    const message = document.createElement('div');
    message.className = 'photo-loading';
    if (state.photoViewState === 'loading') {
      message.textContent = '사진을 불러오는 중입니다.';
    } else if (state.photoViewState === 'none') {
      message.textContent = '사진이 없습니다.';
    } else {
      message.textContent = '';
      message.setAttribute('aria-hidden', 'true');
    }
    row.appendChild(message);
  }

  const actions = document.createElement('div');
  actions.className = 'photo-actions';

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'photo-action-button';
  addButton.textContent = '추가/변경';
  addButton.addEventListener('click', openPhotoPicker);
  actions.appendChild(addButton);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'photo-action-button danger';
  deleteButton.textContent = '삭제';
  deleteButton.disabled = !(file || existingPhoto || state.photoViewState === 'loading');
  deleteButton.addEventListener('click', markPhotoForDelete);
  actions.appendChild(deleteButton);

  row.appendChild(actions);
  els.selectedPhotoPreview.appendChild(row);
}

function renderExistingPhotos(photos = state.editingPhotos) {
  if (!els.photoList) return;

  var photo = (photos || []).find(function(item) {
    return item && hasPhotoFileId(item.fileId);
  });
  state.editingPhotos = photo ? [photo] : [];
  els.photoList.innerHTML = '';
  state.photoViewState = photo ? (photo.dataUrl ? 'loaded' : 'loading') : 'none';
  renderPhotoControls();
}

function markExistingPhotosFailed(message) {
  if (!els.photoList) return;
  Array.from(els.photoList.querySelectorAll('.photo-loading')).forEach(function(node) {
    node.textContent = message || '사진을 불러오지 못했습니다.';
    node.classList.add('photo-error');
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('사진 불러오기가 지연됩니다.'));
    }, ms);
    promise.then(function(value) {
      clearTimeout(timer);
      resolve(value);
    }).catch(function(error) {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function loadExistingPhotoPreviews(recordId, photoLoadVersion) {
  if (!recordId || !state.editingPhotos.length) {
    state.photoViewState = 'none';
    renderPhotoControls();
    return;
  }

  for (var attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) {
      await sleep(700);
    }
    if (photoLoadVersion !== state.photoLoadVersion || recordId !== state.editingRecordId) return;

    try {
      var data = await withTimeout(callApi('getServiceRecordPhotos', { recordId: recordId }, true), 12000);
      if (photoLoadVersion !== state.photoLoadVersion || recordId !== state.editingRecordId) return;

      var previews = (data.photos || []).filter(function(photo) {
        return Number(photo.seq) === 1 && photo.dataUrl;
      });
      if (!previews.length) {
        continue;
      }

      state.editingPhotos = state.editingPhotos.map(function(photo) {
        var preview = previews.find(function(item) { return Number(item.seq) === Number(photo.seq); });
        return preview ? Object.assign({}, photo, preview, { name: preview.originalName || photo.name }) : photo;
      });
      if (photoLoadVersion !== state.photoLoadVersion || recordId !== state.editingRecordId) return;
      state.photoViewState = 'loaded';
      renderExistingPhotos(state.editingPhotos);
      return;
    } catch (error) {
      if (attempt === 4) {
        if (photoLoadVersion !== state.photoLoadVersion || recordId !== state.editingRecordId) return;
        markExistingPhotosFailed(error.message || '사진을 불러오지 못했습니다.');
        showToast(error.message || '사진을 불러오지 못했습니다.', 2200);
      }
    }
  }

  if (photoLoadVersion !== state.photoLoadVersion || recordId !== state.editingRecordId) return;
  state.editingPhotos = [];
  state.photoViewState = 'none';
  renderPhotoControls();
}

function collectRemovePhotoSeqs() {
  if (!els.photoList) return [];
  return Array.from(els.photoList.querySelectorAll('.remove-photo'))
    .filter((input) => !input.disabled)
    .map((input) => Number(input.value));
}

function beginEdit(record) {
  state.photoLoadVersion += 1;
  var photoLoadVersion = state.photoLoadVersion;
  state.editingRecordId = record.recordId;
  els.saveButton.textContent = '수정 저장';
  els.cancelEditButton.classList.remove('hidden');
  els.serviceDate.value = normalizeDateText(record.serviceDate);
  els.note.value = record.note || '';
  els.itemsList.innerHTML = '';

  (record.items || []).forEach((item) => addItem(item));
  if (els.itemsList.children.length === 0) {
    addItem({ startTime: record.workStartTime, endTime: record.workEndTime });
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('오늘 기록을 수정합니다.', 1800);

  try {
    els.photos.value = '';
    state.editingPhotos = extractRecordPhotos(record);
    state.photoViewState = state.editingPhotos.length > 0 ? 'loading' : 'none';
    renderExistingPhotos(state.editingPhotos);
    if (state.editingPhotos.length > 0) {
      setTimeout(function() {
        loadExistingPhotoPreviews(record.recordId, photoLoadVersion);
      }, 0);
    }
  } catch (error) {
    state.editingPhotos = [];
    if (els.photoList) els.photoList.innerHTML = '';
    showToast('사진 표시는 잠시 불러오지 못했습니다.', 1800);
  }
}
async function loadHistory(options = {}) {
  const data = await callApi('getMyServiceRecords', {
    dateFrom: els.historyFromDate.value,
    dateTo: els.historyToDate.value
  }, true);
  state.records = data.records || [];
  renderHistory(state.records, options);
}

async function refreshHistoryWithRetry() {
  await loadHistory();
  await sleep(800);
  await loadHistory();
}

async function refreshHistoryAfterSave() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(800);
    await loadHistory({ showEmpty: false });
    if (state.records.length > 0) return;
  }
}
async function login() {
  setBusy(els.loginButton, true);
  try {
    const data = await callApi('providerLogin', {
      providerId: els.providerId.value.trim(),
      pin: els.pin.value.trim()
    }, false);

    state.token = data.providerSessionToken || '';
    applyProvider(data.provider || {});
    setTodayHistoryRange();
    resetEditMode();
    showHistoryLoading();
    await Promise.all([loadServiceTypes(), loadHistory()]);
    showToast('로그인되었습니다.', 1800);
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(els.loginButton, false);
  }
}

function readPhotoFile_(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        base64Data: base64
      });
    };
    reader.onerror = () => reject(new Error('사진을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

async function collectPhotos() {
  const files = Array.from(els.photos.files || []);
  if (files.length > 1) {
    throw new Error('사진은 최대 1장입니다.');
  }

  for (const file of files) {
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      throw new Error('사진은 JPG 또는 PNG만 가능합니다.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('사진 1장 크기는 최대 5MB입니다.');
    }
  }

  const photos = await Promise.all(files.map(readPhotoFile_));
  photos.forEach((photo) => {
    photo.seq = 1;
  });
  return photos;
}

function countRecordPhotos(record) {
  return record && hasPhotoFileId(record.photo1FileId) ? 1 : 0;
}

function expectedPhotoCountAfterSave(payload) {
  if ((payload.photos || []).length > 0) return 1;
  if ((payload.removePhotoSeqs || []).includes(1)) return 0;
  return state.editingPhotos.length > 0 ? 1 : 0;
}

function findRecordById(recordId) {
  return state.records.find(function(item) {
    return String(item.recordId || '') === String(recordId || '');
  });
}

async function reloadRecordAfterSave(recordId, expectedPhotoCount) {
  if (!recordId) {
    await loadHistory();
    return null;
  }

  var latest = null;
  for (var attempt = 0; attempt < 7; attempt += 1) {
    if (attempt > 0) {
      await sleep(800);
    }
    await loadHistory();
    latest = findRecordById(recordId);
    if (latest && countRecordPhotos(latest) === expectedPhotoCount) {
      return latest;
    }
  }
  return latest;
}
async function loadHistoryUntilPhotoCount(recordId, expectedCount) {
  for (var attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) {
      await sleep(700);
    }
    await loadHistory();
    if (!recordId) {
      return;
    }
    var record = state.records.find(function(item) {
      return String(item.recordId || '') === String(recordId || '');
    });
    if (record && countRecordPhotos(record) === expectedCount) {
      return;
    }
  }
}
async function buildPayload() {
  const items = collectItems();
  const range = getWorkRange(items);
  const photos = await collectPhotos();
  const removeSeqs = collectRemovePhotoSeqs();
  if (photos.length > 0 || removeSeqs.includes(1)) {
    removeSeqs.push(1);
  }
  removeSeqs.push(2);

  return {
    recordId: state.editingRecordId,
    serviceDate: els.serviceDate.value,
    recipientName: els.currentRecipient.textContent.trim(),
    workStartTime: range.workStartTime,
    workEndTime: range.workEndTime,
    note: els.note.value.trim(),
    items,
    photos,
    removePhotoSeqs: Array.from(new Set(removeSeqs))
  };
}

async function saveRecord() {
  if (state.isSaving) {
    return;
  }
  if (els.photos.files.length > 1) {
    showToast('사진은 최대 1장입니다.', 1800);
    return;
  }
  if (!state.token) {
    showToast('로그인이 필요합니다.', 1800);
    return;
  }
  if (els.currentRecipient.textContent === '수여자 미지정') {
    showToast('수여자가 지정되지 않았습니다.', 1800);
    return;
  }
  if (els.itemsList.children.length === 0) {
    showToast('제공 서비스 추가를 눌러 서비스를 입력하세요.', 1800);
    return;
  }

  state.isSaving = true;
  setBusy(els.saveButton, true);
  try {
    const action = state.editingRecordId ? 'updateServiceRecord' : 'createServiceRecord';
    const payload = await buildPayload();
    const targetRecordId = payload.recordId;
    const data = await callApi(action, payload, true);
    if (data.provider) applyProvider(data.provider);
    resetEditMode();
    showToast(action === 'updateServiceRecord' ? '수정되었습니다.' : '저장되었습니다.', 1800);
    refreshHistoryAfterSave().catch(function(error) { showToast(error.message, 1800); });
  } catch (error) {
    showToast(error.message);
  } finally {
    state.isSaving = false;
    setBusy(els.saveButton, false);
  }
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {});
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
function init() {
  setupServiceWorker();
  els.gasUrl.value = DEFAULT_GAS_URL;
  els.serviceDate.value = todayText();
  setTodayHistoryRange();
  resetEditMode();
  renderHistory([]);
  closeMainPanels();
}

els.loginButton.addEventListener('click', login);
els.logoutButton.addEventListener('click', clearSession);
els.addItemButton.addEventListener('click', () => addItem());
els.saveButton.addEventListener('click', saveRecord);
els.cancelEditButton.addEventListener('click', resetEditMode);
els.refreshHistoryButton.addEventListener('click', () => { resetEditMode(); refreshHistoryWithRetry().catch((error) => showToast(error.message)); });
els.photos.addEventListener('change', renderSelectedPhotoPreview);
els.toast.addEventListener('click', hideToast);

init();













































































































