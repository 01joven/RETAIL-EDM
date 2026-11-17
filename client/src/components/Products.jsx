import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export default function Products({ token, user }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ sku: '', name: '', unitPrice: '', stockQuantity: '0' });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const canManage = user.role === 'admin';
  const load = useCallback(() => api('/products', { token }).then((result) => setProducts(result.products)).catch((reason) => setError(reason.message)), [token]);
  useEffect(() => { load(); }, [load]);
  async function addProduct(event) {
    event.preventDefault();
    try {
      await api(editingId ? `/products/${editingId}` : '/products', {
        token,
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...form,
          unitPrice: form.unitPrice,
          stockQuantity: Number(form.stockQuantity)
        })
      });
      setForm({ sku: '', name: '', unitPrice: '', stockQuantity: '0' });
      setEditingId(null);
      setError('');
      await load();
    } catch (reason) { setError(reason.message); }
  }
  function editProduct(product) {
    setEditingId(product.id);
    setForm({ sku: product.sku, name: product.name, unitPrice: product.unit_price, stockQuantity: String(product.stock_quantity) });
  }
  async function deleteProduct(product) {
    if (!window.confirm(`Deactivate ${product.name}? It will remain in historical sales.`)) return;
    try {
      await api(`/products/${product.id}`, { token, method: 'DELETE' });
      await load();
    } catch (reason) { setError(reason.message); }
  }
  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.sku}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <section className="page-content">
      <div className="page-heading"><div><p className="eyebrow">{canManage ? 'CATALOG & INVENTORY' : 'STORE CATALOG'}</p><h1>Products</h1><p className="muted">{canManage ? 'Manage products, prices, and stock levels.' : 'Search available products and view current stock.'}</p></div></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {canManage && <form className="panel product-form" onSubmit={addProduct}><div><h2>{editingId ? 'Edit product' : 'Add a product'}</h2><p>Update catalog details and inventory stock.</p></div><label>SKU<input required maxLength="64" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label><label>Product name<input required maxLength="160" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Price<input required type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} /></label><label>Stock<input required type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} /></label><button className="primary-button">{editingId ? 'Save changes' : 'Add product'} <span>{editingId ? '✓' : '＋'}</span></button>{editingId && <button type="button" className="outline-button" onClick={() => { setEditingId(null); setForm({ sku: '', name: '', unitPrice: '', stockQuantity: '0' }); }}>Cancel</button>}</form>}
      <article className="panel table-panel"><div className="table-toolbar"><div><h2>Product catalog</h2><p>{visibleProducts.length} products</p></div><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or SKU…" /></label></div><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>PRICE</th><th>IN STOCK</th><th>STATUS</th>{canManage && <th className="align-right">ACTIONS</th>}</tr></thead><tbody>
        {visibleProducts.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td className="sku-cell">{product.sku}</td><td className="amount-cell">{money(product.unit_price)}</td><td>{product.stock_quantity}</td><td><span className={`status-pill ${product.active ? 'completed' : 'inactive'}`}>{product.active ? 'Active' : 'Inactive'}</span></td>{canManage && <td className="align-right"><button className="text-button" onClick={() => editProduct(product)}>Edit</button>{product.active ? <button className="text-button danger-text" onClick={() => deleteProduct(product)}>Deactivate</button> : <button className="text-button" onClick={async () => { try { await api(`/products/${product.id}`, { token, method: 'PATCH', body: JSON.stringify({ active: true }) }); await load(); } catch (reason) { setError(reason.message); } }}>Activate</button>}</td>}</tr>)}
        {visibleProducts.length === 0 && <tr><td colSpan={canManage ? 6 : 5} className="table-empty">No products found.</td></tr>}
      </tbody></table></div></article>
    </section>
  );
}
