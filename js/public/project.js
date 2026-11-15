// ==========================================
// STEP 19 - INDIVIDUAL PROJECT STORY
// ==========================================

(function () {
    "use strict";

    const db = window.supabaseClient;

    const main = document.getElementById("project-main");
    const loading = document.getElementById("project-loading");
    const errorSection = document.getElementById("project-error");
    const errorMessage = document.getElementById("project-error-message");

    const titleElement = document.getElementById("project-title");
    const typeElement = document.getElementById("project-type");
    const excerptElement = document.getElementById("project-excerpt");
    const clientElement = document.getElementById("project-client");
    const locationElement = document.getElementById("project-location");
    const dateElement = document.getElementById("project-date");
    const categoryElement = document.getElementById("project-category");
    const storyElement = document.getElementById("project-story");
    const coverImage = document.getElementById("project-cover-image");
    const gallery = document.getElementById("project-gallery");
    const galleryCount = document.getElementById("project-gallery-count");

    const lightbox = document.getElementById("project-lightbox");
    const lightboxImage = document.getElementById("project-lightbox-image");
    const lightboxTitle = document.getElementById("project-lightbox-title");
    const lightboxCounter = document.getElementById("project-lightbox-counter");
    const lightboxClose = document.getElementById("project-lightbox-close");
    const lightboxPrevious = document.getElementById("project-lightbox-prev");
    const lightboxNext = document.getElementById("project-lightbox-next");

    let projectImages = [];
    let currentImageIndex = 0;
    let previousFocusElement = null;

    const fallbackImage = "../assets/images/studio-about.jpg";

    function safeImageUrl(url) {
        if (!url) {
            return fallbackImage;
        }

        try {
            const parsed = new URL(url, window.location.origin);

            if (parsed.protocol === "https:" ||
                parsed.origin === window.location.origin) {
                return parsed.href;
            }
        } catch (error) {
            console.warn("Invalid project image URL:", error);
        }

        return fallbackImage;
    }

    function setImageSource(imageElement, url) {
        imageElement.src = safeImageUrl(url);

        imageElement.addEventListener("error", function () {
            imageElement.src = fallbackImage;
        }, { once: true });
    }

    function setText(element, value, fallback = "—") {
        element.textContent = value || fallback;
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue + "T00:00:00");

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function showError(message) {
        loading.hidden = true;
        main.hidden = true;
        errorSection.hidden = false;
        errorMessage.textContent = message;
    }

    function renderGallery() {
        gallery.innerHTML = "";

        galleryCount.textContent =
            `${projectImages.length} ${projectImages.length === 1 ? "image" : "images"}`;

        if (projectImages.length === 0) {
            const empty = document.createElement("p");
            empty.className = "project-no-photos";
            empty.textContent = "More photographs from this story will be added soon.";
            gallery.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();

        projectImages.forEach((item, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "project-gallery-item";
            button.setAttribute(
                "aria-label",
                `Open image ${index + 1} of ${projectImages.length}`
            );

            const image = document.createElement("img");
            image.src = safeImageUrl(item.file_url);
            image.alt = item.title || `Project photograph ${index + 1}`;
            image.loading = "lazy";
            image.decoding = "async";

            if (index === 0) {
                image.width = 1200;
                image.height = 675;
                image.sizes = "100vw";
            } else {
                image.width = 800;
                image.height = 600;
                image.sizes = "(max-width: 650px) 100vw, 50vw";
            }

            image.addEventListener("error", function () {
                image.src = fallbackImage;
            }, { once: true });

            button.appendChild(image);

            button.addEventListener("click", () => {
                openLightbox(index, button);
            });

            fragment.appendChild(button);
        });

        gallery.appendChild(fragment);
    }

    function openLightbox(index, triggerElement) {
        if (!projectImages.length) {
            return;
        }

        currentImageIndex = index;
        previousFocusElement = triggerElement;

        renderLightboxImage();

        if (!lightbox.open) {
            lightbox.showModal();
        }

        lightboxClose.focus();
    }

    function renderLightboxImage() {
        const item = projectImages[currentImageIndex];

        if (!item) {
            return;
        }

        setImageSource(lightboxImage, item.file_url);

        lightboxImage.alt = item.title || "Project photograph";
        lightboxTitle.textContent = item.title || "Project photograph";

        lightboxCounter.textContent =
            `${currentImageIndex + 1} / ${projectImages.length}`;

        lightboxPrevious.disabled = projectImages.length <= 1;
        lightboxNext.disabled = projectImages.length <= 1;
    }

    function navigateLightbox(direction) {
        if (!projectImages.length) {
            return;
        }

        currentImageIndex =
            (currentImageIndex + direction + projectImages.length) %
            projectImages.length;

        renderLightboxImage();
    }

    async function loadProjectImages(project) {
        const { data: relations, error: relationError } = await db
            .from("project_media")
            .select("media_id, sort_order")
            .eq("project_id", project.id)
            .order("sort_order", { ascending: true });

        if (relationError) {
            console.warn("Could not load project photo relationships:", relationError);
        }

        let loadedImages = [];

        const mediaIds = (relations || []).map(item => item.media_id);

        if (mediaIds.length > 0) {
            const { data: mediaRows, error: mediaError } = await db
                .from("media")
                .select("id, title, description, file_url, media_type")
                .in("id", mediaIds)
                .eq("is_published", true)
                .in("media_type", ["image", "photo"]);

            if (mediaError) {
                console.warn("Could not load project photographs:", mediaError);
            } else {
                const mediaMap = new Map(
                    (mediaRows || []).map(item => [item.id, item])
                );

                loadedImages = (relations || [])
                    .map(relation => mediaMap.get(relation.media_id))
                    .filter(Boolean);
            }
        }

        // Add the cover if it is not already part of the gallery.
        if (
            project.cover_image_url &&
            !loadedImages.some(
                item => item.file_url === project.cover_image_url
            )
        ) {
            loadedImages.unshift({
                id: "project-cover",
                title: project.title,
                file_url: project.cover_image_url
            });
        }

        // Use the first gallery photo as the cover when no cover is set.
        if (!project.cover_image_url && loadedImages.length > 0) {
            project.cover_image_url = loadedImages[0].file_url;
        }

        projectImages = loadedImages;
    }

    async function loadProject() {
        if (!db) {
            showError("The database connection is unavailable.");
            return;
        }

        const slug = new URLSearchParams(window.location.search).get("slug");

        if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            showError("The project link is missing or invalid.");
            return;
        }

        try {
            const { data: project, error } = await db
                .from("projects")
                .select(`
                    id,
                    title,
                    slug,
                    client_name,
                    project_type,
                    location,
                    event_date,
                    excerpt,
                    story,
                    cover_image_url
                `)
                .eq("slug", slug)
                .eq("is_published", true)
                .single();

            if (error) {
                throw error;
            }

            if (!project) {
                throw new Error("Project not found.");
            }

            await loadProjectImages(project);

            document.title = `${project.title} | Photography Studio`;

            const description = document.querySelector(
                'meta[name="description"]'
            );

            if (description && project.excerpt) {
                description.setAttribute("content", project.excerpt);
            }

            setText(titleElement, project.title);
            setText(typeElement, project.project_type, "PROJECT STORY");
            setText(excerptElement, project.excerpt, "");
            setText(clientElement, project.client_name);
            setText(locationElement, project.location);
            setText(dateElement, formatDate(project.event_date));
            setText(categoryElement, project.project_type);
            setText(storyElement, project.story || project.excerpt, "");

            if (project.cover_image_url) {
                setImageSource(coverImage, project.cover_image_url);
                coverImage.alt = project.title || "Project cover";
            } else if (projectImages.length > 0) {
                setImageSource(coverImage, projectImages[0].file_url);
                coverImage.alt = project.title || "Project cover";
            }

            renderGallery();

            loading.hidden = true;
            errorSection.hidden = true;
            main.hidden = false;

        } catch (error) {
            console.error("Project loading error:", error);

            showError(
                "The project may have been unpublished, removed or the link may be incorrect."
            );
        }
    }

    lightboxClose.addEventListener("click", () => {
        lightbox.close();
    });

    lightboxPrevious.addEventListener("click", () => {
        navigateLightbox(-1);
    });

    lightboxNext.addEventListener("click", () => {
        navigateLightbox(1);
    });

    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) {
            lightbox.close();
        }
    });

    lightbox.addEventListener("close", () => {
        if (previousFocusElement &&
            typeof previousFocusElement.focus === "function") {
            previousFocusElement.focus();
        }
    });

    document.addEventListener("keydown", event => {
        if (!lightbox.open) {
            return;
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            navigateLightbox(1);
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            navigateLightbox(-1);
        }
    });

    loadProject();
})();