"""Builds the EditSimple pages: src/layout.html + src/pages/<name>.html -> <name>.html"""
import re, pathlib

ROOT = pathlib.Path(__file__).parent
LAYOUT = (ROOT / "src/layout.html").read_text()

# name: (title, meta description, label used in form emails)
PAGES = {
    "index": ("EditSimple | YouTube for Dermatology & Aesthetic Practices",
              "We run your practice's YouTube channel end to end: strategy, scripts, editing, thumbnails and publishing. You record once a month. HIPAA-compliant, BAA available.",
              "Homepage"),
    "work": ("EditSimple | Our Work",
             "600+ videos a month, 1B+ views: three years producing content for US professionals, now for dermatology and aesthetic practices.",
             "Our Work"),
    "about": ("EditSimple | About", "EditSimple runs YouTube channels for experts who'd rather be doing their real job.", "About"),
    "careers": ("EditSimple | Careers", "Join the EditSimple team.", "Careers"),
    "contact": ("EditSimple | Contact Us", "Email us or book a free 30-minute strategy call with EditSimple.", "Contact"),
    "privacy": ("EditSimple | Privacy Policy", "How EditSimple handles information, and our commitment to never disclose patient information. HIPAA-conscious, BAA available.", "Privacy Policy"),
    "terms": ("EditSimple | Terms & Conditions", "The terms that apply when your practice works with EditSimple on YouTube and social video.", "Terms & Conditions"),
}

def background(tag):
    """Rough background key of a <section> opening tag, used to merge gaps between same-coloured sections."""
    if re.search(r'class="[^"]*(hero|ct-hero|lg-hero)', tag): return "hero"
    if 'class="meet' in tag: return "dark"
    if "var(--cream)" in tag or re.search(r'class="[^"]*\b(paths|faq)\b', tag): return "cream"
    return "white"

def flush_same_backgrounds(main):
    out, pos, prev = [], 0, None
    for m in re.finditer(r"^<section\b[^>]*>", main, re.M):
        tag, bg = m.group(0), background(m.group(0))
        if bg == prev and bg != "hero":
            tag = tag.replace('class="', 'class="flush-top ', 1) if 'class="' in tag else tag.replace("<section", '<section class="flush-top"', 1)
        out.append(main[pos:m.start()] + tag)
        pos, prev = m.end(), bg
    return "".join(out) + main[pos:]

import json, html as H, datetime as dt, os

# Public address of the site, used for canonical links and sitemap.xml.
SITE_URL = (os.environ.get("SITE_URL") or "https://editsimple.in").rstrip("/")

def render(main, title, desc, label, base="", head_extra=""):
    return (LAYOUT.replace("{{base}}", base)
                  .replace("{{head_extra}}", head_extra)
                  .replace("{{title}}", title.replace("&", "&amp;"))
                  .replace("{{description}}", H.escape(desc, quote=True) if base else desc)
                  .replace("{{label}}", label.replace("&", "&amp;"))
                  .replace("{{main}}", main))

for name, (title, desc, label) in PAGES.items():
    main = flush_same_backgrounds((ROOT / f"src/pages/{name}.html").read_text().strip())
    (ROOT / f"{name}.html").write_text(render(main, title, desc, label))
    print("built", name)

# ---------------- BLOG ----------------
# Each post is blog/posts/<slug>.json: {title, slug, date (YYYY-MM-DD), description, keywords, body_html}
# Posts get a "NEW" badge for 7 days after their date (shown by assets/site.js).
POSTS_DIR = ROOT / "blog/posts"
posts = sorted((json.loads(f.read_text()) for f in POSTS_DIR.glob("*.json")) if POSTS_DIR.exists() else [],
               key=lambda p: p["date"], reverse=True)

def nice_date(d):
    d = dt.date.fromisoformat(d)
    return f"{d:%B} {d.day}, {d.year}"

def read_mins(body):
    return max(1, round(len(re.sub(r"<[^>]+>", " ", body).split()) / 220))

def badge(p):
    return f'<span class="blog-new" data-new-date="{p["date"]}" hidden>New</span>'

cards = "\n".join(f'''      <a class="blog-card" href="blog/{p["slug"]}.html">
        <div class="blog-meta">{badge(p)}<time datetime="{p["date"]}">{nice_date(p["date"])}</time><span>&middot; {read_mins(p["body_html"])} min read</span></div>
        <h2>{H.escape(p["title"])}</h2>
        <p>{H.escape(p["description"])}</p>
        <span class="blog-more">Read article &rarr;</span>
      </a>''' for p in posts) or '      <p class="blog-empty">Our first article is on its way. Check back soon.</p>'

blog_main = f'''<main>
<section class="hero sol-hero">
  <div class="wrap center">
    <h2 class="eyebrow">Blog</h2>
    <h1 class="blog-h1">YouTube growth for <span class="accent">medical practices</span></h1>
    <p class="lead">Practical guides on video, YouTube and patient-first content for dermatology and aesthetic practices. New article every week.</p>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="blog-grid">
{cards}
    </div>
  </div>
</section>
</main>'''
(ROOT / "blog.html").write_text(render(blog_main, "EditSimple | Blog",
    "Weekly guides on YouTube and video marketing for dermatology and aesthetic practices.", "Blog",
    head_extra=f'<link rel="canonical" href="{SITE_URL}/blog.html"/>'))
print("built blog", f"({len(posts)} posts)")

(ROOT / "blog").mkdir(exist_ok=True)
for i, p in enumerate(posts):
    url = f"{SITE_URL}/blog/{p['slug']}.html"
    ld = json.dumps({"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"],
                     "description": p["description"], "datePublished": p["date"], "dateModified": p["date"],
                     "mainEntityOfPage": url, "author": {"@type": "Organization", "name": "EditSimple"},
                     "publisher": {"@type": "Organization", "name": "EditSimple",
                                   "logo": {"@type": "ImageObject", "url": f"{SITE_URL}/images/home/logo.png"}}})
    t = H.escape(p["title"], quote=True); d = H.escape(p["description"], quote=True)
    head = (f'<link rel="canonical" href="{url}"/>\n<meta name="keywords" content="{H.escape(", ".join(p.get("keywords", [])), quote=True)}"/>\n'
            f'<meta property="og:type" content="article"/>\n<meta property="og:title" content="{t}"/>\n'
            f'<meta property="og:description" content="{d}"/>\n<meta property="og:url" content="{url}"/>\n'
            f'<meta property="og:image" content="{SITE_URL}/images/home/logo.png"/>\n'
            f'<script type="application/ld+json">{ld}</script>')
    others = [o for o in posts if o is not p][:3]
    more = "".join(f'<li><a href="blog/{o["slug"]}.html">{H.escape(o["title"])}</a></li>' for o in others)
    main = f'''<main>
<article class="post">
  <div class="wrap post-wrap">
    <a class="post-back" href="blog.html">&larr; All articles</a>
    <div class="blog-meta">{badge(p)}<time datetime="{p["date"]}">{nice_date(p["date"])}</time><span>&middot; {read_mins(p["body_html"])} min read</span></div>
    <h1 class="post-title">{H.escape(p["title"])}</h1>
    <p class="post-lead">{H.escape(p["description"])}</p>
    <div class="post-body">
{p["body_html"]}
    </div>
    <div class="post-cta">
      <p><b>Want a YouTube channel that brings patients to your practice?</b> We plan, script, edit and publish. You record once a month.</p>
      <a class="btn" href="https://calendly.com/contacteditsimple/30min" target="_blank" rel="noopener">Book a Free Call</a>
    </div>
    {f'<div class="post-more"><h2>More articles</h2><ul>{more}</ul></div>' if more else ""}
  </div>
</article>
</main>'''
    (ROOT / f"blog/{p['slug']}.html").write_text(render(main, f"{p['title']} | EditSimple Blog", p["description"],
        "Blog: " + p["title"], base='<base href="../"/>', head_extra=head))
print("built", len(posts), "blog posts")

# ---------------- SITEMAP ----------------
today = dt.date.today().isoformat()
urls = [(f"{SITE_URL}/" if n == "index" else f"{SITE_URL}/{n}.html", today) for n in PAGES]
urls.append((f"{SITE_URL}/blog.html", posts[0]["date"] if posts else today))
urls += [(f"{SITE_URL}/blog/{p['slug']}.html", p["date"]) for p in posts]
(ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "".join(f"  <url><loc>{u}</loc><lastmod>{m}</lastmod></url>\n" for u, m in urls) + "</urlset>\n")
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
print("built sitemap.xml")
