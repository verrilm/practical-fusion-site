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
1. **Intro:** the camera starts zoomed in and tilted, then settles. The headline words sharpen one by one, the header fades in, and the button grows from a dark pill.
2. **Cursor:** every hero layer (sky, sun, rocks, canyon, astronaut) shifts by its depth, and the whole scene tilts in perspective.
3. **Begin your Mission:** hovering zooms the scene in slightly. Clicking (or the first scroll) moves the camera up: the canyon drops away, the sun rises to the left, and the mission panel appears on the right.
4. **Scroll:** the hero shrinks into a rounded card while the services slide over it. Headlines reveal word by word, and paragraphs fade up.
5. **Venture card:** a see-through wireframe atom with three orbits follows the cursor.
6. **Success stories:** each card's background, main image and logo move at different speeds.
7. **Contact:** the main stack shrinks into a rounded card, revealing the contact section beneath.

## Contact form
GitHub Pages can't receive form submissions. Create a form at formspree.io and paste its URL into `FORM_ENDPOINT` at the top of `assets/js/site.js`.

## Assets to replace (exported at 2x, transparent PNG)
- `astronaut` (currently 85 px wide, so it's blurry on retina screens)
- `rocks-left`, `rocks-right`: separate rocks would let each one float on its own
- Success story 1: separate background, scientist and SMART USA logo layers (currently one flat image)
- Success story 4: its own image and logo (currently a placeholder)
- `hero-sky`, `canyon`, `contact-floor`: higher resolution if available

## Licences
Nohemi (Pangram Pangram): check the commercial licence. Geist (Vercel): SIL Open Font License. three.js: MIT (`assets/vendor/THREE-LICENSE`).
