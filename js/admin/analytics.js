// ==========================================
// STEP 23 - ADMIN ENQUIRY ANALYTICS
// ==========================================

(function () {
    "use strict";

    // Use the SAME admin UUID as all other admin pages.
    const ADMIN_USER_ID = "48e6ddb7-5212-4682-aa9c-c34b3ed4ed93";

    const db = window.supabaseClient;

    // --------------------------------------
    // DOM ELEMENTS
    // --------------------------------------

    const loading = document.getElementById("analytics-loading");
    const errorElement = document.getElementById("analytics-error");
    const dashboard = document.getElementById("analytics-dashboard");

    const startDateInput = document.getElementById(
        "analytics-start-date"
    );

    const endDateInput = document.getElementById(
        "analytics-end-date"
    );

    const periodLabel = document.getElementById(
        "analytics-period-label"
    );

    const refreshButton = document.getElementById(
        "analytics-refresh"
    );

    const applyDateButton = document.getElementById(
        "analytics-apply-date"
    );

    const rangeButtons = [
        ...document.querySelectorAll("[data-range-days]")
    ];

    const logoutButton = document.getElementById(
        "analytics-logout"
    );


    // KPI elements
    const totalElement = document.getElementById(
        "analytics-total"
    );

    const convertedElement = document.getElementById(
        "analytics-converted"
    );

    const notConvertedElement = document.getElementById(
        "analytics-not-converted"
    );

    const rateElement = document.getElementById(
        "analytics-conversion-rate"
    );

    const totalComparisonElement = document.getElementById(
        "analytics-total-comparison"
    );

    const previousRateElement = document.getElementById(
        "analytics-previous-rate"
    );


    // Chart containers
    const timelineContainer = document.getElementById(
        "analytics-timeline"
    );

    const statusesContainer = document.getElementById(
        "analytics-statuses"
    );

    const servicesContainer = document.getElementById(
        "analytics-services"
    );

    const sourcesContainer = document.getElementById(
        "analytics-sources"
    );

    const campaignsContainer = document.getElementById(
        "analytics-campaigns"
    );

    const recentContainer = document.getElementById(
        "analytics-recent"
    );


    // --------------------------------------
    // STATE
    // --------------------------------------

    let latestRequest = 0;


    // --------------------------------------
    // AUTHENTICATION
    // --------------------------------------

   async function requireAdmin() {
       if (!db) {
           console.error("Supabase client is unavailable.");
           window.location.href = "login.html";
           return false;
       }

       try {
           const { data, error } = await db.auth.getUser();

           if (error) {
               console.error("Authentication error:", error);
               window.location.href = "login.html";
               return false;
           }

           if (!data.user) {
               console.error("No authenticated user found.");
               window.location.href = "login.html";
               return false;
           }

           console.log("Signed-in user ID:", data.user.id);
           console.log("Configured admin ID:", ADMIN_USER_ID);

           if (data.user.id !== ADMIN_USER_ID) {
               console.error("Admin UUID mismatch. Access denied.");

               // Do not sign out automatically during diagnosis.
               window.location.href = "login.html";
               return false;
           }

           console.log("Admin authentication successful.");
           return true;

       } catch (error) {
           console.error("Admin authentication failed:", error);
           window.location.href = "login.html";
           return false;
       }
   }


    // --------------------------------------
    // DATE HELPERS
    // --------------------------------------

    function localDateString(date) {
        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function shiftDate(dateString, amount) {
        const parts = dateString.split("-");

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

        date.setDate(date.getDate() + amount);

        return localDateString(date);
    }


    function formatDate(dateString) {
        if (!dateString) {
            return "";
        }

        const parts = dateString.split("-");

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

        return new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(date);
    }


    function initializeDates() {
        const today = localDateString(new Date());

        const start = shiftDate(today, -29);

        startDateInput.value = start;
        endDateInput.value = today;

        startDateInput.max = today;
        endDateInput.max = today;

        periodLabel.textContent =
            `${formatDate(start)} – ${formatDate(today)}`;
    }


    function setDateRange(days, clickedButton) {
        const today = localDateString(new Date());

        const start = shiftDate(today, -(days - 1));

        startDateInput.value = start;
        endDateInput.value = today;

        rangeButtons.forEach(button => {
            const active = button === clickedButton;

            button.classList.toggle("active", active);
        });

        loadAnalytics();
    }


    // --------------------------------------
    // VIEW STATES
    // --------------------------------------

    function showLoading() {
        loading.hidden = false;
        errorElement.hidden = true;
        dashboard.hidden = true;
    }


    function showDashboard() {
        loading.hidden = true;
        errorElement.hidden = true;
        dashboard.hidden = false;
    }


    function showError(message) {
        loading.hidden = true;
        dashboard.hidden = true;
        errorElement.hidden = false;

        errorElement.textContent = message;
    }


    // --------------------------------------
    // NUMBER FORMATTING
    // --------------------------------------

    function formatNumber(value) {
        return new Intl.NumberFormat("en").format(
            Number(value) || 0
        );
    }


    function safeLabel(value) {
        return String(value || "Not specified");
    }


    // --------------------------------------
    // BAR CHART RENDERING
    // --------------------------------------

    function renderBarChart(container, rows) {
        container.innerHTML = "";

        if (!Array.isArray(rows) || rows.length === 0) {
            const empty = document.createElement("p");

            empty.className = "analytics-bar-empty";
            empty.textContent = "No data for this period.";

            container.appendChild(empty);
            return;
        }

        const maxCount = Math.max(
            1,
            ...rows.map(item => Number(item.count) || 0)
        );

        rows.forEach(item => {
            const count = Number(item.count) || 0;

            const row = document.createElement("div");
            row.className = "analytics-bar-row";

            const top = document.createElement("div");
            top.className = "analytics-bar-top";

            const label = document.createElement("span");
            label.className = "analytics-bar-label";
            label.textContent = safeLabel(item.label);

            const countElement = document.createElement("span");
            countElement.className = "analytics-bar-count";
            countElement.textContent = formatNumber(count);

            const track = document.createElement("div");
            track.className = "analytics-bar-track";

            const fill = document.createElement("div");
            fill.className = "analytics-bar-fill";

            const width = Math.max(
                0,
                (count / maxCount) * 100
            );

            fill.style.width = `${width}%`;

            track.appendChild(fill);
            top.append(label, countElement);
            row.append(top, track);

            container.appendChild(row);
        });
    }


    // --------------------------------------
    // SVG HELPERS
    // --------------------------------------

    const SVG_NS = "http://www.w3.org/2000/svg";


    function svgElement(name, attributes, text) {
        const element = document.createElementNS(
            SVG_NS,
            name
        );

        Object.entries(attributes || {}).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });

        if (text !== undefined) {
            element.textContent = String(text);
        }

        return element;
    }


    // --------------------------------------
    // ENQUIRY TIMELINE
    // --------------------------------------

    function renderTimeline(container, data) {
        container.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            const empty = document.createElement("p");

            empty.className = "analytics-bar-empty";
            empty.textContent = "No enquiry activity in this period.";

            container.appendChild(empty);
            return;
        }

        const width = 760;
        const height = 250;

        const left = 42;
        const right = 25;
        const top = 22;
        const bottom = 190;

        const plotWidth = width - left - right;
        const plotHeight = bottom - top;

        const counts = data.map(item => Number(item.count) || 0);

        const maxValue = Math.max(1, ...counts);

        const svg = svgElement("svg", {
            viewBox: `0 0 ${width} ${height}`,
            role: "img",
            "aria-label": "Daily enquiry trend chart"
        });

        const title = svgElement(
            "title",
            {},
            "Daily enquiry activity"
        );

        svg.appendChild(title);

        // Horizontal grid lines and value labels.
        for (let i = 0; i <= 4; i++) {
            const y = top + (plotHeight / 4) * i;

            const value = Math.round(
                maxValue * (4 - i) / 4
            );

            const line = svgElement("line", {
                x1: left,
                y1: y,
                x2: width - right,
                y2: y,
                stroke: "#e8e4dc",
                "stroke-width": 1
            });

            const label = svgElement("text", {
                x: left - 10,
                y: y + 4,
                "text-anchor": "end",
                fill: "#89847b",
                "font-size": 10
            }, value);

            svg.append(line, label);
        }


        // Calculate points.
        const points = data.map((item, index) => {
            const x = data.length === 1
                ? left + plotWidth / 2
                : left + (
                    index / (data.length - 1)
                ) * plotWidth;

            const y = bottom - (
                (Number(item.count) || 0) / maxValue
            ) * plotHeight;

            return {
                x,
                y,
                count: Number(item.count) || 0,
                date: item.date
            };
        });


        // Draw the connecting line.
        const coordinates = points
            .map(point => `${point.x},${point.y}`)
            .join(" ");

        const polyline = svgElement("polyline", {
            points: coordinates,
            fill: "none",
            stroke: "#9b8057",
            "stroke-width": 3,
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        });

        svg.appendChild(polyline);


        // Draw data points.
        points.forEach(point => {
            const circle = svgElement("circle", {
                cx: point.x,
                cy: point.y,
                r: 4,
                fill: "#9b8057",
                stroke: "#fff",
                "stroke-width": 2
            });

            const pointTitle = svgElement(
                "title",
                {},
                `${point.date}: ${point.count} enquiries`
            );

            circle.appendChild(pointTitle);
            svg.appendChild(circle);
        });


        // Draw first, middle and last date labels.
        const labelIndexes = [
            0,
            Math.floor((data.length - 1) / 2),
            data.length - 1
        ];

        [...new Set(labelIndexes)].forEach(index => {
            const point = points[index];

            const label = svgElement("text", {
                x: point.x,
                y: bottom + 28,
                "text-anchor": "middle",
                fill: "#89847b",
                "font-size": 10
            }, point.date);

            svg.appendChild(label);
        });

        container.appendChild(svg);
    }


    // --------------------------------------
    // KPI RENDERING
    // --------------------------------------

    function renderSummary(summary) {
        const total = Number(summary.total) || 0;
        const converted = Number(summary.converted) || 0;
        const notConverted =
            Number(summary.not_converted) || 0;

        const rate = Number(summary.conversion_rate) || 0;

        const previousTotal =
            Number(summary.previous_total) || 0;

        const previousRate =
            Number(summary.previous_conversion_rate) || 0;

        totalElement.textContent = formatNumber(total);

        convertedElement.textContent =
            formatNumber(converted);

        notConvertedElement.textContent =
            formatNumber(notConverted);

        rateElement.textContent = `${rate.toFixed(1)}%`;

        const difference = total - previousTotal;

        const comparisonText =
            difference > 0
                ? `${formatNumber(difference)} more than previous period`
                : difference < 0
                    ? `${formatNumber(Math.abs(difference))} fewer than previous period`
                    : "Same total as previous period";

        totalComparisonElement.textContent =
            `Previous period: ${formatNumber(previousTotal)} · ${comparisonText}`;

        previousRateElement.textContent =
            `Previous period: ${previousRate.toFixed(1)}%`;
    }


    // --------------------------------------
    // RECENT ENQUIRIES
    // --------------------------------------

    function renderRecentEnquiries(rows) {
        recentContainer.innerHTML = "";

        if (!Array.isArray(rows) || rows.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");

            td.colSpan = 4;
            td.className = "analytics-table-empty";
            td.textContent = "No enquiries in this reporting period.";

            tr.appendChild(td);
            recentContainer.appendChild(tr);

            return;
        }

        rows.forEach(item => {
            const tr = document.createElement("tr");

            const customer = document.createElement("td");
            customer.className = "analytics-table-name";
            customer.textContent =
                safeLabel(item.customer_name);

            const service = document.createElement("td");
            service.textContent =
                safeLabel(item.service_type);

            const status = document.createElement("td");
            status.textContent =
                safeLabel(item.status);

            const date = document.createElement("td");

            if (item.created_at) {
                const parsed = new Date(item.created_at);

                date.textContent = Number.isNaN(parsed.getTime())
                    ? "—"
                    : new Intl.DateTimeFormat("en", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata"
                    }).format(parsed);
            } else {
                date.textContent = "—";
            }

            tr.append(customer, service, status, date);

            recentContainer.appendChild(tr);
        });
    }


    // --------------------------------------
    // RENDER ALL DASHBOARD SECTIONS
    // --------------------------------------

    function renderDashboard(data) {
        if (!data || !data.summary) {
            throw new Error(
                "The analytics function returned an unexpected response."
            );
        }

        renderSummary(data.summary);

        renderTimeline(
            timelineContainer,
            data.timeline
        );

        renderBarChart(
            statusesContainer,
            data.statuses
        );

        renderBarChart(
            servicesContainer,
            data.services
        );

        renderBarChart(
            sourcesContainer,
            data.sources
        );

        renderBarChart(
            campaignsContainer,
            data.campaigns
        );

        renderRecentEnquiries(data.recent);
    }


    // --------------------------------------
    // LOAD ANALYTICS THROUGH SUPABASE RPC
    // --------------------------------------

    async function loadAnalytics() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            showError("Select both a start date and an end date.");
            return;
        }

        if (endDate < startDate) {
            showError("The end date must not be earlier than the start date.");
            return;
        }

        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);

        const dayDifference = Math.round(
            (end - start) / 86400000
        );

        if (dayDifference > 365) {
            showError("Please select a date range of no more than 366 days.");
            return;
        }

        const today = localDateString(new Date());

        if (endDate > today) {
            showError("The end date cannot be in the future.");
            return;
        }

        const requestId = ++latestRequest;

        showLoading();

        periodLabel.textContent =
            `${formatDate(startDate)} – ${formatDate(endDate)}`;

        try {
            const { data, error } = await db.rpc(
                "get_enquiry_analytics",
                {
                    p_start_date: startDate,
                    p_end_date: endDate
                }
            );

            if (requestId !== latestRequest) {
                return;
            }

            if (error) {
                throw error;
            }

            renderDashboard(data);

            showDashboard();

        } catch (error) {
            console.error("Analytics loading error:", error);

            showError(
                error.message ||
                "Could not load analytics. Check the database function and admin permissions."
            );
        }
    }


    // --------------------------------------
    // EVENT LISTENERS
    // --------------------------------------

    rangeButtons.forEach(button => {
        button.addEventListener("click", () => {
            const days = Number(button.dataset.rangeDays);

            if (!Number.isInteger(days) || days < 1) {
                return;
            }

            setDateRange(days, button);
        });
    });


    applyDateButton.addEventListener("click", () => {
        rangeButtons.forEach(button => {
            button.classList.remove("active");
        });

        loadAnalytics();
    });


    refreshButton.addEventListener("click", loadAnalytics);


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

        initializeDates();

        await loadAnalytics();
    }

    initialize();

})();