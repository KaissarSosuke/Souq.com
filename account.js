// account.js — النسخة المعدلة مع دعم زر الأدمن
// ------------------------------------------------------------

const loginModalHTML = `
<div id="loginModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
  <div class="bg-white rounded-lg p-8 w-full max-w-md">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-2xl font-bold text-gray-800">تسجيل الدخول</h3>
      <button id="closeLoginModalBtn" class="text-gray-500 hover:text-gray-700">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <form id="loginForm">
      <div class="mb-4">
        <label for="loginEmail" class="block text-gray-700 mb-2">البريد الإلكتروني</label>
        <input type="email" id="loginEmail" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>
      <div class="mb-6">
        <label for="loginPassword" class="block text-gray-700 mb-2">كلمة المرور</label>
        <input type="password" id="loginPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>
      <div id="loginError" class="text-red-600 text-center mb-2 hidden"></div>
      <div id="loginSuccess" class="text-green-600 text-center mb-2 hidden"></div>
      <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-300">تسجيل الدخول</button>
    </form>
    <div class="mt-4 text-center">
      <p class="text-gray-600">ليس لديك حساب؟
        <a href="signUp.html" class="text-blue-600 hover:underline">إنشاء حساب</a>
      </p>
    </div>
  </div>
</div>
`;

let isAuthenticated = false;
let userIconWrapper = null;
let dropdownEl = null;
let isAdmin = false;

function openLoginModal() {
  document.getElementById("loginModal").classList.remove("hidden");
}
function closeLoginModal() {
  document.getElementById("loginModal").classList.add("hidden");
  document.getElementById("loginError")?.classList.add("hidden");
  document.getElementById("loginSuccess")?.classList.add("hidden");
}

// القائمة المنسدلة
function buildDropdownIfNeeded() {
  if (dropdownEl || !userIconWrapper) return;
  userIconWrapper.classList.add("relative");
  let html = `
  <div id="accountDropdown"
       class="absolute left-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border hidden z-50"
       style="transform: translateX(40px);">
    <button id="btnAccountSettings" class="w-full text-right px-4 py-2 hover:bg-gray-100">إعدادات الحساب</button>
    <button id="btnMyOrders" class="w-full text-right px-4 py-2 hover:bg-gray-100">طلباتي</button>
    <div id="adminPanelBtnWrapper"></div>
    <button id="logoutBtn" class="w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100">تسجيل الخروج</button>
  </div>
`;
  userIconWrapper.insertAdjacentHTML("beforeend", html);
  dropdownEl = document.getElementById("accountDropdown");
  document.getElementById("logoutBtn")?.addEventListener("click", logoutHandler);

  document.getElementById("btnAccountSettings")?.addEventListener("click", () => {
    window.location.href = "settings.html";
  });
  document.getElementById("btnMyOrders")?.addEventListener("click", () => {
    window.location.href = "orders.html";
  });

  // زر الأدمن
  if (isAdmin) {
    showAdminPanelBtn();
  }
}
function showAdminPanelBtn() {
  const wrapper = document.getElementById("adminPanelBtnWrapper");
  if (wrapper && !document.getElementById("btnAdminPanel")) {
    wrapper.innerHTML = `<button id="btnAdminPanel" class="w-full text-right px-4 py-2 text-blue-700 font-bold hover:bg-blue-50 flex items-center gap-2"><i class="fa fa-shield-halved"></i> لوحة الإدارة</button>`;
    document.getElementById("btnAdminPanel").addEventListener("click", () => {
      window.location.href = "admin.html";
    });
  }
}
function removeAdminPanelBtn() {
  const wrapper = document.getElementById("adminPanelBtnWrapper");
  if (wrapper) wrapper.innerHTML = "";
}
function toggleDropdown() {
  if (!dropdownEl) buildDropdownIfNeeded();
  dropdownEl?.classList.toggle("hidden");
}
function hideDropdown() {
  if (dropdownEl && !dropdownEl.classList.contains("hidden")) {
    dropdownEl.classList.add("hidden");
  }
}

// تسجيل الدخول
async function loginHandler(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) return showLoginError("يرجى إدخال البريد الإلكتروني وكلمة المرور");

  try {
    await apiFetch("/api/signin", {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    isAuthenticated = true;
    showLoginSuccess("تم تسجيل دخولك بنجاح");
    setTimeout(async () => {
      closeLoginModal();
      hideDropdown();
      dropdownEl = null;
      buildDropdownIfNeeded();
      setUserIconLoggedIn();
      await checkIfAdmin();
      if (isAdmin) showAdminPanelBtn();
      else removeAdminPanelBtn();
    }, 1000);
  } catch (err) {
    showLoginError(apiErrorMessage(err, "حدث خطأ أثناء تسجيل الدخول"));
  }
}
function showLoginError(msg) {
  document.getElementById('loginError').textContent = msg;
  document.getElementById('loginError').classList.remove('hidden');
  document.getElementById('loginSuccess').classList.add('hidden');
}
function showLoginSuccess(msg) {
  document.getElementById('loginSuccess').textContent = msg;
  document.getElementById('loginSuccess').classList.remove('hidden');
  document.getElementById('loginError').classList.add('hidden');
}

// الأيقونات
function setUserIconLoggedIn() {
  const iconEl = document.querySelector('.fa-user');
  if (iconEl) {
    if (iconEl.dataset.loggedIn === "1") return;
    iconEl.dataset.loggedIn = "1";
    iconEl.classList.remove('fa-user');
    iconEl.innerHTML = '';
    const img = document.createElement('img');
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png';
    img.alt = 'صورة المستخدم';
    img.style.width = '32px';
    img.style.height = '32px';
    img.style.borderRadius = '50%';
    img.classList.add('user-icon-img');
    iconEl.appendChild(img);
  }
}
function restoreUserIconDefault() {
  const iconEl = document.querySelector('[data-logged-in="1"]');
  const img = document.querySelector('.user-icon-img');
  if (img) img.remove();
  if (iconEl) {
    delete iconEl.dataset.loggedIn;
    iconEl.classList.add('fa-user');
    if (!iconEl.querySelector('i,img,svg')) {
      const i = document.createElement('i');
      i.className = 'fas fa-user text-2xl';
      // حافظ على حجم الأيقونة الأصلية إن وجد
      iconEl.appendChild(i);
    }
  } else if (img) {
    const parent = img.parentElement;
    img.remove();
    if (parent) {
      const i = document.createElement('i');
      i.className = 'fas fa-user text-2xl';
      parent.appendChild(i);
    }
  }
}

// تسجيل الخروج
async function logoutHandler() {
  try {
    await apiFetch("/api/logout", {
      method: 'POST'
    });
  } catch {}
  isAuthenticated = false;
  isAdmin = false;
  restoreUserIconDefault();
  hideDropdown();
  dropdownEl = null;
  removeAdminPanelBtn();
  window.location.href = "Index.html";
}

// فحص حالة تسجيل الدخول عند التحميل
async function checkLoginStatus() {
  try {
    await apiFetch("/api/profile", {
      method: 'GET'
    });
    isAuthenticated = true;
    closeLoginModal();
    buildDropdownIfNeeded();
    setUserIconLoggedIn();
    await checkIfAdmin();
    if (isAdmin) showAdminPanelBtn();
    else removeAdminPanelBtn();
    return true;
  } catch (err) {
    if (err && err.status !== 401) {
      // خطأ شبكة - حافظ على الحالة الحالية
      return isAuthenticated;
    }
    isAuthenticated = false;
    isAdmin = false;
    restoreUserIconDefault();
    removeAdminPanelBtn();
    return false;
  }
}

// فحص هل المستخدم أدمن
async function checkIfAdmin() {
  try {
    await apiFetch("/api/admin/me");
    isAdmin = true;
  } catch {
    isAdmin = false;
  }
}


// بدء التشغيل
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', loginModalHTML);
  document.getElementById('closeLoginModalBtn')?.addEventListener('click', closeLoginModal);
  document.getElementById('loginForm')?.addEventListener('submit', loginHandler);
  const iconEl = document.querySelector('.fa-user');
  userIconWrapper = iconEl ? iconEl.parentElement : null;
  if (userIconWrapper) {
    userIconWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isAuthenticated) toggleDropdown();
      else openLoginModal();
    });
  }
  document.addEventListener('click', (e) => {
    if (isAuthenticated && dropdownEl && !dropdownEl.classList.contains("hidden")) {
      if (!dropdownEl.contains(e.target) && !userIconWrapper.contains(e.target)) {
        hideDropdown();
      }
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === "Escape") { hideDropdown(); closeLoginModal(); }});
  checkLoginStatus();
});