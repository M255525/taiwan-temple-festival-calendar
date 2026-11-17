/* ================= 台灣廟會節慶月曆：介面 ================= */
(function(){
'use strict';
var $ = function(id){ return document.getElementById(id); };
var PREF_KEY = 'taiwanFestPrefs', SET_KEY = 'taiwanFestSettings', SEEN_KEY = 'taiwanFestSeenWarning', SEC_KEY = 'taiwanFestSetOpen';
function lsGet(k, d){ try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e){} }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
function todayN(){ var t = new Date(); return FC.dayNum(t.getFullYear(), t.getMonth() + 1, t.getDate()); }
var DMIN = FC.dayNum(FC.YMIN, 1, 1), DMAX = FC.dayNum(FC.YMAX, 12, 31);
function clampDay(n){ return Math.max(DMIN, Math.min(DMAX, n)); }

var set = Object.assign({day:'today', labels:true, motion:'auto', theme:'auto', play:180}, lsGet(SET_KEY, {}));
var pref = lsGet(PREF_KEY, {});
var st = {day:clampDay(set.day === 'last' && pref.day ? FC.parse(pref.day) : todayN()), region:FC.regionById[pref.region] ? pref.region : 'all', fest:null};
// 分享連結 #d=YYYY-MM-DD&f=id 優先
(function(){ var h = new URLSearchParams(location.hash.slice(1)); if (/^\d{4}-\d\d-\d\d$/.test(h.get('d') || '')) st.day = clampDay(FC.parse(h.get('d'))); if (FC.festById[h.get('f')]){ st.fest = h.get('f'); st.region = FC.festById[st.fest].r; } })();
function year(){ return FC.ymd(st.day).y; }
function save(){
  lsSet(PREF_KEY, {day:FC.iso(st.day), region:st.region});
  try { history.replaceState(null, '', location.pathname + location.search + '#d=' + FC.iso(st.day) + (st.fest ? '&f=' + st.fest : '')); } catch (e){}
}
function reduceOn(){ return set.motion === 'reduce' || (set.motion === 'auto' && matchMedia('(prefers-reduced-motion: reduce)').matches); }
function applyTheme(){ if (set.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', set.theme); }
applyTheme();
var toastT;
function toast(s){ var t = $('toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function(){ t.hidden = true; }, 2600); }

function stChip(s){ var x = FC.STATUS[s]; return '<span class="chip" style="background:' + x.c + '" title="' + esc(x.tip) + '">' + x.name + '</span>'; }
function typeChip(f){ var t = FC.TYPES[f.type]; return '<span class="tchip" title="' + esc(t.tip) + '">' + t.icon + ' ' + t.name + '</span>'; }
function inScope(f){ return st.region === 'all' || f.r === st.region; }
function lunarSpan(o){ var a = FC.lunarOf(o.s), b = FC.lunarOf(o.e); if (!a) return ''; return '農曆' + a.text + (o.e !== o.s && b ? '～' + (b.m === a.m && b.leap === a.leap ? FC.LDAY[b.d] : b.text) : ''); }
function countdown(o){
  if (!o || o.s == null) return '';
  if (st.day >= o.s && st.day <= o.e) return o.st === 'approx' ? '大約這段期間' : '舉辦中' + (o.e > o.s ? '・第 ' + (st.day - o.s + 1) + ' 天' : '');
  var d = o.s - st.day; return d > 0 ? (d === 1 ? '明天' : d + ' 天後') : '已結束';
}

/* ---------- 選擇器 ---------- */
function fillSelectors(){
  $('selRegion').innerHTML = '<option value="all">全台灣</option>' + FC.REGIONS.map(function(r){ return '<option value="' + r.id + '">' + r.name + '｜' + r.sub + '</option>'; }).join('');
  $('selRegion').value = st.region;
  $('selFest').innerHTML = '<option value="">' + (st.region === 'all' ? '選一個廟會…' : '整個' + FC.regionById[st.region].name) + '</option>' +
    FC.FESTS.filter(inScope).map(function(f){ return '<option value="' + f.id + '">' + f.name + '</option>'; }).join('');
  $('selFest').value = st.fest || '';
}

/* ---------- 日期軸（canvas） ---------- */
var axCache = {};
function yearCounts(Y){
  if (axCache[Y]) return axCache[Y];
  var n0 = FC.dayNum(Y, 1, 1), n1 = FC.dayNum(Y, 12, 31), out = [];
  for (var n = n0; n <= n1; n++){ var a = FC.activeOn(n), c = 0, ap = 0; a.forEach(function(x){ if (x.o.st === 'approx') ap++; else if (x.o.st !== 'pause') c++; }); out.push([c, ap]); }
  return (axCache[Y] = {n0:n0, n1:n1, c:out});
}
function drawAxis(){
  var cv = $('axCv'), W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (!W) return;
  if (cv.width !== Math.round(W * dpr)){ cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  var Y = year(), yc = yearCounts(Y), N = yc.c.length, bw = W / N, max = 1, cs = getComputedStyle(document.documentElement);
  var red = cs.getPropertyValue('--red2').trim() || '#d6372e', gold = cs.getPropertyValue('--gold').trim() || '#c9962e', ink = cs.getPropertyValue('--ink2').trim() || '#5a4636', line = cs.getPropertyValue('--line').trim() || '#dcc79c';
  yc.c.forEach(function(v){ max = Math.max(max, v[0] + v[1]); });
  var top = 14, base = H - 16, bh = base - top;
  // 國曆月份底色
  for (var m = 1; m <= 12; m++){ var x0 = (FC.dayNum(Y, m, 1) - yc.n0) * bw; if (m % 2 === 0){ var x1 = m === 12 ? W : (FC.dayNum(Y, m + 1, 1) - yc.n0) * bw; ctx.fillStyle = 'rgba(201,150,46,.07)'; ctx.fillRect(x0, top, x1 - x0, bh); } }
  // 長條
  yc.c.forEach(function(v, i){
    var x = i * bw, h1 = v[0] / max * bh, h2 = v[1] / max * bh;
    if (v[1]){ ctx.fillStyle = 'rgba(232,195,90,.55)'; ctx.fillRect(x, base - h1 - h2, Math.max(1, bw - .2), h2); }
    if (v[0]){ ctx.fillStyle = red; ctx.fillRect(x, base - h1, Math.max(1, bw - .2), h1); }
  });
  // 國曆月份字
  ctx.font = '600 10.5px "Noto Sans TC",sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ink; ctx.textAlign = 'left';
  for (m = 1; m <= 12; m++){ var xm = (FC.dayNum(Y, m, 1) - yc.n0) * bw; ctx.fillRect(xm, base, 1, 4); if (W > 360 || m % 2) ctx.fillText(m + '月', xm + 2, H - 3); }
  // 農曆月份刻度（上方）
  ctx.font = '700 10.5px "Noto Serif TC",serif'; ctx.fillStyle = gold;
  FC._MS.forEach(function(x){ if (x.n < yc.n0 || x.n > yc.n1) return; var xx = (x.n - yc.n0) * bw; ctx.fillRect(xx, 2, 1, 6); if (W > 520 || x.m % 2 || x.leap) ctx.fillText((x.leap ? '閏' : '') + FC.LMON[x.m].replace('月', ''), xx + 2, 10); });
  // 今天、選中日
  var tn = todayN(); if (tn >= yc.n0 && tn <= yc.n1){ ctx.fillStyle = gold; ctx.fillRect((tn - yc.n0) * bw, top - 2, 2, bh + 2); }
  var sx = (st.day - yc.n0 + .5) * bw;
  ctx.fillStyle = ink; ctx.fillRect(sx - 1, top - 4, 2, bh + 6);
  ctx.beginPath(); ctx.moveTo(sx - 5, top - 6); ctx.lineTo(sx + 5, top - 6); ctx.lineTo(sx, top); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, base + .5); ctx.lineTo(W, base + .5); ctx.stroke();
}
function axDay(e){ var cv = $('axCv'), r = cv.getBoundingClientRect(), Y = year(), yc = yearCounts(Y); var i = Math.floor((e.clientX - r.left) / r.width * yc.c.length); return clampDay(yc.n0 + Math.max(0, Math.min(yc.c.length - 1, i))); }

/* ---------- 天空：依季節 ---------- */
function skyFor(n){ var m = FC.ymd(n).m; if (m >= 6 && m <= 9) return ['#2f3a63', '#f2a86a']; if (m >= 11 || m <= 2) return ['#3b2a4a', '#e9a27a']; return ['#3a3560', '#f0b07a']; }

/* ---------- 面板 ---------- */
function festCard(f){
  var Y = year(), o = FC.occ(f, Y), act = FC.activeOn(st.day).filter(function(a){ return a.f === f; })[0], nx = act ? act : (function(){ var r = FC.nextOf(f, st.day); return r ? {o:r.o} : null; })();
  var oo = nx ? nx.o : o, live = act && act.o.st !== 'approx' && act.o.st !== 'pause', cd = countdown(oo), soon = !live && oo && oo.s != null && oo.st !== 'approx' && oo.s - st.day <= 30 && oo.s >= st.day;
  var when = oo && oo.s != null ? FC.span(oo) + (FC.ymd(oo.s).y !== Y ? '（' + FC.ymd(oo.s).y + '）' : '') : (o && o.st === 'off' ? '下一科 ' + o.next + ' 年' : '日期待公告');
  return '<button type="button" class="fcard' + (live ? ' live' : soon ? ' soon' : '') + '" data-fest="' + f.id + '"><b>' + FC.TYPES[f.type].icon + ' ' + esc(f.name) + '</b><span class="cd">' + esc(cd) + '</span>' +
    '<small>' + esc(FC.city(f, Y)) + '｜' + esc(when) + (oo && oo.s != null && oo.st !== 'year' ? '・' + esc(lunarSpan(oo)) : '') + (oo ? '　' + FC.STATUS[oo.st].name : '') + '</small></button>';
}
function yearStrip(f){
  var h = '';
  for (var y = FC.YMIN; y <= FC.YMAX; y++){
    var o = FC.occ(f, y), txt = !o ? '—' : o.st === 'off' ? '沒有' : o.s == null ? '待公告' : (o.st === 'approx' ? '約 ' : '') + FC.ymd(o.s).m + '/' + FC.ymd(o.s).d + (o.st === 'pause' ? ' 停辦' : '');
    h += '<button type="button" class="yc' + (y === year() ? ' on' : '') + (o && (o.st === 'off' || o.s == null) ? ' off' : '') + '" data-goto="' + (o && o.s != null ? o.s : '') + '" data-y="' + y + '" title="' + y + '：' + (o ? FC.STATUS[o.st].name : '') + '"><b>' + y + '</b>' + esc(txt) + '</button>';
  }
  return '<div class="ystrip" aria-label="各年日期">' + h + '</div>';
}
function render(opts){
  opts = opts || {};
  var n = st.day, Y = year(), L = FC.lunarOf(n), t = FC.ymd(n), f = st.fest ? FC.festById[st.fest] : null;
  $('dayBig').textContent = t.m + '/' + t.d + '（' + FC.WEEK[t.w] + '）';
  $('daySub').textContent = L ? '農曆' + L.text : '';
  $('yearTxt').textContent = Y;
  $('yPrev').disabled = Y <= FC.YMIN; $('yNext').disabled = Y >= FC.YMAX;
  drawAxis();
  var sky = skyFor(n); $('stage').style.setProperty('--sky1', sky[0]); $('stage').style.setProperty('--sky2', sky[1]);
  var holy = FC.holyOn(n), holyH = holy.length ? '<div class="holy">' + holy.map(function(h){ return '<span>' + esc(h) + '</span>'; }).join('') + '</div>' : '';
  var act = FC.activeOn(n).filter(function(a){ return inScope(a.f); }), place = $('place'), list = $('list');
  if (f){
    var o = FC.occ(f, Y), show = o, live = FC.activeOn(n).some(function(a){ return a.f === f; });
    if (!live){ var nx = FC.nextOf(f, n); if (nx && (!o || o.s == null || o.e < n)) show = nx.o; }
    var sy = show && show.s != null ? FC.ymd(show.s).y : Y;
    var whenH;
    if (o && o.st === 'off' && (!show || show === o)) whenH = '<div class="when"><b>' + Y + ' 年沒有舉辦</b><small>' + esc(f.tbd || '') + '</small><small>下一科：<b style="display:inline;font-size:15px">' + o.next + ' 年</b></small></div>';
    else if (!show || show.s == null) whenH = '<div class="when"><b>' + Y + ' 年日期待公告</b><small>' + esc(f.tbd || '') + '</small></div>';
    else whenH = '<div class="when">' + (countdown(show) ? '<span class="cd">' + esc(countdown(show)) + '</span>' : '') +
      '<b>' + (show.st === 'approx' ? '大約 ' : '') + (sy !== Y ? sy + ' 年 ' : '') + FC.span(show) + '</b><small>' + esc(lunarSpan(show)) + '</small>' +
      (show.trad ? '<small>傳統日期：' + FC.fmt(show.trad, true) + '（農曆三月十一）；2025 年起改在之前的週六</small>' : '') +
      (show.st === 'approx' ? '<small>' + esc(f.tbd) + '</small>' : '') + '</div>';
    var tp = (FC.TEMPLES || []).filter(function(x){ return x.fest === f.id; })[0];
    var note = show && show.note ? show.note : (o && o.note) || '';
    place.innerHTML = '<h2>' + esc(f.name) + '<small>' + esc(f.temple) + '・' + esc(FC.city(f, sy)) + '</small></h2>' +
      '<div class="meta">' + (show ? stChip(show.st) : '') + typeChip(f) + '</div>' + whenH +
      (note ? '<div class="note">📌 ' + esc(note) + '</div>' : '') +
      (show && show.subs && show.subs.length ? '<ul class="subs">' + show.subs.map(function(s){ var l = FC.lunarOf(s.n); return '<li' + (s.n === n ? ' class="now"' : '') + '><b>' + FC.fmt(s.n, true) + '</b>' + (l ? '<span style="color:var(--mute)">' + l.text + '</span> ' : '') + esc(s.t) + '</li>'; }).join('') + '</ul>' : '') +
      yearStrip(f) +
      '<p>' + esc(f.desc) + '</p>' +
      '<details class="tips"' + (innerWidth > 760 ? ' open' : '') + '><summary>📌 參加須知</summary><ul>' + f.tips.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' +
      '<div class="acts">' + (show && show.s != null && show.st !== 'approx' ? '<button type="button" class="abtn" id="btnIcs">📅 加到行事曆</button>' : '') + '<button type="button" class="abtn" id="btnShare">🔗 分享</button>' + (f.route ? '<button type="button" class="abtn" id="btnRoute">🗺 看進香路線（示意）</button>' : '') + (tp ? '<button type="button" class="abtn" id="btnTemple">🏯 ' + esc(tp.name) + '導覽</button>' : '') + '</div>' +
      '<div class="src">資料來源：' + f.src.map(function(s){ return '<a href="' + esc(s[1]) + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a>'; }).join('、') + '</div>';
    $('sum').innerHTML = '<span>' + t.m + '/' + t.d + '・' + (L ? '農曆' + L.text : '') + '</span>' + (holy.length ? '<span>・' + esc(holy.join('、')) + '</span>' : '');
    list.innerHTML = '<div class="lgrp">同一區的其他廟會</div>' + FC.FESTS.filter(function(x){ return x.r === f.r && x !== f; }).map(festCard).join('');
  } else {
    var r = st.region === 'all' ? null : FC.regionById[st.region];
    var real = act.filter(function(a){ return a.o.st !== 'approx' && a.o.st !== 'pause'; }), maybe = act.filter(function(a){ return a.o.st === 'approx'; });
    place.innerHTML = '<h2>' + t.m + '月' + t.d + '日（' + FC.WEEK[t.w] + '）<small>' + (L ? '農曆' + L.text + '・' : '') + (r ? r.name : '全台灣') + '</small></h2>' + holyH +
      '<p>' + (real.length ? '今天有 <b>' + real.length + '</b> 個廟會在辦：' + real.map(function(a){ return '<button type="button" class="lnk" data-fest="' + a.f.id + '">' + esc(a.f.short) + '</button>'; }).join('、') + '。' : '這天' + (r ? r.name : '') + '沒有收錄的廟會在辦。') +
      (maybe.length ? '日期待公告、大約在這段期間的有：' + maybe.map(function(a){ return '<button type="button" class="lnk" data-fest="' + a.f.id + '">' + esc(a.f.short) + '</button>'; }).join('、') + '。' : '') + '</p>';
    var up = FC.FESTS.filter(inScope).map(function(x){ var q = FC.nextOf(x, n); return q && q.o.st !== 'approx' && q.o.s > n ? {f:x, d:q.o.s - n} : null; }).filter(Boolean).sort(function(a, b){ return a.d - b.d; });
    $('sum').innerHTML = '<span>' + (r ? r.name : '全台灣') + '</span><b>' + real.length + '</b><span>個在辦' + (up.length ? '・下一個：' + esc(up[0].f.short) + '（' + (up[0].d === 1 ? '明天' : up[0].d + ' 天後') + '）' : '') + '</span>';
    var html = '', g = function(t2){ html += '<div class="lgrp">' + t2 + '</div>'; };
    if (act.length){ g('🏮 今天在辦'); act.forEach(function(a){ html += festCard(a.f); }); }
    var soon = up.filter(function(x){ return x.d <= 60; });
    if (soon.length){ g('⏳ 60 天內登場'); soon.forEach(function(x){ html += festCard(x.f); }); }
    var rest = FC.FESTS.filter(inScope).filter(function(x){ return !act.some(function(a){ return a.f === x; }) && !soon.some(function(s){ return s.f === x; }); });
    if (rest.length){ g('📜 其他廟會（依下次日期）'); rest.sort(function(a, b){ var p = FC.nextOf(a, n), q = FC.nextOf(b, n); return (p && p.o.s != null ? p.o.s : 1e9) - (q && q.o.s != null ? q.o.s : 1e9); }).forEach(function(x){ html += festCard(x); }); }
    list.innerHTML = html;
  }
  if (window.FestScene && FestScene.ready){
    FestScene.setDay(n); FestScene.selectSpot(st.fest);
    FestScene.setHorizon([.98, .85, .7]);
    if (opts.fly){
      FestScene.pinTemple(null);
      if (f) FestScene.focusSpot(f.id);
      else if (st.region !== 'all') FestScene.focusRegion(FC.FESTS.filter(inScope).map(function(x){ return x.id; }));
      else FestScene.overview();
    }
  }
  save();
}

/* ---------- 行事曆、分享 ---------- */
function icsDate(n){ return FC.iso(n).replace(/-/g, ''); }
function fold(s){ var out = [], line = ''; Array.from(s).forEach(function(ch){ var b = unescape(encodeURIComponent(ch)).length; if (unescape(encodeURIComponent(line)).length + b > 73){ out.push(line); line = ' '; } line += ch; }); out.push(line); return out.join('\r\n'); }
function icsEsc(s){ return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function buildIcs(f){
  var n = st.day, o = FC.occ(f, year()), live = FC.activeOn(n).some(function(a){ return a.f === f; });
  if (!live || !o || o.s == null){ var nx = FC.nextOf(f, n); if (nx) o = nx.o; }
  if (!o || o.s == null || o.st === 'approx') return null;
  var desc = f.desc + '\n' + (o.subs || []).map(function(s){ return FC.fmt(s.n, true) + ' ' + s.t; }).join('\n') + '\n日期依農曆換算，請以主辦單位公告為準。\n' + (f.src[0] ? f.src[0][1] : '');
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//m255525//taiwan-temple-festival-calendar//ZH-TW', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    'UID:' + f.id + '-' + icsDate(o.s) + '@m255525.github.io', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
    'DTSTART;VALUE=DATE:' + icsDate(o.s), 'DTEND;VALUE=DATE:' + icsDate(o.e + 1),
    fold('SUMMARY:' + icsEsc(f.name)), fold('LOCATION:' + icsEsc(f.temple + '・' + FC.city(f, FC.ymd(o.s).y))), fold('DESCRIPTION:' + icsEsc(desc)),
    'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', fold('DESCRIPTION:' + icsEsc(f.name + ' 再三天登場')), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  return {name:f.short + '_' + FC.iso(o.s) + '.ics', text:lines.join('\r\n')};
}
function shareUrl(){ return location.origin + location.pathname + '#d=' + FC.iso(st.day) + (st.fest ? '&f=' + st.fest : ''); }
function share(){
  var f = st.fest ? FC.festById[st.fest] : null, url = shareUrl(), text = f ? f.name + '｜台灣廟會節慶月曆' : FC.fmt(st.day) + ' 的廟會｜台灣廟會節慶月曆';
  if (navigator.share){ navigator.share({title:text, url:url}).catch(function(){}); return; }
  var done = function(){ toast('已複製分享連結'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function(){ prompt('複製這個連結：', url); }); else prompt('複製這個連結：', url);
}

/* ---------- 動作 ---------- */
function setDay(n){ st.day = clampDay(n); render(); }
function selectFest(id){ if (id && innerWidth <= 760 && $('panel').classList.contains('min')) setSheet(false); st.fest = id || null; if (st.fest) st.region = FC.festById[st.fest].r; fillSelectors(); render({fly:true}); }
function selectRegion(r){ st.region = r; st.fest = null; fillSelectors(); render({fly:true}); }
function shiftYear(d){ var t = FC.ymd(st.day), y = Math.max(FC.YMIN, Math.min(FC.YMAX, t.y + d)), dd = Math.min(t.d, new Date(Date.UTC(y, t.m, 0)).getUTCDate()); setDay(FC.dayNum(y, t.m, dd)); }

var lastFocus = null;
function openModal(id){ lastFocus = document.activeElement; $(id).classList.add('show'); $(id).querySelector('.x').focus(); }
function closeModal(el){ el.classList.remove('show'); if (el.id === 'about') lsSet(SEEN_KEY, 1); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function buildEtiquette(){
  $('etqBody').innerHTML = FC.ETIQUETTE.map(function(e){ return '<section><h3>' + e.icon + ' ' + esc(e.title) + '</h3><ul>' + e.items.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>'; }).join('');
  $('glossBody').innerHTML = FC.GLOSSARY.map(function(g){ return '<div><b>' + esc(g[0]) + '</b><br>' + esc(g[1]) + '</div>'; }).join('');
  $('stBody').innerHTML = Object.keys(FC.STATUS).map(function(k){ return '<div>' + stChip(k) + '<br>' + esc(FC.STATUS[k].tip) + '</div>'; }).join('');
}

/* ---------- 常用設定 ---------- */
function fillSettings(){
  $('setDay').value = set.day; $('setLabels').checked = !!set.labels; $('setMotion').value = set.motion; $('setTheme').value = set.theme; $('setPlay').value = String(set.play);
  var txt = function(id){ var s = $(id); return s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : ''; };
  $('sv-day').textContent = txt('setDay'); $('sv-labels').textContent = set.labels ? '顯示' : '隱藏'; $('sv-motion').textContent = txt('setMotion'); $('sv-play').textContent = txt('setPlay').replace(/（.*/, ''); $('sv-theme').textContent = txt('setTheme');
  var open = lsGet(SEC_KEY, []); document.querySelectorAll('.set-sec').forEach(function(d){ d.open = open.indexOf(d.dataset.sec) >= 0; });
}
function saveSettings(){
  set = {day:$('setDay').value, labels:$('setLabels').checked, motion:$('setMotion').value, theme:$('setTheme').value, play:+$('setPlay').value};
  lsSet(SET_KEY, set); applyTheme(); drawAxis();
  if (window.FestScene && FestScene.ready){ FestScene.setLabels(set.labels); FestScene.setReduce(reduceOn()); }
  if (playT){ stopPlay(); startPlay(); }
  fillSettings();
}
function saveSecs(){ lsSet(SEC_KEY, [].map.call(document.querySelectorAll('.set-sec[open]'), function(d){ return d.dataset.sec; })); }

/* ---------- 事件 ---------- */
function bind(){
  var cv = $('axCv'), drag = false;
  cv.addEventListener('pointerdown', function(e){ drag = true; stopPlay(); cv.setPointerCapture(e.pointerId); setDay(axDay(e)); });
  cv.addEventListener('pointermove', function(e){ if (drag){ var d = axDay(e); if (d !== st.day) setDay(d); } });
  cv.addEventListener('pointerup', function(){ drag = false; });
  cv.addEventListener('pointercancel', function(){ drag = false; });
  $('yPrev').addEventListener('click', function(){ stopPlay(); shiftYear(-1); });
  $('yNext').addEventListener('click', function(){ stopPlay(); shiftYear(1); });
  $('btnNow').addEventListener('click', function(){ stopPlay(); setDay(todayN()); });
  $('selRegion').addEventListener('change', function(){ selectRegion(this.value); });
  $('selFest').addEventListener('change', function(){ if (this.value) selectFest(this.value); else selectRegion(st.region); });
  $('list').addEventListener('click', function(e){ var c = e.target.closest('[data-fest]'); if (c) selectFest(c.dataset.fest); });
  $('place').addEventListener('click', function(e){
    var y = e.target.closest('[data-y]'); if (y){ stopPlay(); if (y.dataset.goto) setDay(+y.dataset.goto); else shiftYear(+y.dataset.y - year()); return; }
    var s = e.target.closest('[data-fest]'); if (s){ selectFest(s.dataset.fest); return; }
    if (e.target.id === 'btnIcs'){ var ic = buildIcs(FC.festById[st.fest]); if (!ic) return; var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ic.text], {type:'text/calendar'})); a.download = ic.name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('已下載 ' + ic.name); }
    if (e.target.id === 'btnShare') share();
    if (e.target.id === 'btnTemple' && window.TempleGuide){ var tq = FC.TEMPLES.filter(function(x){ return x.fest === st.fest; })[0]; if (tq) TempleGuide.open(tq.id); }
    if (e.target.id === 'btnRoute' && window.FestScene) FestScene.focusRoute(st.fest);
  });
  $('btnAll').addEventListener('click', function(){ st.region = 'all'; st.fest = null; fillSelectors(); render({fly:true}); });
  $('btnAbout').addEventListener('click', function(){ openModal('about'); });
  ['btnEtq', 'btnEtq2', 'btnEtq3'].forEach(function(id){ $(id).addEventListener('click', function(){ if (id === 'btnEtq3') closeModal($('about')); openModal('etq'); }); });
  $('btnSet').addEventListener('click', function(){ fillSettings(); openModal('settings'); });
  $('settings').addEventListener('change', saveSettings);
  document.querySelectorAll('.set-sec').forEach(function(d){ d.addEventListener('toggle', saveSecs); });
  $('setOpenAll').addEventListener('click', function(){ document.querySelectorAll('.set-sec').forEach(function(d){ d.open = true; }); saveSecs(); });
  $('setCloseAll').addEventListener('click', function(){ document.querySelectorAll('.set-sec').forEach(function(d){ d.open = false; }); saveSecs(); });
  function openAbout(creator){ if ($('settings').classList.contains('show')) closeModal($('settings')); openModal('about'); if (creator) $('creatorBox').scrollIntoView({block:'nearest'}); }
  $('btnCreator').addEventListener('click', function(){ openAbout(true); });
  document.querySelectorAll('[data-open-about]').forEach(function(b){ b.addEventListener('click', function(){ openAbout(b.dataset.openAbout === 'creator'); }); });
  document.querySelectorAll('[data-open-etq]').forEach(function(b){ b.addEventListener('click', function(){ closeModal($('settings')); openModal('etq'); }); });
  $('sheetBtn').addEventListener('click', function(){ setSheet(!$('panel').classList.contains('min')); });
  document.querySelectorAll('.modal').forEach(function(m){ m.addEventListener('click', function(e){ if (e.target === m || e.target.closest('[data-close]')) closeModal(m); }); });
  document.addEventListener('keydown', function(e){
    var open = document.querySelector('.modal.show');
    if (e.key === 'Escape' && open){ closeModal(open); return; }
    if (open || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight'){ stopPlay(); setDay(st.day + (e.shiftKey ? 7 : 1)); }
    if (e.key === 'ArrowLeft'){ stopPlay(); setDay(st.day - (e.shiftKey ? 7 : 1)); }
    if (e.key === 'PageDown'){ stopPlay(); setDay(st.day + 30); }
    if (e.key === 'PageUp'){ stopPlay(); setDay(st.day - 30); }
  });
  $('play').addEventListener('click', function(){ if (playT) stopPlay(); else startPlay(); });
  window.addEventListener('resize', drawAxis);
  window.addEventListener('hashchange', function(){ var h = new URLSearchParams(location.hash.slice(1)); var d = h.get('d'); if (d && /^\d{4}-\d\d-\d\d$/.test(d) && FC.parse(d) !== st.day){ st.day = clampDay(FC.parse(d)); render(); } });
}
function setSheet(min){
  $('panel').classList.toggle('min', min); document.body.classList.toggle('sheet-min', min); $('sheetBtn').textContent = min ? '展開清單' : '收合';
  if (window.FestScene) FestScene.resize();
}
var playT = 0;
function startPlay(){ $('play').classList.add('on'); $('play').textContent = '❚❚'; playT = setInterval(function(){ if (st.day >= DMAX){ stopPlay(); return; } setDay(st.day + 1); }, set.play || 180); }
function stopPlay(){ if (!playT) return; clearInterval(playT); playT = 0; $('play').classList.remove('on'); $('play').textContent = '▶'; }

/* ---------- 啟動 ---------- */
fillSelectors(); buildEtiquette(); bind(); if (innerWidth <= 760) setSheet(true); render();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAxis);
FestScene.onPickSpot = function(id){ selectFest(id); };
function firstVisit(){ if (!lsGet(SEEN_KEY, 0)) openModal('about'); }
FestScene.init({host:$('stage'), labels:$('labels'), reduce:reduceOn(), day:st.day}).then(function(){
  FestScene.setLabels(set.labels);
  render({fly:true});
  setTimeout(function(){ $('loading').classList.add('hide'); firstVisit(); }, 250);
}).catch(function(err){
  console.error(err);
  $('loadMsg').textContent = '3D 地圖載入失敗（可能是網路無法連到繪圖元件）';
  $('loadSub').textContent = '月曆、清單與日期換算仍可使用，點畫面任一處繼續。';
  $('loading').addEventListener('click', function(){ $('loading').classList.add('hide'); firstVisit(); }, {once:true});
});

window.__fest = {toast:toast, state:st, setDay:setDay, selectFest:selectFest, selectRegion:selectRegion, shiftYear:shiftYear, buildIcs:buildIcs, shareUrl:shareUrl, FC:FC, scene:FestScene};
})();
