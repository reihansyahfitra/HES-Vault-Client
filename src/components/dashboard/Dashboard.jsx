import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import RegularDashboard from './RegularDashboard';
import api from '../../services/api';

function Dashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            // If user data is not available via auth context, fetch it
            if (!user) {
                try {
                    const response = await api.getCurrentUser();
                    if (!response.ok) {
                        console.error('Failed to fetch user data');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }

            setLoading(false);
        };

        fetchUserData();

        // Safety timeout to prevent infinite loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [user]);

    if (loading) {
        return (
            < div className="flex justify-center items-center min-h-[300px]" >
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div >
        );
    }

    const isAdmin = user?.team?.name === 'Administrator';

    return isAdmin ? <AdminDashboard /> : <RegularDashboard />;
}

export default Dashboard;