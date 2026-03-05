// ===== App State =====
const tripData = {
  name: '',
  description: '',
  coverImage: null,
  startDate: '',
  endDate: '',
  profileName: '',
  profileImage: null,
  activities: [],
  memberCount: 1,
  budget: ''
};

let pageView = null;

const DEFAULT_TRIP_DESCRIPTION = 'ออกเดินทางไปสัมผัสประสบการณ์ใหม่ๆ ด้วยกัน! วางแผนทริปสนุกๆ พร้อมเพื่อนร่วมเดินทาง สร้างความทรงจำดีๆ ที่จะอยู่ในใจตลอดไป';

function backfillTripDescriptions() {
  const trips = JSON.parse(localStorage.getItem('votagex_trips') || '[]');
  let changed = false;
  trips.forEach(t => {
    if (!t.description) {
      t.description = DEFAULT_TRIP_DESCRIPTION;
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem('votagex_trips', JSON.stringify(trips));
  }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();

  // Backfill: add default description to existing trips that have none
  backfillTripDescriptions();

  const container = document.querySelector('.pageview');
  pageView = new PageView(container);

  // Tap outside to dismiss keyboard/focus
  document.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.closest('button')) {
      document.activeElement.blur();
    }
  });

  setupPage1();
  setupPage2();
  setupPage3();
  setupPage4();
  setupPage5();
  setupPage6();
  setupJoinFlow();
  setupCalendar();
  setupTripActionSheet();
  setupEditModal();
  setupJoinConfirmModal();

  // Auth gate (must be last)
  initAuthGate();
  setupLogoutSheet();
});

// ===== Page 1: Landing =====
function setupPage1() {
  document.getElementById('btn-create').addEventListener('click', () => {
    pageView.goTo(1);
  });

  document.getElementById('btn-join').addEventListener('click', () => {
    openJoinScreen();
  });
}

// ===== Join Trip Screen =====
const joinerData = { name: '', image: null };

function openJoinScreen() {
  const screen = document.getElementById('join-screen');
  const nameInput = document.getElementById('join-profile-name');
  const previewImg = document.getElementById('join-profile-preview');
  const uploadIcon = document.getElementById('join-upload-icon');
  const nextBtn = document.getElementById('join-next');

  // Reset to page 1
  document.getElementById('join-page-1').classList.add('active');
  document.getElementById('join-page-2').classList.remove('active');
  document.getElementById('join-profile-file').value = '';

  // Pre-fill from Google account or localStorage
  const savedName = localStorage.getItem('votagex_username') || '';
  const savedImage = localStorage.getItem('votagex_userimage') || '';

  nameInput.value = savedName;
  joinerData.name = savedName;
  nextBtn.disabled = !savedName;

  if (savedImage) {
    previewImg.src = savedImage;
    previewImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;';
    uploadIcon.style.display = 'none';
    joinerData.image = savedImage;
  } else {
    previewImg.style.cssText = 'display:none;';
    uploadIcon.style.display = '';
    joinerData.image = null;
  }

  screen.classList.add('active');
}

function closeJoinScreen() {
  document.getElementById('join-screen').classList.remove('active');
}

function setupJoinFlow() {
  const nameInput = document.getElementById('join-profile-name');
  const nextBtn = document.getElementById('join-next');
  const uploadArea = document.getElementById('join-profile-upload');
  const fileInput = document.getElementById('join-profile-file');
  const previewImg = document.getElementById('join-profile-preview');
  const uploadIcon = document.getElementById('join-upload-icon');
  const backBtn1 = document.getElementById('join-back-1');
  const backBtn2 = document.getElementById('join-back-2');

  // Enable next when name is filled
  nameInput.addEventListener('input', () => {
    nextBtn.disabled = !nameInput.value.trim();
  });

  // Profile photo upload
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        previewImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;';
        uploadIcon.style.display = 'none';
        joinerData.image = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Go to page 2 (trip cards)
  nextBtn.addEventListener('click', () => {
    joinerData.name = nameInput.value.trim();
    document.getElementById('join-page-1').classList.remove('active');
    document.getElementById('join-page-2').classList.add('active');
    loadTripCards();
  });

  // Back from page 1 → close join screen
  backBtn1.addEventListener('click', () => closeJoinScreen());

  // Back from page 2 → page 1
  backBtn2.addEventListener('click', () => {
    document.getElementById('join-page-2').classList.remove('active');
    document.getElementById('join-page-1').classList.add('active');
  });
}

function loadTripCards() {
  const gridEl = document.getElementById('trip-cards-grid');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  getTrips().then(trips => {
    if (trips.length === 0) {
      gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#a3a3a3;font-size:13px;padding:24px;">ยังไม่มีทริปที่สร้างไว้</div>';
      return;
    }
    gridEl.innerHTML = '';
    // Sort: joinable first, then expired/full
    trips.reverse();
    trips.sort((a, b) => {
      const aExpired = a.endDate ? new Date(a.endDate) < today : false;
      const aFull = (a.members || []).length >= (a.memberCount || 1);
      const bExpired = b.endDate ? new Date(b.endDate) < today : false;
      const bFull = (b.members || []).length >= (b.memberCount || 1);
      return (aExpired || aFull ? 1 : 0) - (bExpired || bFull ? 1 : 0);
    });

    trips.forEach(trip => {
      const isExpired = trip.endDate ? new Date(trip.endDate) < today : false;
      const currentMembers = (trip.members || []).length;
      const maxMembers = trip.memberCount || 1;
      const isFull = currentMembers >= maxMembers;

      const card = document.createElement('div');
      card.className = 'hp-other-card' + ((isExpired || isFull) ? ' disabled' : '');

      // Cover / flag
      let flagHtml;
      if (trip.coverImage) {
        flagHtml = `<img src="${trip.coverImage}" alt="">`;
      } else {
        flagHtml = `<svg class="flag-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
      }

      // Date text
      const dateText = trip.startDate && trip.endDate
        ? `${formatDateShort(trip.startDate)} - ${formatDateShort(trip.endDate)}`
        : '';

      // Avatars
      const members = trip.members || [];
      let avatarsHtml = '';
      const defaultAvatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
      const showMax = 3;

      if (members.length > 0) {
        members.slice(0, showMax).forEach(m => {
          if (m.image) {
            avatarsHtml += `<div class="hp-other-avatar"><img src="${m.image}" alt=""></div>`;
          } else {
            const initial = (m.name || 'U').charAt(0).toUpperCase();
            avatarsHtml += `<div class="hp-other-avatar">${initial}</div>`;
          }
        });
        if (members.length > showMax) {
          avatarsHtml += `<div class="hp-other-avatar extra">+${members.length - showMax}</div>`;
        }
      } else {
        const displayCount = Math.min(maxMembers, showMax);
        for (let i = 0; i < displayCount; i++) {
          avatarsHtml += `<div class="hp-other-avatar">${defaultAvatarSvg}</div>`;
        }
        if (maxMembers > showMax) {
          avatarsHtml += `<div class="hp-other-avatar extra">+${maxMembers - showMax}</div>`;
        }
      }

      // Join button
      let joinBtnHtml = '';
      if (isExpired) {
        joinBtnHtml = `<button class="hp-other-join-btn" disabled>สิ้นสุดแล้ว</button>`;
      } else if (isFull) {
        joinBtnHtml = `<button class="hp-other-join-btn" disabled>เต็มแล้ว (${currentMembers}/${maxMembers})</button>`;
      } else {
        joinBtnHtml = `<button class="hp-other-join-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> เข้าร่วม (${currentMembers}/${maxMembers})</button>`;
      }

      const showEditIcon = isTripOwner(trip) || isTripMember(trip);
      card.innerHTML = `
        <div class="hp-other-card-top">
          <div class="hp-other-flag">${flagHtml}</div>
          ${showEditIcon ? `<button class="hp-other-edit-btn" title="แก้ไข/ลบ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>` : ''}
        </div>
        <div class="hp-other-details">
          <div class="hp-other-name">${escapeHtml(trip.name || 'Trip')}</div>
          ${dateText ? `<div class="hp-other-date">${dateText}</div>` : ''}
          ${trip.description ? `<div class="hp-other-desc">${escapeHtml(trip.description)}</div>` : ''}
        </div>
        <div class="hp-other-avatars">${avatarsHtml}</div>
        ${joinBtnHtml}
      `;

      // Edit button → open action sheet (only if icon is shown)
      const editBtn = card.querySelector('.hp-other-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openTripActionSheet(trip, isTripOwner(trip));
        });
      }

      // Join button handler
      if (!isExpired && !isFull) {
        card.querySelector('.hp-other-join-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = 'กำลังเข้าร่วม...';

          joinTrip(trip.id, { name: joinerData.name, image: joinerData.image })
            .then(() => {
              closeJoinScreen();
              const joinedTrip = {
                ...trip,
                profileName: joinerData.name,
                profileImage: joinerData.image
              };
              showHomepage(joinedTrip);
            })
            .catch(err => {
              console.error('Error joining trip:', err);
              btn.disabled = false;
              btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> เข้าร่วม`;
            });
        });
      }

      gridEl.appendChild(card);
    });
  });
}

// ===== Trip Ownership Check =====
function isTripOwner(trip) {
  const currentUser = getCurrentUser();
  if (currentUser && trip.ownerUid) {
    return trip.ownerUid === currentUser.uid;
  }
  // Fallback for old trips without ownerUid: compare profileName
  const authUser = getStoredAuthUser();
  const userName = authUser ? authUser.displayName : (localStorage.getItem('votagex_username') || '');
  return trip.profileName && trip.profileName === userName;
}

// ===== Trip Action Bottom Sheet =====
let actionSheetTrip = null;

function isTripMember(trip) {
  const members = trip.members || [];
  const authUser = getStoredAuthUser();
  const userName = authUser ? authUser.displayName : (localStorage.getItem('votagex_username') || '');
  return members.some(m => m.name === userName);
}

function openTripActionSheet(trip, isOwner) {
  actionSheetTrip = trip;
  const modal = document.getElementById('trip-action-modal');
  const titleEl = document.getElementById('trip-action-title');
  const isMember = !isOwner && isTripMember(trip);

  // Show/hide buttons based on role
  modal.querySelectorAll('.owner-only').forEach(el => el.style.display = isOwner ? '' : 'none');
  modal.querySelectorAll('.member-only').forEach(el => el.style.display = isMember ? '' : 'none');
  titleEl.textContent = isOwner ? 'จัดการทริป' : 'ตัวเลือก';

  modal.classList.add('active');
}

function closeTripActionSheet() {
  document.getElementById('trip-action-modal').classList.remove('active');
  actionSheetTrip = null;
}

function setupTripActionSheet() {
  const modal = document.getElementById('trip-action-modal');
  const editBtn = document.getElementById('trip-action-edit');
  const deleteBtn = document.getElementById('trip-action-delete');
  const leaveBtn = document.getElementById('trip-action-leave');

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeTripActionSheet();
  });

  // Edit → open edit modal
  editBtn.addEventListener('click', () => {
    if (!actionSheetTrip) return;
    const trip = actionSheetTrip;
    closeTripActionSheet();
    openEditModal(trip);
  });

  // Delete → confirm and delete
  deleteBtn.addEventListener('click', () => {
    if (!actionSheetTrip) return;
    const tripName = actionSheetTrip.name || 'ทริปนี้';
    if (!confirm(`ต้องการลบ "${tripName}" หรือไม่?`)) return;

    const tripId = actionSheetTrip.id;
    closeTripActionSheet();

    deleteTrip(tripId)
      .then(() => {
        loadTripCards();
      })
      .catch(err => {
        console.error('Error deleting trip:', err);
        alert('เกิดข้อผิดพลาดในการลบ กรุณาลองอีกครั้ง');
      });
  });

  // Leave → delete trip from storage
  leaveBtn.addEventListener('click', () => {
    if (!actionSheetTrip) return;
    const tripName = actionSheetTrip.name || 'ทริปนี้';
    if (!confirm(`ต้องการออกจาก "${tripName}" หรือไม่?`)) return;

    const tripId = actionSheetTrip.id;

    closeTripActionSheet();

    // Close trip detail if open
    if (currentDetailTrip && currentDetailTrip.id === tripId) {
      closeTripDetail();
    }

    // Delete trip from storage
    if (tripId) {
      deleteTrip(tripId)
        .then(() => {
          loadTripCards();
        })
        .catch(err => {
          console.error('Error leaving trip:', err);
          alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        });
    }
  });
}

// Short date format for cards: "12-18 Jan 2026"
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ===== Update Travel Card on all pages =====
function updateTravelCards() {
  const title = tripData.name || 'Trip';
  const desc = tripData.description || 'Description';
  const dateText = (tripData.startDate && tripData.endDate)
    ? `${formatDateThai(tripData.startDate)} - ${formatDateThai(tripData.endDate)}`
    : '';
  const owner = tripData.profileName || '';

  // Page 2 card
  const titleP2 = document.getElementById('card-title-p2');
  const descP2 = document.getElementById('card-desc-p2');
  const datesP2 = document.getElementById('card-dates-p2');
  const ownerP2 = document.getElementById('card-owner-p2');
  if (titleP2) titleP2.textContent = title;
  if (descP2) descP2.textContent = desc;
  if (datesP2) datesP2.textContent = dateText;
  if (ownerP2) ownerP2.textContent = owner;

  // Page 3 card
  const titleP3 = document.getElementById('card-title-p3');
  const descP3 = document.getElementById('card-desc-p3');
  const datesP3 = document.getElementById('card-dates-p3');
  const ownerP3 = document.getElementById('card-owner-p3');
  if (titleP3) titleP3.textContent = title;
  if (descP3) descP3.textContent = desc;
  if (datesP3) datesP3.textContent = dateText;
  if (ownerP3) ownerP3.textContent = owner;

  // Page 4 card
  const titleP4 = document.getElementById('card-title-p4');
  const descP4 = document.getElementById('card-desc-p4');
  const datesP4 = document.getElementById('card-dates-p4');
  const ownerP4 = document.getElementById('card-owner-p4');
  if (titleP4) titleP4.textContent = title;
  if (descP4) descP4.textContent = desc;
  if (datesP4) datesP4.textContent = dateText;
  if (ownerP4) ownerP4.textContent = owner;

  // Page 5 card
  const titleP5 = document.getElementById('card-title-p5');
  const descP5 = document.getElementById('card-desc-p5');
  const datesP5 = document.getElementById('card-dates-p5');
  const ownerP5 = document.getElementById('card-owner-p5');
  if (titleP5) titleP5.textContent = title;
  if (descP5) descP5.textContent = desc;
  if (datesP5) datesP5.textContent = dateText;
  if (ownerP5) ownerP5.textContent = owner;
}

// ===== Page 2: Trip Name & Description =====
function setupPage2() {
  const nameInput = document.getElementById('trip-name');
  const descInput = document.getElementById('trip-desc');
  const budgetInput = document.getElementById('trip-budget');
  const nextBtn = document.getElementById('page2-next');
  const backBtn = document.getElementById('page2-back');
  const coverUpload = document.getElementById('cover-upload');
  const coverFile = document.getElementById('cover-file');
  const coverPreview = document.getElementById('cover-preview');

  nextBtn.disabled = true;

  nameInput.addEventListener('input', () => {
    nextBtn.disabled = !nameInput.value.trim();
    tripData.name = nameInput.value.trim();
    updateTravelCards();
  });

  descInput.addEventListener('input', () => {
    tripData.description = descInput.value.trim();
    updateTravelCards();
  });

  setupCommaInput(budgetInput);
  budgetInput.addEventListener('input', () => {
    tripData.budget = stripCommas(budgetInput.value.trim());
  });

  coverUpload.addEventListener('click', () => coverFile.click());

  coverFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        coverPreview.src = ev.target.result;
        coverPreview.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;';
        coverUpload.classList.add('has-image');
        tripData.coverImage = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  nextBtn.addEventListener('click', () => {
    tripData.name = nameInput.value.trim();
    tripData.description = descInput.value.trim();
    tripData.budget = stripCommas(budgetInput.value.trim());
    updateTravelCards();
    pageView.goTo(3);
  });

  backBtn.addEventListener('click', () => pageView.goTo(1));
}

// ===== Page 3: Select Dates =====
function formatDateThai(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${d.getDate()} , ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function setupPage3() {
  const nextBtn = document.getElementById('page3-next');
  const backBtn = document.getElementById('page3-back');

  nextBtn.disabled = !(tripData.startDate && tripData.endDate);

  // Open calendar when clicking date cards or buttons
  document.querySelectorAll('.page3-layout .date-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', openCalendar);
  });

  nextBtn.addEventListener('click', () => {
    updateTravelCards();
    pageView.goTo(4);
  });

  backBtn.addEventListener('click', () => pageView.goTo(2));
}

// ===== Calendar Date Range Picker =====
let calBlockedRanges = []; // [{start: Date, end: Date, name: string}]

const calState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  startDate: null,
  endDate: null
};

const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateThaiShort(date) {
  if (!date) return '--';
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function openCalendar() {
  // Initialize from existing trip data
  if (tripData.startDate) {
    const d = new Date(tripData.startDate);
    calState.year = d.getFullYear();
    calState.month = d.getMonth();
    calState.startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    const now = new Date();
    calState.year = now.getFullYear();
    calState.month = now.getMonth();
    calState.startDate = null;
  }

  if (tripData.endDate) {
    const d = new Date(tripData.endDate);
    calState.endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    calState.endDate = null;
  }

  // Hide overlap warning
  const warningEl = document.getElementById('cal-overlap-warning');
  if (warningEl) warningEl.style.display = 'none';

  // Load blocked date ranges from joined trips
  const userName = tripData.profileName || '';
  calBlockedRanges = [];
  getTrips().then(trips => {
    trips.forEach(t => {
      if (!t.startDate || !t.endDate) return;
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      if (!isCreator && !isMember) return;
      const s = new Date(t.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(t.endDate); e.setHours(0, 0, 0, 0);
      calBlockedRanges.push({ start: s, end: e, name: t.name || '' });
    });
    renderCalendar();
    updateCalSummary();
  });

  document.getElementById('calendar-modal').classList.add('active');
}

function closeCalendar() {
  document.getElementById('calendar-modal').classList.remove('active');

  // Apply selected dates
  if (calState.startDate) {
    tripData.startDate = formatISODate(calState.startDate);
    document.getElementById('start-date-display').textContent = formatDateThai(tripData.startDate);
  }
  if (calState.endDate) {
    tripData.endDate = formatISODate(calState.endDate);
    document.getElementById('end-date-display').textContent = formatDateThai(tripData.endDate);
  }

  // Update next button
  const nextBtn = document.getElementById('page3-next');
  nextBtn.disabled = !(tripData.startDate && tripData.endDate);

  updateTravelCards();
}

function renderCalendar() {
  document.getElementById('cal-month-name').textContent = CAL_MONTHS[calState.month];
  document.getElementById('cal-year-num').textContent = calState.year;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(calState.year, calState.month, 1);
  const lastDay = new Date(calState.year, calState.month + 1, 0);

  // Monday=0 ... Sunday=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = lastDay.getDate();
  const prevLastDay = new Date(calState.year, calState.month, 0).getDate();

  let colIndex = 0;

  // Previous month trailing days
  for (let i = startDow - 1; i >= 0; i--) {
    const dayNum = prevLastDay - i;
    const date = new Date(calState.year, calState.month - 1, dayNum);
    grid.appendChild(createCalCell(dayNum, date, true, colIndex));
    colIndex++;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calState.year, calState.month, d);
    grid.appendChild(createCalCell(d, date, false, colIndex % 7));
    colIndex++;
  }

  // Next month leading days - always fill to 42 cells (6 rows)
  const totalCells = grid.children.length;
  const target = 42;
  for (let d = 1; totalCells + d - 1 < target; d++) {
    const date = new Date(calState.year, calState.month + 1, d);
    grid.appendChild(createCalCell(d, date, true, colIndex % 7));
    colIndex++;
  }
}

function isDateBlocked(dateNorm) {
  return calBlockedRanges.some(r => dateNorm >= r.start.getTime() && dateNorm <= r.end.getTime());
}

function doesRangeOverlapBlocked(s, e) {
  const sT = s.getTime();
  const eT = e.getTime();
  return calBlockedRanges.find(r => sT <= r.end.getTime() && eT >= r.start.getTime());
}

function createCalCell(dayNum, date, isOtherMonth, col) {
  const cell = document.createElement('div');
  cell.className = 'cal-cell';

  const day = document.createElement('div');
  day.className = 'cal-day';
  day.textContent = dayNum;

  if (isOtherMonth) day.classList.add('other-month');

  // Today marker
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (dateNorm === todayNorm) day.classList.add('today');

  // Check if date is blocked by existing trip
  const blocked = isDateBlocked(dateNorm);
  if (blocked) {
    day.classList.add('blocked');
    cell.classList.add('blocked-range');
  }

  // Range highlighting
  const start = calState.startDate;
  const end = calState.endDate;
  const startT = start ? start.getTime() : null;
  const endT = end ? end.getTime() : null;
  let isInRange = false;

  if (startT !== null && dateNorm === startT) {
    day.classList.add('selected');
    if (endT !== null && startT !== endT) cell.classList.add('range-start');
  }

  if (endT !== null && dateNorm === endT) {
    day.classList.add('selected');
    if (startT !== null && startT !== endT) cell.classList.add('range-end');
  }

  if (startT !== null && endT !== null && dateNorm > startT && dateNorm < endT) {
    cell.classList.add('in-range');
    isInRange = true;
  }

  // Row boundary rounding
  if (isInRange && col === 0) cell.classList.add('row-start');
  if (isInRange && col === 6) cell.classList.add('row-end');

  // Click handler — skip if blocked
  if (!blocked) {
    day.addEventListener('click', () => {
      const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const warningEl = document.getElementById('cal-overlap-warning');

      if (!calState.startDate || (calState.startDate && calState.endDate)) {
        // First click or reset
        calState.startDate = clickedDate;
        calState.endDate = null;
        if (warningEl) warningEl.style.display = 'none';
      } else {
        // Second click — determine start and end
        let newStart = calState.startDate;
        let newEnd = clickedDate;
        if (clickedDate.getTime() < calState.startDate.getTime()) {
          newStart = clickedDate;
          newEnd = calState.startDate;
        }

        // Check if range overlaps with any blocked trip
        const overlap = doesRangeOverlapBlocked(newStart, newEnd);
        if (overlap) {
          if (warningEl) {
            warningEl.innerHTML = `คุณมีทริป "${escapeHtml(overlap.name)}" อยู่แล้ว ไม่สามารถสร้างทริปที่วันทับกันได้`;
            warningEl.style.display = 'block';
          }
          // Reset selection
          calState.startDate = null;
          calState.endDate = null;
          renderCalendar();
          updateCalSummary();
          return;
        }

        if (warningEl) warningEl.style.display = 'none';

        if (clickedDate.getTime() > calState.startDate.getTime()) {
          calState.endDate = clickedDate;
        } else if (clickedDate.getTime() < calState.startDate.getTime()) {
          calState.startDate = clickedDate;
        } else {
          calState.endDate = clickedDate;
        }
      }

      renderCalendar();
      updateCalSummary();
    });
  }

  cell.appendChild(day);
  return cell;
}

function updateCalSummary() {
  document.getElementById('cal-start-text').textContent =
    calState.startDate ? formatDateThaiShort(calState.startDate) : '--';
  document.getElementById('cal-end-text').textContent =
    calState.endDate ? formatDateThaiShort(calState.endDate) : '--';

  // Enable confirm button only when both dates are selected
  const confirmBtn = document.getElementById('cal-confirm');
  confirmBtn.disabled = !(calState.startDate && calState.endDate);
}

function setupCalendar() {
  // Month navigation
  document.getElementById('cal-prev').addEventListener('click', () => {
    calState.month--;
    if (calState.month < 0) { calState.month = 11; calState.year--; }
    renderCalendar();
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    calState.month++;
    if (calState.month > 11) { calState.month = 0; calState.year++; }
    renderCalendar();
  });

  // Confirm button
  document.getElementById('cal-confirm').addEventListener('click', () => {
    closeCalendar();
  });

  // Close on overlay click
  document.getElementById('calendar-modal').addEventListener('click', (e) => {
    if (e.target.id === 'calendar-modal') closeCalendar();
  });
}

// ===== Page 4: Profile Setup =====
function setupPage4() {
  const uploadArea = document.getElementById('profile-upload');
  const fileInput = document.getElementById('profile-file');
  const nameInput = document.getElementById('profile-name');
  const nextBtn = document.getElementById('page4-next');
  const backBtn = document.getElementById('page4-back');
  const previewImg = document.getElementById('profile-preview');
  const uploadIcon = document.getElementById('upload-icon');

  nextBtn.disabled = true;

  nameInput.addEventListener('input', () => {
    nextBtn.disabled = !nameInput.value.trim();
    tripData.profileName = nameInput.value.trim();
    updateTravelCards();
  });

  uploadArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        previewImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;';
        if (uploadIcon) uploadIcon.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });

  nextBtn.addEventListener('click', () => {
    tripData.profileName = nameInput.value.trim();
    updateTravelCards();

    const file = fileInput.files[0];
    if (file) {
      uploadProfileImage(file).then(url => {
        tripData.profileImage = url;
      });
    }
    pageView.goTo(2);
  });

  backBtn.addEventListener('click', () => {
    if (isCreateTripModal) {
      closeCreateTripModal();
    } else {
      pageView.goTo(0);
    }
  });
}

// ===== Currency Conversion =====
const CURRENCY_RATES = {
  USD: 0.028,
  EUR: 0.026,
  JPY: 4.3,
  GBP: 0.022,
  KRW: 39,
  CNY: 0.2,
  AUD: 0.044,
  SGD: 0.038
};

function convertCurrency(thb, currency) {
  if (!currency || !CURRENCY_RATES[currency]) return 0;
  return (thb * CURRENCY_RATES[currency]).toFixed(2);
}

function convertToTHB(foreignAmount, currency) {
  if (!currency || !CURRENCY_RATES[currency]) return 0;
  return foreignAmount / CURRENCY_RATES[currency];
}

// Format number with commas: 10000 → "10,000"
function formatNumberComma(num) {
  if (!num && num !== 0) return '';
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// Strip commas from formatted string: "10,000" → "10000"
function stripCommas(str) {
  return str.replace(/,/g, '');
}

// Setup a text input to auto-format with commas as user types
function setupCommaInput(input) {
  input.addEventListener('input', () => {
    const raw = stripCommas(input.value);
    if (raw === '' || raw === '-') return;
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const cursor = input.selectionStart;
    const beforeLen = input.value.length;
    input.value = formatNumberComma(raw);
    const afterLen = input.value.length;
    input.setSelectionRange(cursor + (afterLen - beforeLen), cursor + (afterLen - beforeLen));
  });
}

// ===== Category Config =====
const CATEGORY_CONFIG = {
  place: {
    label: 'สถานที่',
    icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M5.21372 9.64003L4.44914 12.6446C4.21958 13.5467 5.18457 14.2964 6.04401 13.8837L7.33254 13.2648C7.75313 13.0628 8.24703 13.0628 8.66762 13.2648L9.95615 13.8837C10.8156 14.2964 11.7806 13.5467 11.551 12.6446L10.7864 9.64003C10.3995 9.91597 9.95322 10.1191 9.46839 10.2293C8.50262 10.4487 7.49754 10.4487 6.53177 10.2293C6.04695 10.1191 5.60065 9.91597 5.21372 9.64003Z" fill="#363853" fill-opacity="0.15"/><path d="M3.83665 4.77482C4.15034 3.47964 5.19449 2.46836 6.53177 2.16455C7.49754 1.94515 8.50263 1.94515 9.46839 2.16455C10.8057 2.46836 11.8498 3.47965 12.1635 4.77482C12.39 5.71018 12.39 6.68362 12.1635 7.61898C11.8498 8.91416 10.8057 9.92544 9.46839 10.2293C8.50262 10.4487 7.49754 10.4487 6.53177 10.2293C5.19449 9.92545 4.15034 8.91416 3.83665 7.61899C3.61011 6.68363 3.61011 5.71018 3.83665 4.77482Z" fill="#363853" fill-opacity="0.15"/><path d="M9.46839 10.2293C9.95322 10.1191 10.3995 9.91597 10.7864 9.64003L11.551 12.6446C11.7806 13.5467 10.8156 14.2964 9.95615 13.8837L8.66762 13.2648C8.24703 13.0628 7.75313 13.0628 7.33254 13.2648L6.04401 13.8837C5.18457 14.2964 4.21958 13.5467 4.44914 12.6446L5.21372 9.64003C5.60065 9.91597 6.04695 10.1191 6.53177 10.2293M9.46839 10.2293C8.50262 10.4487 7.49754 10.4487 6.53177 10.2293M9.46839 10.2293C10.8057 9.92544 11.8498 8.91416 12.1635 7.61898C12.39 6.68362 12.39 5.71018 12.1635 4.77482C11.8498 3.47965 10.8057 2.46836 9.46839 2.16455C8.50263 1.94515 7.49754 1.94515 6.53177 2.16455C5.19449 2.46836 4.15034 3.47964 3.83665 4.77482C3.61011 5.71018 3.61011 6.68363 3.83665 7.61899C4.15034 8.91416 5.19449 9.92545 6.53177 10.2293" stroke="#0A296B"/></svg>',
    illust: 'assets/cat-place.png',
    hasTime: true,
    hasAmount: true,
    hasNote: true,
    hasDate: false,
    defaultDesc: 'เยี่ยมชมสถานที่ท่องเที่ยวที่น่าสนใจ สัมผัสบรรยากาศและวัฒนธรรมท้องถิ่น พร้อมเก็บภาพความทรงจำดีๆ'
  },
  food: {
    label: 'อาหาร',
    icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M9.12387 2.20443C10.5517 2.42259 11.658 3.57079 11.8261 5.00911L11.8816 5.48462C11.9092 5.72059 11.9306 5.95696 11.9459 6.19348C12.0404 7.65395 11.9011 9.12042 11.5333 10.5371C11.4812 10.7378 11.4245 10.9375 11.3632 11.1361L11.2672 11.4471C10.8828 12.6926 9.83639 13.6183 8.55596 13.8456C7.39646 14.0515 6.20991 14.0515 5.05041 13.8456L4.96103 13.8297C3.73548 13.6122 2.73395 12.7262 2.36601 11.534C1.72116 9.44463 1.51919 7.24314 1.77308 5.07087L1.79724 4.86422C1.95534 3.51147 2.99577 2.43158 4.33866 2.22641L4.84904 2.14843C6.14432 1.95052 7.46204 1.95052 8.75732 2.14843L9.12387 2.20443Z" fill="#363853" fill-opacity="0.15"/><path d="M4.84904 2.14843L4.77352 1.65416V1.65416L4.84904 2.14843ZM8.75732 2.14843L8.83284 1.65416L8.75732 2.14843ZM8.55596 13.8456L8.46856 13.3533L8.55596 13.8456ZM5.05041 13.8456L5.1378 13.3533L5.1378 13.3533L5.05041 13.8456ZM2.36601 11.534L1.88825 11.6815L2.36601 11.534ZM1.77308 5.07087L2.2697 5.12892L1.77308 5.07087ZM11.8816 5.48462L12.3783 5.42657V5.42657L11.8816 5.48462ZM11.3632 11.1361L10.8854 10.9886V10.9886L11.3632 11.1361ZM1.79724 4.86422L1.30062 4.80618L1.79724 4.86422ZM4.33866 2.22641L4.41418 2.72067V2.72067L4.33866 2.22641ZM4.96103 13.8298L4.87363 14.3221H4.87363L4.96103 13.8298ZM11.2672 11.4471L11.745 11.5945V11.5945L11.2672 11.4471ZM11.8261 5.00911L11.3294 5.06715V5.06715L11.8261 5.00911ZM9.12387 2.20443L9.04836 2.6987L9.12387 2.20443ZM12.1833 10.5371V10.0371V10.5371ZM14.2762 7.86056L13.7873 7.96533V7.96534L14.2762 7.86056ZM14.2836 7.89492L14.7725 7.79014L14.7725 7.79014L14.2836 7.89492ZM14.2836 8.83566L13.7947 8.73089V8.73089L14.2836 8.83566ZM12.2183 6.19348V5.69348V6.19348ZM11.5333 10.5371L11.0493 10.4114L11.5333 10.5371ZM11.9459 6.19348L11.447 6.22575L11.9459 6.19348ZM11.8261 5.00911L11.3294 5.06715L11.385 5.54266L11.8816 5.48462L12.3783 5.42657L12.3227 4.95107L11.8261 5.00911ZM11.3632 11.1361L10.8854 10.9886L10.7894 11.2996L11.2672 11.4471L11.745 11.5945L11.8409 11.2835L11.3632 11.1361ZM1.77308 5.07087L2.2697 5.12892L2.29386 4.92226L1.79724 4.86422L1.30062 4.80618L1.27646 5.01283L1.77308 5.07087ZM5.05041 13.8456L5.1378 13.3533L5.04842 13.3374L4.96103 13.8298L4.87363 14.3221L4.96301 14.3379L5.05041 13.8456ZM4.33866 2.22641L4.41418 2.72067L4.92456 2.64269L4.84904 2.14843L4.77352 1.65416L4.26315 1.73214L4.33866 2.22641ZM8.75732 2.14843L8.68181 2.64269L9.04836 2.6987L9.12387 2.20443L9.19939 1.71017L8.83284 1.65416L8.75732 2.14843ZM4.84904 2.14843L4.92456 2.64269C6.16979 2.45244 7.43658 2.45244 8.68181 2.64269L8.75732 2.14843L8.83284 1.65416C7.4875 1.44861 6.11886 1.44861 4.77352 1.65416L4.84904 2.14843ZM8.55596 13.8456L8.46856 13.3533C7.36687 13.5489 6.23949 13.5489 5.1378 13.3533L5.05041 13.8456L4.96301 14.3379C6.18032 14.554 7.42604 14.554 8.64336 14.3379L8.55596 13.8456ZM2.36601 11.534L2.84377 11.3866C2.21943 9.36364 2.02388 7.23213 2.2697 5.12892L1.77308 5.07087L1.27646 5.01283C1.0145 7.25415 1.22289 9.52563 1.88825 11.6815L2.36601 11.534ZM1.79724 4.86422L2.29386 4.92226C2.42592 3.79234 3.29467 2.89172 4.41418 2.72067L4.33866 2.22641L4.26315 1.73214C2.69687 1.97145 1.48476 3.23061 1.30062 4.80618L1.79724 4.86422ZM2.36601 11.534L1.88825 11.6815C2.31126 13.0521 3.46308 14.0716 4.87363 14.3221L4.96103 13.8298L5.04843 13.3374C4.00787 13.1527 3.15663 12.4002 2.84377 11.3866L2.36601 11.534ZM11.2672 11.4471L10.7894 11.2996C10.4601 12.3667 9.564 13.1588 8.46856 13.3533L8.55596 13.8456L8.64336 14.3379C10.1088 14.0778 11.3055 13.0185 11.745 11.5945L11.2672 11.4471ZM11.8261 5.00911L12.3227 4.95107C12.1285 3.28993 10.8506 1.96246 9.19939 1.71017L9.12387 2.20443L9.04836 2.6987C10.2528 2.88273 11.1874 3.85166 11.3294 5.06715L11.8261 5.00911ZM12.1833 10.5371V10.0371H11.8573V10.5371V11.0371H12.1833V10.5371ZM14.2762 7.86056L13.7873 7.96534L13.7947 7.99969L14.2836 7.89492L14.7725 7.79014L14.7651 7.75578L14.2762 7.86056ZM14.2836 7.89492L13.7947 7.99969C13.8463 8.24067 13.8463 8.48991 13.7947 8.73089L14.2836 8.83566L14.7725 8.94044C14.8537 8.56133 14.8537 8.16925 14.7725 7.79014L14.2836 7.89492ZM12.1833 10.5371V11.0371C13.4324 11.0371 14.5105 10.1627 14.7725 8.94044L14.2836 8.83566L13.7947 8.73089C13.6312 9.49377 12.9592 10.0371 12.1833 10.0371V10.5371ZM12.2183 6.19348V6.69348C12.9738 6.69348 13.6281 7.2225 13.7873 7.96533L14.2762 7.86056L14.7651 7.75578C14.5075 6.5536 13.447 5.69348 12.2183 5.69348V6.19348ZM11.5333 10.5371L11.0493 10.4114C10.9991 10.6048 10.9445 10.7973 10.8854 10.9886L11.3632 11.1361L11.8409 11.2835C11.9044 11.0777 11.9632 10.8708 12.0172 10.6628L11.5333 10.5371ZM11.8573 10.5371V10.0371H11.5333V10.5371V11.0371H11.8573V10.5371ZM11.8816 5.48462L11.385 5.54266C11.4116 5.77005 11.4322 5.99783 11.447 6.22575L11.9459 6.19348L12.4449 6.16121C12.4291 5.91608 12.4068 5.67112 12.3783 5.42657L11.8816 5.48462ZM11.9459 6.19348L11.447 6.22575C11.538 7.63312 11.4038 9.04628 11.0493 10.4114L11.5333 10.5371L12.0172 10.6628C12.3985 9.19456 12.5428 7.67477 12.4449 6.16121L11.9459 6.19348ZM12.2183 6.19348V5.69348H11.9459V6.19348V6.69348H12.2183V6.19348Z" fill="#0A296B"/><path d="M4 7.6665V8.17579C4 9.15613 4.22825 10.123 4.66667 10.9998" stroke="#0A296B" stroke-linecap="round"/></svg>',
    illust: 'assets/cat-food.png',
    hasTime: true,
    hasAmount: true,
    hasNote: true,
    hasDate: false,
    defaultDesc: 'ลิ้มลองอาหารท้องถิ่นที่ขึ้นชื่อ สัมผัสรสชาติเป็นเอกลักษณ์ของแต่ละร้าน พร้อมบรรยากาศดีๆ'
  },
  shopping: {
    label: 'ช็อปปิ้ง',
    icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M3.48643 5.80908C3.85262 4.30886 5.01193 3.15129 6.47954 2.82047L6.77768 2.75326C7.89293 2.50187 9.0478 2.50187 10.1631 2.75326L10.4612 2.82047C11.9288 3.15129 13.0881 4.30887 13.4543 5.80909C13.7373 6.9687 13.7373 8.1824 13.4543 9.34201C13.0881 10.8422 11.9288 11.9998 10.4612 12.3306L10.163 12.3978C9.0478 12.6492 7.89293 12.6492 6.77768 12.3978L6.47954 12.3306C5.01194 11.9998 3.85262 10.8422 3.48643 9.34201C3.20338 8.1824 3.20338 6.96869 3.48643 5.80908Z" fill="#363853" fill-opacity="0.15"/><path d="M3.48643 9.34201L3.97217 9.22345L3.48643 9.34201ZM3.48643 5.80908L3.00069 5.69052L3.48643 5.80908ZM13.4543 5.80909L13.94 5.69052V5.69052L13.4543 5.80909ZM13.4543 9.34201L13.94 9.46057L13.4543 9.34201ZM10.163 12.3978L10.0531 11.9101H10.0531L10.163 12.3978ZM6.77768 12.3978L6.66773 12.8856H6.66773L6.77768 12.3978ZM6.77768 2.75326L6.88763 3.24102V3.24102L6.77768 2.75326ZM10.1631 2.75326L10.273 2.2655V2.2655L10.1631 2.75326ZM6.47954 12.3306L6.58949 11.8429H6.58949L6.47954 12.3306ZM10.4612 12.3306L10.5711 12.8184H10.5711L10.4612 12.3306ZM10.4612 2.82047L10.3512 3.30823V3.30823L10.4612 2.82047ZM6.47954 2.82047L6.36959 2.33271V2.33271L6.47954 2.82047ZM4.04869 3.74071L3.55686 3.83072V3.83072L4.04869 3.74071ZM3.64644 4.32023C3.69615 4.59186 3.95665 4.77176 4.22828 4.72205C4.49992 4.67234 4.67982 4.41184 4.6301 4.14021L4.13827 4.23022L3.64644 4.32023ZM2.42113 1.50778C2.14928 1.45925 1.88957 1.64028 1.84103 1.91213C1.7925 2.18397 1.97353 2.44369 2.24538 2.49222L2.33325 2L2.42113 1.50778ZM6.56723 12.3446L6.11387 12.5554C6.16379 12.6628 6.18317 12.7835 6.16888 12.9031L6.66534 12.9624L7.16181 13.0218C7.19806 12.7186 7.14934 12.4105 7.02059 12.1337L6.56723 12.3446ZM6.66534 12.9624L6.16888 12.9031C6.15459 13.0226 6.10751 13.1338 6.03499 13.224L6.42463 13.5373L6.81428 13.8507C7.00558 13.6128 7.12555 13.325 7.16181 13.0218L6.66534 12.9624ZM6.42463 13.5373L6.03499 13.224C5.96257 13.3141 5.86823 13.379 5.76429 13.4133L5.92098 13.8881L6.07766 14.3629C6.36767 14.2672 6.62287 14.0887 6.81428 13.8507L6.42463 13.5373ZM5.92098 13.8881L5.76429 13.4133C5.66049 13.4475 5.54981 13.4504 5.44469 13.4217L5.31313 13.9041L5.18158 14.3865C5.47635 14.4669 5.78752 14.4586 6.07766 14.3629L5.92098 13.8881ZM5.31313 13.9041L5.44469 13.4217C5.33945 13.393 5.24235 13.3334 5.16586 13.2476L4.79269 13.5804L4.41953 13.9132C4.62283 14.1411 4.88693 14.3061 5.18158 14.3865L5.31313 13.9041ZM4.79269 13.5804L5.16586 13.2476C5.08925 13.1617 5.03679 13.0534 5.0166 12.9349L4.52371 13.0189L4.03081 13.1029C4.08213 13.404 4.21635 13.6853 4.41953 13.9132L4.79269 13.5804ZM4.52371 13.0189L5.0166 12.9349C4.99641 12.8164 5.0097 12.6946 5.05434 12.5845L4.59096 12.3967L4.12758 12.2089C4.01289 12.4918 3.97951 12.8019 4.03081 13.1029L4.52371 13.0189ZM4.59096 12.3967L5.05434 12.5845C5.09894 12.4745 5.17232 12.3821 5.26381 12.3168L4.97325 11.9099L4.6827 11.5029C4.43425 11.6803 4.24231 11.9258 4.12758 12.2089L4.59096 12.3967ZM11.9483 12.036L11.6186 12.4119C11.7043 12.487 11.7689 12.5875 11.8028 12.7025L12.2824 12.5612L12.762 12.4199C12.6754 12.126 12.5081 11.862 12.2779 11.6601L11.9483 12.036ZM12.2824 12.5612L11.8028 12.7025C11.8367 12.8175 11.8378 12.9406 11.8059 13.0563L12.288 13.189L12.77 13.3217C12.8513 13.0265 12.8486 12.7137 12.762 12.4199L12.2824 12.5612ZM12.288 13.189L11.8059 13.0563C11.7741 13.172 11.7111 13.2738 11.6267 13.3506L11.9632 13.7204L12.2997 14.0902C12.5262 13.8842 12.6887 13.6171 12.77 13.3217L12.288 13.189ZM11.9632 13.7204L11.6267 13.3506C11.5424 13.4273 11.4402 13.4761 11.3327 13.4932L11.4111 13.987L11.4895 14.4808C11.7921 14.4327 12.0731 14.2964 12.2997 14.0902L11.9632 13.7204ZM11.4111 13.987L11.3327 13.4932C11.2253 13.5102 11.115 13.4953 11.0145 13.4494L10.8066 13.9041L10.5988 14.3589C10.8775 14.4863 11.1869 14.5288 11.4895 14.4808L11.4111 13.987ZM10.8066 13.9041L11.0145 13.4494C10.9138 13.4033 10.8258 13.3275 10.7627 13.2288L10.3415 13.4982L9.92025 13.7676C10.0853 14.0256 10.3203 14.2316 10.5988 14.3589L10.8066 13.9041ZM10.3415 13.4982L10.7627 13.2288C10.6995 13.1299 10.6644 13.0131 10.663 12.8922L10.1631 12.8978L9.66308 12.9034C9.66652 13.2097 9.75528 13.5096 9.92025 13.7676L10.3415 13.4982ZM10.1631 12.8978L10.663 12.8922C10.6617 12.7713 10.6941 12.6535 10.7552 12.553L10.3279 12.2933L9.90068 12.0336C9.74164 12.2953 9.65964 12.5971 9.66308 12.9034L10.1631 12.8978ZM6.47954 2.82047L6.58949 3.30823L6.88763 3.24102L6.77768 2.75326L6.66773 2.2655L6.36959 2.33271L6.47954 2.82047ZM10.1631 2.75326L10.0531 3.24102L10.3512 3.30823L10.4612 2.82047L10.5711 2.33271L10.273 2.2655L10.1631 2.75326ZM10.4612 12.3306L10.3512 11.8429L10.0531 11.9101L10.163 12.3978L10.273 12.8856L10.5711 12.8184L10.4612 12.3306ZM6.77768 12.3978L6.88763 11.9101L6.58949 11.8429L6.47954 12.3306L6.36959 12.8184L6.66773 12.8856L6.77768 12.3978ZM3.48643 9.34201L3.97217 9.22345C3.70813 8.14173 3.70813 7.00936 3.97217 5.92765L3.48643 5.80908L3.00069 5.69052C2.69863 6.92803 2.69863 8.22307 3.00069 9.46058L3.48643 9.34201ZM13.4543 5.80909L12.9686 5.92765C13.2326 7.00936 13.2326 8.14173 12.9686 9.22344L13.4543 9.34201L13.94 9.46057C14.2421 8.22306 14.2421 6.92803 13.94 5.69052L13.4543 5.80909ZM10.163 12.3978L10.0531 11.9101C9.01024 12.1451 7.93049 12.1451 6.88763 11.9101L6.77768 12.3978L6.66773 12.8856C7.85537 13.1533 9.08536 13.1533 10.273 12.8856L10.163 12.3978ZM6.77768 2.75326L6.88763 3.24102C7.93049 3.00595 9.01024 3.00595 10.0531 3.24102L10.1631 2.75326L10.273 2.2655C9.08536 1.99779 7.85537 1.99779 6.66773 2.2655L6.77768 2.75326ZM6.47954 12.3306L6.58949 11.8429C5.31323 11.5552 4.29486 10.5455 3.97217 9.22345L3.48643 9.34201L3.00069 9.46058C3.41038 11.139 4.71064 12.4444 6.36959 12.8184L6.47954 12.3306ZM10.4612 12.3306L10.5711 12.8184C12.2301 12.4444 13.5303 11.139 13.94 9.46057L13.4543 9.34201L12.9686 9.22344C12.6459 10.5454 11.6275 11.5552 10.3512 11.8429L10.4612 12.3306ZM10.4612 2.82047L10.3512 3.30823C11.6275 3.59592 12.6459 4.60565 12.9686 5.92765L13.4543 5.80909L13.94 5.69052C13.5303 4.01209 12.2301 2.70666 10.5711 2.33271L10.4612 2.82047ZM6.47954 2.82047L6.36959 2.33271C4.71064 2.70666 3.41038 4.01208 3.00069 5.69052L3.48643 5.80908L3.97217 5.92765C4.29486 4.60564 5.31323 3.59592 6.58949 3.30823L6.47954 2.82047ZM3.77727 9.80576V10.3058H13.1635V9.80576V9.30576H3.77727V9.80576ZM4.04869 3.74071L3.55686 3.83072L3.64644 4.32023L4.13827 4.23022L4.6301 4.14021L4.54052 3.6507L4.04869 3.74071ZM2.33325 2L2.24538 2.49222C2.90094 2.60925 3.4298 3.13648 3.55686 3.83072L4.04869 3.74071L4.54052 3.6507C4.34114 2.56127 3.50249 1.70083 2.42113 1.50778L2.33325 2Z" fill="#0A296B"/><path d="M9.66675 4.6665L9.69396 4.67104C10.8324 4.86077 11.6667 5.84573 11.6667 6.99984" stroke="#0A296B" stroke-linecap="round"/></svg>',
    illust: 'assets/cat-shopping.png',
    hasTime: true,
    hasAmount: true,
    hasNote: true,
    hasDate: false,
    defaultDesc: 'เดินเลือกซื้อสินค้าและของฝากจากร้านค้าท้องถิ่น ค้นหาไอเท็มที่ถูกใจในราคาคุ้มค่า'
  },
  hotel: {
    label: 'ที่พัก',
    icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M12.86 9.75825V6.47935V6.33835L9.88562 3.34282C8.99673 2.44761 8.55228 2 8 2C7.44772 2 7.00327 2.44761 6.11438 3.34282L3.13999 6.33837V6.47935V9.75825C3.13999 11.6881 4.45894 13.364 6.32449 13.8047C7.42653 14.0651 8.57345 14.0651 9.6755 13.8047C11.541 13.364 12.86 11.6881 12.86 9.75825Z" fill="#363853" fill-opacity="0.15"/><path d="M9.6755 13.8047L9.79045 14.2913V14.2913L9.6755 13.8047ZM6.32449 13.8047L6.20953 14.2913V14.2913L6.32449 13.8047ZM9.88562 3.34282L9.53081 3.69512L9.53081 3.69512L9.88562 3.34282ZM6.11438 3.34282L6.46919 3.69512L6.46919 3.69512L6.11438 3.34282ZM6.47895 12.2135L6.97037 12.3058V12.3058L6.47895 12.2135ZM6.49184 12.1448L6.00042 12.0526V12.0526L6.49184 12.1448ZM9.50816 12.1448L9.01674 12.2371L9.01674 12.2371L9.50816 12.1448ZM9.52105 12.2135L10.0125 12.1213L10.0125 12.1213L9.52105 12.2135ZM9.32785 13.7013L9.77933 13.9161L9.77933 13.9161L9.32785 13.7013ZM8.79852 13.65C8.67986 13.8993 8.7858 14.1977 9.03514 14.3163C9.28449 14.435 9.58282 14.3291 9.70148 14.0797L9.25 13.8649L8.79852 13.65ZM6.67215 13.7013L6.22067 13.9161L6.22067 13.9161L6.67215 13.7013ZM6.29852 14.0797C6.41718 14.3291 6.71551 14.435 6.96486 14.3163C7.21421 14.1977 7.32015 13.8993 7.20148 13.65L6.75 13.8649L6.29852 14.0797ZM7.57404 10.9617L7.70772 11.4435H7.70772L7.57404 10.9617ZM8.42596 10.9617L8.29228 11.4435L8.29228 11.4435L8.42596 10.9617ZM1.6452 7.13417C1.45063 7.33012 1.45175 7.6467 1.6477 7.84127C1.84365 8.03584 2.16024 8.03472 2.3548 7.83877L2 7.48647L1.6452 7.13417ZM12.86 6.33835L13.2148 5.98605V5.98605L12.86 6.33835ZM13.6452 7.83877C13.8398 8.03472 14.1563 8.03584 14.3523 7.84127C14.5483 7.6467 14.5494 7.33012 14.3548 7.13417L14 7.48647L13.6452 7.83877ZM12.86 6.47935H12.36V9.75825H12.86H13.36V6.47935H12.86ZM3.13999 9.75825H3.63999V6.47935H3.13999H2.63999V9.75825H3.13999ZM9.6755 13.8047L9.56054 13.3181C8.53409 13.5606 7.46589 13.5606 6.43944 13.3181L6.32449 13.8047L6.20953 14.2913C7.38718 14.5696 8.61281 14.5696 9.79045 14.2913L9.6755 13.8047ZM6.32449 13.8047L6.43944 13.3181C4.80173 12.9313 3.63999 11.4585 3.63999 9.75825H3.13999H2.63999C2.63999 11.9177 4.11614 13.7968 6.20953 14.2913L6.32449 13.8047ZM9.6755 13.8047L9.79045 14.2913C11.8838 13.7968 13.36 11.9177 13.36 9.75825H12.86H12.36C12.36 11.4585 11.1983 12.9313 9.56054 13.3181L9.6755 13.8047ZM9.88562 3.34282L10.2404 2.99052C9.80596 2.55297 9.44537 2.18831 9.12123 1.93923C8.7857 1.68141 8.43051 1.5 8 1.5V2V2.5C8.12177 2.5 8.26495 2.54239 8.51193 2.73218C8.77031 2.93071 9.07639 3.23746 9.53081 3.69512L9.88562 3.34282ZM6.11438 3.34282L6.46919 3.69512C6.92361 3.23746 7.22969 2.93071 7.48807 2.73218C7.73505 2.54239 7.87823 2.5 8 2.5V2V1.5C7.56949 1.5 7.2143 1.68141 6.87877 1.93923C6.55463 2.18831 6.19404 2.55297 5.75958 2.99052L6.11438 3.34282ZM6.47895 12.2135L6.97037 12.3058L6.98326 12.2371L6.49184 12.1448L6.00042 12.0526L5.98753 12.1213L6.47895 12.2135ZM9.50816 12.1448L9.01674 12.2371L9.02963 12.3058L9.52105 12.2135L10.0125 12.1213L9.99958 12.0526L9.50816 12.1448ZM9.32785 13.7013L8.87637 13.4864L8.79852 13.65L9.25 13.8649L9.70148 14.0797L9.77933 13.9161L9.32785 13.7013ZM6.67215 13.7013L6.22067 13.9161L6.29852 14.0797L6.75 13.8649L7.20148 13.65L7.12363 13.4864L6.67215 13.7013ZM9.52105 12.2135L9.02963 12.3058C9.10473 12.7059 9.05095 13.1196 8.87637 13.4864L9.32785 13.7013L9.77933 13.9161C10.045 13.3579 10.1266 12.7292 10.0125 12.1213L9.52105 12.2135ZM6.47895 12.2135L5.98753 12.1213C5.87343 12.7292 5.95503 13.3579 6.22067 13.9161L6.67215 13.7013L7.12363 13.4864C6.94905 13.1196 6.89527 12.7059 6.97037 12.3058L6.47895 12.2135ZM7.57404 10.9617L7.70772 11.4435C7.89903 11.3904 8.10097 11.3904 8.29228 11.4435L8.42596 10.9617L8.55964 10.4799C8.19339 10.3783 7.80661 10.3783 7.44036 10.4799L7.57404 10.9617ZM9.50816 12.1448L9.99958 12.0526C9.85768 11.2966 9.30028 10.6854 8.55964 10.4799L8.42596 10.9617L8.29228 11.4435C8.66235 11.5462 8.94464 11.853 9.01674 12.2371L9.50816 12.1448ZM6.49184 12.1448L6.98326 12.2371C7.05536 11.853 7.33765 11.5462 7.70772 11.4435L7.57404 10.9617L7.44036 10.4799C6.69972 10.6854 6.14232 11.2966 6.00042 12.0526L6.49184 12.1448ZM6.11438 3.34282L5.75958 2.99052L2.78519 5.98607L3.13999 6.33837L3.4948 6.69066L6.46919 3.69512L6.11438 3.34282ZM3.13999 6.33837L2.78519 5.98607L1.6452 7.13417L2 7.48647L2.3548 7.83877L3.4948 6.69066L3.13999 6.33837ZM3.13999 6.47935H3.63999V6.33837H3.13999H2.63999V6.47935H3.13999ZM9.88562 3.34282L9.53081 3.69512L12.5052 6.69065L12.86 6.33835L13.2148 5.98605L10.2404 2.99052L9.88562 3.34282ZM12.86 6.33835L12.5052 6.69065L13.6452 7.83877L14 7.48647L14.3548 7.13417L13.2148 5.98605L12.86 6.33835ZM12.86 6.47935H13.36V6.33835H12.86H12.36V6.47935H12.86Z" fill="#0A296B"/></svg>',
    illust: null,
    hasTime: true,
    hasAmount: true,
    hasNote: true,
    hasDate: true,
    defaultDesc: 'เช็คอินที่พักเพื่อพักผ่อนหลังวันที่เต็มไปด้วยกิจกรรม เตรียมพร้อมสำหรับวันถัดไป'
  },
  travel: {
    label: 'เดินทาง',
    icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M5.1114 12.8694C4.16742 12.3251 3.69544 12.0529 3.34032 11.6799C2.93586 11.2551 2.63919 10.7351 2.47628 10.1655C2.33325 9.66536 2.33325 9.11024 2.33325 8C2.33325 6.88976 2.33325 6.33464 2.47628 5.8345C2.63919 5.26487 2.93586 4.74488 3.34032 4.32006C3.69544 3.94707 4.16742 3.67492 5.1114 3.13061L5.22177 3.06697C6.23516 2.48264 6.74185 2.19047 7.27911 2.07599C7.75457 1.97467 8.24527 1.97467 8.72073 2.07599C9.25799 2.19047 9.76468 2.48264 10.7781 3.06697L10.8884 3.13061C11.8324 3.67492 12.3044 3.94707 12.6595 4.32006C13.064 4.74488 13.3606 5.26487 13.5236 5.8345C13.6666 6.33464 13.6666 6.88976 13.6666 8C13.6666 9.11024 13.6666 9.66536 13.5236 10.1655C13.3607 10.7351 13.064 11.2551 12.6595 11.6799C12.3044 12.0529 11.8324 12.3251 10.8884 12.8694L10.7781 12.933C9.76468 13.5174 9.25799 13.8095 8.72074 13.924C8.24527 14.0253 7.75457 14.0253 7.27911 13.924C6.74185 13.8095 6.23516 13.5174 5.22177 12.933L5.1114 12.8694Z" fill="#363853" fill-opacity="0.15"/><path d="M10.7781 12.933L10.5283 12.4999L10.5283 12.4999L10.7781 12.933ZM8.72074 13.924L8.61653 13.435L8.72074 13.924ZM5.22177 12.933L4.97201 13.3662L4.97201 13.3662L5.22177 12.933ZM7.27911 13.924L7.38331 13.435V13.435L7.27911 13.924ZM13.5236 10.1655L13.0428 10.028L13.5236 10.1655ZM10.8884 12.8694L11.1382 13.3025L11.1382 13.3025L10.8884 12.8694ZM12.6595 11.6799L12.2974 11.3352V11.3352L12.6595 11.6799ZM10.8884 3.13061L10.6387 3.56376L10.6387 3.56376L10.8884 3.13061ZM12.6595 4.32006L12.2974 4.66484V4.66484L12.6595 4.32006ZM13.5236 5.8345L13.0428 5.97197L13.5236 5.8345ZM5.22177 3.06697L5.47153 3.50012V3.50012L5.22177 3.06697ZM7.27911 2.07599L7.1749 1.58697L7.27911 2.07599ZM10.7781 3.06697L11.0278 2.63382L11.0278 2.63382L10.7781 3.06697ZM8.72073 2.07599L8.82494 1.58697L8.72073 2.07599ZM2.47628 5.8345L2.95701 5.97197L2.47628 5.8345ZM5.1114 3.13061L4.86164 2.69746V2.69746L5.1114 3.13061ZM3.34032 4.32006L3.70244 4.66483L3.34032 4.32006ZM2.47628 10.1655L1.99556 10.303L2.47628 10.1655ZM5.1114 12.8694L5.36116 12.4362L5.36116 12.4362L5.1114 12.8694ZM3.34032 11.6799L2.97819 12.0247L3.34032 11.6799ZM5.1114 3.13061L5.36116 3.56376L5.47153 3.50012L5.22177 3.06697L4.97201 2.63382L4.86164 2.69746L5.1114 3.13061ZM10.7781 3.06697L10.5283 3.50012L10.6387 3.56376L10.8884 3.13061L11.1382 2.69746L11.0278 2.63382L10.7781 3.06697ZM10.8884 12.8694L10.6387 12.4362L10.5283 12.4999L10.7781 12.933L11.0278 13.3662L11.1382 13.3025L10.8884 12.8694ZM5.22177 12.933L5.47154 12.4999L5.36116 12.4362L5.1114 12.8694L4.86164 13.3025L4.97201 13.3662L5.22177 12.933ZM10.7781 12.933L10.5283 12.4999C9.48571 13.1011 9.05825 13.3409 8.61653 13.435L8.72074 13.924L8.82494 14.413C9.45774 14.2782 10.0437 13.9337 11.0278 13.3662L10.7781 12.933ZM5.22177 12.933L4.97201 13.3662C5.95618 13.9337 6.54211 14.2782 7.1749 14.413L7.27911 13.924L7.38331 13.435C6.94159 13.3409 6.51413 13.1011 5.47153 12.4999L5.22177 12.933ZM8.72074 13.924L8.61653 13.435C8.20977 13.5217 7.79007 13.5217 7.38331 13.435L7.27911 13.924L7.1749 14.413C7.71906 14.529 8.28078 14.529 8.82494 14.413L8.72074 13.924ZM13.6666 8H13.1666C13.1666 9.14013 13.162 9.6113 13.0428 10.028L13.5236 10.1655L14.0043 10.303C14.1712 9.71942 14.1666 9.08036 14.1666 8H13.6666ZM10.8884 12.8694L11.1382 13.3025C12.0558 12.7734 12.6049 12.4624 13.0216 12.0247L12.6595 11.6799L12.2974 11.3352C12.0039 11.6435 11.609 11.8767 10.6387 12.4362L10.8884 12.8694ZM13.5236 10.1655L13.0428 10.028C12.9019 10.5208 12.6456 10.9695 12.2974 11.3352L12.6595 11.6799L13.0216 12.0247C13.4824 11.5408 13.8194 10.9495 14.0043 10.303L13.5236 10.1655ZM10.8884 3.13061L10.6387 3.56376C11.609 4.12326 12.0039 4.35652 12.2974 4.66484L12.6595 4.32006L13.0216 3.97529C12.6049 3.53762 12.0558 3.22657 11.1382 2.69746L10.8884 3.13061ZM13.6666 8H14.1666C14.1666 6.91964 14.1712 6.28058 14.0043 5.69702L13.5236 5.8345L13.0428 5.97197C13.162 6.3887 13.1666 6.85988 13.1666 8H13.6666ZM12.6595 4.32006L12.2974 4.66484C12.6456 5.03053 12.9019 5.4792 13.0428 5.97197L13.5236 5.8345L14.0043 5.69702C13.8194 5.05054 13.4824 4.45922 13.0216 3.97529L12.6595 4.32006ZM5.22177 3.06697L5.47153 3.50012C6.51413 2.89894 6.94159 2.65913 7.38331 2.56501L7.27911 2.07599L7.1749 1.58697C6.5421 1.72181 5.95618 2.06633 4.97201 2.63382L5.22177 3.06697ZM10.7781 3.06697L11.0278 2.63382C10.0437 2.06633 9.45773 1.72181 8.82494 1.58697L8.72073 2.07599L8.61653 2.56501C9.05825 2.65913 9.48571 2.89894 10.5283 3.50012L10.7781 3.06697ZM7.27911 2.07599L7.38331 2.56501C7.79007 2.47833 8.20977 2.47833 8.61653 2.56501L8.72073 2.07599L8.82494 1.58697C8.28078 1.47101 7.71906 1.47101 7.1749 1.58697L7.27911 2.07599ZM2.33325 8H2.83325C2.83325 6.85988 2.83784 6.3887 2.95701 5.97197L2.47628 5.8345L1.99556 5.69702C1.82867 6.28058 1.83325 6.91964 1.83325 8L2.33325 8ZM5.1114 3.13061L4.86164 2.69746C3.94401 3.22657 3.39489 3.53762 2.97819 3.97529L3.34032 4.32006L3.70244 4.66483C3.99598 4.35652 4.39084 4.12326 5.36116 3.56376L5.1114 3.13061ZM2.47628 5.8345L2.95701 5.97197C3.09794 5.4792 3.35426 5.03053 3.70244 4.66483L3.34032 4.32006L2.97819 3.97529C2.51746 4.45922 2.18044 5.05054 1.99556 5.69702L2.47628 5.8345ZM2.33325 8L1.83325 8C1.83325 9.08036 1.82867 9.71942 1.99556 10.303L2.47628 10.1655L2.95701 10.028C2.83784 9.6113 2.83325 9.14012 2.83325 8H2.33325ZM5.1114 12.8694L5.36116 12.4362C4.39084 11.8767 3.99598 11.6435 3.70244 11.3352L3.34032 11.6799L2.97819 12.0247C3.3949 12.4624 3.94401 12.7734 4.86164 13.3025L5.1114 12.8694ZM2.47628 10.1655L1.99556 10.303C2.18044 10.9495 2.51746 11.5408 2.97819 12.0247L3.34032 11.6799L3.70244 11.3352C3.35426 10.9695 3.09794 10.5208 2.95701 10.028L2.47628 10.1655ZM7.99992 9.81526V9.31526C7.30966 9.31526 6.72908 8.73815 6.72908 8H6.22908H5.72908C5.72908 9.26693 6.73416 10.3153 7.99992 10.3153V9.81526ZM9.77075 8H9.27075C9.27075 8.73815 8.69017 9.31526 7.99992 9.31526V9.81526V10.3153C9.26567 10.3153 10.2708 9.26693 10.2708 8H9.77075ZM7.99992 6.18474V6.68474C8.69017 6.68474 9.27075 7.26185 9.27075 8H9.77075H10.2708C10.2708 6.73307 9.26567 5.68474 7.99992 5.68474V6.18474ZM7.99992 6.18474V5.68474C6.73416 5.68474 5.72908 6.73307 5.72908 8H6.22908H6.72908C6.72908 7.26185 7.30966 6.68474 7.99992 6.68474V6.18474Z" fill="#0A296B"/></svg>',
    illust: 'assets/cat-travel.png',
    hasTime: false,
    hasAmount: true,
    hasNote: true,
    hasDate: false,
    defaultDesc: 'เดินทางไปยังจุดหมายปลายทางถัดไป เพลิดเพลินกับวิวทิวทัศน์ระหว่างทาง'
  },
  other: {
    label: 'อื่นๆ',
    icon: '<svg viewBox="0 0 16 16" fill="none"><path d="M3.33333 6.6665C2.6 6.6665 2 7.2665 2 7.99984C2 8.73317 2.6 9.33317 3.33333 9.33317C4.06667 9.33317 4.66667 8.73317 4.66667 7.99984C4.66667 7.2665 4.06667 6.6665 3.33333 6.6665Z" fill="#363853" fill-opacity="0.15" stroke="#0A296B"/><path d="M12.6666 6.6665C11.9333 6.6665 11.3333 7.2665 11.3333 7.99984C11.3333 8.73317 11.9333 9.33317 12.6666 9.33317C13.3999 9.33317 13.9999 8.73317 13.9999 7.99984C13.9999 7.2665 13.3999 6.6665 12.6666 6.6665Z" fill="#363853" fill-opacity="0.15" stroke="#0A296B"/><path d="M8.00008 6.6665C7.26675 6.6665 6.66675 7.2665 6.66675 7.99984C6.66675 8.73317 7.26675 9.33317 8.00008 9.33317C8.73341 9.33317 9.33341 8.73317 9.33341 7.99984C9.33341 7.2665 8.73341 6.6665 8.00008 6.6665Z" fill="#363853" fill-opacity="0.15" stroke="#0A296B"/></svg>',
    illust: null,
    hasTime: false,
    hasAmount: true,
    hasNote: true,
    hasDate: false,
    defaultDesc: 'กิจกรรมเพิ่มเติมที่ช่วยเติมเต็มประสบการณ์การท่องเที่ยว สร้างความทรงจำดีๆ ร่วมกัน'
  }
};

// ===== Page 5: Activities =====
let selectedCategory = 'place';

function getTripDays() {
  if (!tripData.startDate || !tripData.endDate) return [];
  const days = [];
  const start = new Date(tripData.startDate);
  const end = new Date(tripData.endDate);
  const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  let dayNum = 1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const label = `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
    days.push({ dayNum, date: dateStr, label });
    dayNum++;
  }
  return days;
}

// Hotel helpers: check if activity belongs to a date and calculate per-night cost
function activityMatchesDate(activity, dateStr) {
  if (activity.category === 'hotel' && activity.checkIn && activity.checkOut) {
    return dateStr >= activity.checkIn && dateStr < activity.checkOut;
  }
  return activity.tripDay === dateStr;
}

function getHotelNights(activity) {
  if (activity.category !== 'hotel' || !activity.checkIn || !activity.checkOut) return 0;
  const checkIn = new Date(activity.checkIn);
  const checkOut = new Date(activity.checkOut);
  return Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
}

function getActivityAmountForDay(activity) {
  const amount = parseFloat(activity.amount) || 0;
  const nights = getHotelNights(activity);
  if (nights > 0) return amount / nights;
  return amount;
}

function renderModalFields() {
  const container = document.getElementById('modal-dynamic-fields');
  const cfg = CATEGORY_CONFIG[selectedCategory];
  let html = '';

  // Day selector based on trip dates (hidden for hotel — hotel uses check-in/check-out)
  const tripDays = getTripDays();
  if (tripDays.length > 0 && !cfg.hasDate) {
    html += `
      <div class="modal-section-card">
        <span class="modal-section-label">เลือกวัน</span>
        <div class="modal-day-selector" id="day-selector">
          ${tripDays.map(d => `
            <button type="button" class="day-chip" data-date="${d.date}">
              <span class="day-chip-num">Day ${d.dayNum}</span>
              <span class="day-chip-date">${d.label}</span>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  // Time field (skip for hotel — hotel has its own time inside date section)
  if (cfg.hasTime && !cfg.hasDate) {
    html += `
      <div class="modal-section-card">
        <span class="modal-section-label">เวลา</span>
        <div class="modal-time-row">
          <span class="modal-time-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" fill="#363853" fill-opacity=".15" stroke="#0A296B" stroke-width="1.5"/><path d="M12 8v5l3 3" stroke="#0A296B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <input type="time" id="activity-time" placeholder="เลือกเวลา">
        </div>
      </div>`;
  }

  // Hotel date fields — use trip day chips instead of calendar
  if (cfg.hasDate && tripDays.length > 0) {
    html += `
      <div class="modal-section-card">
        <span class="modal-section-label">เวลาเช็คอิน</span>
        <div class="modal-time-row">
          <span class="modal-time-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" fill="#363853" fill-opacity=".15" stroke="#0A296B" stroke-width="1.5"/><path d="M12 8v5l3 3" stroke="#0A296B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <input type="time" id="activity-time" placeholder="เลือกเวลา">
        </div>
      </div>
      <div class="modal-section-card">
        <span class="modal-section-label">เช็คอิน</span>
        <div class="modal-day-selector" id="checkin-day-selector">
          ${tripDays.map(d => `
            <button type="button" class="day-chip" data-date="${d.date}">
              <span class="day-chip-num">Day ${d.dayNum}</span>
              <span class="day-chip-date">${d.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="modal-section-card">
        <span class="modal-section-label">เช็คเอาท์</span>
        <div class="modal-day-selector" id="checkout-day-selector">
          ${tripDays.map(d => `
            <button type="button" class="day-chip" data-date="${d.date}">
              <span class="day-chip-num">Day ${d.dayNum}</span>
              <span class="day-chip-date">${d.label}</span>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  // Amount with currency conversion
  if (cfg.hasAmount) {
    html += `
      <div class="modal-section-card">
        <span class="modal-section-label">ระบุจำนวนค่าใช้จ่าย (ไม่จำเป็น)</span>
        <div class="modal-expense-details">
          <div class="modal-expense-row">
            <input type="text" id="activity-amount" placeholder="เงินที่ใช้ไป" inputmode="decimal">
            <span>THB (฿)</span>
          </div>
          <div class="modal-swap-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 10.0909H19L13.1604 5" stroke="#363853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 13.9091L5 13.9091L10.8396 19" stroke="#363853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="modal-expense-row">
            <input type="text" id="activity-foreign-amount" placeholder="เงินที่แปลง" inputmode="decimal">
            <select id="activity-currency">
              <option value="JPY">JPY (¥)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="KRW">KRW (₩)</option>
              <option value="CNY">CNY (¥)</option>
              <option value="AUD">AUD ($)</option>
              <option value="SGD">SGD ($)</option>
            </select>
          </div>
        </div>
      </div>`;
  }

  // Travel link field
  html += `
    <div class="modal-section-card">
      <span class="modal-section-label">ลิงก์การเดินทาง</span>
      <input type="url" id="activity-travel-link" class="modal-section-input" placeholder="วางลิงก์ Google Maps หรือลิงก์อื่นๆ">
    </div>`;

  container.innerHTML = html;

  // Setup day selector chip clicks
  const daySelector = document.getElementById('day-selector');
  if (daySelector) {
    daySelector.addEventListener('click', (e) => {
      const chip = e.target.closest('.day-chip');
      if (!chip) return;
      daySelector.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  }

  // Setup currency conversion listener (bidirectional)
  const amountInput = document.getElementById('activity-amount');
  const foreignInput = document.getElementById('activity-foreign-amount');
  const currencySelect = document.getElementById('activity-currency');
  if (amountInput && foreignInput && currencySelect) {
    let updatingFrom = null; // prevent infinite loop
    setupCommaInput(amountInput);
    setupCommaInput(foreignInput);

    const updateForeignFromTHB = () => {
      if (updatingFrom === 'foreign') return;
      updatingFrom = 'thb';
      const thb = parseFloat(stripCommas(amountInput.value)) || 0;
      const cur = currencySelect.value;
      if (cur && thb > 0) {
        foreignInput.value = formatNumberComma(convertCurrency(thb, cur));
      } else {
        foreignInput.value = '';
      }
      updatingFrom = null;
    };

    const updateTHBFromForeign = () => {
      if (updatingFrom === 'thb') return;
      updatingFrom = 'foreign';
      const foreign = parseFloat(stripCommas(foreignInput.value)) || 0;
      const cur = currencySelect.value;
      if (cur && foreign > 0) {
        const thb = convertToTHB(foreign, cur);
        amountInput.value = formatNumberComma(Math.round(thb));
      } else {
        amountInput.value = '';
      }
      updatingFrom = null;
    };

    amountInput.addEventListener('input', updateForeignFromTHB);
    foreignInput.addEventListener('input', updateTHBFromForeign);
    currencySelect.addEventListener('change', updateForeignFromTHB);
  }

  // Setup hotel day chip selectors
  if (cfg.hasDate) {
    const checkinSelector = document.getElementById('checkin-day-selector');
    const checkoutSelector = document.getElementById('checkout-day-selector');
    if (checkinSelector) {
      checkinSelector.addEventListener('click', (e) => {
        const chip = e.target.closest('.day-chip');
        if (!chip) return;
        checkinSelector.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    }
    if (checkoutSelector) {
      checkoutSelector.addEventListener('click', (e) => {
        const chip = e.target.closest('.day-chip');
        if (!chip) return;
        checkoutSelector.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    }
  }
}

function setupPage5() {
  const addBtn = document.getElementById('add-activity-btn');
  const listEl = document.getElementById('activity-list');
  const nextBtn = document.getElementById('page5-next');
  const backBtn = document.getElementById('page5-back');

  // Modal elements
  const modal = document.getElementById('activity-modal');
  const modalAdd = document.getElementById('modal-add');
  const modalCancel = document.getElementById('modal-cancel');
  const chipGroup = document.getElementById('category-chips');

  // Inject CATEGORY_CONFIG icons into chip buttons
  chipGroup.querySelectorAll('.chip').forEach(chip => {
    const cat = chip.dataset.cat;
    const cfg = CATEGORY_CONFIG[cat];
    if (cfg && cfg.icon) chip.insertAdjacentHTML('afterbegin', cfg.icon);
  });

  // Detail modal
  const detailModal = document.getElementById('activity-detail-modal');
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) detailModal.classList.remove('active');
  });

  // Category chip selection
  chipGroup.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chipGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedCategory = chip.dataset.cat;
    renderModalFields();
  });

  addBtn.addEventListener('click', () => {
    editingActivityIndex = -1;
    selectedCategory = 'place';
    chipGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipGroup.querySelector('[data-cat="place"]').classList.add('active');
    renderModalFields();
    const actName = document.getElementById('activity-name');
    actName.value = '';
    document.getElementById('activity-description').value = '';
    modal.classList.add('active');
    setTimeout(() => actName.focus(), 350);
  });

  modalCancel.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  modalAdd.addEventListener('click', () => {
    const actName = document.getElementById('activity-name');
    if (!actName.value.trim()) {
      actName.style.boxShadow = '0 0 0 2px #EF4444';
      actName.focus();
      return;
    }
    actName.style.boxShadow = '';

    const activity = {
      name: actName.value.trim(),
      category: selectedCategory,
      time: '',
      amount: 0,
      targetCurrency: '',
      description: '',
      travelLink: '',
      checkIn: '',
      checkOut: '',
      tripDay: ''
    };

    // Read selected day
    const activeDay = document.querySelector('#day-selector .day-chip.active');
    if (activeDay) activity.tripDay = activeDay.dataset.date;

    // Read dynamic fields
    const timeEl = document.getElementById('activity-time');
    if (timeEl) activity.time = timeEl.value || '';

    const amountEl = document.getElementById('activity-amount');
    if (amountEl) activity.amount = parseFloat(stripCommas(amountEl.value)) || 0;

    const currencyEl = document.getElementById('activity-currency');
    if (currencyEl) activity.targetCurrency = currencyEl.value || '';

    const descEl = document.getElementById('activity-description');
    if (descEl) activity.description = descEl.value.trim();

    const linkEl = document.getElementById('activity-travel-link');
    if (linkEl) activity.travelLink = linkEl.value.trim();

    const activeCheckin = document.querySelector('#checkin-day-selector .day-chip.active');
    if (activeCheckin) activity.checkIn = activeCheckin.dataset.date;

    const activeCheckout = document.querySelector('#checkout-day-selector .day-chip.active');
    if (activeCheckout) activity.checkOut = activeCheckout.dataset.date;

    if (editingActivityIndex >= 0) {
      tripData.activities[editingActivityIndex] = activity;
    } else {
      tripData.activities.push(activity);
    }
    renderActivities(listEl);
    modal.classList.remove('active');
    editingActivityIndex = -1;
  });

  nextBtn.addEventListener('click', () => pageView.goTo(5));
  backBtn.addEventListener('click', () => pageView.goTo(3));
}

// ===== Activity Detail View =====
let editingActivityIndex = -1;

function openActivityDetail(index) {
  const act = tripData.activities[index];
  if (!act) return;
  const cfg = CATEGORY_CONFIG[act.category] || CATEGORY_CONFIG.other;
  const detailModal = document.getElementById('activity-detail-modal');
  const content = document.getElementById('activity-detail-content');
  const listEl = document.getElementById('activity-list');

  // Discovery/compass icon for travel link
  const travelIcon = '<svg viewBox="0 0 16 16" fill="none"><path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96695 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7647C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#2463EB" fill-opacity="0.15" stroke="#2463EB"/><path d="M6.78788 7.53066C6.9234 7.19185 7.19185 6.9234 7.53066 6.78788L8.88914 6.24448C9.43334 6.0268 9.9734 6.56685 9.75571 7.11106L9.21232 8.46954C9.0768 8.80834 8.80834 9.0768 8.46954 9.21232L7.11106 9.75571C6.56686 9.9734 6.0268 9.43334 6.24448 8.88914L6.78788 7.53066Z" fill="#2463EB" fill-opacity="0.15" stroke="#2463EB" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Edit icon
  const editIcon = '<svg viewBox="0 0 16 16" fill="none"><path d="M8.92421 4.85382L11.3178 2.4602C11.6125 2.16554 12.0121 2 12.4289 2C13.2966 2 14.0001 2.70346 14.0001 3.57123C14.0001 3.98794 13.8345 4.38759 13.5399 4.68225L11.1463 7.07587C10.1057 8.11647 8.80182 8.8547 7.37412 9.21162L6.91149 9.32728C6.76734 9.36332 6.63677 9.23274 6.6728 9.08859L6.78846 8.62596C7.14539 7.19827 7.88361 5.89442 8.92421 4.85382Z" fill="#363853" fill-opacity="0.15"/><path d="M13.6297 4.59239C12.5187 4.96274 11.0373 3.48137 11.4077 2.37034M11.3178 2.4602L8.92421 4.85382C7.88361 5.89442 7.14539 7.19827 6.78846 8.62596L6.6728 9.08859C6.63677 9.23274 6.76734 9.36332 6.91149 9.32728L7.37412 9.21162C8.80182 8.8547 10.1057 8.11647 11.1463 7.07587L13.5399 4.68225C13.8345 4.38759 14.0001 3.98794 14.0001 3.57123C14.0001 2.70346 13.2966 2 12.4289 2C12.0121 2 11.6125 2.16554 11.3178 2.4602Z" stroke="#363853"/><path d="M8 2C7.31778 2 6.63556 2.07842 5.96696 2.23525C4.11534 2.66958 2.66958 4.11534 2.23525 5.96695C1.92158 7.30417 1.92158 8.69583 2.23525 10.033C2.66958 11.8847 4.11534 13.3304 5.96696 13.7648C7.30417 14.0784 8.69583 14.0784 10.033 13.7648C11.8847 13.3304 13.3304 11.8847 13.7648 10.033C13.9216 9.36443 14 8.68221 14 7.99998" stroke="#363853" stroke-linecap="round"/></svg>';

  // Delete icon
  const deleteIcon = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7.03H19V12.18C19 13.75 18.78 15.32 18.34 16.83C17.74 18.92 16.01 20.47 13.88 20.83L13.72 20.86C12.58 21.05 11.42 21.05 10.28 20.86L10.12 20.83C8 20.47 6.26 18.92 5.66 16.83C5.22 15.32 5 13.75 5 12.18V7.03Z" fill="#E62E05" fill-opacity="0.15"/><path d="M3 7.03H21" stroke="#E62E05" stroke-linecap="round"/><path d="M5 7.03V12.18C5 13.75 5.22 15.32 5.66 16.83C6.26 18.92 8 20.47 10.12 20.83L10.28 20.86C11.42 21.05 12.58 21.05 13.72 20.86L13.88 20.83C16.01 20.47 17.74 18.92 18.34 16.83C18.78 15.32 19 13.75 19 12.18V7.03" stroke="#E62E05" stroke-linecap="round"/><path d="M8 7.03C8 5.8 8.85 3.5 12 3.5C15.15 3.5 16 5.8 16 7.03" stroke="#E62E05" stroke-linecap="round"/><path d="M10 12V16M14 12V16" stroke="#E62E05" stroke-linecap="round"/></svg>';

  // Clock icon for time display
  const clockIcon = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" fill="#363853" fill-opacity=".15" stroke="#0A296B" stroke-width="1.5"/><path d="M12 8v5l3 3" stroke="#0A296B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Currency symbols
  const currencySymbols = { JPY: '¥', USD: '$', EUR: '€', GBP: '£', KRW: '₩', CNY: '¥', AUD: '$', SGD: '$' };

  // Time display (always show if category supports it)
  let timeHtml = '';
  if (cfg.hasTime && !cfg.hasDate) {
    timeHtml = `
      <div class="detail-info-card">
        <span class="detail-info-label">เวลา</span>
        <div class="detail-info-value${!act.time ? ' empty' : ''}">
          ${clockIcon}
          ${act.time ? escapeHtml(act.time) : 'เลือกเวลา'}
        </div>
      </div>`;
  }

  // Hotel section (always show if category supports it)
  let hotelHtml = '';
  if (cfg.hasDate) {
    hotelHtml = `
      <div class="detail-info-card">
        <span class="detail-info-label">เวลาเช็คอิน</span>
        <div class="detail-info-value${!act.time ? ' empty' : ''}">
          ${clockIcon}
          ${act.time ? escapeHtml(act.time) : 'เลือกเวลา'}
        </div>
      </div>
      <div class="detail-info-card">
        <span class="detail-info-label">วันเข้าพัก</span>
        <div class="detail-info-value${(!act.checkIn && !act.checkOut) ? ' empty' : ''}">
          ${act.checkIn ? formatDateThai(act.checkIn) : '--'} - ${act.checkOut ? formatDateThai(act.checkOut) : '--'}
        </div>
      </div>`;
  }

  // Expense display - 2-row format matching Figma design
  let expenseHtml = '';
  if (cfg.hasAmount) {
    const cur = act.targetCurrency || 'JPY';
    const symbol = currencySymbols[cur] || '';
    const converted = act.targetCurrency && act.amount > 0 ? convertCurrency(act.amount, act.targetCurrency) : '';
    expenseHtml = `
      <div class="detail-info-card">
        <span class="detail-info-label">ระบุจำนวนเงินที่ใช้ไป</span>
        <div class="modal-expense-details">
          <div class="modal-expense-row">
            <span style="${act.amount > 0 ? 'color: var(--text)' : ''}">${act.amount > 0 ? act.amount.toLocaleString() : 'เงินที่ใช้ไป'}</span>
            <span>THB (฿)</span>
          </div>
          <div class="modal-swap-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 10.0909H19L13.1604 5" stroke="#363853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 13.9091L5 13.9091L10.8396 19" stroke="#363853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="modal-expense-row">
            <span style="${converted ? 'color: var(--text)' : ''}">${converted || 'เงินที่ใช้ไป'}</span>
            <span>${cur} (${symbol})</span>
          </div>
        </div>
      </div>`;
  }

  content.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-row">
        <span class="detail-title">${escapeHtml(act.name)}</span>
        <button class="modal-close-btn" id="detail-close">
          <svg viewBox="0 0 32 32" fill="none" width="24" height="24"><path d="M19.1921 12.793L12.8027 19.1823" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.1998 19.1908L12.7998 12.7908" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M3.6665 16.0001C3.6665 25.2494 6.7505 28.3334 15.9998 28.3334C25.2492 28.3334 28.3332 25.2494 28.3332 16.0001C28.3332 6.75075 25.2492 3.66675 15.9998 3.66675C6.7505 3.66675 3.6665 6.75075 3.6665 16.0001Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <p class="detail-desc">${escapeHtml(act.description || cfg.defaultDesc || '')}</p>
      <div class="detail-categories">
        <div class="detail-cat-item">
          <span class="detail-cat-icon">${cfg.icon}</span>
          <span class="detail-cat-label">ประเภท</span>
        </div>
        ${act.travelLink ? `
        <a href="${escapeHtml(act.travelLink)}" target="_blank" class="detail-cat-item clickable" style="text-decoration:none;">
          <span class="detail-cat-icon">${travelIcon}</span>
          <span class="detail-cat-label">เดินทาง</span>
        </a>` : `
        <div class="detail-cat-item">
          <span class="detail-cat-icon">${travelIcon}</span>
          <span class="detail-cat-label">เดินทาง</span>
        </div>`}
        <div class="detail-action-item" id="detail-edit">
          <span class="detail-action-icon">${editIcon}</span>
          <span class="detail-action-label">แก้ไข</span>
        </div>
        <div class="detail-action-item delete" id="detail-delete">
          <span class="detail-action-icon">${deleteIcon}</span>
          <span class="detail-action-label">ลบรายการ</span>
        </div>
      </div>
    </div>
    <div class="detail-scroll">
      ${timeHtml}
      ${hotelHtml}
      ${expenseHtml}
    </div>
    <div class="detail-bottom">
      <button class="btn-outline-detail" id="detail-checkin-btn">Check in</button>
      <button class="btn-gradient-save" id="detail-save-btn">บันทึก</button>
    </div>
  `;

  // Close button
  content.querySelector('#detail-close').addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  // Edit button
  content.querySelector('#detail-edit').addEventListener('click', () => {
    detailModal.classList.remove('active');
    openEditActivity(index);
  });

  // Delete button
  content.querySelector('#detail-delete').addEventListener('click', () => {
    if (confirm('ต้องการลบกิจกรรมนี้?')) {
      tripData.activities.splice(index, 1);
      renderActivities(listEl);
      detailModal.classList.remove('active');
    }
  });

  // Save button (close detail)
  content.querySelector('#detail-save-btn').addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  // Check in button
  content.querySelector('#detail-checkin-btn').addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  detailModal.classList.add('active');
}

function openEditActivity(index) {
  const act = tripData.activities[index];
  if (!act) return;

  editingActivityIndex = index;
  const modal = document.getElementById('activity-modal');
  const chipGroup = document.getElementById('category-chips');

  // Set category
  selectedCategory = act.category || 'place';
  chipGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  const targetChip = chipGroup.querySelector(`[data-cat="${selectedCategory}"]`);
  if (targetChip) targetChip.classList.add('active');

  // Render fields for category
  renderModalFields();

  // Fill in values
  const actName = document.getElementById('activity-name');
  actName.value = act.name || '';

  const timeEl = document.getElementById('activity-time');
  if (timeEl) timeEl.value = act.time || '';

  const amountEl = document.getElementById('activity-amount');
  if (amountEl) amountEl.value = act.amount ? formatNumberComma(act.amount) : '';

  const currencyEl = document.getElementById('activity-currency');
  if (currencyEl) currencyEl.value = act.targetCurrency || 'JPY';

  const foreignEl = document.getElementById('activity-foreign-amount');
  if (foreignEl && act.amount && currencyEl) {
    foreignEl.value = formatNumberComma(convertCurrency(act.amount, currencyEl.value));
  }

  const descEl = document.getElementById('activity-description');
  if (descEl) descEl.value = act.description || '';

  const linkEl = document.getElementById('activity-travel-link');
  if (linkEl) linkEl.value = act.travelLink || '';

  // Restore selected day
  if (act.tripDay) {
    const dayChip = document.querySelector(`#day-selector .day-chip[data-date="${act.tripDay}"]`);
    if (dayChip) dayChip.classList.add('active');
  }

  // Restore check-in/check-out day chips
  if (act.checkIn) {
    const checkinChip = document.querySelector(`#checkin-day-selector .day-chip[data-date="${act.checkIn}"]`);
    if (checkinChip) checkinChip.classList.add('active');
  }
  if (act.checkOut) {
    const checkoutChip = document.querySelector(`#checkout-day-selector .day-chip[data-date="${act.checkOut}"]`);
    if (checkoutChip) checkoutChip.classList.add('active');
  }

  modal.classList.add('active');
}

function formatSpend(amount) {
  if (!amount || amount === 0) return '0';
  if (amount >= 1000) {
    const k = amount / 1000;
    return `-${k % 1 === 0 ? k : k.toFixed(1)} k`;
  }
  return `-${amount}`;
}

function renderActivities(listEl) {
  listEl.innerHTML = '';

  // Hide title & subtitle when activities exist
  const hasActivities = tripData.activities.length > 0;
  const p5Title = document.getElementById('page5-title');
  const p5Subtitle = document.getElementById('page5-subtitle');
  if (p5Title) p5Title.style.display = hasActivities ? 'none' : '';
  if (p5Subtitle) p5Subtitle.style.display = hasActivities ? 'none' : '';

  // Group activities by category
  const categoryOrder = ['place', 'food', 'shopping', 'hotel', 'travel', 'other'];
  const grouped = {};
  tripData.activities.forEach((act, index) => {
    const cat = act.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...act, _index: index });
  });

  // Render each category section
  categoryOrder.forEach(cat => {
    if (!grouped[cat] || grouped[cat].length === 0) return;
    const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;

    const section = document.createElement('div');
    section.className = 'activity-section';

    // Section header
    const header = document.createElement('div');
    header.className = 'activity-section-header';
    header.innerHTML = `
      <span class="activity-section-icon">${cfg.icon}</span>
      <span class="activity-section-label">${cfg.label}</span>
    `;
    section.appendChild(header);

    // Horizontal scroll row
    const row = document.createElement('div');
    row.className = 'activity-section-row';

    grouped[cat].forEach(act => {
      const hasExpense = act.amount > 0;
      const card = document.createElement('div');
      card.className = 'act-card' + (hasExpense ? ' has-expense' : '');

      // Build info section based on category
      let infoHtml = '';

      if (cat === 'hotel') {
        const dateStr = (act.checkIn && act.checkOut)
          ? `${act.checkIn.slice(5).replace('-', '/')} - ${act.checkOut.slice(5).replace('-', '/')}`
          : (act.time || '--:--');
        const hotelDayAmt = getActivityAmountForDay(act);
        const nights = getHotelNights(act);
        infoHtml = `
          <div class="act-card-info-col">
            <span class="act-card-info-value">${escapeHtml(dateStr)}</span>
            <span class="act-card-info-label">วันเข้าพัก</span>
          </div>
          <div class="act-card-info-col">
            <span class="act-card-info-value spend">${formatSpend(hotelDayAmt)}</span>
            <span class="act-card-info-label">${nights > 0 ? `ต่อคืน (${nights} คืน)` : 'เงินที่ใช้ไป'}</span>
          </div>`;
      } else if (cat === 'travel' || cat === 'other') {
        infoHtml = `
          <div class="act-card-info-col">
            <span class="act-card-info-value spend">${formatSpend(act.amount)}</span>
            <span class="act-card-info-label">เงินที่ใช้ไป</span>
          </div>`;
      } else {
        infoHtml = `
          <div class="act-card-info-col">
            <span class="act-card-info-value">${escapeHtml(act.time || '00:00')}</span>
            <span class="act-card-info-label">เวลา</span>
          </div>
          <div class="act-card-info-col">
            <span class="act-card-info-value spend">${formatSpend(act.amount)}</span>
            <span class="act-card-info-label">เงินที่ใช้ไป</span>
          </div>`;
      }

      const illustHtml = cfg.illust
        ? `<div class="act-card-illust"><img src="${cfg.illust}" alt=""></div>`
        : '';

      card.innerHTML = `
        <button class="act-card-remove" data-index="${act._index}">&times;</button>
        <div class="act-card-header">
          <span class="act-card-name">${escapeHtml(act.name)}</span>
          <span class="act-card-icon">${cfg.icon}</span>
        </div>
        <div class="act-card-info">${infoHtml}</div>
        ${illustHtml}
      `;

      // Click card to open detail
      card.addEventListener('click', (e) => {
        if (e.target.closest('.act-card-remove')) return;
        openActivityDetail(act._index);
      });

      row.appendChild(card);
    });

    section.appendChild(row);
    listEl.appendChild(section);
  });

  // Remove buttons
  listEl.querySelectorAll('.act-card-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.index);
      tripData.activities.splice(idx, 1);
      renderActivities(listEl);
    });
  });
}

// ===== Page 6: Trip Members =====
function renderMemberIcons(count) {
  const grid = document.getElementById('member-icons-grid');
  if (!grid) return;

  // Full person icon (first in row)
  const personFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 39" fill="none">
    <path d="M2 33.5723C2 29.1924 5.15217 25.4618 9.43608 24.7715L9.82195 24.7093C13.2523 24.1566 16.7477 24.1566 20.178 24.7093L20.5639 24.7715C24.8478 25.4618 28 29.1924 28 33.5723C28 35.4653 26.48 37 24.6049 37L5.3951 37C3.52004 37 2 35.4653 2 33.5723Z" fill="#363853" fill-opacity="0.15"/>
    <path d="M22.5833 9.65625C22.5833 13.8847 19.1882 17.3125 15 17.3125C10.8118 17.3125 7.41667 13.8847 7.41667 9.65625C7.41667 5.42782 10.8118 2 15 2C19.1882 2 22.5833 5.42782 22.5833 9.65625Z" fill="#363853" fill-opacity="0.15"/>
    <path d="M2 33.5723C2 29.1924 5.15217 25.4618 9.43608 24.7715L9.82195 24.7093C13.2523 24.1566 16.7477 24.1566 20.178 24.7093L20.5639 24.7715C24.8478 25.4618 28 29.1924 28 33.5723C28 35.4653 26.48 37 24.6049 37L5.3951 37C3.52004 37 2 35.4653 2 33.5723Z" stroke="black" stroke-width="4"/>
    <path d="M22.5833 9.65625C22.5833 13.8847 19.1882 17.3125 15 17.3125C10.8118 17.3125 7.41667 13.8847 7.41667 9.65625C7.41667 5.42782 10.8118 2 15 2C19.1882 2 22.5833 5.42782 22.5833 9.65625Z" stroke="black" stroke-width="4"/>
  </svg>`;

  // Partial person icon (stacked behind)
  const personPartial = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 39" fill="none">
    <path d="M2 17.3125C6.18816 17.3125 9.58333 13.8847 9.58333 9.65625C9.58333 5.42782 6.18816 2 2 2M7.17805 37L11.6049 37C13.48 37 15 35.4653 15 33.5723C15 29.1924 11.8478 25.4618 7.56392 24.7715C7.30708 24.7301 7.04688 24.7093 6.78672 24.7093C6.09398 24.7093 5.87879 24.7093 4.68919 24.7093" stroke="black" stroke-width="4" stroke-linecap="round"/>
  </svg>`;

  let html = `<span class="member-icon member-icon-full">${personFull}</span>`;
  for (let i = 1; i < count; i++) {
    html += `<span class="member-icon member-icon-partial">${personPartial}</span>`;
  }
  grid.innerHTML = html;
}

function setupPage6() {
  const slider = document.getElementById('member-slider');
  const valueDisplay = document.getElementById('member-value');
  const saveBtn = document.getElementById('start-journey-btn');
  const backBtn = document.getElementById('page6-back');

  tripData.memberCount = 1;
  renderMemberIcons(1);

  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
    tripData.memberCount = parseInt(slider.value);
    renderMemberIcons(tripData.memberCount);
  });

  saveBtn.addEventListener('click', () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';

    // Include creator as first member + store owner uid
    tripData.members = [{ name: tripData.profileName, image: tripData.profileImage }];
    const currentUser = getCurrentUser();
    if (currentUser) tripData.ownerUid = currentUser.uid;

    // Default description if user didn't provide one
    if (!tripData.description) {
      tripData.description = DEFAULT_TRIP_DESCRIPTION;
    }

    // Remember username and profile image for next trip creation
    if (tripData.profileName) localStorage.setItem('votagex_username', tripData.profileName);
    if (tripData.profileImage) localStorage.setItem('votagex_userimage', tripData.profileImage);

    saveTrip(tripData)
      .then(() => {
        showSuccessScreen();
      })
      .catch(err => {
        console.error('Error saving trip:', err);
        alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        saveBtn.disabled = false;
        saveBtn.textContent = 'บันทึก';
      });
  });

  backBtn.addEventListener('click', () => pageView.goTo(4));
}

// ===== Homepage =====
let currentHomepageTrip = null;
let selectedHomepageDate = null;
let isCreateTripModal = false;
let calWeekOffset = 0; // week offset for swipeable calendar

function openCreateTripModal() {
  isCreateTripModal = true;

  // Reset tripData for new trip
  tripData.name = '';
  tripData.description = '';
  tripData.coverImage = null;
  tripData.startDate = '';
  tripData.endDate = '';
  tripData.profileName = '';
  tripData.profileImage = null;
  tripData.activities = [];
  tripData.memberCount = 1;
  tripData.budget = '';

  // Reset form inputs
  const nameInput = document.getElementById('trip-name');
  const descInput = document.getElementById('trip-desc');
  const budgetInput = document.getElementById('trip-budget');
  const coverPreview = document.getElementById('cover-preview');
  const coverUpload = document.getElementById('cover-upload');
  const page2Next = document.getElementById('page2-next');
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';
  if (budgetInput) budgetInput.value = '';
  if (coverPreview) { coverPreview.style.cssText = 'display:none;'; coverPreview.src = ''; }
  if (coverUpload) coverUpload.classList.remove('has-image');
  if (page2Next) page2Next.disabled = true;

  // Reset dates
  const startDisplay = document.getElementById('start-date-display');
  const endDisplay = document.getElementById('end-date-display');
  if (startDisplay) startDisplay.textContent = '--';
  if (endDisplay) endDisplay.textContent = '--';

  // Reset profile — pre-fill from remembered user
  const profilePreview = document.getElementById('profile-preview');
  const profileName = document.getElementById('profile-name');
  const uploadIconEl = document.getElementById('upload-icon');
  const savedName = localStorage.getItem('votagex_username') || '';
  const savedImage = localStorage.getItem('votagex_userimage') || '';

  if (savedImage && profilePreview) {
    profilePreview.src = savedImage;
    profilePreview.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;';
    if (uploadIconEl) uploadIconEl.style.display = 'none';
    tripData.profileImage = savedImage;
  } else {
    if (profilePreview) { profilePreview.style.cssText = 'display:none;'; profilePreview.src = ''; }
    if (uploadIconEl) uploadIconEl.style.display = '';
  }

  if (profileName) {
    profileName.value = savedName;
    tripData.profileName = savedName;
  }

  // Enable page4 next if name is pre-filled
  const page4Next = document.getElementById('page4-next');
  if (page4Next) page4Next.disabled = !savedName;

  // Reset members
  const memberSlider = document.getElementById('member-slider');
  const memberValue = document.getElementById('member-value');
  if (memberSlider) memberSlider.value = 1;
  if (memberValue) memberValue.textContent = '1';
  renderMemberIcons(1);

  // Reset activity list
  const activityList = document.getElementById('activity-list');
  if (activityList) activityList.innerHTML = '';

  // Reset save button
  const saveBtn = document.getElementById('start-journey-btn');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'บันทึก'; }

  updateTravelCards();

  // Swap page4 back button to close icon (Profile is now first page in modal)
  const page4Back = document.getElementById('page4-back');
  page4Back.innerHTML = `<svg viewBox="0 0 32 32" fill="none" width="32" height="32"><path d="M19.1921 12.793L12.8027 19.1823" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.1998 19.1908L12.7998 12.7908" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M3.6665 16.0001C3.6665 25.2494 6.7505 28.3334 15.9998 28.3334C25.2492 28.3334 28.3332 25.2494 28.3332 16.0001C28.3332 6.75075 25.2492 3.66675 15.9998 3.66675C6.7505 3.66675 3.6665 6.75075 3.6665 16.0001Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  page4Back.classList.add('sheet-close-btn');
  page4Back.classList.remove('btn-back-pill');

  // Show backdrop
  const backdrop = document.getElementById('create-trip-backdrop');
  backdrop.classList.add('active');

  // Show app-container as bottom sheet
  const appContainer = document.querySelector('.app-container');
  appContainer.classList.add('as-modal');
  appContainer.style.display = '';

  // Navigate to Profile page (index 1)
  pageView.goTo(1);

  // Trigger slide-up animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      appContainer.classList.add('open');
    });
  });

  // Close on backdrop click
  backdrop.onclick = () => closeCreateTripModal();
}

function closeCreateTripModal() {
  isCreateTripModal = false;

  // Restore page4 back button to original (Profile is first page in modal)
  const page4Back = document.getElementById('page4-back');
  page4Back.textContent = 'ย้อนกลับ';
  page4Back.classList.remove('sheet-close-btn');
  page4Back.classList.add('btn-back-pill');

  const appContainer = document.querySelector('.app-container');
  const backdrop = document.getElementById('create-trip-backdrop');

  // Slide down animation
  appContainer.classList.remove('open');

  // After animation ends, hide completely
  setTimeout(() => {
    appContainer.classList.remove('as-modal');
    appContainer.style.display = 'none';
    backdrop.classList.remove('active');
  }, 350);
}

function getActivitiesForSelectedDate(trip) {
  const activities = trip.activities || [];
  if (!selectedHomepageDate) return activities;
  return activities.filter(act => activityMatchesDate(act, selectedHomepageDate));
}

function updateHomepageButton(trip) {
  const btn = document.getElementById('hp-add-activity');
  const userName = (trip && trip.profileName) || tripData.profileName || '';
  const selectedDate = selectedHomepageDate || formatISODate(new Date());

  // Check if the selected date falls within any of the user's joined/created trips
  getTrips().then(trips => {
    const hasTripOnDate = trips.some(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      if (!isCreator && !isMember) return false;
      // Check if selected date is within this trip's date range
      if (!t.startDate || !t.endDate) return false;
      return selectedDate >= t.startDate && selectedDate <= t.endDate;
    });

    if (hasTripOnDate) {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> เพิ่ม Activity`;
      btn.dataset.mode = 'activity';
    } else {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> เพิ่มทริป`;
      btn.dataset.mode = 'trip';
    }
  });
}

function showHomepage(trip) {
  currentHomepageTrip = trip;
  selectedHomepageDate = formatISODate(new Date());
  calWeekOffset = 0;

  // Sync tripData so modal fields (getTripDays, etc.) work correctly
  tripData.name = trip.name || tripData.name;
  tripData.startDate = trip.startDate || tripData.startDate;
  tripData.endDate = trip.endDate || tripData.endDate;
  tripData.profileName = trip.profileName || tripData.profileName;
  tripData.profileImage = trip.profileImage || tripData.profileImage;
  if (trip.activities) tripData.activities = trip.activities;

  // Hide app-container (pageview), join screen, iTrip page, and ME page
  document.querySelector('.app-container').style.display = 'none';
  const joinScreen = document.getElementById('join-screen');
  if (joinScreen) joinScreen.classList.remove('active');
  const itripPage = document.getElementById('itrip-page');
  if (itripPage) itripPage.style.display = 'none';
  const mePage = document.getElementById('me-page');
  if (mePage) mePage.style.display = 'none';

  // Show homepage
  const hp = document.getElementById('homepage');
  hp.style.display = 'flex';

  // Reset all tab bars to show "home" as active
  document.querySelectorAll('.hp-tab-bar .hp-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === 'home');
  });

  renderHomepageHeader(trip);
  renderCountdownCalendar(trip);
  renderRecentActivities(trip);
  renderTravelSchedule(trip);
  updateHomepageButton(trip);
  renderOtherTrips();
  setupHomepageEvents();
}

function renderHomepageHeader(trip) {
  const avatar = document.getElementById('hp-avatar');
  const authUser = getStoredAuthUser();
  const photoURL = (authUser && authUser.photoURL) || trip.profileImage;
  if (photoURL) {
    avatar.innerHTML = `<img src="${photoURL}" alt="">`;
  }

  const welcome = document.getElementById('hp-welcome');
  const name = (authUser && authUser.displayName) || trip.profileName || 'Traveler';
  welcome.textContent = `Welcome , ${name}`;
}

// ===== Other Trips (joinable from homepage) =====

function renderOtherTrips() {
  const section = document.getElementById('hp-other-trip-section');
  const grid = document.getElementById('hp-other-trip-grid');
  if (!section || !grid) return;

  const userName = (currentHomepageTrip && currentHomepageTrip.profileName) || tripData.profileName || '';
  const selectedDate = selectedHomepageDate || formatISODate(new Date());

  getTrips().then(trips => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter to trips user has NOT joined/created AND have activities on the selected date
    const otherTrips = trips.filter(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      if (isCreator || isMember) return false;
      // Check if this trip has activities on the selected date
      const hasActivityOnDate = (t.activities || []).some(act => act.tripDay === selectedDate);
      // Also include if the trip's date range covers the selected date
      const coversDate = t.startDate && t.endDate &&
        selectedDate >= t.startDate && selectedDate <= t.endDate;
      return hasActivityOnDate || coversDate;
    });

    if (otherTrips.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    grid.innerHTML = '';

    // Sort: joinable first, then expired/full
    otherTrips.sort((a, b) => {
      const aExpired = a.endDate ? new Date(a.endDate) < today : false;
      const aFull = (a.members || []).length >= (a.memberCount || 1);
      const bExpired = b.endDate ? new Date(b.endDate) < today : false;
      const bFull = (b.members || []).length >= (b.memberCount || 1);
      const aDisabled = aExpired || aFull ? 1 : 0;
      const bDisabled = bExpired || bFull ? 1 : 0;
      return aDisabled - bDisabled;
    });

    otherTrips.forEach(trip => {
      const isExpired = trip.endDate ? new Date(trip.endDate) < today : false;
      const currentMembers = (trip.members || []).length;
      const maxMembers = trip.memberCount || 1;
      const isFull = currentMembers >= maxMembers;

      const card = document.createElement('div');
      card.className = 'hp-other-card' + ((isExpired || isFull) ? ' disabled' : '');

      // Cover / flag
      let flagHtml;
      if (trip.coverImage) {
        flagHtml = `<img src="${trip.coverImage}" alt="">`;
      } else {
        flagHtml = `<svg class="flag-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
      }

      // Date text
      const dateText = trip.startDate && trip.endDate
        ? `${formatDateShort(trip.startDate)} - ${formatDateShort(trip.endDate)}`
        : '';

      // Avatars
      const members = trip.members || [];
      let avatarsHtml = '';
      const defaultAvatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
      const showMax = 3;
      if (members.length > 0) {
        members.slice(0, showMax).forEach(m => {
          if (m.image) {
            avatarsHtml += `<div class="hp-other-avatar"><img src="${m.image}" alt=""></div>`;
          } else {
            const initial = (m.name || 'U').charAt(0).toUpperCase();
            avatarsHtml += `<div class="hp-other-avatar">${initial}</div>`;
          }
        });
        if (members.length > showMax) {
          avatarsHtml += `<div class="hp-other-avatar extra">+${members.length - showMax}</div>`;
        }
      } else {
        const displayCount = Math.min(maxMembers, showMax);
        for (let i = 0; i < displayCount; i++) {
          avatarsHtml += `<div class="hp-other-avatar">${defaultAvatarSvg}</div>`;
        }
      }

      // Join button
      let joinBtnHtml = '';
      if (isExpired) {
        joinBtnHtml = `<button class="hp-other-join-btn" disabled>สิ้นสุดแล้ว</button>`;
      } else if (isFull) {
        joinBtnHtml = `<button class="hp-other-join-btn" disabled>เต็มแล้ว</button>`;
      } else {
        joinBtnHtml = `<button class="hp-other-join-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> เข้าร่วม</button>`;
      }

      card.innerHTML = `
        <div class="hp-other-flag">${flagHtml}</div>
        <div class="hp-other-details">
          <div class="hp-other-name">${escapeHtml(trip.name || 'Trip')}</div>
          ${dateText ? `<div class="hp-other-date">${dateText}</div>` : ''}
          ${trip.description ? `<div class="hp-other-desc">${escapeHtml(trip.description)}</div>` : ''}
        </div>
        <div class="hp-other-avatars">${avatarsHtml}</div>
        ${joinBtnHtml}
      `;

      // Card click → show join modal (non-member can't view details)
      card.addEventListener('click', (e) => {
        if (e.target.closest('.hp-other-join-btn')) return;
        showJoinConfirmModal(trip, 'homepage');
      });

      // Join button handler → show confirmation modal
      if (!isExpired && !isFull) {
        const joinBtn = card.querySelector('.hp-other-join-btn');
        if (joinBtn) {
          joinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showJoinConfirmModal(trip, 'homepage');
          });
        }
      }

      grid.appendChild(card);
    });
  });
}

// ===== Join Confirmation Modal =====
let pendingJoinTrip = null;
let pendingJoinSource = null;

function showJoinConfirmModal(trip, source) {
  pendingJoinTrip = trip;
  pendingJoinSource = source || 'homepage';

  const modal = document.getElementById('join-confirm-modal');
  const tripNameEl = document.getElementById('join-confirm-trip-name');
  const textEl = document.getElementById('join-confirm-text');
  const warningEl = document.getElementById('join-confirm-warning');
  const okBtn = document.getElementById('join-confirm-ok');
  const cancelBtn = document.getElementById('join-confirm-cancel');

  tripNameEl.textContent = trip.name || 'Trip';
  warningEl.style.display = 'none';
  warningEl.innerHTML = '';

  // Check if trip is full
  const currentMembers = (trip.members || []).length;
  const maxMembers = trip.memberCount || 1;
  if (currentMembers >= maxMembers) {
    textEl.textContent = '';
    warningEl.style.display = 'block';
    warningEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ผู้ร่วมทริปเต็มแล้ว ไม่สามารถเข้าร่วมได้';
    okBtn.style.display = 'none';
    cancelBtn.textContent = 'ปิด';
    modal.style.display = 'flex';
    return;
  }

  // Check date overlap with already-joined trips
  const userName = (currentHomepageTrip && currentHomepageTrip.profileName) || tripData.profileName || '';
  getTrips().then(trips => {
    const joinedTrips = trips.filter(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      return isCreator || isMember;
    });

    // Check if target trip dates overlap with any joined trip
    let overlappingTrip = null;
    if (trip.startDate && trip.endDate) {
      const newStart = new Date(trip.startDate);
      const newEnd = new Date(trip.endDate);
      newStart.setHours(0, 0, 0, 0);
      newEnd.setHours(0, 0, 0, 0);

      for (const jt of joinedTrips) {
        if (!jt.startDate || !jt.endDate) continue;
        const jtStart = new Date(jt.startDate);
        const jtEnd = new Date(jt.endDate);
        jtStart.setHours(0, 0, 0, 0);
        jtEnd.setHours(0, 0, 0, 0);

        // Overlap: newStart <= jtEnd AND newEnd >= jtStart
        if (newStart <= jtEnd && newEnd >= jtStart) {
          overlappingTrip = jt;
          break;
        }
      }
    }

    if (overlappingTrip) {
      textEl.textContent = '';
      warningEl.style.display = 'block';
      warningEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> คุณมีทริป <b>"' + escapeHtml(overlappingTrip.name || 'Trip') + '"</b> ที่วันทับกันอยู่แล้ว ต้องออกจากทริปเก่าก่อนจึงจะเข้าร่วมได้';
      okBtn.style.display = 'none';
      cancelBtn.textContent = 'ปิด';
    } else {
      textEl.textContent = 'ยืนยันว่าจะเข้าร่วมทริปนี้?';
      okBtn.style.display = '';
      okBtn.disabled = false;
      okBtn.textContent = 'เข้าร่วม';
      cancelBtn.textContent = 'ยกเลิก';
    }

    modal.style.display = 'flex';
  });
}

function hideJoinConfirmModal() {
  const modal = document.getElementById('join-confirm-modal');
  modal.style.display = 'none';
  pendingJoinTrip = null;
  pendingJoinSource = null;
}

function setupJoinConfirmModal() {
  const modal = document.getElementById('join-confirm-modal');
  const cancelBtn = document.getElementById('join-confirm-cancel');
  const okBtn = document.getElementById('join-confirm-ok');

  cancelBtn.addEventListener('click', hideJoinConfirmModal);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideJoinConfirmModal();
  });

  okBtn.addEventListener('click', () => {
    if (!pendingJoinTrip) return;
    const trip = pendingJoinTrip;
    const source = pendingJoinSource;
    const currentUserName = (currentHomepageTrip && currentHomepageTrip.profileName) || tripData.profileName || '';
    const currentUserImage = (currentHomepageTrip && currentHomepageTrip.profileImage) || tripData.profileImage || null;

    okBtn.disabled = true;
    okBtn.textContent = 'กำลังเข้าร่วม...';

    joinTrip(trip.id, { name: currentUserName, image: currentUserImage })
      .then(() => {
        trip.members = trip.members || [];
        trip.members.push({ name: currentUserName, image: currentUserImage });
        hideJoinConfirmModal();

        if (source === 'itrip') {
          // Refresh iTrip cards
          renderItripCards();
        } else {
          // Refresh homepage other trips section
          renderOtherTrips();
        }
      });
  });
}

function updateHomepageSubtitle(trip) {
  const subtitleEl = document.getElementById('hp-trip-subtitle');
  if (!subtitleEl) return;

  const userName = (trip && trip.profileName) || tripData.profileName || '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  getTrips().then(trips => {
    // Find all joined trips
    const joinedTrips = trips.filter(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      return isCreator || isMember;
    });

    if (joinedTrips.length === 0) {
      subtitleEl.textContent = 'มาเพิ่มทริปเพื่อออกไปสนุกกัน!';
      return;
    }

    // Find the nearest upcoming trip from all joined trips
    let nearestDays = Infinity;
    joinedTrips.forEach(t => {
      if (t.startDate) {
        const start = new Date(t.startDate);
        start.setHours(0, 0, 0, 0);
        const diff = Math.ceil((start - today) / 86400000);
        if (diff > 0 && diff < nearestDays) {
          nearestDays = diff;
        }
      }
    });

    // Check if any trip is ongoing today
    const hasOngoingTrip = joinedTrips.some(t => {
      if (!t.startDate) return false;
      const start = new Date(t.startDate);
      start.setHours(0, 0, 0, 0);
      const end = t.endDate ? new Date(t.endDate) : start;
      end.setHours(0, 0, 0, 0);
      return today >= start && today <= end;
    });

    if (hasOngoingTrip) {
      subtitleEl.textContent = 'ขอให้สนุกกับทริปของคุณ';
    } else if (nearestDays < Infinity) {
      subtitleEl.textContent = `อีก ${nearestDays} วัน มาร่วมสนุกกันเถอะ !`;
    } else {
      // All trips are past
      subtitleEl.textContent = 'มาเพิ่มทริปเพื่อออกไปสนุกกัน!';
    }
  });
}

function renderCountdownCalendar(trip) {
  const countdownEl = document.getElementById('hp-countdown');
  const labelEl = document.getElementById('hp-countdown-label');
  const weekRow = document.getElementById('hp-week-row');

  // Calculate countdown
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (trip.startDate) {
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    const end = trip.endDate ? new Date(trip.endDate) : start;
    end.setHours(0, 0, 0, 0);

    const diffToStart = Math.ceil((start - today) / 86400000);
    const diffToEnd = Math.ceil((end - today) / 86400000);

    const tripName = trip.name || '';
    if (diffToStart > 0) {
      countdownEl.textContent = diffToStart;
      labelEl.textContent = tripName ? `Days - ${tripName}` : 'Days';
    } else if (diffToEnd >= 0) {
      const dayNum = Math.abs(diffToStart) + 1;
      countdownEl.textContent = 'Day ' + dayNum;
      labelEl.textContent = tripName ? `- ${tripName}` : '';
    } else {
      countdownEl.textContent = '0';
      labelEl.textContent = 'Days';
    }
  }

  // Subtitle text — async: find nearest upcoming trip from all joined trips
  updateHomepageSubtitle(trip);

  // Render compact week row (Mon-Sun with week offset for swiping)
  const todayDate = new Date();
  renderWeekRow(trip, todayDate);

  // Also update day labels for the visible week
  updateWeekLabels();

  // Setup swipe on the week area (row + labels)
  setupWeekSwipe(trip, weekRow);
}

function getStartOfWeek(baseDate, offset) {
  const dayOfWeek = baseDate.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(baseDate.getDate() + mondayOffset + (offset * 7));
  return startOfWeek;
}

function renderWeekRow(trip, todayDate) {
  const weekRow = document.getElementById('hp-week-row');
  const startOfWeek = getStartOfWeek(todayDate, calWeekOffset);

  // Collect activity dates and count per date (include hotel across check-in to check-out)
  const activityCounts = {};
  (trip.activities || []).forEach(act => {
    if (act.category === 'hotel' && act.checkIn && act.checkOut) {
      for (let d = new Date(act.checkIn); d < new Date(act.checkOut); d.setDate(d.getDate() + 1)) {
        const ds = formatISODate(d);
        activityCounts[ds] = (activityCounts[ds] || 0) + 1;
      }
    } else if (act.tripDay) {
      activityCounts[act.tripDay] = (activityCounts[act.tripDay] || 0) + 1;
    }
  });

  // Set default selected date to today if not set
  if (!selectedHomepageDate) {
    selectedHomepageDate = formatISODate(todayDate);
  }

  weekRow.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = formatISODate(d);
    const isToday = d.toDateString() === todayDate.toDateString();
    const isSelected = dateStr === selectedHomepageDate;
    const actCount = activityCounts[dateStr] || 0;

    const col = document.createElement('div');
    col.className = 'hp-week-day' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '');
    col.dataset.date = dateStr;

    // Activity dots (up to 3)
    let dotsHtml = '<div class="hp-week-dots">';
    const dotCount = Math.min(actCount, 3);
    for (let j = 0; j < dotCount; j++) {
      dotsHtml += '<span class="hp-week-dot has-activity"></span>';
    }
    if (dotCount === 0) {
      dotsHtml += '<span class="hp-week-dot"></span>';
    }
    dotsHtml += '</div>';

    col.innerHTML = `
      <span class="hp-week-day-num">${d.getDate()}</span>
      ${dotsHtml}
    `;

    // Click to select date
    col.addEventListener('click', () => {
      selectedHomepageDate = dateStr;
      // Update selected visual
      weekRow.querySelectorAll('.hp-week-day').forEach(el => el.classList.remove('selected'));
      col.classList.add('selected');
      // Re-render content for selected date
      renderRecentActivities(trip);
      renderTravelSchedule(trip);
      updateHomepageButton(trip);
      renderOtherTrips();
    });

    weekRow.appendChild(col);
  }
}

function updateWeekLabels() {
  const labels = document.getElementById('hp-week-labels');
  if (!labels) return;
  const todayDate = new Date();
  const startOfWeek = getStartOfWeek(todayDate, calWeekOffset);
  const dayNames = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  const spans = labels.querySelectorAll('span');
  spans.forEach((span, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    span.textContent = dayNames[i];
  });
}

let weekSwipeSetup = false;
function setupWeekSwipe(trip, weekRow) {
  if (weekSwipeSetup) return;
  weekSwipeSetup = true;

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  // Use the entire calendar card as swipe area (much larger touch target)
  const swipeArea = document.querySelector('.hp-calendar-card') || weekRow.parentElement || weekRow;

  swipeArea.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: true });

  swipeArea.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const diffX = Math.abs(e.touches[0].clientX - touchStartX);
    const diffY = Math.abs(e.touches[0].clientY - touchStartY);
    // If horizontal swipe is dominant, prevent vertical scroll
    if (diffX > 10 && diffX > diffY * 1.2) {
      e.preventDefault();
    }
  }, { passive: false });

  swipeArea.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Only trigger if horizontal swipe is dominant and > 40px
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
      const currentTrip = currentHomepageTrip || trip;
      if (diffX < 0) {
        // Swipe left → next week
        calWeekOffset++;
      } else {
        // Swipe right → previous week
        calWeekOffset--;
      }
      renderWeekRow(currentTrip, new Date());
      updateWeekLabels();
    }
  }, { passive: true });
}

function renderRecentActivities(trip) {
  const container = document.getElementById('hp-recent-list');
  const dayActivities = getActivitiesForSelectedDate(trip);

  // Filter to place, food, shopping, hotel only
  const filtered = dayActivities.filter(a =>
    ['place', 'food', 'shopping', 'hotel'].includes(a.category)
  );

  if (filtered.length === 0) {
    container.innerHTML = '<div class="hp-recent-empty">ไม่มีกิจกรรมในวันที่เลือก</div>';
    return;
  }

  // Sort by time
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.time || '00:00';
    const tb = b.time || '00:00';
    return ta.localeCompare(tb);
  });

  // Get up to 3 activities
  const recent = sorted.slice(0, 3);

  container.innerHTML = '';
  recent.forEach(act => {
    const cfg = CATEGORY_CONFIG[act.category] || CATEGORY_CONFIG.other;
    const cat = act.category || 'other';
    const hasExpense = act.amount > 0;

    // Find the original index in trip.activities
    const actIndex = (trip.activities || []).indexOf(act);

    const card = document.createElement('div');
    card.className = 'act-card' + (hasExpense ? ' has-expense' : '');
    card.style.cursor = 'pointer';

    // Build info section (same as page 5)
    let infoHtml = '';
    if (cat === 'hotel') {
      const dateStr = (act.checkIn && act.checkOut)
        ? `${act.checkIn.slice(5).replace('-', '/')} - ${act.checkOut.slice(5).replace('-', '/')}`
        : (act.time || '--:--');
      const hotelDayAmt = getActivityAmountForDay(act);
      const nights = getHotelNights(act);
      infoHtml = `
        <div class="act-card-info-col">
          <span class="act-card-info-value">${escapeHtml(dateStr)}</span>
          <span class="act-card-info-label">วันเข้าพัก</span>
        </div>
        <div class="act-card-info-col">
          <span class="act-card-info-value spend">${formatSpend(hotelDayAmt)}</span>
          <span class="act-card-info-label">${nights > 0 ? `ต่อคืน (${nights} คืน)` : 'เงินที่ใช้ไป'}</span>
        </div>`;
    } else {
      infoHtml = `
        <div class="act-card-info-col">
          <span class="act-card-info-value">${escapeHtml(act.time || '00:00')}</span>
          <span class="act-card-info-label">เวลา</span>
        </div>
        <div class="act-card-info-col">
          <span class="act-card-info-value spend">${formatSpend(act.amount)}</span>
          <span class="act-card-info-label">เงินที่ใช้ไป</span>
        </div>`;
    }

    const illustHtml = cfg.illust
      ? `<div class="act-card-illust"><img src="${cfg.illust}" alt=""></div>`
      : '';

    card.innerHTML = `
      <div class="act-card-header">
        <span class="act-card-name">${escapeHtml(act.name)}</span>
        <span class="act-card-icon">${cfg.icon}</span>
      </div>
      <div class="act-card-info">${infoHtml}</div>
      ${illustHtml}
    `;

    // Click to open activity detail
    card.addEventListener('click', () => {
      if (actIndex >= 0) {
        openActivityDetail(actIndex);
      }
    });

    container.appendChild(card);
  });
}

function getDayLabel(trip, dateStr) {
  if (!trip.startDate || !dateStr) return '';
  const start = new Date(trip.startDate);
  const d = new Date(dateStr);
  const diff = Math.round((d - start) / 86400000) + 1;
  if (diff > 0) return 'Day ' + diff;
  return '';
}

function getActivityStatus(act) {
  if (act.checkedIn) return 'checked-in';

  const now = new Date();
  if (!act.tripDay || !act.time) return 'pending';

  const [h, m] = act.time.split(':').map(Number);
  const actDate = new Date(act.tripDay);
  actDate.setHours(h || 0, m || 0, 0, 0);

  const diffMs = now - actDate;
  const diffMin = diffMs / 60000;

  if (diffMin > 30) return 'missed';
  if (diffMin >= -30 && diffMin <= 30) return 'pending';
  return 'pending';
}

function renderTravelSchedule(trip) {
  const container = document.getElementById('hp-schedule');
  const dayActivities = getActivitiesForSelectedDate(trip);
  const viewBtn = document.getElementById('hp-view-detail');

  if (dayActivities.length === 0) {
    container.innerHTML = '<div class="hp-schedule-empty">ไม่มีกิจกรรมในวันนี้</div>';
    if (viewBtn) { viewBtn.disabled = true; viewBtn.style.opacity = '0.35'; }
    return;
  }

  if (viewBtn) { viewBtn.disabled = false; viewBtn.style.opacity = ''; }

  // Sort by time
  const sorted = dayActivities.map((a) => {
    const origIndex = (trip.activities || []).indexOf(a);
    return { ...a, _index: origIndex };
  }).sort((a, b) => {
    const ta = a.time || '00:00';
    const tb = b.time || '00:00';
    return ta.localeCompare(tb);
  });

  container.innerHTML = '';

  sorted.forEach((act, idx) => {
    const cfg = CATEGORY_CONFIG[act.category] || CATEGORY_CONFIG.other;
    const status = getActivityStatus(act);

    // Schedule item
    const item = document.createElement('div');
    item.className = 'hp-schedule-item';

    // Determine circle color class
    let circleClass = 'pending';
    if (status === 'checked-in') circleClass = 'checked-in';
    else if (status === 'missed') circleClass = 'missed';
    else if (act.category === 'hotel') circleClass = 'default';

    item.innerHTML = `
      <div class="hp-status-circle ${circleClass}">${cfg.icon}</div>
      <div class="hp-schedule-info">
        <span class="hp-schedule-name">${escapeHtml(act.name)}</span>
        <span class="hp-schedule-detail-link" data-act-index="${act._index}">Check in</span>
      </div>
      <span class="hp-schedule-time">${act.time || '--:--'}</span>
    `;

    container.appendChild(item);

    // Add divider between items (not after last)
    if (idx < sorted.length - 1) {
      const divider = document.createElement('div');
      divider.className = 'hp-schedule-divider';
      divider.innerHTML = '<div class="hp-schedule-divider-line"></div>';
      container.appendChild(divider);
    }
  });

  // Detail link handlers (check in on click)
  container.querySelectorAll('.hp-schedule-detail-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const actIndex = parseInt(link.dataset.actIndex);
      if (isNaN(actIndex)) return;

      const act = (currentHomepageTrip.activities || [])[actIndex];
      if (act && !act.checkedIn) {
        act.checkedIn = true;
        act.checkedInAt = new Date().toISOString();
        renderTravelSchedule(currentHomepageTrip);
      }
    });
  });
}

let homepageEventsSetup = false;

function setupHomepageEvents() {
  if (homepageEventsSetup) return;
  homepageEventsSetup = true;

  // Add Activity / Add Trip button
  document.getElementById('hp-add-activity').addEventListener('click', () => {
    const btn = document.getElementById('hp-add-activity');
    if (btn.dataset.mode === 'trip') {
      openCreateTripModal();
      return;
    }
    editingActivityIndex = -1;
    selectedCategory = 'place';
    const chipGroup = document.getElementById('category-chips');
    chipGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipGroup.querySelector('[data-cat="place"]').classList.add('active');
    renderModalFields();
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-description').value = '';
    document.getElementById('activity-modal').classList.add('active');
  });

  // Override modal save to also update homepage, trip detail, and persist to localStorage
  const originalModalAdd = document.getElementById('modal-add');
  originalModalAdd.addEventListener('click', () => {
    // After the existing save handler runs, update homepage and trip detail
    setTimeout(() => {
      if (currentHomepageTrip) {
        currentHomepageTrip.activities = tripData.activities;

        // Persist activities to localStorage
        if (currentHomepageTrip.id) {
          updateTrip(currentHomepageTrip.id, { activities: currentHomepageTrip.activities });
        }

        renderRecentActivities(currentHomepageTrip);
        renderTravelSchedule(currentHomepageTrip);
        renderCountdownCalendar(currentHomepageTrip);
        updateHomepageButton(currentHomepageTrip);
      }
      if (currentDetailTrip) {
        currentDetailTrip.activities = tripData.activities;

        // Persist activities to localStorage
        if (currentDetailTrip.id) {
          updateTrip(currentDetailTrip.id, { activities: currentDetailTrip.activities });
        }

        renderTripDetailInfo(currentDetailTrip);
        renderTripDetailDays(currentDetailTrip);
        renderTripDetailExpenses(currentDetailTrip);
        renderTripDetailActivities(currentDetailTrip);
        renderTripDetailPlanDays(currentDetailTrip);
        renderTripDetailPlan(currentDetailTrip);
      }
    }, 100);
  });

  // View trip detail from homepage → open directly on plan tab
  document.getElementById('hp-view-detail').addEventListener('click', () => {
    if (!currentHomepageTrip) return;
    const userName = currentHomepageTrip.profileName || tripData.profileName || '';
    const isCreator = currentHomepageTrip.profileName && currentHomepageTrip.profileName === userName;
    const isMember = (currentHomepageTrip.members || []).some(m => m.name === userName);
    if (isCreator || isMember) {
      openTripDetail(currentHomepageTrip);
      // Switch to plan tab immediately
      const tabExpenses = document.getElementById('td-tab-expenses');
      const tabPlan = document.getElementById('td-tab-plan');
      const expensesContent = document.getElementById('td-expenses-content');
      const planContent = document.getElementById('td-plan-content');
      tabPlan.classList.add('active');
      tabExpenses.classList.remove('active');
      expensesContent.style.display = 'none';
      planContent.style.display = '';
      planContent.classList.remove('td-tab-hidden');
      planContent.classList.add('td-tab-visible');
    }
  });

  // Tab bar navigation (homepage tabs)
  document.querySelectorAll('#homepage .hp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (target !== 'home') navigateToTab(target);
    });
  });
}

// Keep old function name for compatibility
function showSuccessScreen() {
  if (isCreateTripModal) {
    // Close the modal and refresh homepage with new trip data
    closeCreateTripModal();
    showHomepage(tripData);
  } else {
    showHomepage(tripData);
  }
}

// ===== Edit Trip Modal =====
let editingTripId = null;

function openEditModal(trip) {
  editingTripId = trip.id;

  document.getElementById('edit-trip-name').value = trip.name || '';
  document.getElementById('edit-trip-desc').value = trip.description || '';
  const editBudgetEl = document.getElementById('edit-trip-budget');
  editBudgetEl.value = trip.budget ? formatNumberComma(trip.budget) : '';
  document.getElementById('edit-start-date').value = trip.startDate || '';
  document.getElementById('edit-end-date').value = trip.endDate || '';
  document.getElementById('edit-profile-name').value = trip.profileName || '';

  const slider = document.getElementById('edit-member-slider');
  const valueDisplay = document.getElementById('edit-member-value');
  slider.value = trip.memberCount || 1;
  valueDisplay.textContent = slider.value;

  document.getElementById('edit-modal').classList.add('active');
}

function setupEditModal() {
  const modal = document.getElementById('edit-modal');
  const saveBtn = document.getElementById('edit-save');
  const cancelBtn = document.getElementById('edit-cancel');
  const slider = document.getElementById('edit-member-slider');
  const valueDisplay = document.getElementById('edit-member-value');

  setupCommaInput(document.getElementById('edit-trip-budget'));

  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    editingTripId = null;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      editingTripId = null;
    }
  });

  saveBtn.addEventListener('click', () => {
    if (!editingTripId) return;

    const updatedData = {
      name: document.getElementById('edit-trip-name').value.trim(),
      description: document.getElementById('edit-trip-desc').value.trim(),
      budget: stripCommas(document.getElementById('edit-trip-budget').value.trim()),
      startDate: document.getElementById('edit-start-date').value,
      endDate: document.getElementById('edit-end-date').value,
      profileName: document.getElementById('edit-profile-name').value.trim(),
      memberCount: parseInt(slider.value)
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'กำลังบันทึก...';

    updateTrip(editingTripId, updatedData)
      .then(() => {
        modal.classList.remove('active');
        editingTripId = null;
        saveBtn.disabled = false;
        saveBtn.textContent = 'บันทึก';
        loadTripCards();
      })
      .catch(err => {
        console.error('Error updating trip:', err);
        alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        saveBtn.disabled = false;
        saveBtn.textContent = 'บันทึก';
      });
  });
}

// ===== Tab Navigation =====
function navigateToTab(tab) {
  const homepage = document.getElementById('homepage');
  const itripPage = document.getElementById('itrip-page');
  const mePage = document.getElementById('me-page');

  // Hide all pages
  homepage.style.display = 'none';
  itripPage.style.display = 'none';
  mePage.style.display = 'none';

  if (tab === 'home') {
    homepage.style.display = 'flex';
  } else if (tab === 'itrip') {
    itripPage.style.display = 'flex';
    renderItripPage();
    setupItripEvents();
  } else if (tab === 'profile') {
    mePage.style.display = 'flex';
    renderMePage();
    setupMePageEvents();
  }

  // Update active tab on all tab bars
  document.querySelectorAll('.hp-tab-bar .hp-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
}

// ===== iTrip Page =====
let itripEventsSetup = false;

function setupItripEvents() {
  if (itripEventsSetup) return;
  itripEventsSetup = true;

  // Add Trip button → open create trip modal
  document.getElementById('itrip-add-trip').addEventListener('click', () => {
    openCreateTripModal();
  });

  // Tab bar navigation (iTrip page tabs)
  document.querySelectorAll('#itrip-page .hp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (target !== 'itrip') navigateToTab(target);
    });
  });
}

function renderItripPage() {
  const welcome = document.getElementById('itrip-welcome');
  const authUser = getStoredAuthUser();
  const profileName = (authUser && authUser.displayName) || (currentHomepageTrip && currentHomepageTrip.profileName) || tripData.profileName || 'User';
  welcome.textContent = `Welcome , ${profileName}`;

  renderItripCards();
}

function renderItripCards() {
  const myGrid = document.getElementById('itrip-my-grid');
  const otherGrid = document.getElementById('itrip-other-grid');
  const otherSection = document.getElementById('itrip-other-section');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get current user's profile name to identify "my" trips
  const currentUserName = (currentHomepageTrip && currentHomepageTrip.profileName) || tripData.profileName || '';

  getTrips().then(trips => {
    const myTrips = [];
    const otherTrips = [];

    trips.forEach(trip => {
      // A trip is "mine" if I created it (profileName matches) or I'm a member
      const isCreator = trip.profileName && trip.profileName === currentUserName;
      const isMember = (trip.members || []).some(m => m.name === currentUserName);
      if (isCreator || isMember) {
        myTrips.push(trip);
      } else {
        otherTrips.push(trip);
      }
    });

    // Render my trips
    if (myTrips.length === 0) {
      myGrid.innerHTML = '<div class="itrip-empty">ยังไม่มีทริปของคุณ</div>';
    } else {
      myGrid.innerHTML = '';
      myTrips.reverse().forEach(trip => {
        myGrid.appendChild(createItripCard(trip, false, today));
      });
    }

    // Render other trips — sort: joinable first, expired/full last
    if (otherTrips.length > 0) {
      otherSection.style.display = 'flex';
      otherGrid.innerHTML = '';
      otherTrips.reverse();
      otherTrips.sort((a, b) => {
        const aExpired = a.endDate ? new Date(a.endDate) < today : false;
        const aFull = (a.members || []).length >= (a.memberCount || 1);
        const bExpired = b.endDate ? new Date(b.endDate) < today : false;
        const bFull = (b.members || []).length >= (b.memberCount || 1);
        return (aExpired || aFull ? 1 : 0) - (bExpired || bFull ? 1 : 0);
      });
      otherTrips.forEach(trip => {
        otherGrid.appendChild(createItripCard(trip, true, today));
      });
    } else {
      otherSection.style.display = 'none';
    }
  });
}

function createItripCard(trip, showJoinBtn, today) {
  const card = document.createElement('div');
  const isExpired = trip.endDate ? new Date(trip.endDate) < today : false;
  const currentMembers = (trip.members || []).length;
  const maxMembers = trip.memberCount || 1;
  const isFull = currentMembers >= maxMembers;

  // My trips (showJoinBtn=false): only grey when expired — full is irrelevant since user is already in trip
  // Other trips (showJoinBtn=true): grey when expired OR full
  const isDisabled = showJoinBtn ? (isExpired || isFull) : isExpired;
  card.className = 'hp-other-card' + (isDisabled ? ' disabled' : '');

  // Cover / flag
  let flagHtml;
  if (trip.coverImage) {
    flagHtml = `<img src="${trip.coverImage}" alt="">`;
  } else {
    flagHtml = `<svg class="flag-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }

  // Date text
  const dateText = trip.startDate && trip.endDate
    ? `${formatDateShort(trip.startDate)} - ${formatDateShort(trip.endDate)}`
    : '';

  // Avatars
  const members = trip.members || [];
  let avatarsHtml = '';
  const defaultAvatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  const showMax = 3;

  if (members.length > 0) {
    members.slice(0, showMax).forEach(m => {
      if (m.image) {
        avatarsHtml += `<div class="hp-other-avatar"><img src="${m.image}" alt=""></div>`;
      } else {
        const initial = (m.name || 'U').charAt(0).toUpperCase();
        avatarsHtml += `<div class="hp-other-avatar">${initial}</div>`;
      }
    });
    if (members.length > showMax) {
      avatarsHtml += `<div class="hp-other-avatar extra">+${members.length - showMax}</div>`;
    }
  } else {
    const displayCount = Math.min(maxMembers, showMax);
    for (let i = 0; i < displayCount; i++) {
      avatarsHtml += `<div class="hp-other-avatar">${defaultAvatarSvg}</div>`;
    }
    if (maxMembers > showMax) {
      avatarsHtml += `<div class="hp-other-avatar extra">+${maxMembers - showMax}</div>`;
    }
  }

  // Button HTML
  let btnHtml = '';
  if (showJoinBtn) {
    if (isExpired) {
      btnHtml = `<button class="hp-other-join-btn" disabled>สิ้นสุดแล้ว</button>`;
    } else if (isFull) {
      btnHtml = `<button class="hp-other-join-btn" disabled>เต็มแล้ว</button>`;
    } else {
      btnHtml = `<button class="hp-other-join-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> เข้าร่วม</button>`;
    }
  } else {
    // My trip — expired shows grey "สิ้นสุดแล้ว" button, active trips show no button
    if (isExpired) {
      btnHtml = `<button class="hp-other-join-btn hp-other-view-btn hp-expired-view">สิ้นสุดแล้ว</button>`;
    } else {
      btnHtml = '';
    }
  }

  card.innerHTML = `
    <div class="hp-other-flag">${flagHtml}</div>
    <div class="hp-other-details">
      <div class="hp-other-name">${escapeHtml(trip.name || 'Trip')}</div>
      ${dateText ? `<div class="hp-other-date">${dateText}</div>` : ''}
      ${trip.description ? `<div class="hp-other-desc">${escapeHtml(trip.description)}</div>` : ''}
    </div>
    <div class="hp-other-avatars">${avatarsHtml}</div>
    ${btnHtml}
  `;

  // Card click → open trip detail
  card.addEventListener('click', (e) => {
    if (e.target.closest('.hp-other-join-btn')) return;
    if (showJoinBtn) {
      showJoinConfirmModal(trip);
      return;
    }
    openTripDetail(trip);
  });

  // "ดูข้อมูลทริป" button handler
  if (!showJoinBtn) {
    const viewBtn = card.querySelector('.hp-other-view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTripDetail(trip);
      });
    }
  }

  // Join button handler → show confirmation modal
  if (showJoinBtn && !isExpired && !isFull) {
    const joinBtn = card.querySelector('.hp-other-join-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showJoinConfirmModal(trip, 'itrip');
      });
    }
  }

  return card;
}

// ===== Trip Detail Page =====
let currentDetailTrip = null;
let selectedDetailDay = 'all';
let selectedPlanDay = 'all';
let selectedDetailChip = 'all';
let tripDetailEventsSetup = false;

function openTripDetail(trip) {
  currentDetailTrip = trip;
  selectedDetailDay = 'all';
  selectedPlanDay = 'all';
  selectedDetailChip = 'all';

  const page = document.getElementById('trip-detail-page');
  page.classList.add('active');

  // Update header welcome
  const welcome = document.getElementById('td-header-welcome');
  const profileName = trip.profileName || tripData.profileName || 'User';
  welcome.textContent = `Welcome , ${profileName}`;

  renderTripDetailInfo(trip);
  renderTripDetailDays(trip);
  renderTripDetailExpenses(trip);
  renderTripDetailChips(trip);
  renderTripDetailActivities(trip);
  renderTripDetailPlanDays(trip);
  renderTripDetailPlan(trip);
  setupTripDetailEvents();

  // Reset tabs to expenses
  document.getElementById('td-tab-expenses').classList.add('active');
  document.getElementById('td-tab-plan').classList.remove('active');
  document.getElementById('td-expenses-content').style.display = '';
  document.getElementById('td-plan-days').style.display = 'none';
  document.getElementById('td-plan-content').style.display = 'none';
}

function closeTripDetail() {
  const page = document.getElementById('trip-detail-page');
  page.classList.remove('active');
  currentDetailTrip = null;
}

function renderTripDetailInfo(trip) {
  const container = document.getElementById('td-trip-info');
  const activities = trip.activities || [];

  // Calculate budget / spent / remaining
  const budget = trip.budget ? parseFloat(trip.budget) : 0;
  const totalSpent = activities.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const remaining = budget - totalSpent;

  // Flag / cover
  let flagHtml;
  if (trip.coverImage) {
    flagHtml = `<img src="${trip.coverImage}" alt="">`;
  } else {
    flagHtml = `<span class="flag-emoji">🌍</span>`;
  }

  // Date text + days count
  let metaText = '';
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const dayCount = Math.round((end - start) / 86400000) + 1;
    const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const startStr = `${start.getDate()}-${end.getDate()} ${monthsShort[start.getMonth()]} ${start.getFullYear()}`;
    metaText = `${trip.destination || ''} , ${startStr} (${dayCount} วัน)`;
    if (!trip.destination) {
      metaText = `${start.getDate()}-${end.getDate()} ${monthsShort[start.getMonth()]} ${start.getFullYear()} (${dayCount} วัน)`;
    }
  }

  // Members avatars
  const members = trip.members || [];
  const memberCount = trip.memberCount || 1;
  let avatarsHtml = '';
  const defaultAvatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

  if (members.length > 0) {
    members.slice(0, 3).forEach(m => {
      if (m.image) {
        avatarsHtml += `<div class="td-info-avatar"><img src="${m.image}" alt=""></div>`;
      } else {
        avatarsHtml += `<div class="td-info-avatar">${defaultAvatarSvg}</div>`;
      }
    });
    if (members.length > 3) {
      avatarsHtml += `<div class="td-info-avatar" style="font-size:9px;font-weight:700;color:#2463eb;">+${members.length - 3}</div>`;
    }
  } else {
    const showCount = Math.min(memberCount, 3);
    for (let i = 0; i < showCount; i++) {
      avatarsHtml += `<div class="td-info-avatar">${defaultAvatarSvg}</div>`;
    }
  }

  // Document icon
  const docIconSvg = `<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M3.35288 8.83297C4.00437 6.11037 6.17301 3.98455 8.95043 3.34591C10.9563 2.8847 13.0437 2.8847 15.0496 3.34591C17.827 3.98455 19.9956 6.11038 20.6471 8.83298C21.1176 10.7992 21.1176 12.8455 20.6471 14.8117C19.9956 17.5343 17.827 19.6602 15.0496 20.2988C13.0437 20.76 10.9563 20.76 8.95044 20.2988C6.17301 19.6602 4.00437 17.5343 3.35288 14.8117C2.88237 12.8455 2.88237 10.7992 3.35288 8.83297Z" fill="#363853" fill-opacity="0.15"/><path d="M3.35288 14.8117L4.08229 14.6372C3.63924 12.7857 3.63924 10.859 4.08229 9.00752L3.35288 8.83297L2.62347 8.65843C2.12551 10.7394 2.12551 12.9053 2.62347 14.9863L3.35288 14.8117ZM20.6471 8.83298L19.9177 9.00752C20.3608 10.859 20.3608 12.7857 19.9177 14.6372L20.6471 14.8117L21.3765 14.9863C21.8745 12.9053 21.8745 10.7394 21.3765 8.65844L20.6471 8.83298ZM15.0496 20.2988L14.8815 19.5679C12.9863 20.0036 11.0137 20.0036 9.1185 19.5679L8.95044 20.2988L8.78237 21.0297C10.8988 21.5164 13.1012 21.5164 15.2176 21.0297L15.0496 20.2988ZM8.95043 3.34591L9.1185 4.07684C11.0137 3.64105 12.9863 3.64105 14.8815 4.07684L15.0496 3.34591L15.2176 2.61498C13.1012 2.12834 10.8988 2.12834 8.78237 2.61499L8.95043 3.34591ZM8.95044 20.2988L9.1185 19.5679C6.61229 18.9916 4.66599 17.0765 4.08229 14.6372L3.35288 14.8117L2.62347 14.9863C3.34276 17.9922 5.73374 20.3287 8.78237 21.0297L8.95044 20.2988ZM15.0496 20.2988L15.2176 21.0297C18.2663 20.3287 20.6572 17.9922 21.3765 14.9863L20.6471 14.8117L19.9177 14.6372C19.334 17.0765 17.3877 18.9916 14.8815 19.5679L15.0496 20.2988ZM15.0496 3.34591L14.8815 4.07684C17.3877 4.65311 19.334 6.56823 19.9177 9.00752L20.6471 8.83298L21.3765 8.65844C20.6572 5.65253 18.2663 3.31598 15.2176 2.61498L15.0496 3.34591ZM8.95043 3.34591L8.78237 2.61499C5.73373 3.31598 3.34276 5.65252 2.62347 8.65843L3.35288 8.83297L4.08229 9.00752C4.66599 6.56823 6.61228 4.65311 9.1185 4.07684L8.95043 3.34591ZM14.0805 21H14.8305C14.8305 19.5363 14.8322 18.5154 14.9378 17.7451C15.0403 16.998 15.2278 16.5993 15.5196 16.3132L14.9946 15.7776L14.4696 15.242C13.8474 15.852 13.5778 16.6223 13.4518 17.5413C13.3289 18.4372 13.3305 19.5795 13.3305 21H14.0805ZM20.3222 14.8816V14.1316C18.8718 14.1316 17.7101 14.13 16.7998 14.25C15.8695 14.3726 15.0897 14.6341 14.4696 15.242L14.9946 15.7776L15.5196 16.3132C15.8135 16.0251 16.2264 15.8385 16.9958 15.7371C17.7852 15.6331 18.8302 15.6316 20.3222 15.6316V14.8816Z" fill="#363853"/><path d="M9 9H12M9 12H14" stroke="#363853" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  // Spent display with minus prefix
  const spentDisplay = totalSpent > 0 ? `-${formatBudgetDisplay(totalSpent)}` : '0';

  // Render flag into separate element (outside scroll area, won't be clipped)
  const flagEl = document.getElementById('td-trip-flag');
  if (flagEl) flagEl.innerHTML = flagHtml;

  container.innerHTML = `
    <div class="td-trip-top">
      <div class="td-trip-details">
        <span class="td-trip-name">${escapeHtml(trip.name || 'Trip')}</span>
        <span class="td-trip-meta">${escapeHtml(metaText)}</span>
      </div>
      <button class="td-trip-more">⋯</button>
    </div>
    ${trip.description ? `<div class="td-trip-desc">${escapeHtml(trip.description)}</div>` : ''}
    <div class="td-info-row">
      <div class="td-info-item td-info-members" style="cursor:pointer;">
        <div class="td-info-avatars">${avatarsHtml}</div>
        <span class="td-info-label">ผู้ร่วมเดินทาง</span>
      </div>
      <div class="td-info-item">
        <div class="td-info-icon">${docIconSvg}</div>
        <span class="td-info-label">เอกสาร</span>
      </div>
      <div class="td-info-item">
        <span class="td-info-value budget">${formatBudgetDisplay(budget)}</span>
        <span class="td-info-label">งบทั้งหมด</span>
      </div>
      <div class="td-info-item">
        <span class="td-info-value spent">${spentDisplay}</span>
        <span class="td-info-label">เงินที่ใช้ไป</span>
      </div>
      <div class="td-info-item">
        <span class="td-info-value remaining">${formatBudgetDisplay(remaining)}</span>
        <span class="td-info-label">คงเหลือ</span>
      </div>
    </div>
  `;

  // Click handler for members
  const membersEl = container.querySelector('.td-info-members');
  if (membersEl) {
    membersEl.addEventListener('click', () => openMembersSheet(trip));
  }

  // Click handler for 3-dot more button
  const moreBtn = container.querySelector('.td-trip-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      openTripActionSheet(trip, isTripOwner(trip));
    });
  }
}

function openMembersSheet(trip) {
  const modal = document.getElementById('members-modal');
  renderMembersSheetList(trip);
  modal.classList.add('active');

  // Close button
  const closeBtn = document.getElementById('members-modal-close');
  const closeHandler = () => {
    modal.classList.remove('active');
    closeBtn.removeEventListener('click', closeHandler);
  };
  closeBtn.addEventListener('click', closeHandler);

  // Close on backdrop click
  const backdropHandler = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      modal.removeEventListener('click', backdropHandler);
    }
  };
  modal.addEventListener('click', backdropHandler);
}

function renderMembersSheetList(trip) {
  const list = document.getElementById('members-sheet-list');
  const members = trip.members || [];
  const defaultAvatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  const trashSvg = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 7.03H19V12.18C19 13.75 18.78 15.32 18.34 16.83C17.74 18.92 16.01 20.47 13.88 20.83L13.72 20.86C12.58 21.05 11.42 21.05 10.28 20.86L10.12 20.83C8 20.47 6.26 18.92 5.66 16.83C5.22 15.32 5 13.75 5 12.18V7.03Z" fill="#E62E05" fill-opacity="0.15"/><path d="M3 7.03H21" stroke="#E62E05" stroke-linecap="round"/><path d="M5 7.03V12.18C5 13.75 5.22 15.32 5.66 16.83C6.26 18.92 8 20.47 10.12 20.83L10.28 20.86C11.42 21.05 12.58 21.05 13.72 20.86L13.88 20.83C16.01 20.47 17.74 18.92 18.34 16.83C18.78 15.32 19 13.75 19 12.18V7.03" stroke="#E62E05" stroke-linecap="round"/><path d="M8 7.03C8 5.8 8.85 3.5 12 3.5C15.15 3.5 16 5.8 16 7.03" stroke="#E62E05" stroke-linecap="round"/><path d="M10 12V16M14 12V16" stroke="#E62E05" stroke-linecap="round"/></svg>`;

  // Include trip creator as first member
  let allMembers = [];
  if (trip.profileName) {
    allMembers.push({ name: trip.profileName, image: trip.profileImage || '', isCreator: true });
  }
  members.forEach(m => {
    if (m.name !== trip.profileName) {
      allMembers.push({ name: m.name, image: m.image || '', isCreator: false });
    }
  });

  if (allMembers.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:#a3a3a3;padding:24px;font-size:14px;">ยังไม่มีผู้ร่วมทริป</div>';
    return;
  }

  list.innerHTML = '';
  allMembers.forEach((member, idx) => {
    if (idx > 0) {
      const divider = document.createElement('div');
      divider.className = 'member-row-divider';
      list.appendChild(divider);
    }

    const row = document.createElement('div');
    row.className = 'member-row';

    const avatarHtml = member.image
      ? `<img src="${member.image}" alt="">`
      : defaultAvatarSvg;

    row.innerHTML = `
      <div class="member-row-avatar">${avatarHtml}</div>
      <span class="member-row-name">${escapeHtml(member.name)}${member.isCreator ? ' (เจ้าของทริป)' : ''}</span>
      ${!member.isCreator ? `<button class="member-row-delete" title="ลบ">${trashSvg}</button>` : ''}
    `;

    // Delete handler for non-creator members
    if (!member.isCreator) {
      const deleteBtn = row.querySelector('.member-row-delete');
      deleteBtn.addEventListener('click', () => {
        if (confirm(`ลบ ${member.name} ออกจากทริปนี้?`)) {
          removeMemberFromTrip(trip, member.name);
          renderMembersSheetList(trip);
          renderTripDetailInfo(trip);
        }
      });
    }

    list.appendChild(row);
  });
}

function removeMemberFromTrip(trip, memberName) {
  trip.members = (trip.members || []).filter(m => m.name !== memberName);

  // Save to storage (read directly — getTrips() returns a Promise)
  const trips = JSON.parse(localStorage.getItem('votagex_trips') || '[]');
  const tripIndex = trips.findIndex(t => t.id === trip.id);
  if (tripIndex !== -1) {
    trips[tripIndex] = trip;
    localStorage.setItem('votagex_trips', JSON.stringify(trips));
  }
}

function formatBudgetDisplay(amount) {
  if (amount === 0) return '0';
  if (Math.abs(amount) >= 1000) {
    const k = amount / 1000;
    return (k % 1 === 0 ? k : k.toFixed(1)) + 'k';
  }
  return amount.toLocaleString();
}

function renderTripDetailDays(trip) {
  const container = document.getElementById('td-days');
  container.innerHTML = '';

  if (!trip.startDate || !trip.endDate) return;

  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const activities = trip.activities || [];
  const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // "All" card
  const totalAll = activities.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const allCard = document.createElement('div');
  allCard.className = 'td-day-card' + (selectedDetailDay === 'all' ? ' active' : '');
  allCard.innerHTML = `
    <div class="td-day-top">
      <span class="td-day-label">ทั้งหมด</span>
      <span class="td-day-total${totalAll > 0 ? ' has-expense' : ''}">${formatBudgetDisplay(totalAll)}</span>
    </div>
    <div class="td-day-top">
      <span class="td-day-date">All Days</span>
      <span class="td-day-total-label">รวม</span>
    </div>
  `;
  allCard.addEventListener('click', () => {
    selectedDetailDay = 'all';
    renderTripDetailDays(trip);
    renderTripDetailExpenses(trip);
    renderTripDetailActivities(trip);
  });
  container.appendChild(allCard);

  // Day cards
  let dayNum = 1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatISODate(d);
    const dayActivities = activities.filter(a => activityMatchesDate(a, dateStr));
    const dayTotal = dayActivities.reduce((s, a) => s + getActivityAmountForDay(a), 0);
    const dateLabel = `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;

    const card = document.createElement('div');
    card.className = 'td-day-card' + (selectedDetailDay === dateStr ? ' active' : '');
    card.innerHTML = `
      <div class="td-day-top">
        <span class="td-day-label">Day ${dayNum}</span>
        <span class="td-day-total${dayTotal > 0 ? ' has-expense' : ''}">${formatBudgetDisplay(dayTotal)}</span>
      </div>
      <div class="td-day-top">
        <span class="td-day-date">${dateLabel}</span>
        <span class="td-day-total-label">รวม</span>
      </div>
    `;
    card.addEventListener('click', () => {
      selectedDetailDay = dateStr;
      renderTripDetailDays(trip);
      renderTripDetailExpenses(trip);
      renderTripDetailActivities(trip);
    });
    container.appendChild(card);
    dayNum++;
  }
}

function getDetailDayActivities(trip) {
  const activities = trip.activities || [];
  if (selectedDetailDay === 'all') return activities;
  return activities.filter(a => activityMatchesDate(a, selectedDetailDay));
}

function renderTripDetailExpenses(trip) {
  const container = document.getElementById('td-expense-card');
  const dayActivities = getDetailDayActivities(trip);

  // Calculate per-category totals
  const catTotals = {};
  Object.keys(CATEGORY_CONFIG).forEach(key => { catTotals[key] = 0; });

  dayActivities.forEach(a => {
    const cat = a.category || 'other';
    const amt = (selectedDetailDay !== 'all' && a.category === 'hotel') ? getActivityAmountForDay(a) : (parseFloat(a.amount) || 0);
    catTotals[cat] = (catTotals[cat] || 0) + amt;
  });

  // Row 1: 2 items, Row 2: 4 items (matching Figma layout)
  const row1Cats = ['hotel', 'shopping'];
  const row2Cats = ['food', 'place', 'travel', 'other'];

  function buildItem(cat) {
    const cfg = CATEGORY_CONFIG[cat];
    const val = catTotals[cat] || 0;
    return `
      <div class="td-expense-item">
        <span class="td-expense-value${val > 0 ? ' has-expense' : ''}">${formatBudgetDisplay(val)}</span>
        <div class="td-expense-cat">
          <span class="td-expense-cat-icon">${cfg.icon}</span>
          <span class="td-expense-cat-label">${cfg.label}</span>
        </div>
      </div>
    `;
  }

  const row1Html = row1Cats.map(buildItem).join('');
  const row2Html = row2Cats.map(buildItem).join('');
  const titleText = selectedDetailDay === 'all' ? 'สรุปค่าใช้จ่ายทั้งหมด' : 'สรุปค่าใช้จ่ายรายวัน';

  container.innerHTML = `
    <span class="td-expense-title">${titleText}</span>
    <div class="td-expense-rows">
      <div class="td-expense-row">${row1Html}</div>
      <div class="td-expense-row">${row2Html}</div>
    </div>
    <div class="td-expense-bg"><img src="assets/coins.png" alt="" onerror="this.parentElement.style.display='none'"></div>
  `;
}

function renderTripDetailChips(trip) {
  const container = document.getElementById('td-chips');
  container.innerHTML = '';

  // All chip
  const allChip = document.createElement('button');
  allChip.className = 'td-chip' + (selectedDetailChip === 'all' ? ' active' : '');
  allChip.innerHTML = `ทั้งหมด`;
  allChip.addEventListener('click', () => {
    selectedDetailChip = 'all';
    renderTripDetailChips(trip);
    renderTripDetailActivities(trip);
  });
  container.appendChild(allChip);

  // Category chips
  Object.entries(CATEGORY_CONFIG).forEach(([key, cfg]) => {
    const chip = document.createElement('button');
    chip.className = 'td-chip' + (selectedDetailChip === key ? ' active' : '');
    chip.innerHTML = `${cfg.icon} ${cfg.label}`;
    chip.addEventListener('click', () => {
      selectedDetailChip = key;
      renderTripDetailChips(trip);
      renderTripDetailActivities(trip);
    });
    container.appendChild(chip);
  });
}

function renderTripDetailActivities(trip) {
  const container = document.getElementById('td-activity-list');
  let dayActivities = getDetailDayActivities(trip);

  // Filter by chip
  if (selectedDetailChip !== 'all') {
    dayActivities = dayActivities.filter(a => a.category === selectedDetailChip);
  }

  if (dayActivities.length === 0) {
    container.innerHTML = '<div class="td-empty">ไม่มีกิจกรรม</div>';
    return;
  }

  // Group by category (same as registration page)
  const categoryOrder = ['place', 'food', 'shopping', 'hotel', 'travel', 'other'];
  const grouped = {};
  dayActivities.forEach(act => {
    const cat = act.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(act);
  });

  container.innerHTML = '';

  categoryOrder.forEach(cat => {
    if (!grouped[cat] || grouped[cat].length === 0) return;
    const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;

    // Section wrapper
    const section = document.createElement('div');
    section.className = 'activity-section';

    // Section header (icon + label)
    const header = document.createElement('div');
    header.className = 'activity-section-header';
    header.innerHTML = `
      <span class="activity-section-icon">${cfg.icon}</span>
      <span class="activity-section-label">${cfg.label}</span>
    `;
    section.appendChild(header);

    // Horizontal scroll row
    const row = document.createElement('div');
    row.className = 'activity-section-row';

    grouped[cat].forEach(act => {
      const hasExpense = act.amount > 0;
      const card = document.createElement('div');
      card.className = 'act-card' + (hasExpense ? ' has-expense' : '');

      let infoHtml = '';
      if (cat === 'hotel') {
        const dateStr = (act.checkIn && act.checkOut)
          ? `${act.checkIn.slice(5).replace('-', '/')} - ${act.checkOut.slice(5).replace('-', '/')}`
          : (act.time || '--:--');
        const hotelDayAmt = getActivityAmountForDay(act);
        const nights = getHotelNights(act);
        infoHtml = `
          <div class="act-card-info-col">
            <span class="act-card-info-value">${escapeHtml(dateStr)}</span>
            <span class="act-card-info-label">วันเข้าพัก</span>
          </div>
          <div class="act-card-info-col">
            <span class="act-card-info-value spend">${formatSpend(hotelDayAmt)}</span>
            <span class="act-card-info-label">${nights > 0 ? `ต่อคืน (${nights} คืน)` : 'เงินที่ใช้ไป'}</span>
          </div>`;
      } else if (cat === 'travel' || cat === 'other') {
        infoHtml = `
          <div class="act-card-info-col">
            <span class="act-card-info-value spend">${formatSpend(act.amount)}</span>
            <span class="act-card-info-label">เงินที่ใช้ไป</span>
          </div>`;
      } else {
        infoHtml = `
          <div class="act-card-info-col">
            <span class="act-card-info-value">${escapeHtml(act.time || '00:00')}</span>
            <span class="act-card-info-label">เวลา</span>
          </div>
          <div class="act-card-info-col">
            <span class="act-card-info-value spend">${formatSpend(act.amount)}</span>
            <span class="act-card-info-label">เงินที่ใช้ไป</span>
          </div>`;
      }

      const illustHtml = cfg.illust
        ? `<div class="act-card-illust"><img src="${cfg.illust}" alt=""></div>`
        : '';

      card.innerHTML = `
        <div class="act-card-header">
          <span class="act-card-name">${escapeHtml(act.name)}</span>
        </div>
        <div class="act-card-info">${infoHtml}</div>
        ${illustHtml}
      `;

      // Click to open activity detail
      card.addEventListener('click', () => {
        const allActs = trip.activities || [];
        const actIndex = allActs.indexOf(act);
        if (actIndex !== -1) {
          openTripDetailActivity(trip, actIndex);
        }
      });

      row.appendChild(card);
    });

    section.appendChild(row);
    container.appendChild(section);
  });
}

function openTripDetailActivity(trip, index) {
  const act = trip.activities[index];
  if (!act) return;
  const cfg = CATEGORY_CONFIG[act.category] || CATEGORY_CONFIG.other;
  const detailModal = document.getElementById('activity-detail-modal');
  const content = document.getElementById('activity-detail-content');

  const travelIcon = '<svg viewBox="0 0 16 16" fill="none"><path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96695 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7647C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#2463EB" fill-opacity="0.15" stroke="#2463EB"/><path d="M6.78788 7.53066C6.9234 7.19185 7.19185 6.9234 7.53066 6.78788L8.88914 6.24448C9.43334 6.0268 9.9734 6.56685 9.75571 7.11106L9.21232 8.46954C9.0768 8.80834 8.80834 9.0768 8.46954 9.21232L7.11106 9.75571C6.56686 9.9734 6.0268 9.43334 6.24448 8.88914L6.78788 7.53066Z" fill="#2463EB" fill-opacity="0.15" stroke="#2463EB" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const editIcon = '<svg viewBox="0 0 16 16" fill="none"><path d="M8.92421 4.85382L11.3178 2.4602C11.6125 2.16554 12.0121 2 12.4289 2C13.2966 2 14.0001 2.70346 14.0001 3.57123C14.0001 3.98794 13.8345 4.38759 13.5399 4.68225L11.1463 7.07587C10.1057 8.11647 8.80182 8.8547 7.37412 9.21162L6.91149 9.32728C6.76734 9.36332 6.63677 9.23274 6.6728 9.08859L6.78846 8.62596C7.14539 7.19827 7.88361 5.89442 8.92421 4.85382Z" fill="#363853" fill-opacity="0.15"/><path d="M13.6297 4.59239C12.5187 4.96274 11.0373 3.48137 11.4077 2.37034M11.3178 2.4602L8.92421 4.85382C7.88361 5.89442 7.14539 7.19827 6.78846 8.62596L6.6728 9.08859C6.63677 9.23274 6.76734 9.36332 6.91149 9.32728L7.37412 9.21162C8.80182 8.8547 10.1057 8.11647 11.1463 7.07587L13.5399 4.68225C13.8345 4.38759 14.0001 3.98794 14.0001 3.57123C14.0001 2.70346 13.2966 2 12.4289 2C12.0121 2 11.6125 2.16554 11.3178 2.4602Z" stroke="#363853"/><path d="M8 2C7.31778 2 6.63556 2.07842 5.96696 2.23525C4.11534 2.66958 2.66958 4.11534 2.23525 5.96695C1.92158 7.30417 1.92158 8.69583 2.23525 10.033C2.66958 11.8847 4.11534 13.3304 5.96696 13.7648C7.30417 14.0784 8.69583 14.0784 10.033 13.7648C11.8847 13.3304 13.3304 11.8847 13.7648 10.033C13.9216 9.36443 14 8.68221 14 7.99998" stroke="#363853" stroke-linecap="round"/></svg>';
  const deleteIcon = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7.03H19V12.18C19 13.75 18.78 15.32 18.34 16.83C17.74 18.92 16.01 20.47 13.88 20.83L13.72 20.86C12.58 21.05 11.42 21.05 10.28 20.86L10.12 20.83C8 20.47 6.26 18.92 5.66 16.83C5.22 15.32 5 13.75 5 12.18V7.03Z" fill="#E62E05" fill-opacity="0.15"/><path d="M3 7.03H21" stroke="#E62E05" stroke-linecap="round"/><path d="M5 7.03V12.18C5 13.75 5.22 15.32 5.66 16.83C6.26 18.92 8 20.47 10.12 20.83L10.28 20.86C11.42 21.05 12.58 21.05 13.72 20.86L13.88 20.83C16.01 20.47 17.74 18.92 18.34 16.83C18.78 15.32 19 13.75 19 12.18V7.03" stroke="#E62E05" stroke-linecap="round"/><path d="M8 7.03C8 5.8 8.85 3.5 12 3.5C15.15 3.5 16 5.8 16 7.03" stroke="#E62E05" stroke-linecap="round"/><path d="M10 12V16M14 12V16" stroke="#E62E05" stroke-linecap="round"/></svg>';
  const clockIcon = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" fill="#363853" fill-opacity=".15" stroke="#0A296B" stroke-width="1.5"/><path d="M12 8v5l3 3" stroke="#0A296B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const currencySymbols = { JPY: '¥', USD: '$', EUR: '€', GBP: '£', KRW: '₩', CNY: '¥', AUD: '$', SGD: '$' };

  let timeHtml = '';
  if (cfg.hasTime && !cfg.hasDate) {
    timeHtml = `
      <div class="detail-info-card">
        <span class="detail-info-label">เวลา</span>
        <div class="detail-info-value${!act.time ? ' empty' : ''}">${clockIcon} ${act.time ? escapeHtml(act.time) : 'ไม่ระบุ'}</div>
      </div>`;
  }

  let hotelHtml = '';
  if (cfg.hasDate) {
    hotelHtml = `
      <div class="detail-info-card">
        <span class="detail-info-label">เวลาเช็คอิน</span>
        <div class="detail-info-value${!act.time ? ' empty' : ''}">${clockIcon} ${act.time ? escapeHtml(act.time) : 'ไม่ระบุ'}</div>
      </div>
      <div class="detail-info-card">
        <span class="detail-info-label">วันเข้าพัก</span>
        <div class="detail-info-value${(!act.checkIn && !act.checkOut) ? ' empty' : ''}">${act.checkIn ? formatDateThai(act.checkIn) : '--'} - ${act.checkOut ? formatDateThai(act.checkOut) : '--'}</div>
      </div>`;
  }

  let expenseHtml = '';
  if (cfg.hasAmount) {
    const cur = act.targetCurrency || 'JPY';
    const symbol = currencySymbols[cur] || '';
    const converted = act.targetCurrency && act.amount > 0 ? convertCurrency(act.amount, act.targetCurrency) : '';
    expenseHtml = `
      <div class="detail-info-card">
        <span class="detail-info-label">จำนวนเงินที่ใช้ไป</span>
        <div class="modal-expense-details">
          <div class="modal-expense-row">
            <span style="${act.amount > 0 ? 'color: var(--text)' : ''}">${act.amount > 0 ? act.amount.toLocaleString() : '0'}</span>
            <span>THB (฿)</span>
          </div>
          <div class="modal-swap-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 10.0909H19L13.1604 5" stroke="#363853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 13.9091L5 13.9091L10.8396 19" stroke="#363853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="modal-expense-row">
            <span style="${converted ? 'color: var(--text)' : ''}">${converted || '0'}</span>
            <span>${cur} (${symbol})</span>
          </div>
        </div>
      </div>`;
  }

  content.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-row">
        <span class="detail-title">${escapeHtml(act.name)}</span>
        <button class="modal-close-btn" id="detail-close">
          <svg viewBox="0 0 32 32" fill="none" width="24" height="24"><path d="M19.1921 12.793L12.8027 19.1823" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.1998 19.1908L12.7998 12.7908" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M3.6665 16.0001C3.6665 25.2494 6.7505 28.3334 15.9998 28.3334C25.2492 28.3334 28.3332 25.2494 28.3332 16.0001C28.3332 6.75075 25.2492 3.66675 15.9998 3.66675C6.7505 3.66675 3.6665 6.75075 3.6665 16.0001Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <p class="detail-desc">${escapeHtml(act.description || cfg.defaultDesc || '')}</p>
      <div class="detail-categories">
        <div class="detail-cat-item">
          <span class="detail-cat-icon">${cfg.icon}</span>
          <span class="detail-cat-label">ประเภท</span>
        </div>
        ${act.travelLink ? `
        <a href="${escapeHtml(act.travelLink)}" target="_blank" class="detail-cat-item clickable" style="text-decoration:none;">
          <span class="detail-cat-icon">${travelIcon}</span>
          <span class="detail-cat-label">เดินทาง</span>
        </a>` : `
        <div class="detail-cat-item">
          <span class="detail-cat-icon">${travelIcon}</span>
          <span class="detail-cat-label">เดินทาง</span>
        </div>`}
        <div class="detail-action-item" id="detail-edit">
          <span class="detail-action-icon">${editIcon}</span>
          <span class="detail-action-label">แก้ไข</span>
        </div>
        <div class="detail-action-item delete" id="detail-delete">
          <span class="detail-action-icon">${deleteIcon}</span>
          <span class="detail-action-label">ลบรายการ</span>
        </div>
      </div>
    </div>
    <div class="detail-scroll">
      ${timeHtml}
      ${hotelHtml}
      ${expenseHtml}
    </div>
    <div class="detail-bottom">
      <button class="btn-gradient-save" id="detail-save-btn">ปิด</button>
    </div>
  `;

  // Close button
  content.querySelector('#detail-close').addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  // Edit button - open modal pre-filled with all saved data
  content.querySelector('#detail-edit').addEventListener('click', () => {
    detailModal.classList.remove('active');
    // Set tripData temporarily so the modal can work
    tripData.activities = trip.activities;
    tripData.startDate = trip.startDate;
    tripData.endDate = trip.endDate;
    editingActivityIndex = index;
    selectedCategory = act.category || 'place';
    const chipGroup = document.getElementById('category-chips');
    chipGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const targetChip = chipGroup.querySelector(`[data-cat="${selectedCategory}"]`);
    if (targetChip) targetChip.classList.add('active');
    renderModalFields();

    // Fill all fields
    document.getElementById('activity-name').value = act.name || '';

    const timeEl = document.getElementById('activity-time');
    if (timeEl) timeEl.value = act.time || '';

    const amountEl = document.getElementById('activity-amount');
    if (amountEl) amountEl.value = act.amount ? formatNumberComma(act.amount) : '';

    const currencyEl = document.getElementById('activity-currency');
    if (currencyEl) currencyEl.value = act.targetCurrency || 'JPY';

    const foreignEl = document.getElementById('activity-foreign-amount');
    if (foreignEl && act.amount && currencyEl) {
      foreignEl.value = formatNumberComma(convertCurrency(act.amount, currencyEl.value));
    }

    const descEl = document.getElementById('activity-description');
    if (descEl) descEl.value = act.description || '';

    const linkEl = document.getElementById('activity-travel-link');
    if (linkEl) linkEl.value = act.travelLink || '';

    // Restore selected day
    if (act.tripDay) {
      const dayChips = document.querySelectorAll('#day-selector .day-chip');
      dayChips.forEach(c => c.classList.remove('active'));
      const dayChip = document.querySelector(`#day-selector .day-chip[data-date="${act.tripDay}"]`);
      if (dayChip) dayChip.classList.add('active');
    }

    // Hotel fields - restore check-in/check-out day chips
    if (act.checkIn) {
      const checkinChip = document.querySelector(`#checkin-day-selector .day-chip[data-date="${act.checkIn}"]`);
      if (checkinChip) checkinChip.classList.add('active');
    }
    if (act.checkOut) {
      const checkoutChip = document.querySelector(`#checkout-day-selector .day-chip[data-date="${act.checkOut}"]`);
      if (checkoutChip) checkoutChip.classList.add('active');
    }

    document.getElementById('activity-modal').classList.add('active');
  });

  // Delete button
  content.querySelector('#detail-delete').addEventListener('click', () => {
    if (confirm('ต้องการลบกิจกรรมนี้?')) {
      trip.activities.splice(index, 1);
      // Save to storage
      const trips = getTrips();
      const tripIndex = trips.findIndex(t => t.id === trip.id);
      if (tripIndex !== -1) {
        trips[tripIndex] = trip;
        localStorage.setItem('votagex_trips', JSON.stringify(trips));
      }
      detailModal.classList.remove('active');
      // Re-render trip detail
      renderTripDetailExpenses(trip);
      renderTripDetailActivities(trip);
      renderTripDetailDays(trip);
      renderTripDetailPlanDays(trip);
      renderTripDetailPlan(trip);
      renderTripDetailInfo(trip);
    }
  });

  // Save/close button
  content.querySelector('#detail-save-btn').addEventListener('click', () => {
    detailModal.classList.remove('active');
  });

  detailModal.classList.add('active');
}

function renderTripDetailPlanDays(trip) {
  const container = document.getElementById('td-plan-days');
  container.innerHTML = '';

  if (!trip.startDate || !trip.endDate) return;

  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const activities = trip.activities || [];
  const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // "All" card — same data as expenses tab
  const totalAll = activities.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const allCard = document.createElement('div');
  allCard.className = 'td-day-card' + (selectedPlanDay === 'all' ? ' active' : '');
  allCard.innerHTML = `
    <div class="td-day-top">
      <span class="td-day-label">ทั้งหมด</span>
      <span class="td-day-total${totalAll > 0 ? ' has-expense' : ''}">${formatBudgetDisplay(totalAll)}</span>
    </div>
    <div class="td-day-top">
      <span class="td-day-date">All Days</span>
      <span class="td-day-total-label">รวม</span>
    </div>
  `;
  allCard.addEventListener('click', () => {
    selectedPlanDay = 'all';
    renderTripDetailPlanDays(trip);
    renderTripDetailPlan(trip);
  });
  container.appendChild(allCard);

  // Day cards — same data as expenses tab
  let dayNum = 1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatISODate(d);
    const dayActivities = activities.filter(a => activityMatchesDate(a, dateStr));
    const dayTotal = dayActivities.reduce((s, a) => s + getActivityAmountForDay(a), 0);
    const dateLabel = `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;

    const card = document.createElement('div');
    card.className = 'td-day-card' + (selectedPlanDay === dateStr ? ' active' : '');
    card.innerHTML = `
      <div class="td-day-top">
        <span class="td-day-label">Day ${dayNum}</span>
        <span class="td-day-total${dayTotal > 0 ? ' has-expense' : ''}">${formatBudgetDisplay(dayTotal)}</span>
      </div>
      <div class="td-day-top">
        <span class="td-day-date">${dateLabel}</span>
        <span class="td-day-total-label">รวม</span>
      </div>
    `;
    card.addEventListener('click', () => {
      selectedPlanDay = dateStr;
      renderTripDetailPlanDays(trip);
      renderTripDetailPlan(trip);
    });
    container.appendChild(card);
    dayNum++;
  }
}

function renderTripDetailPlan(trip) {
  const container = document.getElementById('td-schedule');
  const allActivities = trip.activities || [];

  // Filter by selected plan day
  const activities = selectedPlanDay === 'all'
    ? allActivities
    : allActivities.filter(a => activityMatchesDate(a, selectedPlanDay));

  if (activities.length === 0) {
    container.innerHTML = '<div class="hp-schedule-empty">ไม่มีกิจกรรม</div>';
    return;
  }

  // Sort activities by tripDay then time
  const getActDay = (a) => a.tripDay || a.checkIn || '';
  const sorted = [...activities].sort((a, b) => {
    const da = getActDay(a);
    const db = getActDay(b);
    if (da !== db) return da.localeCompare(db);
    const ta = a.time || '00:00';
    const tb = b.time || '00:00';
    return ta.localeCompare(tb);
  });

  container.innerHTML = '';
  const monthsShortSch = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  let lastDay = null;
  // Find dayNum mapping from trip days
  const tripDaysMap = {};
  const tripDaysList = getTripDays();
  tripDaysList.forEach(td => { tripDaysMap[td.date] = td.dayNum; });

  sorted.forEach((act, idx) => {
    const cfg = CATEGORY_CONFIG[act.category] || CATEGORY_CONFIG.other;
    const status = getActivityStatus(act);
    const actDay = getActDay(act);

    // Insert date header when day changes (only in "all" mode)
    if (selectedPlanDay === 'all' && actDay && actDay !== lastDay) {
      lastDay = actDay;
      const d = new Date(actDay);
      const dayNum = tripDaysMap[actDay] || '';
      const dateLabel = `${d.getDate()} ${monthsShortSch[d.getMonth()]} ${d.getFullYear()}`;
      const header = document.createElement('div');
      header.className = 'hp-schedule-day-header';
      header.innerHTML = `<span class="hp-schedule-day-num">Day ${dayNum}</span><span class="hp-schedule-day-date">${dateLabel}</span>`;
      container.appendChild(header);
    }

    const item = document.createElement('div');
    item.className = 'hp-schedule-item';

    let circleClass = 'pending';
    if (status === 'checked-in') circleClass = 'checked-in';
    else if (status === 'missed') circleClass = 'missed';
    else if (act.category === 'hotel') circleClass = 'default';

    item.innerHTML = `
      <div class="hp-status-circle ${circleClass}">${cfg.icon}</div>
      <div class="hp-schedule-info">
        <span class="hp-schedule-name">${escapeHtml(act.name)}</span>
        <span class="hp-schedule-detail-link" data-act-index="${act._origIndex != null ? act._origIndex : idx}">Check in</span>
      </div>
      <span class="hp-schedule-time">${act.time || '--:--'}</span>
    `;

    container.appendChild(item);

    if (idx < sorted.length - 1) {
      const nextDay = getActDay(sorted[idx + 1]);
      // Skip divider line if next item will have a date header
      if (!(selectedPlanDay === 'all' && nextDay !== actDay)) {
        const divider = document.createElement('div');
        divider.className = 'hp-schedule-divider';
        divider.innerHTML = '<div class="hp-schedule-divider-line"></div>';
        container.appendChild(divider);
      }
    }
  });
}

function setupTripDetailEvents() {
  if (tripDetailEventsSetup) return;
  tripDetailEventsSetup = true;

  // Close button
  document.getElementById('td-close').addEventListener('click', closeTripDetail);

  // Scroll: collapse header/description + sticky shadow
  const tdScroll = document.querySelector('#trip-detail-page .td-scroll');
  const tabsWrapper = document.querySelector('.td-tabs-wrapper');
  const detailContainer = document.querySelector('.trip-detail-container');
  const tripInfoEl = document.getElementById('td-trip-info');

  if (tdScroll && tabsWrapper && detailContainer) {
    let descCollapsed = false;
    let headerCollapsed = false;

    // Set initial tabs top position below trip-info
    if (tripInfoEl) {
      tabsWrapper.style.top = tripInfoEl.offsetHeight + 'px';
    }

    tdScroll.addEventListener('scroll', () => {
      const s = tdScroll.scrollTop;

      // Phase 1: collapse description (hysteresis to prevent flicker)
      if (!descCollapsed && s > 40) {
        descCollapsed = true;
        detailContainer.classList.add('desc-collapsed');
      } else if (descCollapsed && s < 5) {
        descCollapsed = false;
        detailContainer.classList.remove('desc-collapsed');
      }

      // Phase 2: collapse header + flag (hysteresis)
      if (!headerCollapsed && s > 120) {
        headerCollapsed = true;
        detailContainer.classList.add('header-collapsed');
      } else if (headerCollapsed && s < 15) {
        headerCollapsed = false;
        detailContainer.classList.remove('header-collapsed');
      }

      // Sticky shadow on tabs
      if (s > 10) {
        tabsWrapper.classList.add('sticky');
      } else {
        tabsWrapper.classList.remove('sticky');
      }

      // Keep tabs below sticky trip-info
      if (tripInfoEl) {
        tabsWrapper.style.top = tripInfoEl.offsetHeight + 'px';
      }
    });
  }

  // Tab switching
  const tabExpenses = document.getElementById('td-tab-expenses');
  const tabPlan = document.getElementById('td-tab-plan');
  const expensesContent = document.getElementById('td-expenses-content');
  const planContent = document.getElementById('td-plan-content');
  const planDays = document.getElementById('td-plan-days');

  tabExpenses.addEventListener('click', () => {
    tabExpenses.classList.add('active');
    tabPlan.classList.remove('active');
    planContent.classList.remove('td-tab-visible');
    planContent.classList.add('td-tab-hidden');
    planDays.style.display = 'none';
    setTimeout(() => {
      planContent.style.display = 'none';
      expensesContent.style.display = '';
      expensesContent.classList.remove('td-tab-hidden');
      expensesContent.classList.add('td-tab-visible');
    }, 200);
  });

  tabPlan.addEventListener('click', () => {
    tabPlan.classList.add('active');
    tabExpenses.classList.remove('active');
    expensesContent.classList.remove('td-tab-visible');
    expensesContent.classList.add('td-tab-hidden');
    setTimeout(() => {
      expensesContent.style.display = 'none';
      planDays.style.display = '';
      planContent.style.display = '';
      planContent.classList.remove('td-tab-hidden');
      planContent.classList.add('td-tab-visible');
    }, 200);
  });

  // Add activity button (expenses tab)
  document.getElementById('td-add-activity').addEventListener('click', () => {
    editingActivityIndex = -1;
    selectedCategory = 'place';
    const chipGroup = document.getElementById('category-chips');
    chipGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipGroup.querySelector('[data-cat="place"]').classList.add('active');
    renderModalFields();
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-description').value = '';
    document.getElementById('activity-modal').classList.add('active');
  });

  // Add activity button (plan tab)
  document.getElementById('td-plan-add-activity').addEventListener('click', () => {
    editingActivityIndex = -1;
    selectedCategory = 'place';
    const chipGroup = document.getElementById('category-chips');
    chipGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipGroup.querySelector('[data-cat="place"]').classList.add('active');
    renderModalFields();
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-description').value = '';
    document.getElementById('activity-modal').classList.add('active');
  });
}

// ===== ME (Profile) Page =====
let mePageEventsSetup = false;

function setupMePageEvents() {
  if (mePageEventsSetup) return;
  mePageEventsSetup = true;

  // Tab bar navigation (ME page tabs)
  document.querySelectorAll('#me-page .hp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (target !== 'profile') navigateToTab(target);
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('me-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        signOutUser().then(() => {
          console.log('User signed out');
        }).catch(err => {
          console.error('Sign out error:', err);
        });
      }
    });
  }
}

function renderMePage() {
  const welcome = document.getElementById('me-welcome');
  const avatar = document.getElementById('me-avatar');
  const authUser = getStoredAuthUser();

  let profileName, profileImage;
  if (authUser) {
    profileName = authUser.displayName || 'User';
    profileImage = authUser.photoURL || null;
  } else {
    profileName = (currentHomepageTrip && currentHomepageTrip.profileName) || tripData.profileName || 'User';
    profileImage = null;
  }

  welcome.textContent = `Welcome , ${profileName}`;

  if (avatar && profileImage) {
    avatar.innerHTML = `<img src="${profileImage}" alt="${escapeHtml(profileName)}" style="width:100%;height:100%;object-fit:cover;">`;
  }

  // Show/hide logout button
  const logoutBtn = document.getElementById('me-logout-btn');
  if (logoutBtn) {
    logoutBtn.style.display = isFirebaseConfigured() && getCurrentUser() ? 'flex' : 'none';
  }

  // Show email if available
  const emailEl = document.getElementById('me-user-email');
  if (emailEl && authUser && authUser.email) {
    emailEl.textContent = authUser.email;
    emailEl.style.display = 'block';
  } else if (emailEl) {
    emailEl.style.display = 'none';
  }
}

// ===== Auth Gate =====
function initAuthGate() {
  const landingButtons = document.getElementById('landing-buttons');
  const landingLogin = document.getElementById('landing-login');
  const signinBtn = document.getElementById('btn-google-signin-landing');
  const accountPill = document.getElementById('landing-account-pill');
  const accountAvatar = document.getElementById('landing-account-avatar');
  const accountName = document.getElementById('landing-account-name');

  function showLoggedIn(userData) {
    if (landingButtons) landingButtons.style.display = 'flex';
    if (landingLogin) landingLogin.style.display = 'none';
    if (accountPill) {
      accountPill.style.display = 'flex';
      if (accountName) accountName.textContent = userData.displayName || 'Google Account';
      if (accountAvatar && userData.photoURL) {
        accountAvatar.innerHTML = `<img src="${userData.photoURL}" alt="">`;
      }
    }
  }

  function showLoggedOut() {
    if (landingButtons) landingButtons.style.display = 'none';
    if (landingLogin) landingLogin.style.display = 'flex';
    if (accountPill) accountPill.style.display = 'none';
  }

  // Firebase not configured → show Create/Join, hide login & account pill
  if (!isFirebaseConfigured()) {
    if (landingButtons) landingButtons.style.display = 'flex';
    if (landingLogin) landingLogin.style.display = 'none';
    if (accountPill) accountPill.style.display = 'none';
    return;
  }

  // Firebase configured → start with login visible
  showLoggedOut();

  // Google Sign-in button
  if (signinBtn) {
    signinBtn.addEventListener('click', () => {
      signinBtn.disabled = true;
      signinBtn.classList.add('loading');

      signInWithGoogle()
        .then(user => {
          console.log('Google sign-in successful:', user.displayName);
        })
        .catch(err => {
          console.error('Google sign-in error:', err);
          signinBtn.disabled = false;
          signinBtn.classList.remove('loading');

          if (err.code === 'auth/popup-closed-by-user') {
            // User closed popup, do nothing
          } else if (err.code === 'auth/popup-blocked') {
            alert('ป๊อปอัพถูกบล็อก กรุณาอนุญาตป๊อปอัพสำหรับเว็บไซต์นี้');
          } else {
            alert('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
          }
        });
    });
  }

  // Auth state listener
  onAuthStateChange(user => {
    if (user) {
      const userData = storeAuthUserData(user);
      if (userData.displayName) tripData.profileName = userData.displayName;
      if (userData.photoURL) tripData.profileImage = userData.photoURL;

      showLoggedIn(userData);
      prefillProfileFromAuth(userData);
    } else {
      clearAuthUserData();
      if (isFirebaseConfigured()) {
        showLoggedOut();

        // Hide all overlay pages
        const homepage = document.getElementById('homepage');
        const itripPage = document.getElementById('itrip-page');
        const mePage = document.getElementById('me-page');
        if (homepage) homepage.style.display = 'none';
        if (itripPage) itripPage.style.display = 'none';
        if (mePage) mePage.style.display = 'none';

        // Close create trip modal if open
        if (isCreateTripModal) closeCreateTripModal();

        // Show app-container and go to landing page
        const appContainer = document.querySelector('.app-container');
        appContainer.style.display = '';
        appContainer.classList.remove('as-modal', 'open');
        pageView.goTo(0);

        if (signinBtn) {
          signinBtn.disabled = false;
          signinBtn.classList.remove('loading');
        }
      }
    }
  });
}

// ===== Logout Bottom Sheet =====
function setupLogoutSheet() {
  const backdrop = document.getElementById('logout-backdrop');
  const sheet = document.getElementById('logout-sheet');
  const accountPill = document.getElementById('landing-account-pill');
  const logoutBtn = document.getElementById('logout-sheet-btn');

  function openSheet() {
    const authUser = getStoredAuthUser();
    if (authUser) {
      const nameEl = document.getElementById('logout-sheet-name');
      const emailEl = document.getElementById('logout-sheet-email');
      const avatarEl = document.getElementById('logout-sheet-avatar');
      if (nameEl) nameEl.textContent = authUser.displayName || '';
      if (emailEl) emailEl.textContent = authUser.email || '';
      if (avatarEl && authUser.photoURL) {
        avatarEl.innerHTML = `<img src="${authUser.photoURL}" alt="">`;
      }
    }
    if (backdrop) backdrop.classList.add('active');
    if (sheet) sheet.classList.add('active');
  }

  function closeSheet() {
    if (backdrop) backdrop.classList.remove('active');
    if (sheet) sheet.classList.remove('active');
  }

  if (accountPill) accountPill.addEventListener('click', openSheet);
  if (backdrop) backdrop.addEventListener('click', closeSheet);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      closeSheet();
      signOutUser().then(() => {
        console.log('User signed out');
      }).catch(err => {
        console.error('Sign out error:', err);
      });
    });
  }
}

function prefillProfileFromAuth(userData) {
  const profilePreview = document.getElementById('profile-preview');
  const profileName = document.getElementById('profile-name');
  const uploadIconEl = document.getElementById('upload-icon');

  if (userData.displayName && profileName) {
    profileName.value = userData.displayName;
    tripData.profileName = userData.displayName;
    const page4Next = document.getElementById('page4-next');
    if (page4Next) page4Next.disabled = false;
  }

  if (userData.photoURL && profilePreview) {
    profilePreview.src = userData.photoURL;
    profilePreview.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;';
    if (uploadIconEl) uploadIconEl.style.display = 'none';
    tripData.profileImage = userData.photoURL;
  }
}

// ===== Utility =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
