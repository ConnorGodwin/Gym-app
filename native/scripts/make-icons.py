"""Generates Android/iOS app icons, splash screens and the notification icon from the Forge logo.
Run from native/:  python3 scripts/make-icons.py   (needs Pillow). Re-run if the logo or colours change."""
from PIL import Image, ImageDraw
import glob, os

BG, FG = (15, 17, 21), (163, 230, 53)

def logo(size, bg=BG, fg=FG, pad=0.0, rounded=True):
    """Dumbbell mark on a square canvas. pad = fraction of size kept empty around the mark."""
    im = Image.new('RGBA', (size, size), bg + (255,) if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    inner = size * (1 - 2 * pad)
    s = inner / 512.0
    off = size * pad
    w = max(1, int(40 * s))
    pts = [(160, 156, 160, 356), (352, 156, 352, 356), (96, 206, 96, 306), (416, 206, 416, 306), (160, 256, 352, 256)]
    for x0, y0, x1, y1 in pts:
        d.line([(off + x0 * s, off + y0 * s), (off + x1 * s, off + y1 * s)], fill=fg, width=w)
        for x, y in ((x0, y0), (x1, y1)):
            d.ellipse([off + x * s - w / 2, off + y * s - w / 2, off + x * s + w / 2, off + y * s + w / 2], fill=fg)
    return im

res = 'android/app/src/main/res'
for folder, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    sq = logo(px, pad=0.08)
    mask = Image.new('L', (px, px), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * 0.22), fill=255)
    out = Image.new('RGBA', (px, px), (0, 0, 0, 0)); out.paste(sq, mask=mask)
    out.save(f'{res}/mipmap-{folder}/ic_launcher.png')
    rmask = Image.new('L', (px, px), 0); ImageDraw.Draw(rmask).ellipse([0, 0, px - 1, px - 1], fill=255)
    rnd = Image.new('RGBA', (px, px), (0, 0, 0, 0)); rnd.paste(logo(px, pad=0.12), mask=rmask)
    rnd.save(f'{res}/mipmap-{folder}/ic_launcher_round.png')
    fg = px * 108 // 48  # adaptive icon foreground layer, mark kept inside the 66 dp safe zone
    logo(fg, bg=None, pad=0.26).save(f'{res}/mipmap-{folder}/ic_launcher_foreground.png')

os.makedirs(f'{res}/values', exist_ok=True)
with open(f'{res}/values/ic_launcher_background.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F1115</color>\n</resources>\n')

# splash screens: replace every template splash with the mark centred on the app background
for p in glob.glob(f'{res}/drawable*/splash.png') + glob.glob('ios/App/App/Assets.xcassets/Splash.imageset/*.png'):
    w, h = Image.open(p).size
    im = Image.new('RGB', (w, h), BG)
    m = logo(int(min(w, h) * 0.28), pad=0.0).convert('RGBA')
    im.paste(m, ((w - m.width) // 2, (h - m.height) // 2), m)
    im.save(p)

# notification icon (Android requires a white silhouette)
os.makedirs(f'{res}/drawable', exist_ok=True)
with open(f'{res}/drawable/ic_stat_forge.xml', 'w') as f:
    f.write('''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="512" android:viewportHeight="512">
    <path android:strokeColor="#FFFFFFFF" android:strokeWidth="44" android:strokeLineCap="round" android:pathData="M160,156L160,356M352,156L352,356M96,206L96,306M416,206L416,306M160,256L352,256"/>
</vector>
''')

# iOS app icon (single 1024 px, no transparency allowed)
ios_icon = glob.glob('ios/App/App/Assets.xcassets/AppIcon.appiconset/*.png')
for p in ios_icon:
    logo(1024, pad=0.1).convert('RGB').save(p)
print('icons and splash screens written:', len(glob.glob(f'{res}/mipmap-*/*.png')), 'Android icons,', len(ios_icon), 'iOS icon')
