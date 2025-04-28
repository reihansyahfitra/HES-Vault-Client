const API_URL = 'http://localhost:3000';

class ImageService {
    constructor() {
        this.baseUrl = API_URL;
        this.placeholderImage = '/placeholder.webp';
    }

    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Get the full URL for an image path
     * @param {string} imagePath - The relative path to the image
     * @returns {string} Full URL to the image
     */
    getImageUrl(imagePath) {
        if (!imagePath) return this.placeholderImage;

        // If it's already a full URL, return it
        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        // If it's a relative path starting with /uploads, it's from our API
        if (imagePath.startsWith('/uploads/')) {
            const segments = imagePath.split('/');
            const type = segments[2]; // profile, product, or rent
            const filename = segments[3];
            return `${this.baseUrl}/images/${type}/${filename}`;
        }

        // Default case - just append to base URL
        return `${this.baseUrl}${imagePath}`;
    }

    /**
     * Get a thumbnail version of an image
     * @param {string} imagePath - The relative path to the image
     * @returns {string} URL to the thumbnail image
     */
    getThumbnailUrl(imagePath) {
        if (!imagePath) return this.placeholderImage;

        // Assuming thumbnails follow a naming pattern like original_thumb.ext
        if (imagePath.startsWith('/uploads/')) {
            const lastDotIndex = imagePath.lastIndexOf('.');
            if (lastDotIndex !== -1) {
                const basePath = imagePath.substring(0, lastDotIndex);
                const extension = imagePath.substring(lastDotIndex);
                return this.getImageUrl(`${basePath}_thumb${extension}`);
            }
        }

        // If we can't determine a thumbnail pattern, return the original
        return this.getImageUrl(imagePath);
    }

    /**
     * Preload an image to ensure it's in the cache
     * @param {string} imagePath - Path to the image to preload
     * @returns {Promise<HTMLImageElement>} Promise resolving to the loaded image
     */
    preloadImage(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = this.getImageUrl(imagePath);
        });
    }

    /**
     * Upload a profile picture
     * @param {File} imageFile - The image file to upload
     * @returns {Promise<Object>} API response
     */
    async uploadProfilePicture(imageFile) {
        return this.uploadImage('/images/profile', imageFile);
    }

    /**
     * Upload a product image
     * @param {string} productId - The product ID
     * @param {File} imageFile - The image file to upload
     * @returns {Promise<Object>} API response
     */
    async uploadProductImage(productId, imageFile) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            // Add console logging to debug the URL
            const url = `${this.baseUrl}/images/product/${productId}`;
            console.log('Uploading image to URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : '',
                },
                body: formData
            });

            const result = await response.json();
            console.log('Image upload result:', result);
            return {
                ok: response.ok,
                status: response.status,
                data: result
            };
        } catch (error) {
            console.error(`Image upload failed: ${productId}`, error);
            return {
                ok: false,
                status: 500,
                data: { message: error.message }
            };
        }
    }

    /**
     * Upload a rent documentation image
     * @param {string} rentId - The rent ID
     * @param {string} docType - The document type (before, after, identification)
     * @param {File} imageFile - The image file to upload
     * @returns {Promise<Object>} API response
     */
    async uploadRentDocument(rentId, docType, imageFile) {
        if (!['before', 'after', 'identification'].includes(docType)) {
            throw new Error('Invalid document type. Must be "before", "after", or "identification"');
        }
        return this.uploadImage(`/images/rent/${rentId}/${docType}`, imageFile);
    }

    /**
     * Generic method to upload an image
     * @param {string} endpoint - API endpoint
     * @param {File} imageFile - The image file to upload
     * @returns {Promise<Object>} API response
     */
    async uploadImage(endpoint, imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

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
            console.error(`Image upload failed: ${endpoint}`, error);
            return {
                ok: false,
                status: 500,
                data: { message: error.message }
            };
        }
    }

    /**
     * Get an image blob
     * @param {string} imagePath - Path to the image
     * @returns {Promise<Blob>} Image blob
     */
    async getImageBlob(imagePath) {
        try {
            const response = await fetch(this.getImageUrl(imagePath), {
                headers: {
                    'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : '',
                },
                cache: 'force-cache'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch image');
            }

            return await response.blob();
        } catch (error) {
            console.error('Error fetching image blob:', error);

            // Return a placeholder image blob
            try {
                const placeholder = await fetch(this.placeholderImage);
                return await placeholder.blob();
            } catch (placeholderError) {
                console.error('Failed to load placeholder image:', placeholderError);
                throw error;
            }
        }
    }

    /**
     * Get a base64 encoded image
     * @param {string} imagePath - Path to the image
     * @returns {Promise<string>} Base64 encoded image
     */
    async getImageBase64(imagePath) {
        try {
            const blob = await this.getImageBlob(imagePath);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting image to base64:', error);
            throw error;
        }
    }

    /**
     * Check if an image exists
     * @param {string} imagePath - Path to check
     * @returns {Promise<boolean>} Whether the image exists
     */
    async imageExists(imagePath) {
        try {
            const response = await fetch(this.getImageUrl(imagePath), {
                method: 'HEAD',
                headers: {
                    'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : '',
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error checking if image exists:', error);
            return false;
        }
    }

    /**
     * Gets image dimensions
     * @param {string} imagePath - Path to the image
     * @returns {Promise<{width: number, height: number}>} Image dimensions
     */
    async getImageDimensions(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = this.getImageUrl(imagePath);
        });
    }

    /**
     * Updates the path of a rent documentation image
     * @param {string} oldPath - Original path of the image
     * @param {string} newRentId - New rent ID
     * @param {string} docType - Document type (before, after, identification)
     * @returns {Promise<Object>} API response
     */
    async updateDocumentationPath(oldPath, newRentId, docType) {
        const token = this.getToken();

        try {
            const response = await fetch(`${this.baseUrl}/images/update-path`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    oldPath,
                    newRentId,
                    docType
                })
            });

            const result = await response.json();

            return {
                ok: response.ok,
                status: response.status,
                data: result
            };
        } catch (error) {
            console.error('Error updating documentation path:', error);
            return {
                ok: false,
                status: 500,
                data: { message: error.message }
            };
        }
    }
}

export default new ImageService();