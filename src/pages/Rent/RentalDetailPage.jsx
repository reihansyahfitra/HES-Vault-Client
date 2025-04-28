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
            const response = await api.cancelRental(id);
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
            const response = await api.updateRentalStatus(id, newStatus, type);
            if (response.ok) {
                toast.success(`Rental ${type === 'payment' ? 'payment ' : ''}status updated to ${newStatus.toLowerCase()}`);
                fetchRentalDetails();
            } else {
                toast.error(response.data?.message || `Failed to update rental ${type} status`);
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
        <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
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
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-bold">Rental #{rental.id.substring(0, 8).toUpperCase()}</h1>
                                <p className="text-gray-600">{order?.invoice || 'No Invoice'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`badge ${getStatusBadgeClass(orderStatus)} badge-lg`}>
                                    {orderStatus || 'Unknown'}
                                </span>
                                <span className={`badge ${getPaymentBadgeClass(paymentStatus)} badge-md`}>
                                    {paymentStatus || 'Unknown'}
                                </span>
                            </div>
                        </div>

                        <div className="divider">Rental Information</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-700">Dates</h3>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <p className="text-sm text-gray-500">Start Date</p>
                                        <p className="font-medium">
                                            {startDate ? format(startDate, 'dd MMM yyyy') : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">End Date</p>
                                        <p className="font-medium">
                                            {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm mt-1">
                                    Duration: {rentalWeeks} week{rentalWeeks !== 1 ? 's' : ''} ({rentalDays} days)
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-700">Contact</h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">ID Number</p>
                                    <p className="font-medium">{rental.identification}</p>
                                </div>
                                <div className="mt-1">
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-medium">{rental.phone}</p>
                                </div>
                            </div>
                        </div>

                        {rental.notes && (
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700">Notes</h3>
                                <p className="mt-1 text-gray-600 text-sm border-l-4 border-gray-200 pl-3 py-1">
                                    {rental.notes}
                                </p>
                            </div>
                        )}

                        <div className="divider">Rented Items</div>

                        <div className="overflow-x-auto">
                            <table className="table table-compact w-full">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Quantity</th>
                                        <th className="text-right">Price/week</th>
                                        <th className="text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order?.products?.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {item.product.product_picture && (
                                                        <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center p-1">
                                                            <img
                                                                src={imageService.getImageUrl(item.product.product_picture)}
                                                                alt={item.product.name}
                                                                className="max-h-full max-w-full object-contain"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = '/placeholder.webp';
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Link to={`/products/${item.product.id}`} className="font-medium hover:underline">
                                                            {item.product.name}
                                                        </Link>
                                                        <p className="text-xs text-gray-500">{item.product.brand}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{item.quantity}</td>
                                            <td className="text-right">Rp {item.price.toLocaleString('id-ID')}</td>
                                            <td className="text-right">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="3" className="text-right font-semibold">Weekly Total:</td>
                                        <td className="text-right font-semibold">
                                            Rp {(order?.products?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="3" className="text-right font-semibold">Total for {rentalWeeks} weeks:</td>
                                        <td className="text-right font-bold text-primary">
                                            Rp {order?.total_cost?.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-bold mb-4">Documentation</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="card bg-base-100">
                                <div className="card-body p-4">
                                    <h2 className="card-title text-base">Identification</h2>
                                    <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                        {rental.identification_picture ? (
                                            <img
                                                src={imageService.getImageUrl(rental.identification_picture)}
                                                alt="Identification"
                                                className="max-h-full object-contain"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholder.webp';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-gray-400">No image</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-base-100">
                                <div className="card-body p-4">
                                    <h2 className="card-title text-base">Before Documentation</h2>
                                    <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                                        {rental.documentation_before ? (
                                            <img
                                                src={imageService.getImageUrl(rental.documentation_before)}
                                                alt="Before Documentation"
                                                className="max-h-full object-contain"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholder.webp';
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-gray-400 block mb-2">No image</span>
                                                {(orderStatus === 'ACTIVE' || orderStatus === 'ONRENT') && !rental.documentation_before && !isAdmin && (
                                                    <div className="form-control w-full">
                                                        <label className="btn btn-xs btn-primary">
                                                            {uploading ? (
                                                                <span className="loading loading-spinner loading-xs"></span>
                                                            ) : (
                                                                'Upload Image'
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
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-base-100">
                                <div className="card-body p-4">
                                    <h2 className="card-title text-base">After Documentation</h2>
                                    <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                        {rental.documentation_after ? (
                                            <img
                                                src={imageService.getImageUrl(rental.documentation_after)}
                                                alt="After Documentation"
                                                className="max-h-full object-contain"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholder.webp';
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-gray-400 block mb-2">No image</span>
                                                {(orderStatus === 'ACTIVE' || orderStatus === 'ONRENT' || orderStatus === 'OVERDUE') &&
                                                    rental.documentation_before &&
                                                    !rental.documentation_after &&
                                                    !isAdmin && (
                                                        <div className="form-control w-full">
                                                            <label className="btn btn-xs btn-primary">
                                                                {uploading ? (
                                                                    <span className="loading loading-spinner loading-xs"></span>
                                                                ) : (
                                                                    'Upload Image'
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
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                        <h2 className="text-lg font-bold mb-4">Actions</h2>

                        <div className="space-y-4">
                            {/* Regular user actions */}
                            {!isAdmin && (
                                <>
                                    {orderStatus === 'WAITING' && (
                                        <button
                                            className="btn btn-error btn-block"
                                            onClick={handleCancelRental}
                                        >
                                            Cancel Request
                                        </button>
                                    )}

                                    {orderStatus === 'APPROVED' && paymentStatus === 'UNPAID' && (
                                        <button className="btn btn-primary btn-block">
                                            Pay Now
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Admin-only actions */}
                            {isAdmin && (
                                <>
                                    {orderStatus === 'WAITING' && (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleUpdateRentalStatus('APPROVED')}
                                            >
                                                Approve Rental
                                            </button>
                                            <button
                                                className="btn btn-error"
                                                onClick={() => handleUpdateRentalStatus('REJECTED')}
                                            >
                                                Reject Rental
                                            </button>
                                        </div>
                                    )}

                                    {orderStatus === 'APPROVED' && paymentStatus === 'PAID' && (
                                        <button
                                            className="btn btn-success btn-block"
                                            onClick={() => handleUpdateRentalStatus('ONRENT')}
                                        >
                                            Mark as On Rent
                                        </button>
                                    )}

                                    {(orderStatus === 'ACTIVE' || orderStatus === 'ONRENT' || orderStatus === 'OVERDUE') && (
                                        <button
                                            className="btn btn-success btn-block"
                                            onClick={() => handleUpdateRentalStatus('RETURNED')}
                                        >
                                            Mark as Returned
                                        </button>
                                    )}

                                    {orderStatus === 'APPROVED' && paymentStatus === 'UNPAID' && (
                                        <button
                                            className="btn btn-success btn-block"
                                            onClick={() => handleUpdateRentalStatus('PAID', 'payment')}
                                        >
                                            Mark as Paid
                                        </button>
                                    )}
                                </>
                            )}

                            <div className="divider">User Information</div>

                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="avatar placeholder">
                                        <div className="bg-neutral text-neutral-content rounded-full w-12">
                                            <span>{rental.user?.name?.substring(0, 2).toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold">{rental.user?.name}</div>
                                        <div className="text-sm opacity-70">{rental.user?.email}</div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="stat-title">Created At</div>
                                    <div className="text-sm">
                                        {rental.created_at ? format(new Date(rental.created_at), 'dd MMM yyyy, HH:mm') : 'N/A'}
                                    </div>
                                </div>

                                {rental.order?.return_date && (
                                    <div className="mt-2">
                                        <div className="stat-title">Returned On</div>
                                        <div className="text-sm">
                                            {format(new Date(rental.order.return_date), 'dd MMM yyyy')}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <Link to={`/users/${rental.user?.id}`} className="btn btn-outline btn-block btn-sm mt-2">
                                    View User Profile
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RentalDetailPage;