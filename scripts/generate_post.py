"""Writes one new blog post with the OpenAI API, saves it to blog/posts/<slug>.json, then rebuilds the site.

Run by .github/workflows/weekly-blog.yml every week. To run by hand:
    set OPENAI_API_KEY=sk-...        (Windows)   /   export OPENAI_API_KEY=sk-...   (Mac/Linux)
    python scripts/generate_post.py
Optional env: OPENAI_MODEL (default gpt-4o-mini), BLOG_TOPIC (force a topic for this run).
No extra packages needed.
"""
import json, os, re, sys, pathlib, datetime as dt, urllib.request, urllib.error, subprocess
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
POSTS = ROOT / "blog/posts"
POSTS.mkdir(parents=True, exist_ok=True)

API_KEY = os.environ.get("OPENAI_API_KEY")
MODEL = os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"
if not API_KEY:
    sys.exit("OPENAI_API_KEY is not set")

existing = sorted((json.loads(f.read_text(encoding="utf-8")) for f in POSTS.glob("*.json")), key=lambda p: p["date"])
past_titles = [p["title"] for p in existing]

SYSTEM = """You write SEO blog articles for EditSimple, an agency that runs YouTube channels end to end
(strategy, scripts, editing, thumbnails, publishing) for US dermatology, plastic surgery, med spa and aesthetic practices.
The doctor records once a month; EditSimple does the rest. HIPAA-conscious, BAA available.

Audience: practice owners, doctors and practice managers in the US.
Rules:
- Topic must help a practice grow with YouTube / video / content marketing (e.g. video ideas, YouTube SEO, Shorts,
  thumbnails, filming tips, patient trust, reviews, HIPAA-safe content, measuring ROI, repurposing videos).
- Do NOT give medical advice, treatment claims, dosages or outcome promises. Do NOT invent statistics, studies,
  quotes, client names or case studies. If you mention a number, keep it general ("many", "most").
- Original, practical and specific. 1000-1400 words. Plain, friendly US English. Short paragraphs.
- Target one clear search keyword phrase; use it naturally in the title, first paragraph and one H2.
- Mention EditSimple at most once, near the end, softly.
Return ONLY JSON with keys:
  "title" (max 65 chars), "slug" (lowercase-hyphenated, max 60 chars), "description" (meta description, 140-160 chars),
  "keywords" (array of 4-6 phrases), "body_html" (HTML using only <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>;
  no <h1>, no title repeat, no inline styles, no links)."""

user = f"Today is {dt.date.today():%B %d, %Y}. Write this week's article."
if os.environ.get("BLOG_TOPIC"):
    user += f"\nTopic: {os.environ['BLOG_TOPIC']}"
if past_titles:
    user += "\nAlready published (pick a clearly different topic and keyword):\n- " + "\n- ".join(past_titles[-40:])

req = urllib.request.Request(
    "https://api.openai.com/v1/chat/completions",
    data=json.dumps({
        "model": MODEL,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
    }).encode(),
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
)
try:
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
except urllib.error.HTTPError as e:
    sys.exit(f"OpenAI error {e.code}: {e.read().decode()[:500]}")

post = json.loads(data["choices"][0]["message"]["content"])
for k in ("title", "slug", "description", "body_html"):
    if not post.get(k):
        sys.exit(f"Model response missing '{k}'")


class Clean(HTMLParser):
    """Keeps only safe formatting tags and drops all attributes, so generated HTML can't break or attack the page."""
    OK = {"h2", "h3", "p", "ul", "ol", "li", "strong", "em", "b", "i", "blockquote", "br"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        elif tag in self.OK and not self.skip:
            self.out.append(f"<{tag}>")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
        elif tag in self.OK and tag != "br" and not self.skip:
            self.out.append(f"</{tag}>")

    def handle_data(self, d):
        if not self.skip:
            self.out.append(d.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


c = Clean()
c.feed(post["body_html"])
body = "".join(c.out).strip()

slug = re.sub(r"[^a-z0-9]+", "-", post["slug"].lower()).strip("-")[:60].strip("-") or "post"
base, n = slug, 2
while (POSTS / f"{slug}.json").exists():
    slug, n = f"{base}-{n}", n + 1

out = {
    "title": post["title"].strip(),
    "slug": slug,
    "date": dt.date.today().isoformat(),
    "description": post["description"].strip(),
    "keywords": [k.strip() for k in post.get("keywords", []) if isinstance(k, str)][:6],
    "body_html": body,
    "model": MODEL,
}
(POSTS / f"{slug}.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
print("saved", f"blog/posts/{slug}.json", "-", out["title"])

subprocess.run([sys.executable, str(ROOT / "build.py")], check=True, cwd=ROOT)
