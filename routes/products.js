const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

function readProduct(body, partial = false) {
  const product = {};
  if (!partial || body.name !== undefined) {
    product.name = String(body.name || '').trim();
    if (product.name.length < 2 || product.name.length > 160) throw new Error('Product name must be between 2 and 160 characters.');
  }
  if (!partial || body.description !== undefined) {
    product.description = String(body.description || '').trim();
    if (!product.description) throw new Error('Product description is required.');
  }
  if (!partial || body.price !== undefined) {
    product.price = Number(body.price);
    if (!Number.isFinite(product.price) || product.price < 0 || product.price > 99999999) throw new Error('Enter a valid non-negative product price.');
  }
  if (!partial || body.stock_quantity !== undefined) {
    product.stock_quantity = Number(body.stock_quantity);
    if (!Number.isInteger(product.stock_quantity) || product.stock_quantity < 0 || product.stock_quantity > 1000000) throw new Error('Stock must be a whole number from 0 to 1,000,000.');
  }
  if (!partial || body.image_url !== undefined) {
    product.image_url = body.image_url ? String(body.image_url).trim() : null;
    if (product.image_url && !/^https?:\/\//i.test(product.image_url)) throw new Error('Image URL must begin with http:// or https://.');
  }
  return product;
}

router.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const [rows] = search
      ? await pool.execute(
          'SELECT id, name, description, price, image_url, stock_quantity, created_at FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY id DESC',
          [`%${search}%`, `%${search}%`]
        )
      : await pool.execute('SELECT id, name, description, price, image_url, stock_quantity, created_at FROM products ORDER BY id DESC');
    return res.json({ products: rows });
  } catch (error) { return next(error); }
});

router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    let p;
    try { p = readProduct(req.body); } catch (error) { return res.status(400).json({ message: error.message }); }
    const [result] = await pool.execute(
      'INSERT INTO products (name, description, price, image_url, stock_quantity) VALUES (?, ?, ?, ?, ?)',
      [p.name, p.description, p.price, p.image_url, p.stock_quantity]
    );
    const [rows] = await pool.execute('SELECT id, name, description, price, image_url, stock_quantity FROM products WHERE id = ?', [result.insertId]);
    return res.status(201).json({ message: 'Product created.', product: rows[0] });
  } catch (error) { return next(error); }
});

router.patch('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid product ID.' });
    let p;
    try { p = readProduct(req.body, true); } catch (error) { return res.status(400).json({ message: error.message }); }
    const keys = Object.keys(p);
    if (!keys.length) return res.status(400).json({ message: 'Provide at least one field to update.' });
    const assignments = keys.map((key) => `${key} = ?`).join(', ');
    const [result] = await pool.execute(`UPDATE products SET ${assignments} WHERE id = ?`, [...keys.map((key) => p[key]), id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });
    const [rows] = await pool.execute('SELECT id, name, description, price, image_url, stock_quantity FROM products WHERE id = ?', [id]);
    return res.json({ message: 'Product updated.', product: rows[0] });
  } catch (error) { return next(error); }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid product ID.' });
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });
    return res.json({ message: 'Product deleted.' });
  } catch (error) { return next(error); }
});

module.exports = router;
