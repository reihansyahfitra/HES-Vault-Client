import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function RegularDashboard() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rents, setRents] = useState([]);
    const [loading, setLoading] = useState({
        products: true,
        categories: true,
        rents: true
    });
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 9;

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(prev => ({ ...prev, products: true }));

                const response = await api.getProducts({
                    page,
                    limit,
                    search: searchQuery,
                    category: selectedCategory
                });

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
                setLoading(prev => ({ ...prev, products: false }));
            }
        };

        fetchProducts();
    }, [page, searchQuery, selectedCategory]);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(prev => ({ ...prev, categories: true }));
                const response = await api.getCategories();

                if (response.ok) {
                    setCategories(response.data);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            } finally {
                setLoading(prev => ({ ...prev, categories: false }));
            }
        };

        fetchCategories();
    }, []);

    // Fetch user's rental history
    useEffect(() => {
        const fetchRents = async () => {
            try {
                setLoading(prev => ({ ...prev, rents: true }));
                const response = await api.getUserRentals();

                if (response.ok) {
                    setRents(response.data);
                }
            } catch (err) {
                console.error('Error fetching rentals:', err);
            } finally {
                setLoading(prev => ({ ...prev, rents: false }));
            }
        };

        fetchRents();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // Reset to first page when searching
    };

    const handleFilter = (e) => {
        e.preventDefault();
        setPage(1); // Reset to first page when filtering
        setShowFilter(false);
    };

    // Calculate rental statistics
    const rentalStats = {
        active: rents.filter(rent => rent.order?.order_status === 'ONRENT').length,
        pending: rents.filter(rent => rent.order?.order_status === 'WAITING').length,
        completed: rents.filter(rent => rent.order?.order_status === 'RETURNED').length
    };

    return (
        <div className="container mx-auto px-4">
            {/* Header with welcome message */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-primary">Welcome, {user?.name}</h1>
                <p className="text-gray-600">
                    This page contains a list of items available in the system. You can use the search bar to find specific items,
                    or navigate through pages to view more items.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="stats shadow mb-6 w-full">
                <div className="stat">
                    <div className="stat-figure text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div className="stat-title">Active Rentals</div>
                    <div className="stat-value">{rentalStats.active}</div>
                    <div className="stat-desc">Currently borrowed equipment</div>
                </div>

                <div className="stat">
                    <div className="stat-figure text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                        </svg>
                    </div>
                    <div className="stat-title">Pending Requests</div>
                    <div className="stat-value text-primary">{rentalStats.pending}</div>
                    <div className="stat-desc">Awaiting approval</div>
                </div>

                <div className="stat">
                    <div className="stat-figure text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                        </svg>
                    </div>
                    <div className="stat-title">Completed Rentals</div>
                    <div className="stat-value">{rentalStats.completed}</div>
                    <div className="stat-desc">Historical rentals</div>
                </div>
            </div>

            {/* Search Bar and Filter Button */}
            <div className="flex flex-col md:flex-row justify-between mb-6 gap-2">
                <form className="flex w-full" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="input input-bordered w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary ml-2">
                        Search
                    </button>
                </form>
                <button
                    onClick={() => setShowFilter(!showFilter)}
                    className="btn btn-secondary"
                >
                    Filter
                </button>
            </div>

            {/* Filter Modal */}
            {showFilter && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Filter Products</h2>
                        <form onSubmit={handleFilter}>
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text">Category</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.slug}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    Apply
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setShowFilter(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="alert alert-error mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Products Grid */}
            {loading.products ? (
                <div className="flex justify-center items-center min-h-[300px]">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {products.length > 0 ? (
                        products.map(product => (
                            <Link to={`/products/${product.id}`} key={product.id} className="block">
                                <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                                    <figure className="px-10 pt-10">
                                        {product.product_picture ? (
                                            <img
                                                src={product.product_picture}
                                                alt={product.name}
                                                className="rounded-xl h-48 object-cover"
                                            />
                                        ) : (
                                            <div className="bg-base-200 h-48 w-full rounded-xl flex items-center justify-center">
                                                <span className="text-base-content opacity-50">No image</span>
                                            </div>
                                        )}
                                    </figure>
                                    <div className="card-body">
                                        <h2 className="card-title">{product.name}</h2>
                                        <p className="text-base-content opacity-80">{product.brand}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="font-semibold">
                                                Rp{product.price.toLocaleString('id-ID')} / Week
                                            </p>
                                            {product.quantity > 0 && product.is_rentable ? (
                                                <div className="badge badge-success">Available</div>
                                            ) : (
                                                <div className="badge badge-error">Unavailable</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-10">
                            <div className="alert">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>No products found matching your criteria.</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mb-8">
                    <div className="join">
                        <button
                            className="join-item btn"
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            disabled={page === 1}
                        >
                            «
                        </button>

                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                className={`join-item btn ${page === i + 1 ? 'btn-active' : ''}`}
                                onClick={() => setPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}

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

            {/* Recent Rentals Section */}
            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <h2 className="card-title">Recent Rentals</h2>

                    {loading.rents ? (
                        <div className="flex justify-center items-center min-h-[100px]">
                            <span className="loading loading-spinner loading-md text-primary"></span>
                        </div>
                    ) : rents.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Status</th>
                                        <th>Payment</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rents.slice(0, 5).map(rent => (
                                        <tr key={rent.id}>
                                            <td>{rent.order?.invoice || 'N/A'}</td>
                                            <td>{rent.order?.start_date ? new Date(rent.order.start_date).toLocaleDateString() : 'N/A'}</td>
                                            <td>{rent.order?.end_date ? new Date(rent.order.end_date).toLocaleDateString() : 'N/A'}</td>
                                            <td>
                                                <div className={`badge ${getStatusBadgeColor(rent.order?.order_status)}`}>
                                                    {rent.order?.order_status || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={`badge ${getPaymentBadgeColor(rent.order?.payment_status)}`}>
                                                    {rent.order?.payment_status || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <Link to={`/rentals/${rent.id}`} className="btn btn-ghost btn-xs">
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>You don't have any rentals yet.</span>
                        </div>
                    )}

                    {rents.length > 5 && (
                        <div className="card-actions justify-end mt-4">
                            <Link to="/rentals" className="btn btn-primary">
                                View All Rentals
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat button */}
            <div className="fixed bottom-24 right-8 tooltip tooltip-left z-10" data-tip="Contact Admin">
                <a href="https://wa.me/6282119394379" target="_blank" rel="noreferrer"
                    className="btn btn-circle btn-lg btn-success">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.4 3.6C18.2 1.3 15.2 0 12 0S5.8 1.3 3.6 3.6C1.3 5.8 0 8.8 0 12s1.3 6.2 3.6 8.4c2.2 2.3 5.2 3.6 8.4 3.6 1.6 0 3.1-.3 4.6-.9l5.1 1.6c.1 0 .3.1.4.1.2 0 .5-.1.6-.3.2-.2.3-.5.3-.8l-1.6-5.1c.6-1.5.9-3 .9-4.6 0-3.2-1.3-6.2-3.6-8.4z"></path>
                    </svg>
                </a>
            </div>
        </div>
    );
}

// Helper functions for status badges
function getStatusBadgeColor(status) {
    switch (status) {
        case 'APPROVED': return 'badge-success';
        case 'ONRENT': return 'badge-info';
        case 'WAITING': return 'badge-warning';
        case 'OVERDUE': return 'badge-error';
        case 'RETURNED': return 'badge-success';
        case 'CANCELLED': return 'badge-ghost';
        case 'REJECTED': return 'badge-error';
        default: return 'badge-ghost';
    }
}

function getPaymentBadgeColor(status) {
    switch (status) {
        case 'PAID': return 'badge-success';
        case 'UNPAID': return 'badge-warning';
        default: return 'badge-ghost';
    }
}

export default RegularDashboard;