import { useState } from 'react';
import { parseCsvFile, parseXlsxFile } from '@/lib/csv';
import { bulkAddProducts } from '@/lib/db';

export default function BulkUploadModal({ pharmacyId, onClose }) {
  const [error, setError] = useState('');

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

  const onFiles = async (files) => {
    try {
      setError('');
      const file = files?.[0];
      if (!file) return;
      let rows = [];
      if (file.name.endsWith('.csv')) rows = await parseCsvFile(file);
      else rows = await parseXlsxFile(file);
      const cleaned = rows.map(r => ({ name: r.name, price: Number(r.price), description: r.description || '', image: r.image || '', category: r.category || 'Over‑the‑Counter', stock: Number(r.stock || 0), sku: r.sku || '' }))
        .filter(r => r.name && r.price);
      if (!cleaned.length) throw new Error('No valid rows found. Expect headers: name, price, description, image, category, stock, sku');
      await bulkAddProducts(cleaned, pharmacyId);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to parse file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-[5px] p-7 w-[90vw] max-w-sm shadow-xl border border-green-300 relative">
        <button className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700 text-2xl" onClick={onClose}>&times;</button>
        <div className="text-x font-bold font-poppins mb-4 text-green-700">Bulk Upload Products</div>
        <div className="space-y-3">
          <input className="w-full border border-green-200 rounded px-3 py-2 text-[15px] font-light outline-green-400 focus:border-green-500 transition" placeholder="CSV or XLSX File" type="file" onChange={(e)=>onFiles(e.target.files)} accept=".csv,.xlsx" />
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={downloadTemplate} className="flex-1 rounded-[5px] bg-green-600 text-white text-[13px] font-semibold py-2 shadow hover:bg-green-700 transition">Download CSV template</button>
          <button className="flex-1 rounded-[5px] border border-orange-500 text-orange-600 text-[13px] font-semibold py-2 hover:bg-orange-50 transition" onClick={onClose}>Cancel</button>
        </div>
        {error && <div className="mt-3 text-red-600 text-sm text-center">{error}</div>}
      </div>
    </div>
  );
}