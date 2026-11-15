"use strict";

document.addEventListener(
    "DOMContentLoaded",
    initializePortfolioCategoryFilters
);


async function initializePortfolioCategoryFilters() {

    const filterContainer = document.getElementById(
        "portfolioCategoryFilters"
    );

    const portfolioGrid = document.getElementById(
        "portfolioGrid"
    );

    if (!filterContainer || !portfolioGrid) {
        return;
    }


    // Read category from homepage navigation.

    const requestedCategoryId =
        new URLSearchParams(window.location.search)
            .get("category");

    let selectedCategoryId = "all";


    // Observe dynamically added portfolio cards.

    const observer = new MutationObserver(function () {

        applyPortfolioFilter();

    });

    observer.observe(portfolioGrid, {
        childList: true,
        subtree: true
    });


    try {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {
            throw new Error("Supabase connection unavailable.");
        }


        // Load available categories.

        const { data: categories, error: categoryError } =
            await supabaseClient
                .from("categories")
                .select("id, name, slug")
                .order("name", { ascending: true });


        if (categoryError) {
            throw categoryError;
        }


        // Load published photography.

        const { data: mediaRows, error: mediaError } =
            await supabaseClient
                .from("media")
                .select("category_id")
                .in("media_type", ["image", "photo"])
                .eq("is_published", true)
                .not("category_id", "is", null);


        if (mediaError) {
            throw mediaError;
        }


        // Identify categories with published photos.

        const availableIds = new Set(
            (mediaRows || []).map(item => item.category_id)
        );


        const availableCategories = (
            categories || []
        ).filter(category =>
            availableIds.has(category.id)
        );


        // Activate the requested category only if it exists.

        const validRequestedCategory =
            availableCategories.some(
                category => category.id === requestedCategoryId
            );


        selectedCategoryId = validRequestedCategory
            ? requestedCategoryId
            : "all";


        renderFilters(availableCategories);

        applyPortfolioFilter();


    } catch (error) {

        console.error(
            "Portfolio category initialization error:",
            error
        );

        filterContainer.textContent =
            "Unable to load portfolio categories.";

    }


    // ======================================
    // RENDER FILTER BUTTONS
    // ======================================

    function renderFilters(categories) {

        filterContainer.replaceChildren();


        createFilterButton(
            "All Work",
            "all"
        );


        categories.forEach(category => {

            createFilterButton(
                category.name,
                category.id
            );

        });

        updateActiveFilter();

    }


    // ======================================
    // CREATE FILTER BUTTON
    // ======================================

    function createFilterButton(name, categoryId) {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "portfolio-category-filter";

        button.textContent = name;

        button.dataset.categoryFilter = categoryId;

        button.setAttribute(
            "aria-pressed",
            String(categoryId === selectedCategoryId)
        );


        button.addEventListener("click", function () {

            selectedCategoryId = categoryId;

            updateActiveFilter();

            applyPortfolioFilter();

        });


        filterContainer.appendChild(button);

    }


    // ======================================
    // FILTER GALLERY
    // ======================================

    function applyPortfolioFilter() {

        const cards = portfolioGrid.querySelectorAll(
            "[data-portfolio-media]"
        );


        cards.forEach(card => {

            const categoryId =
                card.dataset.categoryId || "";


            const shouldShow =
                selectedCategoryId === "all" ||
                categoryId === selectedCategoryId;


            card.hidden = !shouldShow;

        });

    }


    // ======================================
    // ACTIVE BUTTON
    // ======================================

    function updateActiveFilter() {

        const buttons = filterContainer.querySelectorAll(
            "[data-category-filter]"
        );


        buttons.forEach(button => {

            const active =
                button.dataset.categoryFilter === selectedCategoryId;


            button.classList.toggle(
                "active",
                active
            );

            button.setAttribute(
                "aria-pressed",
                String(active)
            );

        });

    }

}