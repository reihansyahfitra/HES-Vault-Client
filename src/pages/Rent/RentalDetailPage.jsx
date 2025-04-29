import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

function RentalDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rental, setRental] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const isAdmin = user?.team?.slug === 'administrator';

    useEffect(() => {
        fetchRentalDetails();
    }, [id]);

    const fetchRentalDetails = async () => {
        try {
            setLoading(true);
            const response = await api.getRentalById(id);

            if (response.ok) {
                setRental(response.data);
            } else {
                setError(response.data?.message || "Failed to load rental details.");
                if (response.status === 404) {
                    toast.error("Rental not found");
                    setTimeout(() => navigate('/rentals'), 2000);
                }
            }
        } catch (err) {
            console.error('Error fetching rental details:', err);
            setError("Could not connect to the server. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentUpload = async (docType, file) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('File too large. Maximum size is 5MB.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${api.baseUrl}/images/rent/${id}/${docType}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api.getToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`${docType === 'before' ? 'Before' : 'After'} documentation uploaded successfully`);
                fetchRentalDetails();
            } else {
                toast.error(data.message || `Failed to upload ${docType} documentation`);
            }
        } catch (err) {
            console.error(`Error uploading ${docType} documentation:`, err);
            toast.error(`Failed to upload ${docType} documentation`);
        } finally {
            setUploading(false);
        }
    };

    const handleCancelRental = async () => {
        if (!window.confirm('Are you sure you want to cancel this rental request?')) return;

        try {
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
                toast.success('Rental has been cancelled');
                fetchRentalDetails();
            } else {
                toast.error(response.data?.message || 'Failed to cancel rental');
            }
        } catch (err) {
            console.error('Error cancelling rental:', err);
            toast.error('Failed to cancel rental. Please try again.');
        }
    };

    const handleUpdateRentalStatus = async (newStatus, type = 'order') => {
        if (!window.confirm(`Are you sure you want to mark this rental as ${newStatus.toLowerCase()}?`)) return;

        try {
            // IMPORTANT: The issue is you need to send the request to /orders endpoint, not /rent
            // You're currently trying to update "order" status but using the rent ID and route
            const orderId = rental.order?.id;

            if (!orderId) {
                toast.error("Order ID not found");
                return;
            }

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
                fetchRentalDetails();
            } else {
                // Try to parse error response
                try {
                    const errorData = await response.json();
                    toast.error(errorData.message || `Failed to update rental ${type} status`);
                } catch (parseErr) {
                    // If parsing fails (non-JSON response)
                    toast.error(`Failed to update rental ${type} status (${response.status})`);
                }
            }
        } catch (err) {
            console.error('Error updating rental status:', err);
            toast.error(`Failed to update rental ${type} status. Please try again.`);
        }
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

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    // Extract relevant data
    const { order } = rental || {};
    const orderStatus = order?.order_status?.toUpperCase() || '';
    const paymentStatus = order?.payment_status?.toUpperCase() || '';
    const startDate = order?.start_date ? new Date(order.start_date) : null;
    const endDate = order?.end_date ? new Date(order.end_date) : null;
    const rentalDays = startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 0;
    const rentalWeeks = Math.ceil(rentalDays / 7);

    return (
        <div className="bg-gradient-to-br from-base-200 via-base-100 to-base-200 min-h-screen py-6 px-4 sm:px-6">
            <div className="container mx-auto max-w-7xl">
                <div className="mb-6">
                    <Link to="/rentals" className="btn btn-ghost btn-sm gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Rentals
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl shadow-lg p-6 mb-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-2xl md:text-3xl font-bold text-primary">Rental #{rental.id.substring(0, 8).toUpperCase()}</h1>
                                            {orderStatus === 'OVERDUE' && (
                                                <div className="animate-pulse">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-base-content/70">{order?.invoice || 'No Invoice'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`badge ${getStatusBadgeClass(orderStatus)} badge-lg px-4 py-3 text-white`}>
                                            {orderStatus || 'Unknown'}
                                        </span>
                                        <span className={`badge ${getPaymentBadgeClass(paymentStatus)} badge-md`}>
                                            {paymentStatus || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="divider">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-bold text-lg">Rental Information</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="card bg-base-100 shadow-sm border border-base-200">
                                    <div className="card-body p-4">
                                        <h3 className="card-title text-base flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Dates
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div className="bg-base-200/50 p-3 rounded-lg">
                                                <p className="text-sm text-base-content/70">Start Date</p>
                                                <p className="font-medium text-lg">
                                                    {startDate ? format(startDate, 'dd MMM yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-base-200/50 p-3 rounded-lg">
                                                <p className="text-sm text-base-content/70">End Date</p>
                                                <p className="font-medium text-lg">
                                                    {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="badge badge-primary">{rentalWeeks} week{rentalWeeks !== 1 ? 's' : ''}</div>
                                            <div className="badge badge-ghost">{rentalDays} days</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card bg-base-100 shadow-sm border border-base-200">
                                    <div className="card-body p-4">
                                        <h3 className="card-title text-base flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Contact
                                        </h3>
                                        <div className="mt-2 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-base-content/70">ID Number</p>
                                                    <p className="font-mono font-medium">{rental.identification}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-base-content/70">Phone</p>
                                                    <p className="font-medium">{rental.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {rental.notes && (
                                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-amber-100 p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-full bg-amber-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-amber-800 mb-1">Notes</h3>
                                            <p className="text-amber-700">
                                                {rental.notes}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="divider">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    <span className="font-bold text-lg">Rented Items</span>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-base-200">
                                <table className="table table-zebra w-full">
                                    <thead className="bg-base-200">
                                        <tr>
                                            <th className="bg-primary/5">Item</th>
                                            <th className="bg-primary/5 text-center">Quantity</th>
                                            <th className="bg-primary/5 text-right">Price/week</th>
                                            <th className="bg-primary/5 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order?.products?.map((item, index) => (
                                            <tr key={item.id} className={index % 2 === 0 ? 'hover:bg-primary/5' : 'hover:bg-secondary/5'}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        {item.product.product_picture ? (
                                                            <div className="avatar">
                                                                <div className="mask mask-squircle w-12 h-12 bg-base-200 p-1">
                                                                    <img
                                                                        src={imageService.getImageUrl(item.product.product_picture)}
                                                                        alt={item.product.name}
                                                                        className="object-contain"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = '/placeholder.webp';
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="avatar placeholder">
                                                                <div className="mask mask-squircle w-12 h-12 bg-neutral-content text-base-300 flex items-center justify-center">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <Link to={`/products/${item.product.id}`} className="font-medium hover:text-primary transition-colors">
                                                                {item.product.name}
                                                            </Link>
                                                            <div className="text-xs opacity-70 flex items-center gap-1">
                                                                <span className="badge badge-xs badge-ghost">{item.product.brand}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge badge-lg">{item.quantity}</span>
                                                </td>
                                                <td className="text-right font-mono">Rp {item.price.toLocaleString('id-ID')}</td>
                                                <td className="text-right font-mono font-semibold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-base-200">
                                            <td colSpan="3" className="text-right font-medium bg-base-100">Weekly Total:</td>
                                            <td className="text-right font-mono font-semibold bg-base-100">
                                                Rp {(order?.products?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                        <tr className="bg-primary/10">
                                            <td colSpan="3" className="text-right font-bold">Total for {rentalWeeks} weeks:</td>
                                            <td className="text-right font-mono text-lg font-bold text-primary">
                                                Rp {order?.total_cost?.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6 mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <h2 className="text-lg font-bold">Documentation</h2>
                                </div>
                                {(orderStatus === 'ACTIVE' || orderStatus === 'ONRENT') && (
                                    <div className="badge badge-success gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Documentation Required
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="card bg-base-100 shadow-md overflow-hidden border border-base-200 hover:shadow-lg transition-shadow">
                                    <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 p-3">
                                        <h2 className="card-title text-base flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                            </svg>
                                            Identification
                                        </h2>
                                    </div>
                                    <div className="card-body p-3 relative">
                                        <div className="h-48 bg-base-200/50 rounded-lg flex items-center justify-center overflow-hidden">
                                            {rental.identification_picture ? (
                                                <>
                                                    <img
                                                        src={imageService.getImageUrl(rental.identification_picture)}
                                                        alt="Identification"
                                                        className="max-h-full max-w-full object-contain"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/placeholder.webp';
                                                        }}
                                                    />
                                                    <div className="absolute top-2 right-2">
                                                        <div className="badge badge-success">Submitted</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center p-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                    </svg>
                                                    <span className="text-base-content/60">No identification provided</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="card bg-base-100 shadow-md overflow-hidden border border-base-200 hover:shadow-lg transition-shadow">
                                    <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 p-3">
                                        <h2 className="card-title text-base flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                            Before Rental
                                        </h2>
                                    </div>
                                    <div className="card-body p-3 relative">
                                        <div className="h-48 bg-base-200/50 rounded-lg flex items-center justify-center overflow-hidden">
                                            {rental.documentation_before ? (
                                                <>
                                                    <img
                                                        src={imageService.getImageUrl(rental.documentation_before)}
                                                        alt="Before Documentation"
                                                        className="max-h-full max-w-full object-contain"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/placeholder.webp';
                                                        }}
                                                    />
                                                    <div className="absolute top-2 right-2">
                                                        <div className="badge badge-success">Submitted</div>
                                                    </div>
                                                    {/* Allow re-uploading with a button overlay */}
                                                    {(orderStatus === 'APPROVED' || orderStatus === 'ACTIVE' || orderStatus === 'ONRENT') &&
                                                        (paymentStatus === 'PAID' || isAdmin) && (
                                                            <div className="absolute bottom-0 left-0 right-0 bg-base-300/80 p-2 flex justify-center">
                                                                <label className="btn btn-xs btn-primary gap-1">
                                                                    {uploading ? (
                                                                        <span className="loading loading-spinner loading-xs"></span>
                                                                    ) : (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                            </svg>
                                                                            Replace
                                                                        </>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={(e) => handleDocumentUpload('before', e.target.files[0])}
                                                                        disabled={uploading}
                                                                    />
                                                                </label>
                                                            </div>
                                                        )}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center p-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="text-base-content/60 mb-2">No before image provided</span>
                                                    {/* Show upload button if approved/active and paid (or for admin) */}
                                                    {(orderStatus === 'APPROVED' || orderStatus === 'ACTIVE' || orderStatus === 'ONRENT') &&
                                                        (paymentStatus === 'PAID' || isAdmin) && (
                                                            <label className="btn btn-primary btn-sm gap-2 animate-pulse">
                                                                {uploading ? (
                                                                    <span className="loading loading-spinner loading-xs"></span>
                                                                ) : (
                                                                    <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                        </svg>
                                                                        Upload Image
                                                                    </>
                                                                )}
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleDocumentUpload('before', e.target.files[0])}
                                                                    disabled={uploading}
                                                                />
                                                            </label>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="card bg-base-100 shadow-md overflow-hidden border border-base-200 hover:shadow-lg transition-shadow">
                                    <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 p-3">
                                        <h2 className="card-title text-base flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                            </svg>
                                            After Return
                                        </h2>
                                    </div>
                                    <div className="card-body p-3 relative">
                                        <div className="h-48 bg-base-200/50 rounded-lg flex items-center justify-center overflow-hidden">
                                            {rental.documentation_after ? (
                                                <>
                                                    <img
                                                        src={imageService.getImageUrl(rental.documentation_after)}
                                                        alt="After Documentation"
                                                        className="max-h-full max-w-full object-contain"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/placeholder.webp';
                                                        }}
                                                    />
                                                    <div className="absolute top-2 right-2">
                                                        <div className="badge badge-success">Submitted</div>
                                                    </div>
                                                    {/* Allow re-uploading with a button overlay */}
                                                    {(orderStatus === 'APPROVED' || orderStatus === 'ACTIVE' || orderStatus === 'ONRENT' ||
                                                        orderStatus === 'OVERDUE') && (paymentStatus === 'PAID' || isAdmin) && (
                                                            <div className="absolute bottom-0 left-0 right-0 bg-base-300/80 p-2 flex justify-center">
                                                                <label className="btn btn-xs btn-primary gap-1">
                                                                    {uploading ? (
                                                                        <span className="loading loading-spinner loading-xs"></span>
                                                                    ) : (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                            </svg>
                                                                            Replace
                                                                        </>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={(e) => handleDocumentUpload('after', e.target.files[0])}
                                                                        disabled={uploading}
                                                                    />
                                                                </label>
                                                            </div>
                                                        )}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center p-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="text-base-content/60 mb-2">No after image provided</span>
                                                    {/* Show upload button for valid statuses */}
                                                    {(orderStatus === 'APPROVED' || orderStatus === 'ACTIVE' || orderStatus === 'ONRENT' ||
                                                        orderStatus === 'OVERDUE') && (paymentStatus === 'PAID' || isAdmin) && (
                                                            <label className="btn btn-primary btn-sm gap-2">
                                                                {uploading ? (
                                                                    <span className="loading loading-spinner loading-xs"></span>
                                                                ) : (
                                                                    <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                        </svg>
                                                                        Upload Image
                                                                    </>
                                                                )}
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleDocumentUpload('after', e.target.files[0])}
                                                                    disabled={uploading}
                                                                />
                                                            </label>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-lg sticky top-24 overflow-hidden border border-base-200">
                            <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Actions
                                </h2>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Regular user actions */}
                                {!isAdmin && (
                                    <>
                                        {/* Show cancel button for both WAITING and APPROVED status */}
                                        {((orderStatus === 'WAITING' || orderStatus === 'APPROVED') && paymentStatus !== 'PAID') && (
                                            <button
                                                className="btn btn-error btn-block gap-2 shadow-md hover:shadow-lg transition-shadow"
                                                onClick={handleCancelRental}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Cancel {orderStatus === 'WAITING' ? 'Request' : 'Rental'}
                                            </button>
                                        )}

                                        {/* Keep other existing buttons */}
                                        {orderStatus === 'APPROVED' && paymentStatus === 'UNPAID' && (
                                            <button className="btn btn-primary btn-block gap-2 shadow-md hover:shadow-lg transition-shadow animate-pulse">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                Pay Now
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* Admin-only actions */}
                                {isAdmin && (
                                    <div className="space-y-3">
                                        {orderStatus === 'WAITING' && (
                                            <div className="grid grid-cols-1 gap-3">
                                                <button
                                                    className="btn btn-success btn-block gap-2 shadow-md hover:shadow-lg transition-shadow"
                                                    onClick={() => handleUpdateRentalStatus('APPROVED')}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Approve Rental
                                                </button>
                                                <button
                                                    className="btn btn-error btn-block gap-2 shadow-md hover:shadow-lg transition-shadow"
                                                    onClick={() => handleUpdateRentalStatus('REJECTED')}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Reject Rental
                                                </button>
                                            </div>
                                        )}

                                        {orderStatus === 'APPROVED' && paymentStatus === 'PAID' && (
                                            <button
                                                className="btn btn-accent btn-block gap-2 shadow-md hover:shadow-lg transition-shadow"
                                                onClick={() => handleUpdateRentalStatus('ONRENT')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Start Rental
                                            </button>
                                        )}

                                        {(orderStatus === 'ACTIVE' || orderStatus === 'ONRENT' || orderStatus === 'OVERDUE') && (
                                            <button
                                                className="btn btn-success btn-block gap-2 shadow-md hover:shadow-lg transition-shadow"
                                                onClick={() => handleUpdateRentalStatus('RETURNED')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                Complete Return
                                            </button>
                                        )}

                                        {orderStatus === 'APPROVED' && paymentStatus === 'UNPAID' && (
                                            <button
                                                className="btn btn-primary btn-block gap-2 shadow-md hover:shadow-lg transition-shadow"
                                                onClick={() => handleUpdateRentalStatus('PAID', 'payment')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                Mark as Paid
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-base-300"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <div className="px-4 py-1.5 flex items-center gap-2 transform hover:scale-105 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span className="font-semibold">User Information</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-base-100 p-3 rounded-lg border border-base-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="avatar">
                                            {rental.user?.profile_picture ? (
                                                <div className="w-14 h-14 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
                                                    <img
                                                        src={imageService.getImageUrl(rental.user.profile_picture)}
                                                        alt={rental.user?.name}
                                                        className="object-cover w-full h-full"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/placeholder-avatar.webp';
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary">
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <div className="font-bold text-xl text-white select-none" style={{
                                                            lineHeight: 0,
                                                            paddingBottom: '2px'
                                                        }}>
                                                            {rental.user?.name?.substring(0, 2).toUpperCase() || "??"}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold">{rental.user?.name}</div>
                                            <div className="text-sm opacity-70">{rental.user?.email}</div>
                                            <div className="mt-1">
                                                {console.log(rental)}
                                                <div className="badge badge-xs badge-ghost">{rental.user?.team?.name || 'User'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-base-200/50 p-2 rounded-md">
                                            <div className="text-xs text-base-content/60">Created At</div>
                                            <div className="text-sm font-medium">
                                                {rental.order.order_date ? format(new Date(rental.order.order_date), 'dd MMM yyyy, HH:mm') : 'N/A'}
                                            </div>
                                        </div>

                                        {rental.order?.return_date && (
                                            <div className="bg-base-200/50 p-2 rounded-md">
                                                <div className="text-xs text-base-content/60">Returned On</div>
                                                <div className="text-sm font-medium">
                                                    {format(new Date(rental.order.return_date), 'dd MMM yyyy')}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isAdmin && (
                                        <div className="mt-4">
                                            <Link to={`/users/${rental.user?.id}`} className="btn btn-outline btn-primary btn-block btn-sm gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                View User Profile
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RentalDetailPage;