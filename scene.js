/* ================= 台灣廟會節慶月曆：3D 場景 =================
 * Three.js（importmap 指到 jsdelivr）。台灣本島與離島輪廓、山脈地形、離岸距離場沿用台灣賞鳥地圖的做法。
 * 畫面是「廟埕夜色」：黃昏天空、宣紙金箔地面；每個廟會一座小廟（紅牆、燕尾脊、門口兩盞燈籠），
 * 舉辦期間廟埕亮起金紅光暈，並依類型出現景物：進香神轎沿路線前進、遶境隊伍繞廟、炮城火花、炸龍、
 * 天燈升空、燈會大燈、中元放水燈／孤棚／普渡供桌、王船（送王當天燒王船）、禮俗祭典的香煙。
 * 座標：x = 東西、z = 南北（北為 -z）、y = 高度；1 單位約 10 公里，建築與景物都放大很多，進香路線只是示意。
 * 本檔由 tools/build_scene.py 把賞花地圖 scene.js 的共用段落（地形、標籤、排列、雲、鏡頭、點選）組進來。
 */
(function(){
'use strict';
var S = window.FestScene = {ready:false};
var T, Orbit;
var EXT = {x0:-36, z0:-36, x1:18, z1:28}, RES = .25, FW = 0, FH = 0, FIELD = null;
var U = {time:{value:0}, f:null};
var renderer, scene, camera, controls, raycaster, ndc, toonGrad, clock, seaMat, landMat;
var ISL = [], SPOT3 = {}, labels = [], clouds = [], pickables = [];
var selId = null, fly = null, showLabels = true, curDay = 0, curYear = 0, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var host, labelRoot, tmpV;
var TF = {ISLANDS:FC.ISLANDS, SPOTS:FC.FESTS, PEAKS:FC.PEAKS};   // 共用段落沿用的名稱

function P(lon, lat){ return [(lon - 120.9) * 10.17, -(lat - 23.7) * 11.1]; }
S.proj = P;
function hash(n){ var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function smooth(a, b, x){ var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function col(h){ return new T.Color(h); }
function ease(t){ return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function noise(x, z){ return .5 * Math.sin(x * 1.9 + z * .7) * Math.sin(z * 1.4 - x * .5) + .3 * Math.sin(x * 4.1 + 1.3) * Math.sin(z * 3.7 + .4) + .2 * Math.sin(x * 8.3 + z * 6.1); }

/* ---------- 幾何：多邊形與距離場 ---------- */
function segD2(x, z, a, b){
  var dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = l ? ((x - a[0]) * dx + (z - a[1]) * dz) / l : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  var px = a[0] + t * dx - x, pz = a[1] + t * dz - z; return px * px + pz * pz;
}
function inPoly(x, z, poly){
  var c = false;
  for (var i = 0, n = poly.length, j = n - 1; i < n; j = i++){
    var a = poly[i], b = poly[j];
    if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}
function edgeDist(x, z, poly){
  var m = 1e9;
  for (var i = 0, n = poly.length, j = n - 1; i < n; j = i++){ var d = segD2(x, z, poly[j], poly[i]); if (d < m) m = d; }
  return Math.sqrt(m);
}
function sdIsland(x, z, I){ var d = edgeDist(x, z, I.poly); return inPoly(x, z, I.poly) ? -d : d; }
function sdAll(x, z){
  var best = 1e9;
  for (var k = 0; k < ISL.length; k++){
    var bb = ISL[k].bb, bx = Math.max(bb[0] - x, 0, x - bb[2]), bz = Math.max(bb[1] - z, 0, z - bb[3]);
    if (bx * bx + bz * bz > best * best) continue;
    var d = sdIsland(x, z, ISL[k]);
    if (d < best) best = d;
    if (best < 0) return best;
  }
  return best;
}
function field(x, z){
  var fx = (x - EXT.x0) / RES, fz = (z - EXT.z0) / RES;
  if (fx < 0 || fz < 0 || fx >= FW - 1 || fz >= FH - 1) return 12;
  var i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * FW + i;
  return (FIELD[k] * (1 - u) + FIELD[k + 1] * u) * (1 - v) + (FIELD[k + FW] * (1 - u) + FIELD[k + FW + 1] * u) * v;
}
S.field = field;

var HGT = {penghu:.12, baisha:.1, xiyu:.12, kinmen:.26, lieyu:.2, nangan:.38, beigan:.4, dongyin:.3, juguang:.25,
  qimei:.14, wangan:.12, ludao:.34, lanyu:.62, liuqiu:.16, guishan:.55, keelungi:.22};
function buildPolys(){
  TF.ISLANDS.forEach(function(I, k){
    var poly;
    if (I.poly) poly = I.poly.map(function(p){ return P(p[0], p[1]); });
    else {
      var c = P(I.c[0], I.c[1]), r = I.km / 10 * 1.5, sx = I.sx || 1, sy = I.sy || 1;
      poly = [];
      for (var i = 0; i < 24; i++){
        var a = i / 24 * Math.PI * 2, rr = r * (1 + .1 * Math.sin(3 * a + k) + .06 * Math.sin(5 * a + k * 2));
        poly.push([c[0] + Math.cos(a) * rr * sx, c[1] + Math.sin(a) * rr * sy]);
      }
    }
    var bb = [1e9, 1e9, -1e9, -1e9], cx = 0, cz = 0;
    poly.forEach(function(p){ bb[0] = Math.min(bb[0], p[0]); bb[1] = Math.min(bb[1], p[1]); bb[2] = Math.max(bb[2], p[0]); bb[3] = Math.max(bb[3], p[1]); cx += p[0]; cz += p[1]; });
    ISL.push({id:I.id, name:I.name, main:!!I.main, poly:poly, bb:bb, hgt:HGT[I.id] || .2, c:[cx / poly.length, cz / poly.length]});
  });
}
function buildField(){
  FW = Math.ceil((EXT.x1 - EXT.x0) / RES) + 1; FH = Math.ceil((EXT.z1 - EXT.z0) / RES) + 1;
  FIELD = new Float32Array(FW * FH);
  for (var j = 0; j < FH; j++) for (var i = 0; i < FW; i++) FIELD[j * FW + i] = sdAll(EXT.x0 + i * RES, EXT.z0 + j * RES);
  var data = new Uint8Array(FW * FH * 4);
  for (var k = 0; k < FW * FH; k++){ var d = Math.max(0, Math.min(12, FIELD[k])); data[k * 4] = Math.round(d / 12 * 255); data[k * 4 + 3] = 255; }
  var tex = new T.DataTexture(data, FW, FH, T.RGBAFormat);
  tex.magFilter = tex.minFilter = T.LinearFilter; tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.needsUpdate = true;
  return tex;
}

/* ---------- 地形 ---------- */
var RIDGES = [
  [[121.70,24.80,.6,1.2],[121.45,24.55,2.4,1.8],[121.30,24.30,3.5,2.0],[121.28,24.12,3.4,2.0],[121.22,23.85,3.3,2.1],[121.08,23.50,3.4,2.2],[121.00,23.20,3.0,2.0],[120.88,22.85,2.8,1.8],[120.78,22.55,2.7,1.6],[120.80,22.25,1.4,1.3],[120.83,22.00,.4,.8]],
  [[120.82,23.80,2.0,1.3],[120.957,23.47,3.95,1.3],[120.86,23.15,2.4,1.2]],
  [[121.55,24.72,1.6,1.3],[121.231,24.383,3.9,1.4],[121.02,24.20,2.6,1.3],[120.86,24.00,1.4,1.1]],
  [[121.53,23.78,.9,.6],[121.45,23.45,1.6,.6],[121.35,23.15,1.4,.6],[121.22,22.93,.9,.5]],
  [[121.50,25.20,.6,.6],[121.548,25.171,1.12,.7],[121.62,25.14,.7,.6]],
  [[120.62,23.30,.7,1.0],[120.72,23.65,.9,1.0],[120.80,24.35,.8,1.2]]
];
var KM = .42, RID = [];
function prepRidges(){ RID = RIDGES.map(function(r){ return r.map(function(p){ var q = P(p[0], p[1]); return [q[0], q[1], p[2] * KM, p[3]]; }); }); }
function ridgeH(x, z){
  var best = 0;
  RID.forEach(function(r){
    for (var i = 0; i < r.length - 1; i++){
      var a = r[i], b = r[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
      var t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l));
      var px = a[0] + t * dx - x, pz = a[1] + t * dz - z, d = Math.sqrt(px * px + pz * pz);
      var h = a[2] + (b[2] - a[2]) * t, w = a[3] + (b[3] - a[3]) * t;
      var v = h * Math.exp(-(d / w) * (d / w));
      if (v > best) best = v;
    }
  });
  return best;
}
var LANDC;
function landColor(h, d){
  if (h < -.01) return LANDC.under;
  if (d < .09 || h < .058) return LANDC.sand;
  if (h < .3) return LANDC.plain;
  if (h < .65) return LANDC.grass;
  if (h < 1.05) return LANDC.forest;
  if (h < 1.45) return LANDC.deep;
  if (h < 1.72) return LANDC.rock;
  return LANDC.peak;
}
function hAt(I, x, z, d){
  if (d <= 0) return Math.max(-.62, d * .9);
  var n = noise(x, z);
  if (I.main) return .05 + ridgeH(x, z) * smooth(0, 1.1, d) * (1 + .28 * n) + .03 * smooth(0, .5, d) * (n + 1);
  return .04 + I.hgt * smooth(0, Math.min(I.bb[2] - I.bb[0], I.bb[3] - I.bb[1]) * .4, d) * (1 + .2 * n);
}
function buildLand(I){
  var m = I.main ? 1.1 : .8, w = I.bb[2] - I.bb[0], res = I.main ? .12 : (w < 1 ? .05 : .08);
  var x0 = I.bb[0] - m, z0 = I.bb[1] - m, nx = Math.ceil((w + 2 * m) / res) + 1, nz = Math.ceil((I.bb[3] - I.bb[1] + 2 * m) / res) + 1;
  var pos = new Float32Array(nx * nz * 3), cols = new Float32Array(nx * nz * 3), hs = new Float32Array(nx * nz);
  for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++){
    var x = x0 + i * res, z = z0 + j * res, d = -sdIsland(x, z, I), k = j * nx + i, h = hAt(I, x, z, d);
    hs[k] = h; pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    var c = landColor(h, d); cols[k * 3] = c.r; cols[k * 3 + 1] = c.g; cols[k * 3 + 2] = c.b;
  }
  var idx = [];
  for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++){
    var a = j * nx + i, b = a + 1, c2 = a + nx, d2 = c2 + 1;
    if (hs[a] > -.6 || hs[b] > -.6 || hs[c2] > -.6 || hs[d2] > -.6) idx.push(a, c2, b, b, c2, d2);
  }
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('color', new T.BufferAttribute(cols, 3));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new T.Mesh(g, landMat));
}
function landY(x, z){
  var best = null, bd = 1e9;
  ISL.forEach(function(I){ var d = sdIsland(x, z, I); if (d < bd){ bd = d; best = I; } });
  if (!best || bd > 0) return .05;
  return Math.max(.04, hAt(best, x, z, -bd));
}
S.landY = landY;

/* ---------- 宣紙金箔地面＋廟埕光暈 ---------- */
var NF = FC.FESTS.length;
function paperPatch(mat){
  mat.onBeforeCompile = function(sh){
    sh.uniforms.uF = {value:U.f};
    sh.vertexShader = 'varying vec3 vP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    sh.fragmentShader = '#define NF ' + NF + '\nuniform vec4 uF[NF]; varying vec3 vP;\n' +
      'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n' +
      'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }\n' +
      sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + [
      'float land = smoothstep(.03, .07, vP.y);',
      'float far = smoothstep(10., 70., length(cameraPosition - vP));',
      'vec3 c = diffuseColor.rgb;',
      'c = mix(c, vec3(.96, .91, .8), .22 * land);',                     // 宣紙色
      'float gr = vn(vP.xz * 40.) * .6 + vn(vP.xz * 95.) * .4;',
      'c *= .94 + gr * .1 * (1. - far * .7);',
      'float fl = step(.985, h21(floor(vP.xz * 60.)));',                    // 金箔碎屑
      'c = mix(c, vec3(.95, .78, .35), fl * .55 * land * (1. - far));',
      'float g = 0.;',
      'for (int i = 0; i < NF; i++){ vec2 d = vP.xz - uF[i].xy; float r = uF[i].z; g = max(g, uF[i].w * (1. - smoothstep(r * .25, r, length(d)))); }',
      'vec3 glow = mix(vec3(.98, .72, .3), vec3(.9, .25, .18), smoothstep(.3, .9, g));',
      'c = mix(c, glow, g * .62 * land);',
      'diffuseColor.rgb = c;'].join('\n'));
  };
  mat.customProgramCacheKey = function(){ return 'festpaper' + NF; };
  return mat;
}

/* ---------- 海（黃昏） ---------- */
var SEA_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
var SEA_FS = [
  'uniform sampler2D uDist; uniform vec4 uExt; uniform float uTime, uCalm; uniform vec3 uHorizon; varying vec3 vW;',
  'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }',
  'void main(){',
  '  vec2 uv = (vW.xz - uExt.xy) / uExt.zw;',
  '  float d = texture2D(uDist, uv).r * 12.;',
  '  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) d = 12.;',
  '  float wob = vn(vW.xz * 1.3) * .5;',
  '  vec3 col = mix(vec3(.55,.74,.76), vec3(.3,.52,.6), smoothstep(.1, 1.4, d + wob * .4));',
  '  col = mix(col, vec3(.2,.36,.5), smoothstep(1.2, 4., d + wob));',
  '  col = mix(col, vec3(.16,.24,.4), smoothstep(4., 10., d + wob * 2.));',
  '  float t = uTime * uCalm;',
  '  float sp = smoothstep(.55, 1., vn(vW.xz * .35 + vec2(t * .02, 0.)));',          // 晚霞反光（大片、柔和）
  '  col = mix(col, vec3(.86,.6,.48), sp * .25 * smoothstep(1., 8., d));',
  '  float f = 1. - smoothstep(.04, .14 + .04 * sin(t*2. + vW.x*5. + vW.z*3.), d);',
  '  col = mix(col, vec3(.98,.93,.84), f * .7);',
  '  float alpha = mix(.62, .92, smoothstep(0., 4., d));',
  '  float hz = smoothstep(60., 200., length(vW.xz - cameraPosition.xz));',
  '  col = mix(col, uHorizon, hz); alpha = mix(alpha, 1., hz);',
  '  gl_FragColor = vec4(col, alpha);',
  '}'].join('\n');
var BED_FS = [
  'uniform sampler2D uDist; uniform vec4 uExt; uniform vec3 uHorizon; varying vec3 vW;',
  'void main(){',
  '  vec2 uv = (vW.xz - uExt.xy) / uExt.zw; float d = texture2D(uDist, uv).r * 12.;',
  '  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) d = 12.;',
  '  vec3 col = mix(vec3(.6,.72,.66), vec3(.25,.42,.5), smoothstep(.2, 1.6, d));',
  '  col = mix(col, vec3(.12,.2,.34), smoothstep(2., 6., d));',
  '  float hz = smoothstep(60., 200., length(vW.xz - cameraPosition.xz)); col = mix(col, uHorizon, hz);',
  '  gl_FragColor = vec4(col, 1.);',
  '}'].join('\n');
function buildSea(tex){
  var uni = {uDist:{value:tex}, uExt:{value:new T.Vector4(EXT.x0, EXT.z0, (FW - 1) * RES, (FH - 1) * RES)},
    uTime:U.time, uCalm:{value:reduce ? .15 : 1}, uHorizon:{value:new T.Vector3(.98, .85, .7)}};
  seaMat = new T.ShaderMaterial({uniforms:uni, vertexShader:SEA_VS, fragmentShader:SEA_FS, transparent:true});
  var sea = new T.Mesh(new T.PlaneGeometry(520, 520), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(-8, 0, -4); sea.renderOrder = 2; scene.add(sea);
  var bed = new T.Mesh(new T.PlaneGeometry(520, 520), new T.ShaderMaterial({uniforms:{uDist:uni.uDist, uExt:uni.uExt, uHorizon:uni.uHorizon}, vertexShader:SEA_VS, fragmentShader:BED_FS}));
  bed.rotation.x = -Math.PI / 2; bed.position.set(-8, -.62, -4); scene.add(bed);
}

/* ---------- 小廟與景物 ---------- */
var MC = {}, GC = {};
function M(c, o){ var k = c + (o ? '_' + o : ''); return MC[k] || (MC[k] = new T.MeshToonMaterial(Object.assign({color:c, gradientMap:toonGrad}, o ? {transparent:true, opacity:o, depthWrite:false} : {}))); }
function MB(c, o){ var k = 'B' + c + (o ? '_' + o : ''); return MC[k] || (MC[k] = new T.MeshBasicMaterial(Object.assign({color:c}, o ? {transparent:true, opacity:o, depthWrite:false} : {}))); }
function box(w, h, d){ var k = 'b' + w + '_' + h + '_' + d; return GC[k] || (GC[k] = new T.BoxGeometry(w, h, d)); }
function cyl(r0, r1, h, n){ var k = 'c' + r0 + '_' + r1 + '_' + h + '_' + (n || 8); return GC[k] || (GC[k] = new T.CylinderGeometry(r0, r1, h, n || 8)); }
function cone(r, h, n){ var k = 'k' + r + '_' + h + '_' + (n || 7); return GC[k] || (GC[k] = new T.ConeGeometry(r, h, n || 7)); }
function ball(r, d){ var k = 's' + r + '_' + (d || 1); return GC[k] || (GC[k] = new T.IcosahedronGeometry(r, d || 1)); }
function mesh(g, c, x, y, z, ry){ var m = new T.Mesh(g, typeof c === 'string' ? M(c) : c); m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; return m; }
function disc(r, c, x, z, y){ var g = GC['d' + r] || (GC['d' + r] = new T.CircleGeometry(r, 28)); var m = new T.Mesh(g, typeof c === 'string' ? M(c) : c); m.rotation.x = -Math.PI / 2; m.position.set(x || 0, y || .006, z || 0); return m; }
var RED = '#b8322a', GOLD = '#d9a53a', TILE = '#2f6b5a', STONE = '#d8cdb8', WOOD = '#6b3f22';
var LIT = '#ff7a3d', DIM = '#7a3a30';
/* 一座廟：台基、紅牆、綠瓦屋頂、燕尾脊、屋脊金珠、門口兩盞燈籠 */
function temple(){
  var g = new T.Group();
  g.add(mesh(box(.3, .025, .22), STONE, 0, .0125));
  g.add(mesh(box(.24, .085, .15), RED, 0, .067));
  g.add(mesh(box(.07, .06, .004), WOOD, 0, .055, .077));
  var roof = mesh(box(.29, .02, .2), TILE, 0, .12); g.add(roof);
  var ridge = mesh(box(.27, .012, .02), TILE, 0, .14); g.add(ridge);
  [-1, 1].forEach(function(sd){
    var tail = mesh(cone(.012, .05, 4), TILE, sd * .14, .158); tail.rotation.z = -sd * .9; g.add(tail);
    var eave = mesh(cone(.01, .035, 4), TILE, sd * .15, .128, .095); eave.rotation.z = -sd * 1.1; g.add(eave);
  });
  g.add(mesh(ball(.012, 1), GOLD, 0, .158));
  var lamps = [];
  [-1, 1].forEach(function(sd){ var l = new T.Mesh(ball(.014, 1), MB(DIM)); l.scale.y = 1.25; l.position.set(sd * .055, .095, .088); g.add(l); lamps.push(l); });
  g.userData.lamps = lamps;
  return g;
}
function lanternString(n, r, y){
  var g = new T.Group(), out = [];
  for (var k = 0; k < n; k++){ var a = k / n * Math.PI * 2, l = new T.Mesh(ball(.011, 0), MB(DIM)); l.scale.y = 1.3; l.position.set(Math.cos(a) * r, y + Math.sin(k * 1.7) * .006, Math.sin(a) * r); g.add(l); out.push(l); }
  g.userData.lamps = out; return g;
}
function palanquin(){
  var g = new T.Group();
  g.add(mesh(box(.05, .045, .04), '#c8282e', 0, .04));
  g.add(mesh(cone(.04, .03, 4), GOLD, 0, .078, 0, Math.PI / 4));
  g.add(mesh(box(.11, .006, .006), WOOD, 0, .025, .016)); g.add(mesh(box(.11, .006, .006), WOOD, 0, .025, -.016));
  for (var k = 0; k < 4; k++) g.add(mesh(cyl(.004, .005, .02, 5), ['#3a3a3a', '#f2d36b'][k % 2], (k < 2 ? -1 : 1) * .045, .012, (k % 2 ? -1 : 1) * .016));
  return g;
}
function person(c){ var g = new T.Group(); g.add(mesh(cyl(.005, .007, .018, 5), c, 0, .009)); g.add(mesh(ball(.0055, 0), '#f1c9a0', 0, .022)); return g; }
var PEOPLE_C = ['#c8282e', '#f2d36b', '#3f6fb5', '#ffffff', '#e07b39', '#6aa84f'];
function crowd(n){ var g = new T.Group(), ps = []; for (var k = 0; k < n; k++){ var p = person(PEOPLE_C[k % PEOPLE_C.length]); g.add(p); ps.push(p); } g.userData.people = ps; return g; }
function sparks(n, colors){
  var geo = new T.BufferGeometry(), pos = new Float32Array(n * 3), colA = new Float32Array(n * 3), vel = [];
  for (var k = 0; k < n; k++){
    var c = col(colors[k % colors.length]); colA[k * 3] = c.r; colA[k * 3 + 1] = c.g; colA[k * 3 + 2] = c.b;
    var a = hash(k * 3.1) * 6.28, up = .3 + hash(k * 5.7) * .7; vel.push([Math.cos(a) * (.15 + hash(k) * .25), up, Math.sin(a) * (.15 + hash(k) * .25), hash(k * 9.1)]);
  }
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(colA, 3));
  var pts = new T.Points(geo, new T.PointsMaterial({size:.035, vertexColors:true, transparent:true, opacity:.95, depthWrite:false}));
  pts.userData.vel = vel; pts.frustumCulled = false;
  return pts;
}
function boat(){
  var g = new T.Group();
  var hull = mesh(box(.26, .045, .07), '#8a3b22', 0, .03); g.add(hull);
  g.add(mesh(box(.2, .012, .075), GOLD, 0, .055));
  g.add(mesh(box(.04, .05, .06), RED, .1, .07));
  [-.06, .02, .08].forEach(function(x, i){ g.add(mesh(cyl(.003, .003, .14 - i * .02, 4), WOOD, x - .03, .12 - i * .01)); var sl = mesh(box(.004, .08 - i * .012, .055), '#f3e2b6', x - .03, .13 - i * .01); g.add(sl); });
  var flames = [];
  for (var k = 0; k < 7; k++){ var f = new T.Mesh(cone(.03, .12, 6), MB(k % 2 ? '#ff9a2e' : '#ff4a1c', .85)); f.position.set(-.11 + k * .037, .1, (hash(k) - .5) * .03); f.visible = false; g.add(f); flames.push(f); }
  g.userData.flames = flames;
  return g;
}
function skyLantern(){ var l = new T.Mesh(box(.026, .036, .026), MB('#ffb347')); return l; }
function smoke(){ var g = new T.Group(), puffs = []; for (var k = 0; k < 4; k++){ var b = new T.Mesh(ball(.014, 1), new T.MeshBasicMaterial({color:'#efe6d6', transparent:true, opacity:.5, depthWrite:false})); g.add(b); puffs.push(b); } g.userData.puffs = puffs; return g; }

/* 依類型做「舉辦期間才顯示」的景物組 */
function festFx(f, g, i){
  var fx = new T.Group(), u = {kind:f.type};
  if (f.type === 'mazu' || f.type === 'parade'){
    var pq = palanquin(); fx.add(pq); u.pq = pq;
    var cr = crowd(f.type === 'mazu' ? 14 : 10); fx.add(cr); u.crowd = cr;
    if (f.type === 'parade'){ var fl = mesh(box(.004, .07, .004), WOOD, 0, .035); fl.add(mesh(box(.03, .02, .002), '#e8b923', .015, .025)); pq.add(fl); }
  }
  if (f.type === 'fire'){
    var sp = sparks(70, ['#fff4c2', '#ffd24a', '#ff6a2a', '#ff2e2e']); sp.position.set(0, .05, .14); fx.add(sp); u.sparks = sp;
    if (f.fx === 'dragon'){ var dr = []; for (var k = 0; k < 11; k++){ var b = mesh(ball(k ? .016 : .022, 1), k % 2 ? '#e8b923' : '#d6372e'); fx.add(b); dr.push(b); } u.dragon = dr; }
    else { var c2 = crowd(10); fx.add(c2); u.crowd = c2; }
  }
  if (f.type === 'sky'){ var ls = []; for (var j = 0; j < 12; j++){ var l = skyLantern(); fx.add(l); ls.push({o:l, ph:hash(j * 3.3), x:(hash(j) - .5) * .3, z:(hash(j * 7) - .5) * .3}); } u.sky = ls; }
  if (f.type === 'lights'){
    var big = new T.Group(); big.add(mesh(cyl(.07, .07, .2, 12), MB('#ff5a3a'), 0, .14)); big.add(mesh(cyl(.075, .075, .02, 12), GOLD, 0, .25)); big.add(mesh(cyl(.075, .075, .02, 12), GOLD, 0, .035));
    big.position.set(.2, 0, .05); fx.add(big); var ring = lanternString(14, .32, .09); fx.add(ring); u.ring = ring; u.big = big;
    var c3 = crowd(12); fx.add(c3); u.crowd = c3;
  }
  if (f.type === 'ghost'){
    if (f.fx === 'water'){ var wl = []; for (var w = 0; w < 9; w++){ var h = new T.Group(); h.add(mesh(box(.04, .02, .03), '#d8282e')); h.add(mesh(cone(.03, .025, 4), GOLD, 0, .022, 0, Math.PI / 4)); fx.add(h); wl.push({o:h, ph:w / 9}); } u.water = wl; }
    if (f.fx === 'pole'){ var pole = new T.Group(); for (var q = 0; q < 4; q++) pole.add(mesh(cyl(.008, .01, .32, 6), '#8a6a3a', (q % 2 ? 1 : -1) * .035, .16, (q < 2 ? 1 : -1) * .035)); pole.add(mesh(box(.1, .012, .1), WOOD, 0, .32)); pole.add(mesh(cone(.03, .1, 6), GOLD, 0, .38)); var flag = mesh(box(.04, .025, .002), '#d6372e', .02, .44); pole.add(mesh(cyl(.002, .002, .06, 4), '#333', 0, .42)); pole.add(flag); pole.position.set(.2, 0, .02); fx.add(pole); u.flag = flag; var cl = []; for (var z = 0; z < 4; z++){ var p = person(['#ffffff', '#c8282e'][z % 2]); pole.add(p); cl.push(p); } u.climb = cl; }
    if (f.fx === 'table'){ for (var t2 = 0; t2 < 3; t2++){ var tb = mesh(box(.24, .014, .04), '#a8452e', .05, .035, .12 + t2 * .055); fx.add(tb); for (var o = 0; o < 6; o++) fx.add(mesh(ball(.008, 0), ['#f2d36b', '#e8862e', '#d6372e', '#ffffff'][(o + t2) % 4], -.05 + o * .04, .05, .12 + t2 * .055)); } var king = new T.Group(); king.add(mesh(cone(.05, .2, 6), '#2f4f8f', 0, .1)); king.add(mesh(ball(.03, 1), '#3d6f5a', 0, .22)); king.position.set(-.18, 0, .05); fx.add(king); }
    var c4 = crowd(8); fx.add(c4); u.crowd = c4;
  }
  if (f.type === 'wang'){ var bt = boat(); bt.position.set(.15, 0, .16); bt.rotation.y = .4; fx.add(bt); u.boat = bt; var c5 = crowd(12); fx.add(c5); u.crowd = c5; }
  if (f.type === 'rite'){ var sm = smoke(); sm.position.set(0, .16, .1); fx.add(sm); u.smoke = sm; var c6 = crowd(8); fx.add(c6); u.crowd = c6; }
  fx.visible = false; fx.userData = u; g.add(fx);
  return fx;
}

/* ---------- 進香路線（示意） ---------- */
function buildRoute(f){
  if (!f.route) return null;
  var pts = f.route.map(function(a){ var q = P(a[0], a[1]); return new T.Vector3(q[0], 0, q[1]); });
  var curve = new T.CatmullRomCurve3(pts), g = new T.Group(), N = Math.round(curve.getLength() / .1);
  for (var k = 0; k <= N; k++){ var q = curve.getPointAt(k / N); var d = new T.Mesh(ball(.014, 0), MB(k % 2 ? '#e8b923' : '#d6372e')); d.position.set(q.x, landY(q.x, q.z) + .015, q.z); g.add(d); }
  g.visible = false; scene.add(g);
  return {g:g, curve:curve};
}

/* ---------- 標籤 ---------- */
function addLabel(el, pos, pri, kind, extra){
  el.classList.add('lab3d', 'off');
  labelRoot.appendChild(el);
  var L = Object.assign({el:el, pos:pos, pri:pri, kind:kind, w:0, h:0, active:true, off:true}, extra || {});
  labels.push(L);
  return L;
}
function layoutLabels(){
  var W = host.clientWidth, H = host.clientHeight, placed = [];
  var sorted = labels.slice().sort(function(a, b){ return (b.pri + (b.boost || 0)) - (a.pri + (a.boost || 0)); });
  for (var i = 0; i < sorted.length; i++){
    var L = sorted[i];
    if (!L.active || (L.kind === 'spot' && !showLabels && !L.boost)){ hide(L); continue; }
    tmpV.copy(L.pos).project(camera);
    if (tmpV.z > 1 || tmpV.z < -1){ hide(L); continue; }
    var x = (tmpV.x * .5 + .5) * W, y = (-tmpV.y * .5 + .5) * H;
    if (!L.w){ L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
    var r = [x - L.w / 2, y - L.h, x + L.w / 2, y];
    if (r[2] < 0 || r[0] > W || r[3] < 0 || r[1] > H){ hide(L); continue; }
    var hit = false;
    if (L.kind !== 'sea') for (var k = 0; k < placed.length; k++){ var q = placed[k]; if (r[0] < q[2] + 2 && r[2] > q[0] - 2 && r[1] < q[3] + 1 && r[3] > q[1] - 1){ hit = true; break; } }
    if (hit){ hide(L); continue; }
    if (L.kind !== 'sea') placed.push(r);
    L.el.style.transform = 'translate(' + Math.round(r[0]) + 'px,' + Math.round(r[1]) + 'px)';
    if (L.off){ L.el.classList.remove('off'); L.off = false; }
  }
  function hide(L){ if (!L.off){ L.el.classList.add('off'); L.off = true; } }
}

/* ---------- 步道排列 ---------- */
function onLand(x, z){
  if (field(x, z) < -.15) return [x, z];
  for (var r = .05; r < 2; r += .05) for (var a = 0; a < 16; a++){
    var px = x + Math.cos(a / 16 * Math.PI * 2) * r, pz = z + Math.sin(a / 16 * Math.PI * 2) * r;
    if (field(px, pz) < -.18) return [px, pz];
  }
  return [x, z];
}
function layoutSpots(){
  var pos = TF.SPOTS.map(function(p){ return P(p.at[0], p.at[1]); }), used = [], groups = [];
  TF.SPOTS.forEach(function(p, i){
    if (used[i]) return;
    var g = [i]; used[i] = 1;
    for (var k = i + 1; k < pos.length; k++) if (!used[k] && g.some(function(m){ return Math.hypot(pos[m][0] - pos[k][0], pos[m][1] - pos[k][1]) < .7; })){ g.push(k); used[k] = 1; }
    groups.push(g);
  });
  var out = [];
  groups.forEach(function(g){
    if (g.length === 1){ out[g[0]] = onLand(pos[g[0]][0], pos[g[0]][1]); return; }
    var cx = 0, cz = 0; g.forEach(function(m){ cx += pos[m][0]; cz += pos[m][1]; }); cx /= g.length; cz /= g.length;
    var R = .42 + g.length * .07;
    var ang = g.map(function(m){ return {m:m, a:Math.atan2(pos[m][1] - cz, pos[m][0] - cx)}; }).sort(function(p, q){ return p.a - q.a; });
    ang.forEach(function(o, i){
      var a = ang[0].a + i / ang.length * Math.PI * 2;
      out[o.m] = onLand(cx + Math.cos(a) * R, cz + Math.sin(a) * R);
    });
  });
  return out;
}

function buildSpots(){
  var places = layoutSpots();
  FC.FESTS.forEach(function(f, i){
    var x = places[i][0], z = places[i][1], g = new T.Group(), K = 1.5;
    var tp = temple(); g.add(tp);
    var ring = lanternString(10, .26, .14); g.add(ring);
    var fx = festFx(f, g, i);
    g.scale.setScalar(K); g.rotation.y = (hash(i * 5.1) - .5) * .8;
    var y = landY(x, z); g.position.set(x, y, z);
    g.traverse(function(o){ if (o.isMesh){ o.userData.spotId = f.id; pickables.push(o); } });
    scene.add(g);
    var el = document.createElement('button'); el.type = 'button'; el.className = 'plab'; el.dataset.spot = f.id;
    el.innerHTML = '<i></i><span>' + f.short + '</span><em></em>';
    el.addEventListener('click', function(e){ e.stopPropagation(); if (S.onPickSpot) S.onPickSpot(f.id); });
    SPOT3[f.id] = {id:f.id, idx:i, x:x, y:y, z:z, grp:g, temple:tp, ring:ring, fx:fx, K:K, route:buildRoute(f), label:addLabel(el, new T.Vector3(x, y + .42, z), 3, 'spot')};
  });
}
S.spot3 = function(id){ return SPOT3[id]; };
/* 燈會每年換縣市：換年份時把整組搬過去 */
function placeYearly(){
  FC.FESTS.forEach(function(f){
    if (!f.where) return;
    var S3 = SPOT3[f.id], a = FC.at(f, curYear), q = P(a[0], a[1]);
    if (Math.hypot(q[0] - S3.x, q[1] - S3.z) < .01) return;
    S3.x = q[0]; S3.z = q[1]; S3.y = landY(q[0], q[1]); S3.grp.position.set(S3.x, S3.y, S3.z); S3.label.pos.set(S3.x, S3.y + .42, S3.z); S3.label.w = 0;
  });
}
function lampOn(list, on){ list.forEach(function(l){ l.material = MB(on ? LIT : DIM); }); }
/* 依日期決定每個廟會的狀態：live 舉辦中、soon 30 天內、later、tbd（日期待公告或今年沒有） */
var STATE = {};
function applyDay(){
  var Y = FC.ymd(curDay).y;
  if (Y !== curYear){ curYear = Y; placeYearly(); }
  var act = {}; FC.activeOn(curDay).forEach(function(a){ act[a.f.id] = a.o; });
  FC.FESTS.forEach(function(f, i){
    var S3 = SPOT3[f.id], o = act[f.id], nx = o ? null : FC.nextOf(f, curDay), st, days = 0;
    if (o) st = o.st === 'approx' ? 'maybe' : o.st === 'pause' ? 'pause' : 'live';
    else if (nx && nx.o.st !== 'approx'){ days = nx.o.s - curDay; st = days <= 30 ? 'soon' : 'later'; }
    else st = 'tbd';
    STATE[f.id] = {st:st, days:days, o:o || (nx && nx.o), last:o && curDay === o.e};
    var live = st === 'live', warm = live || st === 'soon' || st === 'maybe';
    S3.fx.visible = live || (st === 'maybe' && f.id === selId);
    lampOn(S3.temple.userData.lamps, warm); lampOn(S3.ring.userData.lamps, live); S3.ring.visible = live;
    var w = live ? 1 : st === 'maybe' ? .45 : st === 'soon' ? .3 : 0;
    U.f[i].set(S3.x, S3.z, live ? 1.5 : 1, w);
    if (S3.route) S3.route.g.visible = live || f.id === selId;
    if (S3.fx.userData.boat) S3.fx.userData.boat.userData.flames.forEach(function(fl){ fl.visible = live && STATE[f.id].last; });
    var em = S3.label.el.querySelector('em'), dot = S3.label.el.querySelector('i');
    em.textContent = live ? '舉辦中' : st === 'maybe' ? '可能在這幾天' : st === 'pause' ? '停辦' : st === 'soon' ? (days === 0 ? '今天' : days + ' 天後') : '';
    S3.label.el.className = 'plab lab3d' + (S3.label.off ? ' off' : '') + ' st-' + st + (f.id === selId ? ' on' : '');
    dot.style.background = live ? '#e8322a' : st === 'soon' ? '#e8a52a' : st === 'maybe' ? '#e8c87a' : '#b9ab96';
    S3.label.pri = live ? 4 : st === 'soon' ? 3 - days / 40 : st === 'maybe' ? 2.4 : 1;
    S3.label.w = 0;
  });
}

/* ---------- 雲 ---------- */
function cloud(seed){
  var g = new T.Group(), m = new T.MeshToonMaterial({color:'#ffffff', gradientMap:toonGrad, transparent:true, opacity:.95});
  var n = 4 + (seed % 3);
  for (var i = 0; i < n; i++){
    var r = .9 + hash(seed * 7 + i) * .9, s = new T.Mesh(new T.SphereGeometry(r, 12, 9), m);
    s.position.set((i - n / 2) * 1.1 + hash(seed + i) * .6, hash(seed * 3 + i) * .5, (hash(seed * 5 + i) - .5) * 1.4);
    s.scale.y = .62; g.add(s);
  }
  return g;
}

/* ---------- 鏡頭 ---------- */
S.flyTo = function(x, z, dist, polar, dur, y){
  var off = camera.position.clone().sub(controls.target), sph = new T.Spherical().setFromVector3(off);
  var to = new T.Spherical(dist, polar === undefined ? .9 : polar, sph.theta);
  var endT = new T.Vector3(x, y || 0, z), endP = new T.Vector3().setFromSpherical(to).add(endT);
  fly = {t0:clock.elapsedTime, dur:reduce ? .01 : (dur || 1.3), fromT:controls.target.clone(), toT:endT, fromP:camera.position.clone(), toP:endP};
};
function aspectK(){ var a = host.clientWidth / Math.max(1, host.clientHeight); return a < .8 ? 1.45 : 1; }
S.overview = function(){
  var a = host.clientWidth / Math.max(1, host.clientHeight);
  S.flyTo(-6, 0, a < .8 ? 100 : a < 1.2 ? 80 : 66, .6);
};
S.focusSpot = function(id){
  var S3 = SPOT3[id]; if (!S3) return;
  S.flyTo(S3.x, S3.z, (S3.y > .4 ? 5.6 : 5) * aspectK(), .9, 1.3, S3.y * .8);
};
S.focusRegion = function(ids){
  var xs = [], zs = [];
  ids.forEach(function(id){ var S3 = SPOT3[id]; if (S3){ xs.push(S3.x); zs.push(S3.z); } });
  if (!xs.length) return;
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), z0 = Math.min.apply(null, zs), z1 = Math.max.apply(null, zs);
  S.flyTo((x0 + x1) / 2, (z0 + z1) / 2, Math.max(9, Math.max(x1 - x0, z1 - z0) * 1.5 + 6) * aspectK(), .8);
};

S.focusSpot = function(id){
  var S3 = SPOT3[id]; if (!S3) return;
  S.flyTo(S3.x, S3.z, 5 * aspectK(), .9, 1.3, S3.y + .3);
};
S.focusRoute = function(id){
  var S3 = SPOT3[id]; if (!S3 || !S3.route) return S.focusSpot(id);
  var pts = S3.route.curve.points, xs = pts.map(function(p){ return p.x; }), zs = pts.map(function(p){ return p.z; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), z0 = Math.min.apply(null, zs), z1 = Math.max.apply(null, zs);
  S.flyTo((x0 + x1) / 2, (z0 + z1) / 2, Math.max(8, Math.max(x1 - x0, z1 - z0) * 1.6 + 4) * aspectK(), .85);
};
/* ---------- 廟宇圖錄：在地圖上標出一座廟（金色箭頭＋小廟，同時只有一個） ---------- */
var pinG = null, pinL = null;
S.pinTemple = function(lon, lat, name){
  if (!S.ready) return;
  if (lon == null){ if (pinG){ pinG.visible = false; pinL.active = false; } return; }
  if (!pinG){
    pinG = new T.Group(); var tp = temple(); tp.scale.setScalar(1.4); pinG.add(tp);
    var mk = new T.Mesh(cone(.07, .18, 4), MB('#e8c35a')); mk.rotation.x = Math.PI; mk.position.y = .72; pinG.add(mk); pinG.userData.mk = mk;
    scene.add(pinG);
    var el = document.createElement('div'); el.className = 'plab tpin';
    pinL = addLabel(el, new T.Vector3(), 9, 'pin', {boost:20});
  }
  var q = P(lon, lat), y = landY(q[0], q[1]);
  pinG.position.set(q[0], y, q[1]); pinG.visible = true;
  pinL.el.innerHTML = '<span>🏯 ' + String(name).replace(/[<>&]/g, '') + '</span>'; pinL.pos.set(q[0], y + .95, q[1]); pinL.w = 0; pinL.active = true;
  S.flyTo(q[0], q[1], 5 * aspectK(), .9, 1.3, y + .3);
};
S.pinInfo = function(){ return pinG && pinG.visible ? {x:pinG.position.x, z:pinG.position.z} : null; };
/* ---------- 對外 ---------- */
S.setDay = function(n){ curDay = n; if (S.ready) applyDay(); };
S.selectSpot = function(id){ selId = id || null; if (S.ready) applyDay(); };
S.setLabels = function(on){ showLabels = !!on; };
S.setReduce = function(on){ reduce = !!on; if (seaMat) seaMat.uniforms.uCalm.value = reduce ? .15 : 1; };
S.resize = function(){ if (S.ready) resize(); };
S.setHorizon = function(c){ if (seaMat) seaMat.uniforms.uHorizon.value.set(c[0], c[1], c[2]); };

/* ---------- 互動 ---------- */
function pick(ev){
  var r = renderer.domElement.getBoundingClientRect();
  ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  var hit = raycaster.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData : null;
}
function bindPointer(){
  var el = renderer.domElement, down = null, q = null, pending = false;
  el.addEventListener('pointerdown', function(e){ down = {x:e.clientX, y:e.clientY}; });
  el.addEventListener('pointerup', function(e){
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    var u = pick(e); if (u && u.spotId && S.onPickSpot) S.onPickSpot(u.spotId);
  });
  el.addEventListener('pointermove', function(e){
    if (e.pointerType !== 'mouse') return;
    q = e; if (pending) return; pending = true;
    requestAnimationFrame(function(){ pending = false; el.style.cursor = pick(q) ? 'pointer' : ''; });
  });
}

/* ---------- 迴圈 ---------- */
function resize(){
  var w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h);
  if (w > 760) camera.setViewOffset(w, h, Math.min(190, w * .13), 0, w, h);
  else camera.setViewOffset(w, h, 0, document.body.classList.contains('sheet-min') ? -h * .09 : h * .1, w, h);
  camera.updateProjectionMatrix();
  labels.forEach(function(L){ L.w = 0; });
}
function walk(list, t, cx, cz, r, sp, k){ list.forEach(function(p, j){ var a = t * sp * k + j / list.length * 6.28; p.position.set(cx + Math.cos(a) * (r + (j % 3) * .02), Math.abs(Math.sin(t * 8 * k + j)) * .006, cz + Math.sin(a) * (r + (j % 3) * .02)); p.rotation.y = -a; }); }
function animFest(S3, t, i){
  var u = S3.fx.userData, k = reduce ? .2 : 1, st = STATE[S3.id];
  S3.temple.userData.lamps.forEach(function(l, j){ l.position.y = .095 + Math.sin(t * 2 + j + i) * .003; });
  if (!S3.fx.visible) return;
  if (u.pq){
    if (S3.route && u.kind === 'mazu'){
      // 神轎沿路線往返（以縮放後的局部座標換算）
      var c = S3.route.curve, s = (t * .012 * k + i * .1) % 2, s1 = s < 1 ? s : 2 - s, q = c.getPointAt(Math.min(.999, s1));
      var lx = (q.x - S3.x) / S3.K, lz = (q.z - S3.z) / S3.K, ly = (landY(q.x, q.z) - S3.y) / S3.K + .01, rot = -S3.grp.rotation.y;
      var X = lx * Math.cos(rot) - lz * Math.sin(rot), Z = lx * Math.sin(rot) + lz * Math.cos(rot);
      u.pq.position.set(X, ly, Z);
      u.crowd.userData.people.forEach(function(p, j){ var s2 = Math.max(0, Math.min(.999, s1 - (s < 1 ? 1 : -1) * (j + 1) * .004)), q2 = c.getPointAt(s2); var bx = (q2.x - S3.x) / S3.K, bz = (q2.z - S3.z) / S3.K; p.position.set(bx * Math.cos(rot) - bz * Math.sin(rot) + (hash(j) - .5) * .04, (landY(q2.x, q2.z) - S3.y) / S3.K + .01, bx * Math.sin(rot) + bz * Math.cos(rot) + (hash(j * 3) - .5) * .04); });
    } else {
      var a = t * .35 * k; u.pq.position.set(Math.cos(a) * .3, Math.abs(Math.sin(t * 6 * k)) * .006, Math.sin(a) * .3); u.pq.rotation.y = -a;
      u.crowd.userData.people.forEach(function(p, j){ var b = a - (j + 1) * .09; p.position.set(Math.cos(b) * (.3 + (j % 2 ? .03 : -.03)), Math.abs(Math.sin(t * 8 * k + j)) * .006, Math.sin(b) * (.3 + (j % 2 ? .03 : -.03))); p.rotation.y = -b; });
    }
  } else if (u.crowd) walk(u.crowd.userData.people, t, 0, .05, .24, .12, k);
  if (u.sparks){
    var pa = u.sparks.geometry.attributes.position, v = u.sparks.userData.vel;
    for (var n = 0; n < v.length; n++){ var f = (t * .7 * k + v[n][3]) % 1; pa.setXYZ(n, v[n][0] * f, v[n][1] * f - .5 * f * f * .6, v[n][2] * f); }
    pa.needsUpdate = true;
  }
  if (u.dragon) u.dragon.forEach(function(b, j){ var a2 = t * .5 * k - j * .14; b.position.set(Math.cos(a2) * .27, .05 + Math.sin(t * 3 * k + j * .6) * .02, Math.sin(a2) * .27); });
  if (u.sky) u.sky.forEach(function(L){ var f2 = (t * .05 * k + L.ph) % 1; L.o.position.set(L.x + Math.sin(f2 * 6 + L.ph * 9) * .05, .08 + f2 * 1.6, L.z); L.o.material = MB('#ffb347', Math.max(.05, 1 - f2 * .9)); });
  if (u.ring) u.ring.rotation.y = t * .1 * k;
  if (u.water) u.water.forEach(function(w){ var f3 = (t * .02 * k + w.ph) % 1; w.o.position.set(.3 + f3 * .7, -S3.y / S3.K + .01, -.35 - f3 * .5 + Math.sin(f3 * 9 + w.ph * 6) * .04); });
  if (u.climb) u.climb.forEach(function(p, j){ var f4 = (t * .08 * k + j * .21) % 1; p.position.set((j % 2 ? .035 : -.035), .02 + f4 * .28, .045); });
  if (u.flag) u.flag.rotation.y = Math.sin(t * 3) * .4;
  if (u.boat) u.boat.userData.flames.forEach(function(fl, j){ if (fl.visible) fl.scale.set(1, .7 + Math.abs(Math.sin(t * 9 * k + j)) * .6, 1); });
  if (u.smoke) u.smoke.userData.puffs.forEach(function(b, j){ var f5 = (t * .25 * k + j / 4) % 1; b.position.set(Math.sin(f5 * 5 + j) * .01, f5 * .16, 0); b.scale.setScalar(.5 + f5 * 1.4); b.material.opacity = .5 * (1 - f5); });
}
function loop(){
  requestAnimationFrame(loop);
  var dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  U.time.value = t;
  if (fly){
    var k = Math.min(1, (t - fly.t0) / fly.dur), e = ease(k);
    controls.target.lerpVectors(fly.fromT, fly.toT, e); camera.position.lerpVectors(fly.fromP, fly.toP, e);
    if (k >= 1) fly = null;
  }
  controls.update();
  FC.FESTS.forEach(function(f, i){ animFest(SPOT3[f.id], t, i); });
  if (pinG && pinG.visible) pinG.userData.mk.position.y = .72 + (reduce ? 0 : Math.sin(t * 3) * .05);
  clouds.forEach(function(C){ C.g.position.x += dt * C.v * (reduce ? .3 : 1); if (C.g.position.x > EXT.x1 + 20) C.g.position.x = EXT.x0 - 20; });
  renderer.render(scene, camera);
  layoutLabels();
}

/* ---------- 啟動 ---------- */
S.init = function(opts){
  host = opts.host; labelRoot = opts.labels;
  if (opts.reduce !== undefined) reduce = opts.reduce;
  curDay = opts.day; curYear = FC.ymd(curDay).y;
  FC.FESTS.forEach(function(f){ if (f.where) f.at = FC.at(f, curYear); });
  return Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]).then(function(mods){
    T = mods[0]; Orbit = mods[1].OrbitControls; tmpV = new T.Vector3();
    clock = new T.Clock();
    U.f = FC.FESTS.map(function(){ return new T.Vector4(); });
    LANDC = {under:col('#c9d9c0'), sand:col('#efe2bf'), plain:col('#d6dba6'), grass:col('#bfcf8e'), forest:col('#9db57f'), deep:col('#86a478'), rock:col('#b8b19c'), peak:col('#e2dccb')};
    renderer = new T.WebGLRenderer({antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(42, 1, .03, 900);
    camera.position.set(-6, 44, 34);
    controls = new Orbit(camera, renderer.domElement);
    controls.target.set(-6, 0, -3);
    controls.enableDamping = true; controls.dampingFactor = .08;
    controls.maxPolarAngle = 1.3; controls.minDistance = 1; controls.maxDistance = 140;
    controls.screenSpacePanning = false; controls.zoomSpeed = .9;
    controls.addEventListener('start', function(){ fly = null; });
    raycaster = new T.Raycaster(); ndc = new T.Vector2();
    toonGrad = new T.DataTexture(new Uint8Array([130, 200, 255]), 3, 1, T.RedFormat);
    toonGrad.minFilter = toonGrad.magFilter = T.NearestFilter; toonGrad.needsUpdate = true;
    landMat = paperPatch(new T.MeshToonMaterial({vertexColors:true, gradientMap:toonGrad}));
    scene.add(new T.HemisphereLight('#ffe7c4', '#a8b88c', 1.5));
    var sun = new T.DirectionalLight('#ffd8a8', 2.1); sun.position.set(-26, 26, 22); scene.add(sun);
    scene.add(new T.AmbientLight('#ffffff', .35));

    buildPolys(); prepRidges();
    var tex = buildField();
    buildSea(tex);
    ISL.forEach(buildLand);
    buildSpots();

    ISL.forEach(function(I){
      if (!I.name) return;
      var el = document.createElement('div'); el.className = I.main ? 'ilab main' : 'ilab'; el.textContent = I.name;
      var at = I.main ? new T.Vector3(1.5, 2.6, -2) : new T.Vector3(I.c[0], .5, I.c[1] - .2);
      addLabel(el, at, I.main ? 5 : 2, 'isle');
    });
    FC.PEAKS.forEach(function(pk){
      var q = P(pk.at[0], pk.at[1]), el = document.createElement('div'); el.className = 'pk';
      el.textContent = '▲ ' + pk.name + ' ' + pk.m.toLocaleString() + 'm';
      addLabel(el, new T.Vector3(q[0], landY(q[0], q[1]) + .25, q[1]), 1, 'peak');
    });
    [['台灣海峽', 119.6, 24.25], ['太平洋', 122.6, 23.3], ['巴士海峽', 120.6, 21.3]].forEach(function(s){
      var q = P(s[1], s[2]), el = document.createElement('div'); el.className = 'sealab'; el.textContent = s[0];
      addLabel(el, new T.Vector3(q[0], .1, q[1]), 0, 'sea');
    });
    for (var i = 0; i < 6; i++){
      var c = cloud(i + 1); c.position.set(EXT.x0 + hash(i * 3.3) * (EXT.x1 - EXT.x0 + 20), 13 + hash(i * 1.9) * 3, EXT.z0 + hash(i * 4.7) * (EXT.z1 - EXT.z0));
      c.scale.setScalar(.6 + hash(i * 2.2) * .5); scene.add(c); clouds.push({g:c, v:.25 + hash(i) * .3});
    }

    bindPointer();
    window.addEventListener('resize', resize); resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    S.ready = true;
    applyDay();
    S.overview(); fly.dur = .01;
    loop();
  });
};
S.stats = function(){
  var live = 0, fx = 0; FC.FESTS.forEach(function(f){ if (STATE[f.id] && STATE[f.id].st === 'live') live++; if (SPOT3[f.id].fx.visible) fx++; });
  return {spots:Object.keys(SPOT3).length, islands:ISL.length, labels:labels.length, visibleLabels:labels.filter(function(L){ return !L.off; }).length, day:FC.iso(curDay), live:live, fx:fx,
    state:Object.keys(STATE).reduce(function(o, k){ o[k] = STATE[k].st; return o; }, {})};
};
})();
