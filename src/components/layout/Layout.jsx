import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

function Layout({ children }) {
    const location = useLocation();

    const isDashboardPage = () => {
        const dashboardPaths = [
            '/dashboard',
            '/products',
            '/rentals',
            '/categories',
            '/users',
            '/reports',
            '/cart',
            '/profile',
            '/settings'
        ];

        return dashboardPaths.some(path => location.pathname.startsWith(path));
    };

    const isNoNavbarPage = () => {
        const noNavbarPaths = [
            '/login',
            '/register',
            '/forgot-password',
            '/reset-password',
            '/verify-email'
        ];

        return noNavbarPaths.some(path => location.pathname === path) ||
            location.pathname === '/';  // Home page
    };

    return (
        <div className="min-h-screen flex flex-col">
            {!isNoNavbarPage() && <Navbar />}
            <main className={`flex-grow ${isDashboardPage() ? 'bg-gray-100' : ''}`}>
                {children}
            </main>
            {!isNoNavbarPage() && (
                <footer className="bg-gray-800 text-white py-4 text-center">
                    &copy; {new Date().getFullYear()} Hardware and Embedded System Laboratory. All rights reserved.
                </footer>
            )}
        </div>
    );
}

export default Layout;