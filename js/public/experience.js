"use strict";

(function () {

    // ==========================================
    // INITIALIZE EXPERIENCE ENHANCEMENTS
    // ==========================================

    document.addEventListener(
        "DOMContentLoaded",
        initializeExperience
    );


    function initializeExperience() {

        createScrollProgress();

        setupScrollReveals();

        setupSubpageNavigation();

        setupActiveNavigation();

        setupBookingCTA();

    }


    // ==========================================
    // 1. SCROLL PROGRESS
    // ==========================================

    function createScrollProgress() {

        const progress = document.createElement("div");

        progress.className = "site-scroll-progress";

        progress.setAttribute("aria-hidden", "true");


        const bar = document.createElement("span");

        progress.appendChild(bar);

        document.body.prepend(progress);


        // Use native CSS scroll timelines when supported.

        const nativeSupported =
            CSS.supports &&
            CSS.supports("animation-timeline: scroll()");


        if (nativeSupported) {
            return;
        }


        // Fallback for browsers without scroll timelines.

        let scheduled = false;


        function updateProgress() {

            const documentHeight =
                document.documentElement.scrollHeight;

            const viewportHeight = window.innerHeight;

            const scrollable =
                documentHeight - viewportHeight;


            const percentage = scrollable > 0
                ? window.scrollY / scrollable
                : 0;


            bar.style.transform =
                `scaleX(${Math.min(1, Math.max(0, percentage))})`;

            scheduled = false;

        }


        window.addEventListener("scroll", function () {

            if (!scheduled) {

                window.requestAnimationFrame(
                    updateProgress
                );

                scheduled = true;

            }

        }, { passive: true });


        window.addEventListener(
            "resize",
            updateProgress,
            { passive: true }
        );


        updateProgress();

    }


    // ==========================================
    // 2. SCROLL REVEALS
    // ==========================================

    function setupScrollReveals() {

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


        if (
            reducedMotion ||
            !("IntersectionObserver" in window)
        ) {
            return;
        }


        const selectors = [

            ".home-intro",

            ".home-section-heading",

            ".home-featured-card",

            ".home-center-heading",

            ".home-category-card",

            ".home-film-card",

            ".home-service-card",

            ".home-about-image",

            ".home-about-content",

            ".testimonial-card",

            ".home-booking",

            ".portfolio-hero",

            ".portfolio-card",

            ".films-heading",

            ".film-card",

            ".about-hero",

            ".about-image-section",

            ".about-story-heading",

            ".about-story-content",

            ".about-approach-grid article",

            ".about-services",

            ".about-cta",

            ".contact-hero",

            ".contact-information",

            ".contact-form-panel"

        ];


        const selector = selectors.join(", ");


        const observer = new IntersectionObserver(

            function (entries) {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "is-revealed"
                        );

                        observer.unobserve(entry.target);

                    }

                });

            },

            {
                threshold: 0.08,
                rootMargin: "0px 0px -35px 0px"
            }

        );


        // Set initial elements.

        document
            .querySelectorAll(selector)
            .forEach(element => {

                element.setAttribute(
                    "data-reveal",
                    ""
                );

                observer.observe(element);

            });


        // Support media cards inserted asynchronously.

        const mutationObserver = new MutationObserver(
            function (mutations) {

                mutations.forEach(mutation => {

                    mutation.addedNodes.forEach(node => {

                        if (node.nodeType !== 1) {
                            return;
                        }


                        if (node.matches(selector)) {

                            node.setAttribute(
                                "data-reveal",
                                ""
                            );

                            observer.observe(node);

                        }


                        node.querySelectorAll(selector)
                            .forEach(element => {

                                element.setAttribute(
                                    "data-reveal",
                                    ""
                                );

                                observer.observe(element);

                            });

                    });

                });

            }
        );


        mutationObserver.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );


        document.documentElement.classList.add(
            "has-experience-motion"
        );

    }


    // ==========================================
    // 3. SUBPAGE MOBILE NAVIGATION
    // ==========================================

    function setupSubpageNavigation() {

        // Homepage already has its own mobile menu.

        if (document.body.classList.contains("home-page")) {
            return;
        }


        const header = document.querySelector("body:not(.home-page) header");

        if (!header) {
            return;
        }


        const navigation = header.querySelector("nav");

        if (!navigation) {
            return;
        }


        // Prevent duplicate buttons.

        if (
            header.querySelector(".experience-menu-toggle")
        ) {
            return;
        }


        header.classList.add("experience-site-header");

        navigation.classList.add(
            "experience-mobile-navigation"
        );


        if (!navigation.id) {

            navigation.id = "experienceNavigation";

        }


        const button = document.createElement("button");

        button.type = "button";

        button.className = "experience-menu-toggle";

        button.textContent = "MENU";

        button.setAttribute(
            "aria-expanded",
            "false"
        );

        button.setAttribute(
            "aria-controls",
            navigation.id
        );

        button.setAttribute(
            "aria-label",
            "Toggle navigation"
        );


        header.insertBefore(
            button,
            navigation
        );


        function closeMenu() {

            navigation.classList.remove(
                "is-open"
            );

            button.setAttribute(
                "aria-expanded",
                "false"
            );

            button.textContent = "MENU";

        }


        button.addEventListener("click", function () {

            const isOpen =
                navigation.classList.contains("is-open");


            navigation.classList.toggle(
                "is-open",
                !isOpen
            );


            button.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );


            button.textContent =
                isOpen ? "MENU" : "CLOSE";

        });


        // Close the menu after selecting a link.

        navigation.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.closest("a")
                ) {
                    closeMenu();
                }

            }
        );


        // Close when clicking outside.

        document.addEventListener(
            "click",
            function (event) {

                if (
                    !header.contains(event.target)
                ) {
                    closeMenu();
                }

            }
        );


        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {
                    closeMenu();
                }

            }
        );


        // Return to desktop navigation above 760px.

        window.addEventListener(
            "resize",
            function () {

                if (window.innerWidth > 760) {

                    closeMenu();

                }

            },
            { passive: true }
        );

    }


    // ==========================================
    // 4. ACTIVE NAVIGATION
    // ==========================================

    function setupActiveNavigation() {

        const navigation = document.querySelector("header nav");

        if (!navigation) {
            return;
        }


        const currentPath =
            normalizePath(window.location.pathname);


        navigation.querySelectorAll("a[href]")
            .forEach(link => {

                const linkURL = new URL(
                    link.href,
                    window.location.href
                );


                const linkPath =
                    normalizePath(linkURL.pathname);


                if (linkPath === currentPath) {

                    link.setAttribute(
                        "aria-current",
                        "page"
                    );

                } else {

                    link.removeAttribute(
                        "aria-current"
                    );

                }

            });

    }


    function normalizePath(path) {

        let normalized = path.replace(/\/+$/, "");


        if (
            normalized === "" ||
            normalized.endsWith("/index.html")
        ) {

            normalized = normalized.replace(
                /\/index\.html$/,
                ""
            );

        }


        return normalized || "/";

    }


    // ==========================================
    // 5. BOOKING CTA
    // ==========================================

    function setupBookingCTA() {

        const path = window.location.pathname;

        const isPagesDirectory =
            /\/pages\//.test(path);


        const isContactPage =
            /\/contact\.html$/.test(path);


        if (
            !isPagesDirectory ||
            isContactPage
        ) {
            return;
        }


        // Avoid duplicates.

        if (
            document.querySelector(".experience-booking-pill")
        ) {
            return;
        }


        const link = document.createElement("a");

        link.href = "contact.html";

        link.className = "experience-booking-pill";

        link.textContent = "CHECK AVAILABILITY →";

        link.setAttribute(
            "aria-label",
            "Check photography studio availability"
        );


        document.body.appendChild(link);

    }

})();