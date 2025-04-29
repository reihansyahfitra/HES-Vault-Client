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
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [teams, setTeams] = useState([]);

    const [userStats, setUserStats] = useState({
        total: 0,
        teamCounts: {}
    });

    useEffect(() => {
        if (!isAdmin) {
            setError("You don't have permission to access this page");
            setLoading(false);
            return;
        }

        // Fetch teams on initial load
        fetchTeams();
        // Fetch user stats on initial load
        fetchUserStats();

    }, [isAdmin]); // Only run this effect once on component mount

    // Fix 5: Keep the existing useEffect for fetching users when filters change
    useEffect(() => {
        if (!isAdmin) return;

        console.log(`Fetching users for page ${currentPage}, filter: ${filter}`);
        fetchUsers();
    }, [isAdmin, filter, currentPage, search, sortBy, sortOrder]);

    const fetchTeams = async () => {
        try {
            const response = await api.request('/teams', 'GET', null, true);
            console.log(response.data.data);
            if (response.ok) {
                setTeams(response.data.data || []);

                // Create team stats for all teams, even ones with 0 users
                const teamCounts = { ...userStats.teamCounts };

                // Ensure all teams are represented in userStats
                response.data.data.forEach(team => {
                    if (!teamCounts[team.slug]) {
                        teamCounts[team.slug] = {
                            count: 0,
                            name: team.name,
                            color: getTeamColor(team.slug)
                        };
                    } else if (!teamCounts[team.slug].color) {
                        // Add color if missing
                        teamCounts[team.slug].color = getTeamColor(team.slug);
                    }
                });

                setUserStats(prev => ({
                    ...prev,
                    teamCounts
                }));
            }
        } catch (err) {
            console.error('Error fetching teams:', err);
        }
    };

    const fetchUsers = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            const filterParams = {
                page: currentPage,
                limit: 10,
                search: search || undefined,
                sort: sortBy,
                order: sortOrder,
                team: filter === 'all' ? undefined : filter
            };

            console.log("Fetching users with params:", filterParams);

            const response = await api.getUsers(filterParams);

            if (response.ok) {
                setUsers(response.data.data || []);

                // Set pagination info
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.pages || 1);

                    // Update user stats with total count from filtered results
                    if (filter === 'all') {
                        const updatedStats = {
                            ...userStats,
                            total: response.data.pagination.total || 0
                        };
                        setUserStats(updatedStats);
                    }
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

    const fetchUserStats = async () => {
        try {
            const response = await api.request('/users/stats', 'GET', null, true);
            console.log(response.data);
            if (response.ok && response.data) {
                // Add colors to team stats
                const teamCounts = { ...response.data.teamCounts };

                // Apply colors to each team
                Object.keys(teamCounts).forEach(slug => {
                    teamCounts[slug].color = getTeamColor(slug);
                });

                setUserStats({
                    total: response.data.total || 0,
                    teamCounts
                });
            }
        } catch (err) {
            console.error('Error fetching user stats:', err);
        }
    };

    const calculateUserStats = (users, teams) => {
        const stats = {
            total: users.length,
            teamCounts: {}
        };

        teams.forEach(team => {
            stats.teamCounts[team.slug] = {
                count: 0,
                name: team.name,
                color: getTeamColor(team.slug)
            };
        });

        users.forEach(user => {
            if (user.team?.slug && stats.teamCounts[user.team.slug]) {
                stats.teamCounts[user.team.slug].count++;
            }
        });

        setUserStats(stats);
    };

    const getTeamColor = (teamSlug) => {
        const name = teamSlug || 'default';

        // Define specific colors for certain roles
        let hue, saturation, lightness;

        if (teamSlug === 'administrator') {
            // Purple color for administrators
            hue = 280;
            saturation = 70;
            lightness = 50;
        } else {
            // Generate deterministic color based on team name
            const hashCode = name.split('')
                .reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);

            hue = hashCode % 360;
            saturation = 65 + (hashCode % 25);
            lightness = 45 + (hashCode % 10);
        }

        // Return consistent HSL color values for all teams
        return {
            text: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            border: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            ring: `hsl(${hue}, ${saturation}%, ${lightness}%)`
        };
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
        console.log(`Changing to page ${page}`);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {/* All Users Card */}
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

                {/* Dynamic Team Cards */}
                {teams.map(team => {
                    const teamData = userStats.teamCounts?.[team.slug] || {
                        count: 0,
                        name: team.name,
                        color: getTeamColor(team.slug)
                    };

                    return (
                        <div
                            key={team.slug}
                            className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${filter === team.slug ? 'ring-2 border' : 'border border-base-300'}`}
                            style={{
                                ...(filter === team.slug ? {
                                    borderColor: teamData.color.border,
                                    ringColor: teamData.color.ring
                                } : {})
                            }}
                            onClick={() => handleFilterChange(team.slug)}
                        >
                            <div className="card-body p-4 text-center">
                                <div className="stat-title">{team.name}</div>
                                <div className="stat-value text-3xl" style={{ color: teamData.color.text }}>
                                    {teamData.count || 0}
                                </div>
                                <div className="w-full h-1 mt-2 rounded-full" style={{ background: teamData.color.bg }}></div>
                            </div>
                        </div>
                    );
                })}
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
                                        className={`bg-base-200 border-b border-base-300 cursor-pointer ${sortBy === 'created_at' ? 'text-primary' : ''}`}
                                        onClick={() => handleSortChange('created_at')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Joined
                                            {sortBy === 'created_at' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                                </svg>
                                            )}
                                        </div>
                                    </th>
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
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-mono text-sm">{user.email}</div>
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
                            const page = i + 1;
                            // Show first page, last page, current page and pages around current
                            if (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
                            ) {
                                return (
                                    <button
                                        key={i}
                                        className={`join-item btn btn-sm sm:btn-md ${currentPage === page ? 'btn-active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                    >
                                        {page}
                                    </button>
                                );
                            }

                            // Show ellipsis between page groups
                            if (page === currentPage - 2 || page === currentPage + 2) {
                                return (
                                    <button key={i} className="join-item btn btn-sm sm:btn-md btn-disabled">
                                        ...
                                    </button>
                                );
                            }

                            return null;
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