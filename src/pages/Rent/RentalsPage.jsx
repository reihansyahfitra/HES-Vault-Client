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

            if (allRentalsResponse.ok && allRentalsResponse.data && allRentalsResponse.data.data) {
                calculateTotalStatusCounts(allRentalsResponse.data.data || []);
            }

            const queryParams = {
                page: currentPage,
                limit: 10
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

            console.log("API response:", response.data);

            if (response.ok) {
                const rentalsData = response.data.data || [];
                setRentals(rentalsData);

                // Set pagination info
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.page || 1);
                } else {
                    setTotalPages(1);
                }
                setStatusCounts({
                    ...totalStatusCounts,
                    [filter]: rentalsData.length || 0
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

    const handleCancelRental = async (rental) => {
        if (!window.confirm('Are you sure you want to cancel this rental request?')) return;

        try {
            if (!rental || !rental.order?.id) {
                toast.error("Order ID not found");
                return;
            }

            if (rental.order.order_status !== 'WAITING' && rental.order.order_status !== 'APPROVED') {
                toast.error('You can only cancel pending and approved rental requests');
                return;
            }

            const orderId = rental.order.id;
            const response = await fetch(`${api.baseUrl}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.getToken()}`
                },
                body: JSON.stringify({
                    order_status: 'CANCELLED'
                })
            });

            if (response.ok) {
                toast.success('Rental has been cancelled successfully');
                fetchRentals();
            } else {
                try {
                    const errorData = await response.json();
                    toast.error(errorData.message || 'Failed to cancel rental');
                } catch (parseErr) {
                    toast.error(`Failed to cancel rental (${response.status})`);
                }
            }
        } catch (err) {
            console.error('Error cancelling rental:', err);
            toast.error('Failed to cancel rental. Please try again.');
        }
    };

    const handleUpdateRentalStatus = async (rental, newStatus, type = 'order') => {
        if (!window.confirm(`Are you sure you want to mark this rental as ${newStatus.toLowerCase()}?`)) return;

        try {
            if (!rental || !rental.order?.id) {
                toast.error("Order ID not found");
                return;
            }

            const orderId = rental.order.id;

            const response = await fetch(`${api.baseUrl}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.getToken()}`
                },
                body: JSON.stringify({
                    [type === 'order' ? 'order_status' : 'payment_status']: newStatus
                })
            });

            if (response.ok) {
                toast.success(`Rental ${type === 'payment' ? 'payment ' : ''}status updated to ${newStatus.toLowerCase()}`);
                fetchRentals();
            } else {
                // Handle error responses
                try {
                    const errorData = await response.json();
                    toast.error(errorData.message || `Failed to update rental ${type} status`);
                } catch (parseErr) {
                    toast.error(`Failed to update rental ${type} status (${response.status})`);
                }
            }
        } catch (err) {
            console.error('Error updating rental status:', err);
            toast.error(`Failed to update rental ${type} status. Please try again.`);
        }
    };

    if (loading && !rentals.length) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    const renderUserActions = (rental) => {
        const status = rental.order?.order_status?.toUpperCase() || '';
        const paymentStatus = rental.order?.payment_status?.toUpperCase() || '';

        return (
            <>
                {((status === 'WAITING' || status === 'APPROVED') && paymentStatus !== 'PAID') && (
                    <button
                        className="btn btn-sm btn-error w-full btn-outline gap-1"
                        onClick={() => handleCancelRental(rental)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel {status === 'WAITING' ? 'Request' : 'Rental'}
                    </button>
                )}

                {status === 'APPROVED' && paymentStatus === 'UNPAID' && (
                    <button className="btn btn-sm btn-primary w-full gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                        Pay Now
                    </button>
                )}

                {(status === 'ACTIVE' || status === 'ONRENT') && !rental.documentation_before && (
                    <div className="form-control w-full">
                        <label className="btn btn-sm btn-primary w-full gap-1">
                            {uploading === rental.id + 'before' ? (
                                <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                    Before Doc
                                </>
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
                            <label className="btn btn-sm btn-primary w-full gap-1">
                                {uploading === rental.id + 'after' ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                        After Doc
                                    </>
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
        );
    };

    const renderAdminActions = (rental) => {
        const status = rental.order?.order_status?.toUpperCase() || '';
        const paymentStatus = rental.order?.payment_status?.toUpperCase() || '';

        return (
            <>
                {status === 'WAITING' && (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            className="btn btn-sm btn-success gap-1"
                            onClick={() => handleUpdateRentalStatus(rental, 'APPROVED')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Approve
                        </button>
                        <button
                            className="btn btn-sm btn-error gap-1"
                            onClick={() => handleUpdateRentalStatus(rental, 'REJECTED')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                        </button>
                    </div>
                )}

                {status === 'APPROVED' && paymentStatus === 'PAID' && (
                    <button
                        className="btn btn-sm btn-success w-full gap-1"
                        onClick={() => handleUpdateRentalStatus(rental, 'ONRENT')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                        </svg>
                        Start Rental
                    </button>
                )}

                {(status === 'ACTIVE' || status === 'ONRENT' || status === 'OVERDUE') && (
                    <button
                        className="btn btn-sm btn-success w-full gap-1"
                        onClick={() => handleUpdateRentalStatus(rental, 'RETURNED')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Mark Returned
                    </button>
                )}

                {status === 'APPROVED' && paymentStatus === 'UNPAID' && (
                    <button
                        className="btn btn-sm btn-success w-full gap-1"
                        onClick={() => handleUpdateRentalStatus(rental, 'PAID', 'payment')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                        Mark as Paid
                    </button>
                )}
            </>
        );
    };

    return (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 bg-gradient-to-b from-base-200 to-base-100 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">Rental Management</h1>
                <div className="badge badge-lg badge-outline badge-primary">{totalStatusCounts.all} Total Rentals</div>
            </div>

            {error && (
                <div className="alert alert-error mb-6 shadow-lg animate__animated animate__fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {/* Enhanced Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'all' ? 'ring-2 ring-primary border-primary border' : 'border border-base-300'}`}
                    onClick={() => handleStatusChange('all')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">All Rentals</div>
                        <div className="stat-value text-3xl">{totalStatusCounts.all || 0}</div>
                        <div className="w-full h-1 bg-gradient-to-r from-primary to-secondary mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'waiting' ? 'ring-2 ring-warning border-warning border' : 'border border-base-300'}`}
                    onClick={() => handleStatusChange('waiting')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Waiting</div>
                        <div className="stat-value text-3xl text-warning">{totalStatusCounts.waiting || 0}</div>
                        <div className="w-full h-1 bg-warning mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'approved' ? 'ring-2 ring-info border-info border' : 'border border-base-300'}`}
                    onClick={() => handleStatusChange('approved')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Approved</div>
                        <div className="stat-value text-3xl text-info">{totalStatusCounts.approved || 0}</div>
                        <div className="w-full h-1 bg-info mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'active' ? 'ring-2 ring-success border-success border' : 'border border-base-300'}`}
                    onClick={() => handleStatusChange('active')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">On Rent</div>
                        <div className="stat-value text-3xl text-success">{totalStatusCounts.active || 0}</div>
                        <div className="w-full h-1 bg-success mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'overdue' ? 'ring-2 ring-error border-error border' : 'border border-base-300'}`}
                    onClick={() => handleStatusChange('overdue')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Overdue</div>
                        <div className="stat-value text-3xl text-error">{totalStatusCounts.overdue || 0}</div>
                        <div className="w-full h-1 bg-error mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'returned' ? 'ring-2 ring-primary border-primary border' : 'border border-base-300'}`}
                    onClick={() => handleStatusChange('returned')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Completed</div>
                        <div className="stat-value text-3xl text-primary">{totalStatusCounts.returned || 0}</div>
                        <div className="w-full h-1 bg-primary mt-2 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Enhanced Search Area */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
                <div className="form-control grow w-full">
                    <input
                        type="text"
                        placeholder="Search by ID, product, or user..."
                        className="input input-bordered w-full focus:outline-none"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                {isAdmin && (
                    <Link to="/rentals/reports" className="btn btn-primary gap-2 shadow-md hover:shadow-lg w-full sm:w-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        Reports
                    </Link>
                )}
            </div>

            {/* Filter indicator */}
            {filter !== 'all' && (
                <div className="flex items-center mb-6 bg-base-100 p-3 rounded-lg shadow">
                    <span className="text-sm">Showing rentals with status: </span>
                    <span className={`ml-2 badge ${filter === 'waiting' ? 'badge-warning' :
                        filter === 'approved' ? 'badge-info' :
                            filter === 'active' ? 'badge-success' :
                                filter === 'overdue' ? 'badge-error' :
                                    filter === 'returned' ? 'badge-primary' : 'badge-ghost'
                        }`}>
                        {filter.toUpperCase()}
                    </span>
                    <button
                        className="btn btn-xs btn-ghost ml-auto"
                        onClick={() => setFilter('all')}
                    >
                        Clear Filter
                    </button>
                </div>
            )}

            {/* Empty state with improved design */}
            {rentals.length === 0 ? (
                <div className="card bg-base-100 shadow-xl p-6 text-center">
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="rounded-full bg-base-200 p-6 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-base-content opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No rentals found</h2>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            {filter !== 'all'
                                ? `We couldn't find any rentals with "${filter}" status`
                                : search
                                    ? 'No rentals match your search criteria'
                                    : 'You do not have any rentals yet. Start by browsing our available products.'}
                        </p>
                        {filter !== 'all' || search ? (
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => {
                                    setFilter('all');
                                    setSearch('');
                                }}
                            >
                                Show All Rentals
                            </button>
                        ) : (
                            <Link to="/products" className="btn btn-primary btn-lg gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                                </svg>
                                Browse Products
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                /* Enhanced table design */
                <div className="card bg-base-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto hidden md:block">
                        <table className="table w-full">
                            <thead className="bg-base-200 text-base-content">
                                <tr>
                                    {isAdmin && <th className="bg-base-200 border-b border-base-300">User</th>}
                                    <th className="bg-base-200 border-b border-base-300">ID</th>
                                    <th className="bg-base-200 border-b border-base-300">Items</th>
                                    <th className="bg-base-200 border-b border-base-300">Dates</th>
                                    <th className="bg-base-200 border-b border-base-300">Status</th>
                                    <th className="bg-base-200 border-b border-base-300">Total</th>
                                    <th className="bg-base-200 border-b border-base-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rentals.map((rental) => (
                                    <tr key={rental.id} className="hover:bg-base-200/50 border-b border-base-200">
                                        {isAdmin && (
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar">
                                                        <div className="mask mask-squircle w-10 h-10 overflow-hidden">
                                                            {rental.user?.profile_picture ? (
                                                                <img
                                                                    src={imageService.getImageUrl(rental.user.profile_picture)}
                                                                    alt={rental.user?.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        // If image fails to load, remove the img element and show initials
                                                                        e.target.parentNode.innerHTML = `
                                                                            <div class="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                                                                ${rental.user?.name?.substring(0, 2).toUpperCase() || '??'}
                                                                            </div>
                                                                        `;
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                                                    {rental.user?.name?.substring(0, 2).toUpperCase() || '??'}
                                                                </div>
                                                            )}
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
                                            <div className="font-mono text-sm font-semibold bg-base-200 px-2 py-1 rounded inline-block">
                                                {rental.id?.substring(0, 8).toUpperCase()}
                                            </div>
                                            <div className="text-xs opacity-60 mt-1">{rental.order?.invoice || 'No Invoice'}</div>
                                        </td>
                                        <td>
                                            {rental.order?.products?.slice(0, 2).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2 mb-1">
                                                    <span className="badge badge-sm">{item.quantity}×</span>
                                                    <span className="text-sm font-medium">{item.product.name}</span>
                                                </div>
                                            ))}
                                            {rental.order?.products?.length > 2 && (
                                                <div className="text-xs text-primary hover:underline cursor-pointer mt-1">
                                                    + {rental.order.products.length - 2} more items
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <div className="mb-1">
                                                    <span className="text-xs text-base-content/70">Start</span>
                                                    <div className="font-medium">{format(new Date(rental.order?.start_date), 'dd MMM yyyy')}</div>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-base-content/70">End</span>
                                                    <div className="font-medium">{format(new Date(rental.order?.end_date), 'dd MMM yyyy')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-2">
                                                <span className={`badge ${getStatusBadgeClass(rental.order?.order_status)} badge-md`}>
                                                    {rental.order?.order_status}
                                                </span>
                                                <span className={`badge ${getPaymentBadgeClass(rental.order?.payment_status)} badge-sm`}>
                                                    {rental.order?.payment_status}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-bold text-lg">
                                                Rp {rental.order?.total_cost?.toLocaleString('id-ID')}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-base-content/70">
                                                <span className="badge badge-sm badge-ghost">per week</span>
                                                <span>×</span>
                                                <span>{Math.ceil((new Date(rental.order?.end_date) - new Date(rental.order?.start_date)) / (1000 * 60 * 60 * 24 * 7))} weeks</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-2">
                                                <Link
                                                    to={`/rentals/${rental.id}`}
                                                    className="btn btn-sm btn-info w-full btn-outline gap-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    View Details
                                                </Link>

                                                {/* Regular user actions */}
                                                {!isAdmin && renderUserActions(rental)}

                                                {/* Admin-only actions */}
                                                {isAdmin && renderAdminActions(rental)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden">
                        {rentals.map((rental) => (
                            <div key={rental.id} className="border-b border-base-200 p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="font-mono text-sm font-semibold bg-base-200 px-2 py-1 rounded">
                                        {rental.id?.substring(0, 8).toUpperCase()}
                                    </div>
                                    <div className="flex space-x-2">
                                        <span className={`badge ${getStatusBadgeClass(rental.order?.order_status)}`}>
                                            {rental.order?.order_status}
                                        </span>
                                        <span className={`badge ${getPaymentBadgeClass(rental.order?.payment_status)}`}>
                                            {rental.order?.payment_status}
                                        </span>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="avatar">
                                            <div className="mask mask-squircle w-8 h-8 overflow-hidden">
                                                {rental.user?.profile_picture ? (
                                                    <img
                                                        src={imageService.getImageUrl(rental.user.profile_picture)}
                                                        alt={rental.user?.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.parentNode.innerHTML = `
                                                    <div class="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                                        ${rental.user?.name?.substring(0, 2).toUpperCase() || '??'}
                                                    </div>
                                                `;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                                        {rental.user?.name?.substring(0, 2).toUpperCase() || '??'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm">{rental.user?.name}</div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <div className="text-xs text-base-content/70">Items</div>
                                        {rental.order?.products?.slice(0, 2).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-1 mb-1">
                                                <span className="badge badge-xs">{item.quantity}×</span>
                                                <span className="text-sm truncate">{item.product.name}</span>
                                            </div>
                                        ))}
                                        {rental.order?.products?.length > 2 && (
                                            <div className="text-xs text-primary">+ {rental.order.products.length - 2} more</div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="text-xs text-base-content/70">Dates</div>
                                        <div className="text-sm">
                                            {format(new Date(rental.order?.start_date), 'dd MMM')} -
                                            {format(new Date(rental.order?.end_date), 'dd MMM yyyy')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end mb-3">
                                    <div>
                                        <div className="text-xs text-base-content/70">Total</div>
                                        <div className="font-bold">
                                            Rp {rental.order?.total_cost?.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    <div className="text-xs">
                                        <span className="badge badge-sm badge-ghost">per week x {Math.ceil((new Date(rental.order?.end_date) - new Date(rental.order?.start_date)) / (1000 * 60 * 60 * 24 * 7))} weeks</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Link to={`/rentals/${rental.id}`} className="btn btn-sm btn-info w-full btn-outline gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        View Details
                                    </Link>

                                    {/* Render appropriate actions based on user type */}
                                    {!isAdmin ? renderUserActions(rental) : renderAdminActions(rental)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enhanced pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                    <div className="join shadow-md rounded-full overflow-hidden">
                        <button
                            className="join-item btn btn-sm sm:btn-md"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            «
                        </button>

                        {/* Show fewer page buttons on mobile */}
                        {Array.from({ length: totalPages }, (_, i) => {
                            // On mobile, only show current page and immediate neighbors
                            const isMobile = window.innerWidth < 640;
                            if (isMobile &&
                                !(i === 0 || i === totalPages - 1 ||
                                    Math.abs(i + 1 - currentPage) <= 1)) {
                                return null;
                            }

                            return (
                                <button
                                    key={i}
                                    className={`join-item btn btn-sm sm:btn-md ${currentPage === i + 1 ? 'btn-active' : ''}`}
                                    onClick={() => handlePageChange(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}

                        <button
                            className="join-item btn btn-sm sm:btn-md"
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