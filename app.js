// State
let allStaff = [];
let allBranches = [];
let campaignConfig = {
  active_topic: 'Cover Plus',
  campaign_period: 'โจทย์ประจำสัปดาห์ / ประจำเดือน ตุลาคม 2026',
  deadline: '2026-10-30',
  rules: 'ทำคลิป TikTok **เน้นพูดรีวิว**ต้องมีการพูดแนะนำ 30–60 วินาที แนะนำสินค้าหรือโปรโมชั่นตามหัวข้อที่กำหนด พร้อมติดแฮชแท็กบังคับให้ครบถ้วน',
  hashtags: '#Studio7 #Com7#Cover Plus',
  topics: [
    '🎧 รีวิวอุปกรณ์เสริม BTB(3rd)',
    'Cover Plus'
  ]
};
let topicCounts = {};
let selectedStaff = null;
let currentBranchFilter = 'all';
let currentTopicFilter = 'Cover Plus';
let hasInitializedTopicFilter = false;
let adminEditingTopics = [];

const FIRST_ROUND_TOPIC = '🎧 รีวิวอุปกรณ์เสริม BTB(3rd)';
const FIRST_ROUND_CUTOFF = new Date('2026-10-21T12:00:00Z').getTime();

// Helper: get a staff member's submission for a specific topic (or latest submission when topicFilter === 'all')
function getStaffTopicSubmission(staff, topicFilter = 'all') {
  if (!staff || !staff.is_submitted || !staff.submission) return null;
  const sub = staff.submission;
  if (!topicFilter || topicFilter === 'all') {
    return sub.tiktok_url ? sub : null;
  }
  if (sub.by_topic && typeof sub.by_topic === 'object' && sub.by_topic[topicFilter]) {
    const entry = sub.by_topic[topicFilter];
    if (entry && entry.tiktok_url) return entry;
  }
  const staffTopic = sub.topic || sub.clip_title || '';
  if (staffTopic === topicFilter && sub.tiktok_url) {
    return sub;
  }
  // Fallback for Round 1 (BTB 3rd) submissions that were overwritten before multi-topic storage was enabled
  if (topicFilter === FIRST_ROUND_TOPIC && sub.tiktok_url) {
    const firstSubmittedTime = new Date(sub.submitted_at || 0).getTime();
    if (firstSubmittedTime > 0 && firstSubmittedTime <= FIRST_ROUND_CUTOFF) {
      return {
        ...sub,
        topic: FIRST_ROUND_TOPIC,
        clip_title: FIRST_ROUND_TOPIC,
        updated_at: sub.submitted_at
      };
    }
  }
  return null;
}

// Merge two submission records on the client side so per-topic history is preserved
function mergeClientRecords(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (incoming.deleted) {
    return new Date(incoming.updated_at || 0) >= new Date(existing.updated_at || 0) ? incoming : existing;
  }
  if (existing.deleted) {
    return new Date(incoming.updated_at || 0) > new Date(existing.updated_at || 0) ? incoming : existing;
  }
  const mergedByTopic = {
    ...(existing.by_topic || {}),
    ...(incoming.by_topic || {})
  };
  for (const [k, v] of Object.entries(existing.by_topic || {})) {
    const inc = (incoming.by_topic || {})[k];
    if (inc && new Date(inc.updated_at || 0) >= new Date(v.updated_at || 0)) {
      mergedByTopic[k] = inc;
    } else {
      mergedByTopic[k] = v;
    }
  }
  const isIncomingNewer = new Date(incoming.updated_at || 0) >= new Date(existing.updated_at || 0);
  const primary = isIncomingNewer ? { ...incoming } : { ...existing };
  primary.by_topic = mergedByTopic;
  return primary;
}

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  // Auto refresh every 15s on both form and dashboard
  setInterval(() => {
    const campaignModal = document.getElementById('campaign-modal');
    const isEditingCampaign = campaignModal && campaignModal.style.display === 'flex';
    if (!isEditingCampaign) {
      fetchData(false);
    }
  }, 15000);

  // Also refresh immediately when user switches back to the browser/LINE tab on mobile
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchData(false);
    }
  });
});

// Switch Tab
function switchTab(tab) {
  const formBtn = document.getElementById('tab-form-btn');
  const dashBtn = document.getElementById('tab-dash-btn');
  const formView = document.getElementById('form-view');
  const dashView = document.getElementById('dash-view');

  if (tab === 'form') {
    formBtn.classList.add('active');
    dashBtn.classList.remove('active');
    formView.classList.add('active');
    dashView.classList.remove('active');
    fetchData(false);
  } else {
    dashBtn.classList.add('active');
    formBtn.classList.remove('active');
    dashView.classList.add('active');
    formView.classList.remove('active');
    fetchData(true);
  }
}

// LocalStorage Backup Keys (protects against ephemeral disk resets on free cloud hosting)
const LS_SUBS_KEY = 's7_tiktok_submissions_backup_v1';
const LS_CAMP_KEY = 's7_tiktok_campaign_backup_v1';

function getLocalSubmissionsBackup() {
  try {
    return JSON.parse(localStorage.getItem(LS_SUBS_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveLocalSubmissionsBackup(subsMap) {
  try {
    localStorage.setItem(LS_SUBS_KEY, JSON.stringify(subsMap || {}));
  } catch (e) {}
}

// Fetch all data (with cache-busting & automatic localStorage backup/restore)
async function fetchData(showIndicator = false) {
  const refreshIcon = document.getElementById('refresh-icon');
  if (showIndicator && refreshIcon) refreshIcon.classList.add('active');

  try {
    const ts = Date.now();
    const fetchOpts = { cache: 'no-store' };
    let [staffRes, branchRes, campRes] = await Promise.all([
      fetch(`/api/staff?_t=${ts}`, fetchOpts).then(r => r.json()),
      fetch(`/api/branches?_t=${ts}`, fetchOpts).then(r => r.json()),
      fetch(`/api/campaign?_t=${ts}`, fetchOpts).then(r => r.json()).catch(() => ({ success: false }))
    ]);

    // Check if local browser backup has any newer submissions that need restoring after a server restart
    if (staffRes.success) {
      const serverRaw = staffRes.raw_submissions || {};
      if (!staffRes.raw_submissions) {
        staffRes.data.forEach(s => {
          if (s.submission) serverRaw[s.emp_id] = s.submission;
        });
      }

      const localSubs = getLocalSubmissionsBackup();
      let needsRestore = false;
      const mergedSubs = { ...serverRaw };

      for (const [empId, localRec] of Object.entries(localSubs)) {
        if (!localRec || !localRec.emp_id) continue;
        const srvRec = serverRaw[empId];
        const merged = mergeClientRecords(srvRec, localRec);
        if (!srvRec || new Date(localRec.updated_at || 0) > new Date(srvRec.updated_at || 0)) {
          mergedSubs[empId] = merged;
          needsRestore = true;
        } else {
          mergedSubs[empId] = merged;
        }
      }

      saveLocalSubmissionsBackup(mergedSubs);

      if (needsRestore) {
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissions: mergedSubs })
          });
          const ts2 = Date.now();
          [staffRes, branchRes, campRes] = await Promise.all([
            fetch(`/api/staff?_t=${ts2}`, fetchOpts).then(r => r.json()),
            fetch(`/api/branches?_t=${ts2}`, fetchOpts).then(r => r.json()),
            fetch(`/api/campaign?_t=${ts2}`, fetchOpts).then(r => r.json()).catch(() => ({ success: false }))
          ]);
        } catch (syncErr) {
          console.warn('Auto-sync skipped:', syncErr);
        }
      }
    }

    if (staffRes.success) allStaff = staffRes.data;
    if (branchRes.success) allBranches = branchRes.data;
    if (campRes && campRes.success) {
      campaignConfig = campRes.data;
      topicCounts = campRes.topic_counts || {};
    }

    // Populate dropdowns & campaign UI
    populateShopDropdowns();
    renderCampaignUI();

    // Render Dashboard
    renderDashboard();

    // Update form profile preview if staff is currently selected
    if (selectedStaff) {
      const refreshed = allStaff.find(s => s.emp_id === selectedStaff.emp_id);
      if (refreshed) updateProfileCard(refreshed);
    }

  } catch (err) {
    console.error('Error fetching data:', err);
    showToast('❌ ไม่สามารถโหลดข้อมูลได้: ' + err.message);
  } finally {
    if (refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove('active'), 500);
    }
  }
}

// Render Campaign Brief Banner & Topic Dropdowns
function renderCampaignUI() {
  // Brief Banner on Form
  const activeTopicEl = document.getElementById('brief-active-topic');
  const deadlineEl = document.getElementById('brief-deadline');
  const rulesEl = document.getElementById('brief-rules');
  const hashtagsEl = document.getElementById('brief-hashtags');
  const dashActiveLabel = document.getElementById('dash-active-topic-label');

  if (activeTopicEl) activeTopicEl.textContent = campaignConfig.active_topic || '-';
  if (dashActiveLabel) dashActiveLabel.textContent = campaignConfig.active_topic || '-';
  if (rulesEl) rulesEl.textContent = campaignConfig.rules || '-';
  if (hashtagsEl) hashtagsEl.textContent = campaignConfig.hashtags || '#Studio7';

  if (deadlineEl) {
    if (campaignConfig.deadline) {
      const d = new Date(campaignConfig.deadline);
      const formatted = isNaN(d.getTime())
        ? campaignConfig.deadline
        : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      deadlineEl.textContent = `⏰ ปิดรับคลิป: ${formatted}`;
    } else {
      deadlineEl.textContent = '⏰ เปิดรับส่งคลิปต่อเนื่อง';
    }
  }

  // Form Topic Select Dropdown
  const topicSelect = document.getElementById('topic-select');
  if (topicSelect) {
    const currentSelected = topicSelect.value;
    topicSelect.innerHTML = '';
    campaignConfig.topics.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      const isFreeTopic = t.includes('อิสระ') || t.includes('อื่นๆ');
      const isMainChallenge = t === campaignConfig.active_topic;
      opt.textContent = isMainChallenge
        ? `${t} (⭐ โจทย์หลักประจำรอบนี้)`
        : (isFreeTopic && !t.includes('ให้พิมพ์') ? `${t} (ให้พิมพ์ระบุเพิ่มเติมได้)` : t);
      topicSelect.appendChild(opt);
    });

    if (currentSelected && campaignConfig.topics.includes(currentSelected)) {
      topicSelect.value = currentSelected;
    } else if (campaignConfig.active_topic && campaignConfig.topics.includes(campaignConfig.active_topic)) {
      topicSelect.value = campaignConfig.active_topic;
    }
    onTopicSelectChange();
  }

  // Dashboard Filter Topic Dropdown
  const filterTopic = document.getElementById('filter-topic');
  if (filterTopic) {
    filterTopic.innerHTML = '<option value="all">หัวข้อ: ทั้งหมด (รวมทุกแคมเปญ)</option>';
    campaignConfig.topics.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t === campaignConfig.active_topic ? `หัวข้อ: ${t} (⭐ โจทย์หลัก)` : `หัวข้อ: ${t}`;
      filterTopic.appendChild(opt);
    });
    if (!hasInitializedTopicFilter && campaignConfig.active_topic && campaignConfig.topics.includes(campaignConfig.active_topic)) {
      currentTopicFilter = campaignConfig.active_topic;
      hasInitializedTopicFilter = true;
    } else if (currentTopicFilter !== 'all' && !campaignConfig.topics.includes(currentTopicFilter)) {
      currentTopicFilter = campaignConfig.active_topic || 'all';
    }
    filterTopic.value = currentTopicFilter;
  }
}

// Handle Topic Select Change on Form (show/hide custom topic input & refresh staff submission status for selected topic)
function onTopicSelectChange() {
  const topicSelect = document.getElementById('topic-select');
  const customGroup = document.getElementById('custom-topic-group');
  const customInput = document.getElementById('custom-topic-input');
  if (!topicSelect || !customGroup) return;

  const val = topicSelect.value || '';
  const isCustom = val.includes('อิสระ') || val.includes('อื่นๆ');
  if (isCustom) {
    customGroup.style.display = 'block';
    customInput.required = true;
  } else {
    customGroup.style.display = 'none';
    customInput.required = false;
  }

  // Refresh staff dropdown icons and profile card for the newly selected topic
  const shopCode = document.getElementById('shop-select') ? document.getElementById('shop-select').value : '';
  if (shopCode) {
    refreshStaffSelectIcons(shopCode);
  }
  if (selectedStaff) {
    updateProfileCard(selectedStaff);
  }
}

function refreshStaffSelectIcons(shopCode) {
  const staffSelect = document.getElementById('staff-select');
  if (!staffSelect || !shopCode) return;
  const topicSelect = document.getElementById('topic-select');
  const formTopic = (topicSelect && topicSelect.value) ? topicSelect.value : (campaignConfig.active_topic || 'all');
  Array.from(staffSelect.options).forEach(opt => {
    if (!opt.value) return;
    const s = allStaff.find(st => st.emp_id === opt.value);
    if (s) {
      const isSub = Boolean(getStaffTopicSubmission(s, formTopic));
      const icon = isSub ? '✅' : '⏳';
      opt.textContent = `${icon} ${s.full_name} (${s.position}) - รหัส ${s.emp_id}`;
    }
  });
}

// Copy Hashtags button
async function copyHashtags() {
  const tags = campaignConfig.hashtags || '#Studio7 #iPhone16 #Com7';
  try {
    await navigator.clipboard.writeText(tags);
    showToast('📋 คัดลอกแฮชแท็กเรียบร้อย: ' + tags);
  } catch (err) {
    showToast('📋 แฮชแท็ก: ' + tags);
  }
}

// Populate Shop Dropdowns
let dropdownsPopulated = false;
function populateShopDropdowns() {
  if (dropdownsPopulated || allBranches.length === 0) return;

  const shopSelect = document.getElementById('shop-select');
  const filterBranch = document.getElementById('filter-branch');

  shopSelect.innerHTML = '<option value="">-- เลือกสาขา (ทั้งหมด 13 สาขา) --</option>';
  filterBranch.innerHTML = '<option value="all">สาขา: ทั้งหมด (13 สาขา)</option>';

  allBranches.forEach(b => {
    const opt1 = document.createElement('option');
    opt1.value = b.shop_code;
    opt1.textContent = `[${b.shop_code}] ${b.shop_name} (${b.total_staff} คน)`;
    shopSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = b.shop_code;
    opt2.textContent = `${b.shop_name}`;
    filterBranch.appendChild(opt2);
  });

  dropdownsPopulated = true;
}

// When Shop is selected in form
function onShopChange() {
  const shopCode = document.getElementById('shop-select').value;
  const staffSelect = document.getElementById('staff-select');

  if (!shopCode) {
    staffSelect.innerHTML = '<option value="">-- กรุณาเลือกสาขาก่อน --</option>';
    staffSelect.disabled = true;
    hideProfileCard();
    return;
  }

  const staffInShop = allStaff.filter(s => s.shop_code === shopCode);
  staffSelect.innerHTML = '<option value="">-- เลือกชื่อพนักงาน (' + staffInShop.length + ' คน) --</option>';
  
  const topicSelect = document.getElementById('topic-select');
  const formTopic = (topicSelect && topicSelect.value) ? topicSelect.value : (campaignConfig.active_topic || 'all');

  staffInShop.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.emp_id;
    const icon = getStaffTopicSubmission(s, formTopic) ? '✅' : '⏳';
    opt.textContent = `${icon} ${s.full_name} (${s.position}) - รหัส ${s.emp_id}`;
    staffSelect.appendChild(opt);
  });

  staffSelect.disabled = false;
  hideProfileCard();
}

// When Staff is selected in form
function onStaffSelectChange() {
  const empId = document.getElementById('staff-select').value;
  if (!empId) {
    hideProfileCard();
    return;
  }
  const staff = allStaff.find(s => s.emp_id === empId);
  if (staff) {
    updateProfileCard(staff);
  }
}

// Quick Employee ID Search
function onQuickSearch(val) {
  const query = val.trim();
  if (query.length < 3) return;

  const match = allStaff.find(s => s.emp_id === query || s.full_name.includes(query));
  if (match) {
    document.getElementById('shop-select').value = match.shop_code;
    onShopChange();
    document.getElementById('staff-select').value = match.emp_id;
    updateProfileCard(match);
  }
}

// Update Profile Card
function updateProfileCard(staff) {
  selectedStaff = staff;
  const card = document.getElementById('profile-card');
  const avatar = document.getElementById('profile-avatar');
  const name = document.getElementById('profile-name');
  const badge = document.getElementById('profile-status-badge');
  const empId = document.getElementById('profile-empid');
  const shop = document.getElementById('profile-shop');
  const pos = document.getElementById('profile-position');
  const prevBox = document.getElementById('profile-prev-submission');
  const prevTime = document.getElementById('profile-prev-time');
  const urlInput = document.getElementById('tiktok-url');
  const topicSelect = document.getElementById('topic-select');
  const customInput = document.getElementById('custom-topic-input');

  // Initials for avatar
  avatar.textContent = staff.first_name ? staff.first_name.slice(0, 2) : 'S7';
  name.textContent = staff.full_name;
  empId.textContent = staff.emp_id;
  shop.textContent = staff.shop_name;
  pos.textContent = staff.position;

  const currentFormTopic = (topicSelect && topicSelect.value) ? topicSelect.value : (campaignConfig.active_topic || 'all');
  const subForTopic = getStaffTopicSubmission(staff, currentFormTopic);

  if (subForTopic) {
    badge.className = 'badge badge-submitted';
    badge.textContent = '✅ ส่งคลิปหัวข้อนี้แล้ว';
    prevBox.style.display = 'block';
    prevTime.textContent = `${new Date(subForTopic.updated_at).toLocaleString('th-TH')} (หัวข้อ: ${currentFormTopic})`;

    // Auto populate existing URL for this topic if empty
    if (!urlInput.value) urlInput.value = subForTopic.tiktok_url || '';
    if (customInput && subForTopic.custom_topic) {
      customInput.value = subForTopic.custom_topic;
    }
  } else {
    badge.className = 'badge badge-pending';
    badge.textContent = `⏳ ยังไม่ได้ส่งหัวข้อ "${currentFormTopic}"`;
    prevBox.style.display = 'none';
  }

  card.style.display = 'flex';
}

function hideProfileCard() {
  selectedStaff = null;
  document.getElementById('profile-card').style.display = 'none';
}

// Validate TikTok URL
function validateTiktokUrl(url) {
  const input = document.getElementById('tiktok-url');
  if (!url) return;
  if (/tiktok\.com/i.test(url) || /douyin\.com/i.test(url) || /^https?:\/\//i.test(url)) {
    input.style.borderColor = '#10b981';
  } else {
    input.style.borderColor = '#e2e8f0';
  }
}

// Test TikTok link button
function testTiktokLink() {
  let url = document.getElementById('tiktok-url').value.trim();
  if (!url) {
    showToast('⚠️ กรุณากรอกลิงก์ TikTok ก่อนทดสอบเปิด');
    return;
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  window.open(url, '_blank');
}

// Handle Form Submission
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!selectedStaff) {
    showToast('⚠️ กรุณาเลือกรหัสหรือชื่อพนักงานของท่าน');
    return;
  }

  let tiktokUrl = document.getElementById('tiktok-url').value.trim();
  if (!tiktokUrl) {
    showToast('⚠️ กรุณากรอกลิงก์คลิป TikTok');
    return;
  }

  const selectedTopic = document.getElementById('topic-select').value;
  const customTopicInput = document.getElementById('custom-topic-input');
  const isCustom = selectedTopic.includes('อิสระ') || selectedTopic.includes('อื่นๆ');
  const customTopic = isCustom && customTopicInput ? customTopicInput.value.trim() : '';

  if (isCustom && !customTopic) {
    showToast('⚠️ กรุณาระบุชื่อหัวข้อคลิปเพิ่มเติม');
    customTopicInput.focus();
    return;
  }

  const notes = document.getElementById('clip-notes').value.trim();
  const submitBtn = document.getElementById('submit-btn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ กำลังบันทึกข้อมูล...';

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emp_id: selectedStaff.emp_id,
        tiktok_url: tiktokUrl,
        topic: selectedTopic,
        custom_topic: customTopic,
        notes: notes
      })
    });

    const result = await res.json();
    if (result.success) {
      if (result.data && result.data.emp_id) {
        const localSubs = getLocalSubmissionsBackup();
        localSubs[result.data.emp_id] = result.data;
        saveLocalSubmissionsBackup(localSubs);
      }
      showToast('🎉 ' + result.message);
      // Refresh data
      await fetchData();
      // Reset form inputs
      document.getElementById('tiktok-url').value = '';
      if (customTopicInput) customTopicInput.value = '';
      document.getElementById('clip-notes').value = '';
      document.getElementById('quick-emp-id').value = '';
      
      setTimeout(() => {
        showToast('✅ ท่านสามารถตรวจสอบความคืบหน้าที่หน้าแดชบอร์ดได้เลยครับ');
      }, 1500);
    } else {
      showToast('❌ ' + result.message);
    }
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
      </svg>
      บันทึกและส่งคลิป TikTok
    `;
  }
}

// ==================== DASHBOARD RENDERING ====================
function renderDashboard() {
  const filterTopicEl = document.getElementById('filter-topic');
  if (filterTopicEl && filterTopicEl.value !== currentTopicFilter) {
    filterTopicEl.value = currentTopicFilter;
  }

  const total = allStaff.length;
  const submitted = allStaff.filter(s => Boolean(getStaffTopicSubmission(s, currentTopicFilter))).length;
  const pending = total - submitted;
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

  let completeBranches = 0;
  allBranches.forEach(b => {
    const branchStaff = allStaff.filter(s => s.shop_code === b.shop_code);
    const bTotal = branchStaff.length || b.total_staff;
    const bSub = branchStaff.filter(s => Boolean(getStaffTopicSubmission(s, currentTopicFilter))).length;
    if (bTotal > 0 && bSub === bTotal) {
      completeBranches += 1;
    }
  });

  // KPI Cards
  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-submitted').textContent = submitted;
  document.getElementById('kpi-pending').textContent = pending;
  document.getElementById('kpi-percent').textContent = pct + '%';
  document.getElementById('kpi-complete-branches').textContent = `${completeBranches} / ${allBranches.length}`;

  // Update KPI Labels/Subtitles to show which topic is currently reflected
  const topicDesc = currentTopicFilter === 'all'
    ? 'รวมทุกหัวข้อแคมเปญ'
    : `หัวข้อ: ${currentTopicFilter}`;
  const kpiSubmittedLabel = document.getElementById('kpi-submitted-label');
  if (kpiSubmittedLabel) {
    kpiSubmittedLabel.textContent = currentTopicFilter === 'all' ? 'ส่งคลิปแล้ว (ทุกหัวข้อ)' : `ส่งคลิปแล้ว (${currentTopicFilter})`;
  }
  const kpiPendingSub = document.getElementById('kpi-pending-sub');
  if (kpiPendingSub) kpiPendingSub.textContent = topicDesc;
  const kpiBranchSub = document.getElementById('kpi-branch-sub');
  if (kpiBranchSub) kpiBranchSub.textContent = currentTopicFilter === 'all' ? 'PIA ส่งครบทุกคน' : `ครบทุกคนใน ${currentTopicFilter}`;

  // Update Status Filter Dropdown options with counts for the current topic
  const filterStatusEl = document.getElementById('filter-status');
  if (filterStatusEl && filterStatusEl.options.length >= 3) {
    filterStatusEl.options[0].textContent = `สถานะ: ทั้งหมด (${total} คน)`;
    filterStatusEl.options[1].textContent = `✅ ส่งคลิปแล้ว (${submitted} คน)`;
    filterStatusEl.options[2].textContent = `⏳ ยังไม่ส่ง (${pending} คน)`;
  }

  // Update Pending Dot in Nav (based on active campaign topic)
  const activeTopicPending = allStaff.filter(s => !getStaffTopicSubmission(s, campaignConfig.active_topic || 'all')).length;
  const dot = document.getElementById('dash-badge-pending');
  if (dot) dot.style.display = activeTopicPending > 0 ? 'block' : 'none';

  // Render Topic Breakdown Cards
  renderTopicBreakdown();

  // Render Branch Cards
  renderBranchCards();

  // Render Table
  applyTableFilters(true);
}

// Render Topic Breakdown Cards
function renderTopicBreakdown() {
  const grid = document.getElementById('topic-breakdown-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const allChip = document.getElementById('all-topics-chip');
  if (allChip) {
    if (currentTopicFilter === 'all') {
      allChip.classList.add('active');
    } else {
      allChip.classList.remove('active');
    }
  }

  // Compute live counts per topic using getStaffTopicSubmission so Topic Card, KPI Card, Branch Card, and Table always match 100%
  const counts = {};
  campaignConfig.topics.forEach(t => {
    counts[t] = allStaff.filter(s => Boolean(getStaffTopicSubmission(s, t))).length;
  });

  Object.entries(counts).forEach(([topicName, count]) => {
    const card = document.createElement('div');
    const isSelected = currentTopicFilter === topicName;
    const isMain = topicName === campaignConfig.active_topic;
    card.className = `topic-card ${isSelected ? 'selected' : ''} ${isMain ? 'is-active-challenge' : ''}`;
    card.onclick = () => selectTopicCard(topicName);

    const totalStaffCount = allStaff.length || 51;
    const pct = totalStaffCount > 0 ? Math.round((count / totalStaffCount) * 100) : 0;

    card.innerHTML = `
      <div class="topic-card-top">
        <div class="topic-card-title">${escapeHtml(topicName)}</div>
        ${isMain ? '<span class="topic-active-pill">⭐ โจทย์หลัก</span>' : ''}
      </div>
      <div class="topic-card-bottom">
        <div>
          <span class="topic-count-num">${count}</span>
          <span class="topic-count-unit">/ ${totalStaffCount} คน (${pct}%)</span>
        </div>
        <span style="font-size: 0.76rem; color: ${isSelected ? '#15803d' : '#64748b'}; font-weight: ${isSelected ? '600' : '400'};">
          ${isSelected ? '✅ กำลังแสดงผลหัวข้อนี้' : 'คลิกเพื่อกรองดู'}
        </span>
      </div>
    `;

    grid.appendChild(card);
  });
}

function selectTopicCard(topicName) {
  currentTopicFilter = topicName;
  const filterTopicEl = document.getElementById('filter-topic');
  if (filterTopicEl) filterTopicEl.value = currentTopicFilter;
  renderDashboard();
}

function clearTopicFilter() {
  currentTopicFilter = 'all';
  const filterTopicEl = document.getElementById('filter-topic');
  if (filterTopicEl) filterTopicEl.value = 'all';
  renderDashboard();
}

// Render Branch Cards Grid (filtered by currentTopicFilter)
function renderBranchCards() {
  const container = document.getElementById('branch-cards-grid');
  container.innerHTML = '';

  allBranches.forEach(b => {
    const branchStaff = allStaff.filter(s => s.shop_code === b.shop_code);
    const totalStaff = branchStaff.length || b.total_staff;
    const submittedCount = branchStaff.filter(s => Boolean(getStaffTopicSubmission(s, currentTopicFilter))).length;
    const percent = totalStaff > 0 ? Math.round((submittedCount / totalStaff) * 100) : 0;

    const card = document.createElement('div');
    const isSelected = currentBranchFilter === b.shop_code;
    card.className = `branch-card ${isSelected ? 'selected' : ''}`;
    card.onclick = () => selectBranchCard(b.shop_code);

    let statusClass = 'pending';
    let statusText = 'ยังไม่มีคนส่ง';
    if (percent === 100 && totalStaff > 0) {
      statusClass = 'complete';
      statusText = 'ครบ 100%';
    } else if (submittedCount > 0) {
      statusClass = 'progress';
      statusText = `ส่งแล้ว ${percent}%`;
    }

    card.innerHTML = `
      <div class="branch-card-header">
        <div>
          <div class="branch-card-name">${b.shop_name.replace(/ID\d+\s*:\s*/, '')}</div>
          <div class="branch-card-code">รหัส ${b.shop_code}</div>
        </div>
        <span class="branch-status-badge ${statusClass}">${statusText}</span>
      </div>

      <div class="branch-progress-bar-wrap">
        <div class="branch-progress-bar ${statusClass}" style="width: ${percent}%"></div>
      </div>

      <div class="branch-card-footer">
        <span><strong>${submittedCount}</strong> / ${totalStaff} คน</span>
        <button class="btn-line-mini" onclick="event.stopPropagation(); openLineModal('${b.shop_code}')" title="คัดลอกรายชื่อตามงาน LINE สาขานี้">
          📱 ตามงาน LINE
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function selectBranchCard(shopCode) {
  if (currentBranchFilter === shopCode) {
    currentBranchFilter = 'all';
  } else {
    currentBranchFilter = shopCode;
  }
  document.getElementById('filter-branch').value = currentBranchFilter;
  renderBranchCards();
  applyTableFilters(true);
}

function clearBranchFilter() {
  currentBranchFilter = 'all';
  document.getElementById('filter-branch').value = 'all';
  renderBranchCards();
  applyTableFilters(true);
}

// Apply Table Filters
function applyTableFilters(fromDashboard = false) {
  const search = (document.getElementById('table-search').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-status').value;
  const branchFilter = document.getElementById('filter-branch').value;
  const topicFilterEl = document.getElementById('filter-topic');
  const topicFilter = topicFilterEl ? topicFilterEl.value : currentTopicFilter;

  const topicChangedFromDropdown = !fromDashboard && topicFilter !== currentTopicFilter;
  currentBranchFilter = branchFilter;
  currentTopicFilter = topicFilter;

  if (topicChangedFromDropdown) {
    renderDashboard();
    return;
  }

  let filtered = allStaff.filter(s => {
    const subForTopic = getStaffTopicSubmission(s, currentTopicFilter);
    const isSubForTopic = Boolean(subForTopic);

    // Status Filter (evaluated specifically for the selected topic)
    if (statusFilter === 'submitted' && !isSubForTopic) return false;
    if (statusFilter === 'pending' && isSubForTopic) return false;

    // Branch Filter
    if (branchFilter !== 'all' && s.shop_code !== branchFilter) return false;

    // Search Query
    if (search) {
      const matchName = s.full_name.toLowerCase().includes(search);
      const matchId = s.emp_id.includes(search);
      const matchShop = s.shop_name.toLowerCase().includes(search);
      const matchPos = s.position.toLowerCase().includes(search);
      const matchTopic = subForTopic && (subForTopic.clip_title || '').toLowerCase().includes(search);
      if (!matchName && !matchId && !matchShop && !matchPos && !matchTopic) return false;
    }

    return true;
  });

  // Put submitted staff for the current topic at the top when viewing 'all' statuses on a specific topic
  if (statusFilter === 'all' && currentTopicFilter !== 'all') {
    filtered.sort((a, b) => {
      const aSub = Boolean(getStaffTopicSubmission(a, currentTopicFilter)) ? 1 : 0;
      const bSub = Boolean(getStaffTopicSubmission(b, currentTopicFilter)) ? 1 : 0;
      if (bSub !== aSub) return bSub - aSub;
      return parseInt(a.shop_code) - parseInt(b.shop_code);
    });
  }

  const submittedInFiltered = filtered.filter(s => Boolean(getStaffTopicSubmission(s, currentTopicFilter))).length;
  const topicSuffix = currentTopicFilter === 'all' ? 'รวมทุกหัวข้อ' : `หัวข้อ "${currentTopicFilter}"`;
  document.getElementById('table-count-label').textContent = `${filtered.length} คน • ส่งแล้ว ${submittedInFiltered} คน (${topicSuffix})`;
  renderTable(filtered);
}

// Render Table Rows
function renderTable(staffList) {
  const tbody = document.getElementById('staff-table-body');
  tbody.innerHTML = '';

  if (staffList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 40px; color: #94a3b8;">
          🔍 ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
        </td>
      </tr>
    `;
    return;
  }

  staffList.forEach((s, idx) => {
    const tr = document.createElement('tr');
    const sub = getStaffTopicSubmission(s, currentTopicFilter);
    const isSub = Boolean(sub);

    const statusBadge = isSub
      ? '<span class="badge badge-submitted">✅ ส่งแล้ว</span>'
      : '<span class="badge badge-pending">⏳ ยังไม่ส่ง</span>';

    const tiktokLink = isSub
      ? `<a href="${sub.tiktok_url}" target="_blank" class="tiktok-link-btn" title="${sub.tiktok_url}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.895 2.895 0 0 1 2.312-4.644c.314 0 .619.05.904.144V9.42a6.333 6.333 0 0 0-.904-.065c-3.513 0-6.36 2.848-6.36 6.361 0 3.514 2.847 6.361 6.36 6.361 3.514 0 6.361-2.847 6.361-6.361V8.536a8.212 8.212 0 0 0 4.743 1.511v-3.361z"/></svg>
          เปิดดูคลิป
         </a>`
      : '<span style="color: #cbd5e1;">-</span>';

    const clipTitle = isSub
      ? `<span title="${escapeHtml(sub.clip_title)}">${escapeHtml(sub.clip_title || '-')}</span>`
      : '<span style="color: #cbd5e1;">-</span>';

    const dateStr = isSub
      ? `<span style="font-size: 0.78rem; color: #64748b;">${new Date(sub.updated_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>`
      : '<span style="color: #cbd5e1;">-</span>';

    const topicArg = isSub ? (sub.topic || currentTopicFilter) : currentTopicFilter;
    const actionBtn = isSub
      ? `<button class="btn-delete-row" onclick="deleteSubmission('${s.emp_id}', '${escapeHtml(s.full_name)}', '${escapeHtml(topicArg)}')" title="ลบข้อมูลการส่งคลิปนี้">🗑️</button>`
      : '';

    tr.innerHTML = `
      <td style="color: #94a3b8; font-size: 0.8rem;">${idx + 1}</td>
      <td><strong>${s.emp_id}</strong></td>
      <td><strong>${escapeHtml(s.full_name)}</strong></td>
      <td><span style="font-size: 0.82rem; color: #475569;">${escapeHtml(s.shop_name.replace(/ID\d+\s*:\s*/, ''))}</span></td>
      <td><span style="font-size: 0.82rem; color: #64748b;">${escapeHtml(s.position)}</span></td>
      <td>${statusBadge}</td>
      <td>${tiktokLink}</td>
      <td>${clipTitle}</td>
      <td>${dateStr}</td>
      <td>${actionBtn}</td>
    `;

    tbody.appendChild(tr);
  });
}

// Delete Submission (supports deleting a specific topic's submission)
async function deleteSubmission(empId, name, topicName = '') {
  const topicLabel = topicName && topicName !== 'all' ? ` (หัวข้อ: ${topicName})` : '';
  if (!confirm(`คุณต้องการลบข้อมูลการส่งคลิปของ "${name}" (รหัส ${empId})${topicLabel} ใช่หรือไม่?`)) return;

  try {
    const query = topicName && topicName !== 'all' ? `?topic=${encodeURIComponent(topicName)}` : '';
    const res = await fetch(`/api/submission/${empId}${query}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      const localSubs = getLocalSubmissionsBackup();
      if (result.data) {
        localSubs[empId] = result.data;
      } else {
        localSubs[empId] = { emp_id: empId, deleted: true, updated_at: new Date().toISOString() };
      }
      saveLocalSubmissionsBackup(localSubs);
      showToast('🗑️ ' + (result.message || 'ลบข้อมูลเรียบร้อยแล้ว'));
      fetchData();
    } else {
      showToast('❌ ' + result.message);
    }
  } catch (err) {
    showToast('❌ ไม่สามารถลบได้: ' + err.message);
  }
}

// ==================== LINE FOLLOW-UP MODAL ====================
function openLineModal(target = 'all') {
  const modal = document.getElementById('line-modal');
  const title = document.getElementById('line-modal-title');
  const textarea = document.getElementById('line-message-text');

  let missingStaff = [];
  let headerMsg = '';

  const originUrl = window.location.origin;
  const targetTopic = (currentTopicFilter && currentTopicFilter !== 'all')
    ? currentTopicFilter
    : (campaignConfig.active_topic || 'all');
  const activeChallenge = targetTopic === 'all'
    ? (campaignConfig.active_topic || 'หัวข้อประจำแคมเปญ')
    : targetTopic;
  const deadlineText = campaignConfig.deadline
    ? `⏰ กำหนดส่งภายใน: ${new Date(campaignConfig.deadline).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  const hashtagText = campaignConfig.hashtags ? `🏷️ แฮชแท็กบังคับ: ${campaignConfig.hashtags}` : '';

  if (target === 'all') {
    title.textContent = `📢 ข้อความตามงาน LINE — หัวข้อ: ${activeChallenge}`;
    missingStaff = allStaff.filter(s => !getStaffTopicSubmission(s, targetTopic));
    
    // Group by branch
    const byBranch = {};
    missingStaff.forEach(s => {
      if (!byBranch[s.shop_name]) byBranch[s.shop_name] = [];
      byBranch[s.shop_name].push(s);
    });

    let details = '';
    for (const [branchName, list] of Object.entries(byBranch)) {
      details += `\n📍 ${branchName} (ขาด ${list.length} คน)\n`;
      list.forEach((s, i) => {
        details += `  ${i + 1}. [${s.emp_id}] ${s.full_name} (${s.position})\n`;
      });
    }

    headerMsg = `📢 แจ้งเตือน: สัปดาห์นี้เป็นโจทย์หัวข้อ [${activeChallenge}] รบกวนพนักงาน PIA ที่ยังไม่ได้ส่งงานเร่งดำเนินการครับ
ประจำแคมเปญ Studio 7 • RSM วีรานุวัติ | ASM สมยศ
${deadlineText}
${hashtagText}
ความคืบหน้าภาพรวม (เฉพาะ PIA): ส่งแล้ว ${allStaff.length - missingStaff.length}/${allStaff.length} คน (ขาดอีก ${missingStaff.length} คน)
${details || '\n🎉 พนักงานตำแหน่ง PIA ส่งครบทุกคนแล้วในหัวข้อนี้!\n'}
👉 ลิงก์สำหรับส่งคลิป TikTok:
${originUrl}

ขอบคุณทีมงานทุกคนที่ร่วมมือครับ 🙏`;

  } else {
    // Specific branch
    const branch = allBranches.find(b => b.shop_code === target);
    const branchName = branch ? branch.shop_name : `สาขา ${target}`;
    const branchStaff = allStaff.filter(s => s.shop_code === target);
    const branchTotal = branchStaff.length || (branch ? branch.total_staff : 0);
    missingStaff = branchStaff.filter(s => !getStaffTopicSubmission(s, targetTopic));
    const branchSubmitted = branchTotal - missingStaff.length;

    title.textContent = `📢 ตามงาน LINE: ${branchName} (${activeChallenge})`;

    let staffListText = '';
    missingStaff.forEach((s, i) => {
      staffListText += `${i + 1}. [${s.emp_id}] ${s.full_name} (${s.position})\n`;
    });

    headerMsg = `📢 แจ้งเตือน: สัปดาห์นี้เป็นโจทย์หัวข้อ [${activeChallenge}] รบกวนพนักงาน PIA ที่ยังไม่ได้ส่งงานเร่งดำเนินการครับ
สาขา: ${branchName}
${deadlineText}
${hashtagText}
สถานะ PIA: ส่งแล้ว ${branchSubmitted}/${branchTotal} คน (คงเหลือ ${missingStaff.length} คน)

รายชื่อผู้ที่ยังไม่ได้ส่ง:
${staffListText || '  (ตำแหน่ง PIA ส่งครบทุกคนแล้ว 🎉)\n'}
👉 กรุณาเข้าไปวางลิงก์คลิป TikTok ได้ที่:
${originUrl}

รบกวนส่งให้ครบตามกำหนด ขอบคุณครับ 🙏`;
  }

  textarea.value = headerMsg;
  modal.style.display = 'flex';
}

function closeLineModal(e) {
  if (e && e.target !== e.currentTarget && e.target.id !== 'line-modal') return;
  document.getElementById('line-modal').style.display = 'none';
}

// Copy Line Message to clipboard
async function copyLineMessage() {
  const textarea = document.getElementById('line-message-text');
  try {
    await navigator.clipboard.writeText(textarea.value);
    showToast('📋 คัดลอกข้อความ LINE เรียบร้อยแล้ว! สามารถนำไปวางได้ทันที');
  } catch (err) {
    textarea.select();
    document.execCommand('copy');
    showToast('📋 คัดลอกข้อความแล้ว');
  }
}

// ==================== ADMIN TOPIC MANAGER MODAL ====================
function openCampaignModal() {
  const modal = document.getElementById('campaign-modal');
  adminEditingTopics = [...(campaignConfig.topics || [])];

  document.getElementById('admin-deadline').value = campaignConfig.deadline || '';
  document.getElementById('admin-rules').value = campaignConfig.rules || '';
  document.getElementById('admin-hashtags').value = campaignConfig.hashtags || '';

  renderAdminTopicsList();
  modal.style.display = 'flex';
}

function closeCampaignModal(e) {
  if (e && e.target !== e.currentTarget && e.target.id !== 'campaign-modal') return;
  document.getElementById('campaign-modal').style.display = 'none';
}

function renderAdminTopicsList() {
  const listEl = document.getElementById('admin-topics-list');
  const activeSelect = document.getElementById('admin-active-topic');
  const currentActive = activeSelect.value || campaignConfig.active_topic;

  listEl.innerHTML = '';
  activeSelect.innerHTML = '';

  adminEditingTopics.forEach((topic, idx) => {
    // Row in editable list
    const row = document.createElement('div');
    row.className = 'admin-topic-item';
    row.innerHTML = `
      <input type="text" class="form-control" value="${escapeHtml(topic)}" oninput="updateAdminTopicText(${idx}, this.value)">
      <button type="button" class="btn-remove-topic" onclick="removeAdminTopic(${idx})" title="ลบหัวข้อนี้">ลบ</button>
    `;
    listEl.appendChild(row);

    // Option in active topic dropdown
    const opt = document.createElement('option');
    opt.value = topic;
    opt.textContent = topic;
    activeSelect.appendChild(opt);
  });

  if (adminEditingTopics.includes(currentActive)) {
    activeSelect.value = currentActive;
  } else if (adminEditingTopics.length > 0) {
    activeSelect.value = adminEditingTopics[0];
  }
}

function updateAdminTopicText(idx, newVal) {
  adminEditingTopics[idx] = newVal;
  // Also update active topic dropdown options text while preserving selection
  const activeSelect = document.getElementById('admin-active-topic');
  if (activeSelect && activeSelect.options[idx]) {
    const wasSelected = activeSelect.selectedIndex === idx;
    activeSelect.options[idx].value = newVal;
    activeSelect.options[idx].textContent = newVal;
    if (wasSelected) {
      activeSelect.selectedIndex = idx;
    }
  }
}

function addAdminTopic() {
  const input = document.getElementById('new-topic-input');
  const val = (input.value || '').trim();
  if (!val) {
    showToast('⚠️ กรุณาพิมพ์ชื่อหัวข้อที่ต้องการเพิ่ม');
    return;
  }
  adminEditingTopics.push(val);
  input.value = '';
  renderAdminTopicsList();
  // Select the newly added topic as active topic convenience
  const activeSelect = document.getElementById('admin-active-topic');
  if (activeSelect) activeSelect.value = val;
}

function removeAdminTopic(idx) {
  if (adminEditingTopics.length <= 1) {
    showToast('⚠️ ต้องมีหัวข้ออย่างน้อย 1 หัวข้อในระบบ');
    return;
  }
  adminEditingTopics.splice(idx, 1);
  renderAdminTopicsList();
}

async function saveCampaignConfig() {
  // If user typed something in new-topic-input but forgot to click "+ เพิ่มหัวข้อ", include it automatically
  const pendingNewInput = document.getElementById('new-topic-input');
  if (pendingNewInput && pendingNewInput.value.trim()) {
    adminEditingTopics.push(pendingNewInput.value.trim());
    pendingNewInput.value = '';
  }

  const cleanedTopics = adminEditingTopics.map(t => t.trim()).filter(Boolean);
  if (cleanedTopics.length === 0) {
    showToast('⚠️ ต้องมีหัวข้ออย่างน้อย 1 หัวข้อ');
    return;
  }

  const activeSelect = document.getElementById('admin-active-topic');
  let activeTopic = (activeSelect && activeSelect.value ? activeSelect.value.trim() : '') || cleanedTopics[0];
  if (!cleanedTopics.includes(activeTopic)) {
    activeTopic = cleanedTopics[0];
  }
  const deadline = document.getElementById('admin-deadline').value;
  const rules = document.getElementById('admin-rules').value.trim();
  const hashtags = document.getElementById('admin-hashtags').value.trim();

  try {
    const res = await fetch('/api/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active_topic: activeTopic,
        deadline: deadline,
        rules: rules,
        hashtags: hashtags,
        topics: cleanedTopics
      })
    });

    const result = await res.json();
    if (result.success) {
      campaignConfig = result.data;
      currentTopicFilter = campaignConfig.active_topic || 'all';
      hasInitializedTopicFilter = true;
      renderCampaignUI();
      renderDashboard();
      showToast('🎉 บันทึกการตั้งค่าหัวข้อแคมเปญเรียบร้อยแล้ว');
      closeCampaignModal();
      await fetchData(true);
    } else {
      showToast('❌ ' + result.message);
    }
  } catch (err) {
    showToast('❌ เกิดข้อผิดพลาด: ' + err.message);
  }
}

// Export Excel/CSV
function exportExcel() {
  const query = currentTopicFilter && currentTopicFilter !== 'all'
    ? `?topic=${encodeURIComponent(currentTopicFilter)}`
    : '';
  window.location.href = `/api/export${query}`;
  showToast('📥 กำลังดาวน์โหลดไฟล์รายงาน Excel / CSV...');
}

// Toast helper
function showToast(msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
