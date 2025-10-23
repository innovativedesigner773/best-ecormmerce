import React, { useState, useEffect } from 'react';
import { Plus, Package, Scan, Search, Filter, Edit, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { FastBarcodeScanner } from './FastBarcodeScanner';
import { BarcodeInput } from './BarcodeInput';
import { QuickStartGuide } from './QuickStartGuide';
import { ImageWithFallback } from './figma/ImageWithFallback';
import ProductCard from './common/ProductCard';
import StorageDiagnostic from './admin/StorageDiagnostic';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StorageSetup } from '../utils/storage-setup';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  sku: string;
  barcode: string;
  category_id: string;
  price: number;
  cost_price: number;
  compare_at_price?: number;
  currency: string;
  images: string[];
  specifications?: any;
  features?: string[];
  tags?: any;
  weight_kg?: number;
  dimensions?: any;
  stock_quantity?: number;
  is_active: boolean;
  is_featured: boolean;
  stock_tracking: boolean;
  requires_shipping: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'not_featured'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    price: 0,
    stock_quantity: 0,
    description: '',
    is_active: true,
    is_featured: false,
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Manual add form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    category_id: '',
    price: '',
    cost_price: '',
    compare_at_price: '',
    images: [''],
    features: [''],
    weight_kg: '',
    stock_quantity: '',
    is_featured: false,
    stock_tracking: true,
    requires_shipping: true,
  });
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCategories();
    }
  }, [user]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, statusFilter, featuredFilter, stockFilter]);

  const fetchCategories = async () => {
    try {
      console.log('📂 Fetching categories...');
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) {
        console.error('❌ Error fetching categories:', categoriesError);
        return;
      }

      console.log('✅ Categories fetched:', categoriesData);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('❌ Unexpected error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Fetching products from Supabase...');
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      console.log('✅ Products fetched:', productsData);
      const productList = productsData || [];
      setProducts(productList);
      setShowQuickStart(productList.length === 0);
      setError(null);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh function that doesn't affect loading state or messages
  const silentRefreshProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error refreshing products:', productsError);
        return;
      }

      const productList = productsData || [];
      setProducts(productList);
    } catch (error) {
      console.error('Error refreshing products:', error);
    }
  };

  const handleProductScanned = async (scannedProduct: any) => {
    try {
      console.log('📦 Adding scanned product:', scannedProduct);
      
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: scannedProduct.name || 'Unknown Product',
          slug: (scannedProduct.name || 'unknown-product').toLowerCase().replace(/\s+/g, '-'),
          description: scannedProduct.description || 'Product added via barcode scan',
          short_description: scannedProduct.short_description || scannedProduct.name,
          sku: scannedProduct.sku || `SCAN-${Date.now()}`,
          barcode: scannedProduct.barcode,
          category_id: categories[0]?.id || null, // Use first category as default
          price: scannedProduct.price || 0,
          cost_price: scannedProduct.cost_price || 0,
          currency: 'USD',
          images: scannedProduct.images || [],
          is_active: true,
          is_featured: false,
          stock_tracking: true,
          requires_shipping: true,
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Product added successfully:', data);
      fetchProducts(); // Refresh the list
      setError(null);
    } catch (error) {
      console.error('Error adding product:', error);
      setError(error instanceof Error ? error.message : 'Failed to add product. Please try again.');
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('📦 Adding manual product:', formData);

      // Validation for prices
      const price = parseFloat(formData.price) || 0;
      const compareAtPrice = formData.compare_at_price ? parseFloat(formData.compare_at_price) : null;
      const costPrice = formData.cost_price ? parseFloat(formData.cost_price) : 0;
      if (isNaN(price) || price <= 0) {
        setError('Price must be greater than 0');
        setIsSubmitting(false);
        return;
      }
      if (isNaN(costPrice) || costPrice < 0) {
        setError('Cost price cannot be negative');
        setIsSubmitting(false);
        return;
      }
      if (costPrice > price) {
        setError('Cost price cannot exceed selling price');
        setIsSubmitting(false);
        return;
      }
      
      if (compareAtPrice !== null && compareAtPrice <= price) {
        setError('Compare at price must be greater than the regular price');
        setIsSubmitting(false);
        return;
      }

      // Generate slug from name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      // Clean up arrays (remove empty strings)
      const cleanImages = formData.images.filter(img => img.trim() !== '');
      const cleanFeatures = formData.features.filter(feature => feature.trim() !== '');

      const productData = {
        name: formData.name,
        slug,
        description: formData.description,
        short_description: formData.short_description || formData.name,
        sku: formData.sku || `MANUAL-${Date.now()}`,
        barcode: formData.barcode.trim() || null, // Set to null if empty to avoid unique constraint issues
        category_id: formData.category_id || null,
        price: parseFloat(formData.price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        currency: 'USD',
        images: cleanImages,
        features: cleanFeatures,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
        is_active: true,
        is_featured: formData.is_featured,
        stock_tracking: formData.stock_tracking,
        requires_shipping: formData.requires_shipping,
      };

      console.log('📊 Product data to insert:', {
        price: productData.price,
        compare_at_price: productData.compare_at_price,
        cost_price: productData.cost_price,
        validationCheck: {
          priceIsValid: productData.price >= 0,
          compareAtPriceIsValid: productData.compare_at_price === null || productData.compare_at_price > productData.price,
          costPriceIsValid: productData.cost_price >= 0
        }
      });

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        console.error('Database error details:', error);
        throw new Error(`Database error: ${error.message} | Code: ${error.code} | Details: ${error.details}`);
      }

      console.log('✅ Manual product added successfully:', data);
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        short_description: '',
        sku: '',
        barcode: '',
        category_id: '',
        price: '',
        cost_price: '',
        compare_at_price: '',
        images: [''],
        features: [''],
        weight_kg: '',
        stock_quantity: '',
        is_featured: false,
        stock_tracking: true,
        requires_shipping: true,
      });
      setShowManualAdd(false);
      fetchProducts(); // Refresh the list
      setError(null);
    } catch (error) {
      console.error('Error adding manual product:', error);
      
      // Better error messages for common issues
      let errorMessage = 'Failed to add product. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('barcode')) {
          errorMessage = 'This barcode already exists. Please use a different barcode or leave it empty.';
        } else if (error.message.includes('sku')) {
          errorMessage = 'This SKU already exists. Please use a different SKU or leave it empty for auto-generation.';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'A product with this information already exists. Please check your input.';
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product: any) => {
    // Find the full product from our products list
    const fullProduct = products.find(p => p.id === product.id);
    if (fullProduct) {
      setProductToEdit(fullProduct);
      setEditFormData({
        name: fullProduct.name,
        price: fullProduct.price,
        stock_quantity: fullProduct.stock_quantity || 0,
        description: fullProduct.description || '',
        is_active: fullProduct.is_active,
        is_featured: fullProduct.is_featured,
      });
      setShowEditModal(true);
    }
  };

  const handleDeleteProduct = (product: any) => {
    // Find the full product from our products list  
    const fullProduct = products.find(p => p.id === product.id);
    if (fullProduct) {
      setProductToDelete(fullProduct);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    const productName = productToDelete.name; // Store name before clearing state
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) {
        throw new Error(error.message);
      }

      // Clear dialog state first
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      setError(null);
      setIsDeleting(false);
      
      // Set success message after clearing dialog
      const successMsg = `✅ Product "${productName}" has been deleted successfully!`;
      setSuccessMessage(successMsg);
      
      // Refresh the product list silently (without affecting loading state)
      silentRefreshProducts();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete product. Please try again.');
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            name: newCategoryName.trim(),
            description: `Auto-created category: ${newCategoryName.trim()}`
          }
        ])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Refresh categories
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        setCategories(categoriesData || []);

        // Set the new category as selected
        setFormData(prev => ({
          ...prev,
          category_id: data[0].id
        }));

        setSuccessMessage(`Category "${newCategoryName}" created successfully!`);
        setNewCategoryName('');
        setShowNewCategoryInput(false);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Failed to create category. Please try again.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Upload images to Supabase Storage and return public URLs
  const uploadImagesToStorage = async (files: File[]) => {
    if (!files.length) return [] as string[];
    setIsUploadingImages(true);
    setUploadError(null);
    const urls: string[] = [];
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `products/${user?.id || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
        if (pub?.publicUrl) urls.push(pub.publicUrl);
      }
      return urls;
    } catch (e: any) {
      console.error('Image upload failed:', e);
      let errorMessage = 'Image upload failed.';
      
      if (e.message?.includes('bucket not found') || e.message?.includes('Storage bucket')) {
        errorMessage = 'Storage bucket not found. Please set up the "product-images" bucket in Supabase.';
      } else if (e.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please check your storage bucket permissions.';
      } else if (e.message?.includes('size')) {
        errorMessage = 'File too large. Maximum file size is 5MB.';
      } else {
        errorMessage = `Upload failed: ${e.message || 'Unknown error'}`;
      }
      
      setUploadError(errorMessage);
      return [];
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!productToEdit) return;
    
    setIsUpdating(true);
    try {
      console.log('📝 Updating product:', productToEdit.id);
      if (editFormData.price <= 0) {
        setIsUpdating(false);
        setError('Price must be greater than 0');
        return;
      }
      if (editFormData.stock_quantity < 0) {
        setIsUpdating(false);
        setError('Stock quantity cannot be negative');
        return;
      }
      
      const { error } = await supabase
        .from('products')
        .update({
          name: editFormData.name,
          price: editFormData.price,
          stock_quantity: editFormData.stock_quantity,
          description: editFormData.description,
          is_active: editFormData.is_active,
          is_featured: editFormData.is_featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productToEdit.id);

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Product updated successfully');
      setSuccessMessage(`Product "${editFormData.name}" has been updated successfully!`);
      silentRefreshProducts(); // Use silent refresh
      setShowEditModal(false);
      setProductToEdit(null);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating product:', error);
      setError(error instanceof Error ? error.message : 'Failed to update product. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredProducts = products.filter(product => {
    // Safety check: ensure product exists and has required properties
    if (!product || typeof product !== 'object') {
      return false;
    }

    const matchesSearch = (product.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (product.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (product.barcode || '').includes(searchTerm);
    
    const matchesCategory = selectedCategory === '' || product.category_id === selectedCategory;
    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active);
    // Featured filter
    const matchesFeatured =
      featuredFilter === 'all' ||
      (featuredFilter === 'featured' && product.is_featured) ||
      (featuredFilter === 'not_featured' && !product.is_featured);
    // Stock filter
    const qty = product.stock_quantity || 0;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && qty > 0) ||
      (stockFilter === 'out_of_stock' && qty === 0) ||
      (stockFilter === 'low_stock' && qty > 0 && qty <= 5);
    
    return matchesSearch && matchesCategory && matchesStatus && matchesFeatured && matchesStock;
  });

  // Pagination (client-side)
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(totalItems, startIdx + pageSize);
  const paginatedProducts = filteredProducts.slice(startIdx, endIdx);

  const goToPage = (p: number) => {
    const page = Math.min(Math.max(1, p), totalPages);
    setCurrentPage(page);
    try { window?.scrollTo?.({ top: 0, behavior: 'smooth' }); } catch {}
  };

  // Inline toggles
  const toggleActive = async (product: Product) => {
    const next = !product.is_active;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: next } : p));
    const { error } = await supabase.from('products').update({ is_active: next, updated_at: new Date().toISOString() }).eq('id', product.id);
    if (error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !next } : p));
      setError('Failed to update active status');
    } else {
      setSuccessMessage(`Product "${product.name}" ${next ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  const toggleFeatured = async (product: Product) => {
    const next = !product.is_featured;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: next } : p));
    const { error } = await supabase.from('products').update({ is_featured: next, updated_at: new Date().toISOString() }).eq('id', product.id);
    if (error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: !next } : p));
      setError('Failed to update featured status');
    } else {
      setSuccessMessage(`Product "${product.name}" ${next ? 'marked as featured' : 'unfeatured'}.`);
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  // Convert database product to ProductCard format
  const convertToProductCardFormat = (product: Product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    original_price: product.compare_at_price || undefined,
    category: categories.find(c => c.id === product.category_id)?.name,
    image_url: product.images?.[0],
    featured: product.is_featured,
    description: product.description,
    in_stock: product.is_active && (product.stock_quantity || 0) > 0,
    stock_count: product.stock_quantity || 0,
    sku: product.sku,
  });

  const getStockStatus = (product: Product) => {
    const stockCount = product.stock_quantity || 0;
    if (stockCount === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    } else if (stockCount <= 5) {
      return { label: `${stockCount} left`, variant: 'secondary' as const };
    } else {
      return { label: 'In Stock', variant: 'default' as const };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600">Manage your inventory and add new products</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowScanner(true)} className="bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white hover:from-[#09215F] hover:to-[#97CF50] transition-all duration-300 shadow-lg hover:shadow-xl">
            <Scan className="h-4 w-4 mr-2" />
            Scan Barcode
          </Button>
          <Button onClick={() => setShowManualAdd(true)} className="bg-gradient-to-r from-[#97CF50] to-[#97CF50] text-white hover:from-[#09215F] hover:to-[#97CF50] transition-all duration-300 shadow-lg hover:shadow-xl">
            <Plus className="h-4 w-4 mr-2" />
            Manual Add
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl flex items-center shadow-lg">
          <AlertTriangle className="h-6 w-6 mr-3 text-red-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Storage Diagnostic - Only show if there are upload issues */}
      {(uploadError || error?.includes('upload') || error?.includes('storage')) && (
        <StorageDiagnostic />
      )}

      {/* Success Message Display */}
      {successMessage && (
        <div className="bg-green-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-center shadow-lg animate-in slide-in-from-top-2 duration-300">
          <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name, brand, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="w-44">
              <select
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Products</option>
                <option value="featured">Featured</option>
                <option value="not_featured">Not Featured</option>
              </select>
            </div>
            <div className="w-44">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock (≤5)</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.map(product => {
          const productCardData = convertToProductCardFormat(product);
          
          return (
            <div key={product.id} className="relative group">
              <ProductCard 
                product={productCardData}
                className="h-full"
                isAdmin={true}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                linkTo={`/admin/products/${product.id}`}
              />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity p-2 space-y-1">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={!!product.is_active} onChange={() => toggleActive(product)} />
                  <span>Active</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={!!product.is_featured} onChange={() => toggleFeatured(product)} />
                  <span>Featured</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">
          Showing {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-
          {Math.min(totalItems, (currentPage - 1) * pageSize + paginatedProducts.length)} of {totalItems}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-2 py-1 border rounded-md text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value) || 12)}
          >
            {[8, 12, 16, 24].map(s => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>Prev</Button>
          <span className="text-sm">Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))}</span>
          <Button variant="outline" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= Math.ceil(totalItems / pageSize)}>Next</Button>
        </div>
      </div>

      {/* Quick Start Guide */}
      {showQuickStart && !loading && (
        <QuickStartGuide onDatabaseInitialized={() => {
          setShowQuickStart(false);
          fetchProducts();
        }} />
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && !loading && !showQuickStart && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory 
                ? 'No products match your current filters.'
                : 'Get started by scanning a barcode or adding products manually.'
              }
            </p>
            <Button onClick={() => setShowScanner(true)} className="bg-[#97CF50] hover:bg-[#09215F]">
              <Scan className="h-4 w-4 mr-2" />
              Scan Your First Product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <FastBarcodeScanner
          onProductScanned={handleProductScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Manual Add Product Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 z-50">
          {/* Glass overlay (stronger scrim) */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity"></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            {/* Glass panel (near-opaque for readability) */}
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-black/5 dark:border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add New Product</h2>
                <button
                  onClick={() => setShowManualAdd(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <Input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      placeholder="Leave empty for auto-generation"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode
                    </label>
                    <BarcodeInput
                      value={formData.barcode}
                      onChange={(barcode) => setFormData({...formData, barcode})}
                      placeholder="Product barcode"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={formData.category_id}
                          onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select a category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                          className="px-3 py-2 bg-[#97CF50] text-white rounded-md hover:bg-[#09215F] transition-colors duration-200 text-sm"
                          title="Add New Category"
                        >
                          {showNewCategoryInput ? '✕' : '+'}
                        </button>
                      </div>
                      
                      {showNewCategoryInput && (
                        <div className="flex gap-2 p-3 bg-gray-50 rounded-md">
                          <Input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Enter new category name"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateCategory();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            disabled={isCreatingCategory || !newCategoryName.trim()}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
                          >
                            {isCreatingCategory ? '...' : 'Create'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewCategoryInput(false);
                              setNewCategoryName('');
                            }}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Description
                  </label>
                  <Input
                    type="text"
                    value={formData.short_description}
                    onChange={(e) => setFormData({...formData, short_description: e.target.value})}
                    placeholder="Brief product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detailed product description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price * (R)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Price (R)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Compare At Price (R)
                      <span className="text-xs text-gray-500 block font-normal">
                        Original price (must be higher than sale price)
                      </span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.compare_at_price}
                      onChange={(e) => setFormData({...formData, compare_at_price: e.target.value})}
                      placeholder="0.00"
                    />
                    {formData.compare_at_price && formData.price && 
                     parseFloat(formData.compare_at_price) <= parseFloat(formData.price) && (
                      <p className="text-red-500 text-xs mt-1">
                        Compare at price must be greater than regular price
                      </p>
                    )}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images
                  </label>
                  <div className="space-y-3">
                    {/* Image Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">Upload images or add URLs</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              const urls = await uploadImagesToStorage(files as File[]);
                              if (urls.length) {
                                const newImages = [...formData.images.filter(img => img), ...urls];
                                setFormData({ ...formData, images: newImages });
                              }
                            }}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer bg-[#97CF50]/10 text-[#97CF50] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#97CF50]/20 transition-colors"
                          >
                            Choose Files
                          </label>
                          <span className="text-gray-400 text-sm self-center">or</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newImages = [...formData.images, ''];
                              setFormData({...formData, images: newImages});
                            }}
                          >
                            Add URL
                          </Button>
                          {isUploadingImages && (
                            <span className="text-xs text-gray-500 self-center">Uploading...</span>
                          )}
                        </div>
                        {uploadError && (
                          <p className="text-red-600 text-sm mt-2">{uploadError}</p>
                        )}
                      </div>
                    </div>

                    {/* Image URLs List */}
                    {formData.images.map((image, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="url"
                            value={image}
                            onChange={(e) => {
                              const newImages = [...formData.images];
                              newImages[index] = e.target.value;
                              setFormData({...formData, images: newImages});
                            }}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newImages = formData.images.filter((_, i) => i !== index);
                              setFormData({...formData, images: newImages});
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        {/* Image Preview */}
                        {image && (
                          <div className="mt-2">
                            <img
                              src={image}
                              alt={`Preview ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-md border"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {formData.images.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No images added yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Features
                  </label>
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...formData.features];
                          newFeatures[index] = e.target.value;
                          setFormData({...formData, features: newFeatures});
                        }}
                        placeholder="Enter product feature"
                      />
                      {formData.features.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newFeatures = formData.features.filter((_, i) => i !== index);
                            setFormData({...formData, features: newFeatures});
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({...formData, features: [...formData.features, '']})}
                  >
                    Add Another Feature
                  </Button>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Featured Product</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.stock_tracking}
                      onChange={(e) => setFormData({...formData, stock_tracking: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Track Stock</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.requires_shipping}
                      onChange={(e) => setFormData({...formData, requires_shipping: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Requires Shipping</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowManualAdd(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || 
                      !formData.name || 
                      !formData.price ||
                      (formData.compare_at_price && formData.price && 
                       parseFloat(formData.compare_at_price) <= parseFloat(formData.price))
                    }
                  >
                    {isSubmitting ? 'Adding...' : 'Add Product'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 z-50 p-4">
          {/* Glass overlay (stronger scrim) */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
          <div className="relative max-w-md w-full mx-auto flex items-center justify-center min-h-[40vh]">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl p-8 w-full shadow-2xl border border-black/5 dark:border-white/10 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Trash2 className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Delete Product</h3>
              <p className="text-gray-600 text-lg">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 font-bold text-xl mt-2 mb-3">
                "{productToDelete.name}"?
              </p>
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-red-700 text-sm font-medium">
                  ⚠️ This action cannot be undone and will permanently remove the product from your inventory.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{ 
                  backgroundColor: '#dc2626', 
                  color: 'white',
                  minWidth: '150px',
                  minHeight: '50px'
                }}
                className="flex-1 px-6 py-3 rounded-xl hover:bg-red-700 transition-all duration-200 disabled:opacity-50 font-bold flex items-center justify-center shadow-lg"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5 mr-2" />
                    Delete Product
                  </>
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal - With Basic Form */}
      {showEditModal && productToEdit && (
        <div className="fixed inset-0 z-50">
          {/* Glass overlay (stronger scrim) */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl border border-black/5 dark:border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Product</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="h-6 w-6 transform rotate-45" />
              </button>
            </div>
            
            <form className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <Input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full"
                  placeholder="Enter product name"
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (R)
                  </label>
                  <Input
                    type="number"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({...editFormData, price: parseFloat(e.target.value) || 0})}
                    className="w-full"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <Input
                    type="number"
                    value={editFormData.stock_quantity}
                    onChange={(e) => setEditFormData({...editFormData, stock_quantity: parseInt(e.target.value) || 0})}
                    className="w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  placeholder="Enter product description"
                />
              </div>

              {/* Status Toggles */}
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({...editFormData, is_active: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editFormData.is_featured}
                    onChange={(e) => setEditFormData({...editFormData, is_featured: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Featured</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProduct}
                  disabled={isUpdating || !editFormData.name || editFormData.price <= 0}
                  className="flex-1 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-[#97CF50] to-[#97CF50] hover:from-[#09215F] hover:to-[#97CF50] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 font-semibold flex items-center justify-center"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}