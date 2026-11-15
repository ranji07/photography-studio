// ==========================================
// STEP 22 - CLIENT GUIDE
// ==========================================

(function () {
    "use strict";

    const db = window.supabaseClient;

    const testimonialGrid = document.getElementById(
        "guide-testimonial-grid"
    );

    const testimonialStatus = document.getElementById(
        "guide-testimonial-status"
    );

    const faqSearch = document.getElementById(
        "guide-faq-search"
    );

    const faqItems = [
        ...document.querySelectorAll(".guide-faq-item")
    ];

    const faqFilters = [
        ...document.querySelectorAll("[data-faq-filter]")
    ];

    const faqEmpty = document.getElementById(
        "guide-faq-empty"
    );

    let activeFaqCategory = "all";


    // --------------------------------------
    // TESTIMONIAL RENDERING
    // --------------------------------------

    function showTestimonialMessage(message) {
        testimonialGrid.innerHTML = "";

        const empty = document.createElement("div");
        empty.className = "guide-empty";
        empty.textContent = message;

        testimonialGrid.appendChild(empty);
    }


    function createStars(rating) {
        const wrapper = document.createElement("div");

        wrapper.className = "guide-testimonial-rating";

        wrapper.setAttribute(
            "aria-label",
            `${rating} out of 5 stars`
        );

        // Stars represent the rating supplied by the client
        // and approved for display by the studio.
        wrapper.textContent =
            "★".repeat(rating) +
            "☆".repeat(5 - rating);

        return wrapper;
    }


    function createTestimonialCard(item) {
        const article = document.createElement("article");

        article.className = "guide-testimonial-card";

        const quoteMark = document.createElement("span");
        quoteMark.className = "guide-testimonial-quote-mark";
        quoteMark.setAttribute("aria-hidden", "true");
        quoteMark.textContent = "“";

        const quote = document.createElement("blockquote");
        quote.className = "guide-testimonial-text";
        quote.textContent = item.quote;

        const client = document.createElement("div");
        client.className = "guide-testimonial-client";

        const clientName = document.createElement("strong");
        clientName.textContent = item.client_name;

        const details = document.createElement("span");

        details.textContent = [
            item.event_type,
            item.location
        ].filter(Boolean).join(" · ");

        if (item.rating !== null && item.rating !== undefined) {
            article.appendChild(createStars(Number(item.rating)));
        }

        client.append(clientName, details);

        article.append(quoteMark, quote, client);

        return article;
    }


    async function loadTestimonials() {
        if (!db) {
            showTestimonialMessage(
                "Client feedback is temporarily unavailable."
            );

            return;
        }

        try {
            const { data, error } = await db
                .from("client_testimonials")
                .select(`
                    id,
                    client_name,
                    quote,
                    event_type,
                    location,
                    rating,
                    is_featured,
                    display_order,
                    created_at
                `)
                .eq("is_published", true)
                .eq("publication_consent", true)
                .order("is_featured", { ascending: false })
                .order("display_order", { ascending: true })
                .order("created_at", { ascending: false })
                .limit(12);

            if (error) {
                throw error;
            }

            testimonialGrid.innerHTML = "";

            if (!data || data.length === 0) {
                showTestimonialMessage(
                    "Client experiences will be shared here as they become available."
                );

                return;
            }

            const fragment = document.createDocumentFragment();

            data.forEach(item => {
                fragment.appendChild(
                    createTestimonialCard(item)
                );
            });

            testimonialGrid.appendChild(fragment);

            testimonialStatus.textContent =
                `${data.length} published client ${data.length === 1 ? "experience" : "experiences"}.`;

        } catch (error) {
            console.error("Testimonial loading error:", error);

            showTestimonialMessage(
                "Client feedback could not be loaded. Please try again later."
            );
        }
    }


    // --------------------------------------
    // FAQ FILTERING AND SEARCH
    // --------------------------------------

    function filterFaqs() {
        const searchText = faqSearch.value
            .trim()
            .toLowerCase();

        let visibleCount = 0;

        faqItems.forEach(item => {
            const categoryMatches =
                activeFaqCategory === "all" ||
                item.dataset.category === activeFaqCategory;

            const textMatches =
                item.textContent.toLowerCase().includes(searchText);

            const isVisible = categoryMatches && textMatches;

            item.hidden = !isVisible;

            if (!isVisible) {
                item.open = false;
            } else {
                visibleCount++;
            }
        });

        faqEmpty.hidden = visibleCount !== 0;
    }


    faqFilters.forEach(button => {
        button.addEventListener("click", () => {
            activeFaqCategory = button.dataset.faqFilter;

            faqFilters.forEach(item => {
                const active =
                    item === button;

                item.classList.toggle("active", active);

                item.setAttribute(
                    "aria-pressed",
                    String(active)
                );
            });

            filterFaqs();
        });
    });


    faqSearch.addEventListener("input", filterFaqs);


    // --------------------------------------
    // INITIALIZE
    // --------------------------------------

    filterFaqs();
    loadTestimonials();

})();