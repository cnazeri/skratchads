# SkratchAds Creative Studio: Nano Banana Banner Creation Logic Guide

**Version 1.1 | March 23, 2026**

---

## 1. Overview

**Purpose:** Use Google Nano Banana API to generate production-quality banner ad creatives for SkratchAds campaigns.

**Capabilities:**
- Generates all four banner states: Scratch-to-Win, Win Banner, Lose Banner, Brand Reveal
- Creates 3-5 A/B test variations per state per format
- Supports multiple banner dimensions and aspect ratios (320x50 mobile through 970x250 billboard)
- Produces images ready for immediate export and campaign deployment

**Input Requirements:**
- Audience research insights from Perplexity research phase
- Brand assets: brand name, brand colors, visual style preferences
- Format selection: which banner dimensions to generate
- Optional: uploaded logo images and product photos

**Output Specification:**
- Generated banner images in PNG format
- Base64 encoded for immediate display in frontend
- Metadata: variation label, prompt used, banner state, dimensions
- All images optimized for web delivery and A/B testing

---

## 2. API Configuration

**Endpoint:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent
```

**Authentication:**
- API key passed as query parameter: `?key=NANO_BANANA_API_KEY`
- Store API key in environment variables, never hardcode
- Request timeout: 30 seconds per image generation

**Request Format:**
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "[constructed_prompt]"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
```

**Available Models:**

| Model | Speed | Quality | Best For | Cost |
|-------|-------|---------|----------|------|
| Gemini 2.0 Flash Exp | Fast | Good | Drafts, iteration, quick A/B | $0.02-0.05/image |
| Gemini 3 Pro | Standard | Excellent | Production creatives, final output | $0.05-0.10/image |

**Key Capabilities:**
- High-fidelity text rendering with legible fonts at small sizes
- Native multi-aspect ratio support: 4:1 (320x80), 8:1 (728x90), custom formats
- Subject consistency across up to 14 reference images
- Color accuracy matching brand specifications
- Transparent background support (PNG output)

---

## 3. Prompt Construction Engine

This section defines the core logic that transforms research data, brand configuration, and variation strategy into image generation prompts.

### 3.1 Prompt Template Structure

Every prompt follows this standardized structure:

```
[ROLE] You are a professional advertising creative designer specializing in mobile banner ads.

[CONTEXT] Create a [banner_state] banner for a SkratchAds campaign.

[BRAND] Brand: [brand_name]. Brand colors: [primary_color], [secondary_color], [accent_color]. Visual style: [style_description].

[FORMAT] Dimensions: [width]x[height] pixels. Format name: [format_name]. Layout strategy: [layout_guidance].

[CONTENT] [state-specific_content_instructions]

[RESEARCH] Based on audience research, this campaign targets [audience_segment]. Key insights:
- [insight_1]
- [insight_2]
- [insight_3]

[VARIATION] This is variation [A/B/C/D/E]. [variation_specific_instruction]

[QUALITY] Professional quality standards: clean design, legible text (minimum 10pt equivalent), high contrast, no watermarks, mobile-optimized. Ensure all text is crisp and readable even at small sizes.
```

### 3.2 State-Specific Prompt Templates

#### Scratch-to-Win Banner (Pre-Scratch State)

**Purpose:** Hook the user with a scratch card experience. Communicate the prize teaser and CTA clearly.

**Must Include:**
- Scratchable texture or metallic overlay effect
- Brand logo in top corner
- Prize teaser text (never reveal the actual prize)
- Interactive CTA: "Scratch to Win!" or similar
- Sense of excitement and mystery

**Prompt Addition:**
```
CONTENT INSTRUCTIONS FOR SCRATCH-TO-WIN STATE:
Design a banner that looks like a scratch card ticket. Include a metallic/gold/silver scratch surface overlay covering the center area, suggesting an interactive scratchable element.

Place the brand logo in the top-left or top-right corner. Add teaser text that builds anticipation, such as "[prize_teaser_from_research]" or "You could win big!" Do not reveal what the prize is.

The main CTA should be bold and eye-catching: "[cta_from_research or default: Scratch to Win!]"

The overall aesthetic should feel exciting, lucky, and interactive. Use bright accent colors to draw attention to the scratch area.
```

**Variation Strategy for Scratch-to-Win:**
- **Variation A (Control):** Base design with top research insight about audience motivation
- **Variation B (Copy variant):** Different teaser text, e.g., "Mystery prize inside" vs. "You're a winner"
- **Variation C (Visual variant):** Different color scheme matching secondary brand color
- **Variation D (Prize variant):** Different prize framing: "Win up to $100" vs. "Exclusive prize waiting"
- **Variation E (Layout variant):** Logo bottom-right, scratch area larger, different text placement

#### Win Banner (Post-Win State)

**Purpose:** Celebrate the user's win, drive email capture or redemption action.

**Must Include:**
- Celebration visual: confetti, sparkles, or celebration animation frame
- Prize reveal: show exactly what was won
- Congratulations message
- Email capture CTA or "Claim Prize" button
- Sense of achievement and reward

**Prompt Addition:**
```
CONTENT INSTRUCTIONS FOR WIN BANNER STATE:
Design a celebratory winner announcement banner. Include visual celebration elements such as confetti, sparkles, or star bursts to convey excitement.

Prominently display the prize that was won: "[prize_from_research]". Make this the visual focal point.

Add congratulations messaging such as "Congratulations!" or "You won!" at the top. Keep it celebratory but professional.

The CTA should drive the next action. Use "[cta_from_research or default: Claim Your Prize]" or "Enter Email to Claim". If email capture is the next step, show a subtle email input field indicator or envelope icon.

Use bright, warm colors. The brand logo can be smaller here since the focus is on the prize and celebration.
```

**Variation Strategy for Win Banner:**
- **Variation A (Control):** Prize-focused celebration design
- **Variation B (Copy variant):** Different CTA framing: "Claim now" vs. "See your prize"
- **Variation C (Visual variant):** Different celebration effect (confetti vs. fireworks vs. stars)
- **Variation D (Prize variant):** Same prize, different presentation format (as a product vs. as text)
- **Variation E (Layout variant):** Prize in center vs. prize in top area with CTA below

#### Lose Banner (Consolation State)

**Purpose:** Keep the user engaged despite not winning the scratch game. Expose brand message positively.

**Must Include:**
- Positive consolation message
- Brand value proposition or key selling point
- Secondary CTA: "Visit Us", "Try Again", or brand-specific action
- Optional: consolation offer (discount code, free trial, etc.)
- Sense of encouragement, not disappointment

**Prompt Addition:**
```
CONTENT INSTRUCTIONS FOR LOSE BANNER STATE:
Design a positive, encouraging "better luck next time" banner that transitions the user to brand messaging.

At the top, include a kind message such as "Better luck next time!" or "Not this time, but check this out" that feels uplifting, not negative.

Display the brand's core value proposition: "[brand_value_prop_from_research]". This is the opportunity to shift focus from the scratch game to what the brand offers.

Include a consolation offer if available: "[consolation_prize_from_research or discount_code]". Examples: "Get 10% off your first order" or "Free shipping on your next purchase".

The CTA should be action-oriented: "[cta_from_research or default: Visit Us]" or "Explore Now". Keep the brand prominent and inviting.

Use warmer colors than a typical loss state would suggest. Maintain the brand's visual style to build familiarity.
```

**Variation Strategy for Lose Banner:**
- **Variation A (Control):** Brand-focused message design
- **Variation B (Copy variant):** Different consolation offer: discount vs. free shipping vs. newsletter signup
- **Variation C (Visual variant):** Different color emphasis, softer vs. vibrant
- **Variation D (Prize variant):** Different incentive type: monetary vs. experiential
- **Variation E (Layout variant):** Product image on left, message on right vs. stacked layout

#### Brand Reveal (Ad Impression State)

**Purpose:** Deliver the core brand advertising message. This is the full ad impression for users who see the game as a brand exposure vehicle.

**Must Include:**
- Full brand name and logo prominently displayed
- Product imagery or key visual asset
- Clear value proposition or benefit statement
- Strong, actionable CTA: "Learn More", "Shop Now", "Sign Up", etc.
- Professional, polished aesthetic

**Prompt Addition:**
```
CONTENT INSTRUCTIONS FOR BRAND REVEAL STATE:
Design a clean, professional brand advertisement banner that showcases the brand as the primary focus.

Display the brand name "[brand_name]" prominently. Include the brand logo and, if provided, product imagery. Show what the brand sells or offers clearly.

State the key value proposition: "[brand_value_prop_from_research]". Examples: "Premium skincare with natural ingredients" or "Fast, reliable delivery guaranteed". This is the core message.

Include a strong CTA button with action-oriented copy: "[cta_from_research]". Examples: "Shop Now", "Learn More", "Get Started", "Subscribe". The CTA should feel compelling and clear.

This is the traditional ad impression. Prioritize brand message clarity, product appeal, and a clear path to action. Use professional styling consistent with the brand's identity.
```

**Variation Strategy for Brand Reveal:**
- **Variation A (Control):** Product-focused brand message
- **Variation B (Copy variant):** Different value proposition angle or benefit emphasis
- **Variation C (Visual variant):** Different product image or lifestyle photo
- **Variation D (CTA variant):** Different CTA button text and color
- **Variation E (Layout variant):** Different text-to-image ratio or composition balance

### 3.3 Research Integration Pattern

The Perplexity research phase produces structured insights. Map these into the prompt:

**From Research:**
- Audience motivations: "consumers motivated by savings", "gamification appeal", "brand loyalty rewards"
- Pain points: "decision paralysis", "shipping concerns", "trust in new brands"
- Copy angles: specific phrases from successful competitors
- Visual preferences: "minimalist vs. colorful", "photographic vs. illustrated"
- Prize appeal: what actually motivates target audience

**Prompt Insertion:**
```
[RESEARCH] Based on audience research, this campaign targets [audience_segment]. Key insights:
- [audience_motivation]: This audience is driven by [specific_motivation]. Emphasize [corresponding_visual_or_copy_element].
- [pain_point_solution]: Address the concern of [pain_point] by highlighting [brand_solution].
- [successful_copy_angle]: Research shows this audience responds to "[successful_phrase]". Incorporate similar messaging.
```

### 3.4 Variation Strategy Rules

Generate 5 variations (A, B, C, D, E) for each banner state:

**Rule 1: One Change Per Variation**
- Variation A: Control (base design from top research insight)
- Variation B: Change only the copy/headline/CTA
- Variation C: Change only the color scheme or visual treatment
- Variation D: Change only the prize framing or benefit emphasis
- Variation E: Change only the layout or composition

**Rule 2: Maintain Brand Consistency**
- All variations must maintain brand colors as baseline
- Logo always visible and consistent in size/placement
- Typography remains readable across all variations

**Rule 3: Test Meaningful Differences**
- Don't create variations that are almost identical
- Each variation should represent a distinct A/B test hypothesis
- Example: Variation B tests "direct CTA" vs. Variation A's "indirect CTA"

---

## 4. Image Generation Pipeline

This section outlines the step-by-step process for generating banner images.

### 4.1 Input Validation

Before generation begins, validate the campaign configuration:

```javascript
campaignConfig = {
  campaignId: string (required),
  brandName: string (required),
  brandColors: {
    primary: hex_color,
    secondary: hex_color,
    accent: hex_color
  },
  visualStyle: string (e.g., "minimalist", "bold", "playful"),
  selectedFormats: array of { width, height, formatName },
  selectedResearchInsights: array of strings,
  logoImage: optional base64_string,
  productImages: optional array of base64_strings,
  audienceSegment: string (e.g., "female 25-35, health-conscious"),
  prizes: {
    primaryPrize: string,
    teaser: string,
    consolation: string
  },
  ctas: {
    scratchToWin: string,
    winBanner: string,
    loseBanner: string,
    brandReveal: string
  }
}
```

### 4.2 Generation Loop

For each selected format:

```
FOR each format in selectedFormats:
  FOR each bannerState in [SCRATCH_TO_WIN, WIN_BANNER, LOSE_BANNER, BRAND_REVEAL]:
    1. Construct base prompt using template + format + research insights
    2. FOR each variation in [A, B, C, D, E]:
       a. Generate variation-specific prompt by modifying base prompt
       b. Build API request with:
          - Generated prompt
          - Reference images (logo, product) if available
          - responseModalities: ["TEXT", "IMAGE"]
       c. Call Nano Banana API
       d. On success:
          - Extract base64 image data from response
          - Store in results array:
            {
              id: unique_id,
              imageUrl: "data:image/png;base64,[base64_data]",
              bannerState: bannerState,
              variation: variation_letter,
              format: { width, height, name },
              prompt: prompt_used,
              timestamp: generation_timestamp
            }
       e. On failure:
          - Retry once with simplified prompt
          - If retry fails, add to failed array
    3. Return all generated images for this format
END
```

### 4.3 Reference Image Handling

If the advertiser uploads brand assets:

**Logo Image:**
```
{
  "parts": [
    {
      "inline_data": {
        "mime_type": "image/png",
        "data": "[base64_encoded_logo]"
      }
    },
    {
      "text": "Incorporate the provided brand logo into the design..."
    }
  ]
}
```

**Product Images:**
- For Brand Reveal state: include up to 2 product images
- For Win Banner state: optional, if showing product as prize
- Prompt instruction: "Use the provided product image as the visual focal point for the prize display."

**Constraints:**
- Maximum 14 total reference images per API call
- Recommended: 1 logo + 2-3 product images per generation
- Logo always included in every variation for consistency

---

## 5. Format-Specific Adaptations

Different banner dimensions require different layout strategies, text density, and visual approaches.

### 5.1 Format Reference Table

| Format | Dimensions | Use Case | Layout Strategy | Key Constraint |
|--------|------------|----------|-----------------|-----------------|
| Mobile Banner | 320x50 | In-app, mobile web top | Horizontal: logo left, text center, CTA right | Minimal text, compact design |
| Large Mobile | 320x100 | In-app, mobile web prominent | Horizontal with more vertical space for headline | 2-3 text lines max |
| Medium Rectangle | 300x250 | Sidebar, app cards | Stacked: headline top, visual center, CTA bottom | Largest canvas, most detail possible |
| Interstitial | 320x480 | Full-screen mobile takeover | Full composition: large visual, prominent text, centered CTA | Vertical, portrait orientation |
| Leaderboard | 728x90 | Desktop web top banner | Wide horizontal: logo left, headline center, CTA right | Very wide, shallow, minimal headline |
| Skyscraper | 160x600 | Desktop web sidebar | Vertical stack: logo top, visual middle, text and CTA bottom | Very narrow, tallest format |
| Half Page | 300x600 | Desktop web sidebar, in-app | Rich layout: large visual, multiple text elements, prominent CTA | Vertical, balanced elements |
| Billboard | 970x250 | Desktop web top banner | Panoramic: large visual left, text and CTA right | Ultra-wide, luxurious design space |
| Custom | [user-specified] | Campaign-specific needs | Auto-detect closest standard layout and adapt | Validate aspect ratio is banner-appropriate |

### 5.2 Format-Specific Prompt Modifications

Include layout guidance for each format. Example for 320x50:

```
[FORMAT] Dimensions: 320x50 pixels. Format: Mobile Banner.
This is an ultra-compact horizontal banner. Use a minimal, scannable layout:
- Brand logo: top-left corner, small (30x30 max)
- Headline or main message: center, single line of large text
- CTA: top-right corner, compact button
Ensure all text is bold and high-contrast. No more than 3 words per line.
```

Example for 300x250:

```
[FORMAT] Dimensions: 300x250 pixels. Format: Medium Rectangle.
This is the largest standard format. You have room for a rich composition:
- Headline: top 40% of canvas
- Visual/imagery: middle 40% of canvas
- CTA and supporting text: bottom 20% of canvas
Make use of the vertical space with 3-4 lines of text if needed.
```

Example for 970x250:

```
[FORMAT] Dimensions: 970x250 pixels. Format: Billboard.
This is an ultra-wide panoramic banner. Use a panoramic layout:
- Large visual or branded background: left 60% of canvas
- Brand logo: top-left corner
- Headline: left side, 2 lines max
- CTA button: right side, prominent
The width is your advantage. Create a cinematic, expansive visual.
```

---

## 6. Quality Control and Validation

### 6.1 Image Quality Checks

After each image is generated, validate against these criteria:

| Criterion | Test | Action if Failed |
|-----------|------|-----------------|
| Text Legibility | All text readable at thumbnail size | Retry with "Increase text size and contrast" |
| Color Contrast | WCAG AA standard (4.5:1 for text) | Retry with "Use high-contrast colors" |
| Brand Consistency | Logo clearly visible and on-brand | Retry with reference image and "Make logo more prominent" |
| State Appropriateness | Design matches banner state intent | Manual review, flag for creator |
| Aspect Ratio | Image matches requested dimensions | Reject, regenerate with correct dimensions |
| File Size | PNG under 150KB for web performance | Accept (will optimize during export) |

### 6.2 Retry Logic

For any failed quality check:

```
IF image_quality < ACCEPTABLE_THRESHOLD:
  RETRY_ATTEMPT = 1
  WHILE RETRY_ATTEMPT <= 2:
    Add to prompt: "Ensure all text is crisp and readable. Use high contrast between text and background. [specific_failure_reason]"
    Regenerate image
    IF passes_quality_check THEN break
    RETRY_ATTEMPT++
  END
  IF still fails:
    Add to MANUAL_REVIEW queue
    Show best_available_result to user with "Quality may vary" flag
END
```

### 6.3 Manual Review Triggers

Flag for human review if:
- Text is illegible or missing
- Logo is distorted or unrecognizable
- Colors do not match brand specification
- Image appears AI-generated in an obvious/unpolished way
- Layout is broken or doesn't match requested dimensions

---

## 7. Error Handling

### 7.1 API Error Scenarios

| Error | Cause | Recovery Strategy |
|-------|-------|-------------------|
| 401 Unauthorized | Invalid API key | Check environment variable, validate key format |
| 429 Rate Limited | Too many requests | Queue remaining generations, process in batches of 3 |
| 500 Server Error | API server issue | Retry with exponential backoff (1s, 2s, 4s) |
| 408 Timeout | Generation exceeds 30s | Retry once with simplified prompt, then timeout message |
| 400 Bad Request | Invalid prompt or parameter | Log prompt, show error to user, suggest simpler prompt |

### 7.2 Timeout Handling

```
SET timeout = 30 seconds
START image_generation
IF generation_exceeds_timeout:
  Cancel request
  Retry once with simplified prompt: "Simple banner, [minimal description]"
  IF second_attempt_also_times_out:
    Show placeholder with message: "Generation timed out. Click to retry."
    Store failed generation for later retry
END
```

### 7.3 Batch Processing for Rate Limits

If hitting rate limits:

```
Queue all pending generations
Process in batches of 3 with 2-second delays between batches
Example:
- Generation 1, 2, 3: immediate (parallel)
- Wait 2 seconds
- Generation 4, 5, 6: start
- Wait 2 seconds
- Generation 7, 8, 9: start
Display progress to user: "Generating 23 images (currently 8/23 complete)"
```

### 7.4 Fallback Behavior

If all variations for a state fail:

```
FOR failed_format_and_state:
  Generate template-based placeholder image:
  - Use template PNG with brand colors
  - Overlay state-specific text and CTA
  - Include "Not AI-generated" label
  Add to results with flag: { isPlaceholder: true }
  Log failure for debugging
  Suggest to user: "Use template design or retry generation"
END
```

---

## 8. Cost Estimation

### 8.1 Per-Image Costs

Using Google Nano Banana API pricing (as of March 2026):

- Gemini 2.0 Flash: approximately $0.02-0.05 per image
- Gemini 3 Pro: approximately $0.05-0.10 per image
- Typical average: $0.03-0.06 per image

### 8.2 Campaign Cost Breakdown

**Single Format Generation:**
```
4 banner states x 5 variations per state x 1 format = 20 images
Cost range: $0.40 - $1.20 per campaign
```

**Three Format Generation:**
```
4 banner states x 5 variations per state x 3 formats = 60 images
Cost range: $1.80 - $3.60 per campaign
```

**With Retries (estimated 10% failure rate):**
```
Base cost + (0.10 x base cost) = 1.10 x base cost
Example: 60 images with retries = ~$2.00 - $4.00
```

### 8.3 Budget Recommendations

- **MVP Phase:** $5 per campaign (allows for retries, multiple formats)
- **Scaling Phase:** Cap at $3 per campaign (optimize prompts, reduce retries)
- **Monthly Campaign Load:** For 50 campaigns/month: $150-250 budget recommended

### 8.4 Cost Optimization

To reduce costs per campaign:

1. Reduce variations: generate 3 instead of 5 (saves 40%)
2. Single format initially: test before expanding to 3 formats
3. Prompt optimization: fewer retries = fewer failed generations
4. Batch processing: leverage queue delays to spread costs across billing periods

---

## 9. Example: Full Generation Flow

### Campaign: GlowUp Vitamin C Serum

**Campaign Configuration:**

```json
{
  "campaignId": "camp_glowup_vitaminc_001",
  "brandName": "GlowUp",
  "brandColors": {
    "primary": "#FDB913",
    "secondary": "#2C3E50",
    "accent": "#E74C3C"
  },
  "visualStyle": "modern, clean, wellness-focused",
  "selectedFormats": [
    { "width": 320, "height": 50, "formatName": "Mobile Banner" },
    { "width": 300, "height": 250, "formatName": "Medium Rectangle" }
  ],
  "selectedResearchInsights": [
    "Target audience (women 25-45) are motivated by skin health and visible results",
    "Competitor analysis shows 'before/after' imagery drives 3x higher CTR",
    "Price-conscious segment responds to 'limited time' and 'free shipping' offers",
    "Gamification (scratch games) increases brand recall by 45% in this demographic"
  ],
  "audienceSegment": "Women 25-45, skincare enthusiasts, health-conscious",
  "prizes": {
    "primaryPrize": "GlowUp Starter Kit ($75 value)",
    "teaser": "Win premium skincare samples",
    "consolation": "15% off your first order"
  },
  "ctas": {
    "scratchToWin": "Scratch to Win",
    "winBanner": "Claim Your Kit",
    "loseBanner": "Shop Now",
    "brandReveal": "Learn More"
  }
}
```

### Selected Research Insights:

1. "Target audience (women 25-45) are motivated by skin health and visible results"
2. "Competitor analysis shows 'before/after' imagery drives 3x higher CTR"
3. "'Limited time' and 'free shipping' offers appeal to price-conscious segment"

### Banner State: Scratch-to-Win

**Base Prompt (before variation):**

```
[ROLE] You are a professional advertising creative designer specializing in mobile banner ads.

[CONTEXT] Create a Scratch-to-Win banner for a SkratchAds campaign featuring GlowUp Vitamin C Serum.

[BRAND] Brand: GlowUp. Brand colors: primary gold (#FDB913), secondary dark blue-gray (#2C3E50), accent red (#E74C3C). Visual style: modern, clean, wellness-focused.

[FORMAT] Dimensions: 320x50 pixels. Format: Mobile Banner. Layout strategy: Horizontal with minimal elements. Logo left, main message center, CTA right.

[CONTENT] Design a banner that looks like a scratch card ticket. Include a metallic/gold scratch surface overlay covering the center area. Place the GlowUp logo in the top-left corner. Add teaser text: "Win premium skincare samples". Make it feel exciting and interactive.

[RESEARCH] Based on audience research, this campaign targets women 25-45 who are health-conscious and motivated by visible skin health results. Key insights:
- This audience is driven by skin health and visible results
- Gamification (scratch games) increase brand recall by 45% in this demographic
- 'Free shipping' offers appeal to this price-conscious segment

[VARIATION] This is Variation A (Control). Use the primary gold color for the scratch overlay. Emphasize the gamification aspect.

[QUALITY] Professional quality: clean design, legible text (minimum 10pt equivalent), high contrast, no watermarks. Ensure all text is crisp and readable even at small 320x50 canvas.
```

**Variation B (Copy Variant):**

```
[VARIATION] This is Variation B (Copy Variant). Instead of "Win premium skincare samples", use the teaser "You could win big!" to test more exciting, generic copy. Keep the layout and colors identical to Variation A.
```

**Variation C (Visual Variant):**

```
[VARIATION] This is Variation C (Visual Variant). Use the secondary dark blue-gray (#2C3E50) for the scratch overlay instead of gold, to test a more sophisticated color palette. Keep all copy and layout identical to Variation A.
```

**Variation D (Prize Variant):**

```
[VARIATION] This is Variation D (Prize Variant). Frame the prize as "Win $75 in skincare" instead of "premium skincare samples" to test price-forward messaging. This appeals to the price-conscious segment. Keep layout and colors from Variation A.
```

**Variation E (Layout Variant):**

```
[VARIATION] This is Variation E (Layout Variant). Invert the layout: logo on the right, scratch area enlarged in the center, CTA (text) on the left reading "Scratch Here". Test whether centering the scratch area increases perceived interactivity.
```

### Expected Output for Scratch-to-Win State:

After API calls complete, results would include:

```json
{
  "bannerState": "SCRATCH_TO_WIN",
  "format": { "width": 320, "height": 50, "name": "Mobile Banner" },
  "variations": [
    {
      "id": "var_a_320x50_scratch",
      "variation": "A",
      "imageUrl": "data:image/png;base64,[base64_data]",
      "prompt": "[full_base_prompt]",
      "qualityScore": 0.92,
      "timestamp": "2026-03-23T14:32:15Z"
    },
    {
      "id": "var_b_320x50_scratch",
      "variation": "B",
      "imageUrl": "data:image/png;base64,[base64_data]",
      "prompt": "[variation_b_prompt]",
      "qualityScore": 0.89,
      "timestamp": "2026-03-23T14:32:18Z"
    },
    {
      "id": "var_c_320x50_scratch",
      "variation": "C",
      "imageUrl": "data:image/png;base64,[base64_data]",
      "prompt": "[variation_c_prompt]",
      "qualityScore": 0.91,
      "timestamp": "2026-03-23T14:32:21Z"
    },
    {
      "id": "var_d_320x50_scratch",
      "variation": "D",
      "imageUrl": "data:image/png;base64,[base64_data]",
      "prompt": "[variation_d_prompt]",
      "qualityScore": 0.88,
      "timestamp": "2026-03-23T14:32:24Z"
    },
    {
      "id": "var_e_320x50_scratch",
      "variation": "E",
      "imageUrl": "data:image/png;base64,[base64_data]",
      "prompt": "[variation_e_prompt]",
      "qualityScore": 0.85,
      "timestamp": "2026-03-23T14:32:27Z"
    }
  ]
}
```

### Frontend Display:

The Creative Studio would display these 5 variations side-by-side for comparison:

```
[Variation A Control]  [Variation B Copy]  [Variation C Color]  [Variation D Prize]  [Variation E Layout]
[thumbnail image]      [thumbnail image]   [thumbnail image]    [thumbnail image]    [thumbnail image]
Quality: 92%           Quality: 89%        Quality: 91%         Quality: 88%         Quality: 85%
```

User can select the highest-performing variation for deployment or request regeneration of specific variations.

### Complete Campaign Generation:

For all 4 banner states x 2 formats:

```
Scratch-to-Win (320x50) - 5 variations - 5 images
Scratch-to-Win (300x250) - 5 variations - 5 images
Win Banner (320x50) - 5 variations - 5 images
Win Banner (300x250) - 5 variations - 5 images
Lose Banner (320x50) - 5 variations - 5 images
Lose Banner (300x250) - 5 variations - 5 images
Brand Reveal (320x50) - 5 variations - 5 images
Brand Reveal (300x250) - 5 variations - 5 images

Total: 40 generated images
Estimated cost: $1.20 - $2.40 (at $0.03-0.06 per image)
Estimated generation time: 2-3 minutes
```

User sees all variations grouped by state and format, can compare, select favorites, and export to campaign.

---

## 10. Integration Checklist

Use this checklist when implementing the Nano Banana module:

- [ ] Environment variable configured: `NANO_BANANA_API_KEY`
- [ ] API endpoint and authentication tested
- [ ] Prompt template engine implemented with all 4 state-specific templates
- [ ] Variation modifier logic built (A/B/C/D/E differences)
- [ ] Reference image handling for logos and products
- [ ] Format-specific layout guidance for all 8+ banner sizes
- [ ] Quality validation checks implemented (legibility, contrast, aspect ratio)
- [ ] Retry logic with exponential backoff
- [ ] Rate limit handling and batch processing queue
- [ ] Error messages user-friendly and actionable
- [ ] Cost estimation displayed to user before generation
- [ ] Progress indicator showing generation status
- [ ] Timeout handling at 30 seconds per image
- [ ] Placeholder fallback for failed generations
- [ ] Results stored with full metadata (prompt, variation, timestamp)
- [ ] Frontend comparison UI for selecting best variations
- [ ] Export functionality to prepare images for campaign deployment

---

**Document Version History:**

- **Version 1.0** (March 23, 2026): Initial comprehensive guide. Complete prompt templates, error handling, cost estimation, and example workflow.
- **Version 1.1** (March 23, 2026): Added detailed prompt construction rules, format-specific adaptations table, quality control matrix, and integration checklist.
