import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

function RentalsPage() {
    const { user } = useAuth();
    const location = useLocation();
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusCounts, setStatusCounts] = useState({});
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [uploading, setUploading] = useState(null);
    const isAdmin = user?.team?.slug === 'administrator';
    const [totalStatusCounts, setTotalStatusCounts] = useState({
        all: 0,
        waiting: 0,
        approved: 0,
        active: 0,
        overdue: 0,
        returned: 0,
        rejected: 0,
        cancelled: 0
    });

    useEffect(() => {
        if (location.state?.success) {
            toast.success('Your rental request has been submitted successfully');
            // Clear the state to prevent showing the toast again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        fetchRentals();
    }, [filter, currentPage, search, isAdmin]);

    const fetchRentals = async () => {
        setLoading(true);
        try {
            let response;

            const allRentalsParams = { limit: 100 }

            let allRentalsResponse;
            if (isAdmin) {
                allRentalsResponse = await api.getAllRentals(allRentalsParams);
            } else {
                allRentalsResponse = await api.getUserRentals(allRentalsParams);
            }

            if (allRentalsResponse.ok) {
                calculateTotalStatusCounts(allRentalsResponse.data.data || []);
            }

            const queryParams = {
                page: currentPage
            };

            if (search) {
                queryParams.search = search;
            }

            if (filter !== 'all') {
                let apiFilter = filter.toUpperCase();
                if (filter === 'active') {
                    apiFilter = 'ONRENT';
                } else if (filter === 'completed') {
                    apiFilter = 'RETURNED';
                }
                queryParams.status = apiFilter;
            }

            console.log("Fetching rentals with params:", queryParams);

            if (isAdmin) {
                response = await api.getAllRentals(queryParams);
            } else {
                response = await api.getUserRentals(queryParams);
            }

            console.log("API response:", response.data.pagination.page);

            if (response.ok) {
                setRentals(response.data.data || []);

                // Set pagination info
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.page || 1);
                } else {
                    setTotalPages(1);
                }
                setStatusCounts({
                    ...totalStatusCounts,
                    [filter]: response.data.data?.length || 0
                });
            } else {
                setError("Failed to load rentals. Please try again.");
            }

        } catch (err) {
            console.error('Error fetching rentals:', err);
            setError("Could not connect to the server. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalStatusCounts = (rentals) => {
        const counts = {
            all: rentals.length,
            waiting: 0,
            approved: 0,
            active: 0,
            overdue: 0,
            returned: 0,
            rejected: 0,
            cancelled: 0
        };

        rentals.forEach(rental => {
            const status = rental.order?.order_status?.toLowerCase();
            if (status) {
                // Map database statuses to UI status names
                if (status === 'onrent') {
                    counts.active++;
                }
                else if (status === 'returned') {
                    counts.returned++;
                }
                else if (counts[status] !== undefined) {
                    counts[status]++;
                }
            }
        });

        setTotalStatusCounts(counts);
    };

    const handleStatusChange = (newStatus) => {
        setFilter(newStatus);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toUpperCase()) {
            case 'WAITING':
                return 'badge-warning';
            case 'APPROVED':
                return 'badge-info';
            case 'ONRENT':
            case 'ACTIVE':
                return 'badge-success';
            case 'OVERDUE':
                return 'badge-error';
            case 'REJECTED':
                return 'badge-error';
            case 'RETURNED':
                return 'badge-primary';
            case 'CANCELLED':
                return 'badge-neutral';
            default:
                return 'badge-ghost';
        }
    };

    const getPaymentBadgeClass = (status) => {
        switch (status?.toUpperCase()) {
            case 'PAID':
                return 'badge-success';
            case 'PENDING':
                return 'badge-warning';
            case 'UNPAID':
                return 'badge-error';
            default:
                return 'badge-ghost';
        }
    };

    const handleDocumentUpload = async (rentalId, docType, file) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('File too large. Maximum size is 5MB.');
            return;
        }

        setUploading(rentalId + docType);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${api.baseUrl}/images/rent/${rentalId}/${docType}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api.getToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`${docType === 'before' ? 'Before' : 'After'} documentation uploaded successfully`);
                fetchRentals();
            } else {
                toast.error(data.message || `Failed to upload ${docType} documentation`);
            }
        } catch (err) {
            console.error(`Error uploading ${docType} documentation:`, err);
            toast.error(`Failed to upload ${docType} documentation`);
        } finally {
            setUploading(null);
        }
    };

    const handleCancelRental = async (rentalId) => {
        if (!window.confirm('Are you sure you want to cancel this rental request?')) return;

        try {
            const response = await api.updateRentalStatus(rentalId, 'CANCELLED');
            if (response.ok) {
                toast.success('Rental has been cancelled');
                fetchRentals();
            } else {
                toast.error(response.data?.message || 'Failed to cancel rental');
            }
        } catch (err) {
            console.error('Error cancelling rental:', err);
            toast.error('Failed to cancel rental. Please try again.');
        }
    };

    const handleUpdateRentalStatus = async (rentalId, newStatus, type = 'order') => {
        if (!window.confirm(`Are you sure you want to mark this rental as ${newStatus.toLowerCase()}?`)) return;

        try {
            const response = await api.updateRentalStatus(rentalId, newStatus, type);
            if (response.ok) {
                toast.success(`Rental ${type === 'payment' ? 'payment ' : ''}status updated to ${newStatus.toLowerCase()}`);
                fetchRentals();
            } else {
                toast.error(response.data?.message || 'Failed to update rental status');
            }
        } catch (err) {
            console.error('Error updating rental status:', err);
            toast.error('Failed to update rental status. Please try again.');
        }
    };

    if (loading && !rentals.length) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    const renderActionButtons = (rental) => {
        const status = rental.order?.order_status?.toUpperCase() || '';
        const paymentStatus = rental.order?.payment_status?.toUpperCase() || '';

        return (
            <div className="flex flex-col gap-2">
                <Link
                    to={`/rentals/${rental.id}`}
                    className="btn btn-xs btn-info w-full"
                >
                    View Details
                </Link>

                {/* Regular user actions */}
                {!isAdmin && (
                    <>
                        {status === 'WAITING' && (
                            <button
                                className="btn btn-xs btn-error w-full"
                                onClick={() => handleCancelRental(rental.id)}
                            >
                                Cancel Request
                            </button>
                        )}

                        {status === 'APPROVED' && paymentStatus === 'UNPAID' && (
                            <button className="btn btn-xs btn-primary w-full">
                                Pay Now
                            </button>
                        )}

                        {(status === 'ACTIVE' || status === 'ONRENT') && !rental.documentation_before && (
                            <div className="form-control w-full">
                                <label className="btn btn-xs btn-primary w-full">
                                    {uploading === rental.id + 'before' ? (
                                        <span className="loading loading-spinner loading-xs"></span>
                                    ) : (
                                        'Upload Before Doc'
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleDocumentUpload(rental.id, 'before', e.target.files[0])}
                                        disabled={uploading === rental.id + 'before'}
                                    />
                                </label>
                            </div>
                        )}

                        {(status === 'ACTIVE' || status === 'ONRENT' || status === 'OVERDUE') &&
                            rental.documentation_before && !rental.documentation_after && (
                                <div className="form-control w-full">
                                    <label className="btn btn-xs btn-primary w-full">
                                        {uploading === rental.id + 'after' ? (
                                            <span className="loading loading-spinner loading-xs"></span>
                                        ) : (
                                            'Upload After Doc'
                                        )}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleDocumentUpload(rental.id, 'after', e.target.files[0])}
                                            disabled={uploading === rental.id + 'after'}
                                        />
                                    </label>
                                </div>
                            )}
                    </>
                )}

                {/* Admin-only actions */}
                {isAdmin && (
                    <>
                        {status === 'WAITING' && (
                            <>
                                <button
                                    className="btn btn-xs btn-success w-full"
                                    onClick={() => handleUpdateRentalStatus(rental.order.id, 'APPROVED')}
                                >
                                    Approve
                                </button>
                                <button
                                    className="btn btn-xs btn-error w-full"
                                    onClick={() => handleUpdateRentalStatus(rental.order.id, 'REJECTED')}
                                >
                                    Reject
                                </button>
                            </>
                        )}

                        {status === 'APPROVED' && paymentStatus === 'PAID' && (
                            <button
                                className="btn btn-xs btn-success w-full"
                                onClick={() => handleUpdateRentalStatus(rental.order.id, 'ONRENT')}
                            >
                                Mark as On Rent
                            </button>
                        )}

                        {(status === 'ACTIVE' || status === 'ONRENT' || status === 'OVERDUE') && (
                            <button
                                className="btn btn-xs btn-success w-full"
                                onClick={() => handleUpdateRentalStatus(rental.order.id, 'RETURNED')}
                            >
                                Mark as Returned
                            </button>
                        )}

                        {status === 'APPROVED' && paymentStatus === 'UNPAID' && (
                            <button
                                className="btn btn-xs btn-success w-full"
                                onClick={() => handleUpdateRentalStatus(rental.order.id, 'PAID', 'payment')}
                            >
                                Mark as Paid
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Rental Management</h1>

            {error && (
                <div className="alert alert-error mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {/* Status summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <div className={`stat shadow bg-white rounded-lg cursor-pointer ${filter === 'all' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleStatusChange('all')}>
                    <div className="stat-title">All Rentals</div>
                    <div className="stat-value text-center">{totalStatusCounts.all || 0}</div>
                </div>
                <div className={`stat shadow bg-white rounded-lg cursor-pointer ${filter === 'waiting' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleStatusChange('waiting')}>
                    <div className="stat-title">Waiting</div>
                    <div className="stat-value text-center text-warning">{totalStatusCounts.waiting || 0}</div>
                </div>
                <div className={`stat shadow bg-white rounded-lg cursor-pointer ${filter === 'approved' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleStatusChange('approved')}>
                    <div className="stat-title">Approved</div>
                    <div className="stat-value text-center text-info">{totalStatusCounts.approved || 0}</div>
                </div>
                <div className={`stat shadow bg-white rounded-lg cursor-pointer ${filter === 'active' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleStatusChange('active')}>
                    <div className="stat-title">On Rent</div>
                    <div className="stat-value text-center text-success">{totalStatusCounts.active || 0}</div>
                </div>
                <div className={`stat shadow bg-white rounded-lg cursor-pointer ${filter === 'overdue' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleStatusChange('overdue')}>
                    <div className="stat-title">Overdue</div>
                    <div className="stat-value text-center text-error">{totalStatusCounts.overdue || 0}</div>
                </div>
                <div className={`stat shadow bg-white rounded-lg cursor-pointer ${filter === 'returned' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleStatusChange('returned')}>
                    <div className="stat-title">Completed</div>
                    <div className="stat-value text-center text-primary">{totalStatusCounts.returned || 0}</div>
                </div>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="form-control grow">
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Search by ID, product, or user..."
                            className="input input-bordered w-full"
                            value={search}
                            onChange={handleSearchChange}
                        />
                        <button className="btn btn-square">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
                {isAdmin && (
                    <Link to="/rentals/reports" className="btn btn-primary">
                        Generate Reports
                    </Link>
                )}
            </div>

            {rentals.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <div className="flex flex-col items-center justify-center py-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h2 className="text-xl font-semibold mb-2">No rentals found</h2>
                        <p className="text-gray-500 mb-4">
                            {filter !== 'all'
                                ? `No rentals with ${filter} status found`
                                : search
                                    ? 'No rental matches your search criteria'
                                    : 'You do not have any rentals yet'}
                        </p>
                        {filter !== 'all' || search ? (
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setFilter('all');
                                    setSearch('');
                                }}
                            >
                                Show All Rentals
                            </button>
                        ) : (
                            <Link to="/products" className="btn btn-primary">
                                Browse Products
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead className="bg-base-200">
                                <tr>
                                    {isAdmin && <th>User</th>}
                                    <th>ID</th>
                                    <th>Items</th>
                                    <th>Dates</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rentals.map((rental) => (
                                    <tr key={rental.id}>
                                        {isAdmin && (
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-neutral text-neutral-content rounded-full w-8">
                                                            <span>{rental.user?.name?.substring(0, 2).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{rental.user?.name}</div>
                                                        <div className="text-xs opacity-60">{rental.identification}</div>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td>
                                            <div className="font-mono text-sm">{rental.id?.substring(0, 8).toUpperCase()}</div>
                                            <div className="text-xs opacity-60">{rental.order?.invoice || 'No Invoice'}</div>
                                        </td>
                                        <td>
                                            {rental.order?.products?.slice(0, 2).map((item, idx) => (
                                                <div key={idx} className="text-sm">
                                                    {item.quantity}× {item.product.name}
                                                </div>
                                            ))}
                                            {rental.order?.products?.length > 2 && (
                                                <div className="text-xs text-gray-500">
                                                    + {rental.order.products.length - 2} more items
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex flex-col text-sm">
                                                <span>
                                                    <span className="font-semibold">Start:</span> {format(new Date(rental.order?.start_date), 'dd MMM yyyy')}
                                                </span>
                                                <span>
                                                    <span className="font-semibold">End:</span> {format(new Date(rental.order?.end_date), 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span className={`badge ${getStatusBadgeClass(rental.order?.order_status)} badge-sm`}>
                                                    {rental.order?.order_status}
                                                </span>
                                                <span className={`badge ${getPaymentBadgeClass(rental.order?.payment_status)} badge-sm`}>
                                                    {rental.order?.payment_status}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-semibold">
                                                Rp {rental.order?.total_cost?.toLocaleString('id-ID')}
                                                <span className="text-xs block font-normal text-gray-500">
                                                    per week
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                For {Math.ceil((new Date(rental.order?.end_date) - new Date(rental.order?.start_date)) / (1000 * 60 * 60 * 24 * 7))} weeks
                                            </div>
                                        </td>
                                        <td>
                                            {renderActionButtons(rental)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                    <div className="join">
                        <button
                            className="join-item btn"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            «
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                className={`join-item btn ${currentPage === i + 1 ? 'btn-active' : ''}`}
                                onClick={() => handlePageChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className="join-item btn"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            »
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RentalsPage;