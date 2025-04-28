import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoImage from '../../assets/images/logo.png';
import './Home.css';

function Home() {
    const { isAuthenticated } = useAuth();

    // Function to get random positions for the background elements
    const getRandomPosition = () => `${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%`;

    // Update background positions
    const updateBackground = () => {
        document.documentElement.style.setProperty('--bg-pos-1', getRandomPosition());
        document.documentElement.style.setProperty('--bg-pos-2', getRandomPosition());
        document.documentElement.style.setProperty('--bg-pos-3', getRandomPosition());
        document.documentElement.style.setProperty('--bg-pos-4', getRandomPosition());
    };

    // Set up background animation on component mount
    useEffect(() => {
        updateBackground();
        const interval = setInterval(updateBackground, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="home-background">
            <div className="home-content">
                <img src={logoImage} alt="HES Vault Logo" className="home-logo" />
                <h1 className="home-title">Selamat datang di HES Vault</h1>

                <div className="home-buttons">
                    {!isAuthenticated ? (
                        <>
                            <Link to="/login" className="home-button primary-button">
                                Masuk
                            </Link>
                            <Link to="/register" className="home-button primary-button">
                                Daftar
                            </Link>
                        </>
                    ) : (
                        <Link to="/dashboard" className="home-button primary-button">
                            Go to Dashboard
                        </Link>
                    )}
                </div>

                {/* Features section */}
                <section className="features-section">
                    <h2>Features</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <h3>Product Management</h3>
                            <p>Easily manage your equipment inventory with detailed tracking</p>
                        </div>
                        <div className="feature-card">
                            <h3>Rental System</h3>
                            <p>Streamlined rental process with documentation features</p>
                        </div>
                        <div className="feature-card">
                            <h3>User-Friendly Interface</h3>
                            <p>Intuitive design for smooth operation and management</p>
                        </div>
                    </div>
                </section>

                {/* About section */}
                <section className="about-section">
                    <h2>About HES Vault</h2>
                    <p>
                        HES Vault is a comprehensive equipment rental management system designed to help
                        businesses track inventory, manage rentals, and maintain documentation for all equipment.
                        Our platform provides a seamless experience for both administrators and customers.
                    </p>
                </section>
            </div>
        </div>
    );
}

export default Home;