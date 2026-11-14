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
1. **Intro:** a straight zoom out. The headline sharpens word by word; the header and button fade in.
2. **Header:** Home, Services, Work and About, each with a dropdown (title + "all" link on the left, items on the right), plus Contact Us.
3. **Cursor:** every hero layer shifts by its depth; the rocks float. The astronaut sits behind the canyon.
4. **Begin your Mission:** hover zooms in slightly; clicking (or the first scroll) moves up, the sun moves left and two circles grow out of it. Scrolling up returns to the landing.
5. **Scroll:** sections slide over the scene with no rounding, shrinking or dimming.
6. **Services:** each card's button unfolds its own label when the card is hovered.
7. **Venture card:** the top half of a hollow wireframe atom in the right ~40% of the card, following the cursor.
8. **About, Success Stories (static images), testimonial.**
9. **Contact:** background, form card and landscape move at different speeds as it comes in; then it holds and the footer slides over it.

## Contact form
GitHub Pages can't receive form submissions. Create a form at formspree.io and paste its URL into `FORM_ENDPOINT` at the top of `assets/js/site.js`.

## Assets to replace (exported at 2x, transparent PNG)
- `astronaut`, rocks: the current exports are 1x, so 2x versions will look sharper on retina screens
- Success story 1: separate background, scientist and SMART USA logo layers (currently one flat image)
- Success story 4: its own image and logo (currently a placeholder)
- `hero-sky`, `contact-floor`: higher resolution if available

## Licences
Nohemi (Pangram Pangram): check the commercial licence. Geist (Vercel): SIL Open Font License. three.js: MIT (`assets/vendor/THREE-LICENSE`).
