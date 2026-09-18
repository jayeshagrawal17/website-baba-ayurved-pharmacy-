import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Upload, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Category, Product, QuantityPrice } from '../types';
import { apiService } from '../services/apiService';

// Note: Still using direct Supabase for image uploads as this requires storage access

interface ProductFormProps {
  editProduct?: Product | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ProductForm({ editProduct, onSuccess, onCancel }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAdditionalImage, setUploadingAdditionalImage] = useState(false);
  const [quantityPricing, setQuantityPricing] = useState<QuantityPrice[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    original_price: '',
    image_url: '',
    images: '',
    ingredients: '',
    benefits: '',
    how_to_use: '',
    stock_quantity: '',
    is_featured: false,
    is_bestseller: false,
    show_in_hero: false,
    cod_enabled: false,
    tags: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    gst_number: '',
    hsn_code: '',
    product_type: '',
    country_of_origin: '',
  });

  useEffect(() => {
    loadCategories();
    if (editProduct) {
      setFormData({
        name: editProduct.name,
        category_id: editProduct.category_id || '',
        description: editProduct.description,
        price: editProduct.price.toString(),
        original_price: editProduct.original_price?.toString() || '',
        image_url: editProduct.image_url,
        images: editProduct.images?.filter(img => img !== editProduct.image_url).join(', ') || '',
        ingredients: editProduct.ingredients,
        benefits: editProduct.benefits,
        how_to_use: editProduct.how_to_use,
        stock_quantity: editProduct.stock_quantity.toString(),
        is_featured: editProduct.is_featured,
        is_bestseller: editProduct.is_bestseller,
        show_in_hero: editProduct.show_in_hero || false,
        cod_enabled: editProduct.cod_enabled || false,
        tags: editProduct.tags || '',
        weight: editProduct.weight?.toString() || '',
        length: editProduct.length?.toString() || '',
        width: editProduct.width?.toString() || '',
        height: editProduct.height?.toString() || '',
        gst_number: editProduct.gst_number || '',
        hsn_code: editProduct.hsn_code || '',
        product_type: editProduct.product_type || '',
        country_of_origin: editProduct.country_of_origin || '',
      });
      // Load quantity pricing if available
      if (editProduct.quantity_pricing && editProduct.quantity_pricing.length > 0) {
        setQuantityPricing(editProduct.quantity_pricing);
      }
    }
  }, [editProduct]);

  const loadCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addQuantityOption = () => {
    setQuantityPricing([...quantityPricing, { quantity: 1, price: 0, label: '' }]);
  };

  const removeQuantityOption = (index: number) => {
    setQuantityPricing(quantityPricing.filter((_, i) => i !== index));
  };

  const updateQuantityOption = (index: number, field: keyof QuantityPrice, value: string | number) => {
    const updated = [...quantityPricing];
    if (field === 'quantity' || field === 'price' || field === 'original_price') {
      updated[index][field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else {
      updated[index][field] = value as string;
    }
    setQuantityPricing(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      e.target.value = ''; // Reset input
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      e.target.value = ''; // Reset input
      return;
    }

    setUploadingImage(true);
    setError('');
    
    // Small delay to ensure UI updates before starting heavy upload operation
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      setSuccess('Image uploaded successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image. Please check if the storage bucket exists.');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Reset input to allow re-upload
    }
  };

  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      e.target.value = ''; // Reset input
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      e.target.value = ''; // Reset input
      return;
    }

    setUploadingAdditionalImage(true);
    setError('');
    
    // Small delay to ensure UI updates before starting heavy upload operation
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Append to existing images
      setFormData((prev) => ({
        ...prev,
        images: prev.images ? `${prev.images}, ${publicUrl}` : publicUrl
      }));
      setSuccess('Additional image uploaded successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload additional image. Please check if the storage bucket exists.');
    } finally {
      setUploadingAdditionalImage(false);
      e.target.value = ''; // Reset input to allow re-upload
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editProduct) {
        const updateData: any = {
          name: formData.name,
          description: formData.description || '',
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          category_id: formData.category_id || null,
          image_url: formData.image_url,
          images: formData.images || null,
          is_featured: formData.is_featured,
          is_bestseller: formData.is_bestseller,
          show_in_hero: formData.show_in_hero,
          cod_enabled: formData.cod_enabled,
          rating: editProduct.rating || 5.0,
          stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
          tags: formData.tags || null,
          ingredients: formData.ingredients || null,
          benefits: formData.benefits || null,
          how_to_use: formData.how_to_use || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          length: formData.length ? parseInt(formData.length) : null,
          width: formData.width ? parseInt(formData.width) : null,
          height: formData.height ? parseInt(formData.height) : null,
          gst_number: formData.gst_number || null,
          hsn_code: formData.hsn_code || null,
          product_type: formData.product_type || null,
          country_of_origin: formData.country_of_origin || null,
          quantity_pricing: quantityPricing.length > 0 ? quantityPricing : null,
        };

        await apiService.updateProduct(editProduct.id, updateData);
        setSuccess('Product updated successfully!');
      } else {
        const createData = {
          name: formData.name,
          description: formData.description || '',
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          category_id: formData.category_id || null,
          image_url: formData.image_url,
          images: formData.images || null,
          is_featured: formData.is_featured,
          is_bestseller: formData.is_bestseller,
          show_in_hero: formData.show_in_hero,
          cod_enabled: formData.cod_enabled,
          rating: 5.0,
          stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
          tags: formData.tags || null,
          ingredients: formData.ingredients || null,
          benefits: formData.benefits || null,
          how_to_use: formData.how_to_use || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          length: formData.length ? parseInt(formData.length) : null,
          width: formData.width ? parseInt(formData.width) : null,
          height: formData.height ? parseInt(formData.height) : null,
          gst_number: formData.gst_number || null,
          hsn_code: formData.hsn_code || null,
          product_type: formData.product_type || null,
          country_of_origin: formData.country_of_origin || null,
          quantity_pricing: quantityPricing.length > 0 ? quantityPricing : null,
        };

        await apiService.createProduct(createData);
        setSuccess('Product added successfully!');
        
        // Reset form for new entries
        setFormData({
          name: '',
          category_id: '',
          description: '',
          price: '',
          original_price: '',
          image_url: '',
          images: '',
          ingredients: '',
          benefits: '',
          how_to_use: '',
          stock_quantity: '',
          is_featured: false,
          is_bestseller: false,
          show_in_hero: false,
          cod_enabled: false,
          tags: '',
          weight: '',
          length: '',
          width: '',
          height: '',
          gst_number: '',
          hsn_code: '',
          product_type: '',
          country_of_origin: '',
        });
        setQuantityPricing([]);
      }

      setTimeout(() => {
        setSuccess('');
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {editProduct ? 'Edit Product' : 'Add New Product'}
        </h2>
        {editProduct && onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., Ashwagandha Capsules"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Health Concern Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Health Concern Tag *
          </label>
          <select
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Select a health concern</option>
            <option value="Period">Period</option>
            <option value="Sexual">Sexual</option>
            <option value="Immunity">Immunity</option>
            <option value="Mind">Mind</option>
            <option value="Stomach">Stomach</option>
            <option value="Lungs">Lungs</option>
            <option value="Liver">Liver</option>
            <option value="Ortho">Ortho</option>
            <option value="Dental">Dental</option>
            <option value="Eyes">Eyes</option>
            <option value="Piles">Piles</option>
            <option value="Baby">Baby</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Select the primary health concern this product addresses
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Detailed product description"
          />
        </div>

        {/* Price Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (₹) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="299.99"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Price (₹) *
            </label>
            <input
              type="number"
              name="original_price"
              value={formData.original_price}
              onChange={handleInputChange}
              required
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="399.99"
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Main Product Image *
          </label>
          <div className="space-y-3">
            {formData.image_url && (
              <div className="relative w-32 h-32">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                uploadingImage 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white whitespace-nowrap`}>
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload Image</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                required
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Or enter image URL"
              />
            </div>
            <p className="text-xs text-gray-500">
              Upload an image from your computer or paste an image URL
            </p>
          </div>
        </div>

        {/* Additional Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Images
          </label>
          <div className="space-y-3">
            {formData.images && (
              <div className="flex flex-wrap gap-2">
                {formData.images.split(',').map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24">
                    <img
                      src={img.trim()}
                      alt={`Additional ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                uploadingAdditionalImage 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white whitespace-nowrap`}>
                {uploadingAdditionalImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload Image</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAdditionalImageUpload}
                  className="hidden"
                  disabled={uploadingAdditionalImage}
                />
              </label>
              <input
                type="text"
                name="images"
                value={formData.images}
                onChange={handleInputChange}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Or enter comma-separated URLs"
              />
            </div>
            <p className="text-xs text-gray-500">
              Upload multiple images one by one, or paste comma-separated URLs
            </p>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ingredients
          </label>
          <textarea
            name="ingredients"
            value={formData.ingredients}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="List of ingredients"
          />
        </div>

        {/* Benefits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
          <textarea
            name="benefits"
            value={formData.benefits}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Health benefits"
          />
        </div>

        {/* How to Use */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How to Use
          </label>
          <textarea
            name="how_to_use"
            value={formData.how_to_use}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Usage instructions"
          />
        </div>

        {/* Stock Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock Quantity
          </label>
          <input
            type="number"
            name="stock_quantity"
            value={formData.stock_quantity}
            onChange={handleInputChange}
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="100"
          />
        </div>

        {/* Product Details Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Product Details *
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GST Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number *
              </label>
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleInputChange}
                required
                maxLength={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                placeholder="e.g., 27AABCU9603R1ZM"
              />
              <p className="mt-1 text-xs text-gray-500">15-character GST identification number</p>
            </div>

            {/* HSN Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HSN Code *
              </label>
              <input
                type="text"
                name="hsn_code"
                value={formData.hsn_code}
                onChange={handleInputChange}
                required
                maxLength={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., 30049099"
              />
              <p className="mt-1 text-xs text-gray-500">Harmonized System of Nomenclature code</p>
            </div>

            {/* Product Type (Veg/Non-Veg) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type *
              </label>
              <select
                name="product_type"
                value={formData.product_type}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Type</option>
                <option value="veg">🟢 Vegetarian</option>
                <option value="non-veg">🔴 Non-Vegetarian</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Indicate if product is veg or non-veg</p>
            </div>

            {/* Country of Origin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country of Origin *
              </label>
              <input
                type="text"
                name="country_of_origin"
                value={formData.country_of_origin}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="India"
              />
              <p className="mt-1 text-xs text-gray-500">Country where product is manufactured</p>
            </div>
          </div>
        </div>

        {/* Shipping Dimensions Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Shipping Dimensions *
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Enter package dimensions for accurate shipping cost calculations. All fields are required.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg) *
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.5"
              />
              <p className="mt-1 text-xs text-gray-500">Package weight in kilograms</p>
            </div>

            {/* Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length (cm) *
              </label>
              <input
                type="number"
                name="length"
                value={formData.length}
                onChange={handleInputChange}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="20"
              />
              <p className="mt-1 text-xs text-gray-500">Package length in centimeters</p>
            </div>

            {/* Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Width (cm) *
              </label>
              <input
                type="number"
                name="width"
                value={formData.width}
                onChange={handleInputChange}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="15"
              />
              <p className="mt-1 text-xs text-gray-500">Package width in centimeters</p>
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height (cm) *
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="10"
              />
              <p className="mt-1 text-xs text-gray-500">Package height in centimeters</p>
            </div>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex items-center space-x-6 flex-wrap gap-y-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_featured"
              checked={formData.is_featured}
              onChange={handleInputChange}
              className="w-5 h-5 text-green-600 focus:ring-green-500 rounded"
            />
            <span className="text-gray-700 font-medium">Featured Product</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_bestseller"
              checked={formData.is_bestseller}
              onChange={handleInputChange}
              className="w-5 h-5 text-green-600 focus:ring-green-500 rounded"
            />
            <span className="text-gray-700 font-medium">Bestseller</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="show_in_hero"
              checked={formData.show_in_hero}
              onChange={handleInputChange}
              className="w-5 h-5 text-green-600 focus:ring-green-500 rounded"
            />
            <span className="text-gray-700 font-medium">Show in Hero Carousel</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="cod_enabled"
              checked={formData.cod_enabled}
              onChange={handleInputChange}
              className="w-5 h-5 text-green-600 focus:ring-green-500 rounded"
            />
            <span className="text-gray-700 font-medium">Enable Cash on Delivery</span>
          </label>
        </div>

        {/* Quantity Pricing Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-gray-700 font-semibold">Quantity Pricing Options</label>
            <button
              type="button"
              onClick={addQuantityOption}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Option
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Add quantity-based pricing options (e.g., buy 3 for ₹270, buy 6 for ₹500). Leave empty to use single unit pricing only.
          </p>
          
          {quantityPricing.length > 0 && (
            <div className="space-y-3">
              {quantityPricing.map((option, index) => (
                <div key={index} className="flex gap-3 items-start p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={option.quantity}
                        onChange={(e) => updateQuantityOption(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={option.price}
                        onChange={(e) => updateQuantityOption(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., 270"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={option.original_price || ''}
                        onChange={(e) => updateQuantityOption(index, 'original_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., 300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label (Optional)</label>
                      <input
                        type="text"
                        value={option.label || ''}
                        onChange={(e) => updateQuantityOption(index, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., Pack of 3"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuantityOption(index)}
                    className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Remove option"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || uploadingImage || uploadingAdditionalImage}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
