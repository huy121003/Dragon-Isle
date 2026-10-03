/* LOGIC DỮ LIỆU: Công thức rồng dùng các bảng thuần JSON trong data/dragons/*.json. */
(function(root){
'use strict';
const DB=root.DragonDatabase;
const COMBAT_CONFIG=root.DragonConfig?.combat||(typeof module!=="undefined"&&module.exports?require("../config/combat.js"):null);
const DRAGON_CONFIG=root.DragonConfig?.dragons||(typeof module!=="undefined"&&module.exports?require("../config/dragons.js"):null);
const WORLD_CONFIG=root.DragonConfig?.world||(typeof module!=="undefined"&&module.exports?require("../config/world.js"):null);
const ELEMENTS=DB.elements, ELEMENT_IDS=Object.keys(ELEMENTS);
const TYPE_CHART=DB.typeChart, KHAC=DB.khac;
const RARITY=DB.rarities, PAIRS=DB.pairs, TRIPLES=DB.triples;
const TINH_TU=DB.adjectives, STAGE_INFO=DB.stageInfo;
function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/* LOGIC: Trọng số chỉ số và thứ tự hệ được áp dụng cho rồng lai. */
const WEIGHTS=COMBAT_CONFIG.elementWeights;
function typeMultiplier(attackElement, defenderElements) {
  return TYPE_CHART[attackElement][defenderElements[0]];
}

function rarityOf(elements) {
  const n = elements.length;
  if(n===4&&elements[0]===elements[1]&&
    new Set(elements).size===3)return 'transcendent';
  if (n === 1) return 'common';
  if (n === 2) return elements.some(e => e === 'dark' || e === 'light' || e === 'metal' || ELEMENTS[e].epicHybrid) ? 'epic' : 'rare';
  if (n === 3) return 'legendary';
  return 'mythic';
}

function tenRong(elements) {
  return elements.map(e => ELEMENTS[e].ten).join('-') + ' Dragon';
}
function hienTuongRong(elements) {
  return 'A fusion of ' + elements.map(e => ELEMENTS[e].ten).join(', ') + '.';
}

/** Catalog lifecycle stage derived from centralized dragon thresholds. */
function stageOf(level){
  return level<DRAGON_CONFIG.stages.adultAt?'non':
    level<DRAGON_CONFIG.stages.elderAt?'truongThanh':'toiThuong';
}

function buildDragon(elements) {
  const els = elements.slice(0, 4);
  const E = els.map(id => ELEMENTS[id]);
  const e0 = E[0], e1 = E[1] || E[0], e2 = E[2] || null;
  const rarityId = rarityOf(els);
  const R = RARITY[rarityId];

  // --- Chỉ số gốc: pha theo trọng số 60/40, 50/30/20, ... ---
  // The repeated affinity owns two slots, but the base blend stays comparable
  // to the corresponding three-element dragon before applying the middle tier.
  const w=rarityId==='transcendent'?COMBAT_CONFIG.transcendentWeights:WEIGHTS[Math.min(els.length,4)];
  const chiSo = { hp: 0, tanCong: 0, phongThu: 0 };
  E.forEach((e, i) => Object.keys(chiSo).forEach(k => { chiSo[k] += e.chiSo[k] * w[i]; }));
  Object.keys(chiSo).forEach(k => { chiSo[k] = Math.round(chiSo[k] * R.heSoChiSo * 10) / 10; });

  // --- Màu: thân/đầu/sừng từ hệ chính; cánh/đuôi/họa tiết từ hệ phụ; hào quang từ hệ nhỏ ---
  let mau = {
    than: els.length > 1 ? mix(e0.mau.chinh, e1.mau.chinh, 0.12) : e0.mau.chinh,
    thanSang: e0.mau.sang, thanToi: e0.mau.toi, bung: e0.mau.bung,
    sung: e0.mau.sung, mat: e0.mau.mat, vien: e0.mau.vien,
    canh: e1.mau.canh, canhMang: e1.mau.canhMang,
    duoi: els.length > 1 ? mix(e0.mau.chinh, e1.mau.chinh, 0.6) : e0.mau.chinh,
    hoaTiet: e1.mau.hoaTiet,
    haoQuang: e2 ? e2.mau.hao : (R.hao || null)
  };

  // --- Kiểu vẽ ---
  const kieu = { sung: e0.kieu.sung, canh: e1.kieu.canh, duoi: e1.kieu.duoi, hoaTiet: e1.kieu.hoaTiet };

  // --- Hạt hiệu ứng: hệ chính mạnh, hệ phụ nhẹ, hệ nhỏ thỉnh thoảng ---
  const hat = [{ he: e0.id, ...e0.hat, tanSuat: 1.0 }];
  if (E[1]) hat.push({ he: e1.id, ...e1.hat, tanSuat: 0.4 });
  if (e2)   hat.push({ he: e2.id, ...e2.hat, tanSuat: 0.15 });

  // Bốn vị trí chiêu tham chiếu các định nghĩa trong data/skills/*.json.
  const skillIds = els.length === 1 ? ['claw', 'slam', els[0] + '-1', els[0] + '-2']
    : (els.length === 2 ? ['claw', 'slam'] : els.length === 3 ? ['claw'] : [])
      .concat(els.map(e => e + '-1'));

  // --- Nội tại: hệ chính 100%, phụ 50%, nhỏ 25% ---
  const noiTai = E.map((e, i) => ({ ...e.noiTai, giaTri: Math.round(e.noiTai.giaTri * [1, 0.5, 0.25, 0.125][i] * 1000) / 1000, tuHe: e.id }));

  const dragon = {
    id: els.join('>'),
    ten: tenRong(els),
    elements: els,
    soHe: new Set(els).size,
    slotCount: els.length,
    doubleElement: rarityId==='transcendent'?els[0]:null,
    icon: e0.icon,
    iconPhu: E.slice(1).map(e => e.icon),
    doHiem: rarityId,
    doHiemTen: R.ten,
    vienMau: R.vien,
    hienTuong: els.length > 1 ? hienTuongRong(els) : e0.moTa,
    moTa: els.length === 1 ? e0.moTa
      : `Primary: ${e0.ten}; additional: ${E.slice(1).map(e => e.ten).join(', ')}. ${e0.moTa}`,
    sachGhi: 'Primary: ' + e0.ten + (E.length > 1 ? ', Additional: ' + E.slice(1).map(e => e.ten).join(', ') : ''),
    chiSo,                       // chỉ số gốc ở level 1 (chưa nhân độ hiếm ở getStats)
    mau, kieu, hat,
    trung: { nen: e0.mau.sang, cham: e1.mau.chinh, vien: R.vien },
    skillIds, noiTai,
    vangGioGoc: R.vangGio,
    apGiay: R.apGiay,
    giaTrung: R.giaTrung,
    giaBan: R.banGia,
    dieuKienDacBiet: null
  };
  return dragon;
}

/* ============================================================
   8. HÀM TÍNH TOÁN
   ============================================================ */
// Chỉ số theo level (1-100); hệ và độ hiếm đã quyết định chiSo gốc.
function getStats(dragon, level) {
  const value=root.DragonCombat.stats(dragon.elements,dragon.doHiem,level,ELEMENTS,RARITY);
  return {hp:value.hp,tanCong:value.attack,phongThu:value.defense,chiMang:0.10};
}
// XP cần để lên level kế
/** Legacy catalog XP helper kept deterministic for debug/catalog callers. */
function xpToNext(level){
  return Math.round(DRAGON_CONFIG.xp.base*Math.pow(level,DRAGON_CONFIG.xp.exponent));
}
// Vàng/giờ = base × 1.15^(lv-1) × (0.5 + hạnh phúc/100) × (1 + 0.1 × level chuồng) × (đói ? 0.5 : 1)
function goldPerHour(dragon, level, hanhPhuc, levelChuong, doi) {
  const income=WORLD_CONFIG.goldIncome;
  return Math.round(dragon.vangGioGoc*Math.pow(DRAGON_CONFIG.catalogIncomeLevelMultiplier,level-1)*
    (income.happinessBase+hanhPhuc/100)*(1+income.habitatLevelBonus*levelChuong)*
    (doi>=income.starvationAt?income.starvationMultiplier:1));
}

/* ---------- Danh sách dựng sẵn ---------- */
function allDragons(maxHe) {
  maxHe = maxHe || 2;
  const list = [];
  ELEMENT_IDS.forEach(a => list.push(buildDragon([a])));
  if (maxHe >= 2) ELEMENT_IDS.forEach(a => ELEMENT_IDS.forEach(b => { if (a !== b) list.push(buildDragon([a, b])); }));
  if (maxHe >= 3) ELEMENT_IDS.forEach(a => {
    const rest=ELEMENT_IDS.filter(e=>e!==a);
    for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++)
      list.push(buildDragon([a,rest[i],rest[j]]));
  });
  if (maxHe >= 4) DB.species.filter(s=>s.elements.length===4)
    .forEach(s=>list.push(s));
  return list;
}

const API = {
  ELEMENTS, ELEMENT_IDS, TYPE_CHART, KHAC, RARITY, PAIRS, TRIPLES, TINH_TU, STAGE_INFO,
  typeMultiplier, rarityOf, tenRong, buildDragon, getStats, stageOf, xpToNext, goldPerHour, allDragons, mix
};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.DragonData = API;

})(typeof window !== 'undefined' ? window : globalThis);
