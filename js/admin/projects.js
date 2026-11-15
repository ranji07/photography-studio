// ==========================================
// STEP 19 - ADMIN PROJECTS MANAGER
// ==========================================

(function () {
    "use strict";

    // Use the SAME admin UID already used by your existing admin security.
    const ADMIN_USER_ID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";

    const db = window.supabaseClient;

    const form = document.getElementById("project-form");
    const projectIdInput = document.getElementById("project-id");

    const titleInput = document.getElementById("project-title-input");
    const slugInput = document.getElementById("project-slug-input");
    const clientInput = document.getElementById("project-client-input");
    const typeInput = document.getElementById("project-type-input");
    const locationInput = document.getElementById("project-location-input");
    const dateInput = document.getElementById("project-date-input");
    const orderInput = document.getElementById("project-order-input");
    const excerptInput = document.getElementById("project-excerpt-input");
    const storyInput = document.getElementById("project-story-input");

    const featuredInput = document.getElementById("project-featured-input");
    const publishedInput = document.getElementById("project-published-input");

    const mediaPicker = document.getElementById("project-media-picker");
    const mediaCount = document.getElementById("selected-photo-count");
    const mediaError = document.getElementById("project-media-error");

    const formMessage = document.getElementById("project-form-message");
    const saveButton = document.getElementById("project-save-button");
    const resetButton = document.getElementById("project-reset-button");

    const formHeading = document.getElementById("project-form-heading");
    const editorStatus = document.getElementById("project-editor-status");

    const projectsList = document.getElementById("existing-projects-list");
    const refreshButton = document.getElementById("project-refresh-button");
    const logoutButton = document.getElementById("projects-logout");

    let availableMedia = [];
    let mediaMap = new Map();
    let projects = [];
    let slugManuallyEdited = false;

    // ------------------------------------------
    // 1. ADMIN AUTHENTICATION
    // ------------------------------------------

    async function requireAdmin() {
        if (!db) {
            window.location.href = "login.html";
            return false;
        }

        try {
            const { data, error } = await db.auth.getUser();

            if (error || !data.user) {
                window.location.href = "login.html";
                return false;
            }

            if (data.user.id !== ADMIN_USER_ID) {
                await db.auth.signOut();
                window.location.href = "login.html";
                return false;
            }

            return true;

        } catch (error) {
            console.error("Admin authentication error:", error);
            window.location.href = "login.html";
            return false;
        }
    }

    // ------------------------------------------
    // 2. UTILITY FUNCTIONS
    // ------------------------------------------

    function escapeSlug(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function showMessage(message, isError = false) {
        formMessage.textContent = message;
        formMessage.classList.toggle("error", isError);
    }

    function getSelectedMediaIds() {
        const selected = [
            ...mediaPicker.querySelectorAll(".project-media-checkbox:checked")
        ].map(input => input.value);

        const coverInput = mediaPicker.querySelector(
            ".project-cover-radio:checked"
        );

        const coverId = coverInput ? coverInput.value : null;

        // Keep the cover photograph first in the gallery order.
        if (coverId && selected.includes(coverId)) {
            return [
                coverId,
                ...selected.filter(id => id !== coverId)
            ];
        }

        return selected;
    }

    function updateMediaSelectionUI() {
        const selected = mediaPicker.querySelectorAll(
            ".project-media-checkbox:checked"
        );

        mediaCount.textContent =
            `${selected.length} selected`;

        mediaPicker.querySelectorAll(".project-media-option")
            .forEach(card => {
                const checkbox = card.querySelector(
                    ".project-media-checkbox"
                );

                card.classList.toggle("selected", checkbox.checked);
            });
    }

    // ------------------------------------------
    // 3. LOAD PUBLISHED MEDIA LIBRARY PHOTOS
    // ------------------------------------------

    async function loadAvailableMedia(
        selectedIds = [],
        preferredCoverId = null
    ) {
        mediaPicker.innerHTML = `
            <p class="project-picker-message">
                Loading published photographs...
            </p>
        `;

        const { data, error } = await db
            .from("media")
            .select("id, title, file_url, media_type, created_at")
            .eq("is_published", true)
            .in("media_type", ["image", "photo"])
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Media loading error:", error);

            mediaPicker.innerHTML = `
                <p class="project-picker-message">
                    Could not load Media Library photographs.
                    Refresh the page and try again.
                </p>
            `;

            return;
        }

        availableMedia = data || [];
        mediaMap = new Map(
            availableMedia.map(item => [item.id, item])
        );

        renderMediaPicker(selectedIds, preferredCoverId);
    }

    function renderMediaPicker(selectedIds = [], preferredCoverId = null) {
        mediaPicker.innerHTML = "";

        if (availableMedia.length === 0) {
            mediaPicker.innerHTML = `
                <p class="project-picker-message">
                    No published photographs are available.
                    Publish photographs in your Media Library first.
                </p>
            `;

            updateMediaSelectionUI();
            return;
        }

        const selectedSet = new Set(selectedIds);

        let coverId = preferredCoverId;

        if (!coverId || !selectedSet.has(coverId)) {
            coverId = selectedIds.find(id => selectedSet.has(id)) || null;
        }

        const fragment = document.createDocumentFragment();

        availableMedia.forEach(item => {
            const card = document.createElement("div");
            card.className = "project-media-option";

            const selectLabel = document.createElement("label");
            selectLabel.className = "project-media-select-row";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "project-media-checkbox";
            checkbox.value = item.id;
            checkbox.checked = selectedSet.has(item.id);

            const selectText = document.createElement("span");
            selectText.textContent = "Add to this project";

            selectLabel.append(checkbox, selectText);

            const image = document.createElement("img");
            image.src = item.file_url;
            image.alt = item.title || "Media Library photograph";
            image.loading = "lazy";

            image.addEventListener("error", function () {
                image.style.display = "none";
            }, { once: true });

            const title = document.createElement("span");
            title.className = "project-media-option-title";
            title.textContent = item.title || "Untitled photograph";

            const coverLabel = document.createElement("label");
            coverLabel.className = "project-media-cover-row";

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "project-cover-image";
            radio.className = "project-cover-radio";
            radio.value = item.id;
            radio.checked = coverId === item.id;

            const coverText = document.createElement("span");
            coverText.textContent = "Use as cover";

            coverLabel.append(radio, coverText);

            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    const existingCover = mediaPicker.querySelector(
                        ".project-cover-radio:checked"
                    );

                    if (!existingCover) {
                        radio.checked = true;
                    }
                } else if (radio.checked) {
                    radio.checked = false;

                    const nextSelected = mediaPicker.querySelector(
                        ".project-media-checkbox:checked"
                    );

                    if (nextSelected) {
                        const nextCard = nextSelected.closest(
                            ".project-media-option"
                        );

                        const nextRadio = nextCard.querySelector(
                            ".project-cover-radio"
                        );

                        nextRadio.checked = true;
                    }
                }

                updateMediaSelectionUI();
            });

            radio.addEventListener("change", () => {
                if (radio.checked && !checkbox.checked) {
                    checkbox.checked = true;
                }

                updateMediaSelectionUI();
            });

            card.append(
                selectLabel,
                image,
                title,
                coverLabel
            );

            fragment.appendChild(card);
        });

        mediaPicker.appendChild(fragment);
        updateMediaSelectionUI();
    }

    // ------------------------------------------
    // 4. LOAD EXISTING PROJECTS
    // ------------------------------------------

    async function loadProjects() {
        projectsList.innerHTML = `
            <p class="project-picker-message">Loading projects...</p>
        `;

        const { data, error } = await db
            .from("projects")
            .select("*")
            .order("is_featured", { ascending: false })
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Projects loading error:", error);

            projectsList.innerHTML = `
                <p class="project-picker-message">
                    Could not load projects.
                </p>
            `;

            return;
        }

        projects = data || [];
        renderProjectsList();
    }

    function renderProjectsList() {
        projectsList.innerHTML = "";

        if (projects.length === 0) {
            projectsList.innerHTML = `
                <p class="project-picker-message">
                    No projects created yet. Use the form above to create your first story.
                </p>
            `;

            return;
        }

        const fragment = document.createDocumentFragment();

        projects.forEach(project => {
            const row = document.createElement("article");
            row.className = "existing-project-row";

            const info = document.createElement("div");
            info.className = "existing-project-info";

            const title = document.createElement("h3");
            title.textContent = project.title;

            const details = document.createElement("p");
            details.textContent = [
                project.project_type || "Photography",
                project.location || "Location not set",
                `Order: ${project.display_order}`
            ].join(" · ");

            const status = document.createElement("span");
            status.className = "existing-project-status";
            status.textContent = project.is_published
                ? "Published"
                : "Unpublished";

            if (project.is_featured) {
                status.textContent += " · Featured";
            }

            info.append(title, details, status);

            const actions = document.createElement("div");
            actions.className = "existing-project-actions";

            const editButton = createActionButton(
                "Edit",
                "edit",
                project.id
            );

            const viewButton = createActionButton(
                "View",
                "view",
                project.id
            );

            const publishButton = createActionButton(
                project.is_published ? "Unpublish" : "Publish",
                "toggle-publish",
                project.id
            );

            const deleteButton = createActionButton(
                "Delete",
                "delete",
                project.id
            );

            actions.append(
                editButton,
                viewButton,
                publishButton,
                deleteButton
            );

            row.append(info, actions);
            fragment.appendChild(row);
        });

        projectsList.appendChild(fragment);
    }

    function createActionButton(label, action, projectId) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.projectId = projectId;

        return button;
    }

    // ------------------------------------------
    // 5. CREATE / UPDATE PROJECT
    // ------------------------------------------

    async function saveProject(event) {
        event.preventDefault();

        showMessage("");
        mediaError.textContent = "";

        const title = titleInput.value.trim();
        const slug = slugInput.value.trim();
        const selectedMediaIds = getSelectedMediaIds();

        if (!title) {
            showMessage("Please enter a project title.", true);
            titleInput.focus();
            return;
        }

        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            showMessage(
                "Use a valid slug containing lowercase letters, numbers and hyphens.",
                true
            );
            slugInput.focus();
            return;
        }

        if (selectedMediaIds.length === 0) {
            mediaError.textContent =
                "Select at least one published photograph for this project.";
            return;
        }

        if (selectedMediaIds.length > 30) {
            mediaError.textContent =
                "You can select a maximum of 30 photographs.";
            return;
        }

        const coverMedia = mediaMap.get(selectedMediaIds[0]);

        if (!coverMedia) {
            mediaError.textContent =
                "The selected cover photograph is unavailable. Refresh the page and try again.";
            return;
        }

        const projectId = projectIdInput.value;

        const payload = {
            title: title,
            slug: slug,
            client_name: clientInput.value.trim() || null,
            project_type: typeInput.value.trim() || null,
            location: locationInput.value.trim() || null,
            event_date: dateInput.value || null,
            excerpt: excerptInput.value.trim() || null,
            story: storyInput.value.trim() || null,
            cover_image_url: coverMedia.file_url,
            display_order: Math.max(0, Number(orderInput.value) || 0),
            is_featured: featuredInput.checked,
            is_published: publishedInput.checked,
            updated_at: new Date().toISOString()
        };

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            let savedProject;

            if (projectId) {
                const { data, error } = await db
                    .from("projects")
                    .update(payload)
                    .eq("id", projectId)
                    .select("*")
                    .single();

                if (error) {
                    throw error;
                }

                savedProject = data;

            } else {
                const { data, error } = await db
                    .from("projects")
                    .insert(payload)
                    .select("*")
                    .single();

                if (error) {
                    throw error;
                }

                savedProject = data;
            }

            // Replace photo relationships transactionally through the SQL function.
            const { error: relationError } = await db.rpc(
                "replace_project_media",
                {
                    p_project_id: savedProject.id,
                    p_media_ids: selectedMediaIds
                }
            );

            if (relationError) {
                console.error("Project photos update error:", relationError);

                await loadProjects();

                showMessage(
                    "Project details saved, but its photo list could not be updated. Check the database function and try saving again.",
                    true
                );

                return;
            }

            showMessage(
                projectId
                    ? "Project updated successfully."
                    : "New project created successfully."
            );

            await loadProjects();
            resetForm();

        } catch (error) {
            console.error("Project save error:", error);

            let message = error.message || "Unable to save the project.";

            if (error.code === "23505") {
                message = "This URL slug is already in use. Please choose another.";
            }

            showMessage(message, true);

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save project";
        }
    }

    // ------------------------------------------
    // 6. EDIT PROJECT
    // ------------------------------------------

    async function editProject(projectId) {
        const project = projects.find(item => item.id === projectId);

        if (!project) {
            showMessage("Project not found. Refresh and try again.", true);
            return;
        }

        try {
            const { data: relations, error } = await db
                .from("project_media")
                .select("media_id, sort_order")
                .eq("project_id", projectId)
                .order("sort_order", { ascending: true });

            if (error) {
                throw error;
            }

            const selectedIds = (relations || [])
                .map(item => item.media_id);

            const preferredCover = availableMedia.find(
                item => item.file_url === project.cover_image_url
            );

            form.reset();

            projectIdInput.value = project.id;
            titleInput.value = project.title || "";
            slugInput.value = project.slug || "";
            clientInput.value = project.client_name || "";
            typeInput.value = project.project_type || "";
            locationInput.value = project.location || "";
            dateInput.value = project.event_date || "";
            orderInput.value = project.display_order ?? 0;
            excerptInput.value = project.excerpt || "";
            storyInput.value = project.story || "";

            featuredInput.checked = Boolean(project.is_featured);
            publishedInput.checked = Boolean(project.is_published);

            slugManuallyEdited = true;

            renderMediaPicker(
                selectedIds,
                preferredCover ? preferredCover.id : null
            );

            formHeading.textContent = "Edit project";
            editorStatus.textContent = "Editing project";
            saveButton.textContent = "Update project";

            mediaError.textContent = "";
            showMessage("Project loaded for editing.");

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } catch (error) {
            console.error("Project edit loading error:", error);
            showMessage("Could not load this project's photographs.", true);
        }
    }

    // ------------------------------------------
    // 7. PUBLISH / UNPUBLISH
    // ------------------------------------------

    async function toggleProjectPublication(projectId) {
        const project = projects.find(item => item.id === projectId);

        if (!project) {
            return;
        }

        const nextStatus = !project.is_published;

        const { error } = await db
            .from("projects")
            .update({
                is_published: nextStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", projectId);

        if (error) {
            console.error("Project publication update error:", error);
            alert("Could not update the project's publication status.");
            return;
        }

        await loadProjects();
    }

    // ------------------------------------------
    // 8. DELETE PROJECT
    // ------------------------------------------

    async function deleteProject(projectId) {
        const project = projects.find(item => item.id === projectId);

        if (!project) {
            return;
        }

        const confirmed = window.confirm(
            `Delete "${project.title}"?\n\nThis removes the project and its photo links. The original Media Library photographs will not be deleted.`
        );

        if (!confirmed) {
            return;
        }

        const { error } = await db
            .from("projects")
            .delete()
            .eq("id", projectId);

        if (error) {
            console.error("Project delete error:", error);
            alert("Unable to delete this project.");
            return;
        }

        if (projectIdInput.value === projectId) {
            resetForm();
        }

        await loadProjects();
    }

    // ------------------------------------------
    // 9. RESET FORM
    // ------------------------------------------

    function resetForm() {
        form.reset();

        projectIdInput.value = "";
        orderInput.value = "0";

        slugManuallyEdited = false;

        formHeading.textContent = "Create a new project";
        editorStatus.textContent = "New project";
        saveButton.textContent = "Save project";

        mediaError.textContent = "";
        showMessage("");

        renderMediaPicker();
    }

    // ------------------------------------------
    // 10. EVENT LISTENERS
    // ------------------------------------------

    titleInput.addEventListener("input", () => {
        if (!slugManuallyEdited) {
            slugInput.value = escapeSlug(titleInput.value);
        }
    });

    slugInput.addEventListener("input", () => {
        slugManuallyEdited = true;
        slugInput.value = escapeSlug(slugInput.value);
    });

    form.addEventListener("submit", saveProject);

    resetButton.addEventListener("click", resetForm);

    refreshButton.addEventListener("click", async () => {
        await loadAvailableMedia();
        await loadProjects();
    });

    projectsList.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const projectId = button.dataset.projectId;
        const action = button.dataset.action;

        if (action === "edit") {
            await editProject(projectId);
        }

        if (action === "toggle-publish") {
            await toggleProjectPublication(projectId);
        }

        if (action === "delete") {
            await deleteProject(projectId);
        }

        if (action === "view") {
            const project = projects.find(item => item.id === projectId);

            if (project) {
                window.open(
                    `../pages/project.html?slug=${encodeURIComponent(project.slug)}`,
                    "_blank",
                    "noopener"
                );
            }
        }
    });

    logoutButton.addEventListener("click", async () => {
        await db.auth.signOut();
        window.location.href = "login.html";
    });

    // ------------------------------------------
    // 11. INITIALIZE
    // ------------------------------------------

    async function initialize() {
        const authorized = await requireAdmin();

        if (!authorized) {
            return;
        }

        await Promise.all([
            loadAvailableMedia(),
            loadProjects()
        ]);
    }

    initialize();
})();