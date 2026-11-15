
/* =====================================================
   STUDIO ADMIN - CATEGORY MANAGEMENT
=====================================================

   Features:
   1. Load categories
   2. Add categories
   3. Edit categories
   4. Delete unused categories
   5. Generate category slugs
   6. Prevent duplicate names and slugs
   7. Handle Supabase errors

   Database table: public.categories

   Columns:
   id
   name
   slug
   media_type

   Default category media_type: image

===================================================== */

(function () {

    "use strict";


    // =================================================
    // CONFIGURATION
    // =================================================

    const ADMIN_USER_ID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";
    const ADMIN_UID =
    "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";
    // Adjust if your login page is located elsewhere.
    const LOGIN_PAGE = "../login.html";

    const CATEGORY_COLUMNS = "id, name, slug, media_type";


    // =================================================
    // DOM ELEMENTS
    // =================================================

    function getElement(selectors) {

        for (const selector of selectors) {

            const element = document.querySelector(selector);

            if (element) {
                return element;
            }

        }

        return null;
    }


    const categoryForm = getElement([
        "#categoryForm",
        "#addCategoryForm",
        "#categoryFormElement"
    ]);

    const categoryIdInput = getElement([
        "#categoryId",
        "#editCategoryId"
    ]);

    const categoryNameInput = getElement([
        "#categoryName",
        "#categoryNameInput"
    ]);

    const categorySlugInput = getElement([
        "#categorySlug",
        "#categorySlugInput"
    ]);

    const categoryMediaTypeInput = getElement([
        "#categoryMediaType"
    ]);

    const categoryTable = getElement([
        "#categoryTable",
        ".category-table"
    ]);

    let categoryTableBody = getElement([
        "#categoryTableBody",
        "#categoriesTableBody",
        "#categoryListBody",
        ".category-table tbody"
    ]);

    const categoryMessage = getElement([
        "#categoryMessage",
        "#categoryStatus",
        "#categoryFormMessage",
        ".category-status"
    ]);

    const cancelButton = getElement([
        "#cancelCategoryEdit",
        "#cancelCategoryEditBtn",
        "#categoryCancelBtn"
    ]);

    const refreshButton = getElement([
        "#refreshCategoriesBtn",
        "#refreshCategoryBtn"
    ]);


    // =================================================
    // APPLICATION STATE
    // =================================================

    let categories = [];

    let editingCategoryId = null;

    let isSaving = false;


    // =================================================
    // SUPABASE CLIENT
    // =================================================

    function getSupabaseClient() {

        const client = window.supabaseClient;

        if (!client) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }

        if (typeof client.from !== "function") {

            throw new Error(
                "Invalid Supabase client."
            );

        }

        return client;
    }


    // =================================================
    // ADMIN AUTHENTICATION
    // =================================================

    async function checkCategoryAdminAccess() {

        const {
                data,
                error
            } = await supabaseClient.auth.getUser();

            if (
                error ||
                !data.user ||
                data.user.id !== ADMIN_UID
            ) {

                await supabaseClient.auth.signOut();

                window.location.replace("login.html");

                return false;

            }

            return true;
    }


    // =================================================
    // MESSAGE HANDLING
    // =================================================

    function showCategoryMessage(
        message,
        type = "success"
    ) {

        if (!categoryMessage) {

            console.log(message);

            return;
        }

        categoryMessage.textContent = message;

        categoryMessage.className =
            "category-status " + type;

        if (type === "success") {
            categoryMessage.style.color = "#8dc69a";
        } else if (type === "error") {
            categoryMessage.style.color = "#e58b82";
        } else {
            categoryMessage.style.color = "#c0a783";
        }

    }


    function clearCategoryMessage() {

        if (!categoryMessage) {
            return;
        }

        categoryMessage.textContent = "";

        categoryMessage.className = "category-status";

    }


    // =================================================
    // SLUG GENERATION
    // =================================================

    function generateSlug(value) {

        return String(value || "")

            .normalize("NFD")

            .replace(/[\u0300-\u036f]/g, "")

            .toLowerCase()

            .trim()

            .replace(/[^a-z0-9]+/g, "-")

            .replace(/^-+|-+$/g, "")

            .replace(/-{2,}/g, "-");

    }


    // =================================================
    // ERROR HANDLING
    // =================================================

    function getFriendlyError(error) {

        console.error("Category operation error:", error);

        if (!error) {
            return "An unexpected error occurred.";
        }

        if (error.code === "23505") {

            return (
                "A category with this name or slug already exists."
            );

        }

        if (error.code === "23503") {

            return (
                "This category is being used by media and cannot be deleted."
            );

        }

        if (error.code === "23502") {

            return (
                "A required category field is missing. Check the database columns."
            );

        }

        if (error.code === "42501") {

            return (
                "Permission denied. Check your Supabase RLS policies."
            );

        }

        if (
            error.message &&
            error.message.toLowerCase().includes("duplicate")
        ) {

            return (
                "This category already exists. Try another name."
            );

        }

        return error.message ||
            "Something went wrong. Please try again.";

    }


    // =================================================
    // CATEGORY TABLE INITIALIZATION
    // =================================================

    function initializeCategoryTable() {

        if (categoryTableBody) {
            return;
        }

        if (categoryTable) {

            categoryTableBody =
                categoryTable.querySelector("tbody");

            if (!categoryTableBody) {
                categoryTableBody =
                    categoryTable.createTBody();
            }

        }

    }


    // =================================================
    // LOAD CATEGORIES
    // =================================================

    async function loadCategories() {

        try {

            const client = getSupabaseClient();

            showCategoryMessage(
                "Loading categories...",
                "info"
            );


            const { data, error } = await client

                .from("categories")

                .select(CATEGORY_COLUMNS)

                .order("name", {
                    ascending: true
                });


            if (error) {

                console.error(
                    "Load categories error:",
                    {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint
                    }
                );

                throw error;
            }


            categories = data || [];


            // Render category list
            renderCategories();


            // Optional category count
            const countElement = getElement([
                "#categoryCount",
                "#totalCategories"
            ]);

            if (countElement) {

                countElement.textContent =
                    categories.length;

            }


            clearCategoryMessage();

            console.log(
                "Categories loaded successfully:",
                categories.length
            );


        } catch (error) {

            showCategoryMessage(
                getFriendlyError(error),
                "error"
            );

            renderCategoryLoadError();

        }

    }


    // =================================================
    // RENDER CATEGORY LOAD ERROR
    // =================================================

    function renderCategoryLoadError() {

        initializeCategoryTable();

        if (!categoryTableBody) {
            return;
        }

        categoryTableBody.innerHTML = "";

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 5;

        cell.textContent =
            "Unable to load categories. Check the error message above.";

        row.appendChild(cell);

        categoryTableBody.appendChild(row);

    }


    // =================================================
    // RENDER CATEGORIES
    // =================================================

    function renderCategories() {

        initializeCategoryTable();

        if (!categoryTableBody) {

            console.warn(
                "Category table body not found. " +
                "Expected #categoryTableBody or .category-table tbody."
            );

            return;
        }


        categoryTableBody.innerHTML = "";


        if (categories.length === 0) {

            const row = document.createElement("tr");

            const cell = document.createElement("td");

            cell.colSpan = 5;

            cell.textContent =
                "No categories available. Add your first category.";

            row.appendChild(cell);

            categoryTableBody.appendChild(row);

            return;

        }


        categories.forEach((category, index) => {

            const row = document.createElement("tr");


            // Serial Number
            const serialCell =
                document.createElement("td");

            serialCell.textContent = index + 1;


            // Category Name
            const nameCell =
                document.createElement("td");

            nameCell.textContent = category.name;


            // Slug
            const slugCell =
                document.createElement("td");

            slugCell.textContent = category.slug || "-";


            // Media Type
            const mediaTypeCell =
                document.createElement("td");

            mediaTypeCell.textContent =
                category.media_type || "image";


            // Actions
            const actionCell =
                document.createElement("td");


            // Edit Button
            const editButton =
                document.createElement("button");

            editButton.type = "button";

            editButton.className = "category-edit-btn";

            editButton.textContent = "Edit";

            editButton.dataset.action = "edit";

            editButton.dataset.id = category.id;


            // Delete Button
            const deleteButton =
                document.createElement("button");

            deleteButton.type = "button";

            deleteButton.className = "category-delete-btn";

            deleteButton.textContent = "Delete";

            deleteButton.dataset.action = "delete";

            deleteButton.dataset.id = category.id;


            actionCell.append(
                editButton,
                deleteButton
            );


            row.append(
                serialCell,
                nameCell,
                slugCell,
                mediaTypeCell,
                actionCell
            );


            categoryTableBody.appendChild(row);

        });

    }


    // =================================================
    // VALIDATE CATEGORY
    // =================================================

    function validateCategory(name, slug) {

        if (!name) {

            return "Please enter a category name.";

        }

        if (name.length > 100) {

            return "Category name cannot exceed 100 characters.";

        }

        if (!slug) {

            return "Unable to generate a valid category slug.";

        }

        if (slug.length > 120) {

            return "Category slug cannot exceed 120 characters.";

        }


        // Check duplicate category name
        const duplicateName = categories.find(category =>

            category.name.toLowerCase() === name.toLowerCase() &&

            category.id !== editingCategoryId

        );

        if (duplicateName) {

            return "A category with this name already exists.";

        }


        // Check duplicate slug
        const duplicateSlug = categories.find(category =>

            category.slug.toLowerCase() === slug.toLowerCase() &&

            category.id !== editingCategoryId

        );

        if (duplicateSlug) {

            return "This category slug is already in use.";

        }


        return null;

    }


    // =================================================
    // RESET FORM
    // =================================================

    function resetCategoryForm() {

        if (categoryForm) {
            categoryForm.reset();
        }

        editingCategoryId = null;


        if (categoryIdInput) {
            categoryIdInput.value = "";
        }


        if (categoryMediaTypeInput) {
            categoryMediaTypeInput.value = "image";
        }


        const submitButton = categoryForm
            ? categoryForm.querySelector(
                'button[type="submit"], input[type="submit"]'
            )
            : null;

        if (submitButton) {

            submitButton.textContent = "Add Category";

        }


        clearCategoryMessage();

    }


    // =================================================
    // EDIT CATEGORY
    // =================================================

    function editCategory(categoryId) {

        const category = categories.find(
            item => item.id === categoryId
        );


        if (!category) {

            showCategoryMessage(
                "Category not found.",
                "error"
            );

            return;

        }


        if (!categoryForm || !categoryNameInput) {

            showCategoryMessage(
                "Category form elements are missing.",
                "error"
            );

            return;

        }


        editingCategoryId = category.id;


        if (categoryIdInput) {

            categoryIdInput.value = category.id;

        }


        categoryNameInput.value = category.name;


        if (categorySlugInput) {

            categorySlugInput.value = category.slug || "";

        }


        if (categoryMediaTypeInput) {

            categoryMediaTypeInput.value =
                category.media_type || "image";

        }


        const submitButton = categoryForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );


        if (submitButton) {

            submitButton.textContent = "Update Category";

        }


        showCategoryMessage(
            "Editing category: " + category.name,
            "info"
        );


        categoryForm.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });


        categoryNameInput.focus();

    }


    // =================================================
    // SAVE CATEGORY - ADD / UPDATE
    // =================================================

    async function handleCategorySave(event) {

        event.preventDefault();

        if (isSaving) {
            return;
        }


        try {

            if (!categoryNameInput) {

                throw new Error(
                    "Category name input was not found."
                );

            }


            const client = getSupabaseClient();


            const categoryName =
                categoryNameInput.value.trim();


            // Generate or read slug
            let categorySlug = categorySlugInput
                ? categorySlugInput.value.trim()
                : generateSlug(categoryName);


            if (!categorySlug) {

                categorySlug = generateSlug(categoryName);

            }


            const validationError = validateCategory(
                categoryName,
                categorySlug
            );


            if (validationError) {

                throw new Error(validationError);

            }


            // Categories are image-based by default.
            const mediaType = "image";


            const categoryData = {

                name: categoryName,

                slug: categorySlug,

                media_type: mediaType

            };


            isSaving = true;


            const submitButton = categoryForm.querySelector(
                'button[type="submit"], input[type="submit"]'
            );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.textContent =
                    editingCategoryId
                        ? "Updating..."
                        : "Saving...";

            }


            clearCategoryMessage();


            let result;


            // =========================================
            // UPDATE EXISTING CATEGORY
            // =========================================

            if (editingCategoryId) {

                result = await client

                    .from("categories")

                    .update(categoryData)

                    .eq("id", editingCategoryId)

                    .select(CATEGORY_COLUMNS)

                    .single();

            }


            // =========================================
            // INSERT NEW CATEGORY
            // =========================================

            else {

                result = await client

                    .from("categories")

                    .insert(categoryData)

                    .select(CATEGORY_COLUMNS)

                    .single();

            }


            // =========================================
            // CHECK SUPABASE RESPONSE
            // =========================================

            if (!result) {

                throw new Error(
                    "Supabase returned an empty response."
                );

            }


            const { data, error } = result;


            if (error) {

                console.error(
                    "Save category error:",
                    {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint
                    }
                );

                throw error;

            }


            if (!data) {

                throw new Error(
                    "Category was not returned after saving."
                );

            }


            const wasEditing = Boolean(editingCategoryId);


            console.log(
                "Category saved successfully:",
                data
            );


            showCategoryMessage(
                wasEditing
                    ? "Category updated successfully."
                    : "Category added successfully.",
                "success"
            );


            resetCategoryForm();


            // Reload categories from database
            await loadCategories();


        } catch (error) {

            console.error(
                "Category save failed:",
                error
            );


            showCategoryMessage(
                getFriendlyError(error),
                "error"
            );


        } finally {

            isSaving = false;


            if (categoryForm) {

                const submitButton = categoryForm.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );


                if (submitButton) {

                    submitButton.disabled = false;


                    submitButton.textContent =
                        editingCategoryId
                            ? "Update Category"
                            : "Add Category";

                }

            }

        }

    }


    // =================================================
    // DELETE CATEGORY
    // =================================================

    async function deleteCategory(categoryId) {

        const category = categories.find(
            item => item.id === categoryId
        );


        if (!category) {

            showCategoryMessage(
                "Category not found.",
                "error"
            );

            return;

        }


        const confirmed = window.confirm(

            `Are you sure you want to delete "${category.name}"?\n\n` +

            "This action cannot be undone."

        );


        if (!confirmed) {
            return;
        }


        try {

            const client = getSupabaseClient();


            showCategoryMessage(
                "Checking category usage...",
                "info"
            );


            // Check whether any media uses this category.
            const { count, error: usageError } = await client

                .from("media")

                .select("id", {
                    count: "exact",
                    head: true
                })

                .eq("category_id", categoryId);


            if (usageError) {

                throw usageError;

            }


            if (count > 0) {

                showCategoryMessage(

                    `Cannot delete "${category.name}". ` +
                    `${count} media record(s) are using this category. ` +
                    "Reassign or remove those media records first.",

                    "error"

                );

                return;

            }


            // Delete category
            const { error } = await client

                .from("categories")

                .delete()

                .eq("id", categoryId);


            if (error) {

                console.error(
                    "Delete category error:",
                    error
                );

                throw error;

            }


            showCategoryMessage(
                "Category deleted successfully.",
                "success"
            );


            if (editingCategoryId === categoryId) {

                resetCategoryForm();

            }


            await loadCategories();


        } catch (error) {

            console.error(
                "Category deletion failed:",
                error
            );


            showCategoryMessage(
                getFriendlyError(error),
                "error"
            );

        }

    }


    // =================================================
    // TABLE ACTION HANDLING
    // =================================================

    function handleCategoryTableClick(event) {

        const button = event.target.closest(
            "button[data-action][data-id]"
        );


        if (!button) {
            return;
        }


        const categoryId = button.dataset.id;

        const action = button.dataset.action;


        if (action === "edit") {

            editCategory(categoryId);

        } else if (action === "delete") {

            deleteCategory(categoryId);

        }

    }


    // =================================================
    // AUTO GENERATE SLUG
    // =================================================

    function initializeSlugGeneration() {

        if (!categoryNameInput || !categorySlugInput) {
            return;
        }


        let slugWasManuallyEdited = false;


        categorySlugInput.addEventListener(
            "input",
            function () {

                slugWasManuallyEdited = true;

            }
        );


        categoryNameInput.addEventListener(
            "input",
            function () {

                if (!slugWasManuallyEdited || !categorySlugInput.value.trim()) {

                    categorySlugInput.value =
                        generateSlug(categoryNameInput.value);

                    slugWasManuallyEdited = false;

                }

            }
        );


        if (categoryForm) {

            categoryForm.addEventListener(
                "reset",
                function () {

                    slugWasManuallyEdited = false;

                }
            );

        }

    }


    // =================================================
    // EVENT LISTENERS
    // =================================================

    function initializeCategoryEvents() {


        // Form submission
        if (categoryForm) {

            categoryForm.addEventListener(
                "submit",
                handleCategorySave
            );

        } else {

            console.warn(
                "Category form #categoryForm was not found."
            );

        }


        // Table edit / delete actions
        if (categoryTableBody) {

            categoryTableBody.addEventListener(
                "click",
                handleCategoryTableClick
            );

        }


        // Cancel editing
        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                resetCategoryForm
            );

        }


        // Refresh category list
        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                loadCategories
            );

        }


        // Auto-generate slug
        initializeSlugGeneration();

    }


    // =================================================
    // PAGE INITIALIZATION
    // =================================================

    async function initializeCategoriesPage() {

        console.log(
            "Initializing Category Management..."
        );


        try {

            // Check Supabase first
            getSupabaseClient();


            // Check admin access
            const isAdmin =
                await checkCategoryAdminAccess();


            if (!isAdmin) {
                return;
            }


            // Verify important HTML elements
            if (!categoryForm) {

                console.warn(
                    "Category form not found. " +
                    "Check the ID of your category form."
                );

            }


            if (!categoryNameInput) {

                console.warn(
                    "Category name field not found."
                );

            }


            // Initialize table
            initializeCategoryTable();


            // Attach events
            initializeCategoryEvents();


            // Load categories
            await loadCategories();


            console.log(
                "Category Management initialized successfully."
            );


        } catch (error) {

            console.error(
                "Category initialization failed:",
                error
            );


            showCategoryMessage(
                getFriendlyError(error),
                "error"
            );

        }

    }


    // =================================================
    // START APPLICATION
    // =================================================

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initializeCategoriesPage,
            { once: true }
        );

    } else {

        initializeCategoriesPage();

    }


})();
