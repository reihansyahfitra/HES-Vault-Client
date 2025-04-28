import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import logoImage from '../../assets/images/logo.png';
import logoTextImage from '../../assets/images/logo_text.png';
import emailIcon from '../../assets/svg/email-message-inbox-svgrepo-com.svg';
import eyeShowIcon from '../../assets/svg/eye-password-show-svgrepo-com.svg';
import eyeHideIcon from '../../assets/svg/eye-password-hide-svgrepo-com.svg';
import './Auth.css';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const updateBackground = () => {
        const pos1 = `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`;
        const pos2 = `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`;
        const pos3 = `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`;
        const pos4 = 'center'; // Keep the main background centered

        document.documentElement.style.setProperty('--bg-pos-1', pos1);
        document.documentElement.style.setProperty('--bg-pos-2', pos2);
        document.documentElement.style.setProperty('--bg-pos-3', pos3);
    };

    useEffect(() => {
        updateBackground();
        const interval = setInterval(updateBackground, 10000);
        return () => clearInterval(interval);
    }, []);

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="background min-h-screen bg-cover bg-center flex flex-col">
            {/* Main Content */}
            <div className="flex-grow flex items-center justify-center">
                {/* Login Card */}
                <div className="awe rounded-lg shadow-lg p-8 w-full max-w-sm mx-auto mb-14">
                    {/* Logo and Title */}
                    <div className="flex flex-col items-center">
                        <img src={logoImage} alt="HES Vault Logo" className="w-20 mb-4" />
                        <h1 className="text-2xl font-bold gradient-text mb-6">Masuk</h1>
                    </div>

                    {/* Validation Errors */}
                    {error && (
                        <div className="text-red-600 bg-red-100 border border-red-400 rounded-lg p-3 mb-4">
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit}>
                        {/* Email Input */}
                        <label htmlFor="email" className="block text-sm font-bold gradient-text mb-1">
                            Email
                        </label>
                        <div className="input relative mb-4">
                            <input
                                type="email"
                                id="email"
                                placeholder="Masukkan Email Anda"
                                className="grow py-2"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <img src={emailIcon} className="w-5 h-5 text-gray-400" alt="Email" />
                            </span>
                        </div>

                        {/* Password Input */}
                        <label htmlFor="password" className="block text-sm font-bold gradient-text mb-1">
                            Kata Sandi
                        </label>
                        <div className="input relative mb-4">
                            <input
                                type={passwordVisible ? "text" : "password"}
                                id="password"
                                placeholder="Masukkan Kata Sandi Anda"
                                className="grow py-2"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <span
                                className="absolute inset-y-0 right-4 flex items-center cursor-pointer"
                                onClick={togglePasswordVisibility}
                            >
                                <img
                                    src={passwordVisible ? eyeHideIcon : eyeShowIcon}
                                    className="w-5 h-5 text-gray-400"
                                    alt="Toggle Password Visibility"
                                />
                            </span>
                        </div>

                        {/* Remember Me Checkbox */}
                        <div className="flex items-center mb-4">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember" className="ml-2 block text-sm text-gray-900">
                                Ingat Saya
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2 gradient-bg text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Login'}
                        </button>

                        {/* Forgot Password Link */}
                        <div className="mt-4 text-center">
                            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                                Lupa Kata Sandi?
                            </Link>
                        </div>

                        {/* Sign Up Link */}
                        <div className="mt-4 text-center">
                            <span className="text-sm text-blue-800">Belum punya akun?</span>{' '}
                            <Link to="/register" className="text-sm font-semibold text-blue-600 hover:underline gradient-text">
                                Daftar
                            </Link>
                        </div>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <footer className="w-full text-center p-4 bg-white">
                <div className="flex items-center justify-center">
                    <img src={logoTextImage} alt="HES Vault Logo" className="h-6 mr-2" />
                    <p className="text-xs text-black font-semibold">
                        &copy; {new Date().getFullYear()} HES VAULT. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default LoginForm;