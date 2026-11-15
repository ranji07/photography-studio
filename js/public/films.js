
/*
====================================================
 FILMS PAGE
====================================================

Purpose:
1. Fetch published videos from Supabase.
2. Display videos in responsive cards.
3. Display title and description.
4. Handle loading and empty states.
5. Handle connection and database errors.

Database:
media

Required media_type:
video

Required is_published:
true

====================================================
*/


// ================================================
// DOM ELEMENTS
// ================================================

const filmsGrid = document.getElementById("filmsGrid");
const filmsMessage = document.getElementById("filmsMessage");


// ================================================
// DISPLAY MESSAGE
// ================================================

function showFilmsMessage(message, isError = false) {

    filmsGrid.innerHTML = "";

    const paragraph = document.createElement("p");

    paragraph.className = "films-message";
    paragraph.textContent = message;

    if (isError) {
        paragraph.style.color = "#e58b80";
    }

    filmsGrid.appendChild(paragraph);
}


// ================================================
// CREATE VIDEO CARD
// ================================================

function createFilmCard(film) {

    // Main card
    const card = document.createElement("article");

    card.className = "film-card";


    // Video container
    const media = document.createElement("div");

    media.className = "film-media";


    // Video element
    const video = document.createElement("video");

    video.src = film.file_url;
    video.controls = true;
    video.preload = "none";
    video.playsInline = true;

    video.setAttribute("aria-label", film.title || "Portfolio film");


    // Video loading error
    video.addEventListener("error", function () {

        console.error(
            "Video playback error:",
            film.title,
            film.file_url
        );

    });


    media.appendChild(video);


    // Film details container
    const details = document.createElement("div");

    details.className = "film-details";


    // Film title
    const title = document.createElement("h3");

    title.className = "film-title";
    title.textContent = film.title || "Untitled Film";


    // Film description
    const description = document.createElement("p");

    description.className = "film-description";
    description.textContent =
        film.description || "A beautiful cinematic memory.";


    // Film category
    const category = document.createElement("span");

    category.className = "film-category";
    category.textContent = "Cinematic Film";


    // Add details
    details.appendChild(title);
    details.appendChild(description);
    details.appendChild(category);


    // Build card
    card.appendChild(media);
    card.appendChild(details);


    return card;
}


// ================================================
// LOAD PUBLISHED FILMS FROM SUPABASE
// ================================================

async function loadFilms() {

    // Verify gallery container
    if (!filmsGrid) {

        console.error(
            "Films gallery container #filmsGrid not found."
        );

        return;
    }


    // Verify Supabase client
    const client = window.supabaseClient;

    if (!client || typeof client.from !== "function") {

        console.error(
            "Supabase client is not initialized."
        );

        showFilmsMessage(
            "Unable to connect to the film gallery. Please try again.",
            true
        );

        return;
    }


    // Show loading message
    showFilmsMessage("Loading films...");


    try {

        // Fetch published videos
        const { data, error } = await client

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

            .eq("media_type", "video")

            .eq("is_published", true)

            .order("created_at", {
                ascending: false
            });


        // Handle database errors
        if (error) {

            console.error(
                "Films loading error:",
                error
            );

            throw error;
        }


        // Handle empty records
        if (!data || data.length === 0) {

            showFilmsMessage(
                "No films available at the moment. Please visit again soon."
            );

            return;
        }


        // Clear loading message
        filmsGrid.innerHTML = "";


        // Display films
        data.forEach(film => {

            if (!film.file_url) {

                console.warn(
                    "Film has no file URL:",
                    film.id
                );

                return;
            }


            const filmCard = createFilmCard(film);

            filmsGrid.appendChild(filmCard);

        });


        // Check whether any valid cards were displayed
        if (filmsGrid.children.length === 0) {

            showFilmsMessage(
                "No playable films are currently available."
            );

            return;
        }


        console.log(
            `${filmsGrid.children.length} published films loaded successfully.`
        );


    } catch (error) {

        console.error(
            "Films loading failed:",
            error
        );


        // Display a useful error message
        if (!navigator.onLine) {

            showFilmsMessage(
                "You appear to be offline. Please check your internet connection.",
                true
            );

        } else {

            showFilmsMessage(
                "Unable to load films. Please try again later.",
                true
            );

        }

    }

}


// ================================================
// INITIALIZE FILMS PAGE
// ================================================

async function initializeFilmsPage() {

    console.log("Initializing Films Page...");


    // Check gallery availability
    if (!filmsGrid) {

        console.error(
            "HTML element #filmsGrid is missing."
        );

        return;
    }


    // Load films
    await loadFilms();

}


// ================================================
// PAGE INITIALIZATION
// ================================================

function startFilmsPage() {

    initializeFilmsPage();

}


if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        startFilmsPage,
        { once: true }
    );

} else {

    startFilmsPage();

}
