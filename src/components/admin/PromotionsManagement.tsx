import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Tag, Percent, Gift, Users, BarChart3, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Promotion {
	id: string;
	name: string;
	description: string;
	code: string;
	type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
	value: number;
	minimum_order_amount: number;
	maximum_discount_amount?: number;
	start_date: string;
	end_date: string;
	is_active: boolean;
	usage_limit?: number;
	current_usage_count: number;
	usage_limit_per_customer: number;
	applies_to: 'all' | 'specific_products' | 'specific_categories';
	conditions: any;
	created_at: string;
	updated_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

export function PromotionsManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping',
    discount_value: '',
    minimum_order_amount: '',
    maximum_discount_amount: '',
    start_date: '',
    end_date: '',
    is_active: true,
    usage_limit: '',
    usage_limit_per_customer: '1',
    applies_to: 'all' as 'all' | 'specific_products' | 'specific_categories',
    selected_categories: [] as string[],
    selected_products: [] as string[],
  });

  useEffect(() => {
    if (user) {
      fetchPromotions();
      fetchCategories();
      fetchProducts();
    }
  }, [user]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching promotions...');
      
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (promotionsError) {
        console.error('❌ Error fetching promotions:', promotionsError);
        throw new Error(`Failed to fetch promotions: ${promotionsError.message}`);
      }

      console.log('✅ Promotions fetched:', promotionsData);
      setPromotions(promotionsData || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setError('Failed to load promotions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) {
        console.error('❌ Error fetching categories:', categoriesError);
        return;
      }

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, price')
        .eq('is_active', true)
        .order('name');

      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
        return;
      }

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      console.log('💾 Saving promotion...', formData);

      // Prepare promotion data mapped to DB schema
      const promotionData = {
        name: formData.title,
        description: formData.description,
        code: formData.code || null,
        type: formData.discount_type,
        value: parseFloat(formData.discount_value),
        minimum_order_amount: parseFloat(formData.minimum_order_amount) || 0,
        maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        usage_limit_per_customer: parseInt(formData.usage_limit_per_customer),
        applies_to: formData.applies_to,
        conditions: {},
        created_by: user?.id,
      };

      let promotionId: string;

      if (editingPromotion) {
        // Update existing promotion
        const { data, error } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id)
          .select()
          .single();

        if (error) throw error;
        promotionId = editingPromotion.id;
      } else {
        // Create new promotion
        const { data, error } = await supabase
          .from('promotions')
          .insert([promotionData])
          .select()
          .single();

        if (error) throw error;
        promotionId = data.id;
      }

      // Handle category associations
      if (formData.applies_to === 'specific_categories' && formData.selected_categories.length > 0) {
        // Delete existing associations
        await supabase
          .from('promotion_categories')
          .delete()
          .eq('promotion_id', promotionId);

        // Insert new associations
        const categoryAssociations = formData.selected_categories.map(categoryId => ({
          promotion_id: promotionId,
          category_id: categoryId,
        }));

        const { error: categoryError } = await supabase
          .from('promotion_categories')
          .insert(categoryAssociations);

        if (categoryError) throw categoryError;
      }

      // Handle product associations
      if (formData.applies_to === 'specific_products' && formData.selected_products.length > 0) {
        // Delete existing associations
        await supabase
          .from('promotion_products')
          .delete()
          .eq('promotion_id', promotionId);

        // Insert new associations
        const productAssociations = formData.selected_products.map(productId => ({
          promotion_id: promotionId,
          product_id: productId,
        }));

        const { error: productError } = await supabase
          .from('promotion_products')
          .insert(productAssociations);

        if (productError) throw productError;
      }

      console.log('✅ Promotion saved successfully');
      await fetchPromotions();
      resetForm();
      setShowCreateForm(false);
      setEditingPromotion(null);
    } catch (error) {
      console.error('Error saving promotion:', error);
      setError(error instanceof Error ? error.message : 'Failed to save promotion. Please try again.');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.name,
      description: promotion.description,
      code: promotion.code || '',
      discount_type: promotion.type,
      discount_value: promotion.value.toString(),
      minimum_order_amount: promotion.minimum_order_amount.toString(),
      maximum_discount_amount: promotion.maximum_discount_amount?.toString() || '',
      start_date: promotion.start_date.split('T')[0],
      end_date: promotion.end_date.split('T')[0],
      is_active: promotion.is_active,
      usage_limit: promotion.usage_limit?.toString() || '',
      usage_limit_per_customer: promotion.usage_limit_per_customer.toString(),
      applies_to: promotion.applies_to,
      selected_categories: [],
      selected_products: [],
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (promotionId: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotionId);

      if (error) throw error;

      console.log('✅ Promotion deleted successfully');
      await fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      setError('Failed to delete promotion. Please try again.');
    }
  };

  const togglePromotionStatus = async (promotionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !isActive })
        .eq('id', promotionId);

      if (error) throw error;

      console.log('✅ Promotion status updated');
      await fetchPromotions();
    } catch (error) {
      console.error('Error updating promotion status:', error);
      setError('Failed to update promotion status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      minimum_order_amount: '',
      maximum_discount_amount: '',
      start_date: '',
      end_date: '',
      is_active: true,
      usage_limit: '',
      usage_limit_per_customer: '1',
      applies_to: 'all',
      selected_categories: [],
      selected_products: [],
    });
  };

  const getDiscountText = (promotion: Promotion) => {
    switch (promotion.type) {
      case 'percentage':
        return `${promotion.value}% OFF`;
      case 'fixed_amount':
        return `$${promotion.value} OFF`;
      case 'free_shipping':
        return 'FREE SHIPPING';
      case 'buy_x_get_y':
        return 'BUY X GET Y';
      default:
        return 'DISCOUNT';
    }
  };

  const getStatusColor = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (!promotion.is_active) return 'bg-gray-100 text-gray-800';
    if (startDate > now) return 'bg-blue-100 text-blue-800';
    if (endDate < now) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (!promotion.is_active) return 'Inactive';
    if (startDate > now) return 'Scheduled';
    if (endDate < now) return 'Expired';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions & Hot Deals</h1>
          <p className="text-gray-600">Manage your promotional campaigns and special offers</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingPromotion(null);
            setShowCreateForm(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#4682B4] to-[#87CEEB] text-white hover:from-[#2C3E50] hover:to-[#4682B4] transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          Create Promotion
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Promotions</p>
                <p className="text-2xl font-bold text-gray-900">{promotions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Promotions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotions.filter(p => {
                    const now = new Date();
                    const startDate = new Date(p.start_date);
                    const endDate = new Date(p.end_date);
                    return p.is_active && startDate <= now && endDate >= now;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Usage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotions.reduce((sum, p) => sum + p.current_usage_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg. Discount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotions.length > 0 
                    ? Math.round(promotions.reduce((sum, p) => sum + (p.type === 'percentage' ? p.value : 0), 0) / promotions.filter(p => p.type === 'percentage').length || 0)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}</CardTitle>
            <CardDescription>
              Set up promotional campaigns to drive sales and customer engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Summer Sale 2024"
                    required
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Code
                  </label>
                  <Input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SUMMER20"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your promotion..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Discount Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed_amount">Fixed Amount Off</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                  </select>
                </div>

                {/* Discount Value */}
                {formData.discount_type !== 'free_shipping' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === 'percentage' ? '20' : '10.00'}
                      required
                    />
                  </div>
                )}

                {/* Minimum Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Order Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applies To
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={formData.applies_to === 'all'}
                      onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                      className="mr-2"
                    />
                    All Products
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="specific_categories"
                      checked={formData.applies_to === 'specific_categories'}
                      onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                      className="mr-2"
                    />
                    Specific Categories
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="specific_products"
                      checked={formData.applies_to === 'specific_products'}
                      onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                      className="mr-2"
                    />
                    Specific Products
                  </label>
                </div>
              </div>

              {/* Category Selection */}
              {formData.applies_to === 'specific_categories' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Categories
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.selected_categories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selected_categories: [...formData.selected_categories, category.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selected_categories: formData.selected_categories.filter(id => id !== category.id)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Selection */}
              {formData.applies_to === 'specific_products' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Products
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {products.map((product) => (
                      <label key={product.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={formData.selected_products.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selected_products: [...formData.selected_products, product.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selected_products: formData.selected_products.filter(id => id !== product.id)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <div>
                          <div className="text-sm font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">SKU: {product.sku} | ${product.price}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Usage Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Usage Limit
                  </label>
                  <Input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>

                {/* Per Customer Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Per Customer Limit
                  </label>
                  <Input
                    type="number"
                    value={formData.usage_limit_per_customer}
                    onChange={(e) => setFormData({ ...formData, usage_limit_per_customer: e.target.value })}
                    placeholder="1"
                    required
                  />
                </div>

                {/* Max Discount Amount */}
                {formData.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Discount Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.maximum_discount_amount}
                      onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                      placeholder="No limit"
                    />
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Activate promotion immediately
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingPromotion(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#4682B4] to-[#87CEEB] text-white hover:from-[#2C3E50] hover:to-[#4682B4] transition-all duration-300 shadow-lg hover:shadow-xl">
                  {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promotions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {promotions.map((promotion) => (
          <Card key={promotion.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{promotion.name}</CardTitle>
                  {promotion.code && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        CODE: {promotion.code}
                      </Badge>
                    </div>
                  )}
                </div>
                <Badge className={getStatusColor(promotion)}>
                  {getStatusText(promotion)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Discount Display */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {getDiscountText(promotion)}
                </div>
                {promotion.minimum_order_amount > 0 && (
                  <div className="text-sm text-gray-600">
                    Min. order: ${promotion.minimum_order_amount}
                  </div>
                )}
              </div>

              {/* Description */}
              {promotion.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {promotion.description}
                </p>
              )}

              {/* Dates */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Start: {new Date(promotion.start_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  End: {new Date(promotion.end_date).toLocaleDateString()}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Used: {promotion.current_usage_count}</span>
                <span>
                  Limit: {promotion.usage_limit || 'Unlimited'}
                </span>
              </div>

              {/* Applies To */}
              <div className="text-xs text-gray-500">
                Applies to: {promotion.applies_to.replace('_', ' ')}
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(promotion)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePromotionStatus(promotion.id, promotion.is_active)}
                  >
                    {promotion.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(promotion.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {promotions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No promotions yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first promotion to start driving sales and customer engagement.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
              className="bg-gradient-to-r from-[#4682B4] to-[#87CEEB] text-white hover:from-[#2C3E50] hover:to-[#4682B4] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Create Your First Promotion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
