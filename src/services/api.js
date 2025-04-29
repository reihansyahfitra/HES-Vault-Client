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

    async request(endpoint, method = 'GET', data = null, includeAuth = true, queryParams = null) {
        const options = {
            method,
            headers: this.getHeaders(includeAuth),
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        // Handle query parameters
        let url = `${this.baseUrl}${endpoint}`;
        if (queryParams) {
            const queryString = new URLSearchParams();
            for (const [key, value] of Object.entries(queryParams)) {
                if (value !== undefined && value !== null) {
                    queryString.append(key, value);
                }
            }

            if (queryString.toString()) {
                url += `?${queryString.toString()}`;
            }
        }

        console.log(`Making API request to: ${url}`);

        try {
            const response = await fetch(url, options);
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

    getUsers(params = {}) {
        const queryParams = {
            page: params.page || 1,
            limit: params.limit || 10,
            sort: params.sort || 'created_at',
            order: params.order || 'desc',
            team: params.team === 'all' ? undefined : params.team,
            search: params.search || undefined
        };

        Object.keys(queryParams).forEach(key =>
            queryParams[key] === undefined && delete queryParams[key]
        );

        console.log("API getUsers params:", queryParams);

        return this.request('/users', 'GET', null, true, queryParams);
    }

    getUser(id) {
        return this.request(`/users/${id}`);
    }

    updateUser(id, userData) {
        return this.request(`/users/${id}`, 'PUT', userData);
    }

    deleteUser(id) {
        return this.request(`/users/${id}`, 'DELETE');
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
    async getAllRentals(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        console.log(`Making API call: /rent${queryString ? '?' + queryString : ''}`);
        return this.request(`/rent${queryString ? '?' + queryString : ''}`);
    }

    async getUserRentals(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        console.log(`Making API call: /rent/my${queryString ? '?' + queryString : ''}`);
        return this.request(`/rent/my${queryString ? '?' + queryString : ''}`);
    }

    async updateRentalStatus(orderId, status, type = 'order') {
        return this.request(`/orders/${orderId}/status`, 'PUT', {
            [type === 'order' ? 'order_status' : 'payment_status']: status
        });
    }

    async getRentalById(id) {
        return this.request(`/rent/${id}`);
    }

    async createRent(rentData) {
        const transformedData = {
            identification: rentData.identification,
            phone: rentData.phone,
            notes: rentData.notes,
            cart_id: rentData.cart_id,
            start_date: rentData.start_date || rentData.startDate, // Backend expects start_date
            end_date: rentData.end_date || rentData.endDate,    // Backend expects end_date
            identification_picture: rentData.identification_picture
        };
        console.log("Sending to API:", transformedData);

        return this.request('/rent', 'POST', transformedData);
    }

    async updateRentDocumentationBefore(rentId, imagePath) {
        return this.request(`/rent/${rentId}/documentation-before`, 'PUT', {
            documentation_before: imagePath
        });
    }

    async updateRentDocumentationAfter(rentId, imagePath) {
        return this.request(`/rent/${rentId}/documentation-after`, 'PUT', {
            documentation_after: imagePath
        });
    }

    async updateRentDocumentPath(oldPath, newRentId, docType) {
        return this.request('/images/rent/update-path', 'PUT', {
            oldPath,
            newRentId,
            docType
        });
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