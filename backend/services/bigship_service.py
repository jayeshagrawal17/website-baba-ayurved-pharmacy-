"""
Bigship Delivery Service Integration
Handles B2C shipment creation, tracking, and management
"""

import os
import re
import requests
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def sanitize_name(name: str) -> str:
    """
    Sanitize name to meet Bigship requirements:
    - Only alphabets, dots (.), and spaces allowed
    - Remove numbers and special characters
    - Ensure minimum 3 characters
    """
    if not name:
        return "Customer"
    
    # Remove all characters except alphabets, dots, and spaces
    sanitized = re.sub(r'[^a-zA-Z.\s]', '', name)
    
    # Remove multiple spaces and trim
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    
    # Ensure minimum length of 3 characters
    if len(sanitized) < 3:
        sanitized = f"{sanitized} User".strip()
        if len(sanitized) < 3:
            return "Customer"
    
    # Ensure maximum length of 25 characters
    if len(sanitized) > 25:
        sanitized = sanitized[:25].strip()
    
    return sanitized

# Bigship API Configuration
BIGSHIP_BASE_URL = "https://api.bigship.in"
BIGSHIP_USERNAME = os.getenv("BIGSHIP_USERNAME")  # Your Bigship login email
BIGSHIP_PASSWORD = os.getenv("BIGSHIP_PASSWORD")  # Your Bigship password
BIGSHIP_ACCESS_KEY = os.getenv("BIGSHIP_ACCESS_KEY")  # Your Bigship access key


class BigshipAddress(BaseModel):
    """Address model for Bigship API"""
    address_line1: str = Field(..., min_length=10, max_length=50)
    address_line2: Optional[str] = Field(None, max_length=50)
    address_landmark: Optional[str] = Field(None, max_length=50)
    pincode: str = Field(..., min_length=6, max_length=6)


class BigshipConsignee(BaseModel):
    """Consignee details for Bigship"""
    first_name: str = Field(..., min_length=3, max_length=25)
    last_name: str = Field(..., min_length=3, max_length=25)
    company_name: Optional[str] = Field("", max_length=50)
    contact_number_primary: str = Field(..., min_length=10, max_length=12)
    contact_number_secondary: Optional[str] = Field("", min_length=10, max_length=12)
    email_id: Optional[str] = ""
    consignee_address: BigshipAddress


class BigshipProductDetail(BaseModel):
    """Product details for shipment"""
    product_category: str = "Others"
    product_sub_category: Optional[str] = "PINS"
    product_name: str
    product_quantity: int = Field(..., gt=0)
    each_product_invoice_amount: float = Field(..., gt=0)
    each_product_collectable_amount: float = 0
    hsn: Optional[str] = ""


class BigshipBoxDetail(BaseModel):
    """Box/package details"""
    each_box_dead_weight: float = Field(..., gt=0)  # in kg
    each_box_length: int = Field(..., gt=0)  # in cm
    each_box_width: int = Field(..., gt=0)  # in cm
    each_box_height: int = Field(..., gt=0)  # in cm
    each_box_invoice_amount: float = Field(..., gt=0)
    each_box_collectable_amount: float = 0
    box_count: int = Field(1, gt=0)
    product_details: List[BigshipProductDetail]


class BigshipService:
    """Service class to interact with Bigship API"""
    
    def __init__(self):
        self.base_url = BIGSHIP_BASE_URL
        self.username = BIGSHIP_USERNAME
        self.password = BIGSHIP_PASSWORD
        self.access_key = BIGSHIP_ACCESS_KEY
        self.token = None
        self.token_expiry = None
        
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with authentication token"""
        if not self.token or self._is_token_expired():
            self._generate_token()
        
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def _is_token_expired(self) -> bool:
        """Check if token is expired (tokens expire in 12 hours)"""
        if not self.token_expiry:
            return True
        return datetime.now(timezone.utc) >= self.token_expiry
    
    def _generate_token(self) -> str:
        """Generate authentication token from Bigship"""
        try:
            url = f"{self.base_url}/api/login/user"
            payload = {
                "user_name": self.username,
                "password": self.password,
                "access_key": self.access_key
            }
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                self.token = data["data"]["token"]
                # Token expires in 12 hours
                from datetime import timedelta
                self.token_expiry = datetime.now(timezone.utc) + timedelta(hours=11, minutes=50)
                logger.info("Bigship token generated successfully")
                return self.token
            else:
                raise Exception(f"Token generation failed: {data.get('message')}")
                
        except Exception as e:
            logger.error(f"Error generating Bigship token: {str(e)}")
            raise Exception(f"Failed to authenticate with Bigship: {str(e)}")
    
    def get_payment_categories(self) -> List[Dict]:
        """Get available payment categories for B2C shipments"""
        try:
            url = f"{self.base_url}/api/payment/category?shipment_category=b2c"
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return []
        except Exception as e:
            logger.error(f"Error fetching payment categories: {str(e)}")
            return []
    
    def get_courier_list(self) -> List[Dict]:
        """Get available courier partners for B2C shipments"""
        try:
            url = f"{self.base_url}/api/courier/get/all?shipment_category=b2c"
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return []
        except Exception as e:
            logger.error(f"Error fetching courier list: {str(e)}")
            return []
    
    def get_wallet_balance(self) -> float:
        """Get current wallet balance"""
        try:
            url = f"{self.base_url}/api/Wallet/balance/get"
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return float(data["data"])
            return 0.0
        except Exception as e:
            logger.error(f"Error fetching wallet balance: {str(e)}")
            return 0.0
    
    def add_warehouse(self, warehouse_data: Dict) -> Optional[Dict]:
        """Add a new warehouse/pickup location"""
        try:
            url = f"{self.base_url}/api/warehouse/add"
            response = requests.post(url, json=warehouse_data, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                logger.info(f"Warehouse added successfully: {data['data']['warehouse_id']}")
                return data["data"]
            return None
        except Exception as e:
            logger.error(f"Error adding warehouse: {str(e)}")
            return None
    
    def get_warehouse_list(self, page_index: int = 1, page_size: int = 10) -> Dict:
        """Get list of existing warehouses"""
        try:
            url = f"{self.base_url}/api/warehouse/get/list?page_index={page_index}&page_size={page_size}"
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return {"result_count": 0, "result_data": []}
        except Exception as e:
            logger.error(f"Error fetching warehouse list: {str(e)}")
            return {"result_count": 0, "result_data": []}
    
    def calculate_shipping_rates(
        self,
        pickup_pincode: str,
        destination_pincode: str,
        payment_type: str,
        invoice_amount: float,
        box_details: List[Dict]
    ) -> List[Dict]:
        """Calculate shipping rates for different couriers"""
        try:
            url = f"{self.base_url}/api/calculator"
            
            # Ensure proper data types and validation
            payload = {
                "shipment_category": "B2C",
                "payment_type": payment_type,
                "pickup_pincode": int(pickup_pincode),
                "destination_pincode": int(destination_pincode),
                "shipment_invoice_amount": round(float(invoice_amount), 2),  # Round to 2 decimals
                "risk_type": "",
                "box_details": [
                    {
                        "each_box_dead_weight": max(0.1, float(box["each_box_dead_weight"])),  # Min 0.1 kg
                        "each_box_length": max(1, int(box["each_box_length"])),  # Min 1 cm
                        "each_box_width": max(1, int(box["each_box_width"])),   # Min 1 cm
                        "each_box_height": max(1, int(box["each_box_height"])),  # Min 1 cm
                        "box_count": 1
                    }
                    for box in box_details
                ]
            }
            
            logger.info(f"Bigship rate calculator payload: {payload}")
            
            response = requests.post(url, json=payload, headers=self._get_headers())
            
            logger.info(f"Bigship rate calculator response status: {response.status_code}")
            logger.info(f"Bigship rate calculator response: {response.text}")
            
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return []
        except Exception as e:
            logger.error(f"Error calculating shipping rates: {str(e)}")
            return []
    
    def create_b2c_order(
        self,
        pickup_location_id: int,
        return_location_id: int,
        consignee: BigshipConsignee,
        invoice_id: str,
        payment_type: str,
        invoice_amount: float,
        collectable_amount: float,
        box_details: List[BigshipBoxDetail],
        invoice_document: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a B2C order in Bigship
        Returns system_order_id if successful
        """
        try:
            url = f"{self.base_url}/api/order/add/single"
            
            # Prepare box details
            formatted_box_details = []
            for box in box_details:
                formatted_box_details.append({
                    "each_box_dead_weight": box.each_box_dead_weight,
                    "each_box_length": box.each_box_length,
                    "each_box_width": box.each_box_width,
                    "each_box_height": box.each_box_height,
                    "each_box_invoice_amount": box.each_box_invoice_amount,
                    "each_box_collectable_amount": box.each_box_collectable_amount,
                    "box_count": box.box_count,
                    "product_details": [
                        {
                            "product_category": p.product_category,
                            "product_sub_category": p.product_sub_category,
                            "product_name": p.product_name,
                            "product_quantity": p.product_quantity,
                            "each_product_invoice_amount": p.each_product_invoice_amount,
                            "each_product_collectable_amount": p.each_product_collectable_amount,
                            "hsn": p.hsn or ""
                        }
                        for p in box.product_details
                    ]
                })
            
            payload = {
                "shipment_category": "b2c",
                "warehouse_detail": {
                    "pickup_location_id": pickup_location_id,
                    "return_location_id": return_location_id
                },
                "consignee_detail": {
                    "first_name": sanitize_name(consignee.first_name),
                    "last_name": sanitize_name(consignee.last_name),
                    "company_name": consignee.company_name or "",
                    "contact_number_primary": consignee.contact_number_primary,
                    "contact_number_secondary": consignee.contact_number_secondary or "",
                    "email_id": consignee.email_id or "",
                    "consignee_address": {
                        "address_line1": consignee.consignee_address.address_line1,
                        "address_line2": consignee.consignee_address.address_line2 or "",
                        "address_landmark": consignee.consignee_address.address_landmark or "",
                        "pincode": consignee.consignee_address.pincode
                    }
                },
                "order_detail": {
                    "invoice_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),  # Format as YYYY-MM-DD
                    "invoice_id": invoice_id,
                    "payment_type": payment_type,
                    "shipment_invoice_amount": invoice_amount,
                    "total_collectable_amount": collectable_amount,
                    "box_details": formatted_box_details,
                    "ewaybill_number": "",
                    "document_detail": {
                        "invoice_document_file": invoice_document or "",
                        "ewaybill_document_file": ""
                    }
                }
            }
            
            logger.info(f"Creating B2C order with payload: {payload}")
            response = requests.post(url, json=payload, headers=self._get_headers())
            
            # Log response details before raising error
            logger.info(f"Bigship API Response Status: {response.status_code}")
            try:
                response_data = response.json()
                logger.info(f"Bigship API Response Data: {response_data}")
            except:
                logger.error(f"Bigship API Response Text: {response.text}")
            
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                # Extract system_order_id from message like "system_order_id is 1000252960"
                message = data.get("data", "")
                system_order_id = message.split("is ")[-1].strip()
                logger.info(f"Order created successfully: {system_order_id}")
                return system_order_id
            else:
                logger.error(f"Order creation failed: {data.get('message')}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating B2C order: {str(e)}")
            raise Exception(f"Failed to create shipment: {str(e)}")
    
    def get_shipping_rates_for_order(
        self,
        system_order_id: int
    ) -> List[Dict]:
        """Get available shipping rates for a created order"""
        try:
            url = f"{self.base_url}/api/order/shipping/rates?shipment_category=B2C&system_order_id={system_order_id}"
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return []
        except Exception as e:
            logger.error(f"Error fetching shipping rates for order: {str(e)}")
            return []
    
    def manifest_order(
        self,
        system_order_id: int,
        courier_id: Optional[int] = None
    ) -> bool:
        """
        Manifest an order (assign to courier)
        If courier_id is not provided, Bigship will auto-assign the best available courier
        """
        try:
            url = f"{self.base_url}/api/order/manifest/single"
            payload = {
                "system_order_id": system_order_id
            }
            
            if courier_id:
                payload["courier_id"] = courier_id
                logger.info(f"Manifesting order {system_order_id} with courier_id: {courier_id}")
            else:
                logger.info(f"Manifesting order {system_order_id} - Bigship will auto-assign best courier")
            
            response = requests.post(url, json=payload, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                logger.info(f"Order manifested successfully: {system_order_id}")
                return True
            else:
                logger.error(f"Order manifest failed: {data.get('message')}")
                return False
                
        except Exception as e:
            logger.error(f"Error manifesting order: {str(e)}")
            return False
    
    def get_awb_and_label(
        self,
        system_order_id: int,
        data_type: int = 1
    ) -> Optional[Dict]:
        """
        Get AWB, Label, or Manifest
        data_type: 1 = AWB, 2 = Label, 3 = Manifest
        """
        try:
            url = f"{self.base_url}/api/shipment/data?shipment_data_id={data_type}&system_order_id={system_order_id}"
            response = requests.post(url, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return None
        except Exception as e:
            logger.error(f"Error fetching shipment data: {str(e)}")
            return None
    
    def track_shipment(
        self,
        tracking_id: str,
        tracking_type: str = "awb"
    ) -> Optional[Dict]:
        """
        Track shipment by AWB or LRN
        tracking_type: 'awb' or 'lrn'
        """
        try:
            url = f"{self.base_url}/api/tracking?tracking_type={tracking_type}&tracking_id={tracking_id}"
            response = requests.get(url, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return None
        except Exception as e:
            logger.error(f"Error tracking shipment: {str(e)}")
            return None
    
    def cancel_shipment(
        self,
        awb_numbers: List[str]
    ) -> List[Dict]:
        """Cancel one or more shipments by AWB number"""
        try:
            url = f"{self.base_url}/api/order/cancel"
            response = requests.put(url, json=awb_numbers, headers=self._get_headers())
            response.raise_for_status()
            
            data = response.json()
            if data.get("success"):
                return data["data"]
            return []
        except Exception as e:
            logger.error(f"Error cancelling shipment: {str(e)}")
            return []


# Singleton instance
bigship_service = BigshipService()
