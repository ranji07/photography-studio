// ==========================================
// STEP 20 - CINEMATIC SHOWREEL
// ==========================================

(function () {
    "use strict";

    const db = window.supabaseClient;

    // --------------------------------------
    // DOM ELEMENTS
    // --------------------------------------

    const heroVideo = document.getElementById(
        "showreel-hero-video"
    );

    const heroDescription = document.getElementById(
        "showreel-hero-description"
    );

    const heroStatus = document.getElementById(
        "showreel-hero-status"
    );

    const heroWatchButton = document.getElementById(
        "showreel-watch-featured"
    );

    const filmCount = document.getElementById(
        "showreel-film-count"
    );

    const collectionCount = document.getElementById(
        "showreel-collection-count"
    );

    const videoGrid = document.getElementById(
        "showreel-video-grid"
    );

    const errorElement = document.getElementById(
        "showreel-error"
    );

    const playerDialog = document.getElementById(
        "showreel-player-dialog"
    );

    const playerVideo = document.getElementById(
        "showreel-player-video"
    );

    const playerTitle = document.getElementById(
        "showreel-player-title"
    );

    const playerDescription = document.getElementById(
        "showreel-player-description"
    );

    const playerStatus = document.getElementById(
        "showreel-player-status"
    );

    const playerCloseButton = document.getElementById(
        "showreel-player-close"
    );

    const fullscreenButton = document.getElementById(
        "showreel-fullscreen-button"
    );


    // --------------------------------------
    // STATE
    // --------------------------------------

    let availableFilms = [];
    let featuredFilm = null;
    let previousTrigger = null;

    const fallbackPoster = "../assets/images/studio-about.jpg";

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const canHover = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
    );


    // --------------------------------------
    // SAFE URL VALIDATION
    // --------------------------------------

    function safeVideoUrl(url) {
        if (!url) {
            return null;
        }

        try {
            const parsed = new URL(
                url,
                window.location.origin
            );

            if (
                parsed.protocol === "https:" ||
                parsed.origin === window.location.origin
            ) {
                return parsed.href;
            }

        } catch (error) {
            console.warn("Invalid video URL:", error);
        }

        return null;
    }


    // --------------------------------------
    // MESSAGE HANDLING
    // --------------------------------------

    function showError(message) {
        errorElement.textContent = message;
    }

    function showEmptyState(message) {
        videoGrid.innerHTML = "";

        const empty = document.createElement("div");
        empty.className = "showreel-empty";
        empty.textContent = message;

        videoGrid.appendChild(empty);
    }


    // --------------------------------------
    // VIDEO DATE
    // --------------------------------------

    function formatFilmDate(dateValue) {
        if (!dateValue) {
            return "FILM";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "FILM";
        }

        return new Intl.DateTimeFormat("en", {
            year: "numeric",
            month: "short"
        }).format(date).toUpperCase();
    }


    // --------------------------------------
    // HERO VIDEO
    // --------------------------------------

    function setHeroVideo(film) {
        const videoUrl = safeVideoUrl(film.file_url);

        if (!videoUrl) {
            heroStatus.textContent =
                "A preview is currently unavailable.";

            return;
        }

        heroVideo.poster = fallbackPoster;
        heroVideo.muted = true;
        heroVideo.defaultMuted = true;
        heroVideo.loop = true;
        heroVideo.playsInline = true;

        heroVideo.src = videoUrl;
        heroVideo.load();

        heroDescription.textContent =
            film.description ||
            "A collection of moments, emotions and stories, thoughtfully captured through our lens.";

        heroWatchButton.disabled = false;

        if (reducedMotion.matches) {
            heroStatus.textContent =
                "Select Watch the showreel to play this film.";

            return;
        }

        heroVideo.play()
            .then(() => {
                heroStatus.textContent = "NOW SHOWING";
            })
            .catch(error => {
                // Browser may block autoplay.
                console.info(
                    "Muted hero autoplay was not started:",
                    error
                );

                heroStatus.textContent =
                    "Select Watch the showreel to play this film.";
            });
    }


    // --------------------------------------
    // CREATE VIDEO CARD
    // --------------------------------------

    function createFilmCard(film, index) {
        const article = document.createElement("article");
        article.className = "showreel-card";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "showreel-card-button";

        button.setAttribute(
            "aria-label",
            `Watch ${film.title || "film"}`
        );

        const visual = document.createElement("div");
        visual.className = "showreel-card-visual";

        const preview = document.createElement("video");
        preview.className = "showreel-card-video";
        preview.muted = true;
        preview.defaultMuted = true;
        preview.loop = true;
        preview.playsInline = true;
        preview.preload = "none";
        preview.poster = fallbackPoster;
        preview.setAttribute("aria-hidden", "true");

        const overlay = document.createElement("div");
        overlay.className = "showreel-card-overlay";

        const playIcon = document.createElement("span");
        playIcon.className = "showreel-card-play";
        playIcon.textContent = "▶";
        playIcon.setAttribute("aria-hidden", "true");

        overlay.appendChild(playIcon);

        visual.append(preview, overlay);

        if (film.is_featured) {
            const badge = document.createElement("span");
            badge.className = "showreel-card-badge";
            badge.textContent = "Featured film";

            visual.appendChild(badge);
        }

        button.appendChild(visual);

        const info = document.createElement("div");
        info.className = "showreel-card-info";

        const meta = document.createElement("div");
        meta.className = "showreel-card-meta";

        const date = document.createElement("span");
        date.textContent = formatFilmDate(film.created_at);

        const number = document.createElement("span");
        number.textContent =
            String(index + 1).padStart(2, "0");

        meta.append(date, number);

        const title = document.createElement("h3");
        title.textContent = film.title || "Untitled film";

        const description = document.createElement("p");
        description.textContent =
            film.description || "A film by our studio.";

        info.append(meta, title, description);

        article.append(button, info);

        button.addEventListener("click", () => {
            openPlayer(film, button);
        });

        // Load and play muted previews only on desktop hover.
        if (!reducedMotion.matches && canHover.matches) {

            let previewLoaded = false;

            button.addEventListener("mouseenter", () => {
                if (!previewLoaded) {
                    preview.src = safeVideoUrl(film.file_url) || "";
                    preview.load();
                    previewLoaded = true;
                }

                if (preview.src) {
                    preview.play().catch(() => {
                        // Card remains clickable when preview cannot play.
                    });
                }
            });

            button.addEventListener("mouseleave", () => {
                preview.pause();

                try {
                    preview.currentTime = 0;
                } catch (error) {
                    // Ignore browsers that have not loaded media metadata.
                }
            });

        }

        return article;
    }


    // --------------------------------------
    // RENDER FILM COLLECTION
    // --------------------------------------

    function renderFilms() {
        videoGrid.innerHTML = "";

        if (!availableFilms.length) {
            showEmptyState(
                "Our next cinematic story is coming soon."
            );

            collectionCount.textContent = "0 FILMS";
            filmCount.textContent = "0 FILMS";
            return;
        }

        collectionCount.textContent =
            `${availableFilms.length} ${availableFilms.length === 1 ? "FILM" : "FILMS"}`;

        filmCount.textContent =
            `${availableFilms.length} FILMS`;

        const fragment = document.createDocumentFragment();

        availableFilms.forEach((film, index) => {
            fragment.appendChild(
                createFilmCard(film, index)
            );
        });

        videoGrid.appendChild(fragment);
    }


    // --------------------------------------
    // OPEN CINEMATIC PLAYER
    // --------------------------------------

    function openPlayer(film, triggerElement) {
        const videoUrl = safeVideoUrl(film.file_url);

        if (!videoUrl) {
            showError("This film has an invalid video URL.");
            return;
        }

        previousTrigger = triggerElement;

        // Stop hero playback before opening the player.
        heroVideo.pause();

        playerVideo.pause();
        playerVideo.removeAttribute("src");

        playerVideo.controls = true;
        playerVideo.muted = false;
        playerVideo.loop = false;
        playerVideo.playsInline = true;
        playerVideo.preload = "auto";

        playerTitle.textContent =
            film.title || "Now playing";

        playerDescription.textContent =
            film.description || "";

        playerStatus.textContent = "";

        playerVideo.src = videoUrl;
        playerVideo.poster = fallbackPoster;
        playerVideo.load();

        if (!playerDialog.open) {
            playerDialog.showModal();
        }

        // Playback is initiated from the visitor's click.
        playerVideo.play()
            .then(() => {
                playerStatus.textContent = "";
            })
            .catch(error => {
                console.warn("Video playback error:", error);

                playerStatus.textContent =
                    "Press play on the video controls to start playback.";
            });
    }


    // --------------------------------------
    // CLOSE PLAYER
    // --------------------------------------

    function closePlayer() {
        if (playerDialog.open) {
            playerDialog.close();
        }
    }

    function resetPlayer() {
        playerVideo.pause();

        playerVideo.removeAttribute("src");
        playerVideo.load();

        playerStatus.textContent = "";

        // Return to the muted hero preview when appropriate.
        if (!reducedMotion.matches) {
            heroVideo.play().catch(() => {
                // Hero remains as a static poster if playback is blocked.
            });
        }

        if (
            previousTrigger &&
            typeof previousTrigger.focus === "function"
        ) {
            previousTrigger.focus();
        }

        previousTrigger = null;
    }


    // --------------------------------------
    // FULLSCREEN
    // --------------------------------------

    async function enterFullscreen() {
        const target = playerVideo;

        if (!target.requestFullscreen) {
            playerStatus.textContent =
                "Fullscreen is not supported here. Use the video player's built-in controls instead.";

            return;
        }

        try {
            await target.requestFullscreen();

            playerStatus.textContent = "";

        } catch (error) {
            console.warn("Fullscreen request failed:", error);

            playerStatus.textContent =
                "Fullscreen was unavailable. Use the player controls instead.";
        }
    }


    // --------------------------------------
    // LOAD PUBLISHED VIDEOS
    // --------------------------------------

    async function loadFilms() {
        if (!db) {
            showError(
                "The database connection is unavailable."
            );

            showEmptyState(
                "Films are temporarily unavailable."
            );

            heroStatus.textContent =
                "Could not connect to the film library.";

            return;
        }

        try {
            const { data, error } = await db
                .from("media")
                .select(`
                    id,
                    title,
                    description,
                    file_url,
                    media_type,
                    is_featured,
                    created_at
                `)
                .eq("media_type", "video")
                .eq("is_published", true)
                .order("is_featured", { ascending: false })
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            availableFilms = (data || []).filter(film => {
                return Boolean(safeVideoUrl(film.file_url));
            });

            if (!availableFilms.length) {
                showEmptyState(
                    "Our next cinematic story is coming soon."
                );

                heroWatchButton.disabled = true;

                heroStatus.textContent =
                    "No published films are available yet.";

                collectionCount.textContent = "0 FILMS";
                filmCount.textContent = "0 FILMS";

                return;
            }

            // Prefer a featured published video.
            featuredFilm =
                availableFilms.find(film => film.is_featured) ||
                availableFilms[0];

            setHeroVideo(featuredFilm);
            renderFilms();

        } catch (error) {
            console.error("Showreel loading error:", error);

            showError(
                "We could not load the films. Please refresh the page."
            );

            showEmptyState(
                "Films are temporarily unavailable."
            );

            heroStatus.textContent =
                "The showreel could not be loaded.";
        }
    }


    // --------------------------------------
    // EVENT LISTENERS
    // --------------------------------------

    heroWatchButton.addEventListener("click", () => {
        if (featuredFilm) {
            openPlayer(featuredFilm, heroWatchButton);
        }
    });

    playerCloseButton.addEventListener("click", closePlayer);

    fullscreenButton.addEventListener("click", enterFullscreen);

    playerDialog.addEventListener("click", event => {
        if (event.target === playerDialog) {
            closePlayer();
        }
    });

    playerDialog.addEventListener("close", resetPlayer);

    // Stop the hero video when the tab is hidden.
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            heroVideo.pause();

            videoGrid.querySelectorAll("video").forEach(video => {
                video.pause();
            });

        } else if (
            !playerDialog.open &&
            !reducedMotion.matches
        ) {
            heroVideo.play().catch(() => {});
        }
    });

    // Respect a visitor changing their motion preference.
    reducedMotion.addEventListener("change", event => {
        if (event.matches) {
            heroVideo.pause();

            videoGrid.querySelectorAll("video").forEach(video => {
                video.pause();
            });
        }
    });


    // --------------------------------------
    // INITIALIZE
    // --------------------------------------

    loadFilms();

})();