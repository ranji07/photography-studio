
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent

PUBLIC_PAGES = [
    "index.html",
    "404.html",
    "pages/portfolio.html",
    "pages/films.html",
    "pages/about.html",
    "pages/contact.html",
    "pages/stories.html",
    "pages/project.html",
    "pages/showreel.html",
    "pages/booking.html",
    "pages/client-guide.html",
    "pages/client-gallery.html",
]


class StylesheetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stylesheets = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "link":
            return

        attributes = dict(attrs)
        rel = attributes.get("rel", "").lower().split()
        href = attributes.get("href", "").strip()

        if "stylesheet" in rel and href:
            self.stylesheets.append(href)


def is_external(href):
    return bool(urlsplit(href).scheme or href.startswith("//"))


def resolve_local_css(page, href):
    css_path = urlsplit(href).path
    return (ROOT / page).parent.joinpath(css_path).resolve()


def check_page(relative_page):
    page = ROOT / relative_page

    print(f"\n--- {relative_page} ---")

    if not page.exists():
        print("FAIL: HTML file not found")
        return False

    parser = StylesheetParser()
    parser.feed(page.read_text(encoding="utf-8"))

    local_stylesheets = [
        href for href in parser.stylesheets
        if not is_external(href)
    ]

    missing_files = []

    for href in local_stylesheets:
        target = resolve_local_css(relative_page, href)

        if not target.exists():
            missing_files.append(href)
            print(f"FAIL: Missing CSS file: {href}")

    shared_theme = next(
        (
            href for href in local_stylesheets
            if Path(urlsplit(href).path).name == "luxury-theme.css"
        ),
        None
    )

    if not shared_theme:
        print("FAIL: luxury-theme.css is not linked")
        return False

    print(f"PASS: Shared theme linked: {shared_theme}")

    if relative_page == "pages/portfolio.html":
        portfolio_theme_index = next(
            (
                i for i, href in enumerate(local_stylesheets)
                if Path(urlsplit(href).path).name == "portfolio-luxury.css"
            ),
            None
        )

        shared_theme_index = local_stylesheets.index(shared_theme)

        if (
            portfolio_theme_index is not None
            and shared_theme_index < portfolio_theme_index
            and portfolio_theme_index == len(local_stylesheets) - 1
        ):
            print("PASS: Portfolio-specific theme loads after shared theme")
        else:
            print("WARNING: Check portfolio-luxury.css order")
    else:
        if local_stylesheets[-1] == shared_theme:
            print("PASS: Shared theme is the last local stylesheet")
        else:
            print("WARNING: Another local stylesheet loads after luxury-theme.css")

    return not missing_files


if __name__ == "__main__":
    results = [check_page(page) for page in PUBLIC_PAGES]

    print("\n===================================")
    print(f"Pages checked: {len(results)}")
    print(f"Pages with no missing CSS: {sum(results)}")
    print(f"Pages requiring attention: {len(results) - sum(results)}")
    print("===================================")
