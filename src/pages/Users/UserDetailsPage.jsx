import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

function UserDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.team?.slug === 'administrator';
    const isSelfProfile = currentUser?.id === id;

    const [user, setUser] = useState(null);
    const [userStats, setUserStats] = useState({
        rentalCount: 0,
        activeRentals: 0,
        completedRentals: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                setLoading(true);
                const response = await api.request(`/users/${id}`, 'GET', null, true);
                console.log(response.data);

                if (response.ok) {
                    setUser(response.data);

                    // Fetch user statistics if admin or self profile
                    if (isAdmin || isSelfProfile) {
                        fetchUserStats(response.data.id);
                    }
                } else {
                    setError(response.data?.message || 'Failed to load user details');
                    if (response.status === 404) {
                        toast.error('User not found');
                        setTimeout(() => navigate('/users'), 2000);
                    }
                }
            } catch (err) {
                console.error('Error fetching user details:', err);
                setError('Could not connect to the server. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, [id, isAdmin, isSelfProfile, navigate]);

    const fetchUserStats = async (userId) => {
        try {
            const response = await api.request(`/users/${userId}/stats`, 'GET', null, true);
            if (response.ok) {
                setUserStats(response.data);
            }
        } catch (err) {
            console.error('Error fetching user statistics:', err);
        }
    };

    const handleEditUser = () => {
        navigate(`/users/${id}/edit`);
    };

    const getRoleBadgeClass = (role) => {
        switch (role?.toLowerCase()) {
            case 'administrator':
                return 'badge-primary';
            case 'staff':
                return 'badge-secondary';
            default:
                return 'badge-info';
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

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>User not found</span>
                </div>
            </div>
        );
    }

    const getRentalStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'badge-success';
            case 'returned':
                return 'badge-info';
            case 'cancelled':
                return 'badge-warning';
            case 'rejected':
                return 'badge-error';
            case 'overdue':
                return 'badge-error';
            case 'waiting':
                return 'badge-secondary';
            default:
                return 'badge-ghost';
        }
    };

    return (
        <div className="bg-gradient-to-br from-base-200 via-base-100 to-base-200 min-h-screen py-6 px-4 sm:px-6">
            <div className="container mx-auto max-w-5xl">
                {/* Back button and Breadcrumbs */}
                <div className="flex items-center mb-4">
                    <Link to="/users" className="btn btn-circle btn-sm btn-ghost mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="text-sm breadcrumbs">
                        <ul>
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/users">Users</Link></li>
                            <li className="font-medium">{user.name}</li>
                        </ul>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* User Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-base-200">
                            <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-5 flex justify-center">
                                <div className="avatar">
                                    <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden">
                                        {user.profile_picture ? (
                                            <img
                                                src={imageService.getImageUrl(user.profile_picture)}
                                                alt={user.name}
                                                className="object-cover w-full h-full"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholder-avatar.webp';
                                                }}
                                            />
                                        ) : (
                                            <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center text-2xl font-bold">
                                                {user.name?.substring(0, 2).toUpperCase() || '??'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <h1 className="text-2xl font-bold text-center mb-2">{user.name}</h1>
                                <div className="flex justify-center mb-4">
                                    <span className={`badge ${getRoleBadgeClass(user.team?.slug)} badge-lg`}>
                                        {user.team?.name || 'User'}
                                    </span>
                                </div>

                                <div className="divider my-2"></div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm text-base-content/70">Email</p>
                                            <p className="font-mono">{user.email}</p>
                                        </div>
                                    </div>

                                    {user.phone && (
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm text-base-content/70">Phone</p>
                                                <p className="font-medium">{user.phone}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm text-base-content/70">Joined</p>
                                            <p className="font-medium">
                                                {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {user.updated_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm text-base-content/70">Last Updated</p>
                                                <p className="font-medium">
                                                    {format(new Date(user.updated_at), 'dd MMM yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {(isAdmin || isSelfProfile) && (
                                    <div className="mt-6 space-y-2">
                                        <button
                                            className="btn btn-primary w-full gap-2"
                                            onClick={handleEditUser}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Edit Profile
                                        </button>

                                        {isAdmin && !isSelfProfile && (
                                            <button className="btn btn-outline btn-error w-full gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete Account
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* User Details Area */}
                    <div className="lg:col-span-2">
                        {/* Stats Cards */}
                        {(isAdmin || isSelfProfile) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border border-base-200">
                                    <div className="card-body p-4 text-center">
                                        <div className="stat-title">Total Rentals</div>
                                        <div className="stat-value text-3xl text-primary">{userStats.rentalCount || 0}</div>
                                        <div className="w-full h-1 bg-primary mt-2 rounded-full"></div>
                                    </div>
                                </div>

                                <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border border-base-200">
                                    <div className="card-body p-4 text-center">
                                        <div className="stat-title">Active Rentals</div>
                                        <div className="stat-value text-3xl text-accent">{userStats.activeRentals || 0}</div>
                                        <div className="w-full h-1 bg-accent mt-2 rounded-full"></div>
                                    </div>
                                </div>

                                <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border border-base-200">
                                    <div className="card-body p-4 text-center">
                                        <div className="stat-title">Completed</div>
                                        <div className="stat-value text-3xl text-success">{userStats.completedRentals || 0}</div>
                                        <div className="w-full h-1 bg-success mt-2 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Navigation */}
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="tabs w-full p-1 bg-base-200">
                                <button
                                    className={`tab tab-lifted flex-1 ${activeTab === 'profile' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('profile')}
                                >
                                    Profile Details
                                </button>

                                {(isAdmin || isSelfProfile) && (
                                    <button
                                        className={`tab tab-lifted flex-1 ${activeTab === 'rentals' ? 'tab-active' : ''}`}
                                        onClick={() => setActiveTab('rentals')}
                                    >
                                        Rental History
                                    </button>
                                )}

                                {isAdmin && (
                                    <button
                                        className={`tab tab-lifted flex-1 ${activeTab === 'logs' ? 'tab-active' : ''}`}
                                        onClick={() => setActiveTab('logs')}
                                    >
                                        Activity Logs
                                    </button>
                                )}
                            </div>

                            <div className="p-6">
                                {activeTab === 'profile' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Profile Information
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold">Status</span>
                                                </label>
                                                <div className="p-3 bg-base-200 rounded-md flex items-center gap-2">
                                                    {user.email_verified_at ? (
                                                        <span className="badge badge-info">Verified</span>
                                                    ) : (
                                                        <span className="badge badge-warning">Unverified</span>
                                                    )}
                                                </div>
                                            </div>

                                            {user.bio && (
                                                <div className="form-control md:col-span-2">
                                                    <label className="label">
                                                        <span className="label-text font-semibold">Bio</span>
                                                    </label>
                                                    <div className="p-3 bg-base-200 rounded-md whitespace-pre-wrap">
                                                        {user.bio}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'rentals' && (
                                    <div>
                                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                            Rental History
                                        </h2>

                                        {userStats.rentalCount > 0 ? (
                                            <div className="space-y-4">
                                                {/* Desktop view - only show on medium screens and up */}
                                                <div className="hidden md:block overflow-x-auto">
                                                    <table className="table table-zebra w-full">
                                                        <thead>
                                                            <tr className="bg-base-200">
                                                                <th className="w-1/3">Items</th>
                                                                <th>Start Date</th>
                                                                <th>End Date</th>
                                                                <th>Status</th>
                                                                <th className="w-24">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {user.rent.map((rental) => (
                                                                <tr key={rental.id} className="hover:bg-base-200/50 transition-colors">
                                                                    <td className="max-w-[200px]">
                                                                        {rental.order.products && rental.order.products.length > 0 ? (
                                                                            <div>
                                                                                {rental.order.products.slice(0, 1).map((item, index) => (
                                                                                    <div key={index} className="mb-1">
                                                                                        <div className="border border-base-300 rounded px-2 py-1 text-sm truncate bg-base-100">
                                                                                            {item.product.name}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                                {rental.order.products.length > 1 && (
                                                                                    <span className="text-xs text-base-content/70">
                                                                                        +{rental.order.products.length - 1} more
                                                                                    </span>
                                                                                )}
                                                                                <span className="block text-xs text-base-content/50 mt-1 font-mono">
                                                                                    #{rental.id.substring(0, 6)}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <div>
                                                                                <span className="text-xs text-base-content/50 italic">No items</span>
                                                                                <span className="block text-xs text-base-content/50 mt-1 font-mono">
                                                                                    #{rental.id.substring(0, 6)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td>{format(new Date(rental.order.start_date), 'dd MMM yyyy')}</td>
                                                                    <td>{format(new Date(rental.order.end_date), 'dd MMM yyyy')}</td>
                                                                    <td>
                                                                        <span className={`badge ${getRentalStatusBadgeClass(rental.order.order_status)} capitalize`}>
                                                                            {rental.order.order_status}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <Link
                                                                            to={`/rentals/${rental.id}`}
                                                                            className="btn btn-xs btn-outline btn-primary w-full text-xs"
                                                                        >
                                                                            Details
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Mobile view - only show on small screens */}
                                                <div className="md:hidden space-y-3">
                                                    {user.rent.map((rental) => (
                                                        <div
                                                            key={rental.id}
                                                            className="bg-base-100 border border-base-200 shadow-sm rounded-lg overflow-hidden"
                                                        >
                                                            <Link
                                                                to={`/rentals/${rental.id}`}
                                                                className="block hover:bg-base-200/50 transition-colors"
                                                            >
                                                                <div className="p-4">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="font-mono text-xs text-base-content/70">
                                                                            #{rental.id.substring(0, 8).toUpperCase()}
                                                                        </span>
                                                                        <span className={`badge ${getRentalStatusBadgeClass(rental.order.order_status)}`}>
                                                                            {rental.order.order_status}
                                                                        </span>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                                                        <div>
                                                                            <p className="text-xs text-base-content/60">Start Date</p>
                                                                            <p className="font-medium">{format(new Date(rental.order.start_date), 'dd MMM yyyy')}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs text-base-content/60">End Date</p>
                                                                            <p className="font-medium">{format(new Date(rental.order.end_date), 'dd MMM yyyy')}</p>
                                                                        </div>
                                                                    </div>

                                                                    {rental.order.products && rental.order.products.length > 0 && (
                                                                        <div className="mt-3">
                                                                            <p className="text-xs text-base-content/60 mb-1">Items</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {rental.order.products.slice(0, 2).map((item, index) => (
                                                                                    <span key={index} className="badge badge-outline badge-sm">
                                                                                        {item.product.name}
                                                                                    </span>
                                                                                ))}
                                                                                {rental.order.products.length > 2 && (
                                                                                    <span className="badge badge-outline badge-sm">
                                                                                        +{rental.order.products.length - 2} more
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="mt-3 flex justify-end">
                                                                        <button className="btn btn-xs btn-primary btn-outline gap-1">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                                            </svg>
                                                                            View Details
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-base-200/30 rounded-lg p-8 text-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-base-content/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                                <p className="text-base-content/70 text-lg">No rental history found for this user</p>
                                                {isAdmin && (
                                                    <Link to="/rentals/new" className="btn btn-outline btn-primary btn-sm mt-4">
                                                        Create New Rental
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'logs' && (
                                    <div>
                                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Activity Logs
                                        </h2>

                                        {/* Activity logs would go here */}
                                        <div className="text-center py-6 text-base-content/70">
                                            <p>No activity logs available</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserDetailsPage;