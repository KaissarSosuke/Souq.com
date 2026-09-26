// cart.js — نسخة متوافقة مع الباك اند مع زر شراء الآن

const cartModalHTML = `
<a href="#" id="cartBtn" class="icon-btn relative" aria-label="سلة التسوق">
    <i class="fas fa-shopping-cart"></i>
    <span id="cartCount" class="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">0</span>
</a>
<div id="cartModal" class="fixed inset-0 modal-overlay hidden items-center justify-center z-[80] p-4" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl max-h-[88vh] overflow-y-auto">
        <button id="closeCartBtn" class="icon-btn absolute left-4 top-4" aria-label="إغلاق السلة">
            <i class="fas fa-times"></i>
        </button>
        <h3 id="cartTitle" class="text-2xl font-extrabold font-head mb-4 text-center">سلة التسوق</h3>
        <div id="cartItems"></div>
        <div id="cartEmpty" class="text-center text-gray-500 my-6">السلة فارغة.</div>
        <div id="cartTotal" class="mt-6 font-bold text-blue-600 text-center"></div>
        <button id="checkoutBtn" class="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition" style="display:none">
             شراء الآن
        </button>
        <button id="closeCartBtnFooter" class="mt-3 w-full primary-btn py-3 rounded-xl">إغلاق</button>
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
    const modal = document.getElementById('cartModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    document.documentElement.style.overflow = "hidden";
}

function closeCart() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    modal.classList.add('hidden'); modal.classList.remove('flex');
    document.documentElement.style.overflow = "";
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

// عند تحميل الصفحة: إضافة الزر والمودال وربط الأحداث (متوافق مع الهيدر الزجاجي)
document.addEventListener('DOMContentLoaded', async function() {
    const mountCartUI = () => {
        // زر السلة → فتحة الهيدر الجديد أو الهيدر القديم
        const slot = document.getElementById("cartSlot");
        const iconsDiv = document.querySelector("header .flex.items-center.space-x-4, header .flex.items-center.space-x-4.space-x-reverse");
        const tpl = document.createElement("template");
        tpl.innerHTML = cartModalHTML;
        const btnNode = tpl.content.querySelector("#cartBtn");
        const modalNode = tpl.content.querySelector("#cartModal");
        if (slot && btnNode && !document.getElementById("cartBtn")) {
            slot.appendChild(btnNode);
        } else if (iconsDiv && btnNode && !document.getElementById("cartBtn")) {
            iconsDiv.appendChild(btnNode);
        }
        if (modalNode && !document.getElementById("cartModal")) {
            document.body.appendChild(modalNode);
        }
        return !!document.getElementById("cartBtn");
    };
    mountCartUI();
    setTimeout(mountCartUI, 400); // بعد بناء الهيدر المشترك
    setTimeout(mountCartUI, 1500);
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