# SkratchAds Creative Studio: Perplexity Audience Research Logic Guide

**Version 1.1 | March 23, 2026**

---

## 1. Overview

The Perplexity audience research module is the intelligence layer of SkratchAds Creative Studio. It uses the Perplexity Sonar API to scan Reddit and YouTube for deep audience insights that directly inform banner creative decisions.

**Purpose:**
- Identify target audience pain points, unmet needs, and frustrations
- Discover trending topics, products, and conversations the audience cares about
- Research prize and discount preferences: what types of incentives resonate most
- Analyze sentiment toward brands and product categories in the target market
- Capture the authentic language and phrases the audience uses

**Output:**
A structured Research Report that the advertiser reviews before entering the banner creation module. The advertiser selects which insights are most relevant to their brand, and those selected insights become the foundation for the Nano Banana prompt construction.

**Why this matters:**
Without audience research, banners guess at what motivates clicks. With real Reddit and YouTube data, banners speak directly to what the audience is frustrated about, what they want, and what they value. This drives higher click-through rates and better campaign performance.

---

## 2. API Configuration

**Endpoint:** https://api.perplexity.ai/chat/completions

**Available Models:**
- `sonar`: Standard research queries, good balance of speed and depth
- `sonar-pro`: Deep dives on complex topics, higher cost, more detailed responses

**Search Domain Filters:**
The Perplexity API accepts domain parameters to constrain results. For audience research, we focus exclusively on:
- `reddit.com`: Real user discussions, pain points, deal-hunting
- `youtube.com`: Video comments, sentiment, entertainment preferences, unboxing/review culture

**Cost Estimation:**
- Single research session: 3-5 queries at approximately $0.01-0.03 per query
- Expected per-session cost: $0.05-0.15
- Monthly budget (100 research sessions): approximately $5-15

**Rate Limiting Strategy:**
- Throttle to 10 requests per minute to stay well within API limits
- Cache results aggressively to avoid redundant API calls
- Queue requests if burst demand occurs
- Display progress indicator to user during multi-query research

**Authentication:**
Store API key in environment variable: `PERPLEXITY_API_KEY`

---

## 3. Query Construction Logic

The research module runs four sequential queries, each designed to extract a specific category of audience intelligence. Each query uses a structured system prompt to guide response formatting, and a template user prompt that gets customized with advertiser inputs.

### Query 1: Pain Points Discovery

**System Prompt:**
```
You are a market research analyst specializing in consumer behavior.
Your task is to analyze Reddit discussions and YouTube comments to
identify the top pain points, frustrations, and unmet needs of a
specific target audience.

Return your findings as a JSON object with this structure:
{
  "painPoints": [
    {
      "point": "string describing the pain point",
      "frequency": "high|medium|low",
      "sources": ["reddit thread title or youtube video title"],
      "context": "brief explanation of why this matters"
    }
  ]
}

Focus on authentic user language. Rank by frequency of mention across
sources. Be specific and actionable.
```

**User Prompt Template:**
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit discussions and YouTube comments to answer this:

What are the biggest frustrations and unmet needs of [TARGET_AUDIENCE]
who are interested in [PRODUCT_CATEGORY]?

Focus on discussions and comments from the last 6 months. Look for:
- Problems they face
- Things they complain about
- Gaps in current solutions
- Desires they express

Return as JSON with painPoints array. Be specific.
```

**Customization Variables:**
- `[TARGET_AUDIENCE]`: "women 25-40 interested in skincare", "indie game developers", "fitness enthusiasts"
- `[PRODUCT_CATEGORY]`: "vitamin C skincare", "game development tools", "home gym equipment"

**Expected Output:**
Array of 5-8 pain points, ranked by frequency, with authentic context from Reddit and YouTube.

---

### Query 2: Prize and Discount Preferences

**System Prompt:**
```
You are a consumer behavior analyst specializing in promotional
psychology and incentive design. Your task is to research what types
of prizes, discounts, giveaways, and promotional offers resonate most
with a specific target audience.

Return your findings as a JSON object with this structure:
{
  "prizePreferences": [
    {
      "category": "string (e.g., 'digital products', 'discount codes', 'physical goods')",
      "examples": ["example 1", "example 2", "example 3"],
      "relevanceScore": 85,
      "rationale": "why this audience responds to this type of prize"
    }
  ],
  "discountThresholds": {
    "meaningful": "percentage or dollar amount that gets attention",
    "compelling": "percentage or dollar amount that drives action",
    "context": "explanation of why these thresholds matter"
  }
}

Be specific about what actually motivates action. Base recommendations on
real evidence from Reddit deal discussions and YouTube comments.
```

**User Prompt Template:**
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit discussions (especially r/deals, r/freebies) and
YouTube comments about discounts and giveaways to answer this:

What types of prizes, discounts, giveaways, and promotional offers does
[TARGET_AUDIENCE] in [INDUSTRY] respond to most positively?

Specifically research:
- What prize types get the most engagement (discounts, free products, digital goods, cash equivalents)
- What discount amounts do they consider meaningful or compelling
- What giveaway formats drive the most interest
- What language triggers the highest response rates

Return as JSON with prizePreferences array and discountThresholds object.
```

**Customization Variables:**
- `[TARGET_AUDIENCE]`: Same as Query 1
- `[INDUSTRY]`: "DTC/E-commerce", "SaaS", "Gaming", "Fitness"

**Expected Output:**
Ranked list of prize categories with relevance scores and realistic discount thresholds that actually move this audience to action.

---

### Query 3: Trending Topics and Language

**System Prompt:**
```
You are a social media trend analyst. Your task is to identify what
a specific target audience is currently talking about, obsessing over,
and using in their everyday language.

Return your findings as a JSON object with this structure:
{
  "trendingTopics": [
    {
      "topic": "string describing the trend",
      "relevance": "high|medium",
      "mentions": 42,
      "language": ["phrase 1", "phrase 2", "phrase 3"],
      "context": "why this matters for marketing"
    }
  ],
  "audienceLanguage": {
    "slang": ["term 1", "term 2"],
    "values": ["value 1", "value 2"],
    "concerns": ["concern 1", "concern 2"]
  }
}

Be conversational and use the exact language you find, not sanitized
versions. This is for copywriting, so authenticity matters.
```

**User Prompt Template:**
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit and YouTube to identify current conversations
and trending topics relevant to this audience:

What topics, products, trends, and conversations are [TARGET_AUDIENCE]
in [INDUSTRY] most engaged with right now?

Specifically research:
- What are they talking about on Reddit and YouTube
- What new products or tools are they excited about
- What problems are they trying to solve this month
- What language and phrases do they use naturally
- What values do they express

Return as JSON with trendingTopics array and audienceLanguage object.
Include exact phrases, not paraphrased versions.
```

**Customization Variables:**
- `[TARGET_AUDIENCE]`: Same as Query 1
- `[INDUSTRY]`: Same as Query 2

**Expected Output:**
Top 5-10 trending topics with the authentic language the audience uses. This becomes the voice and tone reference for banner copy.

---

### Query 4: Sentiment Analysis

**System Prompt:**
```
You are a brand sentiment analyst. Your task is to analyze the overall
sentiment toward a specific brand or product category among a target
audience.

Return your findings as a JSON object with this structure:
{
  "sentimentAnalysis": {
    "positive": 45,
    "negative": 25,
    "neutral": 30,
    "summary": "brief summary of overall sentiment"
  },
  "sentimentBreakdown": [
    {
      "theme": "string describing what drives positive/negative sentiment",
      "sentiment": "positive|negative",
      "evidence": ["quote or paraphrase from source"],
      "frequency": "high|medium|low"
    }
  ],
  "recommendations": ["actionable insight 1", "actionable insight 2"]
}

Return percentages that sum to 100. Be balanced and evidence-based.
```

**User Prompt Template:**
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit and YouTube discussions to assess sentiment
toward a brand and product category:

What is the general sentiment toward [BRAND_NAME] and similar products
among [TARGET_AUDIENCE]?

Research:
- Recent Reddit threads discussing the brand and product category
- YouTube comments on product reviews and unboxing videos
- What do people praise about the brand/category
- What do people criticize or complain about
- Is sentiment improving or declining

Return as JSON with sentimentAnalysis object showing positive/negative/neutral
percentages and detailed sentimentBreakdown with examples.
```

**Customization Variables:**
- `[BRAND_NAME]`: The advertiser's brand, e.g., "GlowUp", "Liquid Death", "Notion"
- `[TARGET_AUDIENCE]`: Same as Query 1

**Expected Output:**
Honest sentiment breakdown with specific themes driving positive or negative perception. This helps the advertiser understand how their brand is perceived and what messaging will resonate.

---

## 4. Response Processing Logic

The Perplexity API returns responses as text with JSON embedded in markdown code blocks. The processing layer extracts, validates, and transforms this into the Research Report structure.

**Processing Steps:**

1. **Raw Response Parsing:**
   - Receive response text from Perplexity API
   - Search for JSON code blocks (text between triple backticks with optional `json` language identifier)
   - If found, extract the JSON string; if not found, attempt to parse the entire response as JSON

2. **JSON Extraction and Validation:**
   ```
   Pattern: ```json\n{...}\n``` or ```\n{...}\n```
   Extract the content between markers
   Validate JSON structure (parse test)
   If invalid, return error: "Research returned invalid data"
   ```

3. **Mapping to ResearchReport Structure:**
   After all four queries complete, aggregate results into unified structure:

   ```json
   {
     "id": "uuid-generated",
     "projectId": "uuid-reference-to-advertiser-project",
     "createdAt": "ISO 8601 timestamp",
     "research": {
       "painPoints": [
         {
           "point": "string",
           "frequency": "high|medium|low",
           "context": "string"
         }
       ],
       "trendingTopics": [
         {
           "topic": "string",
           "relevance": "high|medium",
           "language": ["phrase", "phrase"]
         }
       ],
       "prizeRecommendations": [
         {
           "category": "string",
           "examples": ["example"],
           "relevanceScore": 85,
           "rationale": "string"
         }
       ],
       "discountThresholds": {
         "meaningful": "string",
         "compelling": "string",
         "context": "string"
       },
       "sentimentSummary": {
         "positive": 45,
         "negative": 25,
         "neutral": 30,
         "summary": "string"
       },
       "sources": [
         {
           "title": "string",
           "platform": "reddit|youtube",
           "mentions": 5
         }
       ]
     },
     "selectedInsights": []
   }
   ```

4. **Data Enrichment:**
   - Count frequency of mentions across sources
   - Calculate relevance scores based on recency and engagement
   - Timestamp all insights for freshness tracking
   - Deduplicate similar pain points or trending topics

5. **Validation Checks:**
   - Ensure all required fields are present
   - Validate that sentiment percentages sum to 100
   - Ensure at least 3 examples per recommendation category
   - Flag any sections with suspiciously low data coverage

---

## 5. Error Handling

**API Timeout (no response after 30 seconds):**
- Retry once after 3-second backoff
- If second attempt fails, show user: "Research is taking longer than expected. Please try again in a moment."
- Log the failure and API response time for monitoring

**Rate Limit Error (HTTP 429):**
- Queue the request
- Calculate wait time from response headers
- Display progress indicator: "Waiting to continue research (X seconds)..."
- Retry after appropriate delay

**Empty Results (no relevant data found):**
- Show: "Limited data found for this audience segment. Try broadening your target description or changing the industry focus."
- Allow user to modify inputs and rerun research

**Partial Results (some queries succeeded, others failed):**
- Display completed sections with a warning banner
- Example: "We completed research on pain points and trends, but sentiment analysis failed. Review available results and try sentiment research again."
- Do not block advertiser from proceeding (selected insights can come from partial data)

**Invalid JSON Response:**
- Log raw response for debugging
- Show: "Research data returned in unexpected format. Please try again."
- Retry request once

**Missing Required Fields in JSON:**
- If critical fields missing, treat as empty and show warning
- Example: Missing sentimentSummary shows "Sentiment data unavailable for this research"

---

## 6. Caching Strategy

**Cache Storage:**
- Table: `research_cache` in Supabase
- Fields: id, cache_key, research_data, created_at, expires_at, hit_count

**Cache Key Construction:**
```
cache_key = SHA256(
  brand_name +
  target_audience +
  product_category +
  industry
)
```

Example:
```
Input: brand="GlowUp", audience="women 25-40 skincare", category="vitamin C serum", industry="DTC"
Cache Key: a7f3b9e2c1d4f6g8h0i2j4k6l8m0n2o4
```

**Cache TTL (Time to Live):**
- 7 days: audience sentiment and trends shift weekly, data becomes stale after one week
- After 7 days, cache entry is considered expired and next query will hit the API fresh

**Refresh Research Button:**
- Advertiser can manually refresh at any time
- Deletes existing cache entry
- Reruns all four queries
- Stores fresh results with new created_at timestamp
- Shows: "Research updated. Showing latest insights."

**Cache Hit Flow:**
1. Generate cache key from inputs
2. Query `research_cache` table
3. If entry exists and not expired, return cached data
4. If expired or not found, run full query sequence
5. Store result in cache with TTL of 7 days

**Monitoring:**
- Track cache hit rate in analytics
- Log cache misses to identify patterns
- Alert if cache failures exceed 10% of requests

---

## 7. Research Report UI Logic

The Research Report presents findings in a structured, scannable format that guides the advertiser toward selecting the most relevant insights.

**Display Order:**
1. Research Summary (headline + key stats)
2. Pain Points (5-8 insights, ranked by frequency)
3. Trending Topics (5-10 insights, ranked by relevance)
4. Prize Recommendations (3-5 categories with examples)
5. Discount Thresholds (meaningful vs. compelling amounts)
6. Sentiment Summary (positive/negative/neutral breakdown with themes)
7. Sources (list of Reddit threads and YouTube videos analyzed)

**Interaction Patterns:**

**Expandable Sections:**
- Each major section (Pain Points, Trending Topics, etc.) is collapsible/expandable
- User can collapse sections they're not interested in
- State persists in local storage during session

**Selection Checkboxes:**
- Each insight has a checkbox: "Include this in banner creation"
- Individual selections are tracked in `research.selectedInsights` array
- "Select All" checkbox per section to quick-select entire category

**Selected Insights Flow:**
- When advertiser clicks "Create Banner", selected insights are passed to the Nano Banana prompt module
- Example: "Include pain point: 'Vitamin C serums are too expensive', trending topic: 'Clean beauty', prize: 'Free sample coupon'"
- Selected insights shape the tone, messaging, and offer in the generated banner

**Data Export:**
- "Download Research as PDF" button exports full report with selections marked
- "Copy Research Data" button copies JSON to clipboard (for advanced users)

**Refresh and History:**
- "Refresh Research" button re-queries Perplexity API and updates cache
- Previous research sessions available in a "History" dropdown
- User can compare old research to new to see how audience sentiment shifts

---

## 8. Example: DTC Skincare Brand (GlowUp)

A complete walkthrough of the research module in action.

**Advertiser Inputs:**
- Brand Name: GlowUp
- Product: Vitamin C serum
- Target Audience: Women 25-40 interested in skincare
- Industry: DTC/E-commerce

**Query 1: Pain Points Discovery**

System Prompt: (as defined in section 3.1)

User Prompt Sent:
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit discussions and YouTube comments to answer this:

What are the biggest frustrations and unmet needs of women 25-40
interested in skincare who are interested in vitamin C serums?

Focus on discussions and comments from the last 6 months. Look for:
- Problems they face
- Things they complain about
- Gaps in current solutions
- Desires they express

Return as JSON with painPoints array. Be specific.
```

Perplexity Response (Example):
```json
{
  "painPoints": [
    {
      "point": "Vitamin C serums oxidize too quickly, making expensive bottles go bad after a few weeks",
      "frequency": "high",
      "sources": ["r/SkincareAddiction thread on vitamin C oxidation", "YouTube comment on Timeless Vitamin C review"],
      "context": "Women invest $30-60 in vitamin C serums but feel they waste money when products oxidize"
    },
    {
      "point": "Can't tell if a product actually works because ingredients vary so much between brands",
      "frequency": "high",
      "sources": ["r/EuroSkincare discussion on efficacy", "YouTube review comparing 5 vitamin C serums"],
      "context": "Decision paralysis: too many options with conflicting claims"
    },
    {
      "point": "Skin sensitivity issues; many vitamin C serums cause irritation or redness",
      "frequency": "medium",
      "sources": ["r/SkinCareAddicts post on LAA sensitivity", "YouTube comment on Drunk Elephant C-Firma review"],
      "context": "Higher price doesn't guarantee gentler formula"
    },
    {
      "point": "Price of quality vitamin C is prohibitive; most accessible brands are weak formulations",
      "frequency": "high",
      "sources": ["r/SkincareAddiction price discussion", "YouTube: budget skincare hauls"],
      "context": "Want clinical-grade but budget for drugstore only"
    },
    {
      "point": "Don't understand the science; marketing claims are overhyped and confusing",
      "frequency": "medium",
      "sources": ["r/Dermatology thread", "YouTube: dermatologist reacts to skincare ads"],
      "context": "Want simple, clear information about how vitamin C actually works"
    }
  ]
}
```

**Query 2: Prize and Discount Preferences**

User Prompt Sent:
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit discussions (especially r/deals, r/freebies) and
YouTube comments about discounts and giveaways to answer this:

What types of prizes, discounts, giveaways, and promotional offers does
women 25-40 in DTC/E-commerce skincare respond to most positively?

Specifically research:
- What prize types get the most engagement
- What discount amounts do they consider meaningful or compelling
- What giveaway formats drive the most interest
- What language triggers the highest response rates

Return as JSON with prizePreferences array and discountThresholds object.
```

Perplexity Response (Example):
```json
{
  "prizePreferences": [
    {
      "category": "Full-size product samples or discovery sets",
      "examples": ["Free full-size vitamin C serum", "Discovery set with 3 products", "Deluxe mini kit"],
      "relevanceScore": 92,
      "rationale": "Women want to try before committing; full sizes reduce waste risk vs. samples"
    },
    {
      "category": "Percentage discounts on first purchase",
      "examples": ["20% off first order", "Free shipping on first purchase", "$15 off $50+"],
      "relevanceScore": 88,
      "rationale": "Removes friction for new customers; percentage feels generous; shipping discounts matter for skincare"
    },
    {
      "category": "Loyalty rewards or subscription discounts",
      "examples": ["20% off subscription service", "Free month with annual membership", "Points toward future purchase"],
      "relevanceScore": 75,
      "rationale": "Appeals to repeat buyers; reduces per-unit cost of expensive products"
    },
    {
      "category": "Exclusive access (early product launch, limited edition)",
      "examples": ["First access to new product", "Limited edition color/scent", "Exclusive formula for members"],
      "relevanceScore": 70,
      "rationale": "Creates sense of VIP status; appeals to enthusiasts who follow brand updates"
    }
  ],
  "discountThresholds": {
    "meaningful": "15-20% off or free shipping",
    "compelling": "25%+ off or free full-size product",
    "context": "Women 25-40 research prices carefully; 15% feels like a real deal. 25% drives impulse action. Free product is maximum compelling offer."
  }
}
```

**Query 3: Trending Topics and Language**

User Prompt Sent:
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit and YouTube to identify current conversations
and trending topics relevant to this audience:

What topics, products, trends, and conversations are women 25-40
in DTC skincare most engaged with right now?

Specifically research:
- What are they talking about on Reddit and YouTube
- What new products or tools are they excited about
- What problems are they trying to solve this month
- What language and phrases do they use naturally
- What values do they express

Return as JSON with trendingTopics array and audienceLanguage object.
Include exact phrases, not paraphrased versions.
```

Perplexity Response (Example):
```json
{
  "trendingTopics": [
    {
      "topic": "Clean beauty and ingredient transparency (paraben-free, cruelty-free, eco packaging)",
      "relevance": "high",
      "mentions": 248,
      "language": ["clean girl aesthetic", "ingredient list", "parabens", "clean beauty", "sustainable packaging"],
      "context": "Women want to know exactly what's in their skincare and care about brand values"
    },
    {
      "topic": "Anti-aging and preventative skincare (collagen, peptides, retinol)",
      "relevance": "high",
      "mentions": 195,
      "language": ["preventative", "anti-aging", "collagen", "peptides", "fine lines", "looking my age"],
      "context": "Age 25-40 is pivotal; starting prevention early is hot topic"
    },
    {
      "topic": "Skincare routines simplified (minimalist, lazy girl skincare, less is more)",
      "relevance": "high",
      "mentions": 176,
      "language": ["lazy girl", "skincare routine", "less is more", "minimal routine", "5-step", "3-step"],
      "context": "Tired of 10-step routines; want results with simple, efficient regimens"
    },
    {
      "topic": "Science-backed skincare (clinical trials, dermatologist recommendations, evidence)",
      "relevance": "medium",
      "mentions": 142,
      "language": ["clinical studies", "dermatologist recommended", "science-backed", "evidence-based", "peer reviewed"],
      "context": "Skeptical of marketing hype; want real science behind claims"
    },
    {
      "topic": "Budget skincare wins (finding effective products under $30, drugstore dupes)",
      "relevance": "medium",
      "mentions": 118,
      "language": ["budget friendly", "dupe", "drugstore", "affordable", "value for money", "hidden gem"],
      "context": "Price-conscious; willing to try unknown brands if they deliver results"
    },
    {
      "topic": "Skin types and personalized routines (sensitive skin, acne-prone, combination, texture)",
      "relevance": "high",
      "mentions": 212,
      "language": ["sensitive skin", "acne-prone", "combination skin", "texture", "barrier damaged", "reactive"],
      "context": "One size does not fit all; seeking routines tailored to specific concerns"
    }
  ],
  "audienceLanguage": {
    "slang": ["lazy girl aesthetic", "skincare junkie", "glass skin", "dewey", "glow up", "that girl energy"],
    "values": ["clean ingredients", "results-driven", "science-backed", "cruelty-free", "sustainable", "accessible"],
    "concerns": ["ingredient safety", "greenwashing", "waste", "effectiveness", "sensitive skin", "long-term damage"]
  }
}
```

**Query 4: Sentiment Analysis**

User Prompt Sent:
```
I need audience research for a scratch-off mobile ad campaign.
Please analyze Reddit and YouTube discussions to assess sentiment
toward a brand and product category:

What is the general sentiment toward GlowUp and similar products
among women 25-40 interested in skincare?

Research:
- Recent Reddit threads discussing the brand and product category
- YouTube comments on product reviews and unboxing videos
- What do people praise about the brand/category
- What do people criticize or complain about
- Is sentiment improving or declining

Return as JSON with sentimentAnalysis object showing positive/negative/neutral
percentages and detailed sentimentBreakdown with examples.
```

Perplexity Response (Example):
```json
{
  "sentimentAnalysis": {
    "positive": 52,
    "negative": 28,
    "neutral": 20,
    "summary": "Skincare category sentiment is moderately positive. Consumers are hopeful about effectiveness but skeptical of pricing and marketing claims."
  },
  "sentimentBreakdown": [
    {
      "theme": "Results and effectiveness (whether products deliver on promises)",
      "sentiment": "positive",
      "evidence": ["Before/after transformations", "Long-term improvement reports", "Glow-up results"],
      "frequency": "high"
    },
    {
      "theme": "Price and value perception (cost vs. results)",
      "sentiment": "negative",
      "evidence": ["'$70 serum better last forever'", "Disappointed by premium pricing", "Seeking affordable alternatives"],
      "frequency": "high"
    },
    {
      "theme": "Brand transparency and ingredient integrity",
      "sentiment": "positive",
      "evidence": ["Appreciation for clean ingredient lists", "Trust in dermatologist backing", "Full transparency on sourcing"],
      "frequency": "medium"
    },
    {
      "theme": "Marketing claims and hype (skepticism of exaggerated claims)",
      "sentiment": "negative",
      "evidence": ["'It's not going to change your life'", "Tired of influencer hype", "Claims don't match reality"],
      "frequency": "medium"
    },
    {
      "theme": "Packaging and sustainability",
      "sentiment": "positive",
      "evidence": ["Recyclable packaging appreciated", "Refill programs get praise", "Eco-friendly moves matter"],
      "frequency": "medium"
    }
  ],
  "recommendations": [
    "Lead with real before/afters and customer testimonials, not exaggerated claims",
    "Justify pricing with ingredient quality and science; offer samples to reduce purchase risk",
    "Emphasize clean ingredients and sustainability to align with audience values",
    "Be honest about what vitamin C can and cannot do; set realistic expectations"
  ]
}
```

**Advertiser Reviews and Selects Insights:**

The Research Report displays all findings. The advertiser reviews and selects:
- Pain Point: "Vitamin C serums oxidize too quickly"
- Trending Topic: "Clean beauty and ingredient transparency"
- Trending Topic: "Skincare routines simplified"
- Prize Preference: "Full-size product samples"
- Discount: "20% off first order"
- Sentiment Insight: "Lead with real before/afters"

**Selected Insights Feed Into Banner Creation:**

These selections become the context for the Nano Banana prompt. The banner module now knows:
- Copy angle: Emphasize fresh formula and no oxidation
- Voice: Clean, minimalist, science-backed (not hype-y)
- Offer: 20% off first order or free sample
- Visual: Real customer results, not models
- Theme: Results-driven, transparent, sustainable

The banner generator uses these insights to craft a headline like:
"Fresh Vitamin C That Actually Works (No Oxidation, No Hype)"

And a CTA like:
"Scratch to unlock 20% off or free sample"

---

## Summary

The Perplexity Audience Research module transforms raw Reddit and YouTube data into actionable insights that make SkratchAds banners smarter and more effective. By understanding what the audience cares about, what frustrates them, and what language resonates, we move from generic ads to targeted, authentic creative that drives higher engagement and conversion.

Each research session takes 2-3 minutes, costs less than 20 cents, and directly improves banner performance for the advertiser.
