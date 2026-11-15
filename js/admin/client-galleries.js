// ==========================================
// STEP 25 - ADMIN PRIVATE CLIENT GALLERIES
// ==========================================

(function () {
    "use strict";

    const ADMIN_USER_ID =
        "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";

    const BUCKET = "client-galleries";
    const MAX_FILE_SIZE = 6 * 1024 * 1024;

    const db = window.supabaseClient;


    // --------------------------------------
    // DOM
    // --------------------------------------

    const form = document.getElementById("client-gallery-form");

    const idInput = document.getElementById("client-gallery-id");
    const titleInput = document.getElementById("client-gallery-title");
    const clientInput = document.getElementById("client-gallery-client-name");
    const slugInput = document.getElementById("client-gallery-slug");
    const eventDateInput = document.getElementById("client-gallery-event-date");
    const expiryInput = document.getElementById("client-gallery-expires-at");
    const passwordInput = document.getElementById("client-gallery-password");

    const activeInput = document.getElementById("client-gallery-active");
    const downloadsInput = document.getElementById("client-gallery-downloads");
    const favoritesInput = document.getElementById("client-gallery-favorites");
    const selectionInput = document.getElementById("client-gallery-selection");

    const formHeading = document.getElementById("client-gallery-form-heading");
    const editorStatus = document.getElementById("client-gallery-editor-status");
    const formMessage = document.getElementById("client-gallery-form-message");
    const saveButton = document.getElementById("client-gallery-save");

    const resetButton = document.getElementById("client-gallery-reset");
    const copyPasswordButton = document.getElementById("client-gallery-copy-password");

    const galleryList = document.getElementById("client-gallery-list");
    const refreshButton = document.getElementById("client-gallery-refresh");

    const workspace = document.getElementById("client-gallery-workspace");
    const workspaceTitle = document.getElementById("client-gallery-workspace-title");
    const workspaceCount = document.getElementById("client-gallery-workspace-count");

    const shareUrl = document.getElementById("client-gallery-share-url");
    const copyLinkButton = document.getElementById("client-gallery-copy-link");

    const filesInput = document.getElementById("client-gallery-files");
    const uploadButton = document.getElementById("client-gallery-upload-button");
    const uploadStatus = document.getElementById("client-gallery-upload-status");

    const photoList = document.getElementById("client-gallery-photo-list");
    const submissionList = document.getElementById("client-gallery-submission-list");

    const logoutButton = document.getElementById("client-admin-logout");


    // --------------------------------------
    // STATE
    // --------------------------------------

    let galleries = [];
    let selectedGallery = null;
    let selectedPhotos = [];
    let submittedPhotoIds = new Set();
    let editingSlugManually = false;
    let saving = false;


    // --------------------------------------
    // AUTHENTICATION
    // --------------------------------------

    async function requireAdmin() {
        if (!db) {
            window.location.href = "login.html";
            return false;
        }

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
    }


    // --------------------------------------
    // HELPERS
    // --------------------------------------

    function message(text, isError = false) {
        formMessage.textContent = text;
        formMessage.classList.toggle("error", isError);
    }

    function escapeSlug(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function safeFileName(name) {
        const original = String(name || "photo")
            .split(/[\\/]/)
            .pop();

        const clean = original
            .replace(/[^a-zA-Z0-9._-]/g, "-")
            .replace(/-+/g, "-")
            .slice(-100);

        return clean || "photo";
    }

    function buildGalleryLink(gallery) {
        return `${window.location.origin}/pages/client-gallery.html?slug=${encodeURIComponent(gallery.slug)}`;
    }

    function formatDate(value) {
        if (!value) return "Date not set";

        return new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date(value + "T00:00:00"));
    }

    function formatDateTime(value) {
        if (!value) return "No expiry";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Invalid date";
        }

        return new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function createButton(label, action, id) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.id = id;

        return button;
    }


    // --------------------------------------
    // FORM RESET / EDIT
    // --------------------------------------

    function resetForm() {
        form.reset();

        idInput.value = "";
        expiryInput.value = "";
        passwordInput.value = "";

        activeInput.checked = true;
        downloadsInput.checked = false;
        favoritesInput.checked = true;
        selectionInput.checked = true;

        editingSlugManually = false;

        formHeading.textContent = "Create a private gallery";
        editorStatus.textContent = "New gallery";
        saveButton.textContent = "Save gallery";

        message("");
    }


    function editGallery(gallery) {
        idInput.value = gallery.id;

        titleInput.value = gallery.title || "";
        clientInput.value = gallery.client_name || "";
        slugInput.value = gallery.slug || "";
        eventDateInput.value = gallery.event_date || "";

        expiryInput.value = gallery.expires_at
            ? new Date(gallery.expires_at).toISOString().slice(0, 16)
            : "";

        // The current password is never retrieved.
        passwordInput.value = "";

        activeInput.checked = Boolean(gallery.is_active);
        downloadsInput.checked = Boolean(gallery.allow_downloads);
        favoritesInput.checked = Boolean(gallery.allow_favorites);
        selectionInput.checked = Boolean(gallery.allow_selection);

        editingSlugManually = true;

        formHeading.textContent = "Edit private gallery";
        editorStatus.textContent = "Editing gallery";
        saveButton.textContent = "Update gallery";

        message(
            "Gallery details loaded. Leave password blank to keep the current password."
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    // --------------------------------------
    // SAVE GALLERY
    // --------------------------------------

    async function saveGallery(event) {
        event.preventDefault();

        if (saving) return;

        message("");

        const id = idInput.value;
        const title = titleInput.value.trim();
        const slug = slugInput.value.trim();
        const password = passwordInput.value;

        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            message(
                "Enter a valid slug using lowercase letters, numbers and hyphens.",
                true
            );
            slugInput.focus();
            return;
        }

        if (!id && password.length < 8) {
            message(
                "A new gallery requires a password of at least 8 characters.",
                true
            );
            passwordInput.focus();
            return;
        }

        if (password && password.length < 8) {
            message(
                "A new password must contain at least 8 characters.",
                true
            );
            passwordInput.focus();
            return;
        }

        if (selectionInput.checked && !favoritesInput.checked) {
            message(
                "Enable favourites when final selection is enabled.",
                true
            );
            favoritesInput.focus();
            return;
        }

        const expiry = expiryInput.value
            ? new Date(expiryInput.value)
            : null;

        if (expiry && expiry.getTime() <= Date.now()) {
            message(
                "Choose a future gallery expiry date and time.",
                true
            );
            expiryInput.focus();
            return;
        }

        const payload = {
            title,
            slug,
            client_name: clientInput.value.trim() || null,
            event_date: eventDateInput.value || null,

            expires_at: expiry
                ? expiry.toISOString()
                : null,

            is_active: activeInput.checked,
            allow_downloads: downloadsInput.checked,
            allow_favorites: favoritesInput.checked,
            allow_selection: selectionInput.checked,

            updated_at: new Date().toISOString()
        };

        saving = true;
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        let savedGallery = null;

        try {
            if (id) {
                const { data, error } = await db
                    .from("client_galleries")
                    .update(payload)
                    .eq("id", id)
                    .select("*")
                    .single();

                if (error) throw error;

                savedGallery = data;

            } else {
                const { data, error } = await db
                    .from("client_galleries")
                    .insert(payload)
                    .select("*")
                    .single();

                if (error) throw error;

                savedGallery = data;
            }


            // Store the password as a bcrypt hash using an admin-only RPC.
            if (password) {
                const { error: passwordError } = await db.rpc(
                    "set_client_gallery_password",
                    {
                        p_gallery_id: savedGallery.id,
                        p_password: password
                    }
                );

                if (passwordError) {
                    if (!id) {
                        await db
                            .from("client_galleries")
                            .delete()
                            .eq("id", savedGallery.id);
                    }

                    throw passwordError;
                }
            }


            message(
                id
                    ? "Private gallery updated successfully."
                    : "Private gallery created successfully."
            );

            await loadGalleries();

            if (selectedGallery?.id === savedGallery.id) {
                selectedGallery = savedGallery;
                await selectGallery(savedGallery.id);
            }

            if (!id) {
                const passwordToCopy = password;

                resetForm();

                // Keep it temporarily in the masked password field
                // so the administrator can copy and share it separately.
                passwordInput.value = passwordToCopy;

                message(
                    "Gallery created. Copy its password now and share it with the client separately. It cannot be retrieved later."
                );

            } else if (password) {
                passwordInput.value = "";

                message(
                    "Gallery updated and password changed successfully."
                );
            }

        } catch (error) {
            console.error("Gallery save error:", error);

            message(
                error.message || "Could not save the gallery.",
                true
            );

        } finally {
            saving = false;
            saveButton.disabled = false;

            saveButton.textContent = idInput.value
                ? "Update gallery"
                : "Save gallery";
        }
    }


    // --------------------------------------
    // LOAD / RENDER GALLERIES
    // --------------------------------------

    async function loadGalleries() {
        galleryList.innerHTML = `
            <p class="client-gallery-empty">Loading galleries...</p>
        `;

        const { data, error } = await db
            .from("client_galleries")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Gallery list error:", error);

            galleryList.innerHTML = `
                <p class="client-gallery-empty">Could not load galleries.</p>
            `;

            return;
        }

        galleries = data || [];

        renderGalleryList();
    }


    function renderGalleryList() {
        galleryList.innerHTML = "";

        if (!galleries.length) {
            galleryList.innerHTML = `
                <p class="client-gallery-empty">
                    No client galleries created yet.
                </p>
            `;

            return;
        }

        const fragment = document.createDocumentFragment();

        galleries.forEach(gallery => {
            const row = document.createElement("article");
            row.className = "client-gallery-list-row";

            const info = document.createElement("div");
            info.className = "client-gallery-list-info";

            const title = document.createElement("h3");
            title.textContent = gallery.title;

            const details = document.createElement("p");

            details.textContent = [
                gallery.client_name || "Client not specified",
                formatDate(gallery.event_date),
                `Slug: ${gallery.slug}`,
                `Expires: ${formatDateTime(gallery.expires_at)}`
            ].join(" · ");

            const status = document.createElement("span");
            status.className = "client-gallery-list-status";

            status.textContent = gallery.is_active
                ? "Active"
                : "Disabled";

            info.append(title, details, status);

            const actions = document.createElement("div");
            actions.className = "client-gallery-list-actions";

            actions.append(
                createButton("Manage", "manage", gallery.id),
                createButton("Edit", "edit", gallery.id),
                createButton("Copy link", "copy", gallery.id),
                createButton("Delete", "delete", gallery.id)
            );

            row.append(info, actions);
            fragment.appendChild(row);
        });

        galleryList.appendChild(fragment);
    }


    // --------------------------------------
    // SELECT GALLERY
    // --------------------------------------

    async function selectGallery(id) {
        const gallery = galleries.find(item => item.id === id);

        if (!gallery) {
            return;
        }

        selectedGallery = gallery;

        workspace.hidden = false;

        workspaceTitle.textContent = gallery.title;

        shareUrl.textContent = buildGalleryLink(gallery);

        photoList.innerHTML = `
            <p class="client-gallery-empty">Loading photographs...</p>
        `;

        await Promise.all([
            loadPhotos(gallery),
            loadSubmissions(gallery)
        ]);

        workspace.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    // --------------------------------------
    // LOAD PHOTOS
    // --------------------------------------

    async function loadPhotos(gallery) {
        const { data, error } = await db
            .from("client_gallery_photos")
            .select("*")
            .eq("gallery_id", gallery.id)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Gallery photo loading error:", error);

            photoList.innerHTML = `
                <p class="client-gallery-empty">
                    Could not load gallery photographs.
                </p>
            `;

            return;
        }

        selectedPhotos = data || [];

        workspaceCount.textContent =
            `${selectedPhotos.length} ${selectedPhotos.length === 1 ? "photo" : "photos"}`;

        const photoPaths = selectedPhotos.map(item => item.object_path);

        const signedMap = new Map();

        if (photoPaths.length) {
            const { data: signedRows, error: signedError } =
                await db.storage
                    .from(BUCKET)
                    .createSignedUrls(photoPaths, 600);

            if (signedError) {
                console.error("Admin image preview error:", signedError);
            } else {
                (signedRows || []).forEach(item => {
                    if (item.path && item.signedUrl) {
                        signedMap.set(item.path, item.signedUrl);
                    }
                });
            }
        }

        renderPhotos(signedMap);
    }


    function renderPhotos(signedMap) {
        photoList.innerHTML = "";

        if (!selectedPhotos.length) {
            photoList.innerHTML = `
                <p class="client-gallery-empty">
                    No photographs uploaded to this gallery yet.
                </p>
            `;

            return;
        }

        const fragment = document.createDocumentFragment();

        selectedPhotos.forEach(photo => {
            const card = document.createElement("article");
            card.className = "client-admin-photo-card";

            const image = document.createElement("img");

            image.alt = photo.caption || photo.file_name;

            image.src =
                signedMap.get(photo.object_path) || "";

            const name = document.createElement("p");
            name.textContent = photo.caption || photo.file_name;

            const isSubmitted = submittedPhotoIds.has(photo.id);

            const deleteButton = createButton(
                isSubmitted ? "Used in submitted selection" : "Delete photo",
                "delete-photo",
                photo.id
            );

            deleteButton.disabled = isSubmitted;

            if (isSubmitted) {
                deleteButton.title =
                    "This photograph is part of a submitted client selection.";
            }

            card.append(image, name, deleteButton);

            fragment.appendChild(card);
        });

        photoList.appendChild(fragment);
    }


    // --------------------------------------
    // UPLOAD PRIVATE PHOTOGRAPHS
    // --------------------------------------

    async function uploadPhotos() {
        if (!selectedGallery || !filesInput.files.length) {
            return;
        }

        const files = Array.from(filesInput.files);

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        for (const file of files) {
            if (!allowedTypes.includes(file.type)) {
                uploadStatus.textContent =
                    `${file.name}: unsupported file type.`;

                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                uploadStatus.textContent =
                    `${file.name}: exceeds the 6 MB limit.`;

                return;
            }
        }

        uploadButton.disabled = true;

        let successful = 0;

        try {
            for (let index = 0; index < files.length; index++) {
                const file = files[index];

                const objectPath =
                    `${selectedGallery.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

                uploadStatus.textContent =
                    `Uploading ${index + 1} of ${files.length}: ${file.name}`;

                const { error: storageError } = await db
                    .storage
                    .from(BUCKET)
                    .upload(objectPath, file, {
                        cacheControl: "3600",
                        contentType: file.type,
                        upsert: false
                    });

                if (storageError) {
                    console.error("Private storage upload error:", storageError);

                    uploadStatus.textContent =
                        `Could not upload ${file.name}.`;

                    continue;
                }

                const caption = file.name.replace(/\.[^.]+$/, "");

                const { error: rowError } = await db
                    .from("client_gallery_photos")
                    .insert({
                        gallery_id: selectedGallery.id,
                        object_path: objectPath,
                        file_name: file.name,
                        caption,
                        sort_order: selectedPhotos.length + successful
                    });

                if (rowError) {
                    console.error("Photo record insert error:", rowError);

                    await db.storage
                        .from(BUCKET)
                        .remove([objectPath]);

                    uploadStatus.textContent =
                        `Could not save ${file.name} in the gallery.`;

                    continue;
                }

                successful++;
            }

            uploadStatus.textContent =
                `${successful} of ${files.length} photographs uploaded.`;

            filesInput.value = "";

            await selectGallery(selectedGallery.id);

        } catch (error) {
            console.error("Gallery photo upload error:", error);

            uploadStatus.textContent =
                error.message || "Photo upload failed.";

        } finally {
            uploadButton.disabled = filesInput.files.length === 0;
        }
    }


    // --------------------------------------
    // SUBMISSIONS AND PHOTO IDS
    // --------------------------------------

    async function loadSubmissions(gallery) {
        submissionList.innerHTML = `
            <p class="client-gallery-empty">Loading selections...</p>
        `;

        submittedPhotoIds = new Set();

        const { data: submissions, error } = await db
            .from("client_gallery_submissions")
            .select("id, client_note, created_at")
            .eq("gallery_id", gallery.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Submission loading error:", error);

            submissionList.innerHTML = `
                <p class="client-gallery-empty">
                    Could not load client selections.
                </p>
            `;

            return;
        }

        const allPhotoIds = new Set();

        const records = await Promise.all(
            (submissions || []).map(async submission => {
                const { data: items, error: itemError } = await db
                    .from("client_gallery_submission_items")
                    .select("gallery_photo_id")
                    .eq("submission_id", submission.id);

                if (itemError) {
                    console.error("Submission item error:", itemError);
                    return {
                        submission,
                        photoIds: []
                    };
                }

                const photoIds = (items || []).map(
                    item => item.gallery_photo_id
                );

                photoIds.forEach(id => {
                    allPhotoIds.add(id);
                });

                return {
                    submission,
                    photoIds
                };
            })
        );

        submittedPhotoIds = allPhotoIds;

        renderSubmissions(records);

        if (selectedPhotos.length) {
            const previewRows = await db.storage
                .from(BUCKET)
                .createSignedUrls(
                    selectedPhotos.map(photo => photo.object_path),
                    600
                );

            const signedMap = new Map();

            (previewRows.data || []).forEach(item => {
                if (item.path && item.signedUrl) {
                    signedMap.set(item.path, item.signedUrl);
                }
            });

            renderPhotos(signedMap);
        }
    }


    function renderSubmissions(records) {
        submissionList.innerHTML = "";

        if (!records.length) {
            submissionList.innerHTML = `
                <p class="client-gallery-empty">
                    No final selections have been submitted yet.
                </p>
            `;

            return;
        }

        const photoNameMap = new Map(
            selectedPhotos.map(photo => [
                photo.id,
                photo.caption || photo.file_name
            ])
        );

        records.forEach(record => {
            const article = document.createElement("article");

            article.className = "client-gallery-submission";

            const heading = document.createElement("h3");
            heading.textContent =
                `Selection received · ${formatDateTime(record.submission.created_at)}`;

            const note = document.createElement("p");

            note.textContent =
                record.submission.client_note ||
                "No additional note supplied.";

            const list = document.createElement("ul");

            record.photoIds.forEach(photoId => {
                const li = document.createElement("li");

                li.textContent =
                    photoNameMap.get(photoId) ||
                    "Photograph record";

                list.appendChild(li);
            });

            article.append(heading, note, list);
            submissionList.appendChild(article);
        });
    }


    // --------------------------------------
    // DELETE PHOTO
    // --------------------------------------

    async function deletePhoto(photoId) {
        if (submittedPhotoIds.has(photoId)) {
            alert(
                "This photograph is part of a submitted selection and cannot be deleted from this gallery."
            );

            return;
        }

        const photo = selectedPhotos.find(
            item => item.id === photoId
        );

        if (!photo) return;

        const confirmed = window.confirm(
            `Delete "${photo.file_name}" from this private gallery?`
        );

        if (!confirmed) return;

        // Delete the database row first. If it is referenced by a
        // submitted selection, the foreign-key restriction prevents deletion.
        const { error: rowError } = await db
            .from("client_gallery_photos")
            .delete()
            .eq("id", photoId);

        if (rowError) {
            console.error("Photo row delete failed:", rowError);

            alert(
                "This photograph could not be deleted. It may be part of a submitted selection."
            );

            return;
        }

        const { error: storageError } = await db
            .storage
            .from(BUCKET)
            .remove([photo.object_path]);

        if (storageError) {
            console.error("Storage object cleanup failed:", storageError);

            alert(
                "The photo record was removed, but the storage file could not be deleted. Check Storage and remove the orphan file if necessary."
            );
        }

        await selectGallery(selectedGallery.id);
    }


    // --------------------------------------
    // DELETE GALLERY
    // --------------------------------------

    async function deleteGallery(id) {
        const gallery = galleries.find(item => item.id === id);

        if (!gallery) return;

        const confirmed = window.confirm(
            `Permanently delete "${gallery.title}"?\n\nThis removes its private photographs, sessions, favourites and submitted selections. This cannot be undone.`
        );

        if (!confirmed) return;

        const { data: photos, error: photoError } = await db
            .from("client_gallery_photos")
            .select("object_path")
            .eq("gallery_id", id);

        if (photoError) {
            alert("Could not load gallery files for deletion.");
            return;
        }

        // Delete submitted selection records first to satisfy the
        // photo-selection foreign-key restriction.
        const { error: submissionError } = await db
            .from("client_gallery_submissions")
            .delete()
            .eq("gallery_id", id);

        if (submissionError) {
            console.error("Submission cleanup error:", submissionError);
            alert("Could not remove gallery selections.");
            return;
        }

        const { error: galleryError } = await db
            .from("client_galleries")
            .delete()
            .eq("id", id);

        if (galleryError) {
            console.error("Gallery deletion error:", galleryError);
            alert(galleryError.message || "Could not delete gallery.");
            return;
        }

        const paths = (photos || []).map(item => item.object_path);

        if (paths.length) {
            const { error: storageError } = await db
                .storage
                .from(BUCKET)
                .remove(paths);

            if (storageError) {
                console.error("Storage cleanup error:", storageError);

                alert(
                    "The gallery was deleted, but some storage files may remain. Check the private bucket."
                );
            }
        }

        if (selectedGallery?.id === id) {
            selectedGallery = null;
            workspace.hidden = true;
        }

        if (idInput.value === id) {
            resetForm();
        }

        await loadGalleries();
    }


    // --------------------------------------
    // CLIPBOARD
    // --------------------------------------

    async function copyText(value) {
        if (!value) {
            alert("There is nothing to copy.");
            return;
        }

        try {
            await navigator.clipboard.writeText(value);

        } catch (error) {
            window.prompt(
                "Copy this value:",
                value
            );
        }
    }


    // --------------------------------------
    // EVENTS
    // --------------------------------------

    titleInput.addEventListener("input", () => {
        if (!editingSlugManually) {
            slugInput.value = escapeSlug(titleInput.value);
        }
    });

    slugInput.addEventListener("input", () => {
        editingSlugManually = true;
        slugInput.value = escapeSlug(slugInput.value);
    });


    form.addEventListener("submit", saveGallery);

    resetButton.addEventListener("click", resetForm);

    refreshButton.addEventListener("click", loadGalleries);


    galleryList.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const gallery = galleries.find(
            item => item.id === button.dataset.id
        );

        if (!gallery) return;

        const action = button.dataset.action;

        if (action === "edit") {
            editGallery(gallery);
        }

        if (action === "manage") {
            await selectGallery(gallery.id);
        }

        if (action === "copy") {
            await copyText(buildGalleryLink(gallery));
        }

        if (action === "delete") {
            await deleteGallery(gallery.id);
        }
    });


    copyLinkButton.addEventListener("click", () => {
        if (selectedGallery) {
            copyText(buildGalleryLink(selectedGallery));
        }
    });


    copyPasswordButton.addEventListener("click", () => {
        copyText(passwordInput.value);
    });


    filesInput.addEventListener("change", () => {
        uploadButton.disabled =
            !selectedGallery || filesInput.files.length === 0;
    });

    uploadButton.addEventListener("click", uploadPhotos);


    photoList.addEventListener("click", async event => {
        const button = event.target.closest(
            "button[data-action='delete-photo']"
        );

        if (!button) return;

        await deletePhoto(button.dataset.id);
    });


    logoutButton.addEventListener("click", async () => {
        await db.auth.signOut();
        window.location.href = "login.html";
    });


    // --------------------------------------
    // INITIALIZE
    // --------------------------------------

    async function initialize() {
        const authorized = await requireAdmin();

        if (!authorized) return;

        await loadGalleries();
    }

    initialize();

})();