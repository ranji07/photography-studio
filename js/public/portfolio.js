"use strict";

// ==========================================
// DOM ELEMENTS
// ==========================================

const portfolioGrid =
    document.getElementById("portfolioGrid");

const portfolioMessage =
    document.getElementById("portfolioMessage");

const portfolioLightbox =
    document.getElementById("portfolioLightbox");

const lightboxImage =
    document.getElementById("lightboxImage");

const lightboxTitle =
    document.getElementById("lightboxTitle");

const lightboxDescription =
    document.getElementById("lightboxDescription");

const closeLightboxButton =
    document.getElementById("closeLightbox");

const lightboxBackdrop =
    document.getElementById("lightboxBackdrop");

let portfolioCategories = new Map();


// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    initializePortfolio
);


async function initializePortfolio() {

    if (!portfolioGrid || !portfolioMessage) {
        console.error("Portfolio HTML elements are missing.");
        return;
    }

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {
        showPortfolioMessage(
            "Supabase connection is unavailable.",
            true
        );
        return;
    }

    registerLightboxEvents();

    await loadPortfolio();

}


// ==========================================
// LOAD CATEGORY INFORMATION
// ==========================================

async function loadPortfolioCategories() {

    const { data, error } = await supabaseClient
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

    if (error) {
        console.error("Category loading error:", error);
        return;
    }

    portfolioCategories.clear();

    (data || []).forEach(category => {

        portfolioCategories.set(
            category.id,
            category.name
        );

    });

}


// ==========================================
// FETCH PUBLISHED PHOTOGRAPHS
// ==========================================

async function loadPortfolio() {

    portfolioMessage.textContent =
        "Loading photographs...";

    portfolioGrid.replaceChildren();

    try {

        await loadPortfolioCategories();

        const { data, error } = await supabaseClient
            .from("media")
            .select(`
                id,
                title,
                description,
                category_id,
                media_type,
                file_url,
                created_at
            `)
            .in("media_type", ["photo", "image"])
            .eq("is_published", true)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        console.log("Portfolio records:", data);

        console.log(
            "Published photographs loaded:",
            data ? data.length : 0
        );

        if (!data || data.length === 0) {

            showPortfolioMessage(
                "No published photographs available."
            );

            return;
        }

        // Ignore malformed records instead of breaking
        // the entire gallery.

        const validPhotos = data.filter(item => {
            return item.file_url &&
                typeof item.file_url === "string";
        });

        if (validPhotos.length === 0) {

            showPortfolioMessage(
                "Published records were found, but no valid image URLs are available.",
                true
            );

            console.error(
                "Check the file_url column in Supabase."
            );

            return;
        }

        portfolioMessage.textContent = "";

        renderPortfolio(validPhotos);

    } catch (error) {

        console.error(
            "Portfolio loading error:",
            error
        );

        showPortfolioMessage(
            "Unable to load photographs: " + error.message,
            true
        );

    }

}


// ==========================================
// RENDER GALLERY
// ==========================================

function renderPortfolio(items) {

    portfolioGrid.replaceChildren();

    items.forEach(item => {

        const card = document.createElement("article");

        card.className = "portfolio-card";

        // Required for category filtering.

        card.dataset.portfolioMedia = "";

        card.dataset.categoryId =
            item.category_id || "";


        const imageButton = document.createElement("button");

        imageButton.type = "button";

        imageButton.className = "portfolio-image-button";

        imageButton.setAttribute(
            "aria-label",
            "View photograph: " + (item.title || "Untitled")
        );


        const image = document.createElement("img");

        image.src = item.file_url;

        image.alt = item.title || "Portfolio photograph";

        image.loading = "lazy";

        image.decoding = "async";


        const fallback = document.createElement("span");

        fallback.className = "portfolio-image-fallback";

        fallback.textContent = "Photograph unavailable";

        fallback.hidden = true;


        image.addEventListener("error", function () {

            console.error(
                "Image loading failed:",
                item.file_url
            );

            image.hidden = true;

            fallback.hidden = false;

        });


        imageButton.append(image, fallback);


        imageButton.addEventListener("click", function () {

            openLightbox(item);

        });


        const details = document.createElement("div");

        details.className = "portfolio-card-details";


        const category = document.createElement("p");

        category.className = "portfolio-card-category";

        category.textContent =
            portfolioCategories.get(item.category_id)
            || "Photography";


        const title = document.createElement("h3");

        title.textContent = item.title || "Untitled";


        const description = document.createElement("p");

        description.className =
            "portfolio-card-description";

        description.textContent =
            item.description || "";


        details.append(category, title);

        if (item.description) {
            details.appendChild(description);
        }


        card.append(imageButton, details);

        portfolioGrid.appendChild(card);

    });

}


// ==========================================
// STATUS MESSAGE
// ==========================================

function showPortfolioMessage(message, isError = false) {

    portfolioMessage.textContent = message;

    portfolioMessage.classList.toggle(
        "error",
        isError
    );

}


// ==========================================
// OPEN LIGHTBOX
// ==========================================

function openLightbox(item) {

    lightboxImage.src = item.file_url;

    lightboxImage.alt = item.title || "Portfolio photograph";

    lightboxTitle.textContent =
        item.title || "Untitled";

    lightboxDescription.textContent =
        item.description || "";

    portfolioLightbox.hidden = false;

    document.body.classList.add(
        "portfolio-lightbox-open"
    );

    closeLightboxButton.focus();

}


// ==========================================
// CLOSE LIGHTBOX
// ==========================================

function closePortfolioLightbox() {

    portfolioLightbox.hidden = true;

    lightboxImage.src = "";

    document.body.classList.remove(
        "portfolio-lightbox-open"
    );

}


// ==========================================
// LIGHTBOX EVENTS
// ==========================================

function registerLightboxEvents() {

    if (
        !portfolioLightbox ||
        !lightboxImage ||
        !lightboxTitle ||
        !lightboxDescription ||
        !closeLightboxButton ||
        !lightboxBackdrop
    ) {
        console.error("Lightbox HTML elements are missing.");
        return;
    }

    closeLightboxButton.addEventListener(
        "click",
        closePortfolioLightbox
    );

    lightboxBackdrop.addEventListener(
        "click",
        closePortfolioLightbox
    );

    document.addEventListener("keydown", function(event) {

        if (
            event.key === "Escape" &&
            !portfolioLightbox.hidden
        ) {
            closePortfolioLightbox();
        }

    });

}