const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Resolve directories with automatic fallback for flat GitHub repo uploads
const hasDataFolder = fs.existsSync(path.join(__dirname, 'data'));
const DATA_DIR = hasDataFolder ? path.join(__dirname, 'data') : __dirname;

const STAFF_FILE = fs.existsSync(path.join(DATA_DIR, 'staff.json'))
  ? path.join(DATA_DIR, 'staff.json')
  : path.join(__dirname, 'staff.json');

const SUBMISSIONS_FILE = fs.existsSync(path.join(DATA_DIR, 'submissions.json'))
  ? path.join(DATA_DIR, 'submissions.json')
  : path.join(__dirname, 'submissions.json');

const CAMPAIGN_FILE = fs.existsSync(path.join(DATA_DIR, 'campaign.json'))
  ? path.join(DATA_DIR, 'campaign.json')
  : path.join(DATA_DIR, 'campaign.json');

const hasPublicFolder = fs.existsSync(path.join(__dirname, 'public'));
const PUBLIC_DIR = hasPublicFolder ? path.join(__dirname, 'public') : __dirname;

const DEFAULT_CAMPAIGN = {
  active_topic: '🎧 รีวิวอุปกรณ์เสริม BTB(3rd)',
  campaign_period: 'โจทย์ประจำสัปดาห์ / ประจำเดือน ตุลาคม 2026',
  deadline: '2026-10-20',
  rules: 'ทำคลิป TikTok ความยาว 30–60 วินาที แนะนำสินค้าหรือโปรโมชั่นตามหัวข้อที่กำหนด พร้อมติดแฮชแท็กบังคับให้ครบถ้วน',
  hashtags: '#Studio7 #Com7',
  topics: [
    '🎧 รีวิวอุปกรณ์เสริม BTB(3rd)'
  ]
};

// Built-in seed submissions so Render redeployments never wipe existing submissions
const SEED_SUBMISSIONS = {
  "28335": {
    "emp_id": "28335",
    "emp_name": "อัญนิกา ใสดี",
    "shop_code": "586",
    "shop_name": "ID586 : Studio 7-Lotus-Phetchabun",
    "position": "PIA",
    "tiktok_url": "https://www.tt.site/t/ZSgNmJgut/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-16T10:01:29.008Z",
    "updated_at": "2026-10-16T10:01:29.008Z"
  },
  "34918": {
    "emp_id": "34918",
    "emp_name": "ลลิชา สังข์ชัย",
    "shop_code": "586",
    "shop_name": "ID586 : Studio 7-Lotus-Phetchabun",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgNmayeA/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-16T10:04:10.614Z",
    "updated_at": "2026-10-16T10:04:10.614Z"
  },
  "17591": {
    "emp_id": "17591",
    "emp_name": "กมลวรรณ ปูนขุนทด",
    "shop_code": "420",
    "shop_name": "ID420 : Studio 7-MarkFour-Phrae",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSg6wFdWa/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T10:27:15.622Z",
    "updated_at": "2026-10-18T10:27:30.124Z"
  },
  "25141": {
    "emp_id": "25141",
    "emp_name": "อรอนงค์ หัสเดช",
    "shop_code": "1812",
    "shop_name": "ID1812 : Studio 7-Big C-Mueang-Nan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSg6oUEoj/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T10:58:33.788Z",
    "updated_at": "2026-10-18T10:58:33.788Z"
  },
  "35194": {
    "emp_id": "35194",
    "emp_name": "ธัญชนก สะตะยะวงษ์",
    "shop_code": "1812",
    "shop_name": "ID1812 : Studio 7-Big C-Mueang-Nan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgM1ejgG/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T11:02:04.200Z",
    "updated_at": "2026-10-18T11:02:04.200Z"
  },
  "36198": {
    "emp_id": "36198",
    "emp_name": "ฉันทพิชญา เทพสิทธิ์",
    "shop_code": "1812",
    "shop_name": "ID1812 : Studio 7-Big C-Mueang-Nan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgM1AaA9/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T11:05:30.861Z",
    "updated_at": "2026-10-18T11:05:30.861Z"
  },
  "26667": {
    "emp_id": "26667",
    "emp_name": "พิวรรญญา บัตริยะ",
    "shop_code": "1812",
    "shop_name": "ID1812 : Studio 7-Big C-Mueang-Nan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgM1XgNe/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T11:06:07.610Z",
    "updated_at": "2026-10-18T11:06:07.610Z"
  }
};

// Helper to read JSON safely
function readJSON(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const content = fs.readFileSync(file, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
    return fallback;
  }
}

// Helper to write JSON atomically
function writeJSON(file, data) {
  const tempFile = `${file}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, file);
}

// Helper to read all submissions (including seed data and tombstones)
function getRawSubmissions() {
  const disk = readJSON(SUBMISSIONS_FILE, {});
  const merged = { ...SEED_SUBMISSIONS };
  for (const [empId, record] of Object.entries(disk)) {
    if (!record) continue;
    const existing = merged[empId];
    if (!existing || new Date(record.updated_at || 0) >= new Date(existing.updated_at || 0)) {
      merged[empId] = record;
    }
  }
  return merged;
}

// Helper to read only active (non-deleted) submissions
function getActiveSubmissions() {
  const raw = getRawSubmissions();
  const active = {};
  for (const [empId, record] of Object.entries(raw)) {
    if (record && !record.deleted && record.tiktok_url) {
      active[empId] = record;
    }
  }
  return active;
}

// Helper to read campaign config
function getCampaignConfig() {
  const saved = readJSON(CAMPAIGN_FILE, null);
  if (!saved || !Array.isArray(saved.topics) || saved.topics.length === 0) {
    return { ...DEFAULT_CAMPAIGN };
  }
  return {
    ...DEFAULT_CAMPAIGN,
    ...saved
  };
}

// Load staff data
const TARGET_POSITION = 'PIA';
const allStaffList = readJSON(STAFF_FILE, []);
if (allStaffList.length === 0) {
  console.warn(`Warning: staff.json is empty or not found at: ${STAFF_FILE}`);
}

// Filter only target position: PIA
const staffList = allStaffList.filter(s => (s.position || '').trim().toUpperCase() === TARGET_POSITION);
console.log(`Loaded ${allStaffList.length} total staff from ${STAFF_FILE}. Filtered to ${staffList.length} target staff with position: ${TARGET_POSITION}`);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API Routes ---

  // GET /api/ping - Keep-alive health check
  if (req.method === 'GET' && pathname === '/api/ping') {
    return sendJSON(res, 200, { ok: true, time: new Date().toISOString() });
  }

  // POST /api/sync - Distributed browser backup sync (restores submissions if container restarted)
  if (req.method === 'POST' && pathname === '/api/sync') {
    try {
      const body = await parseBody(req);
      const clientSubs = body.submissions && typeof body.submissions === 'object' ? body.submissions : {};
      const currentRaw = getRawSubmissions();
      let changed = false;

      for (const [empId, rec] of Object.entries(clientSubs)) {
        if (!rec || !rec.emp_id) continue;
        const staff = staffList.find(s => s.emp_id === String(empId).trim());
        if (!staff) continue;
        const existing = currentRaw[empId];
        if (!existing || new Date(rec.updated_at || 0) > new Date(existing.updated_at || 0)) {
          currentRaw[empId] = rec;
          changed = true;
        }
      }

      if (changed) {
        writeJSON(SUBMISSIONS_FILE, currentRaw);
      }

      // Also sync campaign if client has a newer updated_at
      if (body.campaign && body.campaign.updated_at) {
        const currentCamp = getCampaignConfig();
        if (!currentCamp.updated_at || new Date(body.campaign.updated_at) > new Date(currentCamp.updated_at)) {
          writeJSON(CAMPAIGN_FILE, body.campaign);
        }
      }

      return sendJSON(res, 200, {
        success: true,
        restored: changed,
        raw_submissions: currentRaw
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, message: err.message });
    }
  }

  // GET /api/campaign - Return campaign config and topic breakdown
  if (req.method === 'GET' && pathname === '/api/campaign') {
    const campaign = getCampaignConfig();
    const submissions = getActiveSubmissions();
    const topicCounts = {};

    campaign.topics.forEach(t => {
      topicCounts[t] = 0;
    });

    staffList.forEach(s => {
      const sub = submissions[s.emp_id];
      if (sub) {
        const topicKey = sub.topic || sub.clip_title || '💬 หัวข้ออิสระ / อื่นๆ';
        if (topicCounts[topicKey] !== undefined) {
          topicCounts[topicKey] += 1;
        } else {
          topicCounts[topicKey] = (topicCounts[topicKey] || 0) + 1;
        }
      }
    });

    return sendJSON(res, 200, {
      success: true,
      data: campaign,
      topic_counts: topicCounts
    });
  }

  // POST /api/campaign - Update campaign config (Admin Topic Manager)
  if (req.method === 'POST' && pathname === '/api/campaign') {
    try {
      const body = await parseBody(req);
      const current = getCampaignConfig();

      const rawTopics = Array.isArray(body.topics)
        ? body.topics.map(t => String(t).trim()).filter(Boolean)
        : current.topics;

      if (rawTopics.length === 0) {
        return sendJSON(res, 400, { success: false, message: 'ต้องมีหัวข้อคลิปอย่างน้อย 1 หัวข้อ' });
      }

      const updated = {
        active_topic: String(body.active_topic || rawTopics[0]).trim(),
        campaign_period: String(body.campaign_period || current.campaign_period).trim(),
        deadline: String(body.deadline !== undefined ? body.deadline : current.deadline).trim(),
        rules: String(body.rules !== undefined ? body.rules : current.rules).trim(),
        hashtags: String(body.hashtags !== undefined ? body.hashtags : current.hashtags).trim(),
        topics: rawTopics,
        updated_at: new Date().toISOString()
      };

      writeJSON(CAMPAIGN_FILE, updated);
      return sendJSON(res, 200, {
        success: true,
        message: 'บันทึกการตั้งค่าหัวข้อแคมเปญเรียบร้อยแล้ว',
        data: updated
      });
    } catch (err) {
      console.error('Error updating campaign:', err);
      return sendJSON(res, 500, { success: false, message: err.message });
    }
  }

  // GET /api/staff - Return PIA staff list with submission status
  if (req.method === 'GET' && pathname === '/api/staff') {
    const submissions = getActiveSubmissions();
    const rawSubmissions = getRawSubmissions();
    const result = staffList.map(staff => {
      const sub = submissions[staff.emp_id] || null;
      return {
        ...staff,
        is_submitted: Boolean(sub),
        submission: sub
      };
    });
    return sendJSON(res, 200, {
      success: true,
      target_position: TARGET_POSITION,
      count: result.length,
      data: result,
      raw_submissions: rawSubmissions
    });
  }

  // GET /api/branches - Return branch summary for PIA staff
  if (req.method === 'GET' && pathname === '/api/branches') {
    const submissions = getActiveSubmissions();
    const branchesMap = {};

    staffList.forEach(staff => {
      const code = staff.shop_code;
      if (!branchesMap[code]) {
        branchesMap[code] = {
          shop_code: code,
          shop_name: staff.shop_name,
          total_staff: 0,
          submitted_count: 0,
          staff: []
        };
      }
      const isSub = Boolean(submissions[staff.emp_id]);
      branchesMap[code].total_staff += 1;
      if (isSub) branchesMap[code].submitted_count += 1;
      branchesMap[code].staff.push({
        ...staff,
        is_submitted: isSub,
        submission: submissions[staff.emp_id] || null
      });
    });

    const branches = Object.values(branchesMap).map(b => ({
      ...b,
      pending_count: b.total_staff - b.submitted_count,
      percent: b.total_staff > 0 ? Math.round((b.submitted_count / b.total_staff) * 100) : 0
    }));

    // Sort by shop code
    branches.sort((a, b) => parseInt(a.shop_code) - parseInt(b.shop_code));
    return sendJSON(res, 200, { success: true, target_position: TARGET_POSITION, data: branches });
  }

  // POST /api/submit - Submit or update TikTok link (PIA only)
  if (req.method === 'POST' && pathname === '/api/submit') {
    try {
      const body = await parseBody(req);
      const { emp_id, tiktok_url, topic, custom_topic, clip_title, notes } = body;

      if (!emp_id) {
        return sendJSON(res, 400, { success: false, message: 'กรุณาระบุรหัสพนักงาน' });
      }

      const inputEmpId = String(emp_id).trim();
      const staff = staffList.find(s => s.emp_id === inputEmpId);
      
      // If not in PIA staff list, check if exists in all staff
      if (!staff) {
        const nonPia = allStaffList.find(s => s.emp_id === inputEmpId);
        if (nonPia) {
          return sendJSON(res, 400, {
            success: false,
            message: `แคมเปญนี้กำหนดให้เฉพาะตำแหน่ง ${TARGET_POSITION} เท่านั้นในการส่งคลิป (ท่านอยู่ในตำแหน่ง ${nonPia.position})`
          });
        }
        return sendJSON(res, 404, { success: false, message: 'ไม่พบข้อมูลรหัสพนักงานนี้ในระบบ' });
      }

      let cleanUrl = (tiktok_url || '').trim();
      if (!cleanUrl) {
        return sendJSON(res, 400, { success: false, message: 'กรุณากรอกลิงก์คลิป TikTok' });
      }

      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const selectedTopic = (topic || clip_title || '').trim() || '💬 หัวข้ออิสระ / อื่นๆ';
      const customText = (custom_topic || '').trim();
      const displayTitle = customText
        ? `${selectedTopic} (${customText})`
        : selectedTopic;

      const submissions = getRawSubmissions();
      const now = new Date().toISOString();
      const existing = submissions[staff.emp_id] && !submissions[staff.emp_id].deleted
        ? submissions[staff.emp_id]
        : null;

      const submissionRecord = {
        emp_id: staff.emp_id,
        emp_name: staff.full_name,
        shop_code: staff.shop_code,
        shop_name: staff.shop_name,
        position: staff.position,
        tiktok_url: cleanUrl,
        topic: selectedTopic,
        custom_topic: customText,
        clip_title: displayTitle,
        notes: (notes || '').trim(),
        submitted_at: existing ? existing.submitted_at : now,
        updated_at: now
      };

      submissions[staff.emp_id] = submissionRecord;
      writeJSON(SUBMISSIONS_FILE, submissions);

      return sendJSON(res, 200, {
        success: true,
        message: existing ? 'อัปเดตข้อมูลคลิปเรียบร้อยแล้ว' : 'บันทึกข้อมูลคลิป TikTok เรียบร้อยแล้ว',
        data: submissionRecord
      });
    } catch (err) {
      console.error('Error submitting:', err);
      return sendJSON(res, 500, { success: false, message: err.message });
    }
  }

  // DELETE /api/submission/:emp_id - Delete submission (with tombstone so seed/sync won't resurrect)
  if (req.method === 'DELETE' && pathname.startsWith('/api/submission/')) {
    const emp_id = pathname.replace('/api/submission/', '').trim();
    const submissions = getRawSubmissions();
    if (submissions[emp_id] && !submissions[emp_id].deleted) {
      submissions[emp_id] = {
        emp_id,
        deleted: true,
        updated_at: new Date().toISOString()
      };
      writeJSON(SUBMISSIONS_FILE, submissions);
      return sendJSON(res, 200, { success: true, message: 'ลบข้อมูลเรียบร้อยแล้ว' });
    }
    return sendJSON(res, 404, { success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' });
  }

  // GET /api/export - Export CSV file for PIA staff with Thai UTF-8 BOM
  if (req.method === 'GET' && pathname === '/api/export') {
    const submissions = getActiveSubmissions();
    
    // CSV Header with BOM
    let csv = '\ufeffลำดับ,รอบเดือน,รหัสพนักงาน,ชื่อ-นามสกุล,ตำแหน่ง,รหัสสาขา,ชื่อสาขา,สถานะ,ลิงก์ TikTok,หัวข้อคลิป,รายละเอียดเพิ่มเติม,หมายเหตุ,วันที่ส่งข้อมูล\n';

    staffList.forEach((s, idx) => {
      const sub = submissions[s.emp_id];
      const status = sub ? 'ส่งแล้ว' : 'ยังไม่ส่ง';
      const tiktokUrl = sub ? `"${sub.tiktok_url.replace(/"/g, '""')}"` : '""';
      const topicVal = sub ? `"${(sub.topic || sub.clip_title || '').replace(/"/g, '""')}"` : '""';
      const customVal = sub ? `"${(sub.custom_topic || '').replace(/"/g, '""')}"` : '""';
      const notes = sub ? `"${(sub.notes || '').replace(/"/g, '""')}"` : '""';
      const dateStr = sub ? new Date(sub.updated_at).toLocaleString('th-TH') : '';

      csv += `${idx + 1},${s.month},"${s.emp_id}","${s.full_name}","${s.position}","${s.shop_code}","${s.shop_name}","${status}",${tiktokUrl},${topicVal},${customVal},${notes},"${dateStr}"\n`;
    });

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tiktok_staff_PIA_report_${new Date().toISOString().slice(0, 10)}.csv"`
    });
    return res.end(csv);
  }

  // --- Static Files Protection ---
  if (['/server.js', '/package.json', '/Satff.xlsx'].includes(pathname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // --- Static Files ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Internal Server Error');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, must-revalidate'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Studio 7 TikTok Tracker (Target: PIA Only - ${staffList.length} Staff)`);
  console.log(`   👉 Running on: http://localhost:${PORT}`);
  console.log(`====================================================`);

  // Ensure initial merged submissions are persisted to disk
  try {
    writeJSON(SUBMISSIONS_FILE, getRawSubmissions());
  } catch (e) {
    console.warn('Could not write initial submissions file:', e.message);
  }

  // Keep-Alive Self-Ping on Render every 10 minutes so Free Tier doesn't sleep after 15 mins
  const externalUrl = process.env.RENDER_EXTERNAL_URL || 'https://studio7-tiktok-tracker.onrender.com';
  setInterval(() => {
    try {
      https.get(`${externalUrl}/api/ping`, (res) => {
        res.resume();
      }).on('error', () => {});
    } catch (e) {}
  }, 10 * 60 * 1000);
});
