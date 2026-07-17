# Andy Ang — Resume Site

Professional single-page resume for GitHub Pages. Custom design (not based on sproogen/resume-theme).

## Local preview

Open `index.html` in a browser, or from this folder:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project.
2. In the repo: **Settings → Pages**.
3. Set source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. After a minute, the site will be live at:
   - User/org site: `https://<username>.github.io/` (if the repo is named `<username>.github.io`)
   - Project site: `https://<username>.github.io/<repo-name>/`

All asset paths are relative, so both options work.

## Edit content

- Copy and structure: `index.html`
- Visual system: `css/styles.css`
- Scroll reveal: `js/main.js`
- Chat widget: `js/chat.js`, `js/config.js`
- Photo: `images/andy-ang.png`
- Favicon: `images/favicon.svg` (PNG fallback: `images/favicon.png`)

## Chat assistant

The chat widget connects to the CareerTwin backend on Hugging Face Spaces (`js/config.js`). The backend lives in a separate repo at `careertwin/`. When you update resume content in `index.html`, also update `careertwin/input/summary.txt` so the assistant stays in sync.
