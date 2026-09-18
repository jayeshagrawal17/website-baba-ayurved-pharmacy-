// Centralized API service for all backend communications
// This replaces direct Supabase database access for production security

// Remove trailing slash from API_BASE_URL to prevent double slashes
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic fetch wrapper with error handling
  private async fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // PRODUCTS API
  async getProducts(params: {
    category?: string;
    featured?: boolean;
    bestseller?: boolean;
    show_in_hero?: boolean;
    tags?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    const queryParams = new URLSearchParams();
    
    if (params.category) queryParams.set('category', params.category);
    if (params.featured !== undefined) queryParams.set('featured', params.featured.toString());
    if (params.bestseller !== undefined) queryParams.set('bestseller', params.bestseller.toString());
    if (params.show_in_hero !== undefined) queryParams.set('show_in_hero', params.show_in_hero.toString());
    if (params.tags) queryParams.set('tags', params.tags);
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const endpoint = `/products${queryParams.toString() ? `?${queryParams}` : ''}`;
    const result = await this.fetchAPI(endpoint);
    return result.data;
  }

  async getProduct(productId: string): Promise<any> {
    const result = await this.fetchAPI(`/products/${productId}`);
    return result.data;
  }

  async createProduct(productData: {
    name: string;
    description: string;
    price: number;
    original_price?: number | null;
    category_id?: string | null;
    image_url?: string;
    images?: string | null;
    is_featured?: boolean;
    is_bestseller?: boolean;
    show_in_hero?: boolean;
    cod_enabled?: boolean;
    rating?: number;
    stock_quantity?: number;
    tags?: string | null;
    ingredients?: string | null;
    benefits?: string | null;
    how_to_use?: string | null;
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    gst_number?: string | null;
    hsn_code?: string | null;
    product_type?: string | null;
    country_of_origin?: string | null;
    quantity_pricing?: any[] | null;
  }): Promise<any> {
    const result = await this.fetchAPI('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return result.data;
  }

  async updateProduct(productId: string, productData: {
    name?: string;
    description?: string;
    price?: number;
    original_price?: number | null;
    category_id?: string | null;
    image_url?: string;
    images?: string | null;
    is_featured?: boolean;
    is_bestseller?: boolean;
    show_in_hero?: boolean;
    cod_enabled?: boolean;
    rating?: number;
    stock_quantity?: number;
    tags?: string | null;
    ingredients?: string | null;
    benefits?: string | null;
    how_to_use?: string | null;
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    gst_number?: string | null;
    hsn_code?: string | null;
    product_type?: string | null;
    country_of_origin?: string | null;
    quantity_pricing?: any[] | null;
  }): Promise<any> {
    const result = await this.fetchAPI(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return result.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.fetchAPI(`/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateProducts(products: any[]): Promise<any[]> {
    const result = await this.fetchAPI('/products/bulk', {
      method: 'POST',
      body: JSON.stringify(products),
    });
    return result.data;
  }

  // CATEGORIES API
  async getCategories(limit?: number): Promise<any[]> {
    const endpoint = limit ? `/categories?limit=${limit}` : '/categories';
    const result = await this.fetchAPI(endpoint);
    return result.data;
  }

  async createCategory(categoryData: {
    name: string;
    description?: string;
    image_url?: string;
  }): Promise<any> {
    const result = await this.fetchAPI('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return result.data;
  }

  async updateCategory(categoryId: string, categoryData: {
    name?: string;
    description?: string;
    image_url?: string;
  }): Promise<any> {
    const result = await this.fetchAPI(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
    return result.data;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.fetchAPI(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // ORDERS API
  async getUserOrders(userId: string): Promise<any[]> {
    const result = await this.fetchAPI(`/orders/${userId}`);
    return result.orders;
  }

  async createOrder(orderData: {
    user_id: string;
    order_number: string;
    items: any[];
    total_amount: number;
    phone: string;
    payment_method: string;
    payment_status: string;
    payment_id: string;
    razorpay_order_id: string;
    razorpay_signature?: string;
    payment_gateway: string;
    payment_amount: number;
    payment_currency: string;
    payment_captured: boolean;
    payment_completed_at: string;
  }): Promise<{ order_id: string; order_number: string }> {
    const result = await this.fetchAPI('/create-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return result;
  }

  // PAYMENT API
  async createPaymentOrder(orderData: {
    amount: number;
    currency: string;
    receipt: string;
  }): Promise<any> {
    return await this.fetchAPI('/create-payment-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async verifyPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
  }): Promise<any> {
    return await this.fetchAPI('/verify-payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // USER MANAGEMENT API
  async createUser(userData: {
    phone: string;
    username?: string;
    email?: string;
  }): Promise<{
    success: boolean;
    user: any;
    is_new_user: boolean;
    message: string;
  }> {
    return await this.fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserByPhone(phone: string): Promise<{
    success: boolean;
    user: any;
    is_new_user: boolean;
  }> {
    const encodedPhone = encodeURIComponent(phone);
    return await this.fetchAPI(`/users/by-phone/${encodedPhone}`);
  }

  async getUserById(userId: string): Promise<{
    success: boolean;
    user: any;
  }> {
    return await this.fetchAPI(`/users/${userId}`);
  }

  async updateUser(userId: string, userData: {
    username?: string;
    email?: string;
    address?: string;
  }): Promise<{
    success: boolean;
    user: any;
    message: string;
  }> {
    return await this.fetchAPI(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }
}

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;