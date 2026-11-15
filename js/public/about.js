"use strict";

document.addEventListener(
    "DOMContentLoaded",
    initializeAboutPage
);


function initializeAboutPage() {

    // Display studio name

    if (typeof STUDIO_NAME !== "undefined") {

        document
            .querySelectorAll("[data-studio-name]")
            .forEach(element => {

                element.textContent = STUDIO_NAME;

            });

    }


    // Display location

    if (typeof STUDIO_LOCATION !== "undefined") {

        document
            .querySelectorAll("[data-studio-location]")
            .forEach(element => {

                element.textContent = STUDIO_LOCATION;

            });

    }


    // Handle missing studio photograph

    const image = document.getElementById(
        "studioAboutImage"
    );

    const fallback = document.getElementById(
        "aboutImageFallback"
    );


    if (image && fallback) {

        image.addEventListener("error", function () {

            image.hidden = true;

            fallback.hidden = false;

        });

    }

}