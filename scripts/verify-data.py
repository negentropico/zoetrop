#!/usr/bin/env python3
"""Verify seed data loads correctly and show summary."""

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
        page.wait_for_selector('text=Successfully loaded', timeout=60000)
        print("   Seed data loaded!")

        # Step 2: Check dashboard
        print("\n2. Checking dashboard...")
        page.goto('http://localhost:4322/')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path='/tmp/dashboard-7k.png', full_page=True)
        print("   Screenshot: /tmp/dashboard-7k.png")

        # Step 3: Check all-metrics page
        print("\n3. Checking all-metrics page...")
        page.goto('http://localhost:4322/all-metrics/')
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Get metrics count
        try:
            total_text = page.locator('text=/\\d+ total metrics/').first.text_content()
            print(f"   {total_text}")
        except:
            print("   Could not find total metrics text")

        page.screenshot(path='/tmp/all-metrics-7k.png', full_page=True)
        print("   Screenshot: /tmp/all-metrics-7k.png")

        # Step 4: Check autonomic category (should have the most data)
        print("\n4. Checking autonomic category...")
        page.goto('http://localhost:4322/autonomic/')
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path='/tmp/autonomic.png', full_page=True)
        print("   Screenshot: /tmp/autonomic.png")

        browser.close()
        print("\n✅ All verifications completed!")
        print("\nSummary:")
        print("  - Dashboard: /tmp/dashboard-7k.png")
        print("  - All Metrics: /tmp/all-metrics-7k.png")
        print("  - Autonomic: /tmp/autonomic.png")

if __name__ == "__main__":
    main()
