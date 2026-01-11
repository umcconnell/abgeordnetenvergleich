from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to index.html...")
        page.goto("http://localhost:8080/index.html")

        # Wait for input to be enabled
        page.wait_for_selector("#searchInput:not([disabled])", timeout=10000)

        # Select 21. Bundestag (161)
        page.select_option("#legislatureSelect", "161")

        # Search for Homburg
        page.fill("#searchInput", "Homburg")
        page.wait_for_selector("#suggestionsList li", timeout=5000)
        page.click("#suggestionsList li:first-child")

        # Submit
        with page.expect_navigation(url="**/constituency.html?*", timeout=5000):
            page.click("#searchButton", force=True)

        print(f"Navigated to: {page.url}")

        # Wait for content to load
        # Wait for MPs list to have items
        page.wait_for_selector("#mpsList li", timeout=10000)

        # Take screenshot
        screenshot_path = "/home/jules/verification/final_verification.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
