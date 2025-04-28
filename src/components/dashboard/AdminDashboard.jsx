import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FaBox, FaExclamationTriangle, FaExchangeAlt, FaClock, FaChartBar, FaCalendarCheck } from 'react-icons/fa';

function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockCount: 0,
        needMaintenanceCount: 0,
        pendingRentals: 0,
        activeRentals: 0,
        completedRentals: 0,
        totalRentals: 0,
        categories: 0,
        topRentedItems: []
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all statistics for dashboard
    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                setLoading(true);

                // Fetch products stats
                const productsResponse = await api.getProducts({ limit: 1 });

                if (productsResponse.ok) {
                    setStats(prev => ({
                        ...prev,
                        totalProducts: productsResponse.data.pagination?.total || 0
                    }));
                }

                // Fetch categories count
                const categoriesResponse = await api.getCategories();
                if (categoriesResponse.ok) {
                    setStats(prev => ({
                        ...prev,
                        categories: categoriesResponse.data.length || 0
                    }));
                }

                // Fetch all rentals for statistics
                const rentalsResponse = await api.getRentals();

                if (rentalsResponse.ok) {
                    const rentals = rentalsResponse.data;

                    // Calculate rental statistics
                    const pendingRentals = rentals.filter(rent =>
                        rent.order?.order_status === 'WAITING'
                    ).length;

                    const activeRentals = rentals.filter(rent =>
                        rent.order?.order_status === 'ONRENT' || rent.order?.order_status === 'OVERDUE'
                    ).length;

                    const completedRentals = rentals.filter(rent =>
                        rent.order?.order_status === 'RETURNED'
                    ).length;

                    setStats(prev => ({
                        ...prev,
                        pendingRentals,
                        activeRentals,
                        completedRentals,
                        totalRentals: rentals.length
                    }));

                    // Calculate top rented items (if orders have product details)
                    const productRentCounts = {};
                    rentals.forEach(rent => {
                        if (rent.order?.products) {
                            rent.order.products.forEach(item => {
                                if (item.product) {
                                    const productId = item.product.id;
                                    if (!productRentCounts[productId]) {
                                        productRentCounts[productId] = {
                                            count: 0,
                                            name: item.product.name,
                                            id: productId
                                        };
                                    }
                                    productRentCounts[productId].count += item.quantity || 1;
                                }
                            });
                        }
                    });

                    // Convert to array and get top 5
                    const topRentedItems = Object.values(productRentCounts)
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);

                    setStats(prev => ({
                        ...prev,
                        topRentedItems
                    }));
                }

                // Fetch products to calculate low stock count
                const allProductsResponse = await api.getProducts({ limit: 100 });

                if (allProductsResponse.ok) {
                    const products = allProductsResponse.data.data;

                    // Calculate low stock items
                    const lowStock = products.filter(product =>
                        product.quantity <= product.quantity_alert && product.quantity > 0
                    ).length;

                    // Calculate items that might need maintenance (for example, all rentable items)
                    const needMaintenance = products.filter(product =>
                        product.quantity > 0 && product.is_rentable
                    ).length;

                    setStats(prev => ({
                        ...prev,
                        lowStockCount: lowStock,
                        needMaintenanceCount: needMaintenance
                    }));
                }

            } catch (err) {
                console.error('Error fetching dashboard statistics:', err);
                setError('Failed to load dashboard statistics. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, []);

    return (
        <div className="container mx-auto px-4">
            {/* Header with welcome message */}
            <div className="my-6">
                <h1 className="text-2xl font-bold text-primary">Welcome, {user?.name}</h1>
                <p className="text-base-content opacity-70">
                    Dashboard overview showing key metrics and performance indicators.
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Inventory Stats Card */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title text-lg flex items-center gap-2">
                                    <FaBox className="text-primary" />
                                    Inventory Overview
                                </h2>

                                <div className="stats stats-vertical shadow mt-2">
                                    <div className="stat">
                                        <div className="stat-title">Total Products</div>
                                        <div className="stat-value text-primary">{stats.totalProducts}</div>
                                        <div className="stat-desc">Items in inventory</div>
                                    </div>

                                    <div className="stat">
                                        <div className="stat-title">Low Stock Items</div>
                                        <div className="stat-value text-warning">{stats.lowStockCount}</div>
                                        <div className="stat-desc">Need restock soon</div>
                                    </div>

                                    <div className="stat">
                                        <div className="stat-title">Categories</div>
                                        <div className="stat-value text-secondary">{stats.categories}</div>
                                        <div className="stat-desc">Product categories</div>
                                    </div>
                                </div>

                                <div className="card-actions mt-4">
                                    <Link to="/products" className="btn btn-primary btn-sm btn-block">
                                        Manage Inventory
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Rentals Stats Card */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title text-lg flex items-center gap-2">
                                    <FaExchangeAlt className="text-secondary" />
                                    Rental Activity
                                </h2>

                                <div className="stats stats-vertical shadow mt-2">
                                    <div className="stat">
                                        <div className="stat-title">Active Rentals</div>
                                        <div className="stat-value text-info">{stats.activeRentals}</div>
                                        <div className="stat-desc">Currently out</div>
                                    </div>

                                    <div className="stat">
                                        <div className="stat-title">Pending Requests</div>
                                        <div className="stat-value text-warning">{stats.pendingRentals}</div>
                                        <div className="stat-actions">
                                            <Link to="/rentals/pending" className="btn btn-xs">
                                                View
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="stat">
                                        <div className="stat-title">Completed Rentals</div>
                                        <div className="stat-value text-success">{stats.completedRentals}</div>
                                        <div className="stat-desc">Successfully returned</div>
                                    </div>
                                </div>

                                <div className="card-actions mt-4">
                                    <Link to="/rentals" className="btn btn-secondary btn-sm btn-block">
                                        Manage Rentals
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Alert/Action Required Card */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title text-lg flex items-center gap-2">
                                    <FaExclamationTriangle className="text-warning" />
                                    Needs Attention
                                </h2>

                                <div className="py-4">
                                    {/* Low stock alert */}
                                    <div className="alert alert-warning mb-3 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium">
                                                {stats.lowStockCount} items low on stock
                                            </span>
                                        </div>
                                        <Link to="/products?lowStock=true" className="btn btn-xs btn-ghost">
                                            View
                                        </Link>
                                    </div>

                                    {/* Pending rentals alert */}
                                    <div className="alert alert-info mb-3 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium">
                                                {stats.pendingRentals} rentals awaiting approval
                                            </span>
                                        </div>
                                        <Link to="/rentals/pending" className="btn btn-xs btn-ghost">
                                            View
                                        </Link>
                                    </div>

                                    {/* Maintenance items alert */}
                                    <div className="alert mb-3 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium">
                                                {stats.needMaintenanceCount} items need inspection
                                            </span>
                                        </div>
                                        <Link to="/maintenance" className="btn btn-xs btn-ghost">
                                            Schedule
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Stats Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Top Rented Items */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title flex items-center gap-2">
                                    <FaChartBar className="text-primary" />
                                    Most Popular Items
                                </h2>

                                {stats.topRentedItems.length > 0 ? (
                                    <div className="overflow-x-auto mt-4">
                                        <table className="table table-zebra w-full">
                                            <thead>
                                                <tr>
                                                    <th>Rank</th>
                                                    <th>Product Name</th>
                                                    <th>Times Rented</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.topRentedItems.map((item, index) => (
                                                    <tr key={item.id}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <Link to={`/products/${item.id}`} className="link link-hover">
                                                                {item.name}
                                                            </Link>
                                                        </td>
                                                        <td>{item.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="alert mt-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span>No rental data available yet</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title flex items-center gap-2">
                                    <FaCalendarCheck className="text-secondary" />
                                    Quick Actions
                                </h2>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <Link to="/products/new" className="btn btn-success">
                                        Add New Product
                                    </Link>
                                    <Link to="/categories" className="btn btn-info">
                                        Manage Categories
                                    </Link>
                                    <Link to="/export-products" className="btn btn-primary">
                                        Export Inventory
                                    </Link>
                                    <Link to="/import" className="btn btn-secondary">
                                        Import Data
                                    </Link>
                                    <Link to="/users" className="btn">
                                        Manage Users
                                    </Link>
                                    <Link to="/reports" className="btn">
                                        View Reports
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Timeline */}
                    <div className="card bg-base-100 shadow-xl mb-8">
                        <div className="card-body">
                            <h2 className="card-title flex items-center gap-2">
                                <FaClock className="text-accent" />
                                Recent Activity
                            </h2>

                            <div className="mt-4">
                                <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
                                    {/* This would ideally be populated from a real activity log */}
                                    <li>
                                        <div className="timeline-middle">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-primary"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                                        </div>
                                        <div className="timeline-start md:text-end mb-10">
                                            <time className="font-mono italic">Just now</time>
                                            <div className="text-lg font-black">Dashboard viewed</div>
                                            Administrator accessed the system dashboard
                                        </div>
                                        <hr />
                                    </li>
                                    <li>
                                        <hr />
                                        <div className="timeline-middle">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-primary"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                                        </div>
                                        <div className="timeline-end mb-10">
                                            <time className="font-mono italic">2 hours ago</time>
                                            <div className="text-lg font-black">New rental request</div>
                                            Student requested Arduino Uno kit
                                        </div>
                                        <hr />
                                    </li>
                                    <li>
                                        <hr />
                                        <div className="timeline-middle">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-primary"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                                        </div>
                                        <div className="timeline-start md:text-end mb-10">
                                            <time className="font-mono italic">Yesterday</time>
                                            <div className="text-lg font-black">Inventory update</div>
                                            5 new ESP32 boards added to inventory
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminDashboard;