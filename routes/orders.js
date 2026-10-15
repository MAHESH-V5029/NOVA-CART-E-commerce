const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();
const ALLOWED_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered'];

router.post('/', authenticateToken, async (req, res, next) => {
  const address = String(req.body.shipping_address || '').trim();
  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
  if (address.length < 8 || address.length > 1000) return res.status(400).json({ message: 'Enter a shipping address (at least 8 characters).' });
  if (!rawItems.length || rawItems.length > 50) return res.status(400).json({ message: 'Your cart is empty or contains too many different products.' });

  const quantityByProduct = new Map();
  for (const item of rawItems) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ message: 'Each cart item must have a valid product ID and quantity (1–99).' });
    }
    quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const checkedItems = [];
    let total = 0;
    for (const [productId, quantity] of quantityByProduct.entries()) {
      const [rows] = await connection.execute(
        'SELECT id, name, price, stock_quantity FROM products WHERE id = ? FOR UPDATE',
        [productId]
      );
      const product = rows[0];
      if (!product) throw Object.assign(new Error(`Product ${productId} no longer exists.`), { status: 400 });
      if (product.stock_quantity < quantity) throw Object.assign(new Error(`Not enough stock for ${product.name}. Available: ${product.stock_quantity}.`), { status: 400 });
      const unitPrice = Number(product.price);
      total += unitPrice * quantity;
      checkedItems.push({ product, quantity, unitPrice });
    }

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, total_amount, shipping_address, payment_method) VALUES (?, ?, ?, \'Cash on Delivery\')',
      [req.user.id, total.toFixed(2), address]
    );
    for (const item of checkedItems) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [orderResult.insertId, item.product.id, item.product.name, item.quantity, item.unitPrice.toFixed(2)]
      );
      await connection.execute('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product.id]);
    }
    await connection.commit();
    return res.status(201).json({ message: 'Order placed successfully.', order_id: orderResult.insertId, total_amount: Number(total.toFixed(2)), status: 'Pending' });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  } finally {
    connection.release();
  }
});

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const [orders] = req.user.role === 'admin'
      ? await pool.execute(
          'SELECT o.id, o.user_id, u.name AS customer_name, u.email AS customer_email, o.total_amount, o.status, o.shipping_address, o.payment_method, o.created_at FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC'
        )
      : await pool.execute(
          'SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.payment_method, o.created_at FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC',
          [req.user.id]
        );
    if (!orders.length) return res.json({ orders: [] });
    const ids = orders.map((order) => order.id);
    const placeholders = ids.map(() => '?').join(',');
    const [items] = await pool.execute(
      `SELECT order_id, product_name, quantity, unit_price FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`, ids
    );
    const grouped = new Map();
    for (const item of items) {
      if (!grouped.has(item.order_id)) grouped.set(item.order_id, []);
      grouped.get(item.order_id).push(item);
    }
    return res.json({ orders: orders.map((order) => ({ ...order, items: grouped.get(order.id) || [] })) });
  } catch (error) { return next(error); }
});

router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || '');
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid order ID.' });
    if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
    const [existing] = await pool.execute('SELECT id FROM orders WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Order not found.' });
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    return res.json({ message: 'Order status updated.', status });
  } catch (error) { return next(error); }
});

module.exports = router;
