#!/usr/bin/env python3
"""
Test script to load seed data and verify all-metrics page.
"""

from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Step 1: Load seed data
        print("1. Loading seed data...")
        page.goto('http://localhost:4322/load-seed.html')
        page.wait_for_load_state('networkidle')
        page.click('button:has-text("Load Seed Data")')
        page.wait_for_selector('text=Successfully loaded', timeout=30000)
        print("   Seed data loaded!")

        # Step 2: Check dashboard
        print("\n2. Checking dashboard...")
        page.goto('http://localhost:4322/')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path='/tmp/dashboard-updated.png', full_page=True)
        print("   Screenshot: /tmp/dashboard-updated.png")

        # Step 3: Check all-metrics page
        print("\n3. Checking all-metrics page...")
        page.goto('http://localhost:4322/all-metrics/')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path='/tmp/all-metrics.png', full_page=True)
        print("   Screenshot: /tmp/all-metrics.png")

        # Get metrics count from page
        total_text = page.locator('text=/\\d+ total metrics/').first.text_content()
        print(f"   {total_text}")

        # Step 4: Test search
        print("\n4. Testing search filter...")
        page.fill('input[placeholder="Search metrics..."]', 'HRV')
        time.sleep(1)
        page.screenshot(path='/tmp/all-metrics-search.png', full_page=True)
        print("   Screenshot: /tmp/all-metrics-search.png")

        # Step 5: Test status filter
        print("\n5. Testing status filter...")
        page.fill('input[placeholder="Search metrics..."]', '')
        page.select_option('select', value='optimal')
        time.sleep(1)
        page.screenshot(path='/tmp/all-metrics-optimal.png', full_page=True)
        print("   Screenshot: /tmp/all-metrics-optimal.png")

        browser.close()
        print("\n All tests completed!")

if __name__ == "__main__":
    main()
