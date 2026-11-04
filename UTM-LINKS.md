# UTM links: see where leads come from

Add tags to any link that points to the site. Every form a visitor sends then shows **UTM Source / Medium / Campaign / Content / Term**, **Landing Page** and **First Referrer** in the lead email and in CAS.

The source is remembered for 90 days, so it's still attached if they come back later and fill a form. A newer tagged link replaces it.

Untagged visits are labelled automatically:
- google / bing etc. → `organic`
- other sites → `referral`
- typed-in → `(direct)`
- Google/Meta ad clicks → `cpc` / `paid_social`

Calendly links also carry the tags.

## Format
`https://is3604.github.io/EDS-Web/?utm_source=SOURCE&utm_medium=MEDIUM&utm_campaign=CAMPAIGN`

Optional extras:
- `&utm_content=` to tell apart posts or ads in the same campaign
- `&utm_term=` for the keyword

Use lowercase, with no spaces (use `_`).

## Ready-made links
| Where | Link |
|---|---|
| Instagram bio | `.../EDS-Web/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| Instagram reel/post | `.../EDS-Web/?utm_source=instagram&utm_medium=social&utm_campaign=nov_launch&utm_content=reel1` |
| LinkedIn post | `.../EDS-Web/?utm_source=linkedin&utm_medium=social&utm_campaign=nov_launch` |
| YouTube description | `.../EDS-Web/?utm_source=youtube&utm_medium=video&utm_campaign=channel` |
| Cold email | `.../EDS-Web/?utm_source=email&utm_medium=outreach&utm_campaign=derm_list_1` |
| WhatsApp | `.../EDS-Web/?utm_source=whatsapp&utm_medium=message&utm_campaign=referral` |
| Google Ads | `.../EDS-Web/?utm_source=google&utm_medium=cpc&utm_campaign=derm_search` |
| Meta Ads | `.../EDS-Web/?utm_source=facebook&utm_medium=paid_social&utm_campaign=free_video` |

You can link to any page, for example `.../EDS-Web/work.html?utm_source=...`.

---

## CAS dashboard: paste this prompt into the CAS project
> EditSimple leads now include traffic-source keys inside `eds_leads.fields`: "UTM Source", "UTM Medium", "UTM Campaign", "UTM Term", "UTM Content", "Ad Click ID", "Landing Page", "First Referrer". Don't change the database.
> 1. Lead detail panel: add a **Traffic source** group after "Where it came from", in that order, with labels Source, Medium, Campaign, Keyword, Ad content, Ad click ID, Landing page, First referrer. Show URLs as links.
> 2. Leads list: show a small source chip (`UTM Source / UTM Medium`, or "—") and add a Source filter. Include these columns in the CSV export.
> 3. Overview: add a "Leads by source (30 days)" card, grouped by UTM Source (with Medium and Campaign on hover). Clicking a source opens Leads filtered to it.
> Escape all values, because they come from public URLs.
