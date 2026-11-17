/* ================= 台灣廟宇深度導覽圖錄：介面 =================
 * 兩個分頁：📜 圖錄（24 座廟卡片＋篩選＋詳細頁）、🔍 看廟入門（可點的立面圖／平面圖＋參拜順序）。
 * 立面圖全部是程式畫的示意（facade()），不放照片。分享連結 #…&t=<廟 id>。
 * 本檔在 app.js 之前載入：先記下開啟時的網址（app.js 會改寫 hash），DOMContentLoaded 後才初始化。
 */
(function(){
'use strict';
var initHash = new URLSearchParams(location.hash.slice(1));
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
function hash(str){ var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }

/* ---------- 立面圖（示意） ---------- */
function plaqueText(t){
  if (/武廟$/.test(t.name)) return '武廟';
  var n = t.name.replace(/（.*$/, '');
  return n.slice(-3);
}
var ROOFS = ['#a8432c', '#9a3a26', '#b5502f', '#8f3b2b'];
/* 依主祀神明換牆色、天色，讓卡片一眼分得出來（示意，不是實際配色） */
var LOOK = {
  mazu:{wall:'#b02a22', sky:['#f6c48a', '#fbe8cc']}, guanyin:{wall:'#8a5236', sky:['#e9c9a0', '#f8eedb'], roof:'#6f5a48'},
  baosheng:{wall:'#a8362a', sky:['#f2b98a', '#f9e6cc']}, guandi:{wall:'#8f1d1d', sky:['#efa88a', '#fae2d0']},
  wangye:{wall:'#c0442a', sky:['#f4b070', '#fde7c4'], roof:'#c98a2e'}, city:{wall:'#6a2a2a', sky:['#c9a8a0', '#efe2da']},
  other:{wall:'#9c3a2a', sky:['#e6c08f', '#f7ebd6']}
};
function facade(t, opt){
  opt = opt || {};
  var fa = t.fa || {doors:3, tier:1, roof:'yan'}, H = opt.anat ? 172 : 150, cx = 120;
  var lk = LOOK[t.god] || LOOK.other, wall = lk.wall;
  var bw = fa.doors === 1 ? 104 : 150, x0 = cx - bw / 2, x1 = cx + bw / 2, roof = lk.roof || ROOFS[hash(t.id || 'x') % ROOFS.length];
  var o = [];
  o.push('<svg viewBox="0 0 240 ' + H + '" class="fac" role="img" aria-label="' + esc(t.name) + '立面示意圖">');
  o.push('<defs><pattern id="tile' + (opt.uid || '') + '" width="5" height="6" patternUnits="userSpaceOnUse"><rect width="5" height="6" fill="' + roof + '"/><path d="M0 5.5 H5" stroke="rgba(0,0,0,.25)" stroke-width="1"/></pattern></defs>');
  var tile = 'url(#tile' + (opt.uid || '') + ')';
  function ridge(a, b, y, yan, sc){
    sc = sc || 1;
    var s = '<rect x="' + a + '" y="' + y + '" width="' + (b - a) + '" height="' + 5 * sc + '" fill="#e2cf9c" stroke="#7a1f17" stroke-width=".6"/>';
    if (yan){
      [[a, -1], [b, 1]].forEach(function(e){ var x = e[0], d = e[1];
        s += '<path d="M' + x + ' ' + (y + 2.5 * sc) + ' Q' + (x + d * 8 * sc) + ' ' + (y + 2 * sc) + ' ' + (x + d * 15 * sc) + ' ' + (y - 11 * sc) + '" stroke="#e2cf9c" stroke-width="' + 3.2 * sc + '" fill="none" stroke-linecap="round"/>' +
             '<path d="M' + x + ' ' + (y + 3 * sc) + ' Q' + (x + d * 9 * sc) + ' ' + (y + 4 * sc) + ' ' + (x + d * 17 * sc) + ' ' + (y - 5 * sc) + '" stroke="#e2cf9c" stroke-width="' + 2.2 * sc + '" fill="none" stroke-linecap="round"/>'; });
    } else {
      s += '<circle cx="' + a + '" cy="' + (y + 2.5 * sc) + '" r="' + 5 * sc + '" fill="#e2cf9c" stroke="#7a1f17" stroke-width=".6"/><circle cx="' + b + '" cy="' + (y + 2.5 * sc) + '" r="' + 5 * sc + '" fill="#e2cf9c" stroke="#7a1f17" stroke-width=".6"/>';
    }
    return s;
  }
  function roofShape(a, b, top, eave){
    return '<path d="M' + (a - 16) + ' ' + (eave - 5) + ' Q' + (a + 10) + ' ' + (eave + 2) + ' ' + (a + b) / 2 + ' ' + (eave + 1) + ' Q' + (b - 10) + ' ' + (eave + 2) + ' ' + (b + 16) + ' ' + (eave - 5) + ' L' + (b - 3) + ' ' + top + ' L' + (a + 3) + ' ' + top + ' Z" fill="' + tile + '" stroke="#5a1f14" stroke-width=".8"/>';
  }
  o.push('<defs><linearGradient id="sky' + (opt.uid || '') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + lk.sky[0] + '"/><stop offset="1" stop-color="' + lk.sky[1] + '"/></linearGradient></defs><rect width="240" height="140" fill="url(#sky' + (opt.uid || '') + ')"/>');
  if (t.herit === 'nat') o.push('<text x="8" y="14" font-size="8" fill="#7a1f17" font-weight="900" font-family="Noto Serif TC,serif">國定古蹟</text>');
  // 地面、台基
  o.push('<rect x="0" y="140" width="240" height="' + (H - 140) + '" fill="#e9d6ad"/>');
  o.push('<rect x="8" y="132" width="224" height="8" fill="#b9a98f" stroke="#8a7a62" stroke-width=".6"/><rect x="96" y="128" width="48" height="4" fill="#cbbb9e"/>');
  // 二層（重簷）
  if (fa.tier === 2){
    o.push('<rect x="' + (cx - 40) + '" y="44" width="80" height="20" fill="' + wall + '"/>');
    o.push(roofShape(cx - 40, cx + 40, 30, 46));
    o.push(ridge(cx - 37, cx + 37, 26, fa.roof === 'yan', .8));
    o.push('<circle cx="' + cx + '" cy="22" r="3" fill="#e8c35a"/>');
  }
  // 五開間：兩側護室
  if (fa.doors === 5){
    [[x0 - 30, x0], [x1, x1 + 30]].forEach(function(w){
      o.push('<rect x="' + w[0] + '" y="94" width="30" height="38" fill="' + wall + '"/><rect x="' + w[0] + '" y="118" width="30" height="14" fill="#cbbfa8"/>');
      o.push('<path d="M' + (w[0] - 6) + ' 92 L' + (w[1] + 6) + ' 92 L' + (w[1] - 2) + ' 82 L' + (w[0] + 2) + ' 82 Z" fill="' + tile + '" stroke="#5a1f14" stroke-width=".6"/>');
      o.push(ridge(w[0] + 2, w[1] - 2, 79, fa.roof === 'yan', .6));
      o.push('<rect x="' + (w[0] + 8) + '" y="102" width="14" height="24" fill="#7a1f17" stroke="#e8c35a" stroke-width=".7"/>');
    });
  }
  // 主殿牆身
  o.push('<rect x="' + x0 + '" y="83" width="' + bw + '" height="49" fill="' + wall + '"/>');
  o.push('<rect x="' + x0 + '" y="114" width="' + bw + '" height="18" fill="#cbbfa8"/>');
  // 墀頭交趾陶
  [x0, x1 - 10].forEach(function(x){ o.push('<rect x="' + x + '" y="84" width="10" height="11" fill="#2f6b5a"/><circle cx="' + (x + 5) + '" cy="88" r="2" fill="#e8c35a"/><rect x="' + (x + 2) + '" y="91" width="6" height="3" fill="#d6372e"/>'); });
  // 屋頂
  o.push(roofShape(x0, x1, 61, 80));
  // 斗栱帶
  o.push('<rect x="' + (x0 + 10) + '" y="80" width="' + (bw - 20) + '" height="4" fill="#3d2a1c"/>');
  for (var k = x0 + 14; k < x1 - 12; k += 9) o.push('<rect x="' + k + '" y="80.5" width="4" height="3" fill="#e8c35a"/>');
  // 屋脊＋剪黏雙龍搶珠
  o.push(ridge(x0 + 4, x1 - 4, 56, fa.roof === 'yan'));
  o.push('<path d="M' + (cx - 34) + ' 54 q6 -7 12 0 t12 0 q4 -4 6 -2" stroke="#2f8f6f" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
  o.push('<path d="M' + (cx + 34) + ' 54 q-6 -7 -12 0 t-12 0 q-4 -4 -6 -2" stroke="#2f6f8f" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
  o.push('<circle cx="' + cx + '" cy="49" r="4" fill="#e8c35a" stroke="#d6372e" stroke-width="1"/><path d="M' + cx + ' 44 l-2 -5 l2 2 l2 -2 z" fill="#d6372e"/>');
  ['#d6372e', '#e8c35a', '#2f8f6f', '#f3e2b6', '#2f6f8f'].forEach(function(c, i){ o.push('<circle cx="' + (x0 + 16 + i * 6) + '" cy="58.5" r="1.4" fill="' + c + '"/><circle cx="' + (x1 - 16 - i * 6) + '" cy="58.5" r="1.4" fill="' + c + '"/>'); });
  // 門
  function door(x, y, w, h, god){
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#7a1f17" stroke="#e8c35a" stroke-width=".8"/><path d="M' + (x + w / 2) + ' ' + y + ' V' + (y + h) + '" stroke="#e8c35a" stroke-width=".5"/>';
    if (god) [x + w / 4, x + w * 3 / 4].forEach(function(gx){ s += '<circle cx="' + gx + '" cy="' + (y + h * .3) + '" r="' + w * .09 + '" fill="#f0c890"/><path d="M' + (gx - w * .13) + ' ' + (y + h * .85) + ' L' + gx + ' ' + (y + h * .4) + ' L' + (gx + w * .13) + ' ' + (y + h * .85) + ' Z" fill="#2f6f8f" stroke="#e8c35a" stroke-width=".4"/>'; });
    return s;
  }
  o.push(door(cx - 14, 94, 28, 34, true));
  if (fa.doors >= 3){ o.push(door(cx - 52, 100, 20, 28, true)); o.push(door(cx + 32, 100, 20, 28, true)); }
  // 匾額
  o.push('<rect x="' + (cx - 20) + '" y="84.5" width="40" height="9" fill="#1f1410" stroke="#e8c35a" stroke-width=".8"/><text x="' + cx + '" y="91.6" text-anchor="middle" font-size="6.6" font-weight="900" fill="#e8c35a" font-family="Noto Serif TC,serif" letter-spacing="1">' + esc(plaqueText(t)) + '</text>');
  // 龍柱
  if (fa.doors >= 3) [cx - 24, cx + 24].forEach(function(x){ o.push('<rect x="' + (x - 3) + '" y="86" width="6" height="46" fill="#a9a08e"/><path d="M' + (x - 3) + ' 92 q6 3 0 6 q-6 3 0 6 q6 3 0 6 q-6 3 0 6 q6 3 0 6 q-6 3 0 6" stroke="#3d4a42" stroke-width="1.6" fill="none"/>'); });
  // 抱鼓石
  [cx - 17, cx + 17].forEach(function(x){ o.push('<circle cx="' + x + '" cy="127" r="3" fill="#b9b0a0" stroke="#6a6252" stroke-width=".5"/>'); });
  // 燈籠
  [x0 + 12, x1 - 12].forEach(function(x){ o.push('<path d="M' + x + ' 84 V89" stroke="#3d2a1c" stroke-width=".6"/><ellipse cx="' + x + '" cy="95" rx="5" ry="6" fill="#d6372e"/><rect x="' + (x - 3) + '" y="88.5" width="6" height="1.6" fill="#e8c35a"/><rect x="' + (x - 3) + '" y="100" width="6" height="1.6" fill="#e8c35a"/>'); });
  // 石獅（面向廟門右手邊＝龍邊雄獅踩繡球、左手邊＝虎邊母獅）
  o.push('<circle cx="' + (cx + 42) + '" cy="129" r="2.2" fill="#e8c35a" stroke="#6a6252" stroke-width=".4"/>');
  [cx - 36, cx + 36].forEach(function(x, i){ o.push('<rect x="' + (x - 5) + '" y="128" width="10" height="4" fill="#8a8272"/><ellipse cx="' + x + '" cy="124" rx="5" ry="4.5" fill="#b9b0a0" stroke="#6a6252" stroke-width=".5"/><circle cx="' + (x + (i ? -1 : 1)) + '" cy="118.5" r="3.6" fill="#b9b0a0" stroke="#6a6252" stroke-width=".5"/>'); });
  // 天公爐（入門圖才畫）
  if (opt.anat) o.push('<path d="M108 150 h24 l-3 10 h-18 z" fill="#8a6a2a" stroke="#4a3a1a" stroke-width=".6"/><rect x="106" y="147" width="28" height="4" rx="1" fill="#a8822e"/><path d="M112 160 v6 M128 160 v6" stroke="#4a3a1a" stroke-width="2"/><path d="M116 146 q-2 -6 1 -10 M120 146 q2 -7 -1 -12 M124 146 q-2 -5 1 -9" stroke="#bdb3a0" stroke-width="1" fill="none"/>');
  if (opt.anat) o.push(opt.anat);
  o.push('</svg>');
  return o.join('');
}
/* 入門圖的編號熱點：[部位 key, x, y] */
var HOT = [['ridge', 33, 42], ['jiannian', 98, 46], ['koji', 50, 100], ['eave', 172, 86], ['plaque', 147, 89], ['column', 89, 112], ['doorgod', 120, 104], ['lion', 166, 118], ['drum', 140, 124], ['censer', 146, 156]];
function hotspots(){
  return HOT.map(function(h, i){
    return '<g class="hot" data-part="' + h[0] + '" tabindex="0" role="button" aria-label="' + esc(FC.T_PARTS.filter(function(p){ return p.k === h[0]; })[0].name) + '"><circle cx="' + h[1] + '" cy="' + h[2] + '" r="6.5"/><text x="' + h[1] + '" y="' + (h[2] + 2.6) + '" text-anchor="middle">' + (i + 1) + '</text></g>';
  }).join('');
}
function planSvg(){
  var g = function(x, y, w, h, t, fill){ return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="#7a1f17" stroke-width="1"/><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" text-anchor="middle" font-size="10" fill="#2b1d14" font-weight="700">' + t + '</text>'; };
  var hs = function(k, x, y, n){ return '<g class="hot" data-part="' + k + '" tabindex="0" role="button"><circle cx="' + x + '" cy="' + y + '" r="8"/><text x="' + x + '" y="' + (y + 3) + '" text-anchor="middle">' + n + '</text></g>'; };
  return '<svg viewBox="0 0 240 230" class="plan" role="img" aria-label="三進廟宇平面示意圖">' +
    '<rect x="0" y="0" width="240" height="230" fill="#f3e6c9"/>' +
    g(30, 12, 180, 34, '後殿', '#e8c9a0') + g(60, 62, 120, 50, '正殿', '#e8b98a') +
    '<circle cx="120" cy="80" r="9" fill="none" stroke="#c9962e" stroke-width="2" stroke-dasharray="3 2"/>' +
    g(84, 118, 72, 22, '拜亭／天井', '#f6e2c0') + g(30, 150, 180, 34, '三川殿（前殿）', '#e8b98a') +
    g(4, 54, 22, 92, '', '#efd8b0') + g(214, 54, 22, 92, '', '#efd8b0') +
    '<text x="15" y="104" font-size="9" text-anchor="middle" writing-mode="tb" fill="#5a4636">虎邊護龍</text><text x="225" y="104" font-size="9" text-anchor="middle" writing-mode="tb" fill="#5a4636">龍邊護龍</text>' +
    '<text x="196" y="132" font-size="9" fill="#5a4636">鐘樓</text><text x="32" y="132" font-size="9" fill="#5a4636">鼓樓</text>' +
    '<path d="M180 222 V192" stroke="#2f6b5a" stroke-width="2" marker-end="url(#ar)"/><path d="M60 192 V222" stroke="#b3261e" stroke-width="2" marker-end="url(#ar2)"/>' +
    '<defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#2f6b5a"/></marker><marker id="ar2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#b3261e"/></marker></defs>' +
    '<text x="186" y="214" font-size="9" fill="#2f6b5a" font-weight="700">龍門入</text><text x="66" y="214" font-size="9" fill="#b3261e" font-weight="700">虎門出</text>' +
    '<text x="120" y="227" font-size="8.5" text-anchor="middle" fill="#8a7563">（面向廟門・下方是廟埕）</text>' +
    hs('zaojing', 140, 76, 11) + hs('longhu', 226, 196, 12) + hs('plan', 222, 30, 13) + '</svg>';
}

/* ---------- 狀態 ---------- */
var G = {tab:'list', id:null, region:'all', god:'', herit:false, fest:false, q:''};
function filtered(){
  var q = G.q.trim();
  return FC.TEMPLES.filter(function(t){
    if (G.region !== 'all' && t.r !== G.region) return false;
    if (G.god && t.god !== G.god) return false;
    if (G.herit && !t.herit) return false;
    if (G.fest && !t.fest) return false;
    if (q && (t.name + t.city + t.main + t.also + t.intro + t.look.join('')).indexOf(q) < 0) return false;
    return true;
  });
}
function heritChip(t){ var h = FC.T_HERIT[t.herit]; return h ? '<span class="tg-h" style="background:' + h.c + '">' + h.name + '</span>' : ''; }

function renderList(){
  var list = filtered();
  $('tgCount').textContent = '共 ' + list.length + ' 座';
  $('tgGrid').innerHTML = list.length ? list.map(function(t){
    return '<button type="button" class="tg-card" data-t="' + t.id + '">' + facade(t, {uid:t.id}) +
      '<b>' + esc(t.name) + '</b><small>' + esc(t.city) + '・' + esc(FC.T_GODS[t.god] === '其他神明' ? t.main.replace(/（.*$/, '') : FC.T_GODS[t.god]) + '</small>' +
      '<span class="tg-tags">' + heritChip(t) + (t.fest ? '<span class="tg-f">🏮 有廟會</span>' : '') + '</span></button>';
  }).join('') : '<p class="tg-empty">沒有符合的廟宇，換個條件試試。</p>';
}
function renderDetail(){
  var t = FC.templeById[G.id]; if (!t) return;
  var list = filtered(); if (list.indexOf(t) < 0) list = FC.TEMPLES;
  var i = list.indexOf(t), prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  var f = t.fest ? FC.festById[t.fest] : null;
  $('tgDetail').innerHTML =
    '<div class="tg-nav"><button type="button" class="sbtn" data-back>← 回圖錄</button><span><button type="button" class="sbtn" data-t="' + prev.id + '" title="' + esc(prev.name) + '">‹ 上一座</button> <button type="button" class="sbtn" data-t="' + next.id + '" title="' + esc(next.name) + '">下一座 ›</button></span></div>' +
    '<div class="tg-dwrap"><div class="tg-dfig">' + facade(t, {uid:'d'}) + '<small>立面為程式繪製的示意圖（門數、重簷、燕尾或馬背），不是實際外觀。</small></div>' +
    '<div class="tg-dinfo"><h3>' + esc(t.name) + '</h3><div class="tg-tags">' + heritChip(t) + '<span class="tg-g">' + esc(FC.T_GODS[t.god]) + '</span></div>' +
    '<dl><dt>主祀</dt><dd>' + esc(t.main) + '</dd>' + (t.also ? '<dt>配祀</dt><dd>' + esc(t.also) + '</dd>' : '') + '<dt>創建</dt><dd>' + esc(t.year) + '</dd><dt>地點</dt><dd>' + esc(t.city) + '</dd>' +
    (f ? '<dt>廟會</dt><dd>' + esc(f.name) + '</dd>' : '') + '</dl>' +
    '<p>' + esc(t.intro) + '</p>' +
    '<div class="acts"><button type="button" class="abtn" data-map>🗺 在地圖上看</button>' + (f ? '<button type="button" class="abtn" data-fest="' + f.id + '">🏮 看「' + esc(f.short) + '」日期</button>' : '') + '<button type="button" class="abtn" data-share>🔗 分享</button></div></div></div>' +
    '<div class="tg-cols"><section><h4>👀 看點</h4><ol class="tg-look">' + t.look.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></section>' +
    '<section><h4>🚶 建議參觀動線</h4><ol class="tg-route">' + t.route.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></section></div>' +
    '<div class="note">📌 ' + esc(t.tip) + '</div>' +
    '<div class="src">資料來源：' + t.src.map(function(s){ return '<a href="' + esc(s[1]) + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a>'; }).join('、') + '。古蹟等級與年代以文化部國家文化資產網、廟方公告為準。</div>';
  $('tgDetail').scrollTop = 0;
}
function renderIntro(){
  if ($('tgIntro').dataset.built) return;
  $('tgIntro').dataset.built = 1;
  var demo = {id:'anat', name:'示意廟宇', fa:{doors:3, tier:2, roof:'yan'}};
  $('tgIntro').innerHTML =
    '<p class="tg-lead">走進一座廟，先抬頭、再平視、最後低頭：屋脊說故事、門面講身分、腳下有守護。點圖上的編號看說明。</p>' +
    '<div class="tg-anat"><div class="tg-fig">' + facade(demo, {uid:'a', anat:hotspots()}) + '<small>三川殿立面（示意）</small></div>' +
    '<div class="tg-fig">' + planSvg() + '<small>三進格局平面（示意・從廟埕面向廟門看）</small></div>' +
    '<div id="tgPart" class="tg-part" aria-live="polite"><b>點一個編號</b><span>例如 ① 燕尾脊、⑥ 龍柱、⑪ 藻井。</span></div></div>' +
    '<h4>🏛 部位小辭典</h4><div class="gloss tg-gl">' + FC.T_PARTS.map(function(p, i){ return '<div data-part="' + p.k + '"><b>' + (i + 1) + '. ' + esc(p.name) + '</b><br>' + esc(p.txt) + '</div>'; }).join('') + '</div>' +
    '<h4>🙏 參拜順序（常見做法）</h4><ol class="tg-visit">' + FC.T_VISIT.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ol><p class="src">' + esc(FC.T_NOTE) + '</p>';
}
function showPart(k){
  var i = -1; FC.T_PARTS.forEach(function(p, j){ if (p.k === k) i = j; }); if (i < 0) return;
  var p = FC.T_PARTS[i];
  $('tgPart').innerHTML = '<b>' + (i + 1) + '. ' + esc(p.name) + '</b><span>' + esc(p.txt) + '</span>';
  document.querySelectorAll('#tgIntro [data-part]').forEach(function(el){ el.classList.toggle('on', el.dataset.part === k); });
}
function render(){
  document.querySelectorAll('.tg-tab').forEach(function(b){ b.classList.toggle('on', b.dataset.tab === (G.tab === 'detail' ? 'list' : G.tab)); b.setAttribute('aria-selected', b.classList.contains('on')); });
  $('tgListPane').hidden = G.tab !== 'list'; $('tgDetail').hidden = G.tab !== 'detail'; $('tgIntro').hidden = G.tab !== 'intro';
  if (G.tab === 'list') renderList(); else if (G.tab === 'detail') renderDetail(); else renderIntro();
}

/* ---------- 對外 ---------- */
function open(id){
  if (id && FC.templeById[id]){ G.id = id; G.tab = 'detail'; } else if (G.tab === 'detail' && !id){ G.tab = 'list'; }
  render();
  var m = $('guide'); if (!m.classList.contains('show')){ m.classList.add('show'); }
  setTimeout(function(){ (G.tab === 'detail' ? $('tgDetail').querySelector('[data-back]') : m.querySelector('.x')).focus(); }, 30);
}
function close(){ $('guide').classList.remove('show'); }
function showOnMap(t){
  close();
  if (window.__fest){
    if (t.fest){ window.__fest.selectFest(t.fest); return; }
    if (window.FestScene && FestScene.ready){ FestScene.pinTemple(t.at[0], t.at[1], t.name); if (window.__fest.toast) window.__fest.toast('🏯 ' + t.name + '（地圖上的金色箭頭）'); }
  }
}
function share(t){
  var url = location.origin + location.pathname + (location.hash || '#') + '&t=' + t.id;
  url = url.replace(/&t=[^&]*(?=.*&t=)/, '');
  if (navigator.share){ navigator.share({title:t.name + '｜台灣廟宇深度導覽圖錄', url:url}).catch(function(){}); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function(){ if (window.__fest && __fest.toast) __fest.toast('已複製分享連結'); }, function(){ prompt('複製這個連結：', url); });
  else prompt('複製這個連結：', url);
}

function init(){
  var rs = $('tgRegion'); rs.innerHTML = '<option value="all">全部地區</option>' + FC.T_REGIONS.map(function(r){ return '<option value="' + r.id + '">' + r.name + '</option>'; }).join('');
  var gs = $('tgGod'); gs.innerHTML = '<option value="">全部神明</option>' + Object.keys(FC.T_GODS).map(function(k){ return '<option value="' + k + '">' + FC.T_GODS[k] + '</option>'; }).join('');
  rs.addEventListener('change', function(){ G.region = this.value; renderList(); });
  gs.addEventListener('change', function(){ G.god = this.value; renderList(); });
  $('tgHerit').addEventListener('change', function(){ G.herit = this.checked; renderList(); });
  $('tgFest').addEventListener('change', function(){ G.fest = this.checked; renderList(); });
  $('tgQ').addEventListener('input', function(){ G.q = this.value; renderList(); });
  document.querySelectorAll('.tg-tab').forEach(function(b){ b.addEventListener('click', function(){ G.tab = b.dataset.tab; render(); }); });
  $('guide').addEventListener('click', function(e){
    var c = e.target.closest('[data-t]'); if (c){ G.id = c.dataset.t; G.tab = 'detail'; render(); return; }
    if (e.target.closest('[data-back]')){ G.tab = 'list'; render(); return; }
    var t = FC.templeById[G.id];
    if (e.target.closest('[data-map]') && t){ showOnMap(t); return; }
    var f = e.target.closest('[data-fest]'); if (f && window.__fest){ close(); __fest.selectFest(f.dataset.fest); return; }
    if (e.target.closest('[data-share]') && t){ share(t); return; }
    var p = e.target.closest('#tgIntro [data-part]'); if (p) showPart(p.dataset.part);
  });
  $('guide').addEventListener('keydown', function(e){ if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.hot')){ e.preventDefault(); showPart(e.target.dataset.part); } });
  document.querySelectorAll('[data-open-guide]').forEach(function(b){ b.addEventListener('click', function(){ var s = $('settings'); if (s && s.classList.contains('show')) s.classList.remove('show'); open(b.dataset.openGuide || null); }); });
  var tid = initHash.get('t'); if (FC.templeById[tid]) setTimeout(function(){ open(tid); }, 400);
  window.addEventListener('hashchange', function(){ var id = new URLSearchParams(location.hash.slice(1)).get('t'); if (FC.templeById[id]) open(id); });
}
window.TempleGuide = {open:open, close:close, state:G, facade:facade, showPart:showPart};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
