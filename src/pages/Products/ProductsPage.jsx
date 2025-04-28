import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import ProductForm from '../../components/products/ProductForm';
import ProductCard from '../../components/products/ProductCard';
import ProductFilters from '../../components/products/ProductFilters';

function ProductsPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [lowStockFilter, setLowStockFilter] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const limit = 12;
    const isAdmin = user?.team?.slug === 'administrator';

    // Fetch products with search and filter
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);

                let params = { page, limit, search: searchQuery };

                if (selectedCategory !== 'all') {
                    params.category = selectedCategory;
                }

                if (lowStockFilter) {
                    params.lowStock = true;
                }

                const response = await api.getProducts(params);

                if (response.ok) {
                    setProducts(response.data.data);
                    setTotalPages(response.data.pagination.pages);
                } else {
                    setError('Failed to load products. Please try again later.');
                }
            } catch (err) {
                console.error('Error fetching products:', err);
                setError('Failed to load products. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [page, searchQuery, selectedCategory, lowStockFilter]);

    // Fetch categories for filter
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.getCategories();
                if (response.ok) {
                    setCategories(response.data);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };

        fetchCategories();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // Reset to first page on search
    };

    const handleFilter = (filters) => {
        setSelectedCategory(filters.category);
        setLowStockFilter(filters.lowStock);
        setPage(1);
        setShowFilters(false);
    };

    const handleAddProduct = async (productData) => {
        try {
            const selectedImageFile = productData.selectedImageFile;

            const { selectedImageFile: _, ...dataToSend } = productData;

            const response = await api.createProduct(dataToSend);

            if (response.ok && response.data) {
                // If we have a selected image to upload
                if (selectedImageFile) {
                    try {
                        console.log("Uploading image for new product ID:", response.data.id);

                        // Upload the image
                        const imageResponse = await imageService.uploadProductImage(
                            response.data.id,
                            selectedImageFile
                        );
                        console.log("Image upload response:", imageResponse);

                        if (imageResponse.ok && imageResponse.data) {
                            // Update the product with the image path
                            const updatedProduct = {
                                ...response.data,
                                product_picture: imageResponse.data.product_picture
                            };
                            // Update the products list with the product that has the image
                            setProducts(prevProducts => [updatedProduct, ...prevProducts]);
                        } else {
                            // If image upload failed, add product without image
                            setProducts(prevProducts => [response.data, ...prevProducts]);
                        }
                    } catch (imageError) {
                        console.error("Error uploading product image:", imageError);
                        setProducts(prevProducts => [response.data, ...prevProducts]);
                    }
                } else {
                    // No image to upload
                    setProducts(prevProducts => [response.data, ...prevProducts]);
                }

                setShowAddModal(false);
                return response.data;
            } else {
                setError(response.data?.message || 'Failed to add product');
                return null;
            }
        } catch (err) {
            console.error('Error adding product:', err);
            setError('Failed to add product. Please try again.');
            return null;
        }
    };

    const handleEditProduct = async (id, productData) => {
        try {
            const response = await api.updateProduct(id, productData);

            if (response.ok) {
                setProducts(products.map(p => p.id === id ? response.data : p));
                setShowEditModal(false);
                setSelectedProduct(null);
            } else {
                setError(response.data.message || 'Failed to update product');
            }
        } catch (err) {
            console.error('Error updating product:', err);
            setError('Failed to update product. Please try again.');
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await api.deleteProduct(id);

                if (response.ok) {
                    setProducts(products.filter(product => product.id !== id));
                } else {
                    setError('Failed to delete product. Please try again.');
                }
            } catch (err) {
                console.error('Error deleting product:', err);
                setError('Failed to delete product. Please try again.');
            }
        }
    };

    const openEditModal = (product) => {
        setSelectedProduct(product);
        setShowEditModal(true);
    };

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-primary">Products</h1>
                <div className="flex gap-2">
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                        >
                            Add New Product
                        </button>
                    )}
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-ghost btn-circle">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li><a onClick={() => setShowFilters(true)}>Filter</a></li>
                            {isAdmin && <li><Link to="/export-products">Export Products</Link></li>}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Search and View Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-2">
                <form className="join w-full md:w-auto" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="input join-item w-full md:w-80 focus:outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary join-item">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </form>
                <div className="join">
                    <button
                        className={`btn join-item ${viewMode === 'grid' ? 'btn-active' : ''}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </button>
                    <button
                        className={`btn join-item ${viewMode === 'table' ? 'btn-active' : ''}`}
                        onClick={() => setViewMode('table')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="alert alert-error mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div className="flex justify-center items-center min-h-[300px]">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            ) : (
                <>
                    {/* Grid view */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.length > 0 ? (
                                products.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        isAdmin={isAdmin}
                                        onEdit={() => openEditModal(product)}
                                        onDelete={() => handleDeleteProduct(product.id)}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <p className="text-xl text-gray-500">No products found</p>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="btn btn-primary btn-sm mt-4"
                                        >
                                            Add Your First Product
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Table view */}
                    {viewMode === 'table' && (
                        <div className="overflow-x-auto bg-base-100 rounded-lg shadow-lg">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length > 0 ? (
                                        products.map(product => (
                                            <tr key={product.id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="avatar">
                                                            <div className="mask mask-squircle w-12 h-12">
                                                                {product.product_picture ? (
                                                                    <img
                                                                        src={imageService.getImageUrl(product.product_picture)}
                                                                        alt={product.name}
                                                                        className="object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="bg-base-300 w-full h-full flex items-center justify-center">
                                                                        <span>N/A</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold">{product.name}</div>
                                                            <div className="text-sm opacity-50">{product.brand}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{product.category?.name || 'Uncategorized'}</td>
                                                <td>Rp{product.price.toLocaleString('id-ID')}</td>
                                                <td>
                                                    <div className={
                                                        product.quantity <= 0
                                                            ? 'badge badge-error'
                                                            : product.quantity <= product.quantity_alert
                                                                ? 'badge badge-warning'
                                                                : 'badge badge-success'
                                                    }>
                                                        {product.quantity}/{product.quantity_alert}
                                                    </div>
                                                </td>
                                                <td>
                                                    {product.is_rentable && product.quantity > 0 ? (
                                                        <div className="badge badge-success">Available</div>
                                                    ) : (
                                                        <div className="badge badge-error">Unavailable</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="flex gap-1">
                                                        <Link to={`/products/${product.id}`} className="btn btn-info btn-sm">
                                                            View
                                                        </Link>
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    className="btn btn-warning btn-sm"
                                                                    onClick={() => openEditModal(product)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="btn btn-error btn-sm"
                                                                    onClick={() => handleDeleteProduct(product.id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-10">
                                                <div className="flex flex-col items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                    <p className="text-xl text-gray-500">No products found</p>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setShowAddModal(true)}
                                                            className="btn btn-primary btn-sm mt-4"
                                                        >
                                                            Add Your First Product
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                    <div className="join">
                        <button
                            className="join-item btn"
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            disabled={page === 1}
                        >
                            «
                        </button>

                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            // Show 5 pages max with current page in the middle when possible
                            let pageNumber;
                            if (totalPages <= 5) {
                                pageNumber = i + 1;
                            } else if (page <= 3) {
                                pageNumber = i + 1;
                            } else if (page >= totalPages - 2) {
                                pageNumber = totalPages - 4 + i;
                            } else {
                                pageNumber = page - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNumber}
                                    className={`join-item btn ${page === pageNumber ? 'btn-active' : ''}`}
                                    onClick={() => setPage(pageNumber)}
                                >
                                    {pageNumber}
                                </button>
                            );
                        })}

                        <button
                            className="join-item btn"
                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={page === totalPages}
                        >
                            »
                        </button>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true" onClick={() => setShowAddModal(false)}>
                        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                    </div>
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-base-100 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50">
                            <div className="bg-base-100 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium">
                                            Add New Product
                                        </h3>
                                        <div className="mt-2">
                                            <ProductForm
                                                categories={categories}
                                                onSubmit={handleAddProduct}
                                                onCancel={() => setShowAddModal(false)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && selectedProduct && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true" onClick={() => setShowEditModal(false)}>
                        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                    </div>
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50">
                            <div className="bg-base-100 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium">
                                            Edit Product
                                        </h3>
                                        <div className="mt-2">
                                            <ProductForm
                                                categories={categories}
                                                product={selectedProduct}
                                                onSubmit={(data) => handleEditProduct(selectedProduct.id, data)}
                                                onCancel={() => setShowEditModal(false)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {showFilters && (
                <ProductFilters
                    categories={categories}
                    selectedCategory={selectedCategory}
                    lowStock={lowStockFilter}
                    onApply={handleFilter}
                    onClose={() => setShowFilters(false)}
                />
            )}
        </div>
    );
}

export default ProductsPage;