# EditSimple website

Static site (works on GitHub Pages). Every page shares one stylesheet and one script.

## Folder layout
- `*.html` – the published pages (generated, don't edit by hand)
- `src/layout.html` – header, footer and the lead popup shared by every page
- `src/pages/<name>.html` – the main content of each page
- `assets/site.css` – all styles
- `assets/site.js` – all interactions (menu, sliders, FAQ, popup, contact form)
- `assets/config.js` – address of the email function (see `supabase/RESEND-SETUP.txt`)
- `images/` – images, `videos/` – put hero.mp4 / testimonial-1.mp4 / testimonial-2.mp4 here
- `supabase/functions/send-lead` – serverless function that emails form submissions via Resend

## Editing
1. Change text in `src/pages/<name>.html` (or `src/layout.html` for header/footer/popup).
2. Run `python build.py` to regenerate the `.html` pages.
3. Page titles, descriptions and the page name shown in lead emails are set in `build.py`.

## Blog (auto-written every week)
- `blog.html` – blog list, `blog/<slug>.html` – each article, `blog/posts/<slug>.json` – article content
- New posts show a **NEW** badge for 7 days.
- `scripts/generate_post.py` writes a post with the OpenAI API and runs `build.py`.
- `.github/workflows/weekly-blog.yml` runs it every Monday 10:00 IST, then commits, so GitHub Pages republishes.

One-time setup on GitHub:
1. Repo → Settings → Secrets and variables → Actions → **New repository secret**: `OPENAI_API_KEY` = your key.
2. (Optional) Variables tab: `OPENAI_MODEL` (default `gpt-4o-mini`), `SITE_URL` (default `https://editsimple.in`).
3. Actions tab → "Weekly blog post" → **Run workflow** to publish the first post now (you can type a topic).

Edit or delete a post: change/delete its `blog/posts/<slug>.json`, then run `python build.py`.
`build.py` also writes `sitemap.xml` and `robots.txt` — submit the sitemap in Google Search Console.
