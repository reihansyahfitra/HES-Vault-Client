import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';

function RentFormPage() {
    const { user } = useAuth();
    const { cartItems, cartCount, loading: cartLoading } = useCart();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const [identification, setIdentification] = useState(user?.identification || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [notes, setNotes] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [idDocument, setIdDocument] = useState(null);
    const [idDocumentPreview, setIdDocumentPreview] = useState('');
    const [rentalDuration, setRentalDuration] = useState(1); // Default: 1 week

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minStartDate = new Date(today);
    minStartDate.setDate(today.getDate() + 2); // Start date must be at least tomorrow

    useEffect(() => {
        const defaultStartDate = new Date(minStartDate);
        const defaultEndDate = new Date(defaultStartDate);
        defaultEndDate.setDate(defaultStartDate.getDate() + 7); // 1 week default

        setStartDate(defaultStartDate.toISOString().split('T')[0]);
        setEndDate(defaultEndDate.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (startDate) {
            const start = new Date(startDate);
            const end = new Date(start);
            end.setDate(start.getDate() + (rentalDuration * 7)); // Rental duration in weeks
            setEndDate(end.toISOString().split('T')[0]);
        }
    }, [startDate, rentalDuration]);

    const handleIdDocumentChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('File too large. Maximum size is 5MB.');
            return;
        }

        setIdDocument(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setIdDocumentPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const calculateTotalCost = () => {
        const weeklyTotal = cartItems.reduce((total, item) =>
            total + (item.product.price * item.quantity), 0);
        return weeklyTotal * rentalDuration;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (cartItems.length === 0) {
            toast.error('Your cart is empty. Please add items before creating a rent.');
            navigate('/cart');
            return;
        }

        if (!idDocument) {
            toast.error('Student ID/Identification document is required');
            return;
        }

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const minDate = new Date();
        minDate.setHours(0, 0, 0, 0);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            toast.error('Please select valid dates');
            return;
        }

        if (start < minDate) {
            toast.error('Start date cannot be in the past');
            return;
        }

        if (end <= start) {
            toast.error('End date must be after start date');
            return;
        }

        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
            toast.error('Minimum rental period is one week');
            return;
        }

        try {
            setLoading(true);

            // First upload ID document
            if (!idDocument) {
                toast.error('Please select an identification document');
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('image', idDocument);

            const tempRentId = 'temp-' + Date.now();
            const uploadResponse = await fetch(`${api.baseUrl}/images/rent/${tempRentId}/identification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api.getToken()}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                toast.error(errorData?.message || 'Failed to upload identification document');
                setLoading(false);
                return;
            }

            const uploadData = await uploadResponse.json();
            const idPicturePath = uploadData.imagePath;

            // Get cart id
            const cartResponse = await api.getCart();
            if (!cartResponse.ok) {
                toast.error('Failed to retrieve your cart details');
                return;
            }

            const cartId = cartResponse.data.cart.id;

            // Submit rent request
            const rentData = {
                identification,
                phone,
                notes,
                cart_id: cartId,
                startDate: startDate,
                endDate: endDate,
                identification_picture: idPicturePath
            };

            const rentResponse = await fetch(`${api.baseUrl}/rent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.getToken()}`
                },
                body: JSON.stringify(rentData)
            });

            if (rentResponse.ok) {
                // Update document path with actual rent ID if needed
                if (rentResponse.data && rentResponse.data.rent && rentResponse.data.rent.id) {
                    const rentId = rentResponse.data.rent.id;
                    await api.updateRentDocumentPath(idPicturePath, rentId, 'identification');
                }

                toast.success('Your rental request has been submitted');
                navigate('/rentals', { state: { success: true } });
            } else {
                toast.error(rentResponse.data?.message || 'Failed to create rental');
            }
        } catch (err) {
            console.error('Error creating rent:', err);
            setError('An unexpected error occurred. Please try again.');
            toast.error('Failed to create rental');
        } finally {
            setLoading(false);
        }
    };

    if (cartLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <div className="flex flex-col items-center justify-center py-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
                        <p className="text-gray-500 mb-4">You need to add items to your cart before creating a rental.</p>
                        <Link to="/products" className="btn btn-primary">
                            Browse Products
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
            <div className="flex items-center mb-6">
                <Link to="/cart" className="btn btn-circle btn-sm btn-ghost mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-2xl font-bold">Complete Your Rental</h1>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rental Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">Rental Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Student/Staff ID</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full focus:outline-none"
                                    value={identification}
                                    onChange={(e) => setIdentification(e.target.value)}
                                    placeholder="Enter your student/staff ID"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Phone Number</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full focus:outline-none"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control mb-6">
                            <label className="label">
                                <span className="label-text">ID Card/Student Card</span>
                                <span className="label-text text-red-500">*required</span>
                            </label>
                            <input
                                type="file"
                                className="file-input file-input-bordered w-full focus:outline-none"
                                accept="image/*"
                                onChange={handleIdDocumentChange}
                                required
                            />
                            {idDocumentPreview && (
                                <div className="mt-2">
                                    <img
                                        src={idDocumentPreview}
                                        alt="ID Document Preview"
                                        className="h-40 object-contain border rounded"
                                    />
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Upload a clear image of your student ID or other identification document
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Start Date</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full focus:outline-none"
                                    value={startDate}
                                    min={minStartDate.toISOString().split('T')[0]}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Duration</span>
                                </label>
                                <select
                                    className="select select-bordered w-full focus:outline-none"
                                    value={rentalDuration}
                                    onChange={(e) => setRentalDuration(parseInt(e.target.value))}
                                    required
                                >
                                    <option value="1">1 week</option>
                                    <option value="2">2 weeks</option>
                                    <option value="3">3 weeks</option>
                                    <option value="4">4 weeks</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">End Date</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full focus:outline-none"
                                    value={endDate}
                                    min={startDate}
                                    readOnly
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    End date is calculated based on duration
                                </p>
                            </div>
                        </div>

                        <div className="form-control mb-6">
                            <label className="label">
                                <span className="label-text">Notes/Purpose</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered w-full h-24 focus:outline-none"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Describe what you'll be using the items for (e.g., class project, research, personal project)"
                            ></textarea>
                        </div>

                        <div className="card bg-base-200 p-4 mb-6">
                            <h3 className="font-semibold mb-2">Items to be Rented</h3>
                            <div className="overflow-x-auto">
                                <table className="table table-compact w-full">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th className="text-right">Qty</th>
                                            <th className="text-right">Price/week</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cartItems.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.product.name}</td>
                                                <td className="text-right">{item.quantity}</td>
                                                <td className="text-right">Rp {item.product.price.toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6 sticky top-24">
                        <h2 className="text-lg font-semibold mb-4">Rental Summary</h2>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span>Items</span>
                                <span>{cartCount}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span>Duration</span>
                                <span>{rentalDuration} week{rentalDuration > 1 ? 's' : ''}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span>Weekly Total</span>
                                <span>Rp {cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0).toLocaleString('id-ID')}</span>
                            </div>

                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Total Cost</span>
                                <span>Rp {calculateTotalCost().toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="loading loading-spinner loading-xs mr-2"></span>
                                    Processing...
                                </>
                            ) : (
                                'Submit Rental Request'
                            )}
                        </button>

                        <div className="mt-4 text-xs text-gray-500">
                            <p className="mb-1">* By submitting this request, you agree to follow the HES Lab rental policies.</p>
                            <p className="mb-1">* Your rental will need to be approved by an administrator.</p>
                            <p>* The requested items will be reserved for you once approved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RentFormPage;