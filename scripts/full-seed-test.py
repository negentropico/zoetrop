#!/usr/bin/env python3
"""
Full test: Load seed data and verify dashboard in one session.
"""

from playwright.sync_api import sync_playwright
import json
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Step 1: Load seed data
        print("1️⃣  Loading seed data...")
        page.goto('http://localhost:4322/load-seed.html')
        page.wait_for_load_state('networkidle')
        page.click('button:has-text("Load Seed Data")')
        page.wait_for_selector('text=Successfully loaded', timeout=30000)
        print("   ✅ Seed data loaded")

        # Step 2: Check localStorage
        print("\n2️⃣  Verifying localStorage...")
        storage = page.evaluate('''() => {
            const data = localStorage.getItem('wellness_tracker_metrics');
            if (!data) return null;
            const parsed = JSON.parse(data);
            return {
                totalMetrics: parsed.metrics?.length || 0,
                categories: [...new Set(parsed.metrics?.map(m => m.category) || [])]
            };
        }''')
        print(f"   Total metrics: {storage['totalMetrics']}")
        print(f"   Categories: {storage['categories']}")

        # Step 3: Go to dashboard
        print("\n3️⃣  Navigating to dashboard...")
        page.goto('http://localhost:4322/')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path='/tmp/dashboard-with-data.png', full_page=True)
        print("   📸 Screenshot: /tmp/dashboard-with-data.png")

        # Step 4: Check Autonomic category
        print("\n4️⃣  Checking Autonomic category...")
        page.goto('http://localhost:4322/autonomic')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path='/tmp/autonomic-with-data.png', full_page=True)
        print("   📸 Screenshot: /tmp/autonomic-with-data.png")

        # Get metric count from page
        metric_count = page.locator('text=/\\d+ metrics?/i').first.text_content()
        print(f"   Metrics shown: {metric_count}")

        # Step 5: Check Metabolic category
        print("\n5️⃣  Checking Metabolic category...")
        page.goto('http://localhost:4322/metabolic')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path='/tmp/metabolic-with-data.png', full_page=True)
        print("   📸 Screenshot: /tmp/metabolic-with-data.png")

        browser.close()
        print("\n✅ Test completed!")

if __name__ == "__main__":
    main()
