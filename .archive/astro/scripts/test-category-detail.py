#!/usr/bin/env python3
"""
Test script to check category detail pages.
"""

from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Check Autonomic page (should have lots of WHOOP data)
        print("Checking Autonomic category...")
        page.goto('http://localhost:4322/autonomic')
        page.wait_for_load_state('networkidle')
        time.sleep(1)
        page.screenshot(path='/tmp/autonomic.png', full_page=True)
        print("Screenshot saved: /tmp/autonomic.png")

        # Check Metabolic page
        print("\nChecking Metabolic category...")
        page.goto('http://localhost:4322/metabolic')
        page.wait_for_load_state('networkidle')
        time.sleep(1)
        page.screenshot(path='/tmp/metabolic.png', full_page=True)
        print("Screenshot saved: /tmp/metabolic.png")

        browser.close()
        print("\n✅ Done!")

if __name__ == "__main__":
    main()
