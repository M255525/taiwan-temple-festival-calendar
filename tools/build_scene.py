"""把台灣賞花地圖 scene.js 的共用段落（地形、標籤、排列、雲、鏡頭、點選）組進 tools/scene_tpl.js，產生 scene.js。
用法（在本資料夾執行）：python tools/build_scene.py ../taiwan-flower-map/scene.js
"""
import sys, io
src = open(sys.argv[1], encoding='utf-8').read()
def cut(a, b):
    i = src.index(a); j = src.index(b, i)
    return src[i:j]
parts = {
    'GEO': cut('/* ---------- 幾何', '/* ---------- 陸地花色'),
    'LABELS': cut('/* ---------- 標籤', '/* ---------- 地點'),
    'LAYOUT': '/* ---------- 步道排列 ---------- */\n' + cut('function onLand', 'function buildSpots'),
    'CLOUD': cut('/* ---------- 雲', '/* ---------- 鏡頭'),
    'CAMERA': cut('/* ---------- 鏡頭', '/* ---------- 對外'),
    'INTERACT': cut('/* ---------- 互動', '/* ---------- 迴圈'),
}
tpl = open('tools/scene_tpl.js', encoding='utf-8').read()
for k, v in parts.items():
    tpl = tpl.replace('{{' + k + '}}', v.rstrip() + '\n')
assert '{{' not in tpl
open('scene.js', 'w', encoding='utf-8').write(tpl)
print('scene.js ok', len(tpl))
