from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        print("Navigating to index.html...")
        page.goto("http://localhost:8080/index.html")

        # Wait for input to be enabled (data loaded)
        print("Waiting for data load...")
        page.wait_for_selector("#searchInput:not([disabled])", timeout=10000)

        # --- Test 1: 21. Bundestag (161) ---
        print("\n--- Testing 21. Bundestag (161) ---")

        # Check if default is 161
        val = page.input_value("#legislatureSelect")
        if val != "161":
            print(f"FAILURE: Default selection should be 161, got {val}")
        else:
            print("Default selection is 161.")

        # Check for warning
        if page.is_visible("#mapWarning"):
            print("Map warning is visible (Expected for 161).")
        else:
            print("FAILURE: Map warning should be visible for 161.")

        # Search for Homburg
        print("Searching for 'Homburg'...")
        page.fill("#searchInput", "Homburg")
        page.wait_for_selector("#suggestionsList li", timeout=5000)

        print("Clicking suggestion...")
        page.click("#suggestionsList li:first-child")

        # Click submit
        print("Submitting...")
        with page.expect_navigation(url="**/constituency.html?*", timeout=5000):
            page.click("#searchButton", force=True)

        print(f"Navigated to: {page.url}")
        if "period=161" in page.url:
            print("SUCCESS: URL contains period=161")
        else:
            print("FAILURE: URL does not contain period=161")

        # --- Test 2: 20. Bundestag (132) ---
        print("\n--- Testing 20. Bundestag (132) ---")
        page.goto("http://localhost:8080/index.html")

        # Select 132
        page.select_option("#legislatureSelect", "132")

        # Wait for input reload
        print("Waiting for reload...")
        page.wait_for_selector("#searchInput:not([disabled])", timeout=10000)

        # Check warning hidden
        if not page.is_visible("#mapWarning"):
            print("Map warning is hidden (Expected for 132).")
        else:
            print("FAILURE: Map warning should be hidden for 132.")

        # Search for Homburg
        print("Searching for 'Homburg'...")
        page.fill("#searchInput", "Homburg")
        page.wait_for_selector("#suggestionsList li", timeout=5000)

        print("Clicking suggestion...")
        page.click("#suggestionsList li:first-child")

        # Click submit
        print("Submitting...")
        with page.expect_navigation(url="**/constituency.html?*", timeout=5000):
            page.click("#searchButton", force=True)

        print(f"Navigated to: {page.url}")
        if "period=132" in page.url:
            print("SUCCESS: URL contains period=132")
        else:
            print("FAILURE: URL does not contain period=132")

        browser.close()

if __name__ == "__main__":
    run()
