import { useState } from 'react';
import { parseCsvFile, parseXlsxFile } from '@/lib/csv';
import { bulkAddProducts, getPharmacyId } from '@/lib/db';

export default function BulkUploadModal({ pharmacyId, onClose }) {
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const rows = [
      { name: 'Paracetamol', price: 800, description: 'OTC analgesic', image: 'https://...', category: 'Over‑the‑Counter', stock: 50, sku: 'PAR-500' },
      { name: 'Ibuprofen', price: 1200, description: 'NSAID', image: 'https://...', category: 'Over‑the‑Counter', stock: 30, sku: 'IBU-200' }
    ];
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pharmasea_inventory_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const toNumber = (v) => {
    if (v == null) return 0;
    const s = String(v).trim().replace(/[^0-9.-]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const onFiles = async (files) => {
    try {
      setError('');
      setUploading(true);
      const file = files?.[0];
      if (!file) return;
      let rows = [];
      if (file.name.endsWith('.csv')) rows = await parseCsvFile(file);
      else rows = await parseXlsxFile(file);

      // Normalize common header variations and forgiving parsing
      const cleaned = rows.map(r => {
        const price = toNumber(r.price ?? r.Price ?? r.PRICE);
        const stock = Math.max(0, Math.floor(toNumber(r.stock ?? r.Stock ?? r.STOCK)));
        const image = r.image || r.imageUrl || r.Image || '';
        return {
          name: (r.name || r.Name || '').toString().trim(),
          price,
          description: (r.description || r.Description || '').toString(),
          image,
          category: (r.category || r.Category || 'Over‑the‑Counter').toString(),
          stock,
          sku: (r.sku || r.SKU || '').toString()
        };
      }).filter(r => r.name && (r.price > 0));

      if (!cleaned.length) throw new Error('No valid rows found. Expect headers: name, price, description, image, category, stock, sku');

      // If pharmacyId was not passed from parent, try to get it from config
      let targetPharmacyId = pharmacyId;
      if (!targetPharmacyId) {
        try {
          targetPharmacyId = await getPharmacyId();
        } catch (e) {
          // continue without pharmacyId - db.bulkAddProducts may handle it
          console.warn('Could not auto-resolve pharmacyId for bulk upload', e);
        }
      }

      await bulkAddProducts(cleaned, targetPharmacyId);
      // On success, close and refresh so dashboard shows new products
      onClose();
      window.location.reload();
    } catch (e) {
      setError(e.message || 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-[5px] p-7 w-[90vw] max-w-sm shadow-xl border border-green-300 relative">
        <button className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700 text-2xl" onClick={onClose}>&times;</button>
        <div className="text-x font-bold font-poppins mb-4 text-green-700">Bulk Upload Products</div>
        <div className="space-y-3">
          <input disabled={uploading} className="w-full border border-green-200 rounded px-3 py-2 text-[15px] font-light outline-green-400 focus:border-green-500 transition" placeholder="CSV or XLSX File" type="file" onChange={(e)=>onFiles(e.target.files)} accept=".csv,.xlsx" />
        </div>
        <div className="flex gap-2 mt-6">
          <button disabled={uploading} onClick={downloadTemplate} className="flex-1 rounded-[5px] bg-green-600 text-white text-[13px] font-semibold py-2 shadow hover:bg-green-700 transition">Download CSV template</button>
          <button disabled={uploading} className="flex-1 rounded-[5px] border border-orange-500 text-orange-600 text-[13px] font-semibold py-2 hover:bg-orange-50 transition" onClick={onClose}>Cancel</button>
        </div>
        {uploading && <div className="mt-3 text-sm text-center text-zinc-600">Uploading...</div>}
        {error && <div className="mt-3 text-red-600 text-sm text-center">{error}</div>}
      </div>
    </div>
  );
}