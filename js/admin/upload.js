//const ADMIN_UID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";

const uploadForm = document.getElementById("mediaUploadForm");
const categorySelect = document.getElementById("mediaCategory");
const mediaTypeSelect = document.getElementById("mediaType");
console.log("mediaTypeSelect === ",mediaTypeSelect);
const fileInput = document.getElementById("mediaFile");
const uploadButton = document.getElementById("uploadBtn");
const uploadMessage = document.getElementById("uploadMessage");
const logoutButton = document.getElementById("logoutBtn");

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = {
    photo: ["image/jpeg", "image/png", "image/webp"],
    video: ["video/mp4"]
};


// Check whether the logged-in user is the admin
async function checkAdminAccess() {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error || !data.user || data.user.id !== ADMIN_UID) {
        await window.supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return false;
    }

    return true;
}


// Load categories from Supabase
async function loadCategories() {
    categorySelect.innerHTML =
        '<option value="">Select a category</option>';

    const { data, error } = await window.supabaseClient
        .from("categories")
        .select("id, name")
        .order("name");

    if (error) {
        console.error("Category loading error:", error);
        categorySelect.innerHTML =
            '<option value="">Unable to load categories</option>';
        return;
    }

    data.forEach(category => {
        const option = document.createElement("option");

        option.value = category.id;
        option.textContent = category.name;

        categorySelect.appendChild(option);
    });
}


// Change accepted file types based on selected media type
mediaTypeSelect.addEventListener("change", function () {

    if (this.value === "image") {
        fileInput.accept =
            "image/jpeg,image/png,image/webp";
        document.getElementById("fileHelp").textContent =
            "Accepted: JPG, PNG, WebP. Maximum size: 50 MB.";
    } else {
        fileInput.accept = "video/mp4";
        document.getElementById("fileHelp").textContent =
            "Accepted: MP4 videos. Maximum size: 50 MB.";
    }
    fileInput.value = "";
});


// Validate selected file
function validateFile(file, mediaType) {

    if (!file) {
        return "Please select a file.";
    }

    if (!ALLOWED_TYPES[mediaType]) {
        return "Invalid media type.";
    }

    if (!ALLOWED_TYPES[mediaType].includes(file.type)) {

        return mediaType === "image"
            ? "Please select JPG, PNG or WebP."
            : "Please select an MP4 video.";

    }

    if (file.size === 0) {
        return "The selected file is empty.";
    }

    if (file.size > MAX_FILE_SIZE) {
        return "Maximum file size is 50 MB.";
    }

    return null;
}


// Create a safe filename for Storage
function createStoragePath(file, mediaType) {

    const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

    const folder = mediaType === "image"
        ? "photos"
        : "videos";

    return `${folder}/${crypto.randomUUID()}.${extension}`;
}


// Display messages to the admin
function showMessage(message, isError = false) {
    uploadMessage.textContent = message;
    uploadMessage.style.color = isError ? "#b42318" : "#287a45";
}


// Upload form submission
uploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";
    showMessage("");

    let storagePath = null;
    let storageUploadCompleted = false;

    try {
        // Verify admin session
        const isAdmin = await checkAdminAccess();

        if (!isAdmin) {
            return;
        }

        // Read form values
        const title = document
            .getElementById("mediaTitle")
            .value.trim();

        const description = document
            .getElementById("mediaDescription")
            .value.trim();

        const categoryId = categorySelect.value;
        const mediaType = mediaTypeSelect.value;
        const file = fileInput.files[0];

        const isPublished = document
            .getElementById("isPublished")
            .checked;

        // Validate form
        if (!title) {
            throw new Error("Please enter a media title.");
        }

        if (!categoryId) {
            throw new Error("Please select a category.");
        }

        const validationError = validateFile(file, mediaType);

        if (validationError) {
            throw new Error(validationError);
        }

        // Generate unique Storage path
        storagePath = createStoragePath(file, mediaType);

        // Upload file to Supabase Storage
        const { error: storageError } = await window.supabaseClient
            .storage
            .from("portfolio")
            .upload(storagePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (storageError) {
            throw storageError;
        }

        storageUploadCompleted = true;

        // Get public URL of uploaded file
        const { data: publicUrlData } = window.supabaseClient
            .storage
            .from("portfolio")
            .getPublicUrl(storagePath);

        const fileUrl = publicUrlData.publicUrl;

console.log("Media Type:", mediaType);
console.log("Media Type JSON:", JSON.stringify(mediaType));
        // Insert media details into database
        // Convert frontend media type to database media type
        const dbMediaType = mediaType === "photo" ? "image" : "video";

        console.log("Frontend Media Type:", mediaType);
        console.log("Database Media Type:", dbMediaType);

        // Insert media details into database
        const { error: databaseError } = await window.supabaseClient
            .from("media")
            .insert({
                title: title,
                description: description || null,
                category_id: categoryId,
                media_type: dbMediaType,
                file_url: fileUrl,
                storage_path: storagePath,
                is_published: isPublished
            });

        if (databaseError) {
            throw databaseError;
        }

        if (databaseError) {
            throw databaseError;
        }

        showMessage("Media uploaded successfully!");

        uploadForm.reset();

        fileInput.accept = "image/jpeg,image/png,image/webp";
        document.getElementById("fileHelp").textContent =
            "Accepted: JPG, PNG, WebP. Maximum size: 50 MB.";

    } catch (error) {
        console.error("Media upload failed:", error);

        // Remove Storage file if database insertion failed
        if (storageUploadCompleted && storagePath) {
            const { error: cleanupError } = await window.supabaseClient
                .storage
                .from("portfolio")
                .remove([storagePath]);

            if (cleanupError) {
                console.error("Storage cleanup failed:", cleanupError);
            }
        }

        showMessage(
            error.message || "Something went wrong during upload.",
            true
        );

    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload Media";
    }
});


// Logout
logoutButton.addEventListener("click", async function () {
    await window.supabaseClient.auth.signOut();
    window.location.href = "login.html";
});


// Initialize page
async function initializeMediaUpload() {
    const isAdmin = await checkAdminAccess();

    if (!isAdmin) {
        return;
    }

    await loadCategories();
}

initializeMediaUpload();