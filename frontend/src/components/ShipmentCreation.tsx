import React, { useState, useEffect } from 'react';
import { bigshipService, type ShippingRate, type CreateShipmentParams } from '../services/bigshipService';

interface ShipmentCreationProps {
  orderId: string;
  customerDetails: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  deliveryAddress: {
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    pincode: string;
  };
  orderDetails: {
    items: any[];
    totalAmount: number;
    paymentType: 'COD' | 'Prepaid';
    codAmount?: number;
  };
  onShipmentCreated?: (shipmentData: any) => void;
  onError?: (error: string) => void;
}

const ShipmentCreation: React.FC<ShipmentCreationProps> = ({
  orderId,
  customerDetails,
  deliveryAddress,
  orderDetails,
  onShipmentCreated,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Default warehouse ID from environment or first warehouse
  const DEFAULT_WAREHOUSE_ID = parseInt(import.meta.env.VITE_BIGSHIP_WAREHOUSE_ID || '0');
  const DEFAULT_PICKUP_PINCODE = import.meta.env.VITE_PICKUP_PINCODE || '110001';

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const result = await bigshipService.getWarehouses(1, 50);
      setWarehouses(result.result_data);
      
      if (DEFAULT_WAREHOUSE_ID && result.result_data.some((w: any) => w.warehouse_id === DEFAULT_WAREHOUSE_ID)) {
        setSelectedWarehouse(DEFAULT_WAREHOUSE_ID);
      } else if (result.result_data.length > 0) {
        setSelectedWarehouse(result.result_data[0].warehouse_id);
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const estimateShippingCost = async () => {
    if (!deliveryAddress.pincode || deliveryAddress.pincode.length !== 6) {
      onError?.('Please enter a valid 6-digit pincode');
      return;
    }

    setEstimating(true);
    try {
      const dimensions = bigshipService.calculatePackageDimensions(orderDetails.items);
      
      const rates = await bigshipService.calculateRates({
        pickup_pincode: DEFAULT_PICKUP_PINCODE,
        destination_pincode: deliveryAddress.pincode,
        payment_type: orderDetails.paymentType,
        invoice_amount: orderDetails.totalAmount,
        ...dimensions,
      });

      setShippingRates(rates);
      
      // Auto-select cheapest courier
      if (rates.length > 0) {
        const cheapest = rates.reduce((prev, current) => 
          prev.total_shipping_charges < current.total_shipping_charges ? prev : current
        );
        setSelectedCourier(cheapest.courier_id);
      }
    } catch (error: any) {
      onError?.(error.message || 'Failed to calculate shipping rates');
    } finally {
      setEstimating(false);
    }
  };

  const createShipment = async () => {
    if (!selectedWarehouse) {
      onError?.('Please select a warehouse');
      return;
    }

    setLoading(true);
    try {
      const dimensions = bigshipService.calculatePackageDimensions(orderDetails.items);
      
      // Prepare items for shipment
      const shipmentItems = orderDetails.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        cod_amount: orderDetails.paymentType === 'COD' 
          ? (item.price * item.quantity) 
          : 0,
        category: item.category || 'Others',
      }));

      const shipmentParams: CreateShipmentParams = {
        order_id: orderId,
        pickup_warehouse_id: selectedWarehouse,
        return_warehouse_id: selectedWarehouse,
        
        customer_first_name: customerDetails.firstName,
        customer_last_name: customerDetails.lastName,
        customer_phone: customerDetails.phone.replace(/[\s\-\(\)]/g, ''),
        customer_email: customerDetails.email,
        
        address_line1: deliveryAddress.addressLine1,
        address_line2: deliveryAddress.addressLine2,
        address_landmark: deliveryAddress.landmark,
        pincode: deliveryAddress.pincode,
        
        payment_type: orderDetails.paymentType,
        invoice_amount: orderDetails.totalAmount,
        cod_amount: orderDetails.paymentType === 'COD' ? (orderDetails.codAmount || orderDetails.totalAmount) : 0,
        
        ...dimensions,
        
        items: shipmentItems,
        preferred_courier_id: selectedCourier || undefined,
      };

      const shipmentData = await bigshipService.createShipment(shipmentParams);
      
      onShipmentCreated?.(shipmentData);
    } catch (error: any) {
      onError?.(error.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Shipment Details</h3>
        
        {/* Warehouse Selection */}
        {warehouses.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location
            </label>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.warehouse_name} - {warehouse.address_city} ({warehouse.address_pincode})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Estimate Shipping Button */}
        <button
          onClick={estimateShippingCost}
          disabled={estimating || !deliveryAddress.pincode}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 mb-4"
        >
          {estimating ? 'Calculating...' : 'Estimate Shipping Cost'}
        </button>

        {/* Shipping Rates */}
        {shippingRates.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Available Shipping Options</h4>
            <div className="space-y-2">
              {shippingRates.map((rate) => (
                <div
                  key={rate.courier_id}
                  onClick={() => setSelectedCourier(rate.courier_id)}
                  className={`border rounded-md p-3 cursor-pointer transition ${
                    selectedCourier === rate.courier_id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{rate.courier_name}</p>
                      <p className="text-sm text-gray-600">
                        {rate.courier_type} • {rate.tat} days • {rate.billable_weight} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{rate.total_shipping_charges.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Zone: {rate.zone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Shipment Button */}
        <button
          onClick={createShipment}
          disabled={loading || !selectedWarehouse}
          className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? 'Creating Shipment...' : 'Create Shipment & Generate AWB'}
        </button>
      </div>
    </div>
  );
};

export default ShipmentCreation;
