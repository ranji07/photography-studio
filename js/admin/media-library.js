const mediaGrid = document.getElementById("mediaGrid");
const filterCategory = document.getElementById("filterCategory");
const filterMediaType = document.getElementById("filterMediaType");
const filterStatus = document.getElementById("filterStatus");
const refreshMediaBtn = document.getElementById("refreshMediaBtn");
const libraryMessage = document.getElementById("libraryMessage");
const ADMIN_UID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";
let mediaItems = [];
let categories = [];
const editMediaModal = document.getElementById("editMediaModal");
const editMediaForm = document.getElementById("editMediaForm");

const editMediaId = document.getElementById("editMediaId");
const editMediaTitle = document.getElementById("editMediaTitle");
const editMediaDescription =
    document.getElementById("editMediaDescription");

const editMediaCategory =
    document.getElementById("editMediaCategory");

const editMediaType = document.getElementById("editMediaType");
const editMediaStatus = document.getElementById("editMediaStatus");

const editMediaMessage =
    document.getElementById("editMediaMessage");

const saveEditBtn = document.getElementById("saveEditBtn");

const closeEditModal =
    document.getElementById("closeEditModal");

const cancelEditBtn =
    document.getElementById("cancelEditBtn");

const editModalOverlay =
    document.getElementById("editModalOverlay");
function showLibraryMessage(message, isError = false) {
    libraryMessage.textContent = message;
    libraryMessage.style.color = isError ? "#b42318" : "#287a45";
}


// Load category filters
async function loadLibraryCategories() {
    const { data, error } = await window.supabaseClient
        .from("categories")
        .select("id, name")
        .order("name");

    if (error) {
        throw error;
    }

    categories = data || [];

    filterCategory.innerHTML =
        '<option value="">All Categories</option>';

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        filterCategory.appendChild(option);
    });
}


// Load all media records
async function loadMediaLibrary() {
    mediaGrid.innerHTML = "<p>Loading media...</p>";
    showLibraryMessage("");

    const { data, error } = await window.supabaseClient
        .from("media")
        .select(`
            id,
            title,
            description,
            category_id,
            media_type,
            file_url,
            storage_path,
            is_published,
            is_home_hero,
            created_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Media loading error:", error);
        mediaGrid.innerHTML = "<p>Unable to load media.</p>";
        showLibraryMessage(error.message, true);
        return;
    }

    mediaItems = data || [];
    renderMediaLibrary();
}


// Render media cards
function renderMediaLibrary() {
    const selectedCategory = filterCategory.value;
    const selectedType = filterMediaType.value;
    const selectedStatus = filterStatus.value;

    const filteredItems = mediaItems.filter(item => {
        const categoryMatches =
            !selectedCategory ||
            item.category_id === selectedCategory;

        const typeMatches =
            !selectedType ||
            item.media_type === selectedType;

        const statusMatches =
            !selectedStatus ||
            (selectedStatus === "published" && item.is_published) ||
            (selectedStatus === "draft" && !item.is_published);

        return categoryMatches && typeMatches && statusMatches;
    });

    mediaGrid.innerHTML = "";

    if (filteredItems.length === 0) {
        mediaGrid.innerHTML =
            "<p>No media found for the selected filters.</p>";
        return;
    }

    const currentHomeHero = mediaItems.find(
        item => item.is_home_hero &&
            ["image", "photo"].includes(item.media_type)
    );

    filteredItems.forEach(item => {
        const category = categories.find(
            c => c.id === item.category_id
        );

        const categoryName = category
            ? category.name
            : "Uncategorized";

        const card = document.createElement("article");
        card.className = "media-card";

        const preview = document.createElement("div");
        preview.className = "media-preview";

       if (["image", "photo"].includes(item.media_type)) {

           const image = document.createElement("img");
           image.src = item.file_url;
           image.alt = item.title;
           image.loading = "lazy";

           preview.appendChild(image);

       } else if (item.media_type === "video") {

           const video = document.createElement("video");
           video.src = item.file_url;
           video.controls = true;
           video.preload = "metadata";

           preview.appendChild(video);

       } else {

           preview.textContent = "Unsupported media type";

       }

        const details = document.createElement("div");
        details.className = "media-details";

        const title = document.createElement("h3");
        title.textContent = item.title;

        const categoryText = document.createElement("p");
        categoryText.textContent = categoryName;

        const typeText = document.createElement("p");
        typeText.textContent =
            ["image", "photo"].includes(item.media_type)
                ? "Photography"
                : "Video";

        const status = document.createElement("span");
        status.className = item.is_published
            ? "media-status published"
            : "media-status draft";

        status.textContent = item.is_published
            ? "Published"
            : "Draft";

        details.append(title, categoryText, typeText, status);

        const actions = document.createElement("div");
        actions.className = "media-actions";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editMedia(item));

        const publishButton = document.createElement("button");
        publishButton.textContent = item.is_published
            ? "Unpublish"
            : "Publish";
        publishButton.addEventListener(
            "click",
            () => togglePublish(item)
        );

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-media-btn";
        deleteButton.addEventListener(
            "click",
            () => deleteMedia(item)
        );

        actions.append(editButton, publishButton);

        // Published and unpublished photographs can both be selected.
        // An unpublished selection appears on the homepage hero only; it
        // remains excluded from public portfolio/featured-media queries.
        if (["image", "photo"].includes(item.media_type)) {
            const heroButton = document.createElement("button");
            heroButton.type = "button";
            heroButton.className = "home-hero-btn";

            if (currentHomeHero && String(currentHomeHero.id) === String(item.id)) {
                heroButton.textContent = "Current Home Hero";
                heroButton.classList.add("is-current");
                heroButton.disabled = true;
                heroButton.title = item.is_published
                    ? "This is the current homepage hero."
                    : "This unpublished photograph is displayed only as the homepage hero.";
            } else {
                heroButton.textContent = "Set as Home Hero";
                heroButton.title = item.is_published
                    ? "Use this photograph as the homepage hero."
                    : "Use this draft as the homepage hero without publishing it to the portfolio.";
                heroButton.addEventListener("click", () => {
                    setHomeHero(item, heroButton);
                });
            }

            actions.appendChild(heroButton);
        }

        actions.appendChild(deleteButton);

        card.append(preview, details, actions);
        mediaGrid.appendChild(card);
    });
}


// Edit media details
// Populate and open the edit modal
function editMedia(item) {

    editMediaId.value = item.id;

    editMediaTitle.value = item.title || "";

    editMediaDescription.value =
        item.description || "";

    editMediaType.value =
        item.media_type === "image"
            ? "Photography"
            : "Video / Film";

    // Populate category options
    editMediaCategory.innerHTML =
        '<option value="">Select category</option>';

    categories.forEach(category => {

        const option = document.createElement("option");

        option.value = category.id;

        option.textContent = category.name;

        editMediaCategory.appendChild(option);

    });

    editMediaCategory.value = item.category_id || "";

    editMediaStatus.value =
        String(item.is_published);

    editMediaMessage.textContent = "";

    saveEditBtn.disabled = false;

    saveEditBtn.textContent = "Save Changes";

    editMediaModal.hidden = false;

    document.body.classList.add("modal-open");

    editMediaTitle.focus();

}

// Save edited media details
async function saveMediaChanges(event) {

    event.preventDefault();

    saveEditBtn.disabled = true;

    saveEditBtn.textContent = "Saving...";

    editMediaMessage.textContent = "";

    try {

        const id = editMediaId.value;

        const title = editMediaTitle.value.trim();

        const description =
            editMediaDescription.value.trim();

        const categoryId = editMediaCategory.value;

        const isPublished =
            editMediaStatus.value === "true";

        // Validate title
        if (!title) {
            throw new Error("Media title is required.");
        }

        if (title.length > 150) {
            throw new Error("Title cannot exceed 150 characters.");
        }

        // Validate description
        if (description.length > 2000) {
            throw new Error(
                "Description cannot exceed 2000 characters."
            );
        }

        // Validate category
        if (!categories.some(category =>
            category.id === categoryId
        )) {
            throw new Error("Please select a valid category.");
        }

        // Update database
        const { data, error } = await supabaseClient
            .from("media")
            .update({
                title: title,
                description: description || null,
                category_id: categoryId,
                is_published: isPublished
            })
            .eq("id", id)
            .select("id");

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error(
                "No media record was updated. Please check your admin permissions."
            );
        }

        editMediaMessage.textContent =
            "Changes saved successfully.";

        editMediaMessage.style.color = "#287a45";

        await loadMediaLibrary();

        setTimeout(() => {
            closeMediaEditModal();
            showLibraryMessage("Media updated successfully.");
        }, 600);

    } catch (error) {

        console.error("Media edit error:", error);

        editMediaMessage.textContent =
            error.message || "Unable to save changes.";

        editMediaMessage.style.color = "#b42318";

    } finally {

        saveEditBtn.disabled = false;

        saveEditBtn.textContent = "Save Changes";

    }

}
// Close edit modal
function closeMediaEditModal() {

    editMediaModal.hidden = true;

    editMediaForm.reset();

    editMediaMessage.textContent = "";

    document.body.classList.remove("modal-open");

}


// Close button
closeEditModal.addEventListener(
    "click",
    closeMediaEditModal
);


// Cancel button
cancelEditBtn.addEventListener(
    "click",
    closeMediaEditModal
);


// Click outside the modal
editModalOverlay.addEventListener(
    "click",
    closeMediaEditModal
);


// Close using Escape key
document.addEventListener("keydown", function(event) {

    if (
        event.key === "Escape" &&
        !editMediaModal.hidden
    ) {
        closeMediaEditModal();
    }

});


// Submit edited form
editMediaForm.addEventListener(
    "submit",
    saveMediaChanges
);
// ==========================================
// SET HOMEPAGE HERO IMAGE
// ==========================================
async function setHomeHero(item, button) {
    if (!item || !["image", "photo"].includes(item.media_type)) {
        showLibraryMessage(
            "Only photographs can be used as the homepage hero.",
            true
        );
        return;
    }

    const draftNotice = item.is_published
        ? ""
        : "\n\nThis photograph is unpublished. It will appear on the homepage hero only and will remain unpublished in the public portfolio.";

    const confirmed = confirm(
        `Set "${item.title || "this photograph"}" as the homepage hero image?${draftNotice}`
    );
    if (!confirmed) return;

    const originalText = button ? button.textContent : "Set as Home Hero";
    if (button) {
        button.disabled = true;
        button.textContent = "Updating...";
    }

    showLibraryMessage("Updating homepage hero...");

    try {
        const client = window.supabaseClient;
        if (!client) throw new Error("Supabase client is not initialized.");

        const { error } = await client.rpc("set_home_hero", {
            p_media_id: String(item.id)
        });

        if (error) throw error;

        await loadMediaLibrary();
        showLibraryMessage(
            item.is_published
                ? `"${item.title || "Photograph"}" is now the homepage hero. Refresh the homepage to see it.`
                : `"${item.title || "Photograph"}" is now the homepage hero. It remains unpublished in the portfolio.`
        );
    } catch (error) {
        console.error("Set home hero failed:", error);
        showLibraryMessage(
            error.message || "Unable to update the homepage hero.",
            true
        );
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}


// Publish or unpublish media
async function togglePublish(item) {
    const newStatus = !item.is_published;

    const action = newStatus ? "publish" : "unpublish";

    if (!confirm(`Are you sure you want to ${action} this media?`)) {
        return;
    }

    const { error } = await window.supabaseClient
        .from("media")
        .update({ is_published: newStatus })
        .eq("id", item.id);

    if (error) {
        console.error("Publish update error:", error);
        showLibraryMessage(error.message, true);
        return;
    }

    showLibraryMessage(
        newStatus ? "Media published." : "Media unpublished."
    );

    await loadMediaLibrary();
}


// Delete media from database and Storage
async function deleteMedia(item) {
    const confirmed = confirm(
        `Delete "${item.title}" permanently? This cannot be undone.`
    );

    if (!confirmed) return;

    // Delete the database record first
    const { error: databaseError } = await window.supabaseClient
        .from("media")
        .delete()
        .eq("id", item.id);

    if (databaseError) {
        console.error("Database delete error:", databaseError);
        showLibraryMessage(databaseError.message, true);
        return;
    }

    // Then delete the Storage object
    if (item.storage_path) {
        const { error: storageError } = await window.supabaseClient
            .storage
            .from("portfolio")
            .remove([item.storage_path]);

        if (storageError) {
            console.error("Storage deletion error:", storageError);

            showLibraryMessage(
                "Database record deleted, but the Storage file could not be deleted: " +
                storageError.message,
                true
            );

            await loadMediaLibrary();
            return;
        }
    }

    showLibraryMessage("Media deleted successfully.");
    await loadMediaLibrary();
}


// Filter event listeners
if (filterCategory) {
    filterCategory.addEventListener("change", renderMediaLibrary);
}

if (filterMediaType) {
    filterMediaType.addEventListener("change", renderMediaLibrary);
}

if (filterStatus) {
    filterStatus.addEventListener("change", renderMediaLibrary);
}

if (refreshMediaBtn) {
    refreshMediaBtn.addEventListener("click", loadMediaLibrary);
} else {
    console.warn("Refresh button not found.");
}


// Initialize library
async function initializeMediaLibrary() {
    const isAdmin = await checkAdminAccess();

    if (!isAdmin) return;

    try {
        await loadLibraryCategories();
        await loadMediaLibrary();
    } catch (error) {
        console.error("Media library initialization error:", error);
        showLibraryMessage(error.message, true);
    }
}

initializeMediaLibrary();
// Admin authentication
//const ADMIN_UID = "YOUR_ADMIN_USER_ID";

async function checkAdminAccess() {

    const client = window.supabaseClient;

    if (!client) {
       // console.error("Supabase client is not initialized.");
        return false;
    }

    const { data, error } = await client.auth.getUser();

    if (error || !data.user || data.user.id !== ADMIN_UID) {

        await client.auth.signOut();

        window.location.href = "login.html";

        return false;
    }

    return true;
}