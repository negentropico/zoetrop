#!/usr/bin/env python3
"""
Check localStorage contents.
"""

from playwright.sync_api import sync_playwright
import json

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto('http://localhost:4322/')
        page.wait_for_load_state('networkidle')

        # Get localStorage
        storage = page.evaluate('''() => {
            const data = localStorage.getItem('wellness_tracker_metrics');
            if (!data) return null;
            const parsed = JSON.parse(data);
            return {
                totalMetrics: parsed.metrics?.length || 0,
                lastUpdated: parsed.lastUpdated,
                sampleMetric: parsed.metrics?.[0],
                categories: [...new Set(parsed.metrics?.map(m => m.category) || [])]
            };
        }''')

        print("📦 LocalStorage Contents:")
        if storage:
            print(f"   Total metrics: {storage['totalMetrics']}")
            print(f"   Last updated: {storage['lastUpdated']}")
            print(f"   Categories: {storage['categories']}")
            print(f"\n   Sample metric:")
            print(json.dumps(storage['sampleMetric'], indent=4))
        else:
            print("   No data found!")

        browser.close()

if __name__ == "__main__":
    main()
