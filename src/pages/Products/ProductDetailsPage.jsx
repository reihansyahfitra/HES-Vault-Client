import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import Spinner from '../../components/common/Spinner';
import ProductForm from '../../components/products/ProductForm';

function ProductDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('description');
    const [isEditing, setIsEditing] = useState(false);
    const [categories, setCategories] = useState([]);
    const [rentQuantity, setRentQuantity] = useState(1);

    const isAdmin = user?.team?.slug === 'administrator';

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const response = await api.getProduct(id);

                if (!response.ok) {
                    setError('Product not found or could not be loaded.');
                    return;
                }

                const categoriesResponse = await api.getCategories();

                setProduct(response.data);
                if (categoriesResponse.ok) {
                    setCategories(categoriesResponse.data);
                }
            } catch (err) {
                console.error('Error fetching product:', err);
                setError('Failed to fetch product details. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            const response = await api.deleteProduct(id);
            if (response.ok) {
                navigate('/products', { state: { message: 'Product deleted successfully' } });
            } else {
                setError('Failed to delete product. Please try again.');
            }
        } catch (err) {
            console.error('Error deleting product:', err);
            setError('Failed to delete product. Please try again.');
        }
    };

    const handleUpdate = async (updatedProduct) => {
        try {
            setLoading(true);
            const response = await api.updateProduct(id, updatedProduct);

            if (response.ok) {
                setProduct(response.data);
                setIsEditing(false);
            } else {
                setError('Failed to update product. Please try again.');
            }
        } catch (err) {
            console.error('Error updating product:', err);
            setError('Failed to update product. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatSpecifications = (specs) => {
        if (!specs) return [];

        // Split by commas or new lines, depending on the format
        const items = specs.includes('\n')
            ? specs.split('\n')
            : specs.split(',');

        return items
            .map(item => item.trim())
            .filter(item => item.length > 0);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error || 'Product not found'}</span>
                    <Link to="/products" className="btn btn-sm">Back to Products</Link>
                </div>
            </div>
        );
    }

    const specifications = formatSpecifications(product.specifications);
    const stockStatus = () => {
        if (product.quantity <= 0) {
            return { color: 'bg-error text-white', text: 'Out of Stock' };
        }
        if (product.quantity <= product.quantity_alert) {
            return { color: 'bg-warning text-white', text: 'Low Stock' };
        }
        return { color: 'bg-success text-white', text: 'In Stock' };
    };

    const handleRentQuantityChange = (e) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value > 0 && value <= product.quantity) {
            setRentQuantity(value);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
            {/* Back button and Breadcrumbs in one row */}
            <div className="flex items-center mb-4">
                <Link to="/products" className="btn btn-circle btn-sm btn-ghost mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div className="text-sm breadcrumbs">
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/products">Products</Link></li>
                        <li className="font-medium">{product.name}</li>
                    </ul>
                </div>
            </div>

            {isEditing ? (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold mb-4">Edit Product</h2>
                    <ProductForm
                        product={product}
                        categories={categories}
                        onSubmit={handleUpdate}
                        onCancel={() => setIsEditing(false)}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product image */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="relative">
                            {product.product_picture ? (
                                <div className="h-[400px] flex items-center justify-center">
                                    <img
                                        src={imageService.getImageUrl(product.product_picture)}
                                        alt={product.name}
                                        className="max-h-full max-w-full object-contain"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/placeholder.webp';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="h-[400px] bg-base-200 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute top-0 right-0">
                                <div className={`badge ${stockStatus().color} px-3 py-2`}>
                                    {stockStatus().text}
                                </div>
                            </div>
                        </div>

                        {/* Admin buttons */}
                        {isAdmin && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="btn btn-warning w-full"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                                <button onClick={handleDelete} className="btn btn-error w-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Product info */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

                        <div className="text-sm text-gray-600 mb-4">
                            <p>Brand: {product.brand}</p>
                            <p>Category: {product.category?.name || 'Uncategorized'}</p>
                        </div>

                        <div className="flex flex-col mb-6">
                            {/* Price and Stock info */}
                            <div className="text-3xl font-bold text-primary mb-4">
                                Rp {product.price.toLocaleString('id-ID')}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-6">
                                <div>Stock: {product.quantity} units</div>

                                {product.is_rentable && (
                                    <div className="badge badge-accent py-2 px-3">
                                        Available for rent
                                    </div>
                                )}
                            </div>

                            {/* Rent/Cart Controls - Only show if product is rentable and in stock */}
                            {product.is_rentable && product.quantity > 0 && (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center">
                                        <span className="mr-3">Quantity:</span>
                                        <div className="join">
                                            <button
                                                className="btn btn-sm join-item"
                                                onClick={() => setRentQuantity(Math.max(1, rentQuantity - 1))}
                                            >
                                                -
                                            </button>
                                            <input
                                                type="text"
                                                className="input input-bordered input-sm join-item w-14 text-center"
                                                value={rentQuantity}
                                                onChange={handleRentQuantityChange}
                                            />
                                            <button
                                                className="btn btn-sm join-item"
                                                onClick={() => setRentQuantity(Math.min(product.quantity, rentQuantity + 1))}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <Link
                                        to={`/rent/create?product=${product.id}&quantity=${rentQuantity}`}
                                        className="btn btn-accent"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Rent Now
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Tab navigation */}
                        <div className="tabs mb-4 border-b">
                            <button
                                className={`tab tab-bordered ${activeTab === 'description' ? 'tab-active border-b-primary text-primary' : ''}`}
                                onClick={() => setActiveTab('description')}
                            >
                                Description
                            </button>
                            <button
                                className={`tab tab-bordered ${activeTab === 'specifications' ? 'tab-active border-b-primary text-primary' : ''}`}
                                onClick={() => setActiveTab('specifications')}
                            >
                                Specifications
                            </button>
                            <button
                                className={`tab tab-bordered ${activeTab === 'details' ? 'tab-active border-b-primary text-primary' : ''}`}
                                onClick={() => setActiveTab('details')}
                            >
                                Details
                            </button>
                        </div>

                        {/* Tab content */}
                        <div className="min-h-[200px]">
                            {activeTab === 'description' && (
                                <div className="prose">
                                    <p>{product.description || 'No description available.'}</p>
                                </div>
                            )}

                            {activeTab === 'specifications' && (
                                <div>
                                    {specifications.length > 0 ? (
                                        <ul className="list-disc pl-5 space-y-1">
                                            {specifications.map((spec, index) => (
                                                <li key={index}>{spec}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>No specifications available.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="font-medium">Source:</div>
                                    <div>{product.source || 'N/A'}</div>

                                    <div className="font-medium">Date Arrived:</div>
                                    <div>{product.date_arrival ? new Date(product.date_arrival).toLocaleDateString() : 'N/A'}</div>

                                    <div className="font-medium">Minimum Stock:</div>
                                    <div>{product.quantity_alert} units</div>

                                    <div className="font-medium">Product ID:</div>
                                    <div className="font-mono text-xs">{product.id}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductDetailsPage;