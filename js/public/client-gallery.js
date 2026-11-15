// ==========================================
// STEP 25 - PRIVATE CLIENT GALLERY FRONTEND
// ==========================================

(function () {
    "use strict";

    const db = window.supabaseClient;

    const slug = new URLSearchParams(
        window.location.search
    ).get("slug");

    const lockedView = document.getElementById("gallery-locked");
    const galleryContent = document.getElementById("gallery-content");
    const loadingView = document.getElementById("gallery-loading");

    const unlockForm = document.getElementById("gallery-unlock-form");
    const passwordInput = document.getElementById("gallery-password");
    const unlockButton = document.getElementById("gallery-unlock-button");
    const unlockError = document.getElementById("gallery-unlock-error");

    const titleElement = document.getElementById("gallery-title");
    const clientElement = document.getElementById("gallery-client-name");
    const eventDateElement = document.getElementById("gallery-event-date");

    const photoGrid = document.getElementById("gallery-photo-grid");
    const photoCount = document.getElementById("gallery-photo-count");
    const favoriteCount = document.getElementById("gallery-favorite-count");

    const refreshButton = document.getElementById("gallery-refresh-button");

    const selectionPanel = document.getElementById("gallery-selection-panel");
    const clientNote = document.getElementById("gallery-client-note");
    const submitButton = document.getElementById("gallery-submit-selection");
    const selectionStatus = document.getElementById("gallery-selection-status");
    const thankYou = document.getElementById("gallery-thank-you");

    let gallery = null;
    let photos = [];
    let accessToken = null;
    let submitting = false;

    const storageKey = `client_gallery_session_${slug || "invalid"}`;


    // --------------------------------------
    // API HELPER
    // --------------------------------------

    async function invokeGallery(action, payload = {}) {
        if (!db) {
            throw new Error("Gallery service is unavailable.");
        }

        const { data, error } = await db.functions.invoke(
            "client-gallery",
            {
                body: {
                    action,
                    ...payload
                }
            }
        );

        if (error) {
            let message = error.message || "Gallery request failed.";

            if (error.context && typeof error.context.json === "function") {
                try {
                    const body = await error.context.json();

                    if (body && body.error) {
                        message = body.error;
                    }
                } catch (parseError) {
                    // Use the original function error.
                }
            }

            throw new Error(message);
        }

        if (data && data.error) {
            throw new Error(data.error);
        }

        return data;
    }


    // --------------------------------------
    // VIEW STATES
    // --------------------------------------

    function showLocked() {
        loadingView.hidden = true;
        galleryContent.hidden = true;
        lockedView.hidden = false;
    }

    function showLoading() {
        lockedView.hidden = true;
        galleryContent.hidden = true;
        loadingView.hidden = false;
    }


    function showGallery() {
        loadingView.hidden = true;
        lockedView.hidden = true;
        galleryContent.hidden = false;
    }


    function expireSession(message) {
        sessionStorage.removeItem(storageKey);

        accessToken = null;
        gallery = null;

        unlockError.textContent =
            message || "Please unlock your gallery again.";

        passwordInput.value = "";

        showLocked();
    }


    // --------------------------------------
    // DATE FORMAT
    // --------------------------------------

    function formatDate(value) {
        if (!value) return "";

        const parts = value.split("-");

        if (parts.length !== 3) {
            return value;
        }

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

        return new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    }


    // --------------------------------------
    // PHOTO COUNTS
    // --------------------------------------

    function updateCounts() {
        const selected = photos.filter(
            photo => photo.is_favorite
        ).length;

        photoCount.textContent =
            `${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}`;

        favoriteCount.textContent =
            `${selected} ${selected === 1 ? "favourite" : "favourites"}`;
    }


    // --------------------------------------
    // PHOTO CARD
    // --------------------------------------

    function createPhotoCard(photo) {
        const card = document.createElement("article");

        card.className = "gallery-photo-card";

        const image = document.createElement("img");

        image.className = "gallery-photo-image";
        image.src = photo.signed_url;
        image.alt = photo.caption || "Private client photograph";
        image.loading = "lazy";
        image.decoding = "async";
        image.width = 900;
        image.height = 1125;

        image.addEventListener("error", () => {
            image.alt = "Photograph link expired. Refresh the gallery.";
        }, { once: true });


        const actions = document.createElement("div");

        actions.className = "gallery-photo-actions";

        if (gallery.allow_favorites) {
            const favorite = document.createElement("button");

            favorite.type = "button";
            favorite.className = "gallery-favorite-button";

            favorite.textContent = photo.is_favorite ? "♥" : "♡";

            favorite.setAttribute(
                "aria-pressed",
                String(photo.is_favorite)
            );

            favorite.setAttribute(
                "aria-label",
                photo.is_favorite
                    ? "Remove from favourites"
                    : "Add to favourites"
            );

            favorite.addEventListener("click", async () => {
                await toggleFavorite(photo, favorite);
            });

            actions.appendChild(favorite);
        }


        if (gallery.allow_downloads && photo.download_url) {
            const download = document.createElement("a");

            download.className = "gallery-download-link";
            download.href = photo.download_url;
            download.textContent = "Download";
            download.setAttribute("download", "");

            download.rel = "noopener";

            actions.appendChild(download);
        }


        const caption = document.createElement("div");

        caption.className = "gallery-photo-caption";

        caption.textContent =
            photo.caption || photo.file_name || "Photograph";

        card.append(image, actions, caption);

        return card;
    }


    // --------------------------------------
    // RENDER PHOTOS
    // --------------------------------------

    function renderPhotos() {
        photoGrid.innerHTML = "";

        if (!photos.length) {
            const empty = document.createElement("p");

            empty.className = "gallery-empty";
            empty.textContent =
                "Photographs will appear here once they have been added.";

            photoGrid.appendChild(empty);

            updateCounts();
            return;
        }

        const fragment = document.createDocumentFragment();

        photos.forEach(photo => {
            fragment.appendChild(
                createPhotoCard(photo)
            );
        });

        photoGrid.appendChild(fragment);

        updateCounts();
    }


    // --------------------------------------
    // FAVORITES
    // --------------------------------------

    async function toggleFavorite(photo, button) {
        const oldValue = photo.is_favorite;
        const nextValue = !oldValue;

        photo.is_favorite = nextValue;

        button.textContent = nextValue ? "♥" : "♡";

        button.setAttribute(
            "aria-pressed",
            String(nextValue)
        );

        button.setAttribute(
            "aria-label",
            nextValue
                ? "Remove from favourites"
                : "Add to favourites"
        );

        updateCounts();

        button.disabled = true;

        try {
            await invokeGallery(
                "favorite",
                {
                    access_token: accessToken,
                    photo_id: photo.id,
                    selected: nextValue
                }
            );

        } catch (error) {
            photo.is_favorite = oldValue;

            button.textContent = oldValue ? "♥" : "♡";

            button.setAttribute(
                "aria-pressed",
                String(oldValue)
            );

            updateCounts();

            selectionStatus.textContent = error.message;

            if (
                error.message.toLowerCase().includes("session")
            ) {
                expireSession(error.message);
            }

        } finally {
            button.disabled = false;
        }
    }


    // --------------------------------------
    // APPLY SERVER RESPONSE
    // --------------------------------------

    function displayGallery(data) {
        gallery = data.gallery;
        photos = data.photos || [];

        const hasSubmitted = data.has_submitted === true;

        if (hasSubmitted) {
            gallery.allow_favorites = false;
        }

        titleElement.textContent =
            gallery.title || "Your photographs";

        clientElement.textContent =
            gallery.client_name || "";

        eventDateElement.textContent =
            formatDate(gallery.event_date);

        selectionPanel.hidden =
            !gallery.allow_selection || hasSubmitted;

        photoGrid.hidden = false;

        document.querySelector(".gallery-toolbar").hidden = false;

        thankYou.hidden = !hasSubmitted;

        document.title =
            `${gallery.title} | Private Client Gallery`;

        renderPhotos();

        showGallery();
    }


    // --------------------------------------
    // UNLOCK
    // --------------------------------------

    async function unlockGallery(event) {
        event.preventDefault();

        unlockError.textContent = "";

        if (!slug) {
            unlockError.textContent =
                "The gallery link is invalid.";

            return;
        }

        if (!passwordInput.value) {
            passwordInput.focus();

            unlockError.textContent =
                "Please enter your gallery password.";

            return;
        }

        unlockButton.disabled = true;
        unlockButton.textContent = "Checking password...";

        try {
            showLoading();

            const data = await invokeGallery(
                "unlock",
                {
                    slug,
                    password: passwordInput.value
                }
            );

            accessToken = data.access_token;

            // Store only the temporary token, never the password.
            sessionStorage.setItem(
                storageKey,
                accessToken
            );

            passwordInput.value = "";

            displayGallery(data);

        } catch (error) {
            showLocked();

            unlockError.textContent = error.message;

        } finally {
            unlockButton.disabled = false;
            unlockButton.innerHTML =
                'Unlock gallery <span aria-hidden="true">→</span>';
        }
    }


    // --------------------------------------
    // REFRESH / RESIGN IMAGE URLS
    // --------------------------------------

    async function refreshGallery() {
        if (!accessToken) {
            showLocked();
            return;
        }

        refreshButton.disabled = true;

        try {
            const data = await invokeGallery(
                "list",
                {
                    access_token: accessToken
                }
            );

            displayGallery(data);

        } catch (error) {
            if (error.message.toLowerCase().includes("session")) {
                expireSession(error.message);
            } else {
                selectionStatus.textContent = error.message;
            }

        } finally {
            refreshButton.disabled = false;
        }
    }


    // --------------------------------------
    // SUBMIT FINAL SELECTION
    // --------------------------------------

    async function submitSelection() {
        if (submitting || !gallery.allow_selection) {
            return;
        }

        const selectedCount = photos.filter(
            photo => photo.is_favorite
        ).length;

        if (!selectedCount) {
            selectionStatus.textContent =
                "Please add at least one photograph to your favourites.";

            return;
        }

        const confirmed = window.confirm(
            `Submit ${selectedCount} selected photographs to the studio?`
        );

        if (!confirmed) {
            return;
        }

        submitting = true;
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        selectionStatus.textContent = "";

        try {
            await invokeGallery(
                "submit",
                {
                    access_token: accessToken,
                    client_note: clientNote.value.trim()
                }
            );

            selectionPanel.hidden = true;
            photoGrid.hidden = true;

            const toolbar = document.querySelector(
                ".gallery-toolbar"
            );

            toolbar.hidden = true;

            thankYou.hidden = false;

            thankYou.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        } catch (error) {
            selectionStatus.textContent = error.message;

            if (error.message.toLowerCase().includes("session")) {
                expireSession(error.message);
            }

        } finally {
            submitting = false;
            submitButton.disabled = false;

            submitButton.innerHTML =
                'Submit my selection <span aria-hidden="true">↗</span>';
        }
    }


    // --------------------------------------
    // EVENT LISTENERS
    // --------------------------------------

    unlockForm.addEventListener("submit", unlockGallery);

    refreshButton.addEventListener("click", refreshGallery);

    submitButton.addEventListener("click", submitSelection);


    // --------------------------------------
    // INITIALIZE
    // --------------------------------------

    async function initialize() {
        if (!db) {
            unlockError.textContent =
                "Gallery service is unavailable.";

            showLocked();
            return;
        }

        if (
            !slug ||
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
        ) {
            unlockError.textContent =
                "This gallery link is invalid.";

            showLocked();
            return;
        }

        const storedToken = sessionStorage.getItem(storageKey);

        if (!storedToken) {
            showLocked();
            return;
        }

        accessToken = storedToken;

        showLoading();

        try {
            const data = await invokeGallery(
                "list",
                {
                    access_token: accessToken
                }
            );

            displayGallery(data);

        } catch (error) {
            expireSession(
                "Your gallery session has expired. Please enter your password again."
            );
        }
    }

    initialize();

})();