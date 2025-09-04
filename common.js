// دالة تنقل الصفحة عند الضغط على الروابط
function setupPageLinks() {
    // الهيدر
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', function(e){
            e.preventDefault();
            window.location.href = this.getAttribute('data-page');
        });
    });
    // الشعار (اللوجو)
    const logo = document.getElementById('logoLink');
    if (logo) {
        logo.addEventListener('click', function(e){
            e.preventDefault();
            window.location.href = "Index.html";
        });
    }
    // روابط الفوتر
    document.querySelectorAll('footer [data-page]').forEach(link => {
        link.addEventListener('click', function(e){
            e.preventDefault();
            window.location.href = this.getAttribute('data-page');
        });
    });
}

// البحث
function setupSearchBox(filterAndRenderProducts) {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    if (searchBtn && searchInput) {
        searchBtn.onclick = function(e){
            e.preventDefault();
            window.searchTerm = searchInput.value.trim();
            filterAndRenderProducts();
        };
        searchInput.addEventListener("keyup", function(e){
            if (e.key === "Enter") {
                window.searchTerm = searchInput.value.trim();
                filterAndRenderProducts();
            }
        });
    }
}

// إبراز الكاتاغوري
function updateCategoryHighlight() {
    const cats = document.querySelectorAll('#categoryFilters button');
    cats.forEach(btn => {
        if(btn.textContent === window.filteredCategory) {
            btn.classList.remove('bg-gray-100', 'text-gray-700');
            btn.classList.add('bg-blue-100', 'text-blue-700');
        } else {
            btn.classList.add('bg-gray-100', 'text-gray-700');
            btn.classList.remove('bg-blue-100', 'text-blue-700');
        }
    });
}

// سياسة الخصوصية وشروط الاستخدام
function setupPrivacyTerms() {
    document.querySelectorAll('.privacy-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('privacyModal').classList.remove('hidden');
        });
    });
    window.closePrivacy = function() {
        document.getElementById('privacyModal').classList.add('hidden');
    }
    document.querySelectorAll('.terms-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('termsModal').classList.remove('hidden');
        });
    });
    window.closeTerms = function() {
        document.getElementById('termsModal').classList.add('hidden');
    }
}

// نافذة تسجيل الدخول
function setupLoginModal() {
    document.querySelectorAll('.fa-user').forEach(icon => {
        icon.parentElement.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    });
    window.openModal = function() {
        document.getElementById('loginModal').classList.remove('hidden');
    }
    window.closeModal = function() {
        document.getElementById('loginModal').classList.add('hidden');
    }
}

// استدعاء كل الدوال المشتركة
function setupCommon(filterAndRenderProducts) {
    setupPageLinks();
    setupSearchBox(filterAndRenderProducts);
    setupPrivacyTerms();
    setupLoginModal();
}

window.setupCommon = setupCommon;
window.updateCategoryHighlight = updateCategoryHighlight;