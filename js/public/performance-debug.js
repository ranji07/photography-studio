// ==========================================
// STEP 24 - LOCAL CORE WEB VITALS DEBUGGER
// Development only: no visitor data is sent.
// ==========================================

(function () {
    "use strict";

    const isLocal =
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";

    if (!isLocal) {
        return;
    }

    async function startMeasurement() {
        try {
            const {
                onLCP,
                onINP,
                onCLS
            } = await import(
                "https://unpkg.com/web-vitals@6.2.3?module"
            );

            function logMetric(metric) {
                console.info(
                    `[Web Vitals] ${metric.name}:`,
                    metric.value,
                    `Rating: ${metric.rating}`
                );
            }

            onLCP(logMetric);
            onINP(logMetric);
            onCLS(logMetric);

            console.info(
                "Local Core Web Vitals diagnostics enabled."
            );

        } catch (error) {
            console.warn(
                "Core Web Vitals library could not be loaded:",
                error
            );
        }
    }

    startMeasurement();

})();