import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, XCircle, Truck, Home, RefreshCw, ExternalLink } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';

// API Base URL from environment variable - remove trailing slash to prevent double slashes
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface Order {
  id: string;
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  phone: string;
  shipping_address?: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  payment_method: string;
  payment_status: string;
  created_at: string;
  shipment?: {
    awb_number: string | null;
    courier_name: string | null;
    courier_id: number | null;
    status: string | null;
    tracking_url: string | null;
  };
}

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      // Use backend API instead of direct Supabase query
      const response = await fetch(`${API_BASE_URL}/orders/${user?.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const result = await response.json();
      setOrders(result.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackOrder = async (orderNumber: string) => {
    try {
      setTrackingLoading(orderNumber);
      
      const response = await fetch(`${API_BASE_URL}/api/bigship/track-order/${orderNumber}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to track order');
      }
      
      const result = await response.json();
      
      // Show success message
      alert(`✅ Order tracking updated!\n\nBigShip Status: ${result.current_status}\nOrder Status: ${result.new_order_status.toUpperCase()}`);
      
      // Refresh orders to show updated status
      await fetchOrders();
      
    } catch (error: any) {
      console.error('Error tracking order:', error);
      alert(`❌ Failed to update tracking\n\n${error.message || 'Please try again later'}`);
    } finally {
      setTrackingLoading(null);
    }
  };

  const openBigShipTracking = async (orderNumber: string) => {
    try {
      console.log('===========================================');
      console.log('Opening BigShip tracking for order:', orderNumber);
      console.log('API URL:', `${API_BASE_URL}/api/bigship/tracking-url/${orderNumber}`);
      
      // Fetch the correct tracking URL from backend
      const response = await fetch(`${API_BASE_URL}/api/bigship/tracking-url/${orderNumber}`);
      const data = await response.json();
      
      console.log('Tracking URL response for', orderNumber, ':', data);
      console.log('Will open URL:', data.tracking_url);
      console.log('===========================================');
      
      if (data.success && data.tracking_url) {
        window.open(data.tracking_url, '_blank', 'noopener,noreferrer');
      } else {
        // Fallback to default URL
        console.warn('Using fallback URL for order:', orderNumber);
        window.open(`https://app.bigship.in/order/detail?order_id=${orderNumber}`, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error getting tracking URL for order', orderNumber, ':', error);
      // Fallback to default URL
      window.open(`https://app.bigship.in/order/detail?order_id=${orderNumber}`, '_blank', 'noopener,noreferrer');
    }
  };




  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Order tracking steps - matching database status values
  const trackingSteps = [
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'processing', label: 'Packaging', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Home },
  ];

  // Get the current step index based on order status
  const getStepIndex = (status: string): number => {
    switch (status) {
      case 'pending':
        return -1; // No steps completed
      case 'confirmed':
        return 0;
      case 'processing':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
        return 3;
      case 'cancelled':
        return -2; // Special case for cancelled
      default:
        return -1;
    }
  };

  // Order Tracking Timeline Component
  const OrderTrackingTimeline = ({ status }: { status: string }) => {
    const currentStepIndex = getStepIndex(status);
    
    // Don't show timeline for cancelled orders
    if (currentStepIndex === -2) {
      return (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-center text-red-500 space-x-2">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Order Cancelled</span>
          </div>
        </div>
      );
    }

    return (
      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-4">Order Progress</p>
        <div className="relative">
          {/* Progress Line Background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full mx-8" />
          
          {/* Progress Line Active */}
          <div 
            className="absolute top-5 left-0 h-1 bg-blue-500 rounded-full mx-8 transition-all duration-500"
            style={{ 
              width: currentStepIndex >= 0 
                ? `calc(${(currentStepIndex / (trackingSteps.length - 1)) * 100}% - 4rem)`
                : '0%',
            }}
          />
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {trackingSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const IconComponent = step.icon;
              
              return (
                <div 
                  key={step.key} 
                  className="flex flex-col items-center z-10"
                >
                  {/* Step Circle */}
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCompleted 
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                        : 'bg-gray-200 text-gray-400'
                      }
                      ${isCurrent ? 'ring-4 ring-blue-100 scale-110' : ''}
                    `}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  {/* Step Label */}
                  <span 
                    className={`
                      mt-2 text-xs font-medium text-center max-w-[80px] transition-all duration-300
                      ${isCompleted ? 'text-blue-600' : 'text-gray-400'}
                      ${isCurrent ? 'font-bold' : ''}
                    `}
                  >
                    {step.label}
                  </span>
                  
                  {/* Current indicator */}
                  {isCurrent && (
                    <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Status message for pending orders */}
        {currentStepIndex === -1 && (
          <p className="text-center text-sm text-yellow-600 mt-4">
            ⏳ Waiting for order confirmation...
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">My Orders</h1>
          <p className="text-gray-500">View and track your order history</p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No orders yet</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Looks like you haven't placed any orders yet. Start shopping to find your favorite products.
            </p>
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 font-semibold"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                {/* Order Header */}
                <div className="px-6 py-4 border-b border-gray-50">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-gray-900 font-medium text-base">
                      {order.order_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <p className="text-sm text-gray-500 w-full sm:w-auto">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Order Content */}
                <div className="px-6 py-6">
                  <div className="flex flex-row gap-4 items-start justify-between">
                    {/* Items List */}
                    <div className="flex flex-wrap gap-6 flex-1 min-w-0">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex flex-col items-center gap-3 w-20">
                          <div className="relative group">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                            />
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                              {item.quantity}
                            </span>
                          </div>
                          <h4 className="text-gray-900 font-medium text-xs text-center line-clamp-2 leading-tight w-full">
                            {item.name}
                          </h4>
                        </div>
                      ))}
                    </div>

                    {/* Order Actions & Total */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <button
                        onClick={() => {
                          console.log('Navigating to order:', order.id);
                          navigate(`/order/${order.id}`);
                        }}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        View Details
                      </button>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">₹{order.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                {(order.shipment?.awb_number || order.status === 'confirmed' || order.status === 'processing') && (
                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 w-full sm:w-auto justify-center sm:justify-start">
                      {order.shipment?.awb_number ? (
                        <>
                          <Truck className="w-4 h-4 shrink-0" />
                          <span className="truncate">Tracking ID: <span className="font-mono font-medium text-gray-700">{order.shipment.awb_number}</span></span>
                        </>
                      ) : (
                        <span>Tracking details will be updated soon</span>
                      )}
                    </div>
                    
                    {order.shipment?.awb_number && (
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                        <button
                          onClick={() => trackOrder(order.order_number)}
                          disabled={trackingLoading === order.order_number}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm flex items-center gap-2 shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          <RefreshCw className={`w-4 h-4 ${trackingLoading === order.order_number ? 'animate-spin' : ''}`} />
                          {trackingLoading === order.order_number ? 'Updating...' : 'Update Status'}
                        </button>
                        
                        <button
                          onClick={() => openBigShipTracking(order.order_number)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm flex items-center gap-2 shadow-sm shadow-blue-200 whitespace-nowrap"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Track Shipment
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Tracking Timeline */}
                <OrderTrackingTimeline status={order.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
