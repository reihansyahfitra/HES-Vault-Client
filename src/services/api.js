import imageService from './imageService';

const API_URL = 'http://localhost:3000';

class ApiService {
    constructor() {
        this.baseUrl = API_URL;
    }


    getToken() {
        return localStorage.getItem('token');
    }

    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    async request(endpoint, method = 'GET', data = null, includeAuth = true) {
        const options = {
            method,
            headers: this.getHeaders(includeAuth),
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            const result = await response.json();

            return {
                ok: response.ok,
                status: response.status,
                data: result
            };
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            return {
                ok: false,
                status: 500,
                data: { message: error.message }
            };
        }
    }

    login(email, password) {
        return this.request('/auth/login', 'POST', { email, password }, false);
    }

    register(name, email, password) {
        return this.request('/auth/register', 'POST', { name, email, password }, false);
    }

    logout() {
        return this.request('/auth/logout', 'POST');
    }

    getCurrentUser() {
        return this.request('/users/me');
    }

    // Auth endpoints
    login(email, password) {
        return this.request('/auth/login', 'POST', { email, password }, false);
    }

    register(name, email, password) {
        return this.request('/auth/register', 'POST', { name, email, password }, false);
    }

    logout() {
        return this.request('/auth/logout', 'POST');
    }

    getCurrentUser() {
        return this.request('/users/me');
    }

    // Products endpoints
    getProducts(params = {}) {
        const { page = 1, limit = 10, search = '', category = '', lowStock = '' } = params;
        let endpoint = `/products?page=${page}&limit=${limit}`;

        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
        if (category && category !== 'all') endpoint += `&category=${encodeURIComponent(category)}`;
        if (lowStock) endpoint += `&lowStock=${encodeURIComponent(lowStock)}`;

        return this.request(endpoint);
    }

    getProduct(id) {
        return this.request(`/products/${id}`);
    }

    createProduct(productData) {
        return this.request('/products', 'POST', productData);
    }

    updateProduct(id, productData) {
        return this.request(`/products/${id}`, 'PUT', productData);
    }

    deleteProduct(id) {
        return this.request(`/products/${id}`, 'DELETE');
    }

    // Categories endpoints
    getCategories() {
        return this.request('/categories');
    }

    createCategory(name) {
        return this.request('/categories', 'POST', { name });
    }

    updateCategory(id, name) {
        return this.request(`/categories/${id}`, 'PUT', { name });
    }

    deleteCategory(id) {
        return this.request(`/categories/${id}`, 'DELETE');
    }

    // Rentals/Orders endpoints
    getRentals() {
        return this.request('/rent');
    }

    getUserRentals() {
        return this.request('/rent/my');
    }

    getRental(id) {
        return this.request(`/rent/${id}`);
    }

    createRental(rentalData) {
        return this.request('/rent', 'POST', rentalData);
    }

    updateRentalStatus(id, statusData) {
        return this.request(`/orders/${id}/status`, 'PUT', statusData);
    }

    // Cart endpoints
    getCart() {
        return this.request('/cart');
    }

    addToCart(productId, quantity = 1) {
        return this.request('/cart/add', 'POST', { productId, quantity });
    }

    updateCartItem(itemId, quantity) {
        return this.request(`/cart/item/${itemId}`, 'PUT', { quantity });
    }

    removeCartItem(itemId) {
        return this.request(`/cart/item/${itemId}`, 'DELETE');
    }

    clearCart() {
        return this.request('/cart/clear', 'DELETE');
    }

    // Image upload endpoints
    uploadProductImage(productId, imageFile) {
        return imageService.uploadProductImage(productId, imageFile);
    }

    uploadRentDocument(rentId, docType, imageFile) {
        return imageService.uploadRentDocument(rentId, docType, imageFile);
    }

    uploadProfilePicture(imageFile) {
        return imageService.uploadProfilePicture(imageFile);
    }

    // Keep existing uploadFile method for backward compatibility
    async uploadFile(endpoint, formData) {
        const token = this.getToken();

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: formData
            });

            const result = await response.json();

            return {
                ok: response.ok,
                status: response.status,
                data: result
            };
        } catch (error) {
            console.error(`File upload failed: ${endpoint}`, error);
            return {
                ok: false,
                status: 500,
                data: { message: error.message }
            };
        }
    }

    // Add helper method to get image URL
    getImageUrl(imagePath) {
        return imageService.getImageUrl(imagePath);
    }
}

export default new ApiService();