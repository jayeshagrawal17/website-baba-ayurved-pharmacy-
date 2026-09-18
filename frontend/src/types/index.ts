export interface User {
  id: string;
  phone: string;
  username?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  images: string[];
  ingredients: string;
  benefits: string;
  how_to_use: string;
  stock_quantity: number;
  is_featured: boolean;
  is_bestseller: boolean;
  show_in_hero: boolean;  // Show product image in homepage hero carousel
  rating: number;
  tags: string | null;  // Health concern tags
  created_at: string;
  updated_at: string;
  // Shipping fields (for admin only, not shown in customer UI)
  weight?: number;   // Weight in kg
  length?: number;   // Length in cm
  width?: number;    // Width in cm
  height?: number;   // Height in cm
  // Product details
  gst_number?: string;          // GST Number (e.g., 27AABCU9603R1ZM)
  hsn_code?: string;            // HSN Code for tax purposes
  product_type?: 'veg' | 'non-veg';  // Vegetarian or Non-Vegetarian
  country_of_origin?: string;   // Country of Origin (e.g., India)
  cod_enabled?: boolean;        // Cash on Delivery enabled by owner
  quantity_pricing?: QuantityPrice[];  // Multiple quantity pricing options
}

export interface QuantityPrice {
  quantity: number;
  price: number;
  original_price?: number;  // Optional original price to show discount
  label?: string;  // Optional label like "1 Bottle", "Pack of 3", etc.
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedQuantityOption?: QuantityPrice;  // Selected quantity pricing option
}
