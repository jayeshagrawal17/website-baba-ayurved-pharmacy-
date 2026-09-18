"""
Database utility functions for accessing Supabase
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def get_supabase_client() -> Client:
    """
    Get Supabase client instance
    Uses service role key to bypass RLS policies
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.error("Supabase configuration missing")
        raise Exception("Supabase configuration not found")
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
