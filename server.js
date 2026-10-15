const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STAFF_FILE = path.join(DATA_DIR, 'staff.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

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

// Load staff data
const TARGET_POSITION = 'PIA';
const allStaffList = readJSON(STAFF_FILE, []);
if (allStaffList.length === 0) {
  console.warn('Warning: staff.json is empty or not found.');
}

// Filter only target position: PIA
const staffList = allStaffList.filter(s => s.position.trim().toUpperCase() === TARGET_POSITION);
console.log(`Loaded ${allStaffList.length} total staff. Filtered to ${staffList.length} target staff with position: ${TARGET_POSITION}`);

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

  // GET /api/staff - Return PIA staff list with submission status
  if (req.method === 'GET' && pathname === '/api/staff') {
    const submissions = readJSON(SUBMISSIONS_FILE, {});
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
      data: result
    });
  }

  // GET /api/branches - Return branch summary for PIA staff
  if (req.method === 'GET' && pathname === '/api/branches') {
    const submissions = readJSON(SUBMISSIONS_FILE, {});
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
      const { emp_id, tiktok_url, clip_title, notes } = body;

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

      const submissions = readJSON(SUBMISSIONS_FILE, {});
      const now = new Date().toISOString();
      const existing = submissions[staff.emp_id];

      const submissionRecord = {
        emp_id: staff.emp_id,
        emp_name: staff.full_name,
        shop_code: staff.shop_code,
        shop_name: staff.shop_name,
        position: staff.position,
        tiktok_url: cleanUrl,
        clip_title: (clip_title || '').trim() || 'คลิป TikTok',
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

  // DELETE /api/submission/:emp_id - Delete submission
  if (req.method === 'DELETE' && pathname.startsWith('/api/submission/')) {
    const emp_id = pathname.replace('/api/submission/', '').trim();
    const submissions = readJSON(SUBMISSIONS_FILE, {});
    if (submissions[emp_id]) {
      delete submissions[emp_id];
      writeJSON(SUBMISSIONS_FILE, submissions);
      return sendJSON(res, 200, { success: true, message: 'ลบข้อมูลเรียบร้อยแล้ว' });
    }
    return sendJSON(res, 404, { success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' });
  }

  // GET /api/export - Export CSV file for PIA staff with Thai UTF-8 BOM
  if (req.method === 'GET' && pathname === '/api/export') {
    const submissions = readJSON(SUBMISSIONS_FILE, {});
    
    // CSV Header with BOM
    let csv = '\ufeffลำดับ,รอบเดือน,รหัสพนักงาน,ชื่อ-นามสกุล,ตำแหน่ง,รหัสสาขา,ชื่อสาขา,สถานะ,ลิงก์ TikTok,หัวข้อคลิป,หมายเหตุ,วันที่ส่งข้อมูล\n';

    staffList.forEach((s, idx) => {
      const sub = submissions[s.emp_id];
      const status = sub ? 'ส่งแล้ว' : 'ยังไม่ส่ง';
      const tiktokUrl = sub ? `"${sub.tiktok_url.replace(/"/g, '""')}"` : '""';
      const clipTitle = sub ? `"${(sub.clip_title || '').replace(/"/g, '""')}"` : '""';
      const notes = sub ? `"${(sub.notes || '').replace(/"/g, '""')}"` : '""';
      const dateStr = sub ? new Date(sub.updated_at).toLocaleString('th-TH') : '';

      csv += `${idx + 1},${s.month},"${s.emp_id}","${s.full_name}","${s.position}","${s.shop_code}","${s.shop_name}","${status}",${tiktokUrl},${clipTitle},${notes},"${dateStr}"\n`;
    });

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tiktok_staff_PIA_report_${new Date().toISOString().slice(0, 10)}.csv"`
    });
    return res.end(csv);
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
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Studio 7 TikTok Tracker (Target: PIA Only - 51 Staff)`);
  console.log(`   👉 Running on: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
