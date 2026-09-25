// Cart.js — نسخة متوافقة مع الباك اند مع زر شراء الآن

const cartModalHTML = `
<!-- زر السلة في الهيدر -->
<a href="#" id="cartBtn" class="text-gray-700 hover:text-blue-600 relative">
    <i class="fas fa-shopping-cart text-xl"></i>
    <span id="cartCount" class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
</a>
<!-- نافذة السلة -->
<div id="cartModal" class="fixed inset-0 modal-overlay flex items-center justify-center z-50 hidden">
    <div class="bg-white rounded-lg p-8 w-full max-w-md relative">
        <button id="closeCartBtn" class="absolute left-4 top-4 text-gray-500 hover:text-gray-700 text-xl">
            <i class="fas fa-times"></i>
        </button>
        <h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">سلة التسوق</h3>
        <div id="cartItems"></div>
        <div id="cartEmpty" class="text-center text-gray-500 my-6">السلة فارغة.</div>
        <div id="cartTotal" class="mt-6 font-bold text-blue-600 text-center"></div>
        <button id="checkoutBtn" class="mt-6 w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition duration-300" style="display:none">
             شراء الآن
        </button>
        <button id="closeCartBtnFooter" class="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-300">إغلاق</button>
    </div>
</div>
`;

function showToast({ message, type = "success", duration = 2200 }) {
    let toast = document.createElement("div");
    toast.className = `
        fixed z-[9999] right-6 bottom-10 min-w-[250px] flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg transition-all
        ${type === "success" ? "bg-green-500 text-white" : ""}
        ${type === "error" ? "bg-red-500 text-white" : ""}
        ${type === "info" ? "bg-blue-500 text-white" : ""}
        ${type === "warning" ? "bg-yellow-500 text-gray-900" : ""}
        toast-custom-animation
    `;
    toast.innerHTML = `
        <span class="text-2xl">
            ${
                type === "success" ? '<i class="fas fa-check-circle"></i>' :
                type === "error"   ? '<i class="fas fa-times-circle"></i>' :
                type === "info"    ? '<i class="fas fa-info-circle"></i>' :
                type === "warning" ? '<i class="fas fa-exclamation-triangle"></i>' : ""
            }
        </span>
        <span class="text-lg font-medium">${escapeHtml(message)}</span>
    `;
    toast.style.opacity = "0";
    toast.style.transform = "translateY(30px) scale(0.98)";
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0) scale(1)";
    }, 30);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(30px) scale(0.98)";
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

let userCart = [];

async function fetchCart() {
    try {
        const res = await apiFetch("/api/user-cart/me");
        const body = res.apiBody || await readApiBody(res);
        if (!Array.isArray(body.items)) throw new Error("استجابة السلة غير صالحة");
        userCart = body.items;
        updateCartCount();
    } catch (err) {
        if (err.status === 401) {
            userCart = [];
            updateCartCount();
            return;
        }
        userCart = [];
        updateCartCount();
    }
}

function updateCartCount() {
    const cartCountElem = document.getElementById('cartCount');
    if (cartCountElem) {
        cartCountElem.textContent = userCart.reduce((acc, p) => acc + (Number(p.qty) || 0), 0);
    }
}

function showCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (!cartItemsDiv || !cartEmpty || !cartTotal || !checkoutBtn) return;
    cartItemsDiv.replaceChildren();
    if(userCart.length === 0) {
        cartEmpty.style.display = 'block';
        cartTotal.textContent = '';
        checkoutBtn.style.display = "none";
    } else {
        cartEmpty.style.display = 'none';
        let total = 0;
        userCart.forEach(item => {
            total += (Number(item.price) || 0) * (Number(item.qty) || 0);
            const row = document.createElement("div");
            row.className = "flex items-center justify-between border-b py-3";
            const image = document.createElement("img");
            image.src = safeImageUrl(item.images?.[0]); image.alt = String(item.name || "");
            image.className = "w-14 h-14 object-cover rounded";
            const details = document.createElement("div");
            details.innerHTML = `<div class="font-bold text-gray-800"></div><div class="text-blue-600 font-bold"></div>`;
            details.firstElementChild.textContent = item.name || "";
            details.lastElementChild.textContent = `${escapeHtml(String(item.price || 0))} د.ل × ${escapeHtml(String(item.qty || 0))}`;
            const left = document.createElement("div"); left.className = "flex items-center gap-3";
            left.append(image, details);
            const remove = document.createElement("button");
            remove.className = "text-red-600 hover:underline"; remove.textContent = "حذف";
            remove.dataset.productId = item.productId;
            row.append(left, remove); cartItemsDiv.appendChild(row);
        });
        cartTotal.textContent = `الإجمالي: ${total} د.ل`;
        checkoutBtn.style.display = "block";
    }
    document.getElementById('cartModal').classList.remove('hidden');
}

function closeCart() {
    document.getElementById('cartModal').classList.add('hidden');
}

async function addToCart(productId, qty=1) {
    try {
    await apiFetch("/api/profile");
    } catch (err) {
        showToast({message: "يجب تسجيل الدخول لإضافة منتجات للسلة.", type: "error"});
        return;
    }
    qty = Math.max(1, parseInt(qty) || 1);

    let productData = null;
    try {
        const res = await apiFetch("/api/products?limit=100");
        const body = res.apiBody;
        const products = Array.isArray(body) ? body : (body?.data || body?.products || []);
        productData = products.find(p => p._id === productId || p.id === productId);
    } catch {}
    if (!productData) {
        showToast({message: "تعذر جلب بيانات المنتج.", type: "error"});
        return;
    }

    let existing = userCart.find(i => (i.productId == productId || i.productId == productData._id));
    let totalWanted = qty + (existing ? parseInt(existing.qty) : 0);
    if (totalWanted > productData.stock) {
        showToast({message: `لا يمكن إضافة أكثر من ${productData.stock} قطعة من هذا المنتج للسلة.`, type: "error"});
        return;
    }

    try {
        const res = await apiFetch("/api/user-cart/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ productId, qty })
        });
        const result = res.apiBody || {};
        if (res.ok && result.success) {
            await fetchCart();
            showToast({message: "تم إضافة المنتج للسلة بنجاح!", type: "success"});
        } else {
            showToast({message: result.message || "تعذر إضافة المنتج للسلة.", type: "error"});
        }
    } catch (err) {
        showToast({message: "تعذر الاتصال بالخادم.", type: "error"});
    }
}

async function removeFromCart(productId) {
    try {
        const res = await apiFetch("/api/user-cart/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ productId })
        });
        const result = res.apiBody || {};
        if (res.ok && result.success) {
            await fetchCart();
            showCart();
            showToast({message: "تم حذف المنتج من السلة.", type: "success"});
        } else {
            showToast({message: "تعذر حذف المنتج من السلة.", type: "error"});
        }
    } catch (err) {
        showToast({message: "تعذر الاتصال بالخادم.", type: "error"});
    }
}

async function clearCart() {
    try {
        const res = await apiFetch("/api/user-cart/clear", {
            method: "POST",
            credentials: "include"
        });
        const result = res.apiBody || {};
        if (res.ok && result.success) {
            await fetchCart();
            showCart();
            showToast({message: "تم مسح السلة بنجاح.", type: "success"});
        } else {
            showToast({message: "تعذر مسح السلة.", type: "error"});
        }
    } catch (err) {
        showToast({message: "تعذر الاتصال بالخادم.", type: "error"});
    }
}

// عند تحميل الصفحة: إضافة الزر والمودال وربط الأحداث
document.addEventListener('DOMContentLoaded', async function() {
    const iconsDiv = document.querySelector("header .flex.items-center.space-x-4, header .flex.items-center.space-x-4.space-x-reverse");
    if (iconsDiv) {
        const oldCartBtn = iconsDiv.querySelector("#cartBtn");
        if (oldCartBtn) oldCartBtn.remove();
        iconsDiv.insertAdjacentHTML('beforeend', cartModalHTML.split('<!-- نافذة السلة -->')[0]);
    }
    const oldModal = document.getElementById("cartModal");
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', cartModalHTML.split('<!-- نافذة السلة -->')[1]);
    await fetchCart();

    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.onclick = function(e) {
            e.preventDefault();
            showCart();
        }
    }
    document.querySelectorAll('#closeCartBtn, #closeCartBtnFooter').forEach(btn => {
        if (btn) {
            btn.onclick = function(e) {
                e.preventDefault();
                closeCart();
            }
        }
    });
    document.getElementById('checkoutBtn').onclick = function(e) {
        e.preventDefault();
        closeCart();
        window.location.href = "payment.html";
    };
    document.getElementById("cartItems")?.addEventListener("click", event => {
        const button = event.target.closest("button[data-product-id]");
        if (button) removeFromCart(button.dataset.productId);
    });

    window.removeFromCart = removeFromCart;
    window.addToCart = addToCart;
    window.clearCart = clearCart;
});

const style = document.createElement("style");
style.innerHTML = `
.toast-custom-animation {
    box-shadow: 0 6px 24px 0 rgba(0,0,0,0.12), 0 1.5px 4px 0 rgba(0,0,0,0.09);
    font-family: Tajawal, sans-serif;
    pointer-events: all;
    cursor: pointer;
    user-select: none;
    transition: all 0.35s cubic-bezier(.4,0,.2,1);
}
`;
document.head.appendChild(style);