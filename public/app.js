const API = '/api';
const TOKEN_KEY = 'novacart_token';
const CART_KEY = 'novacart_cart';
const state = { token: localStorage.getItem(TOKEN_KEY) || '', user: null, products: [], orders: [], search: '', toastTimer: null };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const getCart = () => {
  try { const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(cart) ? cart : []; }
  catch { return []; }
};
function setCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); }

async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && state.token) clearSession(false);
    throw new Error(data.message || 'The request could not be completed.');
  }
  return data;
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function showNotice(message, isError = false) {
  const notice = $('#notice'); notice.textContent = message; notice.classList.toggle('error', isError); notice.classList.remove('hidden');
  if (!isError) setTimeout(() => notice.classList.add('hidden'), 5000);
}
function togglePanel(id) {
  const panel = document.getElementById(id); const willOpen = panel.classList.contains('hidden');
  $$('.content-panel').forEach((item) => item.classList.add('hidden'));
  if (willOpen) { panel.classList.remove('hidden'); panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
function productImage(url, name) {
  const safe = escapeHTML(url || '');
  return `<img class="product-image" src="${safe}" alt="${escapeHTML(name)}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/700x600/eef0e8/53624b?text=NovaCart'" />`;
}
function renderProducts() {
  const products = state.products;
  $('#result-count').textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
  if (!products.length) { $('#products-grid').innerHTML = '<div class="empty-state">No products found. Try a different search.</div>'; return; }
  $('#products-grid').innerHTML = products.map((p) => `
    <article class="product-card">
      <div class="product-image-wrap">${productImage(p.image_url, p.name)}<span class="product-tag">EVERYDAY PICK</span><button class="quick-add" type="button" data-add="${p.id}" aria-label="Add ${escapeHTML(p.name)} to cart" title="Add to cart" ${Number(p.stock_quantity) < 1 ? 'disabled' : ''}>+</button></div>
      <div class="product-info"><div class="product-title-row"><h3 class="product-title">${escapeHTML(p.name)}</h3><span class="product-stock">${Number(p.stock_quantity) > 0 ? `${Number(p.stock_quantity)} left` : 'Sold out'}</span></div><p class="product-description">${escapeHTML(p.description)}</p><div class="product-price-row"><span class="product-price">${money(p.price)}</span><span class="price-caption">Inclusive of all taxes</span></div></div>
    </article>`).join('');
}
async function loadProducts() {
  $('#products-grid').innerHTML = '<div class="loading-state">Loading your collection…</div>';
  try { const data = await api(`/products${state.search ? `?search=${encodeURIComponent(state.search)}` : ''}`); state.products = data.products || []; renderProducts(); }
  catch (error) { $('#products-grid').innerHTML = `<div class="empty-state">${escapeHTML(error.message)} Check that the server and database are running, then refresh this page.</div>`; }
}
function addToCart(id) {
  const product = state.products.find((item) => Number(item.id) === Number(id));
  if (!product) return showToast('That product could not be found.');
  if (Number(product.stock_quantity) < 1) return showToast('This product is currently out of stock.');
  const cart = getCart(); const existing = cart.find((item) => Number(item.product_id) === Number(id));
  if (existing) {
    if (existing.quantity >= Number(product.stock_quantity)) return showToast('You have added all currently available stock.');
    existing.quantity += 1;
  } else cart.push({ product_id: Number(id), quantity: 1 });
  setCart(cart); showToast(`${product.name} added to your cart.`);
}
function cartProduct(id) { return state.products.find((p) => Number(p.id) === Number(id)); }
function renderCart() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  $('#cart-count').textContent = String(count);
  const lines = cart.map((item) => ({ ...item, product: cartProduct(item.product_id) })).filter((item) => item.product);
  if (lines.length !== cart.length) localStorage.setItem(CART_KEY, JSON.stringify(lines.map(({ product_id, quantity }) => ({ product_id, quantity }))));
  if (!lines.length) {
    $('#cart-items').innerHTML = '<div class="empty-state">Your cart is empty. Add something lovely from the collection above.</div>';
    $('#cart-total').textContent = money(0); $('#checkout-button').disabled = true; return;
  }
  const total = lines.reduce((sum, item) => sum + Number(item.product.price) * Number(item.quantity), 0);
  $('#cart-items').innerHTML = lines.map((item) => `<div class="cart-item"><img src="${escapeHTML(item.product.image_url || '')}" alt="${escapeHTML(item.product.name)}" onerror="this.onerror=null;this.src='https://placehold.co/200x200/eef0e8/53624b?text=Item'"><div><h3>${escapeHTML(item.product.name)}</h3><small>${money(item.product.price)} each · ${Number(item.product.stock_quantity)} in stock</small><div class="quantity-control"><button type="button" data-qty="${item.product_id}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-qty="${item.product_id}" data-delta="1" aria-label="Increase quantity" ${Number(item.quantity) >= Number(item.product.stock_quantity) ? 'disabled' : ''}>+</button><button type="button" class="remove-item" data-remove="${item.product_id}">Remove</button></div></div><div class="cart-item-total">${money(Number(item.product.price) * Number(item.quantity))}</div></div>`).join('');
  $('#cart-total').textContent = money(total); $('#checkout-button').disabled = false;
}
function changeQuantity(id, delta) {
  let cart = getCart(); const item = cart.find((line) => Number(line.product_id) === Number(id)); const product = cartProduct(id);
  if (!item || !product) return;
  const next = Number(item.quantity) + Number(delta);
  if (next < 1) cart = cart.filter((line) => Number(line.product_id) !== Number(id));
  else if (next > Number(product.stock_quantity)) return showToast('That is more than the available stock.');
  else item.quantity = next;
  setCart(cart);
}
function clearSession(showMessage = true) {
  state.token = ''; state.user = null; localStorage.removeItem(TOKEN_KEY); updateAccountUI();
  if (showMessage) showToast('You have logged out.');
}
function updateAccountUI() {
  const signedIn = $('#account-signed-in'); const forms = $('#account-forms');
  if (!state.user) {
    signedIn.classList.add('hidden'); forms.classList.remove('hidden'); $('#admin-panel').classList.add('hidden'); return;
  }
  forms.classList.add('hidden'); signedIn.classList.remove('hidden');
  signedIn.innerHTML = `<div class="signed-in-card"><p><b>Hi, ${escapeHTML(state.user.name)}!</b><small>${escapeHTML(state.user.email)} · ${state.user.role === 'admin' ? 'Administrator' : 'Customer'}</small></p><button id="signout-button" type="button">Log out</button></div>`;
  $('#admin-panel').classList.toggle('hidden', state.user.role !== 'admin');
}
async function loadAccount() {
  if (!state.token) { updateAccountUI(); return; }
  try { const data = await api('/auth/me'); state.user = data.user; updateAccountUI(); }
  catch { clearSession(false); }
}
async function submitAuth(form, path) {
  const button = form.querySelector('button[type="submit"]'); button.disabled = true;
  try {
    const body = Object.fromEntries(new FormData(form).entries()); const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
    state.token = data.token; state.user = data.user; localStorage.setItem(TOKEN_KEY, state.token); form.reset(); updateAccountUI();
    showToast(data.message || 'You are logged in.');
    if (state.user.role === 'admin') { await loadAdminData(); }
    if ($('#cart-panel').classList.contains('hidden') === false) renderCart();
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
}
function renderOrders() {
  if (!state.user) { $('#orders-list').innerHTML = '<p class="empty-state">Log in to view your orders.</p>'; return; }
  if (!state.orders.length) { $('#orders-list').innerHTML = '<p class="empty-state">No orders yet. Your first order will appear here.</p>'; return; }
  $('#orders-list').innerHTML = state.orders.map((o) => `<article class="order-card"><div class="order-head"><div><b>Order #${o.id}</b><small>${new Date(o.created_at).toLocaleString()}</small>${o.customer_name ? `<small>Customer: ${escapeHTML(o.customer_name)} (${escapeHTML(o.customer_email)})</small>` : ''}</div><span class="status-pill">${escapeHTML(o.status)}</span></div><div class="order-items-line">${(o.items || []).map((item) => `${escapeHTML(item.product_name)} × ${item.quantity}`).join(' · ')}</div><div class="order-total"><span>Cash on Delivery</span><strong>${money(o.total_amount)}</strong></div><div class="order-address">Deliver to: ${escapeHTML(o.shipping_address)}</div></article>`).join('');
}
async function loadOrders() {
  if (!state.user) { state.orders = []; renderOrders(); return; }
  try { const data = await api('/orders'); state.orders = data.orders || []; renderOrders(); if (state.user.role === 'admin') renderAdminOrders(); }
  catch (error) { showToast(error.message); }
}
function resetProductForm() {
  const form = $('#product-form'); form.reset(); form.elements.id.value = ''; $('#product-form-title').textContent = 'Add a product'; $('#cancel-edit').classList.add('hidden');
}
function renderAdminProducts() {
  $('#admin-products').innerHTML = state.products.length ? state.products.map((p) => `<div class="admin-product-row"><img src="${escapeHTML(p.image_url || '')}" alt="" onerror="this.onerror=null;this.src='https://placehold.co/100x100/eef0e8/53624b?text=Item'"><div><b>${escapeHTML(p.name)}</b><small>${money(p.price)} · Stock: ${p.stock_quantity}</small></div><div class="admin-row-actions"><button type="button" data-edit-product="${p.id}">Edit</button><button class="delete-product" type="button" data-delete-product="${p.id}">Delete</button></div></div>`).join('') : '<p class="empty-state">No products yet.</p>';
}
function renderAdminOrders() {
  if (!state.user || state.user.role !== 'admin') return;
  $('#admin-orders-list').innerHTML = state.orders.length ? state.orders.map((o) => `<div class="admin-order-row"><div><b>Order #${o.id} · ${escapeHTML(o.customer_name || 'Customer')}</b><small>${escapeHTML(o.customer_email || '')} · ${money(o.total_amount)} · ${new Date(o.created_at).toLocaleDateString()}</small><small>${(o.items || []).map((item) => `${escapeHTML(item.product_name)} × ${item.quantity}`).join(' · ')}</small></div><select aria-label="Status for order ${o.id}" data-order-status="${o.id}">${['Pending','Processing','Shipped','Delivered'].map((status) => `<option value="${status}" ${o.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>`).join('') : '<p class="empty-state">There are no orders to manage yet.</p>';
}
async function loadAdminData() {
  if (state.user?.role !== 'admin') return;
  await loadProducts(); renderAdminProducts(); await loadOrders();
}
async function saveProduct(form) {
  const button = form.querySelector('button[type="submit"]'); button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(form).entries()); const id = values.id; delete values.id;
    values.price = Number(values.price); values.stock_quantity = Number(values.stock_quantity); values.image_url = values.image_url.trim() || null;
    const data = await api(id ? `/products/${id}` : '/products', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(values) });
    showToast(data.message); resetProductForm(); await loadProducts(); renderAdminProducts();
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
}
async function placeOrder(form) {
  if (!state.user) { showToast('Please log in or create an account before checkout.'); togglePanel('account-panel'); return; }
  const cart = getCart(); if (!cart.length) return showToast('Your cart is empty.');
  const button = $('#checkout-button'); button.disabled = true;
  try {
    const data = await api('/orders', { method: 'POST', body: JSON.stringify({ shipping_address: form.elements.shipping_address.value, items: cart }) });
    localStorage.removeItem(CART_KEY); form.reset(); renderCart(); showToast(`Order #${data.order_id} placed successfully.`);
    await loadProducts(); await loadOrders(); togglePanel('orders-panel');
  } catch (error) { showToast(error.message); }
  finally { button.disabled = getCart().length === 0; }
}

$('#products-grid').addEventListener('click', (event) => { const button = event.target.closest('[data-add]'); if (button) addToCart(Number(button.dataset.add)); });
$('#cart-items').addEventListener('click', (event) => {
  const quantity = event.target.closest('[data-qty]'); const remove = event.target.closest('[data-remove]');
  if (quantity) changeQuantity(Number(quantity.dataset.qty), Number(quantity.dataset.delta));
  if (remove) setCart(getCart().filter((item) => Number(item.product_id) !== Number(remove.dataset.remove)));
});
$('#admin-products').addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit-product]'); const del = event.target.closest('[data-delete-product]');
  if (edit) {
    const product = state.products.find((p) => Number(p.id) === Number(edit.dataset.editProduct)); if (!product) return;
    const form = $('#product-form'); form.elements.id.value = product.id; form.elements.name.value = product.name; form.elements.description.value = product.description; form.elements.price.value = product.price; form.elements.stock_quantity.value = product.stock_quantity; form.elements.image_url.value = product.image_url || '';
    $('#product-form-title').textContent = 'Edit a product'; $('#cancel-edit').classList.remove('hidden'); form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (del) {
    const product = state.products.find((p) => Number(p.id) === Number(del.dataset.deleteProduct)); if (!product) return;
    if (!window.confirm(`Delete "${product.name}"? This will not erase older order records.`)) return;
    try { const data = await api(`/products/${product.id}`, { method: 'DELETE' }); showToast(data.message); await loadProducts(); renderAdminProducts(); }
    catch (error) { showToast(error.message); }
  }
});
$('#admin-orders-list').addEventListener('change', async (event) => {
  const select = event.target.closest('[data-order-status]'); if (!select) return;
  const original = state.orders.find((order) => Number(order.id) === Number(select.dataset.orderStatus))?.status;
  try { const data = await api(`/orders/${select.dataset.orderStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); showToast(data.message); await loadOrders(); }
  catch (error) { showToast(error.message); if (original) select.value = original; }
});
$('#account-button').addEventListener('click', () => { togglePanel('account-panel'); });
$('#cart-button').addEventListener('click', () => { renderCart(); togglePanel('cart-panel'); });
$('#orders-button').addEventListener('click', async () => { togglePanel('orders-panel'); if (!$('#orders-panel').classList.contains('hidden')) await loadOrders(); });
$$('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).classList.add('hidden')));
$('#login-form').addEventListener('submit', (event) => { event.preventDefault(); submitAuth(event.currentTarget, '/auth/login'); });
$('#register-form').addEventListener('submit', (event) => { event.preventDefault(); submitAuth(event.currentTarget, '/auth/register'); });
$('#checkout-form').addEventListener('submit', (event) => { event.preventDefault(); placeOrder(event.currentTarget); });
$('#product-form').addEventListener('submit', (event) => { event.preventDefault(); saveProduct(event.currentTarget); });
$('#cancel-edit').addEventListener('click', resetProductForm);
$('#account-signed-in').addEventListener('click', (event) => { if (event.target.closest('#signout-button')) clearSession(); });
let searchTimer;
$('#search-input').addEventListener('input', (event) => { clearTimeout(searchTimer); state.search = event.target.value.trim(); searchTimer = setTimeout(loadProducts, 250); });
$('#year').textContent = String(new Date().getFullYear());

(async function init() {
  renderCart(); await loadProducts(); await loadAccount();
  if (state.user?.role === 'admin') { await loadAdminData(); }
})();
