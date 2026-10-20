"""Render the editable Three.js README artwork. Requires Pillow and Playwright.

Serve the repository root at http://127.0.0.1:4180 before running this script.
Uses installed Chrome; set CHROME_PATH to select another installation.
"""
import io
import os
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'docs' / 'media'
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROME_PATH', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
        headless=True,
        args=['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    )
    page = browser.new_page(viewport={'width': 960, 'height': 480}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:4180/docs/media/readme-scene.html?capture')
    page.wait_for_function('window.artReady === true', timeout=60000)
    frames = []
    for i in range(60):
        page.evaluate('(t) => window.renderFrame(t)', i / 60)
        png = page.screenshot()
        if i == 0:
            (MEDIA / 'horizon-poster.png').write_bytes(png)
        frames.append(Image.open(io.BytesIO(png)).convert('RGB'))
    frames[0].save(MEDIA / 'horizon-hero.gif', save_all=True, append_images=frames[1:],
                   duration=80, loop=0, optimize=True, disposal=2)
    browser.close()
    if errors:
        raise RuntimeError(errors)
    print('Rendered 60 frames, looping 4.8-second 960 x 480 GIF and PNG poster.')
