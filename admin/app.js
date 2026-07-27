const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyP6u6ZD7tUyGXLkF4ZrWDGWdupVBt-EJofbri4KGkwvtRXUCNyIfDyR4T2C5mtGWg/exec';

const $ = (id) => document.getElementById(id);

const state = {
  adminPassword: '',
  records: [],
  openRecordId: '',
  photoCache: {},
  toastTimer: null,
  personRole: 'provider',
  people: [],
  matchProviders: [],
  matchRecipients: [],
  matches: [],
  peopleLoadedRole: '',
  matchesLoaded: false
};

const els = {
  adminPassword: $('adminPassword'),
  loginPanel: $('loginPanel'),
  mainTabs: $('mainTabs'),
  recordsTab: $('recordsTab'),
  peopleTab: $('peopleTab'),
  matchesTab: $('matchesTab'),
  recordsView: $('recordsView'),
  peopleView: $('peopleView'),
  matchesView: $('matchesView'),
  filterPanel: $('filterPanel'),
  summaryPanel: $('summaryPanel'),
  serviceSummaryPanel: $('serviceSummaryPanel'),
  recordsPanel: $('recordsPanel'),
  logoutButton: $('logoutButton'),
  loginButton: $('loginButton'),
  searchButton: $('searchButton'),
  dateFrom: $('dateFrom'),
  dateTo: $('dateTo'),
  providerFilter: $('providerFilter'),
  recipientFilter: $('recipientFilter'),
  totalRecords: $('totalRecords'),
  totalHours: $('totalHours'),
  totalPoints: $('totalPoints'),
  serviceSummaryList: $('serviceSummaryList'),
  recordsList: $('recordsList'),
  providerTypeButton: $('providerTypeButton'),
  recipientTypeButton: $('recipientTypeButton'),
  personId: $('personId'),
  personIdPrefix: $('personIdPrefix'),
  personName: $('personName'),
  personPhone: $('personPhone'),
  personStatus: $('personStatus'),
  personPin: $('personPin'),
  personAddress: $('personAddress'),
  guardianName: $('guardianName'),
  guardianPhone: $('guardianPhone'),
  personNote: $('personNote'),
  providerPinLabel: $('providerPinLabel'),
  recipientAddressLabel: $('recipientAddressLabel'),
  guardianNameLabel: $('guardianNameLabel'),
  guardianPhoneLabel: $('guardianPhoneLabel'),
  peopleListTitle: $('peopleListTitle'),
  peopleSearch: $('peopleSearch'),
  peopleList: $('peopleList'),
  savePersonButton: $('savePersonButton'),
  clearPersonButton: $('clearPersonButton'),
  matchProviderSelect: $('matchProviderSelect'),
  currentMatchBox: $('currentMatchBox'),
  matchRecipientSelect: $('matchRecipientSelect'),
  matchStartDate: $('matchStartDate'),
  matchActive: $('matchActive'),
  matchNote: $('matchNote'),
  saveMatchButton: $('saveMatchButton'),
  clearMatchButton: $('clearMatchButton'),
  matchesList: $('matchesList'),
  toast: $('toast')
};

function todayText() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function minutesText(minutes) {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (hours && rest) return `${hours}시간 ${rest}분`;
  if (hours) return `${hours}시간`;
  return `${rest}분`;
}

function showToast(message, duration = 1800) {
  if (state.toastTimer) clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  state.toastTimer = duration > 0 ? setTimeout(hideToast, duration) : null;
}

function hideToast() {
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = null;
  els.toast.classList.add('hidden');
}

function setBusy(button, busy, busyText) {
  if (!button.dataset.idleText) button.dataset.idleText = button.textContent;
  button.disabled = busy;
  button.textContent = busy && busyText ? busyText : button.dataset.idleText;
}

async function callApi(action, payload = {}) {
  const request = {
    action,
    requestId: `admin_local_${Date.now()}`,
    payload: { ...payload, adminPassword: state.adminPassword }
  };
  const isLocalPreview = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  const response = isLocalPreview
    ? await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({ gasUrl: DEFAULT_GAS_URL, request })
      })
    : await fetch(DEFAULT_GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(request)
      });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error && data.error.message ? data.error.message : '요청 실패');
  return data.data || {};
}

function switchView(view) {
  els.recordsTab.classList.toggle('active', view === 'records');
  els.peopleTab.classList.toggle('active', view === 'people');
  els.matchesTab.classList.toggle('active', view === 'matches');
  els.recordsView.classList.toggle('hidden', view !== 'records');
  els.peopleView.classList.toggle('hidden', view !== 'people');
  els.matchesView.classList.toggle('hidden', view !== 'matches');
  if (view === 'people' && state.peopleLoadedRole !== state.personRole) loadPeople();
  if (view === 'matches' && !state.matchesLoaded) loadMatches();
}

function openMain() {
  els.loginPanel.classList.add('hidden');
  els.mainTabs.classList.remove('hidden');
  els.logoutButton.classList.remove('hidden');
  els.filterPanel.classList.remove('hidden');
  els.summaryPanel.classList.remove('hidden');
  els.serviceSummaryPanel.classList.remove('hidden');
  els.recordsPanel.classList.remove('hidden');
  switchView('records');
}

function closeMain() {
  state.adminPassword = '';
  state.records = [];
  state.openRecordId = '';
  state.photoCache = {};
  state.people = [];
  state.matchProviders = [];
  state.matchRecipients = [];
  state.matches = [];
  state.peopleLoadedRole = '';
  state.matchesLoaded = false;
  els.adminPassword.value = '';
  els.loginPanel.classList.remove('hidden');
  els.mainTabs.classList.add('hidden');
  els.recordsView.classList.remove('hidden');
  els.peopleView.classList.add('hidden');
  els.matchesView.classList.add('hidden');
  els.filterPanel.classList.add('hidden');
  els.summaryPanel.classList.add('hidden');
  els.serviceSummaryPanel.classList.add('hidden');
  els.recordsPanel.classList.add('hidden');
  els.logoutButton.classList.add('hidden');
  renderRecords([]);
  renderPeople([]);
  renderMatches([]);
}

function fillOptions(select, rows, idKey) {
  const current = select.value;
  select.innerHTML = '<option value="">전체</option>';
  rows.forEach((row) => {
    const option = document.createElement('option');
    option.value = row[idKey];
    option.textContent = `${row.name} (${row[idKey]})`;
    select.appendChild(option);
  });
  select.value = current;
}

async function loadFilterOptions() {
  const data = await callApi('getAdminFilterOptions');
  fillOptions(els.providerFilter, data.providers || [], 'providerId');
  fillOptions(els.recipientFilter, data.recipients || [], 'recipientId');
}

function renderSummary(summary = {}) {
  els.totalRecords.textContent = `${summary.totalRecords || 0}건`;
  els.totalHours.textContent = minutesText(summary.totalDurationMinutes || 0);
  els.totalPoints.textContent = `${Number(summary.totalPoints || 0)}점`;
  els.serviceSummaryList.innerHTML = '';
  const items = summary.serviceTypes || [];
  if (items.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'chip';
    empty.textContent = '서비스 합계 없음';
    els.serviceSummaryList.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `${item.serviceTypeName}: ${minutesText(item.totalDurationMinutes)} · ${Number(item.totalPoints || 0)}점`;
    els.serviceSummaryList.appendChild(chip);
  });
}

function renderPhotoImage(box, src) {
  const img = document.createElement('img');
  img.className = 'detail-photo-image';
  img.alt = '제공 사진';
  img.src = src;
  box.appendChild(img);
}

function renderPhotoArea(record, detail) {
  const photoBox = document.createElement('div');
  photoBox.className = 'detail-photo';
  detail.appendChild(photoBox);
  if (!record.photo1FileId) {
    photoBox.textContent = '사진이 없습니다.';
    return;
  }
  const cached = state.photoCache[record.recordId];
  if (cached && cached.dataUrl) {
    renderPhotoImage(photoBox, cached.dataUrl);
    return;
  }
  photoBox.textContent = '사진을 불러오는 중입니다.';
  callApi('getAdminServiceRecordPhotos', { recordId: record.recordId })
    .then((data) => {
      const photo = (data.photos || [])[0];
      photoBox.innerHTML = '';
      if (!photo || !photo.dataUrl) {
        photoBox.textContent = '사진이 없습니다.';
        return;
      }
      state.photoCache[record.recordId] = photo;
      renderPhotoImage(photoBox, photo.dataUrl);
    })
    .catch((error) => {
      photoBox.textContent = error.message || '사진을 불러오지 못했습니다.';
    });
}

function renderRecordDetail(record, card) {
  const detail = document.createElement('div');
  detail.className = 'record-detail';
  const info = document.createElement('div');
  info.className = 'detail-grid';
  info.innerHTML = `
    <div><span>날짜</span><strong>${record.serviceDate}</strong></div>
    <div><span>제공자</span><strong>${record.providerName || record.providerId}</strong></div>
    <div><span>수여자</span><strong>${record.recipientName || record.recipientId}</strong></div>
    <div><span>시간</span><strong>${record.workStartTime} ~ ${record.workEndTime}</strong></div>
  `;
  detail.appendChild(info);
  const services = document.createElement('div');
  services.className = 'detail-services';
  (record.items || []).forEach((item) => {
    const row = document.createElement('div');
    row.textContent = `${item.startTime}~${item.endTime} ${item.serviceTypeName || item.serviceTypeId} (${minutesText(item.durationMinutes)})`;
    services.appendChild(row);
  });
  if (!services.children.length) services.textContent = '제공 서비스 내역이 없습니다.';
  detail.appendChild(services);
  renderPhotoArea(record, detail);
  const note = document.createElement('div');
  note.className = 'detail-note';
  note.textContent = record.note ? `활동기록: ${record.note}` : '활동기록 없음';
  detail.appendChild(note);
  card.appendChild(detail);
}

function toggleRecordDetail(record) {
  state.openRecordId = state.openRecordId === record.recordId ? '' : record.recordId;
  renderRecords(state.records);
}


function renderRecordsLoading() {
  els.recordsList.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'record-card';
  loading.textContent = '기록을 조회 중입니다.';
  els.recordsList.appendChild(loading);
}

function renderPeopleLoading() {
  els.peopleList.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'person-card';
  loading.textContent = '회원 조회 중입니다.';
  els.peopleList.appendChild(loading);
}

function renderMatchesLoading() {
  if (!els.matchesList) return;
  els.matchesList.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'match-card';
  loading.textContent = '목록 조회 중입니다.';
  els.matchesList.appendChild(loading);
}
function renderRecords(records = []) {
  els.recordsList.innerHTML = '';
  if (records.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'record-card';
    empty.textContent = '조회된 기록이 없습니다.';
    els.recordsList.appendChild(empty);
    return;
  }
  records.forEach((record) => {
    const card = document.createElement('article');
    card.className = 'record-card';
    if (state.openRecordId === record.recordId) card.classList.add('open');
    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'record-main';
    main.innerHTML = `
      <span class="record-date-cell">${record.serviceDate}</span>
      <span class="record-people"><strong>${record.providerName || record.providerId}</strong><span>${record.recipientName || record.recipientId}</span>${record.photo1FileId ? '<i class="photo-badge" aria-label="사진 있음" title="사진 있음">사진</i>' : ''}</span>
      <span class="record-duration">${minutesText(record.totalDurationMinutes)}</span>
    `;
    main.addEventListener('click', () => toggleRecordDetail(record));
    card.appendChild(main);
    const itemList = document.createElement('div');
    itemList.className = 'item-list';
    (record.items || []).forEach((item) => {
      const pill = document.createElement('span');
      pill.className = 'item-pill';
      pill.textContent = `${item.serviceTypeName} ${item.startTime}~${item.endTime}`;
      itemList.appendChild(pill);
    });
    card.appendChild(itemList);
    if (record.note) {
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = record.note;
      card.appendChild(note);
    }
    if (state.openRecordId === record.recordId) renderRecordDetail(record, card);
    els.recordsList.appendChild(card);
  });
}

async function searchRecords() {
  renderRecordsLoading();
  setBusy(els.searchButton, true, '조회 중...');
  try {
    const data = await callApi('getAdminServiceRecords', {
      dateFrom: els.dateFrom.value,
      dateTo: els.dateTo.value,
      providerId: els.providerFilter.value,
      recipientId: els.recipientFilter.value
    });
    state.records = data.records || [];
    state.openRecordId = '';
    renderSummary(data.summary || {});
    renderRecords(state.records);
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(els.searchButton, false);
  }
}


function fillPlainOptions(select, rows, idKey, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  rows.forEach((row) => {
    const option = document.createElement('option');
    option.value = row[idKey] || row.id;
    option.textContent = `${row.name} (${row[idKey] || row.id})`;
    select.appendChild(option);
  });
  select.value = current;
}

function providerById(providerId) {
  return state.matchProviders.find((provider) => provider.providerId === providerId || provider.id === providerId);
}

function recipientById(recipientId) {
  return state.matchRecipients.find((recipient) => recipient.recipientId === recipientId || recipient.id === recipientId);
}

function updateCurrentMatchBox() {
  const provider = providerById(els.matchProviderSelect.value);
  if (!provider) {
    els.currentMatchBox.textContent = '';
    els.currentMatchBox.classList.add('hidden');
    return;
  }
  const recipient = recipientById(provider.currentRecipientId);
  els.currentMatchBox.textContent = recipient ? `현재: ${recipient.name} (${recipient.recipientId || recipient.id})` : '현재 없음';
  els.currentMatchBox.classList.remove('hidden');
}

function clearMatchForm() {
  if (!els.matchProviderSelect) return;
  els.matchProviderSelect.value = '';
  els.matchRecipientSelect.value = '';
  els.matchStartDate.value = todayText();
  els.matchActive.value = 'A';
  els.matchNote.value = '';
  updateCurrentMatchBox();
}

function renderMatches(matches = []) {
  if (!els.matchesList) return;
  els.matchesList.innerHTML = '';
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'match-card';
    empty.textContent = '등록된 매칭이 없습니다.';
    els.matchesList.appendChild(empty);
    return;
  }
  matches.forEach((match) => {
    const card = document.createElement('article');
    card.className = 'match-card';
    const activeText = match.active === 'A' ? '활성' : '비활성';
    card.innerHTML = `
      <div class="match-main">
        <strong>${match.providerName || match.providerId}</strong>
        <span>${match.recipientName || match.recipientId}</span>
        <em class="status-badge ${match.active === 'A' ? 'active' : 'inactive'}">${activeText}</em>
      </div>
      <div class="match-sub">${match.startDate || '-'} ~ ${match.endDate || '계속'}</div>
    `;
    card.addEventListener('click', () => {
      els.matchProviderSelect.value = match.providerId;
      els.matchRecipientSelect.value = match.recipientId;
      els.matchStartDate.value = match.startDate || todayText();
      els.matchActive.value = match.active || 'A';
      els.matchNote.value = match.adminNote || '';
      updateCurrentMatchBox();
    });
    els.matchesList.appendChild(card);
  });
}

async function loadMatches() {
  renderMatchesLoading();
  try {
    const data = await callApi('getAdminMatches');
    state.matchProviders = data.providers || [];
    state.matchRecipients = data.recipients || [];
    state.matches = data.matches || [];
    state.matchesLoaded = true;
    fillPlainOptions(els.matchProviderSelect, state.matchProviders, 'providerId', '제공자');
    fillPlainOptions(els.matchRecipientSelect, state.matchRecipients, 'recipientId', '수여자');
    if (!els.matchStartDate.value) els.matchStartDate.value = todayText();
    updateCurrentMatchBox();
    renderMatches(state.matches);
  } catch (error) {
    showToast(error.message);
  }
}

async function saveMatch() {
  if (!els.matchProviderSelect.value || !els.matchRecipientSelect.value) {
    showToast('제공자와 수여자를 선택하세요.');
    return;
  }
  setBusy(els.saveMatchButton, true, '저장 중...');
  try {
    await callApi('saveAdminMatch', {
      providerId: els.matchProviderSelect.value,
      recipientId: els.matchRecipientSelect.value,
      startDate: els.matchStartDate.value,
      active: els.matchActive.value,
      adminNote: els.matchNote.value.trim()
    });
    state.matchesLoaded = false;
    await loadMatches();
    showToast('매칭이 저장되었습니다.');
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(els.saveMatchButton, false);
  }
}
function rolePrefix() {
  return state.personRole === 'provider' ? 'P' : 'R';
}

function displayPersonNumber(id) {
  return String(id || '').trim().toUpperCase().replace(/^[PR]-?/, '');
}

function buildPersonId() {
  const digits = displayPersonNumber(els.personId.value).replace(/[^0-9]/g, '');
  return rolePrefix() + digits.padStart(3, '0');
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 10 && digits[0] !== '0') return '0' + digits;
  return digits;
}

function nextPersonNumber() {
  let max = 0;
  state.people.forEach((person) => {
    const id = String(person.id || '').toUpperCase();
    const digits = Number(id.replace(/^[PR]/, ''));
    if (!Number.isNaN(digits)) max = Math.max(max, digits);
  });
  return String(max + 1).padStart(3, '0');
}

function clearPersonForm() {
  els.personId.value = '';
  els.personName.value = '';
  els.personPhone.value = '';
  els.personStatus.value = 'A';
  els.personPin.value = '';
  els.personAddress.value = '';
  els.guardianName.value = '';
  els.guardianPhone.value = '';
  els.personNote.value = '';
  els.personId.disabled = false;
  els.personId.placeholder = nextPersonNumber();
}

function setPersonRole(role) {
  state.personRole = role;
  els.providerTypeButton.classList.toggle('active', role === 'provider');
  els.recipientTypeButton.classList.toggle('active', role === 'recipient');
  els.peopleListTitle.textContent = role === 'provider' ? '제공자 목록' : '수여자 목록';
  els.personIdPrefix.textContent = role === 'provider' ? 'P-' : 'R-';
  els.providerPinLabel.classList.toggle('hidden', role !== 'provider');
  els.recipientAddressLabel.classList.toggle('hidden', role !== 'recipient');
  els.guardianNameLabel.classList.toggle('hidden', role !== 'recipient');
  els.guardianPhoneLabel.classList.toggle('hidden', role !== 'recipient');
  state.people = [];
  state.matchProviders = [];
  state.matchRecipients = [];
  state.matches = [];
  state.peopleLoadedRole = '';
  state.matchesLoaded = false;
  renderPeople([]);
  renderMatches([]);
  clearPersonForm();
  if (state.adminPassword) loadPeople(role);
}

function filteredPeople() {
  const keyword = String(els.peopleSearch.value || '').trim().toLowerCase();
  if (!keyword) return state.people;
  return state.people.filter((person) => [person.id, person.name, person.phone, person.address, person.guardianName, person.guardianPhone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(keyword));
}

function renderPeople(people = []) {
  els.peopleList.innerHTML = '';
  if (people.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'person-card';
    empty.textContent = '등록된 사람이 없습니다.';
    els.peopleList.appendChild(empty);
    return;
  }
  people.forEach((person) => {
    const card = document.createElement('article');
    card.className = 'person-card';
    const statusText = person.status === 'A' ? '활성' : '비활성';
    const phone = normalizePhone(person.phone);
    card.innerHTML = `
      <div class="person-main">
        <span>${person.id}</span>
        <strong>${person.name || '-'}</strong>
        <em class="status-badge ${person.status === 'A' ? 'active' : 'inactive'}">${statusText}</em>
      </div>
      <div class="person-sub">
        ${phone ? `<span class="phone-row"><span class="phone-text">${phone}</span><a class="call-button" href="tel:${phone}" aria-label="전화 걸기">전화</a></span>` : '<span>전화번호 없음</span>'}
        <div class="person-actions"></div>
      </div>
    `;
    card.addEventListener('click', (event) => {
      if (event.target.closest('button, a')) return;
      fillPersonForm(person);
    });
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'mini-button';
    edit.textContent = '수정';
    edit.addEventListener('click', () => fillPersonForm(person));
    card.querySelector('.person-actions').appendChild(edit);
    els.peopleList.appendChild(card);
  });
}

async function loadPeople(role = state.personRole) {
  const requestRole = role;
  renderPeopleLoading();
  try {
    const data = await callApi('getAdminPeople', { role: requestRole });
    if (state.personRole !== requestRole) return;
    state.people = data.people || [];
    state.peopleLoadedRole = requestRole;
    els.personId.placeholder = nextPersonNumber();
    renderPeople(filteredPeople());
  } catch (error) {
    showToast(error.message);
  }
}

function fillPersonForm(person) {
  els.personId.value = displayPersonNumber(person.id || person.providerId || person.recipientId || '');
  els.personName.value = person.name || '';
  els.personPhone.value = normalizePhone(person.phone);
  els.personStatus.value = person.status || 'A';
  els.personPin.value = '';
  els.personAddress.value = person.address || '';
  els.guardianName.value = person.guardianName || '';
  els.guardianPhone.value = normalizePhone(person.guardianPhone);
  els.personNote.value = person.note || '';
  els.personId.disabled = true;
}

function personPayload() {
  return {
    role: state.personRole,
    id: buildPersonId(),
    name: els.personName.value.trim(),
    phone: normalizePhone(els.personPhone.value),
    status: els.personStatus.value,
    pin: els.personPin.value.trim(),
    address: els.personAddress.value.trim(),
    guardianName: els.guardianName.value.trim(),
    guardianPhone: normalizePhone(els.guardianPhone.value),
    note: els.personNote.value.trim()
  };
}

async function savePerson() {
  setBusy(els.savePersonButton, true, '저장 중...');
  try {
    await callApi('saveAdminPerson', personPayload());
    state.peopleLoadedRole = '';
    state.matchesLoaded = false;
    await loadPeople(state.personRole);
    loadFilterOptions().catch(() => {});
    clearPersonForm();
    showToast('저장되었습니다.');
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(els.savePersonButton, false);
  }
}

async function login() {
  if (!els.adminPassword.value.trim()) {
    showToast('관리자 비밀번호를 입력하세요.');
    return;
  }
  state.adminPassword = els.adminPassword.value.trim();
  setBusy(els.loginButton, true, '확인 중...');
  try {
    await callApi('adminLogin');
    openMain();
    await Promise.all([loadFilterOptions(), searchRecords()]);
    showToast('로그인되었습니다.');
  } catch (error) {
    state.adminPassword = '';
    showToast(error.message);
  } finally {
    setBusy(els.loginButton, false);
  }
}

function init() {
  els.dateFrom.value = todayText();
  els.dateTo.value = todayText();
  renderSummary({});
  renderRecords([]);
  setPersonRole('provider');
  els.peopleView.classList.add('hidden');
  els.matchesView.classList.add('hidden');
  clearMatchForm();
}

els.loginButton.addEventListener('click', login);
els.logoutButton.addEventListener('click', closeMain);
els.searchButton.addEventListener('click', searchRecords);
els.recordsTab.addEventListener('click', () => switchView('records'));
els.peopleTab.addEventListener('click', () => switchView('people'));
els.matchesTab.addEventListener('click', () => switchView('matches'));
els.providerTypeButton.addEventListener('click', () => setPersonRole('provider'));
els.recipientTypeButton.addEventListener('click', () => setPersonRole('recipient'));
els.savePersonButton.addEventListener('click', savePerson);
els.clearPersonButton.addEventListener('click', clearPersonForm);
els.matchProviderSelect.addEventListener('change', updateCurrentMatchBox);
els.saveMatchButton.addEventListener('click', saveMatch);
els.clearMatchButton.addEventListener('click', clearMatchForm);
els.peopleSearch.addEventListener('input', () => renderPeople(filteredPeople()));
els.toast.addEventListener('click', hideToast);

init();



























