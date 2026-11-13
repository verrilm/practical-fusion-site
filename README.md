# Practical Fusion — "Mission 001" landing page

A static, dependency-free, immersive landing page: one `index.html` plus the Nohemi fonts. See `STORYBOARD.md` for the narrative.

```
index.html              page, styles, scripts, and all illustrations (inline SVG)
assets/fonts/           Nohemi Regular + Medium (woff2)
STORYBOARD.md           the scene-by-scene story
```

## Preview locally
```bash
python3 -m http.server 8000     # then open http://localhost:8000
```
(Opening the file directly with file:// blocks the fonts. Use a local server.)

## Deploy free on GitHub Pages
1. Create a new repository on GitHub, e.g. `practical-fusion-site` (public, unless you're on a paid plan).
2. Upload the contents of this folder to the repo root, either by dragging them into the GitHub web UI ("Add file → Upload files") or with:
   ```bash
   git init && git add . && git commit -m "Mission 001 landing page"
   git branch -M main
   git remote add origin https://github.com/<you>/practical-fusion-site.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then choose **Branch: `main` / `(root)`** and **Save**.
4. After about a minute the site is live at `https://<you>.github.io/practical-fusion-site/`.

### Use the real domain (practical-fusion.com)
1. Go to **Settings → Pages → Custom domain**, enter `www.practical-fusion.com` and save. GitHub adds a `CNAME` file.
2. At the domain's DNS provider, add these records:
   - `CNAME` record: `www` → `<you>.github.io`
   - `A` records for the apex `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. Once the DNS check passes, tick **Enforce HTTPS**.

> ⚠️ Pointing the domain at GitHub replaces the current live site. Test on the `github.io` URL first.

## Make the contact form work
GitHub Pages can't process forms, so use a form service:
1. Create a free form at https://formspree.io (or Basin or Getform) and copy its endpoint URL.
2. In `index.html`, set `const FORM_ENDPOINT = "https://formspree.io/f/xxxxxxx";`

## Font licence
Nohemi is from Pangram Pangram. Their free download is for personal use, so confirm you hold a commercial licence before this goes live on the company site.
