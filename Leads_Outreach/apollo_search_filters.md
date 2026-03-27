# Apollo.io Search Filter Configurations

Ready-to-use filters for pulling mobile app developer and publisher leads.
Target: 3,000 contacts per monthly pull. Apply these filters in Apollo's People Search.

---

## JOB TITLES TO TARGET

Use "Title" filter in Apollo. Enter each title individually. Set to "contains" match.

1. Founder
2. Co-Founder
3. CEO
4. CTO
5. Head of Mobile
6. Mobile App Developer
7. iOS Developer
8. Android Developer
9. Head of Growth
10. Growth Lead
11. Head of Monetization
12. App Publisher
13. Product Manager (Mobile)
14. Director of Mobile
15. Indie Developer

**Pro tip:** Prioritize Founder, Co-Founder, and CEO for small companies (under 10 employees). Target Head of Mobile or Head of Growth for companies 10-50 employees.

---

## INDUSTRIES TO INCLUDE

Use the "Industry" filter. Select all of the following:

- Mobile Games
- Computer Games
- Entertainment
- Consumer Software
- Software Development
- Information Technology and Services
- Internet
- Social Media
- Media and Entertainment
- Online Media
- Computer Software

**Exclude:** Enterprise Software, Healthcare IT, FinTech (these apps rarely use banner ad units in the same way).

---

## COMPANY SIZE RANGES

Use the "Company Headcount" filter. Select:

- 1-10 employees (indie devs and small studios, highest priority)
- 11-50 employees (small studios, still viable)

**Exclude:** 51+ employees for the initial campaign. Mid-market and enterprise have longer sales cycles and multiple stakeholders.

---

## KEYWORDS TO USE

Use the "Keywords" filter (searches bios, company descriptions, LinkedIn summaries).

Add the following keywords (use OR logic between them):

- "mobile app"
- "iOS app"
- "Android app"
- "app developer"
- "app publisher"
- "mobile game"
- "indie game"
- "mobile monetization"
- "app store"
- "free to play"
- "casual game"
- "hyper casual"
- "mobile advertising"
- "in-app ads"

---

## GEOGRAPHY: PHASE 1 (US)

Use the "Location" filter:

- Country: United States
- Priority states (where mobile dev concentrations are highest):
  - California
  - New York
  - Texas
  - Washington
  - Massachusetts
  - Florida
  - Illinois

**Do not expand internationally until Phase 1 (US) is validated.** International contacts also require separate compliance considerations for cold email (GDPR for EU, CASL for Canada).

---

## ADDITIONAL FILTERS TO REFINE QUALITY

**Email status:** "Verified" only. Do not include "Guessed" or "Unverified" emails. This protects your sender reputation in Instantly.

**LinkedIn profile:** "Has LinkedIn URL" = Yes. This allows PhantomBuster follow-up.

**Last activity / Last raised funding:** Leave blank. We want both funded and bootstrapped developers.

---

## HOW TO EXPORT AND PIPE INTO INSTANTLY

### Step 1: Build and Validate in Apollo

1. Log in to Apollo.io.
2. Go to "People Search" (not "Company Search").
3. Apply all filters above.
4. Review the result count. Target: 3,000-4,000 before filtering verified emails.
5. Click "Save Search" and name it: `SkratchAds_MobileDevs_[MONTH_YEAR]`.

### Step 2: Select and Export

1. Select all results (use "Select All" checkbox, then "Select All X Results").
2. Click "Export to CSV."
3. Choose fields to export: First Name, Last Name, Email, Job Title, Company, Company Size, LinkedIn URL, Website.
4. Save the file as `apollo_export_[MONTH_YEAR].csv` in the Leads_Outreach folder.

### Step 3: Clean the List

1. Open the export in Google Sheets or Excel.
2. Filter "Email Status" column: keep "Verified" only. Delete others.
3. Remove rows missing First Name or Email.
4. Add a column "Sequence" and tag each contact:
   - Founders/CEOs of gaming companies = `gaming`
   - Founders/CEOs of utility or productivity app companies = `utility_productivity`
   - All others (indie, general mobile dev) = `indie_dev`
5. Split into three files:
   - `seq1_indie_devs.csv`
   - `seq2_gaming_studios.csv`
   - `seq3_utility_productivity.csv`

### Step 4: Import into Instantly.ai

1. Log in to Instantly.ai.
2. Go to the relevant campaign (one per sequence).
3. Click "Upload Leads" and select the matching CSV.
4. Map the CSV columns to Instantly fields:
   - "First Name" maps to {{firstName}}
   - "Email" maps to the contact email field
   - "Company" maps to {{companyName}} (optional, for personalization)
5. Confirm upload.
6. Activate the campaign schedule.

---

## TIPS FOR ONGOING LIST QUALITY

- Re-run the Apollo search monthly. The mobile dev space changes fast. New companies launch regularly.
- Save the Apollo search so you can re-run it with one click.
- Use NeverBounce to validate the list before each campaign send if open rates drop below 35%.
- Track which job titles reply most. Adjust targeting toward those titles in future pulls.
- After 3 months, consider expanding geography to Canada and UK.
