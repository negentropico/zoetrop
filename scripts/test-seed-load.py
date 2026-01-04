#!/usr/bin/env python3
"""
Test script to load seed data and verify dashboard.
"""

from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("1. Loading seed data page...")
        page.goto('http://localhost:4322/load-seed.html')
        page.wait_for_load_state('networkidle')

        print("2. Clicking 'Load Seed Data' button...")
        page.click('button:has-text("Load Seed Data")')

        print("3. Waiting for success message...")
        page.wait_for_selector('text=Successfully loaded', timeout=30000)

        # Take screenshot of successful load
        page.screenshot(path='/tmp/seed-loaded.png', full_page=True)
        print("   Screenshot saved: /tmp/seed-loaded.png")

        print("4. Going to dashboard...")
        page.click('button:has-text("Go to Dashboard")')
        page.wait_for_load_state('networkidle')

        # Wait a bit for React to render
        time.sleep(2)

        print("5. Taking dashboard screenshot...")
        page.screenshot(path='/tmp/dashboard.png', full_page=True)
        print("   Screenshot saved: /tmp/dashboard.png")

        # Get some stats from the page
        content = page.content()

        # Check for category cards
        categories = page.locator('[data-testid="category-card"]').count()
        print(f"\n📊 Dashboard Stats:")
        print(f"   Category cards found: {categories}")

        # Try to find metric counts
        metrics_text = page.locator('text=/\\d+ metrics?/i').all_text_contents()
        if metrics_text:
            print(f"   Metrics indicators: {metrics_text[:5]}")

        browser.close()
        print("\n✅ Test completed successfully!")

if __name__ == "__main__":
    main()
