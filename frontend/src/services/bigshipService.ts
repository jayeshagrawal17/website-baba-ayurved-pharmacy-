/**
 * Bigship Delivery Service Integration
 * Frontend service for shipment management
 */

// API Base URL from environment variable - remove trailing slash to prevent double slashes
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export interface CourierInfo {
  shipment_category: string;
  courier_id: number;
  courier_name: string;
  courier_type: string;
  courier_status: boolean;
  admin_status: boolean;
}

export interface ShippingRate {
  courier_id: number;
  courier_name: string;
  courier_type: string;
  zone: string;
  tat: number;
  billable_weight: number;
  total_shipping_charges: number;
  courier_charge: number;
}

export interface CalculateRatesParams {
  pickup_pincode: string;
  destination_pincode: string;
  payment_type: 'COD' | 'Prepaid';
  invoice_amount: number;
  weight: number;  // in kg
  length: number;  // in cm
  width: number;   // in cm
  height: number;  // in cm
}

export interface ShipmentItem {
  name: string;
  quantity: number;
  price: number;
  cod_amount?: number;
  category?: string;
}

export interface CreateShipmentParams {
  order_id: string;
  pickup_warehouse_id: number;
  return_warehouse_id: number;
  
  // Customer details
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email?: string;
  
  // Delivery address
  address_line1: string;
  address_line2?: string;
  address_landmark?: string;
  pincode: string;
  city: string;
  state: string;
  
  // Order details
  payment_type: 'COD' | 'Prepaid';
  invoice_amount: number;
  cod_amount?: number;
  
  // Package details
  weight: number;
  length: number;
  width: number;
  height: number;
  
  // Items
  items: ShipmentItem[];
  
  // Optional courier preference
  preferred_courier_id?: number;
}

export interface ShipmentResponse {
  system_order_id: string;
  awb_number: string;
  courier_name: string;
  courier_id: number;
  label?: any;
  available_rates?: ShippingRate[];
}

export interface TrackingEvent {
  scan_datetime: string;
  scan_status: string;
  scan_remarks: string;
  scan_location: string;
}

export interface TrackingData {
  order_detail: {
    courier_name: string;
    tracking_type: string;
    tracking_id: string;
    invoice_id: string;
    order_manifest_datetime: string;
    current_tracking_datetime: string;
    current_tracking_status: string;
  };
  scan_histories: TrackingEvent[];
}

export interface Warehouse {
  warehouse_id: number;
  warehouse_name: string;
  address_line1: string;
  address_line2?: string;
  address_landmark?: string;
  address_pincode: string;
  address_city: string;
  address_state: string;
  warehouse_contact_person: string;
  warehouse_contact_number_primary: string;
  create_date: string;
}

class BigshipService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

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
      console.error(`Bigship API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Get list of available courier partners
   */
  async getCouriers(): Promise<CourierInfo[]> {
    const response = await this.fetchAPI('/bigship/couriers');
    return response.data || [];
  }

  /**
   * Get available payment categories (COD, Prepaid)
   */
  async getPaymentCategories(): Promise<any[]> {
    const response = await this.fetchAPI('/bigship/payment-categories');
    return response.data || [];
  }

  /**
   * Get current wallet balance
   */
  async getWalletBalance(): Promise<number> {
    const response = await this.fetchAPI('/bigship/wallet-balance');
    return response.balance || 0;
  }

  /**
   * Get list of registered warehouses
   */
  async getWarehouses(pageIndex: number = 1, pageSize: number = 10): Promise<{
    result_count: number;
    result_data: Warehouse[];
  }> {
    const response = await this.fetchAPI(
      `/bigship/warehouses?page_index=${pageIndex}&page_size=${pageSize}`
    );
    return response.data || { result_count: 0, result_data: [] };
  }

  /**
   * Calculate shipping rates for different couriers
   */
  async calculateRates(params: CalculateRatesParams): Promise<ShippingRate[]> {
    const response = await this.fetchAPI('/bigship/calculate-rates', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.data || [];
  }

  /**
   * Create a shipment and get AWB number
   */
  async createShipment(params: CreateShipmentParams): Promise<ShipmentResponse> {
    const response = await this.fetchAPI('/bigship/create-shipment', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to create shipment');
    }
    
    return response.data;
  }

  /**
   * Track shipment by AWB or LRN number
   */
  async trackShipment(
    trackingId: string,
    trackingType: 'awb' | 'lrn' = 'awb'
  ): Promise<TrackingData> {
    const response = await this.fetchAPI(
      `/bigship/track/${trackingId}?tracking_type=${trackingType}`
    );
    
    if (!response.success) {
      throw new Error('Tracking information not found');
    }
    
    return response.data;
  }

  /**
   * Cancel one or more shipments
   */
  async cancelShipment(awbNumbers: string[]): Promise<any[]> {
    const response = await this.fetchAPI('/bigship/cancel-shipment', {
      method: 'POST',
      body: JSON.stringify(awbNumbers),
    });
    return response.data || [];
  }

  /**
   * Get shipment details by internal order ID
   */
  async getShipmentByOrder(orderId: string): Promise<any> {
    const response = await this.fetchAPI(`/bigship/shipment/${orderId}`);
    return response.data;
  }

  /**
   * Helper: Calculate package dimensions from cart items
   * You can customize this based on your product data
   */
  calculatePackageDimensions(items: any[]): {
    weight: number;
    length: number;
    width: number;
    height: number;
  } {
    // Default package size for small items
    const defaultDimensions = {
      weight: 0.5,  // 500g default
      length: 20,   // 20cm
      width: 15,    // 15cm
      height: 10,   // 10cm
    };

    // Calculate total weight based on quantity
    let totalWeight = 0;
    items.forEach(item => {
      // Assuming each item weighs 100g by default
      const itemWeight = item.weight || 0.1;
      totalWeight += itemWeight * item.quantity;
    });

    // Adjust dimensions based on weight
    if (totalWeight <= 0.5) {
      return { ...defaultDimensions, weight: totalWeight || 0.5 };
    } else if (totalWeight <= 2) {
      return {
        weight: totalWeight,
        length: 30,
        width: 20,
        height: 15,
      };
    } else {
      return {
        weight: totalWeight,
        length: 40,
        width: 30,
        height: 20,
      };
    }
  }

  /**
   * Format address for Bigship requirements
   */
  formatAddress(address: string): {
    address_line1: string;
    address_line2: string;
  } {
    // Split address into two lines (max 50 chars each)
    const maxLength = 50;
    
    if (address.length <= maxLength) {
      return {
        address_line1: address.padEnd(10, ' ').substring(0, maxLength),
        address_line2: '',
      };
    }
    
    // Try to split at comma or space
    const splitIndex = address.lastIndexOf(',', maxLength) || 
                      address.lastIndexOf(' ', maxLength) || 
                      maxLength;
    
    return {
      address_line1: address.substring(0, splitIndex).trim(),
      address_line2: address.substring(splitIndex + 1).trim().substring(0, maxLength),
    };
  }

  /**
   * Validate pincode format
   */
  isValidPincode(pincode: string): boolean {
    return /^\d{6}$/.test(pincode);
  }

  /**
   * Validate phone number format
   */
  isValidPhone(phone: string): boolean {
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return /^[6789]\d{9}$/.test(cleanPhone);
  }
}

export const bigshipService = new BigshipService();
export default bigshipService;
