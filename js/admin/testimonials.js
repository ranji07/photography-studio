// ==========================================
// STEP 22 - ADMIN TESTIMONIALS MANAGER
// ==========================================

(function () {
    "use strict";

    // Replace with the SAME admin UUID used in your existing
    // admin authentication and Supabase RLS policies.
    const ADMIN_USER_ID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";

    const db = window.supabaseClient;

    const form = document.getElementById("testimonial-form");

    const idInput = document.getElementById("testimonial-id");
    const nameInput = document.getElementById("testimonial-client-name");
    const eventInput = document.getElementById("testimonial-event-type");
    const locationInput = document.getElementById("testimonial-location");
    const ratingInput = document.getElementById("testimonial-rating");
    const quoteInput = document.getElementById("testimonial-quote");
    const orderInput = document.getElementById("testimonial-order");

    const featuredInput = document.getElementById("testimonial-featured");
    const publishedInput = document.getElementById("testimonial-published");
    const consentInput = document.getElementById("testimonial-consent");

    const formHeading = document.getElementById(
        "testimonial-form-heading"
    );

    const editorStatus = document.getElementById(
        "testimonial-editor-status"
    );

    const saveButton = document.getElementById(
        "testimonial-save-button"
    );

    const resetButton = document.getElementById(
        "testimonial-reset-button"
    );

    const messageElement = document.getElementById(
        "testimonial-form-message"
    );

    const listElement = document.getElementById(
        "testimonial-list"
    );

    const refreshButton = document.getElementById(
        "testimonial-refresh"
    );

    const logoutButton = document.getElementById(
        "testimonial-logout"
    );

    let testimonials = [];
    let saving = false;


    // --------------------------------------
    // AUTHENTICATION
    // --------------------------------------

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
            console.error("Testimonial admin authentication error:", error);

            window.location.href = "login.html";
            return false;
        }
    }


    // --------------------------------------
    // MESSAGES
    // --------------------------------------

    function showMessage(message, isError = false) {
        messageElement.textContent = message;

        messageElement.classList.toggle(
            "error",
            isError
        );
    }


    // --------------------------------------
    // FORM RESET
    // --------------------------------------

    function resetForm() {
        form.reset();

        idInput.value = "";
        orderInput.value = "0";

        featuredInput.checked = false;
        publishedInput.checked = false;
        consentInput.checked = false;

        formHeading.textContent = "Add client feedback";
        editorStatus.textContent = "New testimonial";

        saveButton.textContent = "Save testimonial";

        showMessage("");
    }


    // --------------------------------------
    // LOAD TESTIMONIALS
    // --------------------------------------

    async function loadTestimonials() {
        listElement.innerHTML = `
            <p class="testimonial-list-empty">
                Loading testimonials...
            </p>
        `;

        const { data, error } = await db
            .from("client_testimonials")
            .select("*")
            .order("is_featured", { ascending: false })
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Testimonial loading error:", error);

            listElement.innerHTML = `
                <p class="testimonial-list-empty">
                    Unable to load testimonials. Refresh and try again.
                </p>
            `;

            return;
        }

        testimonials = data || [];

        renderTestimonials();
    }


    // --------------------------------------
    // RENDER EXISTING TESTIMONIALS
    // --------------------------------------

    function renderTestimonials() {
        listElement.innerHTML = "";

        if (testimonials.length === 0) {
            listElement.innerHTML = `
                <p class="testimonial-list-empty">
                    No testimonials created yet.
                </p>
            `;

            return;
        }

        const fragment = document.createDocumentFragment();

        testimonials.forEach(item => {
            const article = document.createElement("article");

            article.className = "testimonial-list-row";

            const info = document.createElement("div");
            info.className = "testimonial-list-info";

            const name = document.createElement("h3");
            name.textContent = item.client_name;

            const details = document.createElement("p");

            details.textContent = [
                item.event_type || "Event not specified",
                item.location || "Location not specified",
                item.rating ? `${item.rating}/5 rating` : "No rating"
            ].join(" · ");

            const quote = document.createElement("blockquote");
            quote.textContent = `“${item.quote}”`;

            const status = document.createElement("span");
            status.className = "testimonial-list-status";

            const states = [];

            states.push(
                item.is_published ? "Published" : "Unpublished"
            );

            if (item.is_featured) {
                states.push("Featured");
            }

            states.push(
                item.publication_consent
                    ? "Permission confirmed"
                    : "Permission not confirmed"
            );

            status.textContent = states.join(" · ");

            info.append(name, details, quote, status);

            const actions = document.createElement("div");
            actions.className = "testimonial-list-actions";

            actions.append(
                createButton("Edit", "edit", item.id),
                createButton(
                    item.is_published ? "Unpublish" : "Publish",
                    "toggle-publish",
                    item.id
                ),
                createButton("Delete", "delete", item.id)
            );

            article.append(info, actions);

            fragment.appendChild(article);
        });

        listElement.appendChild(fragment);
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
    // EDIT TESTIMONIAL
    // --------------------------------------

    function editTestimonial(id) {
        const item = testimonials.find(
            testimonial => testimonial.id === id
        );

        if (!item) {
            showMessage("Testimonial not found. Refresh and try again.", true);
            return;
        }

        idInput.value = item.id;

        nameInput.value = item.client_name || "";
        eventInput.value = item.event_type || "";
        locationInput.value = item.location || "";

        ratingInput.value =
            item.rating === null ? "" : String(item.rating);

        quoteInput.value = item.quote || "";
        orderInput.value = item.display_order ?? 0;

        featuredInput.checked = Boolean(item.is_featured);
        publishedInput.checked = Boolean(item.is_published);
        consentInput.checked = Boolean(item.publication_consent);

        formHeading.textContent = "Edit client feedback";
        editorStatus.textContent = "Editing testimonial";

        saveButton.textContent = "Update testimonial";

        showMessage("Testimonial loaded for editing.");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    // --------------------------------------
    // SAVE TESTIMONIAL
    // --------------------------------------

    async function saveTestimonial(event) {
        event.preventDefault();

        if (saving) {
            return;
        }

        showMessage("");

        const clientName = nameInput.value.trim();
        const quote = quoteInput.value.trim();

        if (clientName.length < 2) {
            showMessage("Enter a valid client name.", true);
            nameInput.focus();
            return;
        }

        if (quote.length < 10) {
            showMessage(
                "Client feedback must contain at least 10 characters.",
                true
            );

            quoteInput.focus();
            return;
        }

        // The database constraint also enforces this.
        if (publishedInput.checked && !consentInput.checked) {
            showMessage(
                "Confirm client publication permission before publishing.",
                true
            );

            consentInput.focus();
            return;
        }

        const payload = {
            client_name: clientName,
            quote: quote,
            event_type: eventInput.value.trim() || null,
            location: locationInput.value.trim() || null,
            rating: ratingInput.value
                ? Number(ratingInput.value)
                : null,
            is_featured: featuredInput.checked,
            is_published: publishedInput.checked,
            publication_consent: consentInput.checked,
            display_order: Math.max(
                0,
                Number(orderInput.value) || 0
            ),
            updated_at: new Date().toISOString()
        };

        saving = true;

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const id = idInput.value;

            let result;

            if (id) {
                result = await db
                    .from("client_testimonials")
                    .update(payload)
                    .eq("id", id)
                    .select("*")
                    .single();
            } else {
                result = await db
                    .from("client_testimonials")
                    .insert(payload)
                    .select("*")
                    .single();
            }

            if (result.error) {
                throw result.error;
            }

            showMessage(
                id
                    ? "Testimonial updated successfully."
                    : "Testimonial created successfully."
            );

            await loadTestimonials();

            resetForm();

        } catch (error) {
            console.error("Testimonial save error:", error);

            showMessage(
                error.message || "Could not save the testimonial.",
                true
            );

        } finally {
            saving = false;
            saveButton.disabled = false;
            saveButton.textContent = idInput.value
                ? "Update testimonial"
                : "Save testimonial";
        }
    }


    // --------------------------------------
    // PUBLISH / UNPUBLISH
    // --------------------------------------

    async function togglePublication(id) {
        const item = testimonials.find(
            testimonial => testimonial.id === id
        );

        if (!item) {
            return;
        }

        const nextStatus = !item.is_published;

        if (nextStatus && !item.publication_consent) {
            alert(
                "This testimonial cannot be published until client publication permission is confirmed. Edit the testimonial and confirm permission first."
            );

            return;
        }

        const { error } = await db
            .from("client_testimonials")
            .update({
                is_published: nextStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) {
            console.error("Testimonial publication error:", error);

            alert("Could not update testimonial publication status.");

            return;
        }

        await loadTestimonials();
    }


    // --------------------------------------
    // DELETE
    // --------------------------------------

    async function deleteTestimonial(id) {
        const item = testimonials.find(
            testimonial => testimonial.id === id
        );

        if (!item) {
            return;
        }

        const confirmed = window.confirm(
            `Delete the testimonial from "${item.client_name}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        const { error } = await db
            .from("client_testimonials")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Testimonial deletion error:", error);

            alert("Could not delete the testimonial.");

            return;
        }

        if (idInput.value === id) {
            resetForm();
        }

        await loadTestimonials();
    }


    // --------------------------------------
    // EVENT LISTENERS
    // --------------------------------------

    form.addEventListener("submit", saveTestimonial);

    resetButton.addEventListener("click", resetForm);

    refreshButton.addEventListener("click", loadTestimonials);


    listElement.addEventListener("click", async event => {
        const button = event.target.closest(
            "button[data-action]"
        );

        if (!button) {
            return;
        }

        const id = button.dataset.id;
        const action = button.dataset.action;

        if (action === "edit") {
            editTestimonial(id);
        }

        if (action === "toggle-publish") {
            await togglePublication(id);
        }

        if (action === "delete") {
            await deleteTestimonial(id);
        }
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

        if (!authorized) {
            return;
        }

        await loadTestimonials();
    }

    initialize();

})();