import React, { useState } from 'react';

export default function ProductEditModal({ product, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...product });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    setUploading(true);
    let imageUrl = form.image;
    if (imageFile) {
      // TODO: upload image to storage and get URL
      // For now, just use a placeholder
      imageUrl = URL.createObjectURL(imageFile);
    }
    await onSave({ ...form, image: imageUrl });
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative">
        <button className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-700" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-semibold mb-4">Edit Product</h2>
        <div className="flex flex-col gap-3">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Product Name" className="border rounded px-3 py-2" />
          <input name="sku" value={form.sku} onChange={handleChange} placeholder="SKU" className="border rounded px-3 py-2" />
          <input name="stock" value={form.stock} onChange={handleChange} placeholder="Stock" type="number" className="border rounded px-3 py-2" />
          <input name="price" value={form.price} onChange={handleChange} placeholder="Price" type="number" className="border rounded px-3 py-2" />
          <input name="image" value={form.image} onChange={handleChange} placeholder="Image URL" className="border rounded px-3 py-2" />
          <input type="file" accept="image/*" onChange={handleImageChange} className="border rounded px-3 py-2" />
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="border rounded px-3 py-2" />
        </div>
        <div className="flex gap-2 mt-4">
          <button className="flex-1 bg-green-600 text-white rounded py-2" onClick={handleSave} disabled={uploading}>Save</button>
          <button className="flex-1 bg-red-500 text-white rounded py-2" onClick={() => { onDelete(product); onClose(); }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
