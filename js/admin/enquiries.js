"use strict";

(function () {

    // ==========================================
    // ADMIN CONFIGURATION
    // ==========================================

    const ADMIN_UID =
        "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";


    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const tableBody =
        document.getElementById("enquiryTableBody");

    const searchInput =
        document.getElementById("enquirySearch");

    const statusFilter =
        document.getElementById("enquiryStatusFilter");

    const refreshButton =
        document.getElementById("refreshEnquiriesBtn");

    const logoutButton =
        document.getElementById("enquiryLogoutBtn");

    const messageElement =
        document.getElementById("enquiriesMessage");


    // ==========================================
    // STATE
    // ==========================================

    let enquiries = [];

    let isUpdating = false;

    const allowedStatuses = [
        "new",
        "contacted",
        "confirmed",
        "completed",
        "closed"
    ];


    // ==========================================
    // INITIALIZE
    // ==========================================

    document.addEventListener(
        "DOMContentLoaded",
        initializeEnquiries
    );


    async function initializeEnquiries() {

        try {

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

            await loadEnquiries();

        } catch (error) {

            console.error(
                "Enquiry initialization error:",
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
            renderEnquiries
        );

        statusFilter.addEventListener(
            "change",
            renderEnquiries
        );

        refreshButton.addEventListener(
            "click",
            loadEnquiries
        );

        logoutButton.addEventListener(
            "click",
            logoutAdmin
        );

    }


    // ==========================================
    // LOAD ENQUIRIES
    // ==========================================

    async function loadEnquiries() {

        refreshButton.disabled = true;

        refreshButton.textContent = "Loading...";

        showMessage("");

        try {

            const { data, error } = await supabaseClient

                .from("enquiries")

                .select(`
                    id,
                    customer_name,
                    email,
                    phone,
                    service_type,
                    event_date,
                    message,
                    status,
                    created_at
                `)

                .order("created_at", {
                    ascending: false
                })

                .limit(1000);


            if (error) {
                throw error;
            }


            enquiries = data || [];

            updateStatistics();

            renderEnquiries();


        } catch (error) {

            console.error(
                "Enquiry loading error:",
                error
            );

            tableBody.replaceChildren();

            showMessage(
                error.message || "Unable to load enquiries.",
                true
            );

        } finally {

            refreshButton.disabled = false;

            refreshButton.textContent = "Refresh";

        }

    }


    // ==========================================
    // UPDATE SUMMARY CARDS
    // ==========================================

    function updateStatistics() {

        document.getElementById(
            "totalEnquiries"
        ).textContent = enquiries.length;


        document.getElementById(
            "newEnquiries"
        ).textContent = enquiries.filter(
            item => item.status === "new"
        ).length;


        document.getElementById(
            "contactedEnquiries"
        ).textContent = enquiries.filter(
            item => item.status === "contacted"
        ).length;


        document.getElementById(
            "completedEnquiries"
        ).textContent = enquiries.filter(
            item => item.status === "completed"
        ).length;

    }


    // ==========================================
    // FILTER ENQUIRIES
    // ==========================================

    function getFilteredEnquiries() {

        const keyword =
            searchInput.value.trim().toLowerCase();

        const selectedStatus =
            statusFilter.value;


        return enquiries.filter(item => {

            const searchableText = [

                item.customer_name,

                item.email,

                item.phone,

                item.service_type,

                item.message

            ].join(" ").toLowerCase();


            const searchMatches =
                !keyword ||
                searchableText.includes(keyword);


            const statusMatches =
                !selectedStatus ||
                item.status === selectedStatus;


            return searchMatches && statusMatches;

        });

    }


    // ==========================================
    // RENDER TABLE
    // ==========================================

    function renderEnquiries() {

        const filtered = getFilteredEnquiries();

        tableBody.replaceChildren();


        if (filtered.length === 0) {

            const row = document.createElement("tr");

            const cell = document.createElement("td");

            cell.colSpan = 8;

            cell.textContent =
                "No enquiries found.";

            row.appendChild(cell);

            tableBody.appendChild(row);

            return;

        }


        filtered.forEach(item => {

            const row = document.createElement("tr");


            // Customer

            const customerCell =
                document.createElement("td");

            customerCell.textContent =
                item.customer_name;


            // Contact details

            const contactCell =
                document.createElement("td");


            const emailLink =
                document.createElement("a");

            emailLink.textContent = item.email;

            emailLink.href =
                "mailto:" + item.email;

            emailLink.className =
                "enquiry-contact-link";


            contactCell.appendChild(emailLink);


            if (item.phone) {

                const phoneLink =
                    document.createElement("a");

                phoneLink.textContent = item.phone;

                phoneLink.href =
                    "tel:" + item.phone.replace(/[^\d+]/g, "");

                phoneLink.className =
                    "enquiry-contact-link";


                contactCell.appendChild(
                    document.createElement("br")
                );

                contactCell.appendChild(phoneLink);

            }


            // Service type

            const serviceCell =
                document.createElement("td");

            serviceCell.textContent =
                item.service_type || "-";


            // Event date

            const eventDateCell =
                document.createElement("td");

            eventDateCell.textContent =
                item.event_date
                    ? new Date(
                        item.event_date + "T12:00:00"
                    ).toLocaleDateString()
                    : "-";


            // Customer message

            const messageCell =
                document.createElement("td");

            messageCell.className =
                "enquiry-message-cell";

            messageCell.textContent =
                item.message || "-";

            messageCell.title =
                item.message || "";


            // Status selector

            const statusCell =
                document.createElement("td");

            const statusSelect =
                document.createElement("select");

            statusSelect.className =
                "enquiry-status-select";


            allowedStatuses.forEach(status => {

                const option =
                    document.createElement("option");

                option.value = status;

                option.textContent =
                    status.charAt(0).toUpperCase() +
                    status.slice(1);

                statusSelect.appendChild(option);

            });


            statusSelect.value =
                allowedStatuses.includes(item.status)
                    ? item.status
                    : "new";


            statusSelect.addEventListener(
                "change",
                function () {

                    const oldStatus = item.status;

                    updateEnquiryStatus(
                        item.id,
                        statusSelect.value,
                        oldStatus,
                        statusSelect
                    );

                }
            );


            statusCell.appendChild(statusSelect);


            // Submitted date

            const createdCell =
                document.createElement("td");

            createdCell.textContent =
                item.created_at
                    ? new Date(
                        item.created_at
                    ).toLocaleDateString()
                    : "-";


            // Delete button

            const actionCell =
                document.createElement("td");

            const deleteButton =
                document.createElement("button");

            deleteButton.textContent = "Delete";

            deleteButton.className =
                "enquiry-delete-btn";

            deleteButton.type = "button";

            deleteButton.addEventListener(
                "click",
                () => deleteEnquiry(item)
            );


            actionCell.appendChild(deleteButton);


            row.append(
                customerCell,
                contactCell,
                serviceCell,
                eventDateCell,
                messageCell,
                statusCell,
                createdCell,
                actionCell
            );


            tableBody.appendChild(row);

        });

    }


    // ==========================================
    // UPDATE ENQUIRY STATUS
    // ==========================================

    async function updateEnquiryStatus(
        id,
        newStatus,
        oldStatus,
        selectElement
    ) {

        if (!allowedStatuses.includes(newStatus)) {

            selectElement.value = oldStatus;

            return;

        }


        selectElement.disabled = true;

        isUpdating = true;

        try {

            const { data, error } = await supabaseClient

                .from("enquiries")

                .update({
                    status: newStatus
                })

                .eq("id", id)

                .select("id");


            if (error) {
                throw error;
            }


            if (!data || data.length === 0) {

                throw new Error(
                    "Enquiry status was not updated."
                );

            }


            const item = enquiries.find(
                enquiry => enquiry.id === id
            );


            if (item) {

                item.status = newStatus;

            }


            updateStatistics();

            renderEnquiries();

            showMessage(
                "Enquiry status updated successfully."
            );


        } catch (error) {

            console.error(
                "Status update error:",
                error
            );

            selectElement.value = oldStatus;

            showMessage(
                error.message,
                true
            );

        } finally {

            isUpdating = false;

            selectElement.disabled = false;

        }

    }


    // ==========================================
    // DELETE ENQUIRY
    // ==========================================

    async function deleteEnquiry(item) {

        const confirmed = window.confirm(
            `Delete enquiry from ${item.customer_name}?`
        );


        if (!confirmed) {
            return;
        }


        try {

            const { data, error } = await supabaseClient

                .from("enquiries")

                .delete()

                .eq("id", item.id)

                .select("id");


            if (error) {
                throw error;
            }


            if (!data || data.length === 0) {

                throw new Error(
                    "Enquiry was not deleted."
                );

            }


            enquiries = enquiries.filter(
                enquiry => enquiry.id !== item.id
            );


            updateStatistics();

            renderEnquiries();


            showMessage(
                "Enquiry deleted successfully."
            );


        } catch (error) {

            console.error(
                "Enquiry deletion error:",
                error
            );

            showMessage(
                error.message,
                true
            );

        }

    }


    // ==========================================
    // LOGOUT
    // ==========================================

    async function logoutAdmin() {

        if (isUpdating) {
            return;
        }

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {

            showMessage(error.message, true);

            return;

        }

        window.location.replace("login.html");

    }


    // ==========================================
    // STATUS MESSAGE
    // ==========================================

    function showMessage(message, isError = false) {

        messageElement.textContent = message;

        messageElement.className = isError
            ? "enquiries-message error"
            : "enquiries-message success";

    }


})();