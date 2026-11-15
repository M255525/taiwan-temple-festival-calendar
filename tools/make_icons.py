# PWA 圖示：黑漆底＋金框＋紅燈籠（python tools/make_icons.py）
import os
from PIL import Image, ImageDraw
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(out, exist_ok=True)
def draw(size, pad, bg=True):
    s = 4 * size
    im = Image.new('RGB', (s, s), '#1f1410')
    d = ImageDraw.Draw(im)
    x0 = pad * s; w = s - 2 * x0
    if bg: d.rectangle([x0 + w*.03, x0 + w*.03, x0 + w*.97, x0 + w*.97], outline='#c9962e', width=int(w*.025))
    cx = s / 2
    d.line([cx, x0 + w*.08, cx, x0 + w*.2], fill='#e8c35a', width=int(w*.03))
    d.rounded_rectangle([cx - w*.16, x0 + w*.18, cx + w*.16, x0 + w*.25], radius=w*.02, fill='#e8c35a')
    d.ellipse([cx - w*.3, x0 + w*.22, cx + w*.3, x0 + w*.78], fill='#d6372e', outline='#7a1f17', width=int(w*.015))
    for k in (-.18, 0, .18):
        d.arc([cx - w*.3*(1-abs(k)*1.2) - w*.02, x0 + w*.22, cx + w*.3*(1-abs(k)*1.2) + w*.02, x0 + w*.78], 270, 90, fill='#f6a04a', width=int(w*.01)) if k else None
    for y in (.38, .5, .62):
        d.line([cx - w*.26, x0 + w*y, cx + w*.26, x0 + w*y], fill='#f6a04a', width=int(w*.012))
    d.rounded_rectangle([cx - w*.16, x0 + w*.75, cx + w*.16, x0 + w*.82], radius=w*.02, fill='#e8c35a')
    for k in range(5):
        x = cx - w*.08 + k * w*.04
        d.line([x, x0 + w*.82, x, x0 + w*.93], fill='#e8c35a', width=int(w*.012))
    return im.resize((size, size), Image.LANCZOS)
draw(192, .04).save(os.path.join(out, 'icon-192.png'))
draw(512, .04).save(os.path.join(out, 'icon-512.png'))
draw(512, .14).save(os.path.join(out, 'icon-maskable-512.png'))
draw(180, .04).save(os.path.join(out, 'apple-touch-icon.png'))
draw(64, .02, False).save(os.path.join(out, 'favicon.png'))
print('ok')
