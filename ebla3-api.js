// ═══════════════════════════════════════════════════════════════════
//  ebla3-api.js  —  include this in every HTML page
// ═══════════════════════════════════════════════════════════════════
const API = 'http://127.0.0.1:8000/api';

// ── Auth helpers ─────────────────────────────────────────────────────
const Auth = {
    getToken:   () => localStorage.getItem('ebla3_token'),
    getUser:    () => JSON.parse(localStorage.getItem('ebla3_user') || 'null'),
    setTokens:  (access, refresh) => {
        localStorage.setItem('ebla3_token', access);
        localStorage.setItem('ebla3_refresh', refresh);
    },
    setUser:    (u) => localStorage.setItem('ebla3_user', JSON.stringify(u)),
    logout:     () => {
        localStorage.removeItem('ebla3_token');
        localStorage.removeItem('ebla3_refresh');
        localStorage.removeItem('ebla3_user');
    },
    isLoggedIn: () => !!localStorage.getItem('ebla3_token'),
};

// ── Fetch with JWT token ──────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    const res = await fetch(API + path, { headers, ...options });
    if (res.status === 401) { Auth.logout(); throw { detail: 'Session expired. Please sign in again.' }; }
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
}

// ── Fetch WITHOUT token (public endpoints) ────────────────────────────
async function publicFetch(path) {
    const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw await res.json().catch(() => ({}));
    return res.json();
}

// ── API modules ───────────────────────────────────────────────────────
const UserAPI = {
    login:    (username, password) =>
        apiFetch('/token/', { method: 'POST', body: JSON.stringify({ username, password }) }),
    register: (payload) =>
        apiFetch('/users/register/', { method: 'POST', body: JSON.stringify(payload) }),
    profile:  () => apiFetch('/users/profile/'),
};

const MenuAPI = {
    categories: () => publicFetch('/menu/categories/'),
    items: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return publicFetch('/menu/items/' + (q ? '?' + q : ''));
    },
};

const CartAPI = {
    get:    () => apiFetch('/cart/'),
    add:    (menu_item_id, quantity = 1) =>
        apiFetch('/cart/add/', { method: 'POST', body: JSON.stringify({ menu_item_id, quantity }) }),
    update: (item_id, quantity) =>
        apiFetch(`/cart/item/${item_id}/`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
    remove: (item_id) =>
        apiFetch(`/cart/item/${item_id}/`, { method: 'DELETE' }),
    clear:  () => apiFetch('/cart/clear/', { method: 'DELETE' }),
};

const OrderAPI = {
    place: (address, phone, notes = '') =>
        apiFetch('/orders/', { method: 'POST', body: JSON.stringify({ address, phone, notes }) }),
    list:  () => apiFetch('/orders/'),
};

// ── Toast notification ────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    let t = document.getElementById('ebla3-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ebla3-toast'; document.body.appendChild(t); }
    Object.assign(t.style, {
        position:'fixed', bottom:'30px', left:'50%',
        transform:'translateX(-50%) translateY(80px)',
        background: type === 'error' ? '#c0392b' : '#0bb47e',
        color:'#fff', padding:'12px 28px', borderRadius:'50px',
        fontSize:'15px', fontWeight:'600', zIndex:9999,
        transition:'transform 0.3s', fontFamily:'"Playfair Display",serif',
        boxShadow:'0 4px 20px rgba(0,0,0,0.4)', whiteSpace:'nowrap',
    });
    t.textContent = msg;
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; }, 3000);
}

// ── Error message extractor ───────────────────────────────────────────
function getErrorMsg(err) {
    if (!err) return 'Something went wrong.';
    if (typeof err === 'string') return err;
    if (err.detail) return err.detail;
    const vals = Object.values(err);
    if (!vals.length) return 'Something went wrong.';
    return Array.isArray(vals[0]) ? vals[0][0] : String(vals[0]);
}

// ── Shared cart drawer HTML (injected by initCartDrawer) ──────────────
function initCartDrawer() {
    if (document.getElementById('cartDrawer')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <style>
    .cart-drawer{position:fixed;right:0;top:0;bottom:0;width:360px;background:#0c1429;border-left:1px solid #286756;z-index:9000;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);}
    .cart-drawer.open{transform:translateX(0);}
    .cdh{padding:1.5rem;border-bottom:1px solid #286756;display:flex;justify-content:space-between;align-items:center;}
    .cdh h3{color:#0bb47e;font-size:1.3rem;margin:0;}
    .cdc{background:none;border:none;color:#c3d1e2;font-size:1.5rem;cursor:pointer;line-height:1;}
    .cdb{flex:1;overflow-y:auto;padding:1rem 1.5rem;}
    .cem{text-align:center;padding:3rem 0;color:#c3d1e2;}
    .cem .big{font-size:3rem;display:block;margin-bottom:.5rem;}
    .cline{display:flex;align-items:center;gap:.75rem;padding:.85rem 0;border-bottom:1px solid #1a2d47;}
    .cli{flex:1;}.cln{font-size:.9rem;font-weight:600;color:#fff;margin-bottom:.2rem;}.clp{font-size:.8rem;color:#0bb47e;}
    .qc{display:flex;align-items:center;gap:.5rem;}
    .qb{background:#13243A;border:1px solid #286756;color:#fff;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;}
    .qb:hover{border-color:#0bb47e;}
    .qn{min-width:20px;text-align:center;font-weight:700;}
    .cdf{padding:1.5rem;border-top:1px solid #286756;}
    .ctr{display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;margin-bottom:1rem;color:#fff;}
    .ctr span:last-child{color:#0bb47e;}
    .cob{width:100%;padding:.85rem;background:#0bb47e;color:#0F172B;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;font-family:"Playfair Display",serif;}
    .cart-badge{display:none;background:#0bb47e;color:#0F172B;font-size:.7rem;font-weight:800;padding:2px 6px;border-radius:50px;margin-left:4px;vertical-align:middle;}
    /* Auth & Checkout modal */
    .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9500;align-items:center;justify-content:center;}
    .modal-overlay.open{display:flex;}
    .modal-box{background:#0c1429;border:1px solid #286756;border-radius:16px;padding:2.5rem;width:100%;max-width:420px;animation:slideUp .25s ease;}
    @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
    .modal-box h2{color:#0bb47e;font-size:1.8rem;margin-bottom:1.5rem;}
    .mf{margin-bottom:1rem;}
    .mf label{display:block;color:#c3d1e2;font-size:.85rem;margin-bottom:.4rem;}
    .mf input,.mf textarea{width:100%;padding:.7rem 1rem;background:#13243A;border:1px solid #286756;border-radius:8px;color:#fff;font-family:"Playfair Display",serif;font-size:.9rem;outline:none;transition:border-color .2s;}
    .mf input:focus,.mf textarea:focus{border-color:#0bb47e;}
    .mf textarea{min-height:70px;resize:vertical;}
    .modal-actions{display:flex;gap:.75rem;margin-top:1.5rem;}
    .modal-actions button{flex:1;padding:.75rem;border-radius:8px;border:none;cursor:pointer;font-family:"Playfair Display",serif;font-size:1rem;font-weight:600;}
    .mbp{background:#0bb47e;color:#0F172B;}
    .mbg{background:transparent;border:1px solid #286756!important;color:#fff;}
    .merr{color:#e74c3c;font-size:.85rem;margin-top:.5rem;min-height:1.2rem;}
    .mtog{text-align:center;margin-top:1rem;color:#c3d1e2;font-size:.875rem;}
    .mtog a{color:#0bb47e;cursor:pointer;text-decoration:none;}
    #userGreeting{color:#0bb47e;font-size:.9rem;margin-right:6px;}
    .spinner-wrap{grid-column:1/-1;text-align:center;padding:2rem;}
    .spinner{width:36px;height:36px;border:3px solid #1a2d47;border-top-color:#0bb47e;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto;}
    @keyframes spin{to{transform:rotate(360deg)}}
    </style>

    <!-- Cart Drawer -->
    <div class="cart-drawer" id="cartDrawer">
      <div class="cdh"><h3>Your Cart</h3><button class="cdc" onclick="toggleCart()">×</button></div>
      <div class="cdb" id="cartBody"><div class="cem"><span class="big">🛒</span>Your cart is empty</div></div>
      <div class="cdf" id="cartFoot" style="display:none">
        <div class="ctr"><span>Total</span><span id="cartTotal">$0.00</span></div>
        <button class="cob" onclick="openCheckout()">Checkout →</button>
      </div>
    </div>

    <!-- Auth Modal -->
    <div class="modal-overlay" id="authModal">
      <div class="modal-box">
        <h2 id="authTitle">Sign In</h2>
        <div id="regExtras" style="display:none">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
            <div class="mf"><label>First Name</label><input type="text" id="reg_first" placeholder="John"></div>
            <div class="mf"><label>Last Name</label><input type="text" id="reg_last" placeholder="Doe"></div>
          </div>
          <div class="mf"><label>Email</label><input type="email" id="reg_email" placeholder="you@email.com"></div>
        </div>
        <div class="mf"><label>Username</label><input type="text" id="auth_user" placeholder="username"></div>
        <div class="mf"><label>Password</label><input type="password" id="auth_pass" placeholder="••••••••" onkeydown="if(event.key==='Enter')submitAuth()"></div>
        <div class="mf" id="pass2wrap" style="display:none"><label>Confirm Password</label><input type="password" id="auth_pass2" placeholder="••••••••"></div>
        <div class="merr" id="authErr"></div>
        <div class="modal-actions">
          <button class="mbg" onclick="closeAuth()">Cancel</button>
          <button class="mbp" id="authBtn2" onclick="submitAuth()">Sign In</button>
        </div>
        <div class="mtog"><a id="authToggle" onclick="toggleAuthMode()">Don't have an account? Register</a></div>
      </div>
    </div>

    <!-- Checkout Modal -->
    <div class="modal-overlay" id="chkModal">
      <div class="modal-box">
        <h2>Checkout</h2>
        <div class="mf"><label>Delivery Address</label><textarea id="chk_addr" placeholder="123 Main St, Cairo…"></textarea></div>
        <div class="mf"><label>Phone</label><input type="tel" id="chk_phone" placeholder="+20 100 000 0000"></div>
        <div class="mf"><label>Notes (optional)</label><input type="text" id="chk_notes" placeholder="Extra sauce, no onions…"></div>
        <div class="merr" id="chkErr"></div>
        <div class="modal-actions">
          <button class="mbg" onclick="document.getElementById('chkModal').classList.remove('open')">Back</button>
          <button class="mbp" onclick="placeOrder()">Place Order 🎉</button>
        </div>
      </div>
    </div>`);
}

// ── Shared cart logic (used by all pages) ─────────────────────────────
let _cartData = null;
let _isReg = false;

function renderCart(cart) {
    const body  = document.getElementById('cartBody');
    const foot  = document.getElementById('cartFoot');
    const badge = document.getElementById('cart-badge');
    if (!cart?.cart_items?.length) {
        body.innerHTML = '<div class="cem"><span class="big">🛒</span>Your cart is empty</div>';
        foot.style.display = 'none';
        if (badge) { badge.textContent='0'; badge.style.display='none'; }
        return;
    }
    body.innerHTML = cart.cart_items.map(i => `
        <div class="cline">
          <div class="cli">
            <div class="cln">${i.menu_item_name}</div>
            <div class="clp">$${parseFloat(i.subtotal).toFixed(2)}</div>
          </div>
          <div class="qc">
            <button class="qb" onclick="chQty(${i.id},${i.quantity-1})">−</button>
            <span class="qn">${i.quantity}</span>
            <button class="qb" onclick="chQty(${i.id},${i.quantity+1})">+</button>
          </div>
        </div>`).join('');
    document.getElementById('cartTotal').textContent = `$${parseFloat(cart.total).toFixed(2)}`;
    foot.style.display = 'block';
    if (badge) { badge.textContent=cart.item_count; badge.style.display=cart.item_count>0?'inline-block':'none'; }
}

async function loadCart() {
    if (!Auth.isLoggedIn()) return;
    try { _cartData = await CartAPI.get(); renderCart(_cartData); } catch(e) {}
}

async function addToCart(id, name) {
    if (!Auth.isLoggedIn()) { openLoginModal(); showToast('Sign in to add items to cart', 'error'); return; }
    try {
        _cartData = await CartAPI.add(id);
        renderCart(_cartData);
        showToast(`${name} added! 🎉`);
        document.getElementById('cartDrawer').classList.add('open');
    } catch(e) { showToast('Could not add to cart', 'error'); }
}

async function chQty(id, qty) {
    try { _cartData = await CartAPI.update(id, qty); renderCart(_cartData); } catch(e) {}
}

function toggleCart() { document.getElementById('cartDrawer').classList.toggle('open'); }

function openCheckout() {
    if (!_cartData?.cart_items?.length) { showToast('Your cart is empty', 'error'); return; }
    document.getElementById('chkErr').textContent = '';
    document.getElementById('chkModal').classList.add('open');
}

async function placeOrder() {
    const addr  = document.getElementById('chk_addr').value.trim();
    const phone = document.getElementById('chk_phone').value.trim();
    const notes = document.getElementById('chk_notes').value.trim();
    const e = document.getElementById('chkErr');
    if (!addr || !phone) { e.textContent = 'Address and phone are required.'; return; }
    try {
        const order = await OrderAPI.place(addr, phone, notes);
        _cartData = null; renderCart(null);
        document.getElementById('chkModal').classList.remove('open');
        document.getElementById('cartDrawer').classList.remove('open');
        showToast(`Order #${order.id} placed! 🎉`);
    } catch(err) { e.textContent = getErrorMsg(err); }
}

// ── Auth modal logic ──────────────────────────────────────────────────
function openLoginModal() { _isReg=false; syncAuthModal(); document.getElementById('authModal').classList.add('open'); }
function closeAuth()      { document.getElementById('authModal').classList.remove('open'); }
function toggleAuthMode() { _isReg=!_isReg; syncAuthModal(); }

function syncAuthModal() {
    document.getElementById('authTitle').textContent  = _isReg ? 'Create Account' : 'Sign In';
    document.getElementById('authBtn2').textContent   = _isReg ? 'Register' : 'Sign In';
    document.getElementById('regExtras').style.display = _isReg ? 'block' : 'none';
    document.getElementById('pass2wrap').style.display = _isReg ? 'block' : 'none';
    document.getElementById('authToggle').textContent = _isReg
        ? 'Already have an account? Sign in'
        : "Don't have an account? Register";
    document.getElementById('authErr').textContent = '';
}

async function submitAuth() {
    const u = document.getElementById('auth_user').value.trim();
    const p = document.getElementById('auth_pass').value;
    const e = document.getElementById('authErr');
    e.textContent = '';
    if (!u || !p) { e.textContent = 'Please fill in all fields.'; return; }
    try {
        if (_isReg) {
            const p2 = document.getElementById('auth_pass2').value;
            if (p !== p2) { e.textContent = 'Passwords do not match.'; return; }
            await UserAPI.register({
                username: u, password: p, password2: p2,
                email:      document.getElementById('reg_email').value,
                first_name: document.getElementById('reg_first').value,
                last_name:  document.getElementById('reg_last').value,
            });
            showToast('Account created! Sign in now.');
            _isReg = false; syncAuthModal(); return;
        }
        const tokens = await UserAPI.login(u, p);
        Auth.setTokens(tokens.access, tokens.refresh);
        const profile = await UserAPI.profile();
        Auth.setUser(profile);
        closeAuth();
        updateHeaderAuth();
        await loadCart();
        showToast(`Welcome, ${profile.first_name || u}! 👋`);
    } catch(err) { e.textContent = getErrorMsg(err); }
}

// ── Header auth state (call on every page) ────────────────────────────
function updateHeaderAuth() {
    const u = Auth.getUser(), in_ = Auth.isLoggedIn();
    const authBtn    = document.getElementById('authNavBtn');
    const logoutBtn  = document.getElementById('logoutNavBtn');
    const greet      = document.getElementById('userGreeting');
    if (authBtn)   authBtn.style.display   = in_ ? 'none' : 'inline';
    if (logoutBtn) logoutBtn.style.display = in_ ? 'inline' : 'none';
    if (greet)     greet.textContent       = in_ && u ? `Hi, ${u.first_name || u.username}` : '';
}

function handleLogout() {
    Auth.logout(); _cartData = null;
    updateHeaderAuth(); renderCart(null);
    showToast('Signed out successfully.');
}
