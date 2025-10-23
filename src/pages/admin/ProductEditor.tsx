import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { BarcodeInput } from '../../components/BarcodeInput';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  sku: string;
  barcode: string;
  category_id: string | null;
  price: number;
  cost_price: number;
  compare_at_price?: number | null;
  currency: string;
  images: string[];
  specifications?: Record<string, any>;
  features?: string[];
  tags?: string[];
  weight_kg?: number | null;
  dimensions?: { length?: number; width?: number; height?: number } | null;
  stock_quantity?: number;
  is_active: boolean;
  is_featured: boolean;
  stock_tracking: boolean;
  requires_shipping: boolean;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
}

interface Category { id: string; name: string; slug: string; }

export default function AdminProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);

  // Form state mirrors manual add + a few extras (tags/specifications/dimensions)
  const [form, setForm] = useState({
    name: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    category_id: '' as string | '',
    price: '',
    cost_price: '',
    compare_at_price: '',
    images: [] as string[],
    features: [''] as string[],
    weight_kg: '',
    stock_quantity: '',
    is_active: true,
    is_featured: false,
    stock_tracking: true,
    requires_shipping: true,
    // Extras not in manual add originally
    tags: [''] as string[],
    specifications: {} as Record<string, string>,
    dimensions: { length: '', width: '', height: '' } as Record<string, string>,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        const [{ data: product, error: productError }, { data: cats, error: catsError }] = await Promise.all([
          supabase.from('products').select(`*, category:categories(id,name,slug)`).eq('id', id).single(),
          supabase.from('categories').select('id,name,slug').eq('is_active', true).order('name'),
        ]);

        if (productError) throw productError;
        if (catsError) throw catsError;

        setCategories(cats || []);
        if (product) {
          setForm({
            name: product.name || '',
            description: product.description || '',
            short_description: product.short_description || '',
            sku: product.sku || '',
            barcode: product.barcode || '',
            category_id: product.category_id || '',
            price: product.price?.toString?.() || '',
            cost_price: product.cost_price?.toString?.() || '',
            compare_at_price: product.compare_at_price?.toString?.() || '',
            images: Array.isArray(product.images) ? product.images : [],
            features: Array.isArray(product.features) && product.features.length ? product.features : [''],
            weight_kg: product.weight_kg?.toString?.() || '',
            stock_quantity: product.stock_quantity?.toString?.() || '',
            is_active: !!product.is_active,
            is_featured: !!product.is_featured,
            stock_tracking: product.stock_tracking !== false,
            requires_shipping: product.requires_shipping !== false,
            tags: Array.isArray(product.tags) && product.tags.length ? product.tags : [''],
            specifications: (product.specifications && typeof product.specifications === 'object') ?
              Object.fromEntries(Object.entries(product.specifications).map(([k, v]) => [k, String(v)])) : {},
            dimensions: {
              length: product.dimensions?.length?.toString?.() || '',
              width: product.dimensions?.width?.toString?.() || '',
              height: product.dimensions?.height?.toString?.() || '',
            },
          });
        }
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const discount = useMemo(() => {
    const price = parseFloat(form.price || '0');
    const compareAt = parseFloat(form.compare_at_price || '0');
    if (!isFinite(price) || !isFinite(compareAt) || compareAt <= 0 || price <= 0) return 0;
    if (compareAt > price) return Math.round(((compareAt - price) / compareAt) * 100);
    return 0;
  }, [form.price, form.compare_at_price]);

  const getStockStatus = (stockCount: number = 0) => {
    if (stockCount === 0) return { message: 'Out of Stock', color: 'text-red-600 bg-red-50 border-red-200' };
    if (stockCount <= 3) return { message: `Only ${stockCount} left in stock!`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    if (stockCount <= 10) return { message: `${stockCount} units in stock - running low`, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return { message: `${stockCount} units in stock`, color: 'text-green-600 bg-green-50 border-green-200' };
  };
  const stockInfo = getStockStatus(parseInt(form.stock_quantity || '0'));

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || !files.length) return;
    try {
      const uploads: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `admin/${id || 'new'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
        if (pub?.publicUrl) uploads.push(pub.publicUrl);
      }
      setForm(prev => ({ ...prev, images: [...prev.images, ...uploads] }));
    } catch (e: any) {
      let errorMessage = 'Failed to upload images.';
      
      if (e.message?.includes('bucket not found') || e.message?.includes('Storage bucket')) {
        errorMessage = 'Storage bucket not found. Please set up the "product-images" bucket in Supabase.';
      } else if (e.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please check your storage bucket permissions.';
      } else if (e.message?.includes('size')) {
        errorMessage = 'File too large. Maximum file size is 5MB.';
      } else {
        errorMessage = e?.message || 'Failed to upload images';
      }
      
      setError(errorMessage);
    }
  };

  const removeImageAt = (idx: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
    if (selectedImage >= (form.images.length - 1)) setSelectedImage(0);
  };

  const addFeature = () => setForm(prev => ({ ...prev, features: [...prev.features, ''] }));
  const removeFeature = (i: number) => setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));

  const addTag = () => setForm(prev => ({ ...prev, tags: [...prev.tags, ''] }));
  const removeTag = (i: number) => setForm(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }));

  const setSpec = (key: string, value: string) => setForm(prev => ({ ...prev, specifications: { ...prev.specifications, [key]: value } }));
  const removeSpec = (key: string) => {
    const newSpecs = { ...form.specifications } as Record<string, string>;
    delete newSpecs[key];
    setForm(prev => ({ ...prev, specifications: newSpecs }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const price = parseFloat(form.price || '0');
      const cost = parseFloat(form.cost_price || '0');
      const compareAt = form.compare_at_price ? parseFloat(form.compare_at_price) : null;
      if (!isFinite(price) || price <= 0) throw new Error('Price must be greater than 0');
      if (!isFinite(cost) || cost < 0) throw new Error('Cost price cannot be negative');
      if (cost > price) throw new Error('Cost price cannot exceed selling price');
      if (compareAt !== null && compareAt <= price) throw new Error('Compare at price must be greater than the regular price');

      const payload: any = {
        name: form.name.trim(),
        description: form.description,
        short_description: form.short_description || form.name,
        sku: form.sku || null,
        barcode: form.barcode?.trim() || null,
        category_id: form.category_id || null,
        price,
        cost_price: cost,
        compare_at_price: compareAt,
        currency: 'USD',
        images: form.images.filter(Boolean),
        features: form.features.map(f => f.trim()).filter(Boolean),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : 0,
        is_active: form.is_active,
        is_featured: form.is_featured,
        stock_tracking: form.stock_tracking,
        requires_shipping: form.requires_shipping,
        tags: form.tags.map(t => t.trim()).filter(Boolean),
        specifications: form.specifications,
        dimensions: {
          length: form.dimensions.length ? parseFloat(form.dimensions.length) : undefined,
          width: form.dimensions.width ? parseFloat(form.dimensions.width) : undefined,
          height: form.dimensions.height ? parseFloat(form.dimensions.height) : undefined,
        },
      };

      const { error: upErr } = await supabase.from('products').update(payload).eq('id', id);
      if (upErr) throw upErr;
      setSuccess('Product updated successfully');
    } catch (e: any) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" /> Back to Products
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-[#4682B4] to-[#87CEEB] hover:from-[#2C3E50] hover:to-[#4682B4] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
              {form.images.length > 0 ? (
                <ImageWithFallback src={form.images[selectedImage]} alt={form.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {discount}% OFF
                </div>
              )}
            </div>

            {form.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImage === idx ? 'border-blue-500' : 'border-gray-200'}`}>
                    <button className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow" onClick={() => removeImageAt(idx)}>
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                    <button onClick={() => setSelectedImage(idx)} className="w-full h-full">
                      <ImageWithFallback src={img} alt={`${form.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                <span>Upload images</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadImages(e.target.files)} />
              </label>
              <button
                onClick={() => setForm(prev => ({ ...prev, images: [...prev.images, ''] }))}
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 inline mr-2" /> Add image URL
              </button>
            </div>

            {form.images.map((img, idx) => (
              img === '' ? (
                <div key={`url-${idx}`} className="flex items-center gap-2">
                  <input
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="Paste image URL and press Save"
                    value={form.images[idx]}
                    onChange={(e) => {
                      const arr = [...form.images];
                      arr[idx] = e.target.value;
                      setForm(prev => ({ ...prev, images: arr }));
                    }}
                  />
                </div>
              ) : null
            ))}
          </div>

          {/* Editable details */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-2">Admin editor</p>
              <input
                className="w-full text-3xl font-bold text-gray-900 mb-2 bg-transparent focus:outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Product name"
              />
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>SKU:</span>
                <input
                  className="px-2 py-1 border rounded-md"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU"
                />
                <span>Barcode:</span>
                <BarcodeInput
                  value={form.barcode}
                  onChange={(barcode) => setForm({ ...form, barcode })}
                  placeholder="Barcode"
                  className="flex-1"
                />
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stockInfo.color}`}>
              <span className="text-sm font-medium">{stockInfo.message}</span>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Price (R)</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Compare at Price</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Cost Price</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
              </div>
            </div>

            {/* Category and Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Category</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Stock Quantity</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
              </div>
              <div className="flex items-end gap-3">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  <span>Active</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
                  <span>Featured</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Short Description</label>
              <input className="w-full px-3 py-2 border rounded-md" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea className="w-full px-3 py-2 border rounded-md" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Features */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-700">Key Features</label>
                <button onClick={addFeature} className="text-blue-600 text-sm">+ Add Feature</button>
              </div>
              <div className="space-y-2 mt-2">
                {form.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="flex-1 px-3 py-2 border rounded-md" value={f} onChange={(e) => {
                      const arr = [...form.features]; arr[i] = e.target.value; setForm({ ...form, features: arr });
                    }} />
                    <button onClick={() => removeFeature(i)} className="p-2 rounded-md border text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Weight (kg)</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Requires Shipping</label>
                <div>
                  <input type="checkbox" checked={form.requires_shipping} onChange={(e) => setForm({ ...form, requires_shipping: e.target.checked })} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Track Stock</label>
                <div>
                  <input type="checkbox" checked={form.stock_tracking} onChange={(e) => setForm({ ...form, stock_tracking: e.target.checked })} />
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Dimensions (cm)</label>
              <div className="grid grid-cols-3 gap-3">
                <input className="px-3 py-2 border rounded-md" placeholder="Length" value={form.dimensions.length} onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, length: e.target.value } })} />
                <input className="px-3 py-2 border rounded-md" placeholder="Width" value={form.dimensions.width} onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, width: e.target.value } })} />
                <input className="px-3 py-2 border rounded-md" placeholder="Height" value={form.dimensions.height} onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, height: e.target.value } })} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-700">Tags</label>
                <button onClick={addTag} className="text-blue-600 text-sm">+ Add Tag</button>
              </div>
              <div className="space-y-2 mt-2">
                {form.tags.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="flex-1 px-3 py-2 border rounded-md" value={t} onChange={(e) => {
                      const arr = [...form.tags]; arr[i] = e.target.value; setForm({ ...form, tags: arr });
                    }} />
                    <button onClick={() => removeTag(i)} className="p-2 rounded-md border text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Specifications */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm text-gray-700">Specifications (key/value)</label>
                <button
                  onClick={() => setSpec(`spec_${Object.keys(form.specifications).length + 1}`, '')}
                  className="text-blue-600 text-sm"
                >
                  + Add Spec
                </button>
              </div>
              <div className="space-y-2 mt-2">
                {Object.entries(form.specifications).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-2">
                    <input
                      className="px-3 py-2 border rounded-md"
                      value={key}
                      onChange={(e) => {
                        const v = String(value);
                        removeSpec(key);
                        setSpec(e.target.value || 'spec', v);
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 px-3 py-2 border rounded-md"
                        value={String(value)}
                        onChange={(e) => setSpec(key, e.target.value)}
                      />
                      <button onClick={() => removeSpec(key)} className="p-2 rounded-md border text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
