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

// Built-in seed submissions so Render redeployments never wipe existing submissions
const SEED_SUBMISSIONS = {
  "11507": {
    "emp_id": "11507",
    "emp_name": "อมราวดี ทาทองมา",
    "shop_code": "413",
    "shop_name": "ID413 : Studio 7-V-Square-Nakhonsawan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghMaUnU/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T07:51:14.666Z",
    "updated_at": "2026-10-19T07:51:24.775Z"
  },
  "13492": {
    "emp_id": "13492",
    "emp_name": "วราวุฒิ เพชร์แจ่ม",
    "shop_code": "282",
    "shop_name": "ID282 : Studio 7-Big C-Kamphaengphet",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh4yTe6/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T10:40:50.466Z",
    "updated_at": "2026-10-19T10:40:50.466Z"
  },
  "13807": {
    "emp_id": "13807",
    "emp_name": "สุนิสา แสนเปา",
    "shop_code": "412",
    "shop_name": "ID412 : Studio 7-Big C-Tak",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgXoJ9JC/",
    "topic": "Cover Plus",
    "custom_topic": "",
    "clip_title": "Cover Plus",
    "notes": "",
    "submitted_at": "2026-10-18T14:16:39.239Z",
    "updated_at": "2026-10-26T14:25:35.381Z"
  },
  "15229": {
    "emp_id": "15229",
    "emp_name": "วันชนะ พรหมบัณฑิต",
    "shop_code": "2466",
    "shop_name": "ID2466 : Studio 7-Lotus-Uttaradit",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSJYY1p/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T06:50:26.287Z",
    "updated_at": "2026-10-20T06:50:26.287Z"
  },
  "15765": {
    "emp_id": "15765",
    "emp_name": "สุวีณา เม่นขาว",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh65REX/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T07:42:32.550Z",
    "updated_at": "2026-10-19T07:43:05.570Z"
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
  "18022": {
    "emp_id": "18022",
    "emp_name": "ณัฐกานต์ กาญจนาธนพัฒน์",
    "shop_code": "282",
    "shop_name": "ID282 : Studio 7-Big C-Kamphaengphet",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh9gtrS/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T10:04:20.572Z",
    "updated_at": "2026-10-19T10:04:20.572Z"
  },
  "18577": {
    "emp_id": "18577",
    "emp_name": "สุภาภรณ์ ขันกะสิกรรม",
    "shop_code": "413",
    "shop_name": "ID413 : Studio 7-V-Square-Nakhonsawan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghSkgkf/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T06:43:13.422Z",
    "updated_at": "2026-10-20T08:36:10.512Z"
  },
  "20162": {
    "emp_id": "20162",
    "emp_name": "สุนันท์ สวัสดิ์พูน",
    "shop_code": "389",
    "shop_name": "ID389 : Studio 7-Lotus-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghKU6pr/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T12:51:28.208Z",
    "updated_at": "2026-10-19T12:51:51.459Z"
  },
  "20188": {
    "emp_id": "20188",
    "emp_name": "พีรพงศ์ จันทร์เดช",
    "shop_code": "2522",
    "shop_name": "ID2522 : Studio7-Big C-Mueang-Sukhothai",
    "position": "PIA",
    "tiktok_url": "https://www.tt.site/t/ZSgrpH91e/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T04:06:46.012Z",
    "updated_at": "2026-10-19T04:06:58.548Z"
  },
  "20323": {
    "emp_id": "20323",
    "emp_name": "สิณีนารถ ทิพย์โสตร์",
    "shop_code": "389",
    "shop_name": "ID389 : Studio 7-Lotus-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSdEqLm/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T07:17:49.334Z",
    "updated_at": "2026-10-20T07:17:56.887Z"
  },
  "21365": {
    "emp_id": "21365",
    "emp_name": "นพพล พุกเปี่ยม",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSB9fJF/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T09:12:06.554Z",
    "updated_at": "2026-10-20T09:12:06.554Z"
  },
  "22712": {
    "emp_id": "22712",
    "emp_name": "ฐานิศา ปัญญา",
    "shop_code": "389",
    "shop_name": "ID389 : Studio 7-Lotus-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh74gY4/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T12:07:04.114Z",
    "updated_at": "2026-10-19T12:07:04.114Z"
  },
  "23037": {
    "emp_id": "23037",
    "emp_name": "มนต์ชัย คงที่อยู่",
    "shop_code": "586",
    "shop_name": "ID586 : Studio 7-Lotus-Phetchabun",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSggrLATR/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T07:38:08.929Z",
    "updated_at": "2026-10-28T05:24:42.232Z"
  },
  "23454": {
    "emp_id": "23454",
    "emp_name": "สุภัสสร สายถิ่น",
    "shop_code": "420",
    "shop_name": "ID420 : Studio 7-MarkFour-Phrae",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSg6K4vSL/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T11:33:16.922Z",
    "updated_at": "2026-10-18T11:33:16.922Z"
  },
  "24711": {
    "emp_id": "24711",
    "emp_name": "ภูมินทร์ อินต๊ะจักร",
    "shop_code": "420",
    "shop_name": "ID420 : Studio 7-MarkFour-Phrae",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgMdaxDa/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T11:38:07.263Z",
    "updated_at": "2026-10-18T11:38:07.263Z"
  },
  "24971": {
    "emp_id": "24971",
    "emp_name": "ธัญน์สิริ ศรีใส",
    "shop_code": "413",
    "shop_name": "ID413 : Studio 7-V-Square-Nakhonsawan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghbw97Q/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T11:57:51.060Z",
    "updated_at": "2026-10-19T11:57:51.060Z"
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
  },
  "27392": {
    "emp_id": "27392",
    "emp_name": "พรลักษณ์ พิมพิสุทธิ์",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSDuGpn/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T09:40:13.012Z",
    "updated_at": "2026-10-20T09:40:31.640Z"
  },
  "27813": {
    "emp_id": "27813",
    "emp_name": "ปิยณัฐ ม่วงมั่งมี",
    "shop_code": "413",
    "shop_name": "ID413 : Studio 7-V-Square-Nakhonsawan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh6v4Yq/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T07:51:14.139Z",
    "updated_at": "2026-10-19T07:51:14.139Z"
  },
  "28307": {
    "emp_id": "28307",
    "emp_name": "อมรรัตน์ วิงวาท",
    "shop_code": "2466",
    "shop_name": "ID2466 : Studio 7-Lotus-Uttaradit",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSRvKF9/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T07:24:01.472Z",
    "updated_at": "2026-10-20T07:24:01.472Z"
  },
  "28314": {
    "emp_id": "28314",
    "emp_name": "ฐิติมา ทาระวา",
    "shop_code": "2466",
    "shop_name": "ID2466 : Studio 7-Lotus-Uttaradit",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgBoToy8/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T06:42:54.168Z",
    "updated_at": "2026-10-20T06:42:54.168Z"
  },
  "28335": {
    "emp_id": "28335",
    "emp_name": "อัญนิกา ใสดี",
    "shop_code": "586",
    "shop_name": "ID586 : Studio 7-Lotus-Phetchabun",
    "position": "PIA",
    "tiktok_url": "https://www.tt.site/t/ZSgh2G762/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-16T10:01:29.008Z",
    "updated_at": "2026-10-19T07:27:45.838Z"
  },
  "28395": {
    "emp_id": "28395",
    "emp_name": "ศรัญรัตน์ งานการ",
    "shop_code": "420",
    "shop_name": "ID420 : Studio 7-MarkFour-Phrae",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgMNcLVj/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T12:18:02.433Z",
    "updated_at": "2026-10-18T12:18:02.433Z"
  },
  "28457": {
    "emp_id": "28457",
    "emp_name": "สุราณี ใจเกี๋ยง",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghQWSLT/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T10:24:10.219Z",
    "updated_at": "2026-10-19T10:24:10.219Z"
  },
  "28487": {
    "emp_id": "28487",
    "emp_name": "เดือนนภา ปะละตุ่น",
    "shop_code": "412",
    "shop_name": "ID412 : Studio 7-Big C-Tak",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgfv1kQe/",
    "topic": "Cover Plus",
    "custom_topic": "",
    "clip_title": "Cover Plus",
    "notes": "",
    "submitted_at": "2026-10-18T11:42:48.634Z",
    "updated_at": "2026-10-22T09:50:02.061Z"
  },
  "28495": {
    "emp_id": "28495",
    "emp_name": "ธีระวัตย์ สมทอง",
    "shop_code": "586",
    "shop_name": "ID586 : Studio 7-Lotus-Phetchabun",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghrMwky/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T07:57:55.092Z",
    "updated_at": "2026-10-19T07:57:55.092Z"
  },
  "28653": {
    "emp_id": "28653",
    "emp_name": "ภัสยากรณ์ มิฟองฟู",
    "shop_code": "653",
    "shop_name": "ID653 : Studio 7-Robinson-Maesod",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgrwCnV5/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T05:38:31.044Z",
    "updated_at": "2026-10-19T05:38:31.044Z"
  },
  "29183": {
    "emp_id": "29183",
    "emp_name": "น้ำฝน บุญชู",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgS5fThK/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T10:18:35.633Z",
    "updated_at": "2026-10-20T10:18:35.633Z"
  },
  "29188": {
    "emp_id": "29188",
    "emp_name": "สุรศักดิ์ สุราภัย",
    "shop_code": "282",
    "shop_name": "ID282 : Studio 7-Big C-Kamphaengphet",
    "position": "PIA",
    "tiktok_url": "https://www.tt.site/t/ZSgSdj9wV/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T07:08:47.640Z",
    "updated_at": "2026-10-20T07:08:47.640Z"
  },
  "29732": {
    "emp_id": "29732",
    "emp_name": "วชิรวิทย์ บุญคง",
    "shop_code": "2522",
    "shop_name": "ID2522 : Studio7-Big C-Mueang-Sukhothai",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgMAJ9uU/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T14:04:54.441Z",
    "updated_at": "2026-10-18T14:04:54.441Z"
  },
  "31647": {
    "emp_id": "31647",
    "emp_name": "ปณัฐดา กัลปนาท",
    "shop_code": "2800",
    "shop_name": "ID2800 : Studio7-Big C-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghGLYKh/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T11:31:59.941Z",
    "updated_at": "2026-10-19T11:31:59.941Z"
  },
  "31783": {
    "emp_id": "31783",
    "emp_name": "สีแพร จันฉิม",
    "shop_code": "2800",
    "shop_name": "ID2800 : Studio7-Big C-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://www.tt.site/t/ZSgrvu1RM/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T05:05:54.479Z",
    "updated_at": "2026-10-19T05:05:54.479Z"
  },
  "32042": {
    "emp_id": "32042",
    "emp_name": "รินสิริ กลิ่นแสง",
    "shop_code": "2522",
    "shop_name": "ID2522 : Studio7-Big C-Mueang-Sukhothai",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghyfEyG/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T09:01:06.954Z",
    "updated_at": "2026-10-19T09:01:14.664Z"
  },
  "32665": {
    "emp_id": "32665",
    "emp_name": "จารุวรรณ ลอดลา",
    "shop_code": "1484",
    "shop_name": "ID1484 : Studio 7(P)-Mueang-Uttaradit",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh73vXQ/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T12:06:45.777Z",
    "updated_at": "2026-10-19T12:06:57.279Z"
  },
  "32675": {
    "emp_id": "32675",
    "emp_name": "ศิรภัสกรณ์ สมัครเขตรการ",
    "shop_code": "412",
    "shop_name": "ID412 : Studio 7-Big C-Tak",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgMLcvnH/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-18T12:07:31.816Z",
    "updated_at": "2026-10-18T12:07:44.412Z"
  },
  "33107": {
    "emp_id": "33107",
    "emp_name": "ปณิดา เตินขุนทด",
    "shop_code": "653",
    "shop_name": "ID653 : Studio 7-Robinson-Maesod",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSwvyMS/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T14:07:38.744Z",
    "updated_at": "2026-10-20T14:07:51.651Z"
  },
  "33186": {
    "emp_id": "33186",
    "emp_name": "ชญานิน ทวีทรัพย์มนตรี",
    "shop_code": "653",
    "shop_name": "ID653 : Studio 7-Robinson-Maesod",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghppkWL/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T11:24:19.386Z",
    "updated_at": "2026-10-19T11:24:19.386Z"
  },
  "33357": {
    "emp_id": "33357",
    "emp_name": "สุทธวีร์ โปทาเมือง",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSeCA59/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T07:04:58.711Z",
    "updated_at": "2026-10-20T07:05:22.136Z"
  },
  "33454": {
    "emp_id": "33454",
    "emp_name": "เสาวลักษณ์ ครุฑเครือ",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh6xrLr/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T07:44:32.123Z",
    "updated_at": "2026-10-19T07:44:32.123Z"
  },
  "34094": {
    "emp_id": "34094",
    "emp_name": "แพรวพรรณ สมัยกุล",
    "shop_code": "2800",
    "shop_name": "ID2800 : Studio7-Big C-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgS8Y57t/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T07:27:56.376Z",
    "updated_at": "2026-10-20T07:27:56.376Z"
  },
  "34153": {
    "emp_id": "34153",
    "emp_name": "วรชิต ประทุม",
    "shop_code": "413",
    "shop_name": "ID413 : Studio 7-V-Square-Nakhonsawan",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgBovw7f/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T06:42:01.045Z",
    "updated_at": "2026-10-20T06:42:01.045Z"
  },
  "34918": {
    "emp_id": "34918",
    "emp_name": "ลลิชา สังข์ชัย",
    "shop_code": "586",
    "shop_name": "ID586 : Studio 7-Lotus-Phetchabun",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSghMUd2Y/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-16T10:04:10.614Z",
    "updated_at": "2026-10-19T07:50:30.363Z"
  },
  "35074": {
    "emp_id": "35074",
    "emp_name": "เมดินา สมอทอง",
    "shop_code": "1484",
    "shop_name": "ID1484 : Studio 7(P)-Mueang-Uttaradit",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSJR8W6/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T06:51:19.357Z",
    "updated_at": "2026-10-20T06:51:19.357Z"
  },
  "35147": {
    "emp_id": "35147",
    "emp_name": "ธานินทร์ วงษ์ใหม่",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgh6MaRK/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-19T07:43:39.177Z",
    "updated_at": "2026-10-19T07:43:39.177Z"
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
  "35238": {
    "emp_id": "35238",
    "emp_name": "ทูเซ สราญตระกูลไพร",
    "shop_code": "653",
    "shop_name": "ID653 : Studio 7-Robinson-Maesod",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgSpwj7m/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T12:30:59.793Z",
    "updated_at": "2026-10-20T12:30:59.793Z"
  },
  "35253": {
    "emp_id": "35253",
    "emp_name": "ฐิติพงศ์ ไชยชิต",
    "shop_code": "246",
    "shop_name": "ID246 : Studio 7-Central-Phitsanulok",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgS2oxEJ/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T08:13:04.085Z",
    "updated_at": "2026-10-20T08:13:04.085Z"
  },
  "35259": {
    "emp_id": "35259",
    "emp_name": "ศกุญณา ปัญญาดิษฐวงษ์",
    "shop_code": "653",
    "shop_name": "ID653 : Studio 7-Robinson-Maesod",
    "position": "PIA",
    "tiktok_url": "https://vt.tiktok.com/ZSgS7s5DF/",
    "topic": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "custom_topic": "",
    "clip_title": "🎧 รีวิวอุปกรณ์เสริม BTB(3rd)",
    "notes": "",
    "submitted_at": "2026-10-20T13:26:12.513Z",
    "updated_at": "2026-10-20T13:26:12.513Z"
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

// Normalize a submission record so it always carries a per-topic `by_topic` map
function normalizeRecord(rec) {
  if (!rec || rec.deleted) return rec;
  const copy = { ...rec };
  const byTopic = (copy.by_topic && typeof copy.by_topic === 'object') ? { ...copy.by_topic } : {};
  const tKey = copy.topic || copy.clip_title || '💬 หัวข้ออิสระ / อื่นๆ';
  if (copy.tiktok_url) {
    const existingTopicEntry = byTopic[tKey];
    if (!existingTopicEntry || new Date(copy.updated_at || 0) >= new Date(existingTopicEntry.updated_at || 0)) {
      byTopic[tKey] = {
        emp_id: copy.emp_id,
        emp_name: copy.emp_name,
        shop_code: copy.shop_code,
        shop_name: copy.shop_name,
        position: copy.position,
        tiktok_url: copy.tiktok_url,
        topic: tKey,
        custom_topic: copy.custom_topic || '',
        clip_title: copy.clip_title || tKey,
        notes: copy.notes || '',
        submitted_at: copy.submitted_at || copy.updated_at,
        updated_at: copy.updated_at
      };
    }
  }
  copy.by_topic = byTopic;
  return copy;
}

// Merge two records for the same employee, preserving submissions across all topics
function mergeRecords(existing, incoming) {
  if (!existing) return normalizeRecord(incoming);
  if (!incoming) return normalizeRecord(existing);
  if (incoming.deleted) {
    return new Date(incoming.updated_at || 0) >= new Date(existing.updated_at || 0)
      ? incoming
      : normalizeRecord(existing);
  }
  if (existing.deleted) {
    return new Date(incoming.updated_at || 0) > new Date(existing.updated_at || 0)
      ? normalizeRecord(incoming)
      : existing;
  }
  const normEx = normalizeRecord(existing);
  const normIn = normalizeRecord(incoming);
  const mergedByTopic = { ...(normEx.by_topic || {}) };
  for (const [tKey, tRec] of Object.entries(normIn.by_topic || {})) {
    if (!tRec || !tRec.tiktok_url) continue;
    const prev = mergedByTopic[tKey];
    if (!prev || new Date(tRec.updated_at || 0) >= new Date(prev.updated_at || 0)) {
      mergedByTopic[tKey] = tRec;
    }
  }
  const isIncomingNewer = new Date(normIn.updated_at || 0) >= new Date(normEx.updated_at || 0);
  const primary = isIncomingNewer ? { ...normIn } : { ...normEx };
  primary.by_topic = mergedByTopic;
  return primary;
}

// Helper to read all submissions (including seed data and tombstones)
function getRawSubmissions() {
  const disk = readJSON(SUBMISSIONS_FILE, {});
  const merged = {};
  for (const [empId, seedRec] of Object.entries(SEED_SUBMISSIONS)) {
    merged[empId] = normalizeRecord(seedRec);
  }
  for (const [empId, record] of Object.entries(disk)) {
    if (!record) continue;
    merged[empId] = mergeRecords(merged[empId], record);
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
        const merged = mergeRecords(existing, rec);
        if (JSON.stringify(merged) !== JSON.stringify(existing)) {
          currentRaw[empId] = merged;
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
        const byTopic = sub.by_topic && typeof sub.by_topic === 'object' ? sub.by_topic : {};
        const topicKeys = Object.keys(byTopic).filter(k => byTopic[k] && byTopic[k].tiktok_url);
        if (topicKeys.length > 0) {
          topicKeys.forEach(topicKey => {
            topicCounts[topicKey] = (topicCounts[topicKey] || 0) + 1;
          });
        } else {
          const topicKey = sub.topic || sub.clip_title || '💬 หัวข้ออิสระ / อื่นๆ';
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
        ? normalizeRecord(submissions[staff.emp_id])
        : null;

      const byTopic = existing && existing.by_topic ? { ...existing.by_topic } : {};
      const existingForTopic = byTopic[selectedTopic] || null;

      const topicEntry = {
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
        submitted_at: existingForTopic ? existingForTopic.submitted_at : now,
        updated_at: now
      };

      byTopic[selectedTopic] = topicEntry;

      const submissionRecord = {
        ...topicEntry,
        by_topic: byTopic
      };

      submissions[staff.emp_id] = submissionRecord;
      writeJSON(SUBMISSIONS_FILE, submissions);

      return sendJSON(res, 200, {
        success: true,
        message: existingForTopic ? 'อัปเดตข้อมูลคลิปเรียบร้อยแล้ว' : 'บันทึกข้อมูลคลิป TikTok เรียบร้อยแล้ว',
        data: submissionRecord
      });
    } catch (err) {
      console.error('Error submitting:', err);
      return sendJSON(res, 500, { success: false, message: err.message });
    }
  }

  // DELETE /api/submission/:emp_id - Delete submission (supports optional ?topic= parameter)
  if (req.method === 'DELETE' && pathname.startsWith('/api/submission/')) {
    const emp_id = pathname.replace('/api/submission/', '').trim();
    const targetTopic = parsedUrl.query && parsedUrl.query.topic ? String(parsedUrl.query.topic).trim() : '';
    const submissions = getRawSubmissions();
    if (submissions[emp_id] && !submissions[emp_id].deleted) {
      const rec = normalizeRecord(submissions[emp_id]);
      const byTopic = rec.by_topic ? { ...rec.by_topic } : {};
      if (targetTopic && targetTopic !== 'all' && byTopic[targetTopic]) {
        delete byTopic[targetTopic];
        const remainingTopics = Object.values(byTopic).filter(v => v && v.tiktok_url);
        if (remainingTopics.length > 0) {
          remainingTopics.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
          const latest = remainingTopics[0];
          submissions[emp_id] = {
            ...latest,
            updated_at: new Date().toISOString(),
            by_topic: byTopic
          };
          writeJSON(SUBMISSIONS_FILE, submissions);
          return sendJSON(res, 200, {
            success: true,
            message: `ลบข้อมูลคลิปหัวข้อ "${targetTopic}" เรียบร้อยแล้ว`,
            data: submissions[emp_id]
          });
        }
      }
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
    const filterTopic = parsedUrl.query && parsedUrl.query.topic ? String(parsedUrl.query.topic).trim() : '';
    
    // CSV Header with BOM
    let csv = '\ufeffลำดับ,รอบเดือน,รหัสพนักงาน,ชื่อ-นามสกุล,ตำแหน่ง,รหัสสาขา,ชื่อสาขา,สถานะ,ลิงก์ TikTok,หัวข้อคลิป,รายละเอียดเพิ่มเติม,หมายเหตุ,วันที่ส่งข้อมูล\n';

    staffList.forEach((s, idx) => {
      const rawSub = submissions[s.emp_id];
      let sub = rawSub;
      if (filterTopic && filterTopic !== 'all') {
        const byTopic = rawSub && rawSub.by_topic ? rawSub.by_topic : {};
        if (byTopic[filterTopic]) {
          sub = byTopic[filterTopic];
        } else if (rawSub && (rawSub.topic === filterTopic || rawSub.clip_title === filterTopic)) {
          sub = rawSub;
        } else {
          sub = null;
        }
      }
      const status = sub ? 'ส่งแล้ว' : 'ยังไม่ส่ง';
      const tiktokUrl = sub ? `"${sub.tiktok_url.replace(/"/g, '""')}"` : '""';
      const topicVal = sub ? `"${(sub.topic || sub.clip_title || '').replace(/"/g, '""')}"` : (filterTopic && filterTopic !== 'all' ? `"${filterTopic.replace(/"/g, '""')}"` : '""');
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
