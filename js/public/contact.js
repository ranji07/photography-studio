"use strict";


document.addEventListener(
    "DOMContentLoaded",
    initializeContactPage
);


function initializeContactPage() {

    setupContactDetails();

    setupContactForm();

}


// ==========================================
// STUDIO CONTACT DETAILS
// ==========================================

function setupContactDetails() {

    const emailLink = document.getElementById(
        "studioEmailLink"
    );

    const phoneLink = document.getElementById(
        "studioPhoneLink"
    );

    const location = document.getElementById(
        "studioContactLocation"
    );

    const footerLocation = document.getElementById(
        "contactFooterLocation"
    );

    const whatsappLink = document.getElementById(
        "contactWhatsapp"
    );


    if (
        typeof STUDIO_EMAIL !== "undefined" &&
        STUDIO_EMAIL &&
        !STUDIO_EMAIL.includes("example.com")
    ) {

        emailLink.textContent = STUDIO_EMAIL;

        emailLink.href = "mailto:" + STUDIO_EMAIL;

    } else {

        emailLink.textContent =
            "Configure studio email in js/config.js";

        emailLink.removeAttribute("href");

    }


    if (
        typeof STUDIO_PHONE !== "undefined" &&
        STUDIO_PHONE &&
        !STUDIO_PHONE.includes("YOUR_")
    ) {

        phoneLink.textContent = STUDIO_PHONE;

        phoneLink.href =
            "tel:" + STUDIO_PHONE.replace(/[^\d+]/g, "");

    } else {

        phoneLink.textContent =
            "Configure studio phone in js/config.js";

        phoneLink.removeAttribute("href");

    }


    if (
        typeof STUDIO_LOCATION !== "undefined"
    ) {

        location.textContent = STUDIO_LOCATION;

        footerLocation.textContent = STUDIO_LOCATION;

    }


    if (
        typeof STUDIO_WHATSAPP_NUMBER !== "undefined"
    ) {

        const number =
            STUDIO_WHATSAPP_NUMBER.replace(/\D/g, "");


        if (
            /^\d{9,15}$/.test(number) &&
            !STUDIO_WHATSAPP_NUMBER.includes("YOUR_")
        ) {

            whatsappLink.href =
                "https://wa.me/" +
                number +
                "?text=" +
                encodeURIComponent(
                    "Hello! I would like to enquire about your photography services."
                );

            whatsappLink.target = "_blank";

            whatsappLink.rel = "noopener noreferrer";

        } else {

            whatsappLink.href = "#";

            whatsappLink.textContent =
                "WHATSAPP NOT CONFIGURED";

        }

    }

}


// ==========================================
// CONTACT FORM
// ==========================================

function setupContactForm() {

    const form = document.getElementById(
        "contactForm"
    );

    const submitButton = document.getElementById(
        "submitEnquiryBtn"
    );

    const formMessage = document.getElementById(
        "contactFormMessage"
    );


    form.addEventListener("submit", async function(event) {

        event.preventDefault();


        // Prevent multiple submissions.

        if (submitButton.disabled) {
            return;
        }


        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            showFormMessage(
                "Website connection is unavailable. Please contact the studio directly.",
                true
            );

            return;

        }


        // Honeypot check.

        const honeypot = document.getElementById(
            "website"
        ).value.trim();


        if (honeypot) {

            showFormMessage(
                "Unable to submit this request.",
                true
            );

            return;

        }


        // Read form values.

        const customerName = document
            .getElementById("customerName")
            .value
            .trim();

        const email = document
            .getElementById("customerEmail")
            .value
            .trim();

        const phone = document
            .getElementById("customerPhone")
            .value
            .trim();

        const serviceType = document
            .getElementById("serviceType")
            .value;

        const eventDate = document
            .getElementById("eventDate")
            .value;

        const message = document
            .getElementById("customerMessage")
            .value
            .trim();


        // Validate name.

        if (
            customerName.length < 2 ||
            customerName.length > 100
        ) {

            showFormMessage(
                "Please enter a valid name.",
                true
            );

            return;

        }


        // Validate email.

        const emailPattern =
            /^[^@\s]+@[^@\s]+\.[^@\s]+$/;


        if (!emailPattern.test(email)) {

            showFormMessage(
                "Please enter a valid email address.",
                true
            );

            return;

        }


        // Validate service.

        if (!serviceType) {

            showFormMessage(
                "Please select a service.",
                true
            );

            return;

        }


        // Validate message.

        if (
            message.length < 10 ||
            message.length > 2000
        ) {

            showFormMessage(
                "Message must contain between 10 and 2000 characters.",
                true
            );

            return;

        }


        // Prepare database record.

        const enquiry = {

            customer_name: customerName,

            email: email,

            phone: phone || null,

            service_type: serviceType,

            event_date: eventDate || null,

            message: message,

            status: "new"

        };


        submitButton.disabled = true;

        submitButton.textContent = "SENDING...";


        showFormMessage(
            "Submitting your enquiry..."
        );


        try {

            const { error } = await supabaseClient
                .from("enquiries")
                .insert(enquiry);


            if (error) {
                throw error;
            }


            showFormMessage(
                "Thank you! Your enquiry has been submitted successfully. Our studio will contact you soon.",
                false
            );


            form.reset();


        } catch (error) {

            console.error(
                "Enquiry submission error:",
                error
            );


            showFormMessage(
                "Unable to submit your enquiry. Please try again or contact us through WhatsApp.",
                true
            );


        } finally {

            submitButton.disabled = false;

            submitButton.textContent = "SEND ENQUIRY";

        }

    });

}


// ==========================================
// FORM STATUS MESSAGE
// ==========================================

function showFormMessage(message, isError = false) {

    const element = document.getElementById(
        "contactFormMessage"
    );

    element.textContent = message;

    element.className = isError
        ? "contact-message error"
        : "contact-message success";

}