import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            if (token) {
                try {
                    const response = await api.getCurrentUser();

                    if (response.ok) {
                        setUser(response.data);
                    } else {
                        localStorage.removeItem('token');
                        setToken(null);
                    }
                } catch (e) {
                    localStorage.removeItem('token');
                    setToken(null);
                }
            }
            setLoading(false);
        };
        verifyToken();
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await api.login(email, password);

            if (response.ok && response.data.token) {
                localStorage.setItem('token', response.data.token);
                setToken(response.data.token);
                setUser(response.data.user);
                return { success: true };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Login failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'An error occurred during login'
            };
        }
    };

    const logout = async () => {
        try {
            if (token) {
                await api.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    const register = async (name, email, password) => {
        try {
            const response = await api.register(name, email, password);

            if (response.ok) {
                return { success: true };
            } else {
                return {
                    success: false,
                    error: response.data.errors || response.data.message || 'Registration failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'An error occurred during registration'
            };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            register,
            isAuthenticated: !!token,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);