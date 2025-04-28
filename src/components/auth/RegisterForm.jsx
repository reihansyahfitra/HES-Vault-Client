import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import logoImage from '../../assets/images/logo.png';
import logoTextImage from '../../assets/images/logo_text.png';
import emailIcon from '../../assets/svg/email-message-inbox-svgrepo-com.svg';
import userIcon from '../../assets/svg/user-account-profile-svgrepo-com.svg';
import eyeShowIcon from '../../assets/svg/eye-password-show-svgrepo-com.svg';
import eyeHideIcon from '../../assets/svg/eye-password-hide-svgrepo-com.svg';
import './Auth.css';

function RegisterForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const updateBackground = () => {
        const pos1 = `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`;
        const pos2 = `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`;
        const pos3 = `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`;
        const pos4 = 'center';

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

    const toggleConfirmPasswordVisibility = () => {
        setConfirmPasswordVisible(!confirmPasswordVisible);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== passwordConfirmation) {
            setError("Password and confirmation do not match");
            return;
        }

        if (!termsAccepted) {
            setError("You must accept the Terms of Service and Privacy Policy");
            return;
        }

        setIsLoading(true);

        try {
            const result = await register(name, email, password, passwordConfirmation);

            if (result.success) {
                navigate('/login?registered=true');
            } else {
                if (Array.isArray(result.error)) {
                    setError(result.error.join(', '));
                } else {
                    setError(result.error);
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="background min-h-screen bg-cover bg-center flex items-center justify-center relative">
            {/* Register Card */}
            <div className="awe rounded-lg shadow-lg p-8 w-full max-w-sm mb-20">
                {/* Logo and Title */}
                <div className="flex flex-col items-center">
                    <img src={logoImage} alt="HES Vault Logo" className="w-15 mb-4" />
                    <h1 className="text-2xl font-bold gradient-text mb-6">Daftar</h1>
                </div>

                {/* Validation Errors */}
                {error && (
                    <div className="text-red-600 bg-red-100 border border-red-400 rounded-lg p-3 mb-4">
                        <p>{error}</p>
                    </div>
                )}

                {/* Register Form */}
                <form onSubmit={handleSubmit}>
                    {/* Name Input */}
                    <label htmlFor="name" className="block text-sm font-bold gradient-text mb-1">
                        Nama
                    </label>
                    <div className="input relative mb-4">
                        <input
                            type="text"
                            id="name"
                            placeholder="Masukkan Nama Anda"
                            className="grow"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                        <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <img src={userIcon} className="w-5 h-5 text-gray-400" alt="Name" />
                        </span>
                    </div>

                    {/* Email Input */}
                    <label htmlFor="email" className="block text-sm font-bold gradient-text mb-1">
                        Email
                    </label>
                    <div className="input relative mb-4">
                        <input
                            type="email"
                            id="email"
                            placeholder="Masukkan Email Anda"
                            className="grow"
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
                            className="grow"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength="8"
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

                    {/* Confirm Password Input */}
                    <label htmlFor="password_confirmation" className="block text-sm font-bold gradient-text mb-1">
                        Konfirmasi Kata Sandi
                    </label>
                    <div className="input relative mb-4">
                        <input
                            type={confirmPasswordVisible ? "text" : "password"}
                            id="password_confirmation"
                            placeholder="Konfirmasi Kata Sandi Anda"
                            className="grow"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            required
                        />
                        <span
                            className="absolute inset-y-0 right-4 flex items-center cursor-pointer"
                            onClick={toggleConfirmPasswordVisibility}
                        >
                            <img
                                src={confirmPasswordVisible ? eyeHideIcon : eyeShowIcon}
                                className="w-5 h-5 text-gray-400"
                                alt="Toggle Password Visibility"
                            />
                        </span>
                    </div>

                    {/* Terms and Privacy Policy */}
                    <div className="mt-4 mb-6">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                required
                            />
                            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                                I agree to the{' '}
                                <Link to="/terms" className="text-blue-600 hover:underline">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link to="/policy" className="text-blue-600 hover:underline">
                                    Privacy Policy
                                </Link>
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 py-2 gradient-bg text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
                    >
                        {isLoading ? 'Processing...' : 'Daftar'}
                    </button>

                    {/* Already have an account? Login Link */}
                    <div className="mt-4 text-center">
                        <span className="text-sm text-blue-800">Sudah punya akun? </span>{' '}
                        <Link to="/login" className="text-sm text-blue-600 hover:underline gradient-text">
                            Masuk
                        </Link>
                    </div>
                </form>
            </div>

            {/* Footer */}
            <footer className="fixed bottom-0 w-full text-center p-4 bg-white">
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

export default RegisterForm;