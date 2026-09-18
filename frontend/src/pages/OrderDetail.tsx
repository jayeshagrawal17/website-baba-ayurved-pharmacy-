import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, CreditCard, Star, Send } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';

// API Base URL from environment variable - remove trailing slash to prevent double slashes
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface ShippingAddress {
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

interface Shipment {
  awb_number: string;
  courier_name: string;
  courier_id: number;
  status: string;
  tracking_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  items: OrderItem[];
  total_amount: number;
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_status: string;
  payment_amount?: number;
  created_at: string;
  shipment?: Shipment;
  shipping_charges?: number;
  notes?: string;
}

interface Review {
  rating: number;
  review: string;
}

const OrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUserAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [reviewerType, setReviewerType] = useState<'customer' | 'doctor'>('customer');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [productReviews, setProductReviews] = useState<{ [key: string]: Review }>({});

  useEffect(() => {
    if (id && user) {
      fetchOrder();
    }
  }, [id, user]);

  const fetchOrder = async () => {
    try {
      console.log('Fetching order with id:', id);
      console.log('User ID:', user?.id);
      const response = await fetch(`${API_BASE_URL}/orders/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const result = await response.json();
      console.log('Orders response:', result);
      const data = result.orders || result; // Handle both formats
      console.log('Orders data:', data);
      const foundOrder = data.find((o: Order) => o.id === id);
      console.log('Found order:', foundOrder);
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        console.error('Order not found with id:', id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && order) {
      fetchUserReviews();
    }
  }, [order, user]);

  const fetchUserReviews = async () => {
    if (!order) return;
    try {
      console.log('Fetching reviews for user:', user?.id);
      console.log('Current order ID:', order.id);
      console.log('Current order number:', order.order_number);
      console.log('Current order status:', order.status);
      
      const response = await fetch(`${API_BASE_URL}/reviews/user/${user?.id}`);
      if (!response.ok) return;
      
      const result = await response.json();
      console.log('User reviews fetched:', result.reviews);
      
      const reviewsMap: { [key: string]: Review } = {};
      
      result.reviews.forEach((r: any) => {
        // Match by order_id (could be UUID or order_number depending on when review was created)
        if (r.order_id === order.id || r.order_id === order.order_number) {
          console.log('Found matching review for product:', r.product_id);
          reviewsMap[r.product_id] = {
            rating: r.rating,
            review: r.review
          };
        }
      });
      
      console.log('Reviews map for this order:', reviewsMap);
      setProductReviews(reviewsMap);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const openReviewModal = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setRating(0);
    setReview('');
    setReviewerType('customer');
  };

  const submitRating = async () => {
    if (!selectedProduct || rating === 0 || !order) {
      alert('Please provide a rating');
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          product_id: selectedProduct.id,
          order_id: order.order_number,
          rating: rating,
          review: review.trim() || null,
          reviewer_type: reviewerType,
        }),
      });

      if (response.ok) {
        alert('Thank you for your review!');
        setSelectedProduct(null);
        fetchUserReviews(); // Refresh reviews
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const calculateSubtotal = () => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getShippingCharges = () => {
    return order?.shipping_charges || 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ayurveda-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-xl">Order not found</div>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const shippingCharges = getShippingCharges();
  const total = order.total_amount || (subtotal + shippingCharges);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Orders
        </button>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Details</h1>
              <p className="text-gray-600">Order #{order.order_number}</p>
              <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
              {order.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Order Items</h2>
          </div>
          
          <div className="space-y-4">
            {order.items.map((item, index) => {
              const hasReview = productReviews[item.id];
              console.log(`Product ${item.name} (${item.id}):`, hasReview ? 'Has review' : 'No review - button should show');
              console.log(`Order status check: "${order.status}" === "delivered"?`, order.status === 'delivered');
              
              return (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-green-600 font-semibold">
                      ₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                    
                    {/* Show review or rating button */}
                    {order.status === 'delivered' && (
                      <div className="mt-2">
                        {hasReview ? (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= hasReview.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">Reviewed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openReviewModal(item.id, item.name)}
                            className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            ⭐ Rate this product
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Payment Details</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Shipping Charges</span>
              <span>₹{shippingCharges.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
              <span>Total Amount</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium text-gray-800">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Status</span>
                <span className={`font-medium ${
                  order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {order.payment_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Delivery Address</h2>
          </div>
          
          <div className="text-gray-700 space-y-1">
            {order.shipping_address && typeof order.shipping_address === 'object' ? (
              <>
                <p className="font-semibold">{order.shipping_address.name || 'N/A'}</p>
                <p>{order.shipping_address.phone || (order as any).phone || 'N/A'}</p>
                <p>{order.shipping_address.address_line1 || (order.shipping_address as any).address || 'N/A'}</p>
                {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                {order.shipping_address.landmark && (
                  <p className="text-sm text-gray-600">Landmark: {order.shipping_address.landmark}</p>
                )}
                <p>
                  {order.shipping_address.city || 'N/A'}, {order.shipping_address.state || 'N/A'} - {order.shipping_address.pincode || 'N/A'}
                </p>
              </>
            ) : (
              <p className="text-gray-600">Shipping address not available</p>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Order Notes</h2>
            <p className="text-gray-700">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Rate Product</h3>
            <p className="text-gray-600 mb-4">{selectedProduct.name}</p>
            
            {/* Star Rating */}
            <div className="flex gap-2 mb-4 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Reviewer Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                You are reviewing as:
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReviewerType('customer')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    reviewerType === 'customer'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">🛒</span>
                    <span className="font-medium">Customer</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewerType('doctor')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    reviewerType === 'doctor'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">👨‍⚕️</span>
                    <span className="font-medium">Doctor</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Review Text */}
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Write your review (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 min-h-[100px]"
            />
            
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                disabled={submittingReview || rating === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
