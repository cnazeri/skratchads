"""
app_store_scraper.py
SkratchAds Lead Generation - iTunes Search API Scraper

Pulls free apps likely monetizing with ads from multiple App Store categories.
No API key or authentication required - uses Apple's public iTunes Search API.
Outputs results to leads_raw.csv in the same folder.

Target: 150-300 leads per run
"""

import requests
import csv
import time
import os
from datetime import datetime

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

# App Store category IDs to scrape
# https://affiliate.itunes.apple.com/resources/documentation/genre-mapping/
CATEGORIES = {
    "Games":             "6014",
    "Utilities":         "6002",
    "Productivity":      "6007",
    "Entertainment":     "6016",
    "Social_Networking": "6005",
}

# Number of results to pull per category (max 200 per API call)
RESULTS_PER_CATEGORY = 200

# Country code for the App Store to query
COUNTRY = "us"

# Output file path (same folder as this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "leads_raw.csv")

# Polite delay between API requests (seconds)
REQUEST_DELAY = 1.5

# Base URL for the iTunes Search API
ITUNES_API_BASE = "https://itunes.apple.com/search"


# ─────────────────────────────────────────────
# HELPER: BUILD API REQUEST URL
# ─────────────────────────────────────────────

def build_request_params(genre_id, limit=200):
    """
    Builds the query parameters for the iTunes Search API call.
    Filters for iOS software (apps) only, in a specific genre.
    """
    return {
        "media":       "software",       # We want apps, not music/movies
        "entity":      "software",       # Return software results
        "genreId":     genre_id,         # Filter by App Store category
        "country":     COUNTRY,          # US App Store
        "limit":       limit,            # Max results per call (API cap: 200)
        "lang":        "en_us",          # English results
    }


# ─────────────────────────────────────────────
# HELPER: FETCH APPS FROM API
# ─────────────────────────────────────────────

def fetch_apps(category_name, genre_id):
    """
    Calls the iTunes Search API for a given category.
    Returns a list of app result dicts, or empty list on failure.
    """
    params = build_request_params(genre_id, limit=RESULTS_PER_CATEGORY)

    print(f"  Fetching {category_name} (genreId={genre_id})...")

    try:
        response = requests.get(ITUNES_API_BASE, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        print(f"    -> Retrieved {len(results)} apps")
        return results

    except requests.exceptions.RequestException as e:
        print(f"    [ERROR] Request failed for {category_name}: {e}")
        return []

    except ValueError as e:
        print(f"    [ERROR] Failed to parse JSON for {category_name}: {e}")
        return []


# ─────────────────────────────────────────────
# HELPER: FILTER APPS LIKELY TO RUN ADS
# ─────────────────────────────────────────────

def is_likely_ad_monetized(app):
    """
    Filters for apps that are likely running banner/interstitial ads.
    We want free apps - these are the ones that monetize via ads.

    Criteria:
    - Price = 0 (free download)
    - Ideally has in-app purchases too (common in ad-supported apps)
    """
    price = app.get("price", 1)  # Default to paid if missing

    # Only free apps - paid apps rarely run banner ads
    if price != 0:
        return False

    return True


# ─────────────────────────────────────────────
# HELPER: EXTRACT LEAD DATA FROM APP RECORD
# ─────────────────────────────────────────────

def extract_lead(app, category_name):
    """
    Pulls the relevant fields from an app result dict.
    Returns a flat dict ready for CSV export.
    """
    # App metadata
    app_name        = app.get("trackName", "").strip()
    developer_name  = app.get("artistName", "").strip()
    app_store_url   = app.get("trackViewUrl", "").strip()
    seller_url      = app.get("sellerUrl", "").strip()    # Developer website (often has contact)
    bundle_id       = app.get("bundleId", "").strip()
    price           = app.get("price", 0)
    has_iap         = "Yes" if app.get("isGameCenterEnabled") or app.get("inAppPurchases") else "Unknown"
    rating_count    = app.get("userRatingCount", 0)
    avg_rating      = app.get("averageUserRating", "")
    primary_genre   = app.get("primaryGenreName", category_name)
    description     = app.get("description", "")[:200]   # First 200 chars only
    developer_id    = app.get("artistId", "")
    developer_url   = app.get("artistViewUrl", "").strip()

    # Infer contact email from seller URL domain where possible
    # (Real email scraping requires additional tools like Hunter.io)
    contact_hint = ""
    if seller_url:
        try:
            from urllib.parse import urlparse
            domain = urlparse(seller_url).netloc.replace("www.", "")
            contact_hint = f"Try: contact@{domain} or support@{domain}"
        except Exception:
            contact_hint = ""

    return {
        "app_name":        app_name,
        "developer_name":  developer_name,
        "developer_id":    developer_id,
        "bundle_id":       bundle_id,
        "category":        category_name,
        "primary_genre":   primary_genre,
        "price":           price,
        "has_iap":         has_iap,
        "rating_count":    rating_count,
        "avg_rating":      avg_rating,
        "app_store_url":   app_store_url,
        "developer_url":   developer_url,
        "seller_url":      seller_url,
        "contact_hint":    contact_hint,
        "description_snippet": description,
        "scraped_date":    datetime.today().strftime("%Y-%m-%d"),
    }


# ─────────────────────────────────────────────
# MAIN: RUN SCRAPER AND WRITE CSV
# ─────────────────────────────────────────────

def main():
    print("=" * 55)
    print("  SkratchAds Lead Scraper - iTunes Search API")
    print(f"  Output: {OUTPUT_FILE}")
    print("=" * 55)

    all_leads = []
    seen_bundle_ids = set()  # Deduplicate across categories

    # Loop through each category and fetch apps
    for category_name, genre_id in CATEGORIES.items():
        print(f"\n[Category] {category_name}")

        apps = fetch_apps(category_name, genre_id)

        category_leads = 0
        for app in apps:
            # Skip non-ad-monetized apps
            if not is_likely_ad_monetized(app):
                continue

            # Skip duplicates (same app appearing in multiple categories)
            bundle_id = app.get("bundleId", "")
            if bundle_id and bundle_id in seen_bundle_ids:
                continue
            seen_bundle_ids.add(bundle_id)

            lead = extract_lead(app, category_name)
            all_leads.append(lead)
            category_leads += 1

        print(f"    -> {category_leads} leads added from {category_name}")

        # Polite delay to avoid hammering the API
        time.sleep(REQUEST_DELAY)

    # ─────────────────────────────────────────
    # WRITE TO CSV
    # ─────────────────────────────────────────

    if not all_leads:
        print("\n[WARNING] No leads collected. Check your internet connection.")
        return

    fieldnames = [
        "app_name", "developer_name", "developer_id", "bundle_id",
        "category", "primary_genre", "price", "has_iap",
        "rating_count", "avg_rating",
        "app_store_url", "developer_url", "seller_url",
        "contact_hint", "description_snippet", "scraped_date",
    ]

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_leads)

    print("\n" + "=" * 55)
    print(f"  DONE. {len(all_leads)} total leads written to:")
    print(f"  {OUTPUT_FILE}")
    print("=" * 55)
    print("\nNext steps:")
    print("  1. Open leads_raw.csv and review quality")
    print("  2. Add developer emails via Hunter.io or Apollo.io")
    print("  3. Import cleaned list into Instantly.ai for sequencing")


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    main()
