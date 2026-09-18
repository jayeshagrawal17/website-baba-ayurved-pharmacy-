import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '../types';
import { supabase } from '../lib/supabase';
import { useUserAuth } from './UserAuthContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedQuantityOption?: any | null) => Promise<void>;
  removeFromCart: (productId: string, selectedQuantityOption?: any | null) => void;
  updateQuantity: (productId: string, quantity: number, selectedQuantityOption?: any | null) => Promise<void>;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  isLoading: boolean;
  syncCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'baba-ayurveda-cart';
const CART_EXPIRY_KEY = 'baba-ayurveda-cart-expiry';
const CART_EXPIRY_DAYS = 30; // Cart expires after 30 days

// Helper function to load cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    const expiryTime = localStorage.getItem(CART_EXPIRY_KEY);
    
    if (storedCart && expiryTime) {
      const now = new Date().getTime();
      const expiry = parseInt(expiryTime, 10);
      
      // Check if cart has expired
      if (now > expiry) {
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(CART_EXPIRY_KEY);
        return [];
      }
      
      return JSON.parse(storedCart);
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
  }
  return [];
};

// Helper function to save cart to localStorage
const saveCartToStorage = (cart: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    // Set expiry time (30 days from now)
    const expiryTime = new Date().getTime() + (CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    localStorage.setItem(CART_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUserAuth(); // Use custom auth instead of Supabase auth
  const userId = user?.id || null;

  // Initialize cart on mount
  useEffect(() => {
    const initializeCart = async () => {
      setIsLoading(true);
      
      if (userId) {
        // If user is logged in, load from database (single source of truth)
        await loadCartFromBackend(userId);
      } else {
        // If not logged in, load from localStorage
        const localCart = loadCartFromStorage();
        setCart(localCart);
      }
      
      setIsLoading(false);
    };
    
    initializeCart();
  }, [userId]);

  // Save cart to localStorage and backend whenever it changes
  useEffect(() => {
    // Skip saving during initial load
    if (isLoading) return;
    
    // Save to localStorage for guest users
    if (!userId) {
      saveCartToStorage(cart);
    }
    
    // If user is logged in, save to backend only (database is source of truth)
    if (userId) {
      saveCartToBackend(userId, cart);
    }
  }, [cart, userId, isLoading]);

  // Load cart from backend (for logged-in users)
  const loadCartFromBackend = async (uid: string) => {
    try {
      console.log('📥 Loading cart from backend for user:', uid);
      
      const { data, error } = await supabase
        .from('user_carts')
        .select('cart_data')
        .eq('user_id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading cart from backend:', error);
        setCart([]);
        return;
      }

      if (data?.cart_data) {
        // Use backend cart as the single source of truth for logged-in users
        const backendCart = data.cart_data as CartItem[];
        console.log('✅ Cart loaded from backend:', backendCart.length, 'items');
        setCart(backendCart);
      } else {
        console.log('ℹ️ No cart found in backend, checking localStorage');
        // If no backend cart exists, check if there's a local cart to migrate
        const localCart = loadCartFromStorage();
        if (localCart.length > 0) {
          console.log('📦 Migrating', localCart.length, 'items from localStorage to backend');
          // Migrate local cart to backend
          setCart(localCart);
          await saveCartToBackend(uid, localCart);
          // Clear localStorage after migration
          localStorage.removeItem(CART_STORAGE_KEY);
          localStorage.removeItem(CART_EXPIRY_KEY);
          console.log('✅ Migration complete');
        } else {
          console.log('ℹ️ Starting with empty cart');
          setCart([]);
        }
      }
    } catch (error) {
      console.error('❌ Exception loading cart from backend:', error);
      setCart([]);
    }
  };

  // Save cart to backend (for logged-in users)
  const saveCartToBackend = async (uid: string, cartData: CartItem[]) => {
    try {
      console.log('💾 Saving cart to backend for user:', uid, 'Cart items:', cartData.length);
      
      const { data, error } = await supabase
        .from('user_carts')
        .upsert({
          user_id: uid,
          cart_data: cartData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('❌ Error saving cart to backend:', error);
        throw error;
      }
      
      console.log('✅ Cart saved successfully to backend');
      return data;
    } catch (error) {
      console.error('❌ Exception saving cart to backend:', error);
      throw error;
    }
  };

  // Validate product availability before adding/updating cart
  // If selectedQuantityOption is provided, quantity represents number of bundles/packages,
  // and required units = quantity * selectedQuantityOption.quantity
  const validateProduct = async (
    productId: string,
    quantity: number,
    selectedQuantityOption: { quantity: number } | null = null
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('stock_quantity, price')
        .eq('id', productId)
        .single();

      if (error || !data) {
        console.error('Product not found');
        alert('Product not found or unavailable');
        return false;
      }

      const requiredUnits = selectedQuantityOption ? quantity * selectedQuantityOption.quantity : quantity;

      if (data.stock_quantity < requiredUnits) {
        alert(`Only ${data.stock_quantity} items available in stock`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating product:', error);
      return false;
    }
  };

  const addToCart = async (product: Product, quantity = 1, selectedQuantityOption: any | null = null) => {
    // Validate stock before adding (account for bundle sizes)
    const isValid = await validateProduct(product.id, quantity, selectedQuantityOption);
    if (!isValid) return;

    // Use a key to compare selected options (null vs objects)
    const optionKey = selectedQuantityOption ? JSON.stringify(selectedQuantityOption) : null;

    // Try to find an existing cart item with same product and same selected option
    const existingItem = cart.find((item) => {
      const itemOptionKey = item.selectedQuantityOption ? JSON.stringify(item.selectedQuantityOption) : null;
      return item.product.id === product.id && itemOptionKey === optionKey;
    });

    let newCart: CartItem[];
    if (existingItem) {
      newCart = cart.map((item) =>
        (item.product.id === product.id && (item.selectedQuantityOption ? JSON.stringify(item.selectedQuantityOption) : null) === optionKey)
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newCart = [...cart, { product, quantity, selectedQuantityOption }];
    }

    // Update state immediately
    setCart(newCart);
    
    // Save to storage/database immediately and wait for completion
    try {
      if (userId) {
        await saveCartToBackend(userId, newCart);
      } else {
        saveCartToStorage(newCart);
      }
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const removeFromCart = async (productId: string, selectedQuantityOption: any | null = null) => {
    const optionKey = selectedQuantityOption ? JSON.stringify(selectedQuantityOption) : null;
    const newCart = cart.filter((item) => {
      if (item.product.id !== productId) return true;
      const itemOptionKey = item.selectedQuantityOption ? JSON.stringify(item.selectedQuantityOption) : null;
      // Keep item if it doesn't match the product+option we're removing
      return itemOptionKey !== optionKey;
    });
    
    // Update state immediately
    setCart(newCart);
    
    // Save to storage/database immediately and wait for completion
    try {
      if (userId) {
        await saveCartToBackend(userId, newCart);
      } else {
        saveCartToStorage(newCart);
      }
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const updateQuantity = async (productId: string, quantity: number, selectedQuantityOption: any | null = null) => {
    if (quantity <= 0) {
      await removeFromCart(productId, selectedQuantityOption);
      return;
    }
    // Find the item to update matching product id + selected option (if provided)
    const optionKey = selectedQuantityOption ? JSON.stringify(selectedQuantityOption) : null;
    const existingItem = cart.find((item) => {
      const itemOptionKey = item.selectedQuantityOption ? JSON.stringify(item.selectedQuantityOption) : null;
      return item.product.id === productId && itemOptionKey === optionKey;
    });

    const itemOptionToValidate = existingItem ? existingItem.selectedQuantityOption || null : selectedQuantityOption;

    // Validate stock before updating (account for bundle sizes)
    const isValid = await validateProduct(productId, quantity, itemOptionToValidate);
    if (!isValid) return;

    const newCart = cart.map((item) => {
      const itemOptionKey = item.selectedQuantityOption ? JSON.stringify(item.selectedQuantityOption) : null;
      if (item.product.id === productId && itemOptionKey === optionKey) {
        return { ...item, quantity };
      }
      return item;
    });

    // Update state immediately
    setCart(newCart);
    
    // Save to storage/database immediately and wait for completion
    try {
      if (userId) {
        await saveCartToBackend(userId, newCart);
      } else {
        saveCartToStorage(newCart);
      }
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const clearCart = async () => {
    const newCart: CartItem[] = [];
    
    // Update state immediately
    setCart(newCart);
    
    // Save to storage/database immediately and wait for completion
    try {
      if (userId) {
        await saveCartToBackend(userId, newCart);
      } else {
        saveCartToStorage(newCart);
      }
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      if (item.selectedQuantityOption) {
        return total + (item.selectedQuantityOption.price * item.quantity);
      }
      return total + item.product.price * item.quantity;
    }, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const syncCart = async () => {
    if (userId) {
      await loadCartFromBackend(userId);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        isLoading,
        syncCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
