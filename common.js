// Souq.com shared shell — API + Glass header/footer + legal modals + wishlist + AOS
const API_ORIGIN = "https://back-end-klkg.onrender.com";
const SITE = {
  name: "سوق.كوم",
  logo: "assets/logo.svg",
  logoFallback: "https://i.ibb.co/kgdfjxd9/Png.png",
  hero: "assets/hero.svg",
};
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
  try { const text = await response.text(); return text ? { message: text } : {}; }
  catch { return {}; }
}
function apiError(response, body = {}) {
  const error = new Error(body.message || `Request failed (${response.status})`);
  error.status = response.status; error.body = body; return error;
}
async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(apiUrl("/api/csrf-token"), {
      credentials: "include", signal: AbortSignal.timeout(15000)
    }).then(async response => {
      const body = await readApiBody(response);
      if (!response.ok || !body.csrfToken) throw apiError(response, body);
      return body.csrfToken;
    }).catch(error => { csrfTokenPromise = null; throw error; });
  }
  return csrfTokenPromise;
}
async function apiFetch(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRF-Token", await getCsrfToken());
  try {
    const response = await fetch(apiUrl(path), { ...options, method, headers, credentials: "include", signal: options.signal || controller.signal });
    const body = await readApiBody(response);
    if (!response.ok) throw apiError(response, body);
    response.apiBody = body; return response;
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      const t = new Error("انتهت مهلة الاتصال بالخادم"); t.code = "TIMEOUT"; throw t;
    }
    throw error;
  } finally { clearTimeout(timeout); }
}
function apiErrorMessage(error, fallback = "تعذر الاتصال بالخادم.") {
  if (error?.status === 401) return "يرجى تسجيل الدخول أولاً.";
  if (error?.status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
  if (error?.status === 429) return "محاولات كثيرة. يرجى الانتظار ثم المحاولة مجدداً.";
  if (error?.code === "TIMEOUT") return "استغرق الخادم وقتاً طويلاً. حاول مجدداً.";
  return error?.body?.message || error?.message || fallback;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function safeImageUrl(value, fallback = "") {
  try {
    const s = String(value || "").trim();
    if (!s) return fallback;
    const url = new URL(s, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch { return fallback; }
}
function logoImg(cls = "w-11 h-11 drop-shadow") {
  return `<img src="${SITE.logo}" onerror="this.onerror=null;this.src='${SITE.logoFallback}'" alt="شعار ${SITE.name}" class="${cls}" loading="eager" decoding="async"/>`;
}

/* ---------- wishlist (local) ---------- */
const WISH_KEY = "souq_wishlist_v1";
function getWishlist() { try { return JSON.parse(localStorage.getItem(WISH_KEY) || "[]"); } catch { return []; } }
function isWished(id) { return getWishlist().includes(String(id)); }
function toggleWish(id) {
  const sid = String(id); let list = getWishlist();
  list = list.includes(sid) ? list.filter(x => x !== sid) : [...list, sid];
  try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch {}
  document.querySelectorAll(`[data-wish="${CSS.escape(sid)}"]`).forEach(b => {
    const on = list.includes(sid);
    b.classList.toggle("wished", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-label", on ? "إزالة من المفضلة" : "إضافة للمفضلة");
  });
  return list.includes(sid);
}

/* ---------- shared header/footer ---------- */
const NAV = [
  { href: "index.html", key: "index", label: "الرئيسية" },
  { href: "shop.html", key: "shop", label: "تسوق" },
  { href: "about.html", key: "about", label: "عنا" },
  { href: "contact.html", key: "contact", label: "تواصل معنا" },
];
function headerHTML(active = "", opts = {}) {
  const links = NAV.map(n => {
    const on = active === n.key;
    return `<li><a href="${n.href}" data-page="${n.href}" class="nav-link ${on ? "active-link" : ""}" ${on ? 'aria-current="page"' : ""}>${n.label}</a></li>`;
  }).join("");
  const search = opts.search ? `
    <div class="flex flex-1 mx-3 md:mx-6 min-w-0">
      <div class="relative w-full">
        <input id="searchInput" type="search" placeholder="ابحث عن منتجات…" aria-label="بحث عن منتجات" class="input-style !py-2">
        <button id="searchBtn" aria-label="بحث" class="absolute left-1 top-1/2 -translate-y-1/2 icon-btn !w-9 !h-9"><i class="fas fa-search text-sm"></i></button>
      </div>
    </div>` : "";
  return `
  <a class="skip-link" href="#main">تخطَّ إلى المحتوى</a>
  <header class="site-header">
    <div class="container px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <a id="logoLink" href="index.html" data-page="index.html" class="flex items-center gap-2 min-w-0" aria-label="سوق.كوم — الرئيسية">
          ${logoImg()}<span class="logo-gradient">سوق.كوم</span>
        </a>
        ${search}
        <div class="flex items-center gap-2">
          <a href="#" id="userIconWrap" class="icon-btn" aria-label="الحساب"><i class="fas fa-user"></i></a>
          <span id="cartSlot" class="inline-flex"></span>
          <button id="navToggle" class="icon-btn md:hidden" aria-label="فتح القائمة" aria-expanded="false" aria-controls="mobileNav"><i class="fas fa-bars"></i></button>
        </div>
      </div>
      <nav class="mt-3 hidden md:block" aria-label="التنقل الرئيسي">
        <ul class="flex gap-7 justify-center text-[1.05rem] font-medium">${links}</ul>
      </nav>
      <nav id="mobileNav" class="md:hidden hidden mt-3 border-t border-slate-100 pt-3" aria-label="قائمة الجوال">
        <ul class="grid gap-1 text-lg font-medium">${NAV.map(n => `<li><a href="${n.href}" data-page="${n.href}" class="block px-3 py-2 rounded-lg hover:bg-blue-50 ${active === n.key ? "text-blue-700 bg-blue-50 font-bold" : "text-slate-700"}">${n.label}</a></li>`).join("")}</ul>
      </nav>
    </div>
  </header>`;
}
function footerHTML(active = "") {
  const q = (href, key, label) => `<li><a href="${href}" data-page="${href}" class="${active === key ? "footer-active" : "text-blue-100/90 hover:text-white"}">${label}</a></li>`;
  return `
  <footer class="bg-gradient-to-br from-blue-950 via-blue-800 to-indigo-700 text-white pt-12 pb-6 mt-12 rounded-t-3xl">
    <div class="container px-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div class="flex items-center gap-2 mb-3">${logoImg("w-10 h-10")}<span class="text-2xl font-extrabold font-head">سوق.كوم</span></div>
          <p class="text-blue-100/85 leading-8">متجر ليبي متخصص في الشنط والإكسسوارات والساعات الأصلية — جودة مضمونة وتوصيل سريع.</p>
          <p class="mt-3 text-sm text-blue-100/70"><i class="fas fa-location-dot ml-1"></i> طرابلس، ليبيا &nbsp;·&nbsp; <span dir="ltr">+218916773527</span></p>
        </div>
        <div>
          <h3 class="text-lg font-bold mb-4 font-head">تسوق</h3>
          <ul class="space-y-2">${q("index.html", "index", "الرئيسية")}${q("shop.html", "shop", "كل المنتجات")}${q("about.html", "about", "من نحن")}${q("contact.html", "contact", "تواصل معنا")}</ul>
        </div>
        <div>
          <h3 class="text-lg font-bold mb-4 font-head">حسابك</h3>
          <ul class="space-y-2">
            <li><a href="orders.html" class="text-blue-100/90 hover:text-white">طلباتي</a></li>
            <li><a href="settings.html" class="text-blue-100/90 hover:text-white">إعدادات الحساب</a></li>
            <li><a href="signup.html" class="text-blue-100/90 hover:text-white">إنشاء حساب</a></li>
            <li><button class="privacy-link text-blue-100/90 hover:text-white">سياسة الخصوصية</button></li>
            <li><button class="terms-link text-blue-100/90 hover:text-white">شروط الاستخدام</button></li>
          </ul>
        </div>
        <div>
          <h3 class="text-lg font-bold mb-4 font-head">تابعنا</h3>
          <div class="flex gap-2 mb-4">
            <a href="https://www.facebook.com/share/1CEyEf8f9P/?mibextid=wwXIfr" target="_blank" rel="noopener" aria-label="فيسبوك" class="icon-btn !bg-white/10 !border-white/20 !text-white hover:!bg-white hover:!text-blue-700"><i class="fab fa-facebook-f"></i></a>
            <a href="https://www.instagram.com/souqdotcom0" target="_blank" rel="noopener" aria-label="انستغرام" class="icon-btn !bg-white/10 !border-white/20 !text-white hover:!bg-white hover:!text-pink-600"><i class="fab fa-instagram"></i></a>
            <a href="https://www.tiktok.com/@souqdotcom" target="_blank" rel="noopener" aria-label="تيك توك" class="icon-btn !bg-white/10 !border-white/20 !text-white hover:!bg-white hover:!text-slate-900"><i class="fab fa-tiktok"></i></a>
          </div>
          <form id="nlForm" class="flex gap-2">
            <label class="sr-only" for="nlEmail">البريد للنشرة</label>
            <input id="nlEmail" type="email" required placeholder="بريدك للعروض" class="input-style !py-2 !bg-white/10 !border-white/20 !text-white placeholder:text-blue-100/60">
            <button class="primary-btn !bg-white !text-blue-800 px-4 rounded-[.7rem]" aria-label="اشتراك">اشترك</button>
          </form>
        </div>
      </div>
      <div class="border-t border-white/15 mt-8 pt-5 flex flex-col md:flex-row gap-2 items-center justify-between text-blue-100/70 text-sm">
        <p>© <span id="year">${new Date().getFullYear()}</span> سوق.كوم — جميع الحقوق محفوظة.</p>
        <p class="flex gap-3"><button class="privacy-link hover:text-white">الخصوصية</button>·<button class="terms-link hover:text-white">الشروط</button>·<a href="contact.html" class="hover:text-white">الدعم</a></p>
      </div>
    </div>
  </footer>`;
}
function legalModalsHTML() {
  return `
  <div id="privacyModal" class="fixed inset-0 z-[90] hidden items-center justify-center modal-overlay p-4" role="dialog" aria-modal="true" aria-labelledby="privacyTitle">
    <div class="legal-dialog">
      <div class="flex items-center justify-between p-5 border-b">
        <h3 id="privacyTitle" class="text-xl font-extrabold font-head">سياسة الخصوصية</h3>
        <button data-close-legal class="icon-btn" aria-label="إغلاق"><i class="fas fa-times"></i></button>
      </div>
      <div class="legal-body">
        <p>نحن في <strong>سوق.كوم</strong> نحمي خصوصيتك. باستخدامك الموقع فأنت توافق على ما يلي:</p>
        <h4>1. المعلومات التي نجمعها</h4>
        <ul><li>البريد الإلكتروني والاسم عند التسجيل أو الشراء.</li><li>عنوان التوصيل ورقم الهاتف لإتمام الطلب.</li></ul>
        <h4>2. كيف نستخدمها</h4>
        <ul><li>تشغيل الطلبات وتحسين تجربة التسوق.</li><li>مراسلتك بشأن طلبك أو تحديثات مهمة فقط.</li></ul>
        <h4>3. المشاركة</h4>
        <ul><li>لا نبيع بياناتك. نشاركها فقط مع الشحن/الدفع لإتمام طلبك.</li></ul>
        <h4>4. الحماية والتعديلات</h4>
        <ul><li>تدابير أمنية ضد الوصول غير المصرح به.</li><li>أي تحديث يُنشر في هذه الصفحة.</li></ul>
      </div>
    </div>
  </div>
  <div id="termsModal" class="fixed inset-0 z-[90] hidden items-center justify-center modal-overlay p-4" role="dialog" aria-modal="true" aria-labelledby="termsTitle">
    <div class="legal-dialog">
      <div class="flex items-center justify-between p-5 border-b">
        <h3 id="termsTitle" class="text-xl font-extrabold font-head">شروط الاستخدام</h3>
        <button data-close-legal class="icon-btn" aria-label="إغلاق"><i class="fas fa-times"></i></button>
      </div>
      <div class="legal-body">
        <p>باستخدامك <strong>سوق.كوم</strong> فأنت توافق على:</p>
        <h4>1. الاستخدام</h4>
        <ul><li>18 سنة أو بإشراف ولي أمر، وللأغراض القانونية فقط.</li></ul>
        <h4>2. المنتجات والأسعار</h4>
        <ul><li>التوافر والأسعار قد تتغير دون إشعار.</li><li>الصور تقريبية وقد تختلف قليلاً عن الواقع.</li></ul>
        <h4>3. الدفع والشحن</h4>
        <ul><li>الالتزام بدفع كامل التكلفة عند تأكيد الطلب.</li><li>لا نتحمل تأخير شركات الشحن أو الظروف الطارئة.</li></ul>
        <h4>4. الملكية والتعديلات</h4>
        <ul><li>المحتوى ملك سوق.كوم ولا يجوز نسخه دون إذن.</li><li>يحق لنا تعديل الشروط ونشرها هنا.</li></ul>
      </div>
    </div>
  </div>`;
}

/* ---------- shell wiring ---------- */
function lockScroll(on) { document.documentElement.style.overflow = on ? "hidden" : ""; }
function openLegal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.remove("hidden"); m.classList.add("flex"); lockScroll(true);
  m.querySelector("[data-close-legal]")?.focus();
}
function closeLegals() {
  ["privacyModal", "termsModal"].forEach(id => {
    const m = document.getElementById(id); if (!m) return;
    m.classList.add("hidden"); m.classList.remove("flex");
  });
  if (document.getElementById("productModal")?.classList.contains("hidden")) lockScroll(false);
}
window.closePrivacy = () => closeLegals();
window.closeTerms = () => closeLegals();

function setupPageLinks() {
  document.querySelectorAll("[data-page]").forEach(link => {
    if (link.dataset.bound) return; link.dataset.bound = "1";
    link.addEventListener("click", event => { event.preventDefault(); window.location.href = link.getAttribute("data-page"); });
  });
}
function setupPrivacyTerms() {
  document.querySelectorAll(".privacy-link").forEach(l => {
    if (l.dataset.bound) return; l.dataset.bound = "1";
    l.addEventListener("click", e => { e.preventDefault(); openLegal("privacyModal"); });
  });
  document.querySelectorAll(".terms-link").forEach(l => {
    if (l.dataset.bound) return; l.dataset.bound = "1";
    l.addEventListener("click", e => { e.preventDefault(); openLegal("termsModal"); });
  });
  document.querySelectorAll("[data-close-legal]").forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = "1";
    b.addEventListener("click", closeLegals);
  });
  ["privacyModal", "termsModal"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", e => { if (e.target.id === id) closeLegals(); });
  });
}
function setupMobileNav() {
  const btn = document.getElementById("navToggle"), nav = document.getElementById("mobileNav");
  btn?.addEventListener("click", () => {
    const open = nav.classList.toggle("hidden");
    btn.setAttribute("aria-expanded", String(!open));
  });
}
function setupNewsletter() {
  document.getElementById("nlForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const em = document.getElementById("nlEmail");
    siteToast(`شكراً! تم تسجيل ${em.value} في النشرة.`);
    em.value = "";
  });
}
function renderSharedShell(active = "", opts = {}) {
  const html = document.documentElement;
  if (!document.getElementById("site-header")) {
    const old = document.querySelector("header.site-legacy, header");
    const tpl = document.createElement("template"); tpl.innerHTML = headerHTML(active, opts).trim();
    if (old) old.replaceWith(tpl.content.cloneNode(true));
    else document.body.prepend(Object.assign(document.createElement("div"), { id: "site-header" })), document.getElementById("site-header").innerHTML = headerHTML(active, opts);
  } else document.getElementById("site-header").innerHTML = headerHTML(active, opts);
  if (!document.getElementById("site-footer")) {
    const oldF = document.querySelector("footer");
    const t2 = document.createElement("template"); t2.innerHTML = footerHTML(active).trim();
    if (oldF) oldF.replaceWith(t2.content.cloneNode(true));
    else document.body.appendChild(Object.assign(document.createElement("div"), { id: "site-footer" })), document.getElementById("site-footer").innerHTML = footerHTML(active);
  } else document.getElementById("site-footer").innerHTML = footerHTML(active);
  if (!document.getElementById("privacyModal")) document.body.insertAdjacentHTML("beforeend", legalModalsHTML());
  setupPageLinks(); setupPrivacyTerms(); setupMobileNav(); setupNewsletter();
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeLegals(); }, { once: true });
}
function siteToast(message) {
  let wrap = document.getElementById("site-toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.id = "site-toast-wrap"; wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
  const t = document.createElement("div"); t.className = "site-toast"; t.textContent = String(message);
  wrap.appendChild(t); setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2600);
}
function initAOS() {
  if (window.AOS) { try { AOS.init({ once: true, duration: 600, offset: 40 }); } catch {} }
}
function setupCommon() { setupPageLinks(); setupPrivacyTerms(); }
function setupSearchBox() {}
function updateCategoryHighlight() {}
function setupLoginModal() {}

Object.assign(window, {
  apiUrl, apiFetch, readApiBody, apiErrorMessage, escapeHtml, safeImageUrl, getCsrfToken,
  setupCommon, setupPageLinks, setupPrivacyTerms, updateCategoryHighlight,
  renderSharedShell, headerHTML, footerHTML, siteToast, toggleWish, isWished, getWishlist, initAOS, openLegal, closeLegals, SITE,
});
