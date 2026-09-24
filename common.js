// Shared storefront request and navigation helpers.
const API_ORIGIN = "https://back-end-klkg.onrender.com";
let csrfTokenPromise = null;

function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readApiBody(response) {
    const type = response.headers.get("content-type") || "";
    if (type.includes("application/json")) {
        try { return await response.json(); } catch { return {}; }
    }
    try {
        const text = await response.text();
        return text ? { message: text } : {};
    } catch { return {}; }
}

function apiError(response, body = {}) {
    const error = new Error(body.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.body = body;
    return error;
}

async function getCsrfToken() {
    if (!csrfTokenPromise) {
        csrfTokenPromise = fetch(apiUrl("/api/csrf-token"), {
            credentials: "include",
            signal: AbortSignal.timeout(15000)
        }).then(async response => {
            const body = await readApiBody(response);
            if (!response.ok || !body.csrfToken) throw apiError(response, body);
            return body.csrfToken;
        }).catch(error => {
            csrfTokenPromise = null;
            throw error;
        });
    }
    return csrfTokenPromise;
}

async function apiFetch(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        headers.set("X-CSRF-Token", await getCsrfToken());
    }
    try {
        const response = await fetch(apiUrl(path), {
            ...options,
            method,
            headers,
            credentials: "include",
            signal: options.signal || controller.signal
        });
        const body = await readApiBody(response);
        if (!response.ok) throw apiError(response, body);
        response.apiBody = body;
        return response;
    } catch (error) {
        if (error.name === "AbortError" || error.name === "TimeoutError") {
            const timeoutError = new Error("انتهت مهلة الاتصال بالخادم");
            timeoutError.code = "TIMEOUT";
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function apiErrorMessage(error, fallback = "تعذر الاتصال بالخادم.") {
    if (error?.status === 401) return "يرجى تسجيل الدخول أولاً.";
    if (error?.status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
    if (error?.status === 429) return "محاولات كثيرة. يرجى الانتظار ثم المحاولة مجدداً.";
    if (error?.code === "TIMEOUT") return "استغرق الخادم وقتاً طويلاً. حاول مجدداً.";
    return error?.body?.message || error?.message || fallback;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}

function safeImageUrl(value) {
    try {
        const url = new URL(String(value || ""), window.location.href);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
}

// Navigation and common modal helpers.
function setupPageLinks() {
    document.querySelectorAll("[data-page]").forEach(link => link.addEventListener("click", event => {
        event.preventDefault();
        window.location.href = link.getAttribute("data-page");
    }));
    document.getElementById("logoLink")?.addEventListener("click", event => {
        event.preventDefault();
        window.location.href = "Index.html";
    });
}
function setupSearchBox(filterAndRenderProducts) {
    const button = document.getElementById("searchBtn");
    const input = document.getElementById("searchInput");
    if (!button || !input) return;
    const search = event => {
        event?.preventDefault();
        window.searchTerm = input.value.trim();
        filterAndRenderProducts();
    };
    button.addEventListener("click", search);
    input.addEventListener("keyup", event => { if (event.key === "Enter") search(event); });
}
function updateCategoryHighlight() {}
function setupPrivacyTerms() {
    document.querySelectorAll(".privacy-link").forEach(link => link.addEventListener("click", event => {
        event.preventDefault(); document.getElementById("privacyModal")?.classList.remove("hidden");
    }));
    document.querySelectorAll(".terms-link").forEach(link => link.addEventListener("click", event => {
        event.preventDefault(); document.getElementById("termsModal")?.classList.remove("hidden");
    }));
    window.closePrivacy = () => document.getElementById("privacyModal")?.classList.add("hidden");
    window.closeTerms = () => document.getElementById("termsModal")?.classList.add("hidden");
}
function setupLoginModal() {}
function setupCommon(filterAndRenderProducts) {
    setupPageLinks(); setupSearchBox(filterAndRenderProducts); setupPrivacyTerms();
}
Object.assign(window, { apiUrl, apiFetch, readApiBody, apiErrorMessage, escapeHtml, safeImageUrl, getCsrfToken, setupCommon, updateCategoryHighlight });