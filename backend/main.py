from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal
import razorpay
import hashlib
import hmac
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import logging
from supabase import create_client, Client
from services.bigship_service import (
    bigship_service, 
    BigshipConsignee, 
    BigshipAddress, 
    BigshipBoxDetail,
    BigshipProductDetail
)

# Import tracking routes
from routes import bigship_tracking

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase client (using service role to bypass RLS)
supabase: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    logger = logging.getLogger('payment')
    logger.info("Supabase client initialized successfully")
else:
    logger = logging.getLogger('payment')
    logger.warning("Supabase configuration missing - database operations will be unavailable")

# Configure logging for payment events
LOG_FILE = os.path.join(os.path.dirname(__file__), 'payment_events.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE)
    ]
)
logger = logging.getLogger('payment')

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("Validation error: %s", exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# Add CORS middleware
# Support both production and development URLs
allowed_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

# Add additional production frontend URL if specified
production_url = os.getenv("PRODUCTION_FRONTEND_URL")
if production_url and production_url not in allowed_origins:
    allowed_origins.append(production_url)

# Add custom domain support (both www and non-www)
custom_domain = os.getenv("CUSTOM_DOMAIN")
if custom_domain:
    # Remove any trailing slashes
    custom_domain = custom_domain.rstrip('/')
    if custom_domain not in allowed_origins:
        allowed_origins.append(custom_domain)
    # Also add www version if not present
    if custom_domain.startswith('https://') and not custom_domain.startswith('https://www.'):
        www_domain = custom_domain.replace('https://', 'https://www.')
        if www_domain not in allowed_origins:
            allowed_origins.append(www_domain)
    # Also add non-www version if www is present
    if custom_domain.startswith('https://www.'):
        non_www_domain = custom_domain.replace('https://www.', 'https://')
        if non_www_domain not in allowed_origins:
            allowed_origins.append(non_www_domain)

logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
    max_age=3600,
)

# Include BigShip tracking routes
app.include_router(bigship_tracking.router, prefix="/api/bigship", tags=["bigship-tracking"])

# Helper function to automatically create BigShip shipment
async def create_bigship_shipment_for_order(order_number: str, order_data: dict):
    """
    Automatically create BigShip shipment when order is confirmed
    This function is called after order creation
    """
    try:
        logger.info(f"Creating BigShip shipment for order {order_number}")
        
        # Get shipping address from order data
        shipping_address = order_data.get('shipping_address', {})
        items = order_data.get('items', [])
        
        if not shipping_address:
            logger.warning(f"No shipping address found for order {order_number}, skipping BigShip creation")
            return
        
        # Calculate package weight and dimensions (you can adjust these based on your products)
        total_weight = len(items) * 0.5  # Assume 0.5 kg per item, adjust as needed
        
        # Prepare BigShip shipment data
        shipment_data = {
            "shipment_category": "b2c",
            "warehouse_detail": {
                "pickup_location_id": int(os.getenv("BIGSHIP_WAREHOUSE_ID", "44156")),  # Your warehouse ID
                "return_location_id": int(os.getenv("BIGSHIP_WAREHOUSE_ID", "44156"))
            },
            "consignee_detail": {
                "first_name": shipping_address.get('name', 'Customer').split()[0],
                "last_name": shipping_address.get('name', 'Customer').split()[-1] if len(shipping_address.get('name', 'Customer').split()) > 1 else 'User',
                "company_name": "",
                "contact_number_primary": order_data.get('phone', '9999999999'),
                "contact_number_secondary": "",
                "email_id": "",
                "consignee_address": {
                    "address_line1": shipping_address.get('address', 'Address'),
                    "address_line2": shipping_address.get('landmark', ''),
                    "address_landmark": shipping_address.get('landmark', ''),
                    "pincode": str(shipping_address.get('pincode', '000000'))
                }
            },
            "order_detail": {
                "invoice_date": order_data.get('created_at', datetime.now().isoformat()),
                "invoice_id": order_number,
                "payment_type": "COD" if order_data.get('payment_method') == 'cod' else "Prepaid",
                "shipment_invoice_amount": float(order_data.get('total_amount', 0)),
                "total_collectable_amount": float(order_data.get('total_amount', 0)) if order_data.get('payment_method') == 'cod' else 0,
                "box_details": [
                    {
                        "each_box_dead_weight": max(total_weight, 0.5),
                        "each_box_length": 20,
                        "each_box_width": 15,
                        "each_box_height": 10,
                        "each_box_invoice_amount": float(order_data.get('total_amount', 0)),
                        "each_box_collectable_amount": float(order_data.get('total_amount', 0)) if order_data.get('payment_method') == 'cod' else 0,
                        "box_count": 1,
                        "product_details": [
                            {
                                "product_category": "Wellness",
                                "product_sub_category": "Ayurvedic",
                                "product_name": item.get('name', 'Product')[:50],
                                "product_quantity": item.get('quantity', 1),
                                "each_product_invoice_amount": float(item.get('price', 0)),
                                "each_product_collectable_amount": float(item.get('price', 0)) if order_data.get('payment_method') == 'cod' else 0,
                                "hsn": ""
                            }
                            for item in items[:5]  # BigShip may have limits on number of items
                        ]
                    }
                ],
                "ewaybill_number": "",
                "document_detail": {
                    "invoice_document_file": "",
                    "ewaybill_document_file": ""
                }
            }
        }
        
        # Call BigShip API to create shipment
        bigship_token = os.getenv('BIGSHIP_TOKEN')
        if not bigship_token:
            # Generate token if not available
            from routes.bigship_tracking import get_bigship_token
            bigship_token = get_bigship_token()
        
        if not bigship_token:
            raise Exception("Failed to get BigShip authentication token")
        
        # Create shipment via BigShip API
        headers = {
            'Authorization': f'Bearer {bigship_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            'https://api.bigship.in/api/order/add/single',
            json=shipment_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                system_order_id = result.get('data', '').replace('system_order_id is ', '')
                logger.info(f"BigShip shipment created: system_order_id={system_order_id}")
                
                # Save shipment data to database
                shipment_db_data = {
                    'order_id': order_number,
                    'system_order_id': system_order_id,
                    'awb_number': None,  # Will be set after manifest
                    'status': 'created',
                    'current_tracking_status': 'CREATED',
                    'customer_name': shipping_address.get('name', 'Customer'),
                    'phone': order_data.get('phone'),
                    'city': shipping_address.get('city', 'Unknown'),
                    'state': shipping_address.get('state', 'Unknown'),
                    'pincode': shipping_address.get('pincode', '000000'),
                    'created_at': datetime.now().isoformat()
                }
                
                if supabase:
                    supabase.table('shipments').insert(shipment_db_data).execute()
                    logger.info(f"Shipment data saved to database for order {order_number}")
                
                return system_order_id
            else:
                raise Exception(f"BigShip API returned error: {result.get('message')}")
        else:
            raise Exception(f"BigShip API call failed with status {response.status_code}: {response.text}")
            
    except Exception as e:
        logger.error(f"Error creating BigShip shipment for order {order_number}: {str(e)}")
        raise

# Razorpay configuration from environment variables
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_9Qr9m8P4M8z3X4")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "your_razorpay_secret_key_here")

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Pydantic models for request/response
class CreateOrderRequest(BaseModel):
    amount: int  # Amount in paisa
    currency: str = "INR"
    receipt: str

class PaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None

class OrderItem(BaseModel):
    product_id: str  # Changed from int to str to handle UUID or string IDs
    name: str
    price: float
    quantity: int
    image_url: Optional[str] = None

class CreateOrderInDBRequest(BaseModel):
    user_id: str
    order_number: str
    items: List[OrderItem]
    total_amount: float
    phone: str
    shipping_address: Optional[Dict[str, Any]] = None  # Add shipping address
    payment_method: str = 'razorpay'
    payment_status: str = 'paid'
    payment_id: str
    razorpay_order_id: str  # Changed from order_id to razorpay_order_id
    razorpay_signature: Optional[str] = None
    payment_gateway: str = 'razorpay'
    payment_amount: float
    payment_currency: str = 'INR'
    payment_captured: bool = True
    payment_completed_at: str

# Data models for new endpoints
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: bool = False
    is_bestseller: bool = False
    show_in_hero: bool = False
    cod_enabled: bool = False
    rating: float = 0.0
    stock_quantity: int = 0
    tags: Optional[str] = None  # Health concern tags
    ingredients: Optional[str] = None
    benefits: Optional[str] = None
    how_to_use: Optional[str] = None
    # Shipping details (for admin only, not shown in customer UI)
    weight: Optional[float] = 0.5  # Weight in kg, default 500g
    length: Optional[int] = 20     # Length in cm
    width: Optional[int] = 15      # Width in cm
    height: Optional[int] = 10     # Height in cm
    # Additional product details
    gst_number: Optional[str] = None
    hsn_code: Optional[str] = None
    product_type: Optional[Literal['veg', 'non-veg']] = None
    country_of_origin: Optional[str] = None
    # Optional additional images (stored as comma-separated URLs or JSON depending on schema)
    images: Optional[str] = None
    # Quantity pricing options
    quantity_pricing: Optional[list] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_bestseller: Optional[bool] = None
    show_in_hero: Optional[bool] = None
    cod_enabled: Optional[bool] = None
    rating: Optional[float] = None
    stock_quantity: Optional[int] = None
    tags: Optional[str] = None  # Health concern tags
    ingredients: Optional[str] = None
    benefits: Optional[str] = None
    how_to_use: Optional[str] = None
    # Shipping details (for admin only)
    weight: Optional[float] = None
    length: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    # Additional product details
    gst_number: Optional[str] = None
    hsn_code: Optional[str] = None
    product_type: Optional[Literal['veg', 'non-veg']] = None
    country_of_origin: Optional[str] = None
    images: Optional[str] = None
    # Quantity pricing options
    quantity_pricing: Optional[list] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class ReviewCreate(BaseModel):
    user_id: str
    product_id: str
    order_id: str
    rating: int
    review: Optional[str] = None
    reviewer_type: Optional[Literal['customer', 'doctor']] = 'customer'

class ReviewResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    order_id: str
    rating: int
    review: Optional[str]
    created_at: str
    user_name: Optional[str] = None
    reviewer_type: Optional[str] = 'customer'

# Add explicit OPTIONS handler for CORS preflight
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle all OPTIONS requests for CORS preflight"""
    return {"message": "OK"}

@app.get("/")
def read_root():
    return {"message": "Baba Ayurveda Pharmacy API"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring service availability.
    Used by deployment platforms like Render for health monitoring.
    """
    health_status = {
        "status": "healthy",
        "service": "Baba Ayurveda Pharmacy API",
        "version": "1.0.0",
        "timestamp": "2025-12-25T00:00:00Z"
    }
    
    # Check Supabase connection
    if supabase:
        health_status["database"] = "connected"
    else:
        health_status["database"] = "not_configured"
    
    # Check Razorpay configuration
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        health_status["payment_gateway"] = "configured"
    else:
        health_status["payment_gateway"] = "not_configured"
    
    return health_status

@app.post("/create-payment-order")
async def create_payment_order(order_request: CreateOrderRequest):
    try:
        # Create order data for Razorpay with all payment methods enabled
        order_data = {
            'amount': order_request.amount,
            'currency': order_request.currency,
            'receipt': order_request.receipt,
            'payment_capture': '1',  # Auto capture payment
            'notes': {
                'merchant_name': 'Baba Ayurveda Pharmacy',
                'order_type': 'product_purchase'
            }
        }
        
        # Create order using Razorpay client
        order = razorpay_client.order.create(data=order_data)
        
        return {
            "id": order['id'],
            "amount": order['amount'],
            "currency": order['currency'],
            "receipt": order['receipt'],
            "status": order['status']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating order: {str(e)}")

@app.post("/verify-payment")
async def verify_payment(verification_request: PaymentVerificationRequest):
    try:
        logger.info(
            "Payment verification request: payment_id=%s order_id=%s has_signature=%s",
            verification_request.razorpay_payment_id,
            verification_request.razorpay_order_id,
            bool(verification_request.razorpay_signature)
        )
        
        # Fetch payment details from Razorpay first to check status
        payment = razorpay_client.payment.fetch(verification_request.razorpay_payment_id)
        
        logger.info(
            "Payment fetched from Razorpay: payment_id=%s status=%s amount=%s method=%s",
            verification_request.razorpay_payment_id,
            payment.get('status'),
            payment.get('amount'),
            payment.get('method')
        )
        
        # Verify signature if provided (some payment methods may not provide signature)
        signature_valid = True
        if verification_request.razorpay_signature:
            body = verification_request.razorpay_order_id + "|" + verification_request.razorpay_payment_id
            expected_signature = hmac.new(
                RAZORPAY_KEY_SECRET.encode('utf-8'),
                body.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            signature_valid = (expected_signature == verification_request.razorpay_signature)
            
            if not signature_valid:
                logger.warning(
                    "Invalid signature: payment_id=%s expected=%s received=%s",
                    verification_request.razorpay_payment_id,
                    expected_signature,
                    verification_request.razorpay_signature
                )
        
        if signature_valid:
            # Process payment based on current status
            if payment['status'] == 'authorized':
                # Try to capture the payment
                try:
                    captured_payment = razorpay_client.payment.capture(
                        verification_request.razorpay_payment_id, 
                        payment['amount']
                    )
                    
                    # Log successful payment completion
                    logger.info(
                        "PAYMENT SUCCESS - Captured: payment_id=%s order_id=%s amount=%s method=%s customer=%s",
                        verification_request.razorpay_payment_id,
                        verification_request.razorpay_order_id,
                        captured_payment.get('amount', 0),
                        captured_payment.get('method', 'unknown'),
                        captured_payment.get('email', 'unknown')
                    )
                    
                    return {
                        "success": True,
                        "message": "Payment verified and captured successfully",
                        "payment_id": verification_request.razorpay_payment_id,
                        "status": "captured",
                        "amount": captured_payment.get('amount', 0),
                        "method": captured_payment.get('method')
                    }
                except Exception as capture_error:
                    logger.error(
                        "Payment capture failed: payment_id=%s error=%s",
                        verification_request.razorpay_payment_id,
                        str(capture_error)
                    )
                    return {
                        "success": False,
                        "message": f"Payment verified but capture failed: {str(capture_error)}",
                        "payment_id": verification_request.razorpay_payment_id,
                        "status": "authorized"
                    }
                    
            elif payment['status'] == 'captured':
                # Log already successful payment
                logger.info(
                    "PAYMENT SUCCESS - Already captured: payment_id=%s order_id=%s amount=%s method=%s",
                    verification_request.razorpay_payment_id,
                    verification_request.razorpay_order_id,
                    payment.get('amount', 0),
                    payment.get('method', 'unknown')
                )
                
                return {
                    "success": True,
                    "message": "Payment verified and already captured",
                    "payment_id": verification_request.razorpay_payment_id,
                    "status": "captured",
                    "amount": payment.get('amount', 0),
                    "method": payment.get('method')
                }
            else:
                logger.warning(
                    "Payment verification failed - unexpected status: payment_id=%s status=%s",
                    verification_request.razorpay_payment_id,
                    payment['status']
                )
                return {
                    "success": False,
                    "message": f"Payment status is {payment['status']}",
                    "payment_id": verification_request.razorpay_payment_id,
                    "status": payment['status']
                }
        else:
            return {
                "success": False,
                "message": "Payment verification failed - invalid signature",
                "payment_id": verification_request.razorpay_payment_id,
                "provided_signature": verification_request.razorpay_signature,
                "expected_signature": expected_signature
            }
                    
    except Exception as e:
        logger.error(
            "Payment verification error: payment_id=%s error=%s",
            verification_request.razorpay_payment_id,
            str(e)
        )
        raise HTTPException(status_code=500, detail=f"Error verifying payment: {str(e)}")

@app.post("/capture-payment")
async def capture_payment(payment_id: str, amount: int = None):
    """Manually capture an authorized payment"""
    try:
        # Fetch payment details first
        payment = razorpay_client.payment.fetch(payment_id)
        
        if payment['status'] != 'authorized':
            return {
                "success": False,
                "message": f"Payment status is {payment['status']}, can only capture authorized payments"
            }
        
        # Use provided amount or payment amount
        capture_amount = amount if amount else payment['amount']
        
        # Capture the payment
        captured_payment = razorpay_client.payment.capture(payment_id, capture_amount)
        
        # Log the successful manual capture
        logger.info(
            "Manual capture successful: payment_id=%s amount=%s status=%s method=%s",
            payment_id,
            captured_payment.get('amount'),
            captured_payment.get('status'),
            captured_payment.get('method')
        )

        return {
            "success": True,
            "message": "Payment captured successfully",
            "payment_id": payment_id,
            "amount": captured_payment['amount'],
            "status": captured_payment['status']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error capturing payment: {str(e)}")

@app.get("/payment-status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Get current payment status from Razorpay"""
    try:
        payment = razorpay_client.payment.fetch(payment_id)
        return {
            "payment_id": payment_id,
            "status": payment['status'],
            "amount": payment['amount'],
            "method": payment.get('method'),
            "created_at": payment.get('created_at')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payment status: {str(e)}")

@app.get("/payment-analytics")
async def get_payment_analytics():
    """Get payment analytics and statistics"""
    try:
        # This would typically connect to your database
        # For now, returning sample data structure
        analytics = {
            "daily_revenue": {
                "today": 0,
                "yesterday": 0,
                "change_percentage": 0
            },
            "payment_methods": {
                "razorpay": {"count": 0, "amount": 0},
                "cod": {"count": 0, "amount": 0}
            },
            "status_breakdown": {
                "paid": 0,
                "pending": 0,
                "failed": 0
            },
            "recent_transactions": []
        }
        
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")

@app.get("/orders/{order_id}/payment-details")
async def get_order_payment_details(order_id: str):
    """Get detailed payment information for a specific order"""
    try:
        # This would fetch from your database
        # Sample response structure
        payment_details = {
            "order_id": order_id,
            "payment_id": "pay_xxxxxxxxxx",
            "razorpay_order_id": "order_xxxxxxxxxx", 
            "amount": 0,
            "currency": "INR",
            "status": "captured",
            "method": "card",
            "created_at": "",
            "authorized_at": "",
            "captured_at": "",
            "gateway_response": {}
        }
        
        return payment_details
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payment details: {str(e)}")

@app.get("/orders/{user_id}")
async def get_user_orders(user_id: str):
    """Get all orders for a specific user with shipment details"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Fetch orders for the user
        orders_result = supabase.table('orders').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        
        # Fetch shipments for these orders
        orders_with_shipments = []
        for order in orders_result.data:
            # Get shipment data for this order
            shipment_result = supabase.table('shipments').select('*').eq('order_id', order['order_number']).execute()
            
            order_data = order.copy()
            if shipment_result.data and len(shipment_result.data) > 0:
                shipment = shipment_result.data[0]
                order_data['shipment'] = {
                    'awb_number': shipment.get('awb_number'),
                    'courier_name': shipment.get('courier_name'),
                    'courier_id': shipment.get('courier_id'),
                    'status': shipment.get('status'),
                    'tracking_url': f"https://www.bigship.in/track/{shipment.get('awb_number')}" if shipment.get('awb_number') else None
                }
                # Add shipping_charges to order if available from shipment
                order_data['shipping_charges'] = shipment.get('shipping_charges', 0)
            else:
                # Default shipping charges if no shipment data
                order_data['shipping_charges'] = 0
            
            orders_with_shipments.append(order_data)
        
        logger.info("Fetched %d orders for user_id=%s", len(orders_with_shipments), user_id)
        
        return {
            "success": True,
            "orders": orders_with_shipments
        }
        
    except Exception as e:
        logger.error("Error fetching orders for user %s: %s", user_id, str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching orders: {str(e)}")

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}

@app.post("/create-order")
async def create_order_in_db(order_request: CreateOrderInDBRequest):
    """Create order in database after successful payment"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        logger.info(
            "Creating order: user_id=%s order_number=%s payment_id=%s total=%s",
            order_request.user_id,
            order_request.order_number,
            order_request.payment_id,
            order_request.total_amount
        )
        
        # Ensure user exists in users table before creating order
        try:
            # Check if user exists in public.users table (not auth.users)
            user_check = supabase.table('users').select('id').eq('id', order_request.user_id).execute()
            
            if not user_check.data:
                # User doesn't exist, create a minimal user record in public.users
                logger.info("Creating missing user record in public.users: user_id=%s", order_request.user_id)
                user_data = {
                    'id': order_request.user_id,
                    'phone': order_request.phone,
                    'created_at': order_request.payment_completed_at,
                    'updated_at': order_request.payment_completed_at
                }
                supabase.table('users').insert(user_data).execute()
                logger.info("User record created successfully in public.users: user_id=%s", order_request.user_id)
            else:
                logger.info("User exists in public.users: user_id=%s", order_request.user_id)
        except Exception as user_error:
            logger.error("Failed to create user record: %s", user_error)
            # If we can't create the user, we need to fail the order creation
            raise HTTPException(
                status_code=500, 
                detail=f"Cannot create order: User record creation failed. Database constraint error. Please contact support."
            )
        
        # Prepare order data
        order_data = {
            "user_id": order_request.user_id,
            "order_number": order_request.order_number,
            "items": [item.dict() for item in order_request.items],
            "total_amount": order_request.total_amount,
            "phone": order_request.phone,
            "shipping_address": order_request.shipping_address,  # Add shipping address
            "status": "confirmed",
            "payment_method": order_request.payment_method,
            "payment_status": order_request.payment_status,
            "payment_id": order_request.payment_id,
            "order_id": order_request.razorpay_order_id,  # Use razorpay_order_id for the order_id field
            "razorpay_signature": order_request.razorpay_signature,
            "payment_gateway": order_request.payment_gateway,
            "payment_amount": order_request.payment_amount,
            "payment_currency": order_request.payment_currency,
            "payment_captured": order_request.payment_captured,
            "payment_completed_at": order_request.payment_completed_at,
        }
        
        # Insert order into database
        result = supabase.table('orders').insert(order_data).execute()
        
        if result.data:
            order_id = result.data[0]['id']
            
            # Also log the payment details in payment_logs table
            try:
                payment_log_data = {
                    "order_id": order_id,
                    "payment_id": order_request.payment_id,
                    "razorpay_order_id": order_request.razorpay_order_id,
                    "razorpay_payment_id": order_request.payment_id,
                    "razorpay_signature": order_request.razorpay_signature,
                    "amount": order_request.payment_amount,
                    "currency": order_request.payment_currency,
                    "status": "captured",
                    "gateway_response": {
                        "payment_id": order_request.payment_id,
                        "order_id": order_request.razorpay_order_id,
                        "signature": order_request.razorpay_signature
                    }
                }
                supabase.table('payment_logs').insert(payment_log_data).execute()
            except Exception as log_error:
                logger.warning("Failed to log payment details: %s", log_error)
                # Don't fail the order if payment logging fails
            
            # Log successful order creation
            logger.info(
                "ORDER CREATED: order_id=%s order_number=%s user_id=%s payment_id=%s total=%s",
                order_id,
                order_request.order_number,
                order_request.user_id,
                order_request.payment_id,
                order_request.total_amount
            )
            
            # Automatically create BigShip shipment for confirmed orders
            try:
                await create_bigship_shipment_for_order(
                    order_number=order_request.order_number,
                    order_data=result.data[0]
                )
                logger.info(f"BigShip shipment created automatically for order {order_request.order_number}")
            except Exception as shipment_error:
                logger.error(f"Failed to create BigShip shipment for order {order_request.order_number}: {str(shipment_error)}")
                # Don't fail the order creation if BigShip shipment fails
                # Admin can create it manually later
            
            return {
                "success": True,
                "message": "Order created successfully",
                "order_id": order_id,
                "order_number": order_request.order_number
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create order")
            
    except Exception as e:
        logger.error("Error creating order in database: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error creating order: {str(e)}")

# PRODUCTS ENDPOINTS
@app.get("/products")
async def get_products(category: Optional[str] = None, featured: Optional[bool] = None, 
                      bestseller: Optional[bool] = None, show_in_hero: Optional[bool] = None, 
                      tags: Optional[str] = None, limit: Optional[int] = None):
    """Get all products with optional filtering and calculated ratings from reviews"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        query = supabase.table('products').select('*')
        
        if category:
            query = query.eq('category_id', category)
        if featured is not None:
            query = query.eq('is_featured', featured)
        if bestseller is not None:
            query = query.eq('is_bestseller', bestseller)
        if show_in_hero is not None:
            query = query.eq('show_in_hero', show_in_hero)
        if tags:
            query = query.eq('tags', tags)
        if limit:
            query = query.limit(limit)
            
        result = query.execute()
        
        # Calculate actual ratings from reviews for each product
        products = result.data if result.data else []
        for product in products:
            try:
                # Get reviews for this product
                reviews_result = supabase.table('reviews').select('rating').eq('product_id', product['id']).execute()
                
                if reviews_result.data and len(reviews_result.data) > 0:
                    # Calculate average rating from actual reviews
                    total_rating = sum(r['rating'] for r in reviews_result.data)
                    avg_rating = round(total_rating / len(reviews_result.data), 1)
                    product['rating'] = avg_rating
                    product['review_count'] = len(reviews_result.data)
                else:
                    # No reviews yet - show 0 or keep as 5 for display purposes
                    product['rating'] = 0
                    product['review_count'] = 0
            except Exception as e:
                logger.warning(f"Error calculating rating for product {product['id']}: {str(e)}")
                # Keep original rating on error
                product['review_count'] = 0
        
        return {"data": products}
        
    except Exception as e:
        logger.error("Error fetching products: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")

@app.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get a single product by ID with calculated rating from reviews"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        result = supabase.table('products').select('*').eq('id', product_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product = result.data[0]
        
        # Calculate actual rating from reviews
        try:
            reviews_result = supabase.table('reviews').select('rating').eq('product_id', product_id).execute()
            
            if reviews_result.data and len(reviews_result.data) > 0:
                # Calculate average rating from actual reviews
                total_rating = sum(r['rating'] for r in reviews_result.data)
                avg_rating = round(total_rating / len(reviews_result.data), 1)
                product['rating'] = avg_rating
                product['review_count'] = len(reviews_result.data)
            else:
                # No reviews yet
                product['rating'] = 0
                product['review_count'] = 0
        except Exception as e:
            logger.warning(f"Error calculating rating for product {product_id}: {str(e)}")
            product['review_count'] = 0
            
        return {"data": product}
        
    except Exception as e:
        logger.error("Error fetching product %s: %s", product_id, str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching product: {str(e)}")

@app.post("/products")
async def create_product(product: ProductCreate):
    """Create a new product"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Generate slug from product name
        import re
        slug = re.sub(r'[^a-zA-Z0-9\s-]', '', product.name.lower())
        slug = re.sub(r'\s+', '-', slug.strip())
        slug = re.sub(r'-+', '-', slug)
        
        # Create product data with slug
        product_data = product.dict()
        product_data['slug'] = slug
        
        # Convert comma-separated images string to JSON array for database
        if product_data.get('images'):
            if isinstance(product_data['images'], str):
                # Split by comma and clean up whitespace
                images_list = [img.strip() for img in product_data['images'].split(',') if img.strip()]
                product_data['images'] = images_list
        else:
            product_data['images'] = []
        
        result = supabase.table('products').insert(product_data).execute()
        
        if result.data:
            logger.info("Product created: %s", result.data[0]['id'])
            return {"data": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create product")
            
    except Exception as e:
        logger.error("Error creating product: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error creating product: {str(e)}")

@app.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductUpdate):
    """Update a product"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Filter out None values
        update_data = {k: v for k, v in product_data.dict().items() if v is not None}
        
        # If name is being updated, generate new slug
        if 'name' in update_data:
            import re
            slug = re.sub(r'[^a-zA-Z0-9\s-]', '', update_data['name'].lower())
            slug = re.sub(r'\s+', '-', slug.strip())
            slug = re.sub(r'-+', '-', slug)
            update_data['slug'] = slug
        
        # Convert comma-separated images string to JSON array for database
        if 'images' in update_data and update_data['images'] is not None:
            if isinstance(update_data['images'], str):
                # Split by comma and clean up whitespace
                images_list = [img.strip() for img in update_data['images'].split(',') if img.strip()]
                update_data['images'] = images_list
        
        result = supabase.table('products').update(update_data).eq('id', product_id).execute()
        
        if result.data:
            logger.info("Product updated: %s", product_id)
            return {"data": result.data[0]}
        else:
            raise HTTPException(status_code=404, detail="Product not found")
            
    except Exception as e:
        logger.error("Error updating product %s: %s", product_id, str(e))
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")

@app.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        result = supabase.table('products').delete().eq('id', product_id).execute()
        
        if result.data:
            logger.info("Product deleted: %s", product_id)
            return {"success": True, "message": "Product deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Product not found")
            
    except Exception as e:
        logger.error("Error deleting product %s: %s", product_id, str(e))
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")

@app.post("/products/bulk")
async def bulk_create_products(products: List[ProductCreate]):
    """Bulk create multiple products"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        import re
        products_data = []
        
        # Generate slugs for each product
        for product in products:
            product_data = product.dict()
            # Generate slug from product name
            slug = re.sub(r'[^a-zA-Z0-9\s-]', '', product.name.lower())
            slug = re.sub(r'\s+', '-', slug.strip())
            slug = re.sub(r'-+', '-', slug)
            product_data['slug'] = slug
            products_data.append(product_data)
        
        result = supabase.table('products').insert(products_data).execute()
        
        if result.data:
            logger.info("Bulk created %d products", len(result.data))
            return {"data": result.data, "count": len(result.data)}
        else:
            raise HTTPException(status_code=500, detail="Failed to create products")
            
    except Exception as e:
        logger.error("Error bulk creating products: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error creating products: {str(e)}")

# CATEGORIES ENDPOINTS
@app.get("/categories")
async def get_categories(limit: Optional[int] = None):
    """Get all categories"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        query = supabase.table('categories').select('*')
        
        if limit:
            query = query.limit(limit)
            
        result = query.execute()
        return {"data": result.data}
        
    except Exception as e:
        logger.error("Error fetching categories: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")

@app.post("/categories")
async def create_category(category: CategoryCreate):
    """Create a new category"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Generate slug from category name
        import re
        slug = re.sub(r'[^a-zA-Z0-9\s-]', '', category.name.lower())
        slug = re.sub(r'\s+', '-', slug.strip())
        slug = re.sub(r'-+', '-', slug)
        
        # Create category data with slug
        category_data = category.dict()
        category_data['slug'] = slug
        
        result = supabase.table('categories').insert(category_data).execute()
        
        if result.data:
            logger.info("Category created: %s", result.data[0]['id'])
            return {"data": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create category")
            
    except Exception as e:
        logger.error("Error creating category: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error creating category: {str(e)}")

@app.put("/categories/{category_id}")
async def update_category(category_id: str, category_data: CategoryUpdate):
    """Update a category"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Filter out None values
        update_data = {k: v for k, v in category_data.dict().items() if v is not None}
        
        # If name is being updated, generate new slug
        if 'name' in update_data:
            import re
            slug = re.sub(r'[^a-zA-Z0-9\s-]', '', update_data['name'].lower())
            slug = re.sub(r'\s+', '-', slug.strip())
            slug = re.sub(r'-+', '-', slug)
            update_data['slug'] = slug
        
        result = supabase.table('categories').update(update_data).eq('id', category_id).execute()
        
        if result.data:
            logger.info("Category updated: %s", category_id)
            return {"data": result.data[0]}
        else:
            raise HTTPException(status_code=404, detail="Category not found")
            
    except Exception as e:
        logger.error("Error updating category %s: %s", category_id, str(e))
        raise HTTPException(status_code=500, detail=f"Error updating category: {str(e)}")

@app.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        result = supabase.table('categories').delete().eq('id', category_id).execute()
        
        if result.data:
            logger.info("Category deleted: %s", category_id)
            return {"success": True, "message": "Category deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Category not found")
            
    except Exception as e:
        logger.error("Error deleting category %s: %s", category_id, str(e))
        raise HTTPException(status_code=500, detail=f"Error deleting category: {str(e)}")


# ==================== BIGSHIP DELIVERY API ENDPOINTS ====================

@app.get("/bigship/couriers")
async def get_available_couriers():
    """Get list of available courier partners"""
    try:
        couriers = bigship_service.get_courier_list()
        return {
            "success": True,
            "data": couriers
        }
    except Exception as e:
        logger.error(f"Error fetching couriers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bigship/payment-categories")
async def get_payment_categories():
    """Get available payment categories (COD, Prepaid)"""
    try:
        categories = bigship_service.get_payment_categories()
        return {
            "success": True,
            "data": categories
        }
    except Exception as e:
        logger.error(f"Error fetching payment categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bigship/wallet-balance")
async def get_wallet_balance():
    """Get current Bigship wallet balance"""
    try:
        balance = bigship_service.get_wallet_balance()
        return {
            "success": True,
            "balance": balance
        }
    except Exception as e:
        logger.error(f"Error fetching wallet balance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bigship/warehouses")
async def get_warehouses(page_index: int = 1, page_size: int = 10):
    """Get list of registered warehouses"""
    try:
        warehouses = bigship_service.get_warehouse_list(page_index, page_size)
        return {
            "success": True,
            "data": warehouses
        }
    except Exception as e:
        logger.error(f"Error fetching warehouses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class CalculateRatesRequest(BaseModel):
    pickup_pincode: str
    destination_pincode: str
    payment_type: str  # COD or Prepaid
    invoice_amount: float
    weight: float  # in kg
    length: int  # in cm
    width: int  # in cm
    height: int  # in cm


@app.post("/bigship/calculate-rates")
async def calculate_shipping_rates(request: CalculateRatesRequest):
    """Calculate shipping rates for different couriers"""
    try:
        box_details = [{
            "each_box_dead_weight": request.weight,
            "each_box_length": request.length,
            "each_box_width": request.width,
            "each_box_height": request.height,
            "box_count": 1
        }]
        
        rates = bigship_service.calculate_shipping_rates(
            pickup_pincode=request.pickup_pincode,
            destination_pincode=request.destination_pincode,
            payment_type=request.payment_type,
            invoice_amount=request.invoice_amount,
            box_details=box_details
        )
        
        return {
            "success": True,
            "data": rates
        }
    except Exception as e:
        logger.error(f"Error calculating rates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class CreateShipmentRequest(BaseModel):
    order_id: str  # Your internal order ID
    pickup_warehouse_id: int
    return_warehouse_id: int
    
    # Customer details
    customer_first_name: str
    customer_last_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    
    # Delivery address
    address_line1: str
    address_line2: Optional[str] = None
    address_landmark: Optional[str] = None
    pincode: str
    city: str
    state: str
    
    # Order details
    payment_type: str  # COD or Prepaid
    invoice_amount: float
    cod_amount: float = 0  # Amount to collect for COD
    
    # Package details
    weight: float  # in kg
    length: int  # in cm
    width: int  # in cm
    height: int  # in cm
    
    # Items
    items: List[Dict[str, Any]]  # List of products
    
    # Optional
    preferred_courier_id: Optional[int] = None


@app.post("/bigship/create-shipment")
async def create_shipment(request: CreateShipmentRequest):
    """Create a shipment and get AWB number"""
    try:
        # Prepare consignee details
        consignee = BigshipConsignee(
            first_name=request.customer_first_name,
            last_name=request.customer_last_name,
            contact_number_primary=request.customer_phone,
            email_id=request.customer_email or "",
            consignee_address=BigshipAddress(
                address_line1=request.address_line1,
                address_line2=request.address_line2 or "",
                address_landmark=request.address_landmark or "",
                pincode=request.pincode
            )
        )
        
        # Prepare product details
        product_details = []
        total_product_amount = 0
        
        for item in request.items:
            price_per_unit = item.get("price", 0)
            quantity = item.get("quantity", 1)
            total_item_price = price_per_unit * quantity
            total_product_amount += total_item_price
            
            # IMPORTANT: each_product_invoice_amount should be TOTAL for this product line
            # (price × quantity), NOT price per unit
            product_details.append(BigshipProductDetail(
                product_name=item.get("name", "Product"),
                product_quantity=quantity,
                each_product_invoice_amount=total_item_price,  # Total amount (price × quantity)
                each_product_collectable_amount=item.get("cod_amount", 0) if request.payment_type == "COD" else 0,
                product_category=item.get("category", "Others")
            ))
        
        # Use the calculated total from products, not the request total
        # This ensures box_amount = sum of all each_product_invoice_amount
        box_invoice_amount = total_product_amount
        
        # Prepare box details
        box_details = [BigshipBoxDetail(
            each_box_dead_weight=request.weight,
            each_box_length=request.length,
            each_box_width=request.width,
            each_box_height=request.height,
            each_box_invoice_amount=box_invoice_amount,  # Must equal sum of all products
            each_box_collectable_amount=request.cod_amount if request.payment_type == "COD" else 0,
            box_count=1,
            product_details=product_details
        )]
        
        # Create order
        system_order_id = bigship_service.create_b2c_order(
            pickup_location_id=request.pickup_warehouse_id,
            return_location_id=request.return_warehouse_id,
            consignee=consignee,
            invoice_id=request.order_id,
            payment_type=request.payment_type,
            invoice_amount=request.invoice_amount,
            collectable_amount=request.cod_amount if request.payment_type == "COD" else 0,
            box_details=box_details
        )
        
        if not system_order_id:
            raise HTTPException(status_code=500, detail="Failed to create shipment")
        
        # Get shipping rates for the order
        rates = bigship_service.get_shipping_rates_for_order(int(system_order_id))
        
        # Manifest the order (assign to courier)
        # Don't pass courier_id - let Bigship auto-assign the best available courier
        manifest_success = bigship_service.manifest_order(
            system_order_id=int(system_order_id),
            courier_id=None  # Auto-assign best courier
        )
        
        if not manifest_success:
            raise HTTPException(status_code=500, detail="Failed to manifest shipment. Bigship will auto-assign courier.")
        
        # Get AWB number
        awb_data = bigship_service.get_awb_and_label(
            system_order_id=int(system_order_id),
            data_type=1  # 1 for AWB
        )
        
        # Get label
        label_data = bigship_service.get_awb_and_label(
            system_order_id=int(system_order_id),
            data_type=2  # 2 for Label
        )
        
        # Store shipment details in database
        if supabase:
            try:
                # Calculate shipping charges from rates if available
                shipping_charges = 0
                if rates and len(rates) > 0:
                    # Use the first available rate's freight charge
                    shipping_charges = rates[0].get('freight_charge', 0)
                
                shipment_data = {
                    "order_id": request.order_id,
                    "system_order_id": system_order_id,
                    "awb_number": awb_data.get("master_awb") if awb_data else None,
                    "courier_name": awb_data.get("courier_name") if awb_data else None,
                    "courier_id": awb_data.get("courier_id") if awb_data else None,
                    "status": "manifested",
                    "payment_type": request.payment_type,
                    "invoice_amount": request.invoice_amount,
                    "cod_amount": request.cod_amount,
                    "shipping_charges": shipping_charges,
                    "customer_name": f"{request.customer_first_name} {request.customer_last_name}",
                    "customer_phone": request.customer_phone,
                    "customer_email": request.customer_email,
                    "address_line1": request.address_line1,
                    "address_line2": request.address_line2,
                    "address_landmark": request.address_landmark,
                    "pincode": request.pincode,
                    "city": request.city,
                    "state": request.state,
                    "weight": request.weight,
                    "length": request.length,
                    "width": request.width,
                    "height": request.height,
                    "pickup_warehouse_id": request.pickup_warehouse_id,
                    "return_warehouse_id": request.return_warehouse_id,
                    "label_url": label_data.get("url") if label_data else None
                }
                
                supabase.table('shipments').insert(shipment_data).execute()
                logger.info(f"Shipment created and stored: {system_order_id}")
            except Exception as db_error:
                logger.error(f"Failed to store shipment in database: {str(db_error)}")
        
        return {
            "success": True,
            "data": {
                "system_order_id": system_order_id,
                "awb_number": awb_data.get("master_awb") if awb_data else None,
                "courier_name": awb_data.get("courier_name") if awb_data else None,
                "courier_id": awb_data.get("courier_id") if awb_data else None,
                "label": label_data,
                "available_rates": rates
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating shipment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bigship/track/{tracking_id}")
async def track_shipment(tracking_id: str, tracking_type: str = "awb"):
    """Track shipment by AWB or LRN number"""
    try:
        tracking_data = bigship_service.track_shipment(
            tracking_id=tracking_id,
            tracking_type=tracking_type
        )
        
        if not tracking_data:
            raise HTTPException(status_code=404, detail="Tracking information not found")
        
        return {
            "success": True,
            "data": tracking_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking shipment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/bigship/cancel-shipment")
async def cancel_shipment(awb_numbers: List[str]):
    """Cancel one or more shipments"""
    try:
        result = bigship_service.cancel_shipment(awb_numbers)
        
        # Update shipment status in database
        if supabase:
            try:
                for awb in awb_numbers:
                    supabase.table('shipments').update({
                        "status": "cancelled"
                    }).eq('awb_number', awb).execute()
            except Exception as db_error:
                logger.error(f"Failed to update shipment status in database: {str(db_error)}")
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error cancelling shipment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bigship/shipment/{order_id}")
async def get_shipment_by_order(order_id: str):
    """Get shipment details by internal order ID"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        result = supabase.table('shipments').select("*").eq('order_id', order_id).execute()
        
        if result.data and len(result.data) > 0:
            return {
                "success": True,
                "data": result.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Shipment not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shipment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bigship/shipments")
async def get_all_shipments():
    """Get all shipments for debugging"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        result = supabase.table('shipments').select("*").order('created_at', desc=True).limit(50).execute()
        
        return {
            "success": True,
            "count": len(result.data) if result.data else 0,
            "data": result.data or []
        }
    except Exception as e:
        logger.error(f"Error fetching shipments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reviews")
async def create_review(review: ReviewCreate):
    """Create a new product review"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Validate rating
        if review.rating < 1 or review.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Check if user has already reviewed this product for this order
        existing_review = supabase.table('reviews').select('*').eq('user_id', review.user_id).eq('product_id', review.product_id).eq('order_id', review.order_id).execute()
        
        if existing_review.data and len(existing_review.data) > 0:
            raise HTTPException(status_code=400, detail="You have already reviewed this product for this order")
        
        # Insert review
        review_data = {
            'user_id': review.user_id,
            'product_id': review.product_id,
            'order_id': review.order_id,
            'rating': review.rating,
            'review': review.review,
            'reviewer_type': review.reviewer_type  # Include reviewer_type
        }
        
        result = supabase.table('reviews').insert(review_data).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Review created successfully for product {review.product_id} by user {review.user_id}")
            return {
                "success": True,
                "message": "Review submitted successfully",
                "review": result.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create review")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating review: {str(e)}")


@app.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str, limit: Optional[int] = 4):
    """Get reviews for a specific product with user information"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # First, get all reviews to calculate proper average (without limit)
        all_reviews_result = supabase.table('reviews').select('rating').eq('product_id', product_id).execute()
        
        # Calculate average rating from all reviews
        avg_rating = 0
        total_reviews_count = 0
        if all_reviews_result.data:
            total_reviews_count = len(all_reviews_result.data)
            if total_reviews_count > 0:
                total_rating = sum(r['rating'] for r in all_reviews_result.data)
                avg_rating = round(total_rating / total_reviews_count, 1)
        
        # Now fetch limited reviews with full details for display
        reviews_query = supabase.table('reviews').select('*').eq('product_id', product_id).order('created_at', desc=True)
        
        if limit:
            reviews_query = reviews_query.limit(limit)
            
        reviews_result = reviews_query.execute()
        
        reviews = []
        if reviews_result.data:
            for review_data in reviews_result.data:
                # Fetch user information
                user_name = 'Anonymous'
                
                try:
                    user_result = supabase.table('users').select('username').eq('id', review_data.get('user_id')).execute()
                    if user_result.data and len(user_result.data) > 0:
                        user_info = user_result.data[0]
                        user_name = user_info.get('username') or 'Customer'
                except Exception as e:
                    logger.warning(f"Could not fetch user info for review: {str(e)}")
                
                reviews.append({
                    'id': review_data.get('id'),
                    'user_id': review_data.get('user_id'),
                    'user_name': user_name,
                    'reviewer_type': review_data.get('reviewer_type', 'customer'),  # Get from review, not user
                    'rating': review_data.get('rating'),
                    'review': review_data.get('review'),
                    'created_at': review_data.get('created_at'),
                    'order_id': review_data.get('order_id')
                })
        
        logger.info(f"Fetched {len(reviews)} reviews (out of {total_reviews_count} total) for product {product_id}")
        
        return {
            "success": True,
            "product_id": product_id,
            "total_reviews": total_reviews_count,
            "average_rating": avg_rating,
            "reviews": reviews
        }
        
    except Exception as e:
        logger.error(f"Error fetching reviews for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching reviews: {str(e)}")


@app.get("/reviews/user/{user_id}")
async def get_user_reviews(user_id: str):
    """Get all reviews by a specific user"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Fetch reviews by the user
        reviews_result = supabase.table('reviews').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        
        logger.info(f"Fetched {len(reviews_result.data) if reviews_result.data else 0} reviews for user {user_id}")
        
        return {
            "success": True,
            "user_id": user_id,
            "total_reviews": len(reviews_result.data) if reviews_result.data else 0,
            "reviews": reviews_result.data or []
        }
        
    except Exception as e:
        logger.error(f"Error fetching reviews for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching reviews: {str(e)}")


# ============================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================

class CreateUserRequest(BaseModel):
    phone: str
    username: Optional[str] = None
    email: Optional[str] = None

class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

@app.post("/users")
async def create_user(user_data: CreateUserRequest):
    """Create a new user or return existing user"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Format phone number
        formatted_phone = user_data.phone
        if not formatted_phone.startswith('+91'):
            formatted_phone = f"+91{formatted_phone.replace('+91', '').replace(' ', '')}"
        
        # Check if user already exists
        existing_user = supabase.table('users').select('*').eq('phone', formatted_phone).execute()
        
        if existing_user.data and len(existing_user.data) > 0:
            user = existing_user.data[0]
            is_new_user = not user.get('username') or not user.get('email')
            
            logger.info(f"User already exists: {formatted_phone}")
            return {
                "success": True,
                "user": user,
                "is_new_user": is_new_user,
                "message": "User already exists"
            }
        
        # Create new user
        new_user_data = {
            "phone": formatted_phone
        }
        
        if user_data.username:
            new_user_data["username"] = user_data.username
        if user_data.email:
            new_user_data["email"] = user_data.email
        
        result = supabase.table('users').insert(new_user_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        user = result.data[0]
        is_new_user = not user.get('username') or not user.get('email')
        
        logger.info(f"Created new user: {formatted_phone}")
        
        return {
            "success": True,
            "user": user,
            "is_new_user": is_new_user,
            "message": "User created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")


@app.get("/users/by-phone/{phone}")
async def get_user_by_phone(phone: str):
    """Get user by phone number"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Format phone number
        formatted_phone = phone
        if not formatted_phone.startswith('+91'):
            formatted_phone = f"+91{formatted_phone.replace('+91', '').replace(' ', '')}"
        
        # Fetch user
        result = supabase.table('users').select('*').eq('phone', formatted_phone).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = result.data[0]
        is_new_user = not user.get('username') or not user.get('email')
        
        logger.info(f"Fetched user: {formatted_phone}")
        
        return {
            "success": True,
            "user": user,
            "is_new_user": is_new_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")


@app.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Fetch user
        result = supabase.table('users').select('*').eq('id', user_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = result.data[0]
        
        logger.info(f"Fetched user by ID: {user_id}")
        
        return {
            "success": True,
            "user": user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")


@app.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UpdateUserRequest):
    """Update user profile"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Prepare update data
        update_data = {}
        
        if user_data.username is not None:
            update_data["username"] = user_data.username
        if user_data.email is not None:
            update_data["email"] = user_data.email
        if user_data.address is not None:
            update_data["address"] = user_data.address
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        # Update user
        result = supabase.table('users').update(update_data).eq('id', user_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = result.data[0]
        
        logger.info(f"Updated user: {user_id}")
        
        return {
            "success": True,
            "user": user,
            "message": "User updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")



