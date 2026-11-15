// ==========================================
// STEP 21 - SMART CLIENT BOOKING EXPERIENCE
// ==========================================

(function () {
    "use strict";

    const db = window.supabaseClient;

    // --------------------------------------
    // DOM ELEMENTS
    // --------------------------------------

    const form = document.getElementById("booking-form");
    const steps = [...document.querySelectorAll(".booking-step")];

    const progressSegments = [
        ...document.querySelectorAll("[data-progress-step]")
    ];

    const stepLabel = document.getElementById("booking-step-label");
    const stepName = document.getElementById("booking-step-name");

    const eventType = document.getElementById("booking-event-type");
    const eventDate = document.getElementById("booking-event-date");
    const locationInput = document.getElementById("booking-location");

    const nameInput = document.getElementById("booking-name");
    const emailInput = document.getElementById("booking-email");
    const phoneInput = document.getElementById("booking-phone");
    const notesInput = document.getElementById("booking-notes");

    const consentInput = document.getElementById("booking-consent");

    const reviewContainer = document.getElementById("booking-review");
    const formStatus = document.getElementById("booking-form-status");
    const submitButton = document.getElementById("booking-submit-button");

    const successSection = document.getElementById("booking-success");
    const whatsappLink = document.getElementById("booking-whatsapp-link");

    let currentStep = 1;
    let isSubmitting = false;

    const stepNames = {
        1: "Your event",
        2: "Your details",
        3: "Review enquiry"
    };


    // --------------------------------------
    // LOCAL DATE HELPER
    // Avoid UTC date conversion issues.
    // --------------------------------------

    function getLocalDateString() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    eventDate.min = getLocalDateString();


    // --------------------------------------
    // FORM VALUE HELPERS
    // --------------------------------------

    function getRadioValue(name) {
        const selected = form.querySelector(
            `input[name="${name}"]:checked`
        );

        return selected ? selected.value : "";
    }

    function getFormData() {
        return {
            serviceType: getRadioValue("service_type"),
            eventType: eventType.value.trim(),
            eventDate: eventDate.value,
            location: locationInput.value.trim(),
            package: getRadioValue("package"),
            name: nameInput.value.trim(),
            email: emailInput.value.trim().toLowerCase(),
            phone: phoneInput.value.trim(),
            creativeStyle: getRadioValue("creative_style"),
            notes: notesInput.value.trim()
        };
    }


    // --------------------------------------
    // STEP VALIDATION
    // --------------------------------------

    function validateStep(stepNumber) {
        const activeStep = steps.find(
            item => Number(item.dataset.step) === stepNumber
        );

        if (!activeStep) {
            return false;
        }

        const fields = [
            ...activeStep.querySelectorAll("input, select, textarea")
        ];

        for (const field of fields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                field.focus();
                return false;
            }
        }

        if (stepNumber === 1) {
            const selectedService = getRadioValue("service_type");

            if (!selectedService) {
                const firstService = form.querySelector(
                    'input[name="service_type"]'
                );

                firstService.reportValidity();
                firstService.focus();
                return false;
            }

            if (eventDate.value && eventDate.value < getLocalDateString()) {
                eventDate.setCustomValidity(
                    "Please select today or a future event date."
                );

                eventDate.reportValidity();
                eventDate.focus();
                eventDate.setCustomValidity("");

                return false;
            }
        }

        if (stepNumber === 2) {
            if (nameInput.value.trim().length < 2) {
                nameInput.setCustomValidity(
                    "Please enter a name with at least two characters."
                );

                nameInput.reportValidity();
                nameInput.focus();
                nameInput.setCustomValidity("");

                return false;
            }

            if (phoneInput.value.trim() &&
                !/^[0-9+() \-]{7,30}$/.test(phoneInput.value.trim())) {
                phoneInput.setCustomValidity(
                    "Please enter a valid phone number or leave it blank."
                );

                phoneInput.reportValidity();
                phoneInput.focus();
                phoneInput.setCustomValidity("");

                return false;
            }
        }

        if (stepNumber === 3 && !consentInput.checked) {
            consentInput.reportValidity();
            consentInput.focus();
            return false;
        }

        return true;
    }


    // --------------------------------------
    // STEP NAVIGATION
    // --------------------------------------

    function showStep(stepNumber) {
        currentStep = stepNumber;

        steps.forEach(step => {
            const isActive =
                Number(step.dataset.step) === stepNumber;

            step.hidden = !isActive;
        });

        progressSegments.forEach(segment => {
            const step = Number(segment.dataset.progressStep);

            segment.classList.toggle(
                "active",
                step <= stepNumber
            );
        });

        stepLabel.textContent =
            `STEP ${String(stepNumber).padStart(2, "0")} OF 03`;

        stepName.textContent = stepNames[stepNumber];

        formStatus.textContent = "";
        formStatus.classList.remove("success");

        if (stepNumber === 3) {
            renderReview();
        }

        const heading = document.querySelector(
            `.booking-step[data-step="${stepNumber}"] h2`
        );

        if (heading) {
            heading.focus();
        }
    }


    // --------------------------------------
    // REVIEW SUMMARY
    // Use textContent to avoid HTML injection.
    // --------------------------------------

    function addReviewRow(label, value) {
        const row = document.createElement("div");
        row.className = "booking-review-row";

        const labelElement = document.createElement("span");
        labelElement.textContent = label;

        const valueElement = document.createElement("span");
        valueElement.textContent = value || "Not specified";

        row.append(labelElement, valueElement);
        reviewContainer.appendChild(row);
    }

    function formatDate(value) {
        if (!value) {
            return "Not decided yet";
        }

        const parts = value.split("-");

        if (parts.length !== 3) {
            return value;
        }

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

        return new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function renderReview() {
        const data = getFormData();

        reviewContainer.innerHTML = "";

        addReviewRow("Service", data.serviceType);
        addReviewRow("Event type", data.eventType);
        addReviewRow("Event date", formatDate(data.eventDate));
        addReviewRow("Location", data.location);
        addReviewRow("Collection preference", data.package);
        addReviewRow("Name", data.name);
        addReviewRow("Email", data.email);
        addReviewRow("Phone", data.phone);
        addReviewRow("Creative style", data.creativeStyle);
        addReviewRow("Additional notes", data.notes);
    }


    // --------------------------------------
    // BUILD ENQUIRY MESSAGE
    // Existing enquiries table is reused.
    // --------------------------------------

    function buildEnquiryMessage(data) {
        return [
            "NEW WEBSITE BOOKING ENQUIRY",
            "",
            `Event type: ${data.eventType || "Not specified"}`,
            `Event location: ${data.location || "Not specified"}`,
            `Collection preference: ${data.package || "Not specified"}`,
            `Creative style: ${data.creativeStyle || "Not specified"}`,
            "",
            "Additional notes:",
            data.notes || "None",
            "",
            "Submitted through: Smart Booking Experience"
        ].join("\n");
    }


    // --------------------------------------
    // WHATSAPP CONFIGURATION
    // Reuses the existing config.js value.
    // --------------------------------------

    function getWhatsAppNumber() {
        let configuredNumber = "";

        if (typeof STUDIO_WHATSAPP_NUMBER !== "undefined") {
            configuredNumber = STUDIO_WHATSAPP_NUMBER;
        } else if (window.STUDIO_WHATSAPP_NUMBER) {
            configuredNumber = window.STUDIO_WHATSAPP_NUMBER;
        }

        return String(configuredNumber || "").replace(/\D/g, "");
    }

    function prepareWhatsAppLink(data) {
        const number = getWhatsAppNumber();

        if (!number) {
            whatsappLink.hidden = true;
            return;
        }

        const message = [
            "Hello, I have submitted an enquiry through your website.",
            "",
            `Name: ${data.name}`,
            `Service: ${data.serviceType}`,
            `Event: ${data.eventType}`,
            `Date: ${formatDate(data.eventDate)}`,
            `Location: ${data.location || "Not decided yet"}`,
            "",
            "I would like to discuss the next steps."
        ].join("\n");

        whatsappLink.href =
            `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

        whatsappLink.hidden = false;
    }


    // --------------------------------------
    // SUCCESS DISPLAY
    // --------------------------------------

    function showSuccess(data) {
        form.hidden = true;
        document.querySelector(".booking-progress").hidden = true;

        successSection.hidden = false;

        prepareWhatsAppLink(data);

        const successHeading = document.getElementById(
            "booking-success-title"
        );

        successHeading.focus();

        window.scrollTo({
            top: successSection.getBoundingClientRect().top +
                 window.scrollY - 100,
            behavior: "smooth"
        });
    }


    // --------------------------------------
    // SUBMIT ENQUIRY TO SUPABASE
    // --------------------------------------

    async function submitEnquiry(event) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (!validateStep(3)) {
            return;
        }

        if (!db) {
            formStatus.textContent =
                "The enquiry service is unavailable. Please try again later.";

            return;
        }

        const data = getFormData();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
            emailInput.focus();

            formStatus.textContent =
                "Please enter a valid email address.";

            return;
        }

        const payload = {
            customer_name: data.name,
            email: data.email,
            phone: data.phone || null,
            service_type: data.serviceType,
            event_date: data.eventDate || null,
            message: buildEnquiryMessage(data),
            status: "new"
        };

        isSubmitting = true;

        submitButton.disabled = true;
        submitButton.textContent = "Sending...";

        formStatus.textContent = "";

        try {
            const { error } = await db
                .from("enquiries")
                .insert([payload]);

            if (error) {
                throw error;
            }

            showSuccess(data);

        } catch (error) {
            console.error("Booking enquiry submission error:", error);

            formStatus.textContent =
                "We could not send your enquiry. Please check your details and try again.";

        } finally {
            isSubmitting = false;
            submitButton.disabled = false;

            if (!successSection.hidden) {
                submitButton.textContent = "Enquiry sent";
            } else {
                submitButton.innerHTML =
                    'Send enquiry <span aria-hidden="true">↗</span>';
            }
        }
    }


    // --------------------------------------
    // EVENT LISTENERS
    // --------------------------------------

    document.querySelectorAll("[data-next]").forEach(button => {
        button.addEventListener("click", () => {
            const nextStep = Number(button.dataset.next);

            if (!validateStep(currentStep)) {
                return;
            }

            if (nextStep === 3) {
                renderReview();
            }

            showStep(nextStep);
        });
    });

    document.querySelectorAll("[data-back]").forEach(button => {
        button.addEventListener("click", () => {
            const previousStep = Number(button.dataset.back);
            showStep(previousStep);
        });
    });

    form.addEventListener("submit", submitEnquiry);


    // --------------------------------------
    // INITIALIZE
    // --------------------------------------

    showStep(1);

})();