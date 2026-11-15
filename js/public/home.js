"use strict";


// ==========================================
// HOMEPAGE DOM ELEMENTS
// ==========================================

const heroImage = document.getElementById("homeHeroImage");

const featuredGallery =
    document.getElementById("featuredGallery");

const featuredImagesMessage =
    document.getElementById("featuredImagesMessage");

const homeCategories =
    document.getElementById("homeCategories");

const homeCategoriesMessage =
    document.getElementById("homeCategoriesMessage");

const featuredFilms =
    document.getElementById("featuredFilms");

const featuredFilmsMessage =
    document.getElementById("featuredFilmsMessage");

const aboutImage =
    document.getElementById("homeAboutImage");

const aboutImageFallback =
    document.querySelector(".home-about-image-fallback");

let homeCategoryNames = new Map();
// ==========================================
// INITIALIZE HOMEPAGE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    initializeHomepage
);


async function initializeHomepage() {

    if (typeof supabaseClient === "undefined") {

        console.error("Supabase client is unavailable.");

        showMessage(
            featuredImagesMessage,
            "Website connection is unavailable."
        );

        showMessage(
            homeCategoriesMessage,
            "Unable to load categories."
        );

        showMessage(
            featuredFilmsMessage,
            "Unable to load films."
        );

        return;
    }


    setupStudioDetails();

    setupWhatsAppLinks();

    setupMobileNavigation();


    // Load all homepage content independently.

    const results = await Promise.allSettled([

        loadPublishedImages(),

        loadPublishedVideos(),

        loadPublishedCategories()

    ]);

if (results[2].status === "fulfilled") {

    homeCategoryNames = new Map(
        results[2].value.map(category => [
            category.id,
            category.name
        ])
    );

}
    // Photography

    if (results[0].status === "fulfilled") {

        const images = results[0].value;

        renderHero(images);

        renderFeaturedPhotography(images);

    } else {

        console.error(
            "Homepage photography error:",
            results[0].reason
        );

        showMessage(
            featuredImagesMessage,
            "Unable to load featured photographs."
        );

    }


    // Videography

    if (results[1].status === "fulfilled") {

        renderFeaturedFilms(results[1].value);

    } else {

        console.error(
            "Homepage films error:",
            results[1].reason
        );

        showMessage(
            featuredFilmsMessage,
            "Unable to load featured films."
        );

    }


    // Categories

    if (results[2].status === "fulfilled") {

        renderHomeCategories(
            results[2].value
        );

    } else {

        console.error(
            "Homepage categories error:",
            results[2].reason
        );

        showMessage(
            homeCategoriesMessage,
            "Unable to load categories."
        );

    }

}


// ==========================================
// GET PUBLISHED IMAGES
// ==========================================

async function loadPublishedImages() {

    const { data, error } = await supabaseClient

        .from("media")

        .select(`
            id,
            title,
            description,
            category_id,
            media_type,
            file_url,
            is_featured,
            created_at
        `)

        .in("media_type", ["image", "photo"])

        .eq("is_published", true)

        .order("is_featured", {
            ascending: false
        })
        .order("created_at", {
            ascending: false
        })

        .limit(30);


    if (error) {
        throw error;
    }


    return prioritizeFeaturedMedia(data || []);

}


// ==========================================
// GET PUBLISHED VIDEOS
// ==========================================

async function loadPublishedVideos() {

    const { data, error } = await supabaseClient

        .from("media")

        .select(`
            id,
            title,
            description,
            category_id,
            media_type,
            file_url,
            is_featured,
            created_at
        `)

        .eq("media_type", "video")

        .eq("is_published", true)

        .order("is_featured", {
            ascending: false
        })
        .order("created_at", {
            ascending: false
        })

        .limit(10);


    if (error) {
        throw error;
    }


    return prioritizeFeaturedMedia(data || []);

}


// ==========================================
// PRIORITIZE FEATURED MEDIA
// ==========================================

function prioritizeFeaturedMedia(items) {

    return [...items].sort((a, b) => {

        return Number(Boolean(b.is_featured)) -
               Number(Boolean(a.is_featured));

    });

}


// ==========================================
// GET PUBLISHED CATEGORIES
// ==========================================

async function loadPublishedCategories() {


    // Fetch categories.

    const {
        data: categories,
        error: categoryError
    } = await supabaseClient

        .from("categories")

        .select("id, name, slug")

        .order("name", {
            ascending: true
        });


    if (categoryError) {
        throw categoryError;
    }


    // Fetch published photography.

    const {
        data: media,
        error: mediaError
    } = await supabaseClient

        .from("media")

        .select("category_id, file_url")

        .in("media_type", ["image", "photo"])

        .eq("is_published", true)

        .not("category_id", "is", null);


    if (mediaError) {
        throw mediaError;
    }


    // Calculate counts and preview images.

    const categoryData = new Map();


    (media || []).forEach(item => {

        if (!item.category_id) {
            return;
        }


        if (!categoryData.has(item.category_id)) {

            categoryData.set(item.category_id, {
                count: 0,
                previewImage: item.file_url
            });

        }


        const entry = categoryData.get(
            item.category_id
        );

        entry.count++;

    });


    // Return categories having published photographs.

    return (categories || [])

        .filter(category =>
            categoryData.has(category.id)
        )

        .map(category => {

            const details = categoryData.get(
                category.id
            );

            return {
                ...category,
                mediaCount: details.count,
                previewImage: details.previewImage
            };

        })

        .sort((a, b) =>
            b.mediaCount - a.mediaCount
        );

}


// ==========================================
// RENDER DYNAMIC HERO
// ==========================================

function renderHero(images) {

    if (!images.length) {

        heroImage.hidden = true;

        return;

    }


    const selectedImage = images.find(
        image => image.is_featured
    ) || images[0];


    heroImage.src = selectedImage.file_url;

    heroImage.alt =
        selectedImage.title || "Bali photography";


    heroImage.addEventListener(
        "error",
        function () {

            heroImage.hidden = true;

            console.error(
                "Hero image loading failed:",
                selectedImage.file_url
            );

        },
        { once: true }

    );


    // Use another image for the About section.

    const aboutSelectedImage = images[1] || selectedImage;

    aboutImage.src = aboutSelectedImage.file_url;

    aboutImage.alt =
        aboutSelectedImage.title || "Studio photography";


    aboutImage.addEventListener(
        "error",
        function () {

            aboutImage.hidden = true;

            if (aboutImageFallback) {
                aboutImageFallback.hidden = false;
            }

        },
        { once: true }

    );

}


// ==========================================
// RENDER FEATURED PHOTOGRAPHY
// ==========================================

function renderFeaturedPhotography(images) {

    featuredGallery.replaceChildren();


    if (!images.length) {

        showMessage(
            featuredImagesMessage,
            "Our selected photographs will be available soon."
        );

        return;

    }


    featuredImagesMessage.textContent = "";


    const selectedImages = images.slice(0, 6);


    selectedImages.forEach(item => {

        const card = document.createElement("a");

        card.className = "home-featured-card";


        // Clicking a card opens the category
        // in the public portfolio.

        card.href = item.category_id

            ? `pages/portfolio.html?category=${encodeURIComponent(item.category_id)}`

            : "pages/portfolio.html";


        const imageWrap = document.createElement("div");

        imageWrap.className =
            "home-featured-image-wrap";


        const image = document.createElement("img");

        image.src = item.file_url;

        image.alt = item.title || "Featured photography";

        image.loading = "lazy";

        image.decoding = "async";


        image.addEventListener(
            "error",
            function () {

                imageWrap.textContent =
                    "Photograph unavailable";

            },
            { once: true }
        );


        imageWrap.appendChild(image);


        const details = document.createElement("div");

        details.className =
            "home-featured-details";


        const category = document.createElement("span");

        category.textContent =
            getCategoryName(item.category_id);


        const title = document.createElement("h3");

        title.textContent =
            item.title || "Untitled";


        details.append(category, title);

        card.append(imageWrap, details);

        featuredGallery.appendChild(card);

    });

}


// ==========================================
// RENDER CATEGORY PREVIEWS
// ==========================================

function renderHomeCategories(categories) {

    homeCategories.replaceChildren();


    if (!categories.length) {

        showMessage(
            homeCategoriesMessage,
            "New categories and stories are coming soon."
        );

        return;

    }


    homeCategoriesMessage.textContent = "";


    categories.slice(0, 4).forEach(category => {

        const card = document.createElement("a");

        card.className = "home-category-card";

        card.href =
            `pages/portfolio.html?category=${encodeURIComponent(category.id)}`;


        const image = document.createElement("img");

        image.src = category.previewImage;

        image.alt = category.name;

        image.loading = "lazy";


        const overlay = document.createElement("div");

        overlay.className = "home-category-overlay";


        const details = document.createElement("div");

        details.className = "home-category-details";


        const heading = document.createElement("h3");

        heading.textContent = category.name;


        const count = document.createElement("span");

        count.textContent =
            `${category.mediaCount} photographs`;


        details.append(heading, count);

        card.append(image, overlay, details);


        image.addEventListener(
            "error",
            function () {

                image.hidden = true;

                overlay.hidden = true;

                card.classList.add(
                    "home-category-fallback"
                );

            },
            { once: true }
        );


        homeCategories.appendChild(card);

    });

}


// ==========================================
// RENDER FEATURED FILMS
// ==========================================

function renderFeaturedFilms(videos) {

    featuredFilms.replaceChildren();


    if (!videos.length) {

        showMessage(
            featuredFilmsMessage,
            "Our cinematic films will be available soon."
        );

        return;

    }


    featuredFilmsMessage.textContent = "";


    videos.slice(0, 2).forEach(item => {

        const card = document.createElement("article");

        card.className = "home-film-card";


        const video = document.createElement("video");

        video.controls = true;

       video.preload = "none";

        video.playsInline = true;

        video.setAttribute(
            "aria-label",
            item.title || "Featured cinematic film"
        );


        const source = document.createElement("source");

        source.src = item.file_url;

        source.type = "video/mp4";


        video.appendChild(source);


        const details = document.createElement("div");

        details.className = "home-film-details";


        const title = document.createElement("h3");

        title.textContent =
            item.title || "Untitled Film";


        const description = document.createElement("p");

        description.textContent =
            item.description || "";


        details.append(title);


        if (item.description) {
            details.appendChild(description);
        }


        card.append(video, details);

        featuredFilms.appendChild(card);

    });

}


// ==========================================
// GET CATEGORY NAME
// ==========================================

function getCategoryName(categoryId) {

    return homeCategoryNames.get(categoryId)
        || "Photography";

}


// ==========================================
// STUDIO DETAILS
// ==========================================

function setupStudioDetails() {

    if (
        typeof STUDIO_NAME !== "undefined" &&
        STUDIO_NAME
    ) {

        document
            .querySelectorAll("[data-studio-name]")
            .forEach(element => {

                element.textContent = STUDIO_NAME;

            });

    }


    if (
        typeof STUDIO_LOCATION !== "undefined" &&
        STUDIO_LOCATION
    ) {

        document
            .querySelectorAll("[data-studio-location]")
            .forEach(element => {

                element.textContent =
                    STUDIO_LOCATION.toUpperCase()
                        .replace(/,\s*/g, " · ");

            });

    }


    if (
        typeof STUDIO_INSTAGRAM_URL !== "undefined" &&
        STUDIO_INSTAGRAM_URL &&
        !STUDIO_INSTAGRAM_URL.includes("YOUR_STUDIO")
    ) {

        const instagram = document.getElementById(
            "studioInstagram"
        );

        if (instagram) {
            instagram.href = STUDIO_INSTAGRAM_URL;
        }

    }

}


// ==========================================
// WHATSAPP LINKS
// ==========================================

function setupWhatsAppLinks() {

    const rawNumber =
        typeof STUDIO_WHATSAPP_NUMBER !== "undefined"
            ? STUDIO_WHATSAPP_NUMBER
            : "";


    const phoneNumber = rawNumber.replace(/\D/g, "");


    const validNumber =
        /^\d{9,15}$/.test(phoneNumber) &&
        !rawNumber.includes("YOUR_");


    document
        .querySelectorAll("[data-whatsapp-link]")
        .forEach(link => {

            if (validNumber) {

                const text =
                    "Hello! I would like to enquire about your photography and videography services.";

                link.href =
                    `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;

                link.target = "_blank";

                link.rel = "noopener noreferrer";

            } else {

                link.href = "pages/contact.html";

            }

        });

}


// ==========================================
// MOBILE NAVIGATION
// ==========================================

function setupMobileNavigation() {

    const button = document.getElementById(
        "mobileMenuToggle"
    );

    const navigation = document.getElementById(
        "homeNavigation"
    );


    if (!button || !navigation) {
        return;
    }


    button.addEventListener("click", function () {

        const expanded =
            button.getAttribute("aria-expanded") === "true";


        button.setAttribute(
            "aria-expanded",
            String(!expanded)
        );


        navigation.classList.toggle(
            "is-open",
            !expanded
        );


        button.textContent =
            expanded ? "MENU" : "CLOSE";

    });


    document.addEventListener("keydown", function(event) {

        if (event.key === "Escape") {

            navigation.classList.remove("is-open");

            button.setAttribute(
                "aria-expanded",
                "false"
            );

            button.textContent = "MENU";

        }

    });

}


// ==========================================
// COMMON MESSAGE HANDLER
// ==========================================

function showMessage(element, text) {

    if (!element) {
        return;
    }

    element.textContent = text;

}