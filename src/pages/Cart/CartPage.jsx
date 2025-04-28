import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import Spinner from '../../components/common/Spinner';

function CartPage() {
    const { cartItems, cartCount, loading, fetchCart, updateCartItem, removeCartItem, clearCart } = useCart();
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCart();
    }, []);

    const handleQuantityChange = async (itemId, newQuantity) => {
        if (updating) return;

        try {
            setUpdating(true);

            // Ensure quantity is an integer and greater than 0
            newQuantity = parseInt(newQuantity);
            if (isNaN(newQuantity) || newQuantity < 0) return;

            // Find the current item
            const item = cartItems.find(item => item.id === itemId);
            if (!item) return;

            // Check if we're trying to add more than available stock
            if (newQuantity > item.product.quantity) {
                alert(`Sorry, only ${item.product.quantity} units available in stock.`);
                return;
            }

            // If quantity is 0, remove the item
            if (newQuantity === 0) {
                await handleRemoveItem(itemId);
                return;
            }

            const response = await updateCartItem(itemId, newQuantity);

            if (!response.ok) {
                setError(response.data?.message || "Failed to update cart. Please try again.");
            }
        } catch (err) {
            console.error('Error updating cart item:', err);
            setError("Failed to update item quantity. Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveItem = async (itemId) => {
        if (updating) return;

        try {
            setUpdating(true);
            const response = await removeCartItem(itemId);

            if (!response.ok) {
                setError(response.data?.message || "Failed to remove item from cart. Please try again.");
            }
        } catch (err) {
            console.error('Error removing cart item:', err);
            setError("Failed to remove item from cart. Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    const handleClearCart = async () => {
        if (!window.confirm('Are you sure you want to clear your cart?') || updating) {
            return;
        }

        try {
            setUpdating(true);
            const response = await clearCart();

            if (!response.ok) {
                setError(response.data?.message || "Failed to clear cart. Please try again.");
            }
        } catch (err) {
            console.error('Error clearing cart:', err);
            setError("Failed to clear cart. Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    const handleRent = () => {
        navigate('/rent/create');
    };

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    const isEmpty = cartItems.length === 0;

    return (
        <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Shopping Cart</h1>
                <Link to="/products" className="btn btn-ghost btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Continue Shopping
                </Link>
            </div>

            {error && (
                <div className="alert alert-error mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {isEmpty ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <div className="flex flex-col items-center justify-center py-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
                        <p className="text-gray-500 mb-4">Looks like you haven't added any items to your cart yet.</p>
                        <Link to="/products" className="btn btn-primary">
                            Browse Products
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cart Items */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-4 text-left">Product</th>
                                        <th className="p-4 text-center">Price</th>
                                        <th className="p-4 text-center">Quantity</th>
                                        <th className="p-4 text-center">Subtotal</th>
                                        <th className="p-4 text-center">Remove</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {cartItems.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-4">
                                                <div className="flex items-center">
                                                    <div className="w-16 h-16 mr-4">
                                                        {item.product.product_picture ? (
                                                            <img
                                                                src={imageService.getImageUrl(item.product.product_picture)}
                                                                alt={item.product.name}
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = '/placeholder.webp';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Link to={`/products/${item.product.id}`} className="font-medium text-gray-900 hover:text-primary">
                                                            {item.product.name}
                                                        </Link>
                                                        <p className="text-sm text-gray-500">{item.product.brand}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span>Rp {item.product.price.toLocaleString('id-ID')}</span>
                                                    <span className="text-xs text-gray-500">per week</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center">
                                                    <div className="join">
                                                        <button
                                                            className="btn btn-sm join-item"
                                                            onClick={() => handleQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                                                            disabled={updating}
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="text"
                                                            className="input input-bordered input-sm join-item w-14 text-center"
                                                            value={item.quantity}
                                                            max={item.product.quantity}
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                            disabled={updating}
                                                        />
                                                        <button
                                                            className="btn btn-sm join-item"
                                                            onClick={() => handleQuantityChange(item.id, Math.min(item.product.quantity, item.quantity + 1))}
                                                            disabled={updating || item.quantity >= item.product.quantity}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {item.product.quantity} available
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-medium">
                                                Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    className="btn btn-sm btn-ghost text-gray-400 hover:text-error btn-circle"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={updating}
                                                    title="Remove item"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex gap-2 justify-end">
                            <button
                                className="btn btn-outline btn-error"
                                onClick={handleClearCart}
                                disabled={updating}
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold mb-4">Cart Summary</h2>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between">
                                    <span>Items</span>
                                    <span>{cartCount || 0}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <div className="text-right">
                                        <span>Rp {calculateTotal().toLocaleString('id-ID') || 0}</span>
                                        <div className="text-xs font-normal text-gray-500">per week</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary w-full"
                                onClick={handleRent}
                                disabled={updating || isEmpty}
                            >
                                Proceed to Rent
                            </button>

                            <div className="mt-4 text-xs text-gray-500">
                                <p>* All items will be rented according to the HES Lab rental policy.</p>
                                <p>* Please ensure you have your student ID ready for verification.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CartPage;