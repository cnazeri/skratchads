# SkratchAds Monthly Outreach Workflow

**Target:** 3,250 contacts per month
**Team size:** 2 (C = strategy/outreach, D = technical/POC support)
**Cycle:** Monthly, repeating

---

## WEEK 1: List Building and Cleaning

### Day 1-2: App Store Scraper Run

1. Open terminal and navigate to the Leads_Outreach folder.
2. Run the scraper: `python app_store_scraper.py`
3. Output lands in `leads_raw.csv` (150-300 app leads).
4. Open `leads_raw.csv` in Excel or Google Sheets.
5. Filter: keep rows where `seller_url` is populated (those have websites to find emails from).
6. Add a column: `email_status` (blank, to fill via Hunter.io or Apollo).

### Day 2-3: Apollo.io Lead Pull

1. Log in to Apollo.io.
2. Apply filters as defined in `apollo_search_filters.md`.
3. Target: 3,000 contacts to supplement the App Store list.
4. Export to CSV: name it `apollo_export_[MONTH_YEAR].csv`.
5. Place in the Leads_Outreach folder.

### Day 3: List Cleaning and Merging

1. Merge `leads_raw.csv` and the Apollo export into one master sheet: `master_leads_[MONTH_YEAR].csv`.
2. Remove duplicates (match on email or company name).
3. Remove any contacts without an email address.
4. Tag each contact with their sequence: `indie_dev`, `gaming`, or `utility_productivity`.
5. Remove obvious non-targets (enterprises, non-app businesses).
6. Final cleaned list should be 3,000-3,250 contacts with valid emails.
7. Split into three segment CSVs for Instantly import:
   - `seq1_indie_devs.csv`
   - `seq2_gaming_studios.csv`
   - `seq3_utility_productivity.csv`

---

## WEEK 2-4: Email Sequence Launch (Instantly.ai)

### Week 2, Day 1: Upload and Configure

1. Log in to Instantly.ai.
2. Create three new campaigns (one per sequence).
3. Upload the matching CSV to each campaign.
4. Copy the email copy from `email_sequences.md` into each campaign step.
5. Configure schedule for each campaign:
   - Send days: Monday through Friday only.
   - Send window: 8 AM to 5 PM in the contact's time zone (Instantly handles this automatically).
   - Email 1: Day 0.
   - Email 2 (Follow-up 1): Day 3.
   - Email 3 (Follow-up 2): Day 7.
6. Set daily send limit: no more than 50 emails per inbox per day (to protect deliverability).
7. Activate campaigns.

### Week 2-4: Monitor and Respond

1. Check Instantly dashboard every Monday and Wednesday.
2. Reply to any interested prospects within 24 hours.
3. Positive reply = book a 15-minute intro call (use Calendly or similar).
4. Negative reply or unsubscribe = mark as removed in master list.
5. Log all replies in a simple tracking sheet: `reply_log_[MONTH_YEAR].csv`.

---

## WEEK 2-4: LinkedIn DM Cadence (PhantomBuster)

### Setup (one-time, first month only)

1. Install PhantomBuster Chrome extension.
2. Connect your LinkedIn account to PhantomBuster.
3. Choose the "LinkedIn Message Sender" phantom.

### Monthly LinkedIn DM Workflow

1. Pull a separate list of 200-300 LinkedIn profiles of indie developers and app publishers (found via Apollo or manual LinkedIn search using filters in `apollo_search_filters.md`).
2. Upload the LinkedIn profile URLs to PhantomBuster.
3. Set the DM message (keep it under 300 characters, no links in first message):

> "Hey [First Name], I saw you're building [App Name]. We made a scratch-off ad unit that gets 5-10x the CTR of banners. Happy to send you details if it's relevant."

4. Set send limit: 20-30 DMs per day (LinkedIn limit, do not exceed).
5. Run Monday through Friday only.
6. Replies come into LinkedIn inbox. Respond promptly and move warm leads to email.

---

## Reddit and Discord Manual Outreach

Manual outreach targets for community posts and DMs. Do not spam. Lead with value, share context, and offer a free POC.

### Target Subreddits (post once per month per subreddit)

1. r/indiegaming - Indie game developers, active community
2. r/gamedev - Game development, technical and business discussion
3. r/androiddev - Android app developers
4. r/iOSProgramming - iOS developers
5. r/mobiledev - Mobile development (cross-platform)
6. r/startups - Early-stage founders, many with apps
7. r/entrepreneur - General entrepreneurship, some app founders
8. r/SideProject - Developers sharing side projects and apps
9. r/flutterdev - Flutter developers building cross-platform apps
10. r/reactnative - React Native developers, often indie or small studio

**Posting format:** Share a value post first (e.g., "what ad units are working for you in 2026?"), then mention SkratchAds naturally in the comments or in the body. Do not post promotional content as the top-level post in subreddits that forbid it.

### Target Discord Servers

1. Indie Game Dev Discord (search "indie game dev" in Discord Discovery)
2. Game Dev League - large community of indie and studio devs
3. r/gamedev Official Discord - direct connection to the subreddit community
4. Flutter Community Discord - Flutter developers
5. React Native Community Discord - cross-platform mobile devs
6. Buildspace (now Nights and Weekends) - founder and dev community
7. Product Hunt Makers Discord - early-stage app and product founders
8. YC Startup School Community - founders at early stages
9. AppSumo Marketplace Discord - app publishers and software founders
10. Indie Hackers Discord - bootstrapped founders, many with apps

**DM approach in Discord:** Join the server, participate for a few days before outreach. DM individuals whose apps match the target profile. Keep the first DM short and non-promotional. Offer the free POC only after a brief exchange.

---

## KPIs to Track Monthly

Track these in a Google Sheet or Notion table updated weekly.

| Metric               | Target (Monthly)  | How to Measure              |
|----------------------|-------------------|-----------------------------|
| Emails sent          | 3,000-3,250       | Instantly.ai dashboard      |
| Open rate            | 40%+              | Instantly.ai dashboard      |
| Reply rate           | 5-8%              | Instantly.ai dashboard      |
| Positive reply rate  | 1-2%              | Manual count in reply log   |
| Demos booked         | 10-20             | Calendly bookings           |
| LinkedIn DMs sent    | 400-500           | PhantomBuster reports       |
| LinkedIn replies     | 30-50             | LinkedIn inbox count        |
| Reddit/Discord posts | 10-15             | Manual log                  |
| POCs started         | 2-5               | D tracks in dev log         |

**Review meeting:** First Monday of each month. Review prior month KPIs, adjust targeting and copy based on reply patterns.

---

## Tools List

| Tool           | Purpose                              | Cost (approx.)  | Link                         |
|----------------|--------------------------------------|-----------------|------------------------------|
| Instantly.ai   | Cold email sequencing                | $37-97/mo       | instantly.ai                 |
| Apollo.io      | Lead database and contact search     | $49-99/mo       | apollo.io                    |
| PhantomBuster  | LinkedIn DM automation               | $56-128/mo      | phantombuster.com            |
| Hunter.io      | Email finder by domain               | Free-$49/mo     | hunter.io                    |
| NeverBounce    | Email list verification              | Pay-per-use     | neverbounce.com              |
| Calendly       | Demo booking                         | Free-$10/mo     | calendly.com                 |
| Google Sheets  | Master lead tracking and KPI log     | Free            | sheets.google.com            |
| iTunes API     | App store lead scraping (this script)| Free            | developer.apple.com          |

**Estimated monthly tool cost:** $200-380/mo for full stack.
