// ==========================================
// STEP 19 - PUBLIC STORIES
// ==========================================

(function () {
    "use strict";

    const db = window.supabaseClient;

    const grid = document.getElementById("stories-grid");
    const filtersContainer = document.getElementById("stories-filters");
    const searchInput = document.getElementById("stories-search");
    const countElement = document.getElementById("stories-count");
    const messageElement = document.getElementById("stories-message");

    let allProjects = [];
    let activeFilter = "all";

    if (!db) {
        showError("The website database connection is unavailable.");
        return;
    }

    function showError(message) {
        if (grid) {
            grid.innerHTML = `
                <div class="stories-empty">
                    <p>Stories could not be loaded.</p>
                </div>
            `;
        }

        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    function safeImageUrl(url) {
        if (!url) {
            return "../assets/images/studio-about.jpg";
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

        return "../assets/images/studio-about.jpg";
    }

    function formatProjectDate(dateValue) {
        if (!dateValue) {
            return "";
        }

        const date = new Date(dateValue + "T00:00:00");

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat("en", {
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function createProjectCard(project) {
        const article = document.createElement("article");
        article.className = "story-card";

        const link = document.createElement("a");
        link.className = "story-card-link";
        link.href = `project.html?slug=${encodeURIComponent(project.slug)}`;

        const imageWrap = document.createElement("div");
        imageWrap.className = "story-card-image-wrap";

        const image = document.createElement("img");
        image.className = "story-card-image";
        image.src = safeImageUrl(project.cover_image_url);
        image.alt = project.title || "Photography project";
        image.loading = "lazy";
        image.decoding = "async";

        image.addEventListener("error", function () {
            image.src = "../assets/images/studio-about.jpg";
        }, { once: true });

        const overlay = document.createElement("div");
        overlay.className = "story-card-overlay";

        const overlayText = document.createElement("span");
        overlayText.textContent = "Explore this story ↗";

        overlay.appendChild(overlayText);
        imageWrap.append(image, overlay);

        const meta = document.createElement("div");
        meta.className = "story-card-meta";

        const type = document.createElement("span");
        type.textContent = project.project_type || "Photography";

        const date = document.createElement("span");
        date.textContent = formatProjectDate(project.event_date);

        meta.append(type, date);

        const title = document.createElement("h3");
        title.textContent = project.title;

        const excerpt = document.createElement("p");
        excerpt.className = "story-card-excerpt";
        excerpt.textContent = project.excerpt || "";

        link.append(imageWrap);
        article.append(link, meta, title, excerpt);

        if (project.is_featured) {
            const featured = document.createElement("span");
            featured.className = "story-card-featured";
            featured.textContent = "Featured story";
            article.appendChild(featured);
        }

        return article;
    }

    function renderProjects() {
        const searchText = (searchInput.value || "")
            .trim()
            .toLowerCase();

        const filtered = allProjects.filter(project => {
            const matchesFilter =
                activeFilter === "all" ||
                (project.project_type || "").toLowerCase() === activeFilter;

            const searchableText = [
                project.title,
                project.client_name,
                project.location,
                project.project_type,
                project.excerpt
            ].filter(Boolean).join(" ").toLowerCase();

            return matchesFilter && searchableText.includes(searchText);
        });

        grid.innerHTML = "";

        if (countElement) {
            countElement.textContent =
                `${filtered.length} ${filtered.length === 1 ? "story" : "stories"}`;
        }

        if (filtered.length === 0) {
            const empty = document.createElement("div");
            empty.className = "stories-empty";
            empty.textContent = allProjects.length
                ? "No stories match your search."
                : "New stories are coming soon.";

            grid.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();

        filtered.forEach(project => {
            fragment.appendChild(createProjectCard(project));
        });

        grid.appendChild(fragment);
    }

    function renderFilters() {
        filtersContainer.innerHTML = "";

        const allButton = document.createElement("button");
        allButton.type = "button";
        allButton.className = "story-filter active";
        allButton.dataset.filter = "all";
        allButton.textContent = "All stories";

        allButton.addEventListener("click", () => {
            setActiveFilter("all");
        });

        filtersContainer.appendChild(allButton);

        const categories = [
            ...new Set(
                allProjects
                    .map(project => (project.project_type || "").trim())
                    .filter(Boolean)
            )
        ];

        categories.forEach(category => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "story-filter";
            button.dataset.filter = category.toLowerCase();
            button.textContent = category;

            button.addEventListener("click", () => {
                setActiveFilter(category.toLowerCase());
            });

            filtersContainer.appendChild(button);
        });
    }

    function setActiveFilter(filter) {
        activeFilter = filter;

        filtersContainer
            .querySelectorAll(".story-filter")
            .forEach(button => {
                const isActive = button.dataset.filter === filter;
                button.classList.toggle("active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });

        renderProjects();
    }

    async function loadProjects() {
        try {
            const { data, error } = await db
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
                    cover_image_url,
                    is_featured,
                    display_order,
                    created_at
                `)
                .eq("is_published", true)
                .order("is_featured", { ascending: false })
                .order("display_order", { ascending: true })
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            allProjects = data || [];

            renderFilters();
            renderProjects();

            if (messageElement) {
                messageElement.textContent = "";
            }

        } catch (error) {
            console.error("Stories loading error:", error);
            showError("Please refresh the page or try again later.");
        }
    }

    searchInput.addEventListener("input", renderProjects);

    loadProjects();
})();