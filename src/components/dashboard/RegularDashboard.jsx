import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FaBox, FaExchangeAlt, FaChartBar, FaClock } from 'react-icons/fa';

function RegularDashboard() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rents, setRents] = useState([]);
    const [stats, setStats] = useState({
        availableProducts: 0,
        totalCategories: 0,
        activeRentals: 0,
        pendingRentals: 0,
        completedRentals: 0,
        totalRentals: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showFilter, setShowFilter] = useState(false);
    const limit = 3;

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch popular products
                const productsResponse = await api.getProducts({
                    page,
                    limit,
                    search: searchQuery,
                    category: selectedCategory,
                    sortBy: 'popularity',
                    order: 'desc'
                });

                if (productsResponse.ok) {
                    setProducts(productsResponse.data.data);
                    setTotalPages(productsResponse.data.pagination.pages);

                    // Calculate available products
                    const availableProducts = productsResponse.data.data.filter(
                        product => product.quantity > 0 && product.is_rentable
                    ).length;

                    setStats(prev => ({
                        ...prev,
                        availableProducts: productsResponse.data.pagination.total || 0
                    }));
                }

                // Fetch categories
                const categoriesResponse = await api.getCategories();
                if (categoriesResponse.ok) {
                    setCategories(categoriesResponse.data);
                    setStats(prev => ({
                        ...prev,
                        totalCategories: categoriesResponse.data.length
                    }));
                }

                // Fetch user's rental history
                const rentsResponse = await api.getUserRentals();
                if (rentsResponse.ok) {
                    const userRentals = rentsResponse.data;
                    setRents(userRentals);

                    // Calculate rental statistics
                    const activeRentals = userRentals.filter(rent =>
                        rent.order?.order_status === 'ONRENT' || rent.order?.order_status === 'ACTIVE'
                    ).length;

                    const pendingRentals = userRentals.filter(rent =>
                        rent.order?.order_status === 'WAITING'
                    ).length;

                    const completedRentals = userRentals.filter(rent =>
                        rent.order?.order_status === 'RETURNED'
                    ).length;

                    setStats(prev => ({
                        ...prev,
                        activeRentals,
                        pendingRentals,
                        completedRentals,
                        totalRentals: userRentals.length
                    }));
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [page, searchQuery, selectedCategory]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
    };

    const handleFilter = (e) => {
        e.preventDefault();
        setPage(1);
        setShowFilter(false);
    };

    return (
        <div className="container mx-auto px-4">
            {/* Header with welcome message */}
            <div className="my-6">
                <h1 className="text-2xl font-bold text-primary">Welcome, {user?.name}</h1>
                <p className="text-base-content opacity-70">
                    Your personal dashboard with quick access to products and rentals.
                </p>
            </div>

            {/* Error message */}
            {error && (
                <div className="alert alert-error mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                    <button className="btn btn-sm" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            ) : (
                <>
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Rentals Stats Card */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title text-lg flex items-center gap-2">
                                    <FaExchangeAlt className="text-secondary" />
                                    Your Rental Activity
                                </h2>

                                <div className="stats stats-vertical shadow mt-2">
                                    <div className="stat">
                                        <div className="stat-title">Active Rentals</div>
                                        <div className="stat-value text-info">{stats.activeRentals}</div>
                                        <div className="stat-desc">Items currently borrowed</div>
                                    </div>

                                    <div className="stat">
                                        <div className="stat-title">Pending Requests</div>
                                        <div className="stat-value text-warning">{stats.pendingRentals}</div>
                                        <div className="stat-desc">Awaiting approval</div>
                                    </div>

                                    <div className="stat">
                                        <div className="stat-title">Completed Rentals</div>
                                        <div className="stat-value text-success">{stats.completedRentals}</div>
                                        <div className="stat-desc">Successfully returned</div>
                                    </div>
                                </div>

                                <div className="card-actions mt-4">
                                    <Link to="/rentals" className="btn btn-secondary btn-sm btn-block">
                                        View My Rentals
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Recent Rental Activity */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title text-lg flex items-center gap-2">
                                    <FaClock className="text-primary" />
                                    Recent Activity
                                </h2>

                                {rents.length > 0 ? (
                                    <div className="mt-2">
                                        <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
                                            {rents.slice(0, 3).map((rent, index) => (
                                                <li key={rent.id}>
                                                    {index > 0 && <hr />}
                                                    <div className="timeline-middle">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-primary">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className={index % 2 === 0 ? "timeline-start md:text-end mb-10" : "timeline-end mb-10"}>
                                                        <time className="font-mono italic">
                                                            {rent.created_at ? new Date(rent.created_at).toLocaleDateString() : 'N/A'}
                                                        </time>
                                                        <div className="text-lg font-bold">
                                                            {rent.order?.order_status === 'WAITING' ? 'Request Submitted' :
                                                                rent.order?.order_status === 'APPROVED' ? 'Rental Approved' :
                                                                    rent.order?.order_status === 'ONRENT' ? 'Rental Active' :
                                                                        rent.order?.order_status === 'RETURNED' ? 'Items Returned' : 'Rental Updated'}
                                                        </div>
                                                        <div className="text-sm">
                                                            {rent.order?.products?.slice(0, 1).map(item => (
                                                                <span key={item.id}>
                                                                    {item.product.name} {item.quantity > 1 ? `(${item.quantity})` : ''}
                                                                </span>
                                                            ))}
                                                            {(rent.order?.products?.length > 1) &&
                                                                <span> and {rent.order.products.length - 1} more items</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    {index < Math.min(rents.length, 3) - 1 && <hr />}
                                                </li>
                                            ))}
                                        </ul>

                                        {rents.length > 3 && (
                                            <div className="text-center mt-4">
                                                <Link to="/rentals" className="link link-hover text-primary">
                                                    View all rental history →
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="alert mt-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span>You don't have any rental history yet</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Browse Products Section */}
                    <div className="card bg-base-100 shadow-xl mb-8">
                        <div className="card-body">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                <h2 className="card-title flex items-center gap-2 mb-2 sm:mb-0">
                                    <FaBox className="text-primary" />
                                    Available Products
                                </h2>

                                <div className="join">
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        className="input input-bordered join-item"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                                    />
                                    <button className="btn btn-primary join-item" onClick={handleSearch}>
                                        Search
                                    </button>
                                    <button className="btn join-item" onClick={() => setShowFilter(!showFilter)}>
                                        Filter
                                    </button>
                                </div>
                            </div>

                            {/* Filter dropdown */}
                            {showFilter && (
                                <div className="bg-base-200 p-4 rounded-lg mb-4">
                                    <form onSubmit={handleFilter} className="flex flex-col sm:flex-row gap-3 items-end">
                                        <div className="form-control w-full sm:w-auto">
                                            <label className="label">
                                                <span className="label-text">Category</span>
                                            </label>
                                            <select
                                                className="select select-bordered"
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
                                        <div>
                                            <button type="submit" className="btn btn-primary">Apply</button>
                                            <button type="button" className="btn btn-ghost ml-2" onClick={() => setShowFilter(false)}>Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Products grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {products.length > 0 ? (
                                    products.map(product => (
                                        <Link to={`/products/${product.id}`} key={product.id}>
                                            <div className="card bg-base-200 hover:shadow-lg transition-shadow h-full">
                                                <figure className="px-4 pt-4">
                                                    {product.product_picture ? (
                                                        <img
                                                            src={product.product_picture}
                                                            alt={product.name}
                                                            className="rounded-lg h-32 object-contain w-full"
                                                        />
                                                    ) : (
                                                        <div className="bg-base-300 h-32 w-full rounded-lg flex items-center justify-center">
                                                            <span className="text-base-content/50">No image</span>
                                                        </div>
                                                    )}
                                                </figure>
                                                <div className="card-body py-3">
                                                    <h3 className="font-bold text-lg line-clamp-1">{product.name}</h3>
                                                    <div className="text-sm opacity-70">{product.brand}</div>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="font-semibold">Rp {product.price.toLocaleString('id-ID')}/week</span>
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
                                    <div className="col-span-3 py-8 text-center">
                                        <div className="alert">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <span>No products found matching your criteria.</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pagination and view all button */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                                {totalPages > 1 && (
                                    <div className="btn-group">
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                        >
                                            «
                                        </button>
                                        <button className="btn btn-sm">
                                            Page {page} of {totalPages}
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={page === totalPages}
                                        >
                                            »
                                        </button>
                                    </div>
                                )}

                                <Link to="/products" className="btn btn-primary btn-sm">
                                    Browse All Products
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card bg-base-100 shadow-xl mb-8">
                        <div className="card-body">
                            <h2 className="card-title flex items-center gap-2">
                                <FaChartBar className="text-secondary" />
                                Quick Actions
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                                <Link to="/products" className="btn btn-primary">
                                    Browse Catalog
                                </Link>
                                <Link to="/cart" className="btn btn-secondary">
                                    View Cart
                                </Link>
                                <Link to="/rentals" className="btn">
                                    My Rentals
                                </Link>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Contact Admin Button */}
            <div className="fixed bottom-24 right-8 z-10">
                <div className="tooltip tooltip-left" data-tip="Contact Admin">
                    <a href="https://wa.me/6282119394379" target="_blank" rel="noreferrer" className="btn btn-circle btn-lg btn-success shadow-lg">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.4 3.6C18.2 1.3 15.2 0 12 0S5.8 1.3 3.6 3.6C1.3 5.8 0 8.8 0 12s1.3 6.2 3.6 8.4c2.2 2.3 5.2 3.6 8.4 3.6 1.6 0 3.1-.3 4.6-.9l5.1 1.6c.1 0 .3.1.4.1.2 0 .5-.1.6-.3.2-.2.3-.5.3-.8l-1.6-5.1c.6-1.5.9-3 .9-4.6 0-3.2-1.3-6.2-3.6-8.4z"></path>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}

function getStatusBadgeColor(status) {
    switch (status?.toUpperCase()) {
        case 'APPROVED': return 'badge-success';
        case 'ONRENT':
        case 'ACTIVE': return 'badge-info';
        case 'WAITING': return 'badge-warning';
        case 'OVERDUE': return 'badge-error';
        case 'RETURNED': return 'badge-success';
        case 'CANCELLED': return 'badge-ghost';
        case 'REJECTED': return 'badge-error';
        default: return 'badge-ghost';
    }
}

function getPaymentBadgeColor(status) {
    switch (status?.toUpperCase()) {
        case 'PAID': return 'badge-success';
        case 'UNPAID': return 'badge-warning';
        default: return 'badge-ghost';
    }
}

export default RegularDashboard;