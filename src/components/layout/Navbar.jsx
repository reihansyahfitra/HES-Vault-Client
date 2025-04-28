import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImage from '../../assets/images/logo_text.png';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Navbar.css';

function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (user?.team?.slug === 'administrator') {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
    }, [user]);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="navbar bg-base-100 shadow-lg sticky top-0 z-30">
            <div className="navbar-start">
                <div className="dropdown">
                    <label
                        tabIndex={0}
                        className="btn btn-ghost lg:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M4 6h16M4 12h8m-8 6h16" />
                        </svg>
                    </label>
                    {isMobileMenuOpen && (
                        <ul tabIndex={0}
                            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <li><Link to="/dashboard">Dashboard</Link></li>
                            <li><Link to="/products">Products</Link></li>
                            <li><Link to="/rentals">Rentals</Link></li>
                            <li><Link to="/cart">Cart</Link></li>
                            {isAdmin && (
                                <>
                                    <li><Link to="/categories">Categories</Link></li>
                                    <li><Link to="/users">Users</Link></li>
                                    <li><Link to="/reports">Reports</Link></li>
                                </>
                            )}
                        </ul>
                    )}
                </div>
                <Link to="/" className="btn btn-ghost normal-case text-xl">
                    <img src={logoImage} alt="HES Vault Logo" className="w-30" />
                </Link>
            </div>

            <div className="navbar-center hidden lg:flex">
                <ul className="menu menu-horizontal px-1">
                    <li className={location.pathname === '/dashboard' ? 'bordered' : ''}>
                        <Link to="/dashboard">Dashboard</Link>
                    </li>
                    <li className={location.pathname.startsWith('/products') ? 'bordered' : ''}>
                        <Link to="/products">Products</Link>
                    </li>
                    <li className={location.pathname.startsWith('/rentals') ? 'bordered' : ''}>
                        <Link to="/rentals">Rentals</Link>
                    </li>
                    {isAdmin && (
                        <>
                            <li className={location.pathname.startsWith('/categories') ? 'bordered' : ''}>
                                <Link to="/categories">Categories</Link>
                            </li>
                            <li className={location.pathname.startsWith('/users') ? 'bordered' : ''}>
                                <Link to="/users">Users</Link>
                            </li>
                            <li className={location.pathname.startsWith('/reports') ? 'bordered' : ''}>
                                <Link to="/reports">Reports</Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>

            <div className="navbar-end">
                <Link to="/cart" className="btn btn-ghost btn-circle mr-2">
                    <div className="indicator">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="badge badge-sm indicator-item">{0}</span>
                    </div>
                </Link>

                <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                        <div className="w-10 rounded-full">
                            {user?.profile_picture ? (
                                <img src={api.getImageUrl(user.profile_picture)} alt={user.name} />
                            ) : (
                                <div className="bg-primary text-primary-content flex items-center justify-center h-full">
                                    {user?.name?.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </label>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                        <li className="menu-title px-4 py-2">
                            <span className="font-bold">{user?.name}</span>
                            <span className="text-xs opacity-60 block">{user?.team?.name}</span>
                        </li>
                        <li><Link to="/profile">Profile</Link></li>
                        <li><Link to="/settings">Settings</Link></li>
                        <li><a onClick={handleLogout}>Logout</a></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Navbar;