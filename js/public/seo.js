// ==========================================
// STEP 24 - SEO ENHANCEMENTS
// ==========================================

(function () {
    "use strict";

    const origin = window.location.origin;
    const pathname = window.location.pathname;

    function getMeta(selector, attribute, name, content) {
        if (!content) return;

        let element = document.querySelector(selector);

        if (!element) {
            element = document.createElement("meta");
            element.setAttribute(attribute, name);
            document.head.appendChild(element);
        }

        element.setAttribute("content", content);
    }

    // --------------------------------------
    // 1. CANONICAL URL
    // --------------------------------------

    const canonical = new URL(pathname, origin);

    // Individual project stories need their slug preserved.
    if (pathname.endsWith("/project.html")) {
        const slug = new URLSearchParams(
            window.location.search
        ).get("slug");

        if (slug) {
            canonical.searchParams.set("slug", slug);
        }
    }

    let canonicalElement = document.querySelector(
        'link[rel="canonical"]'
    );

    if (!canonicalElement) {
        canonicalElement = document.createElement("link");
        canonicalElement.rel = "canonical";
        document.head.appendChild(canonicalElement);
    }

    canonicalElement.href = canonical.href;


    // --------------------------------------
    // 2. SOCIAL SHARING METADATA
    // --------------------------------------

    const title = document.title || "Photography & Films Studio";

    const descriptionElement = document.querySelector(
        'meta[name="description"]'
    );

    const description = descriptionElement
        ? descriptionElement.content
        : "Photography, wedding films and destination stories.";

    const socialImage =
        `${origin}/assets/images/social-preview.jpg`;

    getMeta(
        'meta[property="og:type"]',
        "property",
        "og:type",
        "website"
    );

    getMeta(
        'meta[property="og:title"]',
        "property",
        "og:title",
        title
    );

    getMeta(
        'meta[property="og:description"]',
        "property",
        "og:description",
        description
    );

    getMeta(
        'meta[property="og:url"]',
        "property",
        "og:url",
        canonical.href
    );

    getMeta(
        'meta[property="og:image"]',
        "property",
        "og:image",
        socialImage
    );

    getMeta(
        'meta[name="twitter:card"]',
        "name",
        "twitter:card",
        "summary_large_image"
    );

    getMeta(
        'meta[name="twitter:title"]',
        "name",
        "twitter:title",
        title
    );

    getMeta(
        'meta[name="twitter:description"]',
        "name",
        "twitter:description",
        description
    );

    getMeta(
        'meta[name="twitter:image"]',
        "name",
        "twitter:image",
        socialImage
    );


    // --------------------------------------
    // 3. HOMEPAGE ORGANIZATION STRUCTURED DATA
    // --------------------------------------

    const isHomepage =
        pathname === "/" ||
        pathname.endsWith("/index.html");

    if (!isHomepage) {
        return;
    }

    const studioName =
        typeof STUDIO_NAME !== "undefined"
            ? STUDIO_NAME
            : "Photography & Films Studio";

    const studioEmail =
        typeof STUDIO_EMAIL !== "undefined"
            ? STUDIO_EMAIL
            : "";

    const studioPhone =
        typeof STUDIO_PHONE !== "undefined"
            ? STUDIO_PHONE
            : "";

    const studioInstagram =
        typeof STUDIO_INSTAGRAM_URL !== "undefined"
            ? STUDIO_INSTAGRAM_URL
            : "";

    const organization = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        "name": studioName,
        "url": origin,
        "description": description,
        "knowsAbout": [
            "Wedding photography",
            "Destination wedding photography",
            "Wedding films",
            "Portrait photography",
            "Event photography"
        ]
    };

    const socialProfiles = [];

    if (studioInstagram) {
        try {
            const instagramUrl = new URL(studioInstagram);

            if (
                instagramUrl.protocol === "https:" &&
                (
                    instagramUrl.hostname === "instagram.com" ||
                    instagramUrl.hostname === "www.instagram.com"
                )
            ) {
                socialProfiles.push(instagramUrl.href);
            }

        } catch (error) {
            console.warn("Invalid studio Instagram URL.");
        }
    }

    if (socialProfiles.length) {
        organization.sameAs = socialProfiles;
    }

    if (studioEmail || studioPhone) {
        organization.contactPoint = {
            "@type": "ContactPoint",
            "contactType": "customer enquiries"
        };

        if (studioEmail) {
            organization.contactPoint.email = studioEmail;
        }

        if (studioPhone) {
            organization.contactPoint.telephone = studioPhone;
        }
    }

    let jsonLd = document.querySelector(
        'script[data-site-organization="true"]'
    );

    if (!jsonLd) {
        jsonLd = document.createElement("script");
        jsonLd.type = "application/ld+json";
        jsonLd.dataset.siteOrganization = "true";
        document.head.appendChild(jsonLd);
    }

    jsonLd.textContent = JSON.stringify(organization);

})();