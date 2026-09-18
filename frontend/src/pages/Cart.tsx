import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUserAuth } from '../context/UserAuthContext';
import UserLoginModal from '../components/UserLoginModal';
import PaymentModal from '../components/PaymentModal';
import { PaymentResponse } from '../services/paymentService';
import { bigshipService } from '../services/bigshipService';

// API Base URL from environment variable - remove trailing slash to prevent double slashes
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

// Note: Removed unused Supabase import - Cart now uses backend API for all operations

interface DeliveryAddress {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
}

export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const { user } = useUserAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    firstName: '',
    lastName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    pincode: '',
    city: '',
    state: ''
  });
  const [addressErrors, setAddressErrors] = useState<Partial<DeliveryAddress>>({});
  const [shippingRate, setShippingRate] = useState<number>(0);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [_availableCouriers, setAvailableCouriers] = useState<any[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);

  const subtotal = getCartTotal();
  const shipping = shippingRate; // Use calculated shipping from Bigship
  const total = subtotal + shipping;

  // Check if COD is enabled for all products in cart
  const isCODAvailable = cart.every(item => item.product.cod_enabled === true);

  const handleCheckout = async () => {
    // Check if user is logged in
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    // Show address form
    setShowAddressForm(true);
  };

  const validateAddress = (): boolean => {
    const errors: Partial<DeliveryAddress> = {};
    
    // Validate first name - only alphabets, dots, and spaces
    if (!deliveryAddress.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (!/^[a-zA-Z.\s]+$/.test(deliveryAddress.firstName.trim())) {
      errors.firstName = 'Only alphabets, dots, and spaces allowed';
    } else if (deliveryAddress.firstName.trim().length < 3) {
      errors.firstName = 'First name must be at least 3 characters';
    } else if (deliveryAddress.firstName.trim().length > 25) {
      errors.firstName = 'First name must be at most 25 characters';
    }
    
    // Validate last name - only alphabets, dots, and spaces
    if (!deliveryAddress.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (!/^[a-zA-Z.\s]+$/.test(deliveryAddress.lastName.trim())) {
      errors.lastName = 'Only alphabets, dots, and spaces allowed';
    } else if (deliveryAddress.lastName.trim().length < 3) {
      errors.lastName = 'Last name must be at least 3 characters';
    } else if (deliveryAddress.lastName.trim().length > 25) {
      errors.lastName = 'Last name must be at most 25 characters';
    }
    
    if (!deliveryAddress.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(deliveryAddress.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Invalid phone number';
    }
    
    if (!deliveryAddress.addressLine1.trim()) {
      errors.addressLine1 = 'Address is required';
    } else if (deliveryAddress.addressLine1.length < 10) {
      errors.addressLine1 = 'Address must be at least 10 characters';
    } else if (deliveryAddress.addressLine1.length > 50) {
      errors.addressLine1 = 'Address must be at most 50 characters';
    }
    
    if (!deliveryAddress.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(deliveryAddress.pincode)) {
      errors.pincode = 'Invalid pincode (6 digits required)';
    }
    
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateShippingRates = async () => {
    if (!deliveryAddress.pincode || deliveryAddress.pincode.length !== 6) {
      return;
    }

    setIsCalculatingShipping(true);
    try {
      // Calculate total weight and get max dimensions from cart products
      let totalWeight = 0;
      let maxLength = 20;
      let maxWidth = 15;
      let maxHeight = 10;
      
      cart.forEach(item => {
        // Use product weight if available, otherwise default 0.1kg per item
        const itemWeight = item.product.weight || 0.1;
        // If pack is selected, multiply weight by pack size and then by quantity
        const packSize = item.selectedQuantityOption ? item.selectedQuantityOption.quantity : 1;
        totalWeight += itemWeight * packSize * item.quantity;
        
        // Use product dimensions if available
        if (item.product.length) maxLength = Math.max(maxLength, item.product.length);
        if (item.product.width) maxWidth = Math.max(maxWidth, item.product.width);
        if (item.product.height) maxHeight = Math.max(maxHeight, item.product.height);
      });
      
      // Minimum weight 0.1kg
      if (totalWeight < 0.1) totalWeight = 0.1;
      
      // Calculate shipping rates
      const rates = await bigshipService.calculateRates({
        pickup_pincode: '475110', // Your warehouse pincode
        destination_pincode: deliveryAddress.pincode,
        payment_type: 'Prepaid',
        invoice_amount: subtotal,
        weight: totalWeight,
        length: maxLength,
        width: maxWidth,
        height: maxHeight
      });

      if (rates && rates.length > 0) {
        setAvailableCouriers(rates);
        // Auto-select the cheapest courier
        const cheapest = rates.reduce((min, rate) => 
          rate.total_shipping_charges < min.total_shipping_charges ? rate : min
        );
        setSelectedCourier(cheapest);
        setShippingRate(cheapest.total_shipping_charges);
      } else {
        setShippingRate(0);
        alert('Unable to calculate shipping rates. Please contact support.');
      }
    } catch (error) {
      console.error('Error calculating shipping:', error);
      setShippingRate(0);
      alert('Unable to calculate shipping rates. Please try again.');
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const proceedToPayment = async () => {
    if (!validateAddress()) {
      return;
    }
    
    // Calculate shipping rates before proceeding
    await calculateShippingRates();
    
    setShowAddressForm(false);
    
    // If COD was selected, process COD order
    if (paymentMethod === 'cod') {
      handleCODOrder();
    } else {
      // Otherwise show online payment modal
      setIsPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = async (paymentResponse: PaymentResponse) => {
    if (!user) return;
    
    // Close payment modal and show processing overlay
    setIsPaymentModalOpen(false);
    setIsProcessingOrder(true);
    
    // Log successful payment details
    console.info('🎉 PAYMENT SUCCESS:', {
      payment_id: paymentResponse.razorpay_payment_id,
      order_id: paymentResponse.razorpay_order_id,
      amount: total,
      user_email: user.email,
      timestamp: new Date().toISOString()
    });
    
    setIsCheckingOut(true);
    try {
      // Prepare order items with selected quantity option details
      const orderItems = cart.map((item) => ({
        product_id: item.product.id,
        name: item.selectedQuantityOption 
          ? `${item.product.name} - ${item.selectedQuantityOption.label || `Pack of ${item.selectedQuantityOption.quantity}`}`
          : item.product.name,
        price: item.selectedQuantityOption ? item.selectedQuantityOption.price : item.product.price,
        quantity: item.quantity,
        image_url: item.product.image_url,
        // Store quantity option details for reference
        quantity_option: item.selectedQuantityOption ? {
          pack_size: item.selectedQuantityOption.quantity,
          pack_price: item.selectedQuantityOption.price,
          pack_label: item.selectedQuantityOption.label,
          original_price: item.selectedQuantityOption.original_price
        } : null,
      }));

      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create order in database via backend API
      const orderData = {
        user_id: user.id,
        order_number: orderNumber,
        items: orderItems,
        total_amount: total,
        phone: deliveryAddress.phone || user.phone || '',
        shipping_address: {
          name: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`,
          phone: deliveryAddress.phone,
          address_line1: deliveryAddress.addressLine1,
          address_line2: deliveryAddress.addressLine2,
          landmark: deliveryAddress.landmark,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          pincode: deliveryAddress.pincode,
        },
        payment_method: 'razorpay',
        payment_status: 'paid',
        payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,  // Changed from order_id
        razorpay_signature: paymentResponse.razorpay_signature || '',
        payment_gateway: 'razorpay',
        payment_amount: total,
        payment_currency: 'INR',
        payment_captured: true,
        payment_completed_at: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create order');
      }

      const orderResult = await response.json();
      console.info('✅ ORDER CREATED:', orderResult);

      // ==================== CREATE BIGSHIP SHIPMENT ====================
      try {
        console.info('📦 Creating shipment with Bigship...');
        
        // Calculate total weight and max dimensions from product data
        // Account for pack sizes when calculating weight
        let totalWeight = 0;
        let maxLength = 20;
        let maxWidth = 15;
        let maxHeight = 10;
        
        cart.forEach(item => {
          const itemWeight = item.product.weight || 0.1;
          // If pack is selected, multiply weight by pack size and then by quantity
          const packSize = item.selectedQuantityOption ? item.selectedQuantityOption.quantity : 1;
          totalWeight += itemWeight * packSize * item.quantity;
          
          if (item.product.length) maxLength = Math.max(maxLength, item.product.length);
          if (item.product.width) maxWidth = Math.max(maxWidth, item.product.width);
          if (item.product.height) maxHeight = Math.max(maxHeight, item.product.height);
        });
        
        if (totalWeight < 0.1) totalWeight = 0.1;
        
        const shipmentData = await bigshipService.createShipment({
          order_id: orderNumber,
          pickup_warehouse_id: 210444, // BABA AYURVED PHARMACY
          return_warehouse_id: 210444,
          
          // Customer details from address form
          customer_first_name: deliveryAddress.firstName,
          customer_last_name: deliveryAddress.lastName,
          customer_phone: deliveryAddress.phone.replace(/[\s-]/g, ''),
          customer_email: user.email,
          
          // Delivery address
          address_line1: deliveryAddress.addressLine1,
          address_line2: deliveryAddress.addressLine2,
          address_landmark: deliveryAddress.landmark,
          pincode: deliveryAddress.pincode,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          
          // Order details (Prepaid since Razorpay payment is completed)
          payment_type: 'Prepaid',
          invoice_amount: subtotal, // Use subtotal (product prices only)
          cod_amount: 0,
          
          // Package details (calculated from product data)
          weight: totalWeight,
          length: maxLength,
          width: maxWidth,
          height: maxHeight,
          
          // Items - include pack information in name and adjust quantity/price
          items: cart.map(item => ({
            name: item.selectedQuantityOption 
              ? `${item.product.name} - ${item.selectedQuantityOption.label || `Pack of ${item.selectedQuantityOption.quantity}`}`
              : item.product.name,
            quantity: item.quantity,
            price: item.selectedQuantityOption ? item.selectedQuantityOption.price : item.product.price,
            category: 'Wellness'
          }))
          
          // Don't pass preferred_courier_id - let Bigship auto-assign best courier
          // preferred_courier_id: selectedCourier?.courier_id
        });
        
        console.info('✅ SHIPMENT CREATED:', {
          awb_number: shipmentData.awb_number,
          courier: shipmentData.courier_name,
          system_order_id: shipmentData.system_order_id
        });
        
        // Simple success message - details will be shown in Orders page
        // Show success state
        setOrderNumber(orderNumber);
        setOrderSuccess(true);
        
        // Clear cart and redirect after delay
        setTimeout(() => {
          clearCart();
          setIsPaymentModalOpen(false);
          setShowAddressForm(false);
          setIsProcessingOrder(false);
          setOrderSuccess(false);
          navigate('/orders');
        }, 2500);
        
      } catch (shipmentError: any) {
        console.error('❌ Shipment creation failed:', shipmentError);
        
        // Log detailed error for debugging
        console.error('Shipment Error Details:', {
          error: shipmentError,
          message: shipmentError.message,
          deliveryAddress,
          orderNumber
        });
        
        // Don't block the order - show warning but continue
        console.warn('⚠️ ORDER PLACED SUCCESSFULLY - Shipment will be created manually');
        
        // Show success state even if shipment creation had issues
        setOrderNumber(orderNumber);
        setOrderSuccess(true);
        
        // Clear cart and redirect after delay
        setTimeout(() => {
          clearCart();
          setIsPaymentModalOpen(false);
          setShowAddressForm(false);
          setIsProcessingOrder(false);
          setOrderSuccess(false);
          navigate('/orders');
        }, 2500);
      }
      // =================================================================
    } catch (error) {
      console.error('Error creating order:', error);
      setIsProcessingOrder(false);
      setOrderSuccess(false);
      alert('Payment successful but failed to save order. Please contact support.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePaymentFailure = async (error: any) => {
    console.error('Payment failed:', error);
    
    // Log failed payment attempt if user is logged in
    if (user) {
      try {
        // TODO: Implement backend API for failed payment logging if needed
        console.log('Payment failed for user:', user.id, 'Error:', error.message);
      } catch (logError) {
        console.error('Error logging failed payment:', logError);
      }
    }
    
    setIsPaymentModalOpen(false);
    
    if (error.message === 'Payment cancelled by user') {
      // User cancelled payment - no alert needed
      return;
    }
    
    alert('Payment failed. Please try again or contact support.');
  };

  const handleCODOrder = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    // If address form not filled, show it first
    if (!deliveryAddress.firstName || !deliveryAddress.pincode) {
      setShowAddressForm(true);
      setPaymentMethod('cod');
      return;
    }
    
    setIsProcessingOrder(true);
    setIsCheckingOut(true);
    
    try {
      // Prepare order items with selected quantity option details
      const orderItems = cart.map((item) => ({
        product_id: item.product.id,
        name: item.selectedQuantityOption 
          ? `${item.product.name} - ${item.selectedQuantityOption.label || `Pack of ${item.selectedQuantityOption.quantity}`}`
          : item.product.name,
        price: item.selectedQuantityOption ? item.selectedQuantityOption.price : item.product.price,
        quantity: item.quantity,
        image_url: item.product.image_url,
        // Store quantity option details for reference
        quantity_option: item.selectedQuantityOption ? {
          pack_size: item.selectedQuantityOption.quantity,
          pack_price: item.selectedQuantityOption.price,
          pack_label: item.selectedQuantityOption.label,
          original_price: item.selectedQuantityOption.original_price
        } : null,
      }));

      // Generate unique order number
      const generatedOrderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create order in database via backend API
      const orderData = {
        user_id: user.id,
        order_number: generatedOrderNumber,
        items: orderItems,
        total_amount: total,
        phone: deliveryAddress.phone || user.phone || '',
        shipping_address: {
          name: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`,
          phone: deliveryAddress.phone,
          address_line1: deliveryAddress.addressLine1,
          address_line2: deliveryAddress.addressLine2,
          landmark: deliveryAddress.landmark,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          pincode: deliveryAddress.pincode,
        },
        payment_method: 'cod',
        payment_status: 'pending',
        payment_gateway: 'cod',
        payment_amount: total,
        payment_currency: 'INR',
      };

      const response = await fetch(`${API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create order');
      }

      const orderResult = await response.json();
      console.info('✅ COD ORDER CREATED:', orderResult);

      // Show success and redirect
      setOrderNumber(generatedOrderNumber);
      setOrderSuccess(true);
      clearCart();
      
      setTimeout(() => {
        setOrderSuccess(false);
        setIsProcessingOrder(false);
        navigate('/orders');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating COD order:', error);
      alert('Failed to place order. Please try again.');
      setIsProcessingOrder(false);
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6">
            <ShoppingBag className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">
            Looks like you haven't added anything to your cart yet.
            Explore our products to find something you love.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="w-full bg-green-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 lg:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <span className="text-gray-500 font-medium">
            {cart.length} item{cart.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Cart Items List */}
          <div className="lg:col-span-8 space-y-6">
            {cart.map((item) => {
              const itemKey = `${item.product.id}-${item.selectedQuantityOption ? item.selectedQuantityOption.quantity : 'single'}`;
              return (
                <div key={itemKey} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex gap-4 sm:gap-6">
                    {/* Product Image */}
                    <div className="shrink-0">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border border-gray-100"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 mb-1">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                            {item.product.description}
                          </p>
                          <p className="text-sm font-medium text-green-600">In Stock</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedQuantityOption || null)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
                        {/* Quantity Selector */}
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedQuantityOption || null)}
                            className="p-2 hover:bg-gray-100 text-gray-600 transition-colors rounded-l-lg"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-gray-900 w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedQuantityOption || null)}
                            className="p-2 hover:bg-gray-100 text-gray-600 transition-colors rounded-r-lg"
                            disabled={item.quantity >= item.product.stock_quantity}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-bold text-gray-900">
                            ₹{(item.selectedQuantityOption ? (item.selectedQuantityOption.price * item.quantity) : (item.product.price * item.quantity)).toFixed(2)}
                          </div>
                          {item.selectedQuantityOption ? (
                            <div className="text-xs text-gray-500">
                              {item.selectedQuantityOption.label ? item.selectedQuantityOption.label : `Pack of ${item.selectedQuantityOption.quantity}`} • ₹{item.selectedQuantityOption.price} per pack
                            </div>
                          ) : item.quantity > 1 ? (
                            <div className="text-xs text-gray-500">₹{item.product.price} each</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => navigate('/products')}
                className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </button>
              
              <button
                onClick={clearCart}
                className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
              >
                Clear Cart
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium text-sm">Calculated at checkout</span>
                  ) : (
                    <span className="font-medium text-gray-900">₹{shipping.toFixed(2)}</span>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-end">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-green-600">₹{total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">Including all taxes</p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>

                {/* COD Button with conditional rendering */}
                {!isCODAvailable ? (
                  <div className="w-full bg-gray-100 text-gray-400 py-3.5 rounded-xl font-semibold text-center cursor-not-allowed border border-gray-200">
                    <div className="text-sm">Cash on Delivery</div>
                    <div className="text-xs mt-1">COD is not enabled for some products in cart</div>
                  </div>
                ) : (
                  <button
                    onClick={handleCODOrder}
                    disabled={isCheckingOut}
                    className="w-full bg-white text-gray-700 border border-gray-200 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cash on Delivery
                  </button>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span>Secure checkout with SSL encryption</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span>100% Authentic Ayurvedic Products</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <UserLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsLoginModalOpen(false);
          // After login, user can proceed with checkout
        }}
      />

      {/* Address Form Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Delivery Address</h2>
                  <p className="text-sm text-gray-500 mt-1">Where should we send your order?</p>
                </div>
                <button
                  onClick={() => setShowAddressForm(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); proceedToPayment(); }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.firstName}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, firstName: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none ${
                        addressErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                      }`}
                      placeholder="John"
                    />
                    {addressErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1 ml-1">{addressErrors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.lastName}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, lastName: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none ${
                        addressErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                      }`}
                      placeholder="Doe"
                    />
                    {addressErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1 ml-1">{addressErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={deliveryAddress.phone}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phone: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none ${
                      addressErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                    }`}
                    placeholder="9876543210"
                  />
                  {addressErrors.phone && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{addressErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 * (Flat, Building, Street)
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.addressLine1}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine1: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none ${
                      addressErrors.addressLine1 ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                    }`}
                    placeholder="Flat 101, Building A, Main Street"
                  />
                  {addressErrors.addressLine1 && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{addressErrors.addressLine1}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2 (Area, Colony)
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.addressLine2}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine2: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none focus:bg-white"
                    placeholder="Near City Mall"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Landmark
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.landmark}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, landmark: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none focus:bg-white"
                      placeholder="Opposite Park"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.pincode}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none ${
                        addressErrors.pincode ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                      }`}
                      placeholder="400001"
                      maxLength={6}
                    />
                    {addressErrors.pincode && (
                      <p className="text-red-500 text-xs mt-1 ml-1">{addressErrors.pincode}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.city}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none focus:bg-white"
                      placeholder="Mumbai"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.state}
                      onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none focus:bg-white"
                      placeholder="Maharashtra"
                    />
                  </div>
                </div>

                {/* Shipping Rate Display */}
                {shippingRate > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Estimated Shipping</p>
                        <p className="text-lg font-bold text-green-700">₹{shippingRate.toFixed(2)}</p>
                        {selectedCourier && (
                          <p className="text-xs text-gray-500 mt-1">via {selectedCourier.courier_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Total Payable</p>
                        <p className="text-xl font-bold text-gray-900">
                          ₹{(subtotal + shippingRate).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="flex-1 px-6 py-3.5 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCalculatingShipping}
                    className="flex-1 px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isCalculatingShipping ? 'Calculating...' : 'Proceed to Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay - Processing Order */}
      {isProcessingOrder && !orderSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm w-full mx-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-100 border-t-green-600 mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Order</h3>
            <p className="text-gray-500">Please wait while we secure your products...</p>
          </div>
        </div>
      )}

      {/* Success Overlay - Order Placed */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm w-full mx-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-gray-500 mb-6">Order #{orderNumber}</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-green-500 animate-[width_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Redirecting to orders...</p>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {user && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          amount={total}
          userDetails={{
            name: (user as any).user_metadata?.name || user.email || 'Customer',
            email: user.email || '',
            phone: user.phone || (user as any).user_metadata?.phone || '',
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      )}
    </div>
  );
}
