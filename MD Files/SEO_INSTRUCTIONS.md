# SkratchAds SEO — Complete Setup Instructions
**How to get www.skratchads.com found, indexed, and ranking on Google**
Last Updated: March 2026

---

## WHAT'S IN THIS FOLDER

| File | What It Is |
|------|-----------|
| `index.html` | Homepage — main landing page |
| `publishers.html` | Publishers page — for app developers |
| `advertisers.html` | Advertisers page — for brands |
| `about.html` | About page — team, mission, story |
| `blog/index.html` | Blog index page — all articles listed |
| `sitemap.xml` | Google sitemap — maps all pages |
| `robots.txt` | Tells Google how to crawl the site |
| `SEO_INSTRUCTIONS.md` | This document |

---

## STEP 1: UPLOAD FILES TO YOUR WEBSITE
**Do this first — nothing else works until files are live.**

### If your site is on Squarespace, Webflow, or Wix:
These platforms manage their own HTML. You cannot upload raw HTML files directly.
Instead, use these files as **reference documents** — copy the text content, meta tags, and keyword structure into your platform's SEO settings fields.

For each page in your platform:
1. Go to page settings
2. Set the **SEO Title** to match the `<title>` tag in the HTML file
3. Set the **Meta Description** to match the `<meta name="description">` tag
4. Set the **page URL slug** to match (e.g. `/publishers`, `/advertisers`, `/about`)

### If your site is on a custom host (AWS, GoDaddy, Hostinger, etc.):
Upload files directly via FTP or your hosting file manager:

1. Open your hosting control panel (cPanel, Plesk, or similar)
2. Go to **File Manager**
3. Navigate to your `public_html` folder (this is your website root)
4. Upload these files:
   - `index.html` → goes in root (`public_html/index.html`)
   - `publishers.html` → goes in root
   - `advertisers.html` → goes in root
   - `about.html` → goes in root
   - `sitemap.xml` → goes in root
   - `robots.txt` → goes in root
   - `blog/index.html` → create a `/blog/` folder, upload inside it

5. Verify by visiting each URL in your browser:
   - https://www.skratchads.com/
   - https://www.skratchads.com/publishers
   - https://www.skratchads.com/advertisers
   - https://www.skratchads.com/about
   - https://www.skratchads.com/blog/
   - https://www.skratchads.com/sitemap.xml
   - https://www.skratchads.com/robots.txt

---

## STEP 2: VERIFY YOUR SITE IS ON HTTPS
**Google penalizes non-HTTPS sites. Do this before submitting to Google.**

1. Visit https://www.skratchads.com in your browser
2. Look for the padlock icon in the address bar
3. If you see a padlock → you're good
4. If you see "Not Secure" → contact your hosting provider and ask them to enable SSL/HTTPS (most offer it free via Let's Encrypt)

---

## STEP 3: SET UP GOOGLE SEARCH CONSOLE
**This is how you tell Google your site exists and ask it to index you.**

1. Go to: https://search.google.com/search-console
2. Sign in with your Google account
3. Click **"Add Property"**
4. Choose **"URL prefix"** and enter: `https://www.skratchads.com`
5. Click **Continue**

### Verify Ownership (choose one method):
**Option A — HTML Tag (easiest):**
- Google will give you a `<meta>` tag like this:
  ```html
  <meta name="google-site-verification" content="XXXXXXXXXXXXXXX">
  ```
- Open `index.html` from this folder
- Paste that tag inside the `<head>` section (right after `<meta charset="UTF-8">`)
- Re-upload `index.html` to your site
- Click **Verify** in Google Search Console

**Option B — DNS Record:**
- Google gives you a TXT record value
- Log in to your domain registrar (GoDaddy, Namecheap, etc.)
- Go to DNS settings → Add a new TXT record with the value Google gave you
- Click **Verify** (may take up to 24 hours to propagate)

---

## STEP 4: SUBMIT YOUR SITEMAP TO GOOGLE
**The sitemap tells Google every page on your site. Do this immediately after verification.**

1. In Google Search Console, click **"Sitemaps"** in the left sidebar
2. In the "Add a new sitemap" field, type: `sitemap.xml`
3. Click **Submit**
4. Status should show "Success" within a few minutes

Your sitemap covers these 14 pages:
- Homepage
- Publishers
- Advertisers
- About
- Blog index
- 8 blog post pages (placeholders — write these posts to activate them)

---

## STEP 5: REQUEST INDEXING FOR KEY PAGES
**Don't wait for Google to find you — ask it to index you now.**

In Google Search Console:
1. Click **"URL Inspection"** in the left sidebar
2. Enter each URL one at a time and click **"Request Indexing"**:
   - `https://www.skratchads.com/`
   - `https://www.skratchads.com/publishers`
   - `https://www.skratchads.com/advertisers`
   - `https://www.skratchads.com/about`
   - `https://www.skratchads.com/blog/`

Note: Google may take 24–72 hours to index each page after your request.

---

## STEP 6: SET UP GOOGLE ANALYTICS 4
**So you can see who is visiting, where they came from, and what they did.**

1. Go to: https://analytics.google.com
2. Click **"Start measuring"**
3. Create an account name: `SkratchAds`
4. Create a property: `SkratchAds Website`
5. Select **Web** as the platform
6. Enter your website URL: `https://www.skratchads.com`
7. Google gives you a tracking code snippet like:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```
8. Open each HTML file in this folder
9. Paste the tracking code just before the closing `</head>` tag
10. Re-upload all HTML files to your site

---

## STEP 7: CREATE A GOOGLE BUSINESS PROFILE
**Helps SkratchAds appear in Google's knowledge panel and Maps.**

1. Go to: https://business.google.com
2. Click **"Manage now"**
3. Search for "SkratchAds" — if it doesn't exist, click **"Add your business"**
4. Fill in:
   - Business name: `SkratchAds`
   - Category: `Software Company` or `Advertising Agency`
   - Website: `https://www.skratchads.com`
   - Email: `hello@skratchads.com`
5. Complete verification (usually by email or phone)

---

## STEP 8: SUBMIT TO FREE DIRECTORIES
**Each listing creates a backlink that helps Google trust your site.**
Do these in order — they take 5–10 minutes each.

| Directory | URL | What to Do |
|-----------|-----|-----------|
| Product Hunt | producthunt.com | Launch SkratchAds as a product |
| Crunchbase | crunchbase.com | Create startup profile |
| AngelList / Wellfound | wellfound.com | Create company profile |
| G2 | g2.com | Add SkratchAds as a software product |
| Capterra | capterra.com | List under "Ad Tech Software" |
| BetaList | betalist.com | Submit for early access feature |

For each listing, use this description:

> **SkratchAds** is the first voluntary scratch-off mobile ad format with a dual conversion path. Publishers earn $8–20 eCPM. Users win real prizes. Advertisers get qualified email leads on the win path and primed brand impressions on the lose path. Currently running free 30-day POCs for mobile app publishers.

---

## STEP 9: WRITE AND PUBLISH BLOG POSTS
**Content is how Google finds you over time. One post per week.**

Your blog index at `blog/index.html` already lists 8 posts as placeholders. Write and publish these in order:

| Priority | Title | File to Create | Target Keyword |
|----------|-------|---------------|---------------|
| 1 | Why Banner Ads Are Dead in 2026 | `blog/why-banner-ads-are-dead-2026.html` | banner ad alternative |
| 2 | What Is Cost-Per-Scratch? | `blog/what-is-cost-per-scratch.html` | cost per scratch mobile advertising |
| 3 | How to Increase App eCPM Without Interstitials | `blog/increase-app-ecpm-without-interstitials.html` | increase app eCPM |
| 4 | The Psychology of Scratch-Off | `blog/scratch-off-psychology-mobile-ads.html` | scratch off mobile ads |
| 5 | Mobile Advertising in the Post-ATT Era | `blog/post-att-mobile-advertising.html` | post ATT mobile ad engagement |
| 6 | Rewarded Video vs. Scratch Ads | `blog/rewarded-video-vs-scratch-ads.html` | rewarded banner ads |
| 7 | What Is a Dual Conversion Path Ad? | `blog/dual-conversion-path-mobile-advertising.html` | dual conversion path mobile ad |
| 8 | Banner Blindness in 2026 | `blog/banner-blindness-2026.html` | banner blindness solution mobile 2026 |

**Each blog post must include:**
- `<title>` tag with the exact keyword in it
- `<meta name="description">` of 150–160 characters
- One `<h1>` tag with the keyword
- At least 3 `<h2>` sub-sections
- Minimum 800 words of content
- One link back to the Publishers or Advertisers page
- One call to action at the end (link to the free POC application)

---

## STEP 10: WEEKLY SEO MAINTENANCE
**15 minutes every week keeps the momentum going.**

Every Monday:
- [ ] Check Google Search Console for new indexed pages
- [ ] Check for any crawl errors (red flags in the Coverage report)
- [ ] Note your current ranking position for top keywords
- [ ] Share one blog post or stat on LinkedIn and X/Twitter

Every Month:
- [ ] Publish at least 2 new blog posts
- [ ] Check which pages have the most organic traffic in GA4
- [ ] Update any outdated stats in your pages
- [ ] Request indexing for any new pages added

---

## YOUR TARGET KEYWORDS AT A GLANCE

These are the ultra-niche keywords SkratchAds should own completely. No competitor ranks for any of these.

**Homepage targets:**
- scratch mechanic mobile ad format
- dual conversion path mobile ad
- voluntary scratch ad mobile sdk
- cost per scratch mobile advertising

**Publishers page targets:**
- scratch off banner ad sdk
- polite banner ad sdk for apps
- gamified banner replacement admob
- non intrusive rewarded banner ios android
- mobile banner ad 10x ctr uplift

**Advertisers page targets:**
- cost per scratch advertising platform
- mobile ad email capture on win
- qualified mobile lead via scratch ad
- scratch to win mobile ad campaign
- primed click mobile advertising

**Blog targets:**
- banner blindness solution mobile 2026
- post ATT mobile ad engagement format
- in-app scratch ad win path lose path
- increase app eCPM without interstitials

---

## TROUBLESHOOTING

**"My site isn't showing up on Google after a week"**
- Check Google Search Console → Coverage → look for errors
- Make sure robots.txt is live at https://www.skratchads.com/robots.txt
- Re-request indexing for the homepage

**"Google Search Console says 'URL is not on Google'"**
- This is normal for new sites — it can take 2–4 weeks
- Keep requesting indexing, keep publishing content

**"My sitemap shows an error"**
- Visit https://www.skratchads.com/sitemap.xml in your browser
- If it loads correctly, the error in Search Console is usually temporary
- Wait 24 hours and check again

**"I don't know where to add the Google verification meta tag"**
- Open `index.html` in a text editor (TextEdit on Mac, Notepad on Windows)
- Find the line that says `<meta charset="UTF-8">`
- Paste the verification tag on the line directly below it
- Save and re-upload

---

## CONTACTS & RESOURCES

| Resource | URL |
|----------|-----|
| Google Search Console | https://search.google.com/search-console |
| Google Analytics | https://analytics.google.com |
| Google Business Profile | https://business.google.com |
| PageSpeed Test | https://pagespeed.web.dev |
| Mobile-Friendly Test | https://search.google.com/test/mobile-friendly |
| Rich Results Test | https://search.google.com/test/rich-results |

SkratchAds contact: hello@skratchads.com
Website: www.skratchads.com

---

*SEO Instructions v1.0 — March 2026*
*Reference: SEO_Google_Checklist.md for keyword strategy details*
