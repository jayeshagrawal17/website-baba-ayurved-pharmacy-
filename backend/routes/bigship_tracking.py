from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.database import get_supabase_client
import requests
import os
import logging
from datetime import datetime
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)

BIGSHIP_API_URL = "https://api.bigship.in"
BIGSHIP_TOKEN: Optional[str] = None  # Will be set after login


def get_bigship_token():
    """Login to BigShip and get authentication token"""
    global BIGSHIP_TOKEN
    
    try:
        username = os.getenv('BIGSHIP_USERNAME')
        password = os.getenv('BIGSHIP_PASSWORD')
        access_key = os.getenv('BIGSHIP_ACCESS_KEY')
        
        if not all([username, password, access_key]):
            logger.error("BigShip credentials not configured")
            return None
        
        response = requests.post(
            f"{BIGSHIP_API_URL}/api/login/user",
            json={
                "user_name": username,
                "password": password,
                "access_key": access_key
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                BIGSHIP_TOKEN = result['data']['token']
                logger.info("BigShip token generated successfully")
                return BIGSHIP_TOKEN
            else:
                logger.error(f"BigShip login failed: {result.get('message')}")
                return None
        else:
            logger.error(f"Failed to generate BigShip token: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error generating BigShip token: {str(e)}")
        return None


@router.post("/track-order/{order_number}")
async def track_order(order_number: str):
    """
    Track a single order using BigShip Tracking API
    Updates order status based on current shipment status
    """
    try:
        supabase = get_supabase_client()
        
        # Get shipment details from database
        shipment_result = supabase.table('shipments').select('*').eq('system_order_id', order_number).execute()
        
        if not shipment_result.data or len(shipment_result.data) == 0:
            raise HTTPException(status_code=404, detail="Shipment not found for this order")
        
        shipment = shipment_result.data[0]
        awb_number = shipment.get('awb_number')
        
        if not awb_number:
            raise HTTPException(status_code=400, detail="AWB number not found for this order")
        
        # Get BigShip token
        token = BIGSHIP_TOKEN or get_bigship_token()
        if not token:
            raise HTTPException(status_code=500, detail="Failed to authenticate with BigShip")
        
        # Call BigShip Tracking API
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # Use AWB for tracking
        response = requests.get(
            f'{BIGSHIP_API_URL}/api/tracking',
            params={
                'tracking_type': 'awb',
                'tracking_id': awb_number
            },
            headers=headers,
            timeout=10
        )
        
        # Handle token expiration
        if response.status_code == 401:
            logger.info("BigShip token expired, refreshing...")
            token = get_bigship_token()
            if not token:
                raise HTTPException(status_code=500, detail="Failed to refresh BigShip token")
            
            headers['Authorization'] = f'Bearer {token}'
            response = requests.get(
                f'{BIGSHIP_API_URL}/api/tracking',
                params={
                    'tracking_type': 'awb',
                    'tracking_id': awb_number
                },
                headers=headers,
                timeout=10
            )
        
        if response.status_code != 200:
            logger.error(f"BigShip tracking API error: {response.text}")
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Failed to fetch tracking info: {response.text}"
            )
        
        tracking_data = response.json()
        
        if not tracking_data.get('success'):
            raise HTTPException(
                status_code=404, 
                detail=tracking_data.get('message', 'No tracking data found')
            )
        
        # Extract current status from BigShip response
        order_detail = tracking_data.get('data', {}).get('order_detail', {})
        current_status = order_detail.get('current_tracking_status', '').upper()
        
        # Map BigShip status to your order status
        status_mapping = {
            'PICKUP SCHEDULED': 'confirmed',
            'NOT PICKED': 'confirmed',
            'PICKED UP': 'processing',
            'IN-TRANSIT': 'shipped',
            'IN TRANSIT': 'shipped',
            'OUT FOR DELIVERY': 'shipped',
            'DELIVERED': 'delivered',
            'UNDELIVERED': 'processing',
            'CANCELLED': 'cancelled',
            'RTO IN TRANSIT': 'cancelled',
            'RTO DELIVERED': 'cancelled',
            'LOST': 'cancelled',
        }
        
        new_order_status = status_mapping.get(current_status, 'processing')
        
        # Get order_id from order_number
        order_result = supabase.table('orders').select('id').eq('order_number', order_number).execute()
        
        if order_result.data and len(order_result.data) > 0:
            # Update order status in database
            supabase.table('orders').update({
                'status': new_order_status,
                'updated_at': datetime.now().isoformat()
            }).eq('order_number', order_number).execute()
            
            logger.info(f"Updated order {order_number} to status {new_order_status}")
        
        # Update shipment tracking data
        supabase.table('shipments').update({
            'current_tracking_status': current_status,
            'last_tracking_update': datetime.now().isoformat(),
            'tracking_data': tracking_data.get('data')
        }).eq('awb_number', awb_number).execute()
        
        return {
            "success": True,
            "order_number": order_number,
            "awb_number": awb_number,
            "current_status": current_status,
            "new_order_status": new_order_status,
            "tracking_data": tracking_data.get('data'),
            "message": f"Order status updated to {new_order_status}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-all-shipments")
async def sync_all_active_shipments():
    """
    Sync all active shipments (not delivered or cancelled)
    This can be called manually or set up as a cron job
    """
    try:
        supabase = get_supabase_client()
        
        # Get all active shipments (not delivered or cancelled)
        shipments_result = supabase.table('shipments').select('system_order_id, awb_number, current_tracking_status').or_(
            'current_tracking_status.is.null,'
            'current_tracking_status.neq.DELIVERED,'
            'current_tracking_status.neq.CANCELLED,'
            'current_tracking_status.neq.RTO DELIVERED,'
            'current_tracking_status.neq.LOST'
        ).execute()
        
        if not shipments_result.data:
            return {
                "success": True,
                "message": "No active shipments to sync",
                "total_shipments": 0,
                "updated_count": 0,
                "failed_count": 0
            }
        
        updated_count = 0
        failed_count = 0
        failed_orders = []
        
        for shipment in shipments_result.data:
            try:
                order_number = shipment.get('system_order_id')
                if order_number:
                    await track_order(order_number)
                    updated_count += 1
            except Exception as e:
                logger.error(f"Error updating shipment {shipment.get('system_order_id')}: {str(e)}")
                failed_count += 1
                failed_orders.append({
                    'order_number': shipment.get('system_order_id'),
                    'error': str(e)
                })
                continue
        
        return {
            "success": True,
            "total_shipments": len(shipments_result.data),
            "updated_count": updated_count,
            "failed_count": failed_count,
            "failed_orders": failed_orders[:10] if failed_orders else []  # Return first 10 failures
        }
        
    except Exception as e:
        logger.error(f"Error syncing shipments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tracking-history/{order_number}")
async def get_tracking_history(order_number: str):
    """
    Get detailed tracking history for an order from database
    Shows all scan histories and events
    """
    try:
        supabase = get_supabase_client()
        
        # Get shipment from database
        shipment_result = supabase.table('shipments').select('*').eq('system_order_id', order_number).execute()
        
        if not shipment_result.data or len(shipment_result.data) == 0:
            raise HTTPException(status_code=404, detail="Shipment not found")
        
        shipment = shipment_result.data[0]
        tracking_data = shipment.get('tracking_data', {})
        
        # Extract scan histories and order details
        scan_histories = []
        order_detail = {}
        
        if isinstance(tracking_data, dict):
            # scan_histories can be at root level or inside order_detail
            scan_histories = tracking_data.get('scan_histories', [])
            order_detail = tracking_data.get('order_detail', {})
            
            # If not at root, check inside order_detail
            if not scan_histories:
                scan_histories = order_detail.get('scan_histories', [])
        
        return {
            "success": True,
            "order_number": order_number,
            "awb_number": shipment.get('awb_number'),
            "current_status": shipment.get('current_tracking_status'),
            "last_update": shipment.get('last_tracking_update'),
            "courier_name": order_detail.get('courier_name') or shipment.get('courier_name'),
            "tracking_history": scan_histories,
            "order_details": {
                "invoice_id": order_detail.get('invoice_id'),
                "manifest_datetime": order_detail.get('order_manifest_datetime'),
                "tracking_datetime": order_detail.get('current_tracking_datetime')
            },
            "shipment_details": {
                "customer_name": shipment.get('customer_name'),
                "city": shipment.get('city'),
                "state": shipment.get('state'),
                "pincode": shipment.get('pincode')
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tracking history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check if BigShip API is accessible and token is valid"""
    try:
        token = BIGSHIP_TOKEN or get_bigship_token()
        
        if not token:
            return {
                "success": False,
                "message": "Failed to authenticate with BigShip",
                "bigship_api": BIGSHIP_API_URL
            }
        
        return {
            "success": True,
            "message": "BigShip tracking service is operational",
            "token_available": True,
            "bigship_api": BIGSHIP_API_URL
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "bigship_api": BIGSHIP_API_URL
        }


@router.get("/tracking-url/{order_number}")
async def get_bigship_tracking_url(order_number: str):
    """
    Get the BigShip tracking URL for an order
    Returns the correct URL to view tracking on BigShip portal
    """
    try:
        logger.info(f"Fetching tracking URL for order: {order_number}")
        supabase = get_supabase_client()
        
        # Get shipment from database
        shipment_result = supabase.table('shipments').select('tracking_data, awb_number, system_order_id').eq('system_order_id', order_number).execute()
        
        logger.info(f"Shipment query result: {len(shipment_result.data) if shipment_result.data else 0} records found")
        
        if not shipment_result.data or len(shipment_result.data) == 0:
            logger.warning(f"No shipment found for order {order_number}, using fallback URL")
            # Return default URL with order number if no shipment found
            return {
                "success": True,
                "tracking_url": f"https://app.bigship.in/order/detail?order_id={order_number}",
                "order_number": order_number,
                "message": "Using order number for tracking URL (no shipment found)"
            }
        
        shipment = shipment_result.data[0]
        tracking_data = shipment.get('tracking_data', {})
        
        # Try to get invoice_id from tracking data
        invoice_id = None
        if isinstance(tracking_data, dict):
            order_detail = tracking_data.get('order_detail', {})
            invoice_id = order_detail.get('invoice_id')
        
        logger.info(f"Order {order_number}: invoice_id={invoice_id}, awb={shipment.get('awb_number')}")
        
        # Use invoice_id if available, otherwise use order number
        tracking_id = invoice_id if invoice_id else order_number
        tracking_url = f"https://app.bigship.in/order/detail?order_id={tracking_id}"
        
        logger.info(f"Generated tracking URL: {tracking_url}")
        
        return {
            "success": True,
            "tracking_url": tracking_url,
            "order_number": order_number,
            "invoice_id": invoice_id,
            "awb_number": shipment.get('awb_number'),
            "message": "BigShip tracking URL generated"
        }
        
    except Exception as e:
        logger.error(f"Error getting tracking URL: {str(e)}")
        # Return default URL even on error
        return {
            "success": True,
            "tracking_url": f"https://app.bigship.in/order/detail?order_id={order_number}",
            "order_number": order_number,
            "message": "Using fallback URL"
        }
