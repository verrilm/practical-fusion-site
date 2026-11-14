# Practical Fusion Solutions — website

A static site (no build step). Open it through a local server:

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

## Structure
```
index.html                    all sections
assets/css/site.css           styles (Nohemi for headings, Geist for body)
assets/js/site.js             intro, cursor perspective, mission transition, scroll effects, menu, form
assets/js/three-scenes.js     the Dyson sun (hero) and the wireframe atom (venture card)
assets/img/                   artwork (from the Framer draft; see "Assets to replace")
assets/fonts/                 Nohemi, Geist
assets/vendor/                three.js (stored locally, no CDN)
```

## How the page flows
1. **Intro:** a straight zoom out (no tilt). The headline words sharpen one by one, the header fades in, and the button grows from a dark pill.
2. **Cursor:** every hero layer (sky, sun, rocks, canyon, astronaut) shifts by its depth. The astronaut sits behind the canyon.
3. **Sun:** a small bright disc with a wide, very diffuse glow, sitting in the bottom-right corner behind the canyon and floating rocks.
4. **Begin your Mission:** hovering zooms in slightly. Clicking (or the first scroll) moves the camera up, the sun moves to the left, and two circles grow out of it (one dotted and spinning, one solid). A header and two lines appear on the right. Scrolling up from here returns to the landing.
5. **Scroll:** the services slide up over the scene; its corners round off, with no shrinking or dimming.
6. **Venture card:** a hollow wireframe atom (three logo-style orbits with white dots), half visible on the right, follows the cursor.
7. **Success stories:** each card's background, main image and logo move at different speeds.
8. **Contact:** the main stack is cropped into a smaller rounded window, revealing the contact section. The canyon floor sits in front of the form card.

Static paper noise is applied only to the line-art scenes (hero, contact) and line-art images (service cards, stories).

## Contact form
GitHub Pages can't receive form submissions. Create a form at formspree.io and paste its URL into `FORM_ENDPOINT` at the top of `assets/js/site.js`.

## Assets to replace (exported at 2x, transparent PNG)
- `astronaut`, rocks: the current exports are 1x, so 2x versions will look sharper on retina screens
- Success story 1: separate background, scientist and SMART USA logo layers (currently one flat image)
- Success story 4: its own image and logo (currently a placeholder)
- `hero-sky`, `contact-floor`: higher resolution if available

## Licences
Nohemi (Pangram Pangram): check the commercial licence. Geist (Vercel): SIL Open Font License. three.js: MIT (`assets/vendor/THREE-LICENSE`).
