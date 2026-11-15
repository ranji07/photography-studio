// ==========================================
// STEP 23 - FIRST-TOUCH ENQUIRY ATTRIBUTION
// ==========================================

(function () {
    "use strict";

    const STORAGE_KEY = "studio_enquiry_attribution";

    function readStoredAttribution() {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);

            return stored ? JSON.parse(stored) : null;

        } catch (error) {
            console.warn("Attribution storage unavailable:", error);
            return null;
        }
    }

    function safeText(value, maxLength) {
        return String(value || "")
            .trim()
            .slice(0, maxLength);
    }

    function getCurrentAttribution() {
        const params = new URLSearchParams(window.location.search);

        const utmSource = safeText(
            params.get("utm_source"),
            150
        );

        const utmMedium = safeText(
            params.get("utm_medium"),
            150
        );

        const utmCampaign = safeText(
            params.get("utm_campaign"),
            200
        );

        let referrerDomain = "";

        if (document.referrer) {
            try {
                const referrer = new URL(document.referrer);

                if (referrer.origin !== window.location.origin) {
                    referrerDomain = safeText(
                        referrer.hostname,
                        255
                    );
                }
            } catch (error) {
                console.warn("Unable to identify referrer domain.");
            }
        }

        const hasCampaign =
            Boolean(utmSource || utmMedium || utmCampaign);

        const sourceChannel = hasCampaign
            ? "campaign"
            : referrerDomain
                ? "referral"
                : "direct";

        return {
            source_channel: sourceChannel,
            landing_page: safeText(
                window.location.pathname,
                300
            ),
            referrer_domain: referrerDomain || null,
            utm_source: utmSource || null,
            utm_medium: utmMedium || null,
            utm_campaign: utmCampaign || null
        };
    }


    function initializeAttribution() {
        const current = getCurrentAttribution();
        const stored = readStoredAttribution();

        const hasNewCampaign =
            current.utm_source ||
            current.utm_medium ||
            current.utm_campaign;

        // New campaign parameters establish a new attribution record.
        if (hasNewCampaign) {
            try {
                sessionStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(current)
                );
            } catch (error) {
                console.warn("Could not save campaign attribution.");
            }

            return current;
        }

        // Preserve first-touch attribution when navigating internally.
        if (stored && typeof stored === "object") {
            return stored;
        }

        // If no earlier source exists, save the current visit.
        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(current)
            );
        } catch (error) {
            console.warn("Could not save visit attribution.");
        }

        return current;
    }


    const initialAttribution = initializeAttribution();

    window.getEnquiryAttribution = function () {
        const stored = readStoredAttribution();

        const attribution =
            stored || initialAttribution;

        return {
            source_channel:
                attribution.source_channel || "legacy/unknown",

            landing_page:
                attribution.landing_page || null,

            referrer_domain:
                attribution.referrer_domain || null,

            utm_source:
                attribution.utm_source || null,

            utm_medium:
                attribution.utm_medium || null,

            utm_campaign:
                attribution.utm_campaign || null
        };
    };

})();