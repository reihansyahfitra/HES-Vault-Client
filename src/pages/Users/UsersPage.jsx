import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import imageService from '../../services/imageService';
import Spinner from '../../components/common/Spinner';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

function UsersPage() {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.team?.slug === 'administrator';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    const [userStats, setUserStats] = useState({
        total: 0,
        students: 0,
        staff: 0,
        admin: 0,
        active: 0,
        inactive: 0
    });

    useEffect(() => {
        if (!isAdmin) {
            setError("You don't have permission to access this page");
            setLoading(false);
            return;
        }

        fetchUsers();
    }, [isAdmin, filter, currentPage, search, sortBy, sortOrder]);

    const fetchUsers = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            const queryParams = {
                page: currentPage,
                limit: 10,
                sort: sortBy,
                order: sortOrder
            };

            if (search) {
                queryParams.search = search;
            }

            if (filter !== 'all') {
                queryParams.status = filter;
            }

            // Get all users for statistics
            const allUsersResponse = await api.request('/users?limit=1000');
            if (allUsersResponse.ok && allUsersResponse.data) {
                calculateUserStats(allUsersResponse.data.data || []);
            }

            // Get paginated users
            const response = await api.request(`/users`, 'GET', null, true, queryParams);

            if (response.ok) {
                setUsers(response.data.data || []);

                // Set pagination info
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.totalPages || 1);
                } else {
                    setTotalPages(1);
                }
            } else {
                setError("Failed to load users. Please try again.");
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            setError("Could not connect to the server. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const calculateUserStats = (users) => {
        const stats = {
            total: users.length,
            students: 0,
            staff: 0,
            admin: 0,
            active: 0,
            inactive: 0
        };

        users.forEach(user => {
            // Count by role
            if (user.team?.slug === 'administrator') {
                stats.admin++;
            } else if (user.team?.slug === 'staff') {
                stats.staff++;
            } else {
                stats.students++;
            }

            // Count by status
            if (user.status === 'active') {
                stats.active++;
            } else {
                stats.inactive++;
            }
        });

        setUserStats(stats);
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSortChange = (field) => {
        if (sortBy === field) {
            // Toggle sort order if clicking the same field
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Default to ascending for new sort field
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleUpdateUserStatus = async (userId, newStatus) => {
        if (!window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this user?`)) return;

        try {
            const response = await api.request(`/users/${userId}/status`, 'PUT', {
                status: newStatus
            });

            if (response.ok) {
                toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
                fetchUsers();
            } else {
                toast.error(response.data?.message || `Failed to update user status`);
            }
        } catch (err) {
            console.error('Error updating user status:', err);
            toast.error(`Failed to update user status. Please try again.`);
        }
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

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'badge-success';
            default:
                return 'badge-error';
        }
    };

    // If user is not admin, show access denied
    if (!isAdmin) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Access denied. You do not have permission to view this page.</span>
                </div>
            </div>
        );
    }

    if (loading && !users.length) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 bg-gradient-to-b from-base-200 to-base-100 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">User Management</h1>
                <div className="badge badge-lg badge-outline badge-primary">{userStats.total} Total Users</div>
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

            {/* User Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'all' ? 'ring-2 ring-primary border-primary border' : 'border border-base-300'}`}
                    onClick={() => handleFilterChange('all')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">All Users</div>
                        <div className="stat-value text-3xl text-primary">{userStats.total || 0}</div>
                        <div className="w-full h-1 bg-primary mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'student' ? 'ring-2 ring-info border-info border' : 'border border-base-300'}`}
                    onClick={() => handleFilterChange('student')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Students</div>
                        <div className="stat-value text-3xl text-info">{userStats.students || 0}</div>
                        <div className="w-full h-1 bg-info mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'staff' ? 'ring-2 ring-secondary border-secondary border' : 'border border-base-300'}`}
                    onClick={() => handleFilterChange('staff')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Staff</div>
                        <div className="stat-value text-3xl text-secondary">{userStats.staff || 0}</div>
                        <div className="w-full h-1 bg-secondary mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'admin' ? 'ring-2 ring-accent border-accent border' : 'border border-base-300'}`}
                    onClick={() => handleFilterChange('admin')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Admins</div>
                        <div className="stat-value text-3xl text-accent">{userStats.admin || 0}</div>
                        <div className="w-full h-1 bg-accent mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'active' ? 'ring-2 ring-success border-success border' : 'border border-base-300'}`}
                    onClick={() => handleFilterChange('active')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Active</div>
                        <div className="stat-value text-3xl text-success">{userStats.active || 0}</div>
                        <div className="w-full h-1 bg-success mt-2 rounded-full"></div>
                    </div>
                </div>

                <div
                    className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === 'inactive' ? 'ring-2 ring-error border-error border' : 'border border-base-300'}`}
                    onClick={() => handleFilterChange('inactive')}
                >
                    <div className="card-body p-4 text-center">
                        <div className="stat-title">Inactive</div>
                        <div className="stat-value text-3xl text-error">{userStats.inactive || 0}</div>
                        <div className="w-full h-1 bg-error mt-2 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Search Area */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
                <div className="form-control grow w-full">
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        className="input input-bordered w-full focus:outline-none"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                <button
                    className="btn btn-primary gap-2 shadow-md hover:shadow-lg w-full sm:w-auto"
                    onClick={() => fetchUsers()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Search
                </button>
                <Link to="/users/new" className="btn btn-secondary gap-2 shadow-md hover:shadow-lg w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                    Add User
                </Link>
            </div>

            {users.length === 0 ? (
                <div className="card bg-base-100 shadow-xl p-6 text-center">
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="rounded-full bg-base-200 p-6 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-base-content opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No users found</h2>
                        <p className="text-base-content/70 mb-6">
                            {search ? 'Try adjusting your search or filter criteria' : 'No users have been registered yet'}
                        </p>
                        {search && (
                            <button className="btn btn-primary" onClick={() => {
                                setSearch('');
                                setFilter('all');
                            }}>
                                Clear Filters
                            </button>
                        )}
                        {!search && (
                            <Link to="/users/new" className="btn btn-primary gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                </svg>
                                Add First User
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div className="card bg-base-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto hidden md:block">
                        <table className="table w-full">
                            <thead className="bg-base-200 text-base-content">
                                <tr>
                                    <th
                                        className={`bg-base-200 border-b border-base-300 cursor-pointer ${sortBy === 'name' ? 'text-primary' : ''}`}
                                        onClick={() => handleSortChange('name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            User
                                            {sortBy === 'name' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                                </svg>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className={`bg-base-200 border-b border-base-300 cursor-pointer ${sortBy === 'email' ? 'text-primary' : ''}`}
                                        onClick={() => handleSortChange('email')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Email
                                            {sortBy === 'email' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                                </svg>
                                            )}
                                        </div>
                                    </th>
                                    <th className="bg-base-200 border-b border-base-300">Role</th>
                                    <th
                                        className={`bg-base-200 border-b border-base-300 cursor-pointer ${sortBy === 'createdAt' ? 'text-primary' : ''}`}
                                        onClick={() => handleSortChange('createdAt')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Joined
                                            {sortBy === 'createdAt' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                                </svg>
                                            )}
                                        </div>
                                    </th>
                                    <th className="bg-base-200 border-b border-base-300">Status</th>
                                    <th className="bg-base-200 border-b border-base-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-base-200/50 border-b border-base-200">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="avatar">
                                                    <div className="mask mask-squircle w-10 h-10 overflow-hidden">
                                                        {user.profile_picture ? (
                                                            <img
                                                                src={imageService.getImageUrl(user.profile_picture)}
                                                                alt={user.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.parentNode.innerHTML = `
                                    <div class="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                      ${user.name?.substring(0, 2).toUpperCase() || '??'}
                                    </div>
                                  `;
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                                                {user.name?.substring(0, 2).toUpperCase() || '??'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-bold">{user.name}</div>
                                                    <div className="text-xs opacity-60">ID: {user.identification || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-mono text-sm">{user.email}</div>
                                            <div className="text-xs opacity-60">{user.phone || 'No phone'}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getRoleBadgeClass(user.team?.slug)} badge-sm`}>
                                                {user.team?.name || 'User'}
                                            </span>
                                        </td>
                                        <td>
                                            {user.created_at && format(new Date(user.created_at), 'dd MMM yyyy')}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(user.status)} badge-sm`}>
                                                {user.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/users/${user.id}`}
                                                    className="btn btn-square btn-sm btn-ghost text-primary tooltip tooltip-left"
                                                    data-tip="View Profile"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </Link>
                                                <Link
                                                    to={`/users/${user.id}/edit`}
                                                    className="btn btn-square btn-sm btn-ghost text-secondary tooltip tooltip-left"
                                                    data-tip="Edit User"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </Link>
                                                {user.status === 'active' ? (
                                                    <button
                                                        onClick={() => handleUpdateUserStatus(user.id, 'inactive')}
                                                        className="btn btn-square btn-sm btn-ghost text-error tooltip tooltip-left"
                                                        data-tip="Deactivate User"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleUpdateUserStatus(user.id, 'active')}
                                                        className="btn btn-square btn-sm btn-ghost text-success tooltip tooltip-left"
                                                        data-tip="Activate User"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile view */}
                    <div className="md:hidden">
                        {users.map((user) => (
                            <div key={user.id} className="border-b border-base-200 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="avatar">
                                        <div className="mask mask-squircle w-12 h-12 overflow-hidden">
                                            {user.profile_picture ? (
                                                <img
                                                    src={imageService.getImageUrl(user.profile_picture)}
                                                    alt={user.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.parentNode.innerHTML = `
                              <div class="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                ${user.name?.substring(0, 2).toUpperCase() || '??'}
                              </div>
                            `;
                                                    }}
                                                />
                                            ) : (
                                                <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold">
                                                    {user.name?.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold">{user.name}</div>
                                        <div className="text-sm opacity-70">{user.email}</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <div className="text-xs text-base-content/70">Role</div>
                                        <span className={`badge ${getRoleBadgeClass(user.team?.slug)}`}>
                                            {user.team?.name || 'User'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-xs text-base-content/70">Status</div>
                                        <span className={`badge ${getStatusBadgeClass(user.status)}`}>
                                            {user.status || 'Unknown'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-base-content/70">Joined</div>
                                        <div className="text-sm">
                                            {user.created_at && format(new Date(user.created_at), 'dd MMM yyyy')}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Link
                                            to={`/users/${user.id}`}
                                            className="btn btn-sm btn-primary btn-outline"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            View
                                        </Link>
                                        {user.status === 'active' ? (
                                            <button
                                                onClick={() => handleUpdateUserStatus(user.id, 'inactive')}
                                                className="btn btn-sm btn-error btn-outline"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                                Disable
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleUpdateUserStatus(user.id, 'active')}
                                                className="btn btn-sm btn-success btn-outline"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Enable
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination */}
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

export default UsersPage;