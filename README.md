# Practical Fusion Solutions — website

A static site (no build step). Open it through a local server:

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

## Structure
```
index.html                    all sections
marketing.html                Marketing & Communications service page
assets/css/site.css           styles (Nohemi for headings, Geist for body)
assets/css/service.css        service page styles
assets/js/config.js           site settings (contact form endpoint)
assets/js/site.js             home: intro, cursor perspective, mission transition, scroll effects, form
assets/js/service.js          service page: hero zoom + layer parallax, auto-playing list, process rows, form
assets/js/wipe.js             page wipe for links marked data-wipe (all pages)
assets/js/nav.js              header dropdowns, phone menu, button hover, header on scroll
assets/img/mc/                Marketing hero: sky + six landscape layers split from the Illustrator artboard
assets/img/why/               "How we're different" icons (dotted outlines)
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
8. **Success Stories (static images), testimonial.** About is its own page (`about.html`).
9. **Contact:** background, form card and landscape move at different speeds as it comes in; then it holds and the footer slides over it.

## Marketing & Communications page (`marketing.html`)
1. **Getting there:** the Marketing card button and the Services dropdown item (home and About) sweep a bar in from the bottom-right corner. The new page loads covered, and the bar leaves through the top-left corner while the landscape zooms in.
2. **Hero:** six layers from the artboard (`assets/img/mc/l1`–`l5`, `astro`). Each has a `data-depth` (cursor parallax) and `data-speed` (how much it lags on scroll) in `marketing.html`.
3. **Overview list:** opens one item at a time; its dotted top line fills as a loading bar (7s), then it closes and the next opens. Pauses while hovered or off screen; closing an item yourself stops it. The use-case panel on the right is sticky and switches with the list (placeholders: one `<figure class="case">` per item).
4. **Process:** each row starts as just its number and label, opens to the right as it rises up the screen, and stays dim until its turn.
To make another service page, copy `marketing.html`, swap the layer images and copy, and link to it with `data-wipe`.

## Contact form
GitHub Pages can't receive form submissions. Create a form at formspree.io and paste its URL into `FORM_ENDPOINT` in `assets/js/config.js` (used by every page).

## Assets to replace (exported at 2x, transparent PNG)
- `astronaut`, rocks: the current exports are 1x, so 2x versions will look sharper on retina screens
- Success story 1: separate background, scientist and SMART USA logo layers (currently one flat image)
- Success story 4: its own image and logo (currently a placeholder)
- `hero-sky`, `contact-floor`: higher resolution if available

## Licences
Nohemi (Pangram Pangram): check the commercial licence. Geist (Vercel): SIL Open Font License. three.js: MIT (`assets/vendor/THREE-LICENSE`).
