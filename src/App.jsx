import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './components/dashboard/Dashboard';
import Home from './components/home/Home';
import Layout from './components/layout/Layout';
import ProductsPage from './pages/Products/ProductsPage';
import ProductDetailsPage from './pages/Products/ProductDetailsPage';
import CartPage from './pages/Cart/CartPage';
import RentFormPage from './pages/Rent/RentFormPage';
import RentalsPage from './pages/Rent/RentalsPage';
import RentalDetailPage from './pages/Rent/RentalDetailPage';
import CategoriesPage from './pages/Categories/CategoriesPage';
import './App.css';
import UsersPage from './pages/Users/UsersPage';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app m-0">
      <main className="container mx-auto">
        <Layout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#333',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
            containerStyle={{
              top: 80
            }}
          />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            } />
            <Route path="/products/:id" element={
              <ProtectedRoute>
                <ProductDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="/cart" element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            } />
            <Route
              path="/rent/create"
              element={
                <ProtectedRoute>
                  <RentFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rentals"
              element={
                <ProtectedRoute>
                  <RentalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rentals/:id"
              element={
                <ProtectedRoute>
                  <RentalDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/categories"
              element={
                <ProtectedRoute>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/users"
              element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </main>
    </div>
  );
}

export default App;