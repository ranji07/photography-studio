"use strict";

(function () {

    // ==========================================
    // CONFIGURATION
    // ==========================================

    const ADMIN_UID =
        "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";


    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const tableBody =
        document.getElementById("bulkMediaTableBody");

    const searchInput =
        document.getElementById("bulkMediaSearch");

    const typeFilter =
        document.getElementById("bulkMediaTypeFilter");

    const statusFilter =
        document.getElementById("bulkMediaStatusFilter");

    const selectAll =
        document.getElementById("selectAllBulkMedia");

    const selectedCount =
        document.getElementById("bulkSelectedCount");

    const publishButton =
        document.getElementById("bulkPublishBtn");

    const unpublishButton =
        document.getElementById("bulkUnpublishBtn");

    const deleteButton =
        document.getElementById("bulkDeleteBtn");

    const refreshButton =
        document.getElementById("refreshBulkMedia");

    const message =
        document.getElementById("bulkMediaMessage");


    // ==========================================
    // STATE
    // ==========================================

    let mediaRecords = [];

    let categories = new Map();

    const selectedMediaIds = new Set();

    let isProcessing = false;


    // ==========================================
    // INITIALIZATION
    // ==========================================

    document.addEventListener(
        "DOMContentLoaded",
        initializeBulkMedia
    );


    async function initializeBulkMedia() {

        try {

            if (typeof supabaseClient === "undefined") {
                throw new Error(
                    "Supabase client is not initialized."
                );
            }

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

                return;

            }


            registerEvents();

            await loadBulkMedia();

        } catch (error) {

            console.error(
                "Bulk media initialization error:",
                error
            );

            showMessage(
                error.message,
                true
            );

        }

    }


    // ==========================================
    // REGISTER EVENTS
    // ==========================================

    function registerEvents() {

        searchInput.addEventListener(
            "input",
            handleBulkFilterChange
        );

        typeFilter.addEventListener(
            "change",
            handleBulkFilterChange
        );

        statusFilter.addEventListener(
            "change",
            handleBulkFilterChange
        );

        selectAll.addEventListener(
            "change",
            handleSelectAll
        );

        publishButton.addEventListener(
            "click",
            () => bulkUpdateStatus(true)
        );

        unpublishButton.addEventListener(
            "click",
            () => bulkUpdateStatus(false)
        );

        deleteButton.addEventListener(
            "click",
            bulkDeleteMedia
        );

        refreshButton.addEventListener(
            "click",
            loadBulkMedia
        );

    }
function handleBulkFilterChange() {

    selectedMediaIds.clear();

    selectAll.checked = false;

    selectAll.indeterminate = false;

    renderBulkMedia();

}

    // ==========================================
    // LOAD CATEGORIES
    // ==========================================

    async function loadBulkCategories() {

        const { data, error } = await supabaseClient
            .from("categories")
            .select("id, name");

        if (error) {
            throw error;
        }

        categories.clear();

        (data || []).forEach(category => {

            categories.set(
                category.id,
                category.name
            );

        });

    }


    // ==========================================
    // LOAD MEDIA
    // ==========================================

    async function loadBulkMedia() {

        refreshButton.disabled = true;

        refreshButton.textContent = "Loading...";

        showMessage("");

        try {

            await loadBulkCategories();


            const { data, error } = await supabaseClient

                .from("media")

                .select(`
                    id,
                    title,
                    category_id,
                    media_type,
                    is_published,
                    storage_path,
                    created_at
                `)

                .order("created_at", {
                    ascending: false
                })

                .limit(1000);


            if (error) {
                throw error;
            }


            mediaRecords = data || [];

            // Reset selection after refresh to avoid
            // retaining selections of deleted records.

            selectedMediaIds.clear();

            renderBulkMedia();


        } catch (error) {

            console.error(
                "Bulk media loading error:",
                error
            );

            showMessage(
                error.message || "Unable to load media.",
                true
            );

        } finally {

            refreshButton.disabled = false;

            refreshButton.textContent = "Refresh";

        }

    }


    // ==========================================
    // FILTER MEDIA
    // ==========================================

    function getFilteredMedia() {

        const keyword =
            searchInput.value.trim().toLowerCase();

        const selectedType = typeFilter.value;

        const selectedStatus = statusFilter.value;


        return mediaRecords.filter(item => {

            const titleMatches =
                !keyword ||
                (item.title || "")
                    .toLowerCase()
                    .includes(keyword);


            const typeMatches =
                !selectedType ||
                item.media_type === selectedType;


            const statusMatches =
                !selectedStatus ||
                (
                    selectedStatus === "published" &&
                    item.is_published
                ) ||
                (
                    selectedStatus === "draft" &&
                    !item.is_published
                );


            return (
                titleMatches &&
                typeMatches &&
                statusMatches
            );

        });

    }


    // ==========================================
    // RENDER TABLE
    // ==========================================

    function renderBulkMedia() {

        const filteredRecords = getFilteredMedia();

        tableBody.replaceChildren();


        if (filteredRecords.length === 0) {

            const row = document.createElement("tr");

            const cell = document.createElement("td");

            cell.colSpan = 6;

            cell.textContent = "No media records found.";

            row.appendChild(cell);

            tableBody.appendChild(row);

            updateSelectionUI(filteredRecords);

            return;

        }


        filteredRecords.forEach(item => {

            const row = document.createElement("tr");


            // Selection checkbox

            const selectCell = document.createElement("td");

            const checkbox = document.createElement("input");

            checkbox.type = "checkbox";

            checkbox.className = "bulk-row-checkbox";

            checkbox.checked =
                selectedMediaIds.has(item.id);

            checkbox.setAttribute(
                "aria-label",
                "Select " + item.title
            );


            checkbox.addEventListener("change", function () {

                if (checkbox.checked) {

                    selectedMediaIds.add(item.id);

                } else {

                    selectedMediaIds.delete(item.id);

                }

                updateSelectionUI(getFilteredMedia());

            });


            selectCell.appendChild(checkbox);


            // Title

            const titleCell = document.createElement("td");

            titleCell.textContent =
                item.title || "Untitled";


            // Media type

            const typeCell = document.createElement("td");

            typeCell.textContent =
                item.media_type === "image"
                    ? "Photography"
                    : "Video";


            // Category

            const categoryCell = document.createElement("td");

            categoryCell.textContent =
                categories.get(item.category_id)
                || "Uncategorized";


            // Publication status

            const statusCell = document.createElement("td");

            statusCell.textContent =
                item.is_published ? "Published" : "Draft";

            statusCell.className =
                item.is_published
                    ? "bulk-status-published"
                    : "bulk-status-draft";


            // Created date

            const dateCell = document.createElement("td");

            dateCell.textContent = item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "-";


            row.append(
                selectCell,
                titleCell,
                typeCell,
                categoryCell,
                statusCell,
                dateCell
            );


            tableBody.appendChild(row);

        });


        updateSelectionUI(filteredRecords);

    }


    // ==========================================
    // SELECT ALL VISIBLE RECORDS
    // ==========================================

    function handleSelectAll() {

        const filteredRecords = getFilteredMedia();

        if (selectAll.checked) {

            filteredRecords.forEach(item => {

                selectedMediaIds.add(item.id);

            });

        } else {

            filteredRecords.forEach(item => {

                selectedMediaIds.delete(item.id);

            });

        }

        renderBulkMedia();

    }


    // ==========================================
    // UPDATE SELECTION DISPLAY
    // ==========================================

    function updateSelectionUI(filteredRecords) {

        const count = selectedMediaIds.size;


        selectedCount.textContent =
            `${count} selected`;


        const visibleIds = filteredRecords.map(
            item => item.id
        );


        const selectedVisible = visibleIds.filter(
            id => selectedMediaIds.has(id)
        ).length;


        selectAll.checked =
            visibleIds.length > 0 &&
            selectedVisible === visibleIds.length;


        selectAll.indeterminate =
            selectedVisible > 0 &&
            selectedVisible < visibleIds.length;


        publishButton.disabled =
            count === 0 || isProcessing;

        unpublishButton.disabled =
            count === 0 || isProcessing;

        deleteButton.disabled =
            count === 0 || isProcessing;

    }


    // ==========================================
    // GET SELECTED RECORDS
    // ==========================================

    function getSelectedRecords() {

        return mediaRecords.filter(item =>
            selectedMediaIds.has(item.id)
        );

    }


    // ==========================================
    // BULK PUBLISH / UNPUBLISH
    // ==========================================

    async function bulkUpdateStatus(isPublished) {

        const selectedItems = getSelectedRecords();

        const ids = selectedItems.map(
            item => item.id
        );


        if (ids.length === 0) {

            showMessage(
                "Please select at least one media item.",
                true
            );

            return;

        }


        const action = isPublished
            ? "publish"
            : "unpublish";


        const confirmed = window.confirm(
            `Are you sure you want to ${action} ${ids.length} selected item(s)?`
        );


        if (!confirmed) {
            return;
        }


        setProcessing(true);

        showMessage(
            `Updating ${ids.length} selected item(s)...`
        );


        try {

            const { data, error } = await supabaseClient

                .from("media")

                .update({
                    is_published: isPublished
                })

                .in("id", ids)

                .select("id");


            if (error) {
                throw error;
            }


            if (!data || data.length !== ids.length) {

                throw new Error(
                    "Not all selected records were updated. Check administrator permissions and refresh the library."
                );

            }


            selectedMediaIds.clear();

            await loadBulkMedia();


            showMessage(
                `${data.length} media item(s) ${isPublished ? "published" : "unpublished"} successfully.`
            );

        } catch (error) {

            console.error(
                "Bulk status update error:",
                error
            );

            showMessage(
                error.message,
                true
            );

        } finally {

            setProcessing(false);

        }

    }


    // ==========================================
    // BULK DELETE
    // ==========================================

    async function bulkDeleteMedia() {

        const selectedItems = getSelectedRecords();


        if (selectedItems.length === 0) {

            showMessage(
                "Please select media items to delete.",
                true
            );

            return;

        }


        const itemNames = selectedItems
            .slice(0, 5)
            .map(item => item.title || "Untitled")
            .join("\n");


        const extraCount = selectedItems.length > 5
            ? `\n...and ${selectedItems.length - 5} more`
            : "";


        const confirmed = window.confirm(
            `Permanently delete ${selectedItems.length} selected item(s)?\n\n${itemNames}${extraCount}\n\nThis cannot be undone.`
        );


        if (!confirmed) {
            return;
        }


        setProcessing(true);

        const results = [];

        try {

            for (const item of selectedItems) {

                try {

                    // Delete database record first.

                    const { data, error } = await supabaseClient

                        .from("media")

                        .delete()

                        .eq("id", item.id)

                        .select("id");


                    if (error) {
                        throw error;
                    }


                    if (!data || data.length === 0) {

                        throw new Error(
                            "Database record was not deleted."
                        );

                    }


                    // Remove corresponding Storage file.

                    if (item.storage_path) {

                        const {
                            error: storageError
                        } = await supabaseClient

                            .storage

                            .from("portfolio")

                            .remove([item.storage_path]);


                        if (storageError) {

                            results.push(
                                `${item.title}: database record deleted, but Storage cleanup failed: ${storageError.message}`
                            );

                            continue;

                        }

                    }


                    results.push(
                        `${item.title}: deleted successfully`
                    );


                } catch (error) {

                    console.error(
                        "Delete failed for:",
                        item.title,
                        error
                    );

                    results.push(
                        `${item.title}: ${error.message}`
                    );

                }

            }


            selectedMediaIds.clear();

            await loadBulkMedia();


            const successful = results.filter(
                result => result.includes("deleted successfully")
            ).length;


            const failed = results.length - successful;


            if (failed === 0) {

                showMessage(
                    `${successful} media item(s) deleted successfully.`
                );

            } else {

                showMessage(
                    `${successful} successful. ${failed} item(s) require attention. Check the browser Console for details.`,
                    true
                );

                console.warn(
                    "Bulk deletion results:",
                    results
                );

            }

        } finally {

            setProcessing(false);

        }

    }


    // ==========================================
    // PROCESSING STATE
    // ==========================================

    function setProcessing(processing) {

        isProcessing = processing;

        refreshButton.disabled = processing;

        publishButton.disabled =
            processing || selectedMediaIds.size === 0;

        unpublishButton.disabled =
            processing || selectedMediaIds.size === 0;

        deleteButton.disabled =
            processing || selectedMediaIds.size === 0;

    }


    // ==========================================
    // MESSAGE
    // ==========================================

    function showMessage(text, isError = false) {

        message.textContent = text;

        message.className = isError
            ? "bulk-message error"
            : "bulk-message success";

    }

})();