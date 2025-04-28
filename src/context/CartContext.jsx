import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [cartCount, setCartCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchCart = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.getCart();

            if (response.ok) {
                setCartItems(response.data.cart?.cart_items || []);
                setCartCount(response.data.summary?.itemCount || 0);
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    const addToCart = async (productId, quantity) => {
        try {
            const response = await api.addToCart(productId, quantity);
            if (response.ok) {
                await fetchCart();
            }
            return response;
        } catch (error) {
            console.error('Error adding to cart:', error);
            return { ok: false, error };
        }
    };

    const updateCartItem = async (itemId, quantity) => {
        try {
            const response = await api.updateCartItem(itemId, quantity);
            if (response.ok) {
                await fetchCart();
            }
            return response;
        } catch (error) {
            console.error('Error updating cart item:', error);
            return { ok: false, error };
        }
    };

    const removeCartItem = async (itemId) => {
        try {
            const response = await api.removeCartItem(itemId);
            if (response.ok) {
                await fetchCart();
            }
            return response;
        } catch (error) {
            console.error('Error removing cart item:', error);
            return { ok: false, error };
        }
    };

    const clearCart = async () => {
        try {
            const response = await api.clearCart();
            if (response.ok) {
                await fetchCart();
            }
            return response;
        } catch (error) {
            console.error('Error clearing cart:', error);
            return { ok: false, error };
        }
    };

    return (
        <CartContext.Provider
            value={{
                cartItems,
                cartCount,
                loading,
                fetchCart,
                addToCart,
                updateCartItem,
                removeCartItem,
                clearCart
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);