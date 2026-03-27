# SkratchAds — SEO & Google Indexing Checklist
**Get www.skratchads.com found on Google**

---

## STEP 1: GET INDEXED BY GOOGLE (Do This Today)

### 1.1 Submit to Google Search Console
- Go to: https://search.google.com/search-console
- Click "Add Property"
- Enter: www.skratchads.com
- Verify ownership (add a DNS TXT record or HTML tag to your site)
- Once verified, click "URL Inspection" → enter your homepage URL → click "Request Indexing"

### 1.2 Create and Submit a Sitemap
A sitemap tells Google every page on your site.

Create a file called `sitemap.xml` at www.skratchads.com/sitemap.xml with this format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.skratchads.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.skratchads.com/publishers</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.skratchads.com/advertisers</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.skratchads.com/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

Then in Google Search Console → Sitemaps → paste: `https://www.skratchads.com/sitemap.xml` → Submit

### 1.3 Create a robots.txt File
Create `robots.txt` at www.skratchads.com/robots.txt:

```
User-agent: *
Allow: /
Sitemap: https://www.skratchads.com/sitemap.xml
```

---

## STEP 2: ON-PAGE SEO (Fix These on Your Website)

### 2.1 Homepage Meta Tags
Add these to the `<head>` section of your homepage HTML:

```html
<title>SkratchAds — The Scratch-Off Ad Revolution for Mobile Apps</title>
<meta name="description" content="SkratchAds replaces broken banner ads with a voluntary scratch-off mechanic. Publishers earn $8–20 eCPM. Users win real prizes. Advertisers get qualified leads.">
<meta name="keywords" content="scratch off banner ad sdk, cost per scratch mobile advertising, scratch mechanic mobile ad format, voluntary scratch ad mobile sdk, dual conversion path mobile ad, gamified banner replacement admob, polite banner ad sdk for apps, scratch to win mobile ad campaign, primed click mobile advertising, banner blindness solution mobile 2026">

<!-- Open Graph (for social sharing) -->
<meta property="og:title" content="SkratchAds — The Scratch-Off Ad Revolution for Mobile Apps">
<meta property="og:description" content="Turn banner blindness into engagement. Real prizes. Real leads. 70% revenue share for publishers.">
<meta property="og:url" content="https://www.skratchads.com">
<meta property="og:type" content="website">
```

### 2.2 Page Titles for Each Page

| Page | Title Tag |
|------|-----------|
| Homepage | SkratchAds — Scratch-Off Mobile Advertising |
| Publishers | Increase App eCPM with SkratchAds — Publisher Program |
| Advertisers | Get Qualified Mobile Leads — SkratchAds for Advertisers |
| Blog | SkratchAds Blog — Mobile Advertising Insights |
| About | About SkratchAds — The Team Behind the Scratch-Off Ad Revolution |

### 2.3 H1 Tags
Make sure every page has exactly one H1 tag that includes your main keyword.

Homepage H1 example:
```html
<h1>The Scratch-Off Revolution for Mobile Advertising</h1>
```

### 2.4 Mobile-Friendly
- Your site must load fast on mobile (Google ranks mobile-first)
- Test at: https://pagespeed.web.dev/
- Target: 90+ score on mobile

### 2.5 HTTPS
- Make sure your site is on HTTPS (not HTTP)
- Most hosting providers offer free SSL via Let's Encrypt

---

## STEP 3: KEYWORD STRATEGY

### Ultra-Niche High Priority Keywords (Own These — Zero Competition)
These are so specific that anyone searching them is your exact customer. No competitor ranks for any of these.

**For Publishers (App Developers):**

| Keyword | Search Intent | Target Page |
|---------|--------------|-------------|
| scratch off banner ad sdk | Commercial | Publishers page |
| voluntary scratch ad mobile sdk | Commercial | Publishers page |
| gamified banner replacement admob | Commercial | Publishers page / Blog |
| mobile banner ad 10x ctr uplift | Commercial | Homepage / Blog |
| dual conversion path mobile ad | Informational | Homepage / Blog |
| non intrusive rewarded banner ios android | Commercial | Publishers page |
| cost per scratch mobile advertising | Informational | Homepage / Blog |
| scratch mechanic mobile ad format | Informational | Homepage |
| real prize mobile ad engagement | Informational | Blog |
| polite banner ad sdk for apps | Commercial | Publishers page |

**For Advertisers:**

| Keyword | Search Intent | Target Page |
|---------|--------------|-------------|
| cost per scratch advertising platform | Commercial | Advertisers page |
| mobile ad email capture on win | Commercial | Advertisers page |
| qualified mobile lead via scratch ad | Commercial | Advertisers page |
| scratch to win mobile ad campaign | Commercial | Advertisers page |
| primed click mobile advertising | Informational | Advertisers page / Blog |

**For Press & SEO Authority:**

| Keyword | Search Intent | Target Page |
|---------|--------------|-------------|
| banner blindness solution mobile 2026 | Informational | Blog |
| post ATT mobile ad engagement format | Informational | Blog |
| in-app scratch ad win path lose path | Informational | Blog / Homepage |
| skratchads scratch off revolution mobile advertising | Branded | Homepage |

### Medium Priority Keywords (Broader Reach)
These have more competition but drive awareness:

| Keyword | Search Intent | Target Page |
|---------|--------------|-------------|
| rewarded ad alternative | Informational | Blog |
| gamified mobile advertising | Informational | Homepage / Blog |
| mobile app monetization beyond banners | Informational | Blog |
| higher eCPM mobile ads | Commercial | Publishers page |
| engaged mobile advertising | Informational | Homepage |

### Long-Tail Keywords (Easiest to Rank, Most Qualified Traffic)
- "how to increase app eCPM without interstitials"
- "replace AdMob banners with something better"
- "voluntary mobile ad format"
- "gamified mobile advertising SDK"
- "mobile ad engagement rate improvement"

---

## STEP 4: CONTENT / BLOG STRATEGY

### Why Blog?
Google ranks sites that regularly publish useful content. One post per week = ~50 indexed pages per year = more chances to show up in search.

### Blog Post Calendar (First 8 Weeks)

| Week | Title | Target Keyword |
|------|-------|---------------|
| 1 | Why Banner Ads Are Dead in 2026 (And What to Do Instead) | banner ad alternative |
| 2 | What Is Cost-Per-Scratch? A New Mobile Ad Model Explained | Cost Per Scratch advertising |
| 3 | How to Increase App eCPM Without Using Interstitials | increase app eCPM |
| 4 | The Psychology of Scratch-Off: Why Users Engage Voluntarily | scratch off mobile ads |
| 5 | Publisher Guide: How SkratchAds Works and What You Earn | mobile publisher monetization |
| 6 | Banner Blindness: Why 37% of Mobile Users Ignore Your Ads | banner blindness mobile |
| 7 | Rewarded Video vs. Scratch Ads: Which Is Better for Publishers? | rewarded banner ads |
| 8 | Case Study: [App Name] Increased eCPM by 10x with SkratchAds | SkratchAds case study |

### Blog Post Structure (for SEO)
Every post should have:
- H1: Main keyword in title
- H2s: Sub-sections with related keywords
- 800–1,200 words minimum
- 1 internal link (to publishers page or homepage)
- 1 call to action at the end ("Want to try SkratchAds free? Apply here →")

---

## STEP 5: GOOGLE BUSINESS & BACKLINKS

### 5.1 Google Business Profile
- Go to: https://business.google.com
- Create a free listing for SkratchAds
- Category: "Advertising Agency" or "Software Company"
- Add website, description, and contact info

### 5.2 Get Listed in Free Directories (Backlinks)
These help Google trust your site:

- [ ] Product Hunt — launch your product
- [ ] Crunchbase — add your startup profile
- [ ] AngelList / Wellfound — startup profile
- [ ] G2.com — add SkratchAds as a software product
- [ ] Capterra — list as ad tech software
- [ ] BetaList — submit for early access listings

### 5.3 Get Press / Backlinks
- Submit to: TechCrunch, VentureBeat, AdExchanger, MobileMarketer
- Write a "launch story" press release and post it on PR Newswire (paid) or PRLog (free)
- Reach out to mobile marketing bloggers for a feature

---

## STEP 6: ANALYTICS SETUP

### Google Analytics 4
- Go to: https://analytics.google.com
- Create a property for www.skratchads.com
- Add the GA4 tracking code to your site
- Set up these Goals/Events:
  - "Get Early Access" form submission
  - Demo video play
  - Publisher page visit
  - Blog post read (30+ seconds)

### Key Metrics to Watch Weekly
- Organic search traffic (Google Search Console)
- Top landing pages
- Average position for target keywords
- Click-through rate from Google search results

---

## QUICK WIN CHECKLIST

Do these in the next 7 days:

- [ ] Submit to Google Search Console
- [ ] Request indexing for homepage
- [ ] Create and submit sitemap.xml
- [ ] Add meta title and description to homepage
- [ ] Create robots.txt
- [ ] Set up Google Analytics 4
- [ ] Create Product Hunt and Crunchbase profiles
- [ ] Write and publish your first blog post

---

*SEO is a long game — expect results in 3–6 months. Start now.*

*Document generated: March 2026*
