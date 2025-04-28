import { useState, useEffect } from 'react';
import imageService from '../../services/imageService';
import api from '../../services/api';

function ProductForm({ categories, product, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category_id: '',
        price: '',
        quantity: '',
        quantity_alert: '',
        description: '',
        specifications: '',
        source: 'Purchase',
        date_arrival: new Date().toISOString().split('T')[0],
        product_picture: null,
        is_rentable: true,
    });
    const [errors, setErrors] = useState({});
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadedImagePath, setUploadedImagePath] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState(null);

    // Initialize form with product data if editing
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                brand: product.brand || '',
                category_id: product.category_id || '',
                price: product.price || '',
                quantity: product.quantity || '',
                quantity_alert: product.quantity_alert || '',
                description: product.description || '',
                specifications: product.specifications || '',
                source: product.source || 'Purchase',
                date_arrival: product.date_arrival
                    ? new Date(product.date_arrival).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                product_picture: null,
                is_rentable: product.is_rentable !== undefined ? product.is_rentable : true,
            });

            if (product.product_picture) {
                setImagePreview(imageService.getImageUrl(product.product_picture));
                setUploadedImagePath(product.product_picture);
            }
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'product_picture' && e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            setSelectedImageFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);

            if (product && product.id) {
                uploadProductImage(file, product.id);
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const uploadProductImage = async (file, productId) => {
        try {
            setIsUploading(true);

            const response = await imageService.uploadProductImage(productId, file);

            if (response.ok && response.data) {
                setUploadedImagePath(response.data.product_picture);
                setIsUploading(false);
                return response.data.product_picture;
            } else {
                throw new Error(response.data?.message || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading product image:', error);
            setErrors(prev => ({
                ...prev,
                product_picture: 'Failed to upload image. Please try again.'
            }));
            setIsUploading(false);
            return null;
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Product name is required';
        if (!formData.category_id) newErrors.category_id = 'Category is required';
        if (!formData.price) newErrors.price = 'Price is required';
        else if (isNaN(formData.price) || Number(formData.price) <= 0) newErrors.price = 'Price must be a positive number';

        if (!formData.quantity) newErrors.quantity = 'Quantity is required';
        else if (isNaN(formData.quantity) || Number(formData.quantity) < 0) newErrors.quantity = 'Quantity must be a non-negative number';

        if (!formData.quantity_alert) newErrors.quantity_alert = 'Quantity alert is required';
        else if (isNaN(formData.quantity_alert) || Number(formData.quantity_alert) < 0) newErrors.quantity_alert = 'Quantity alert must be a non-negative number';

        if (!formData.brand.trim()) newErrors.brand = 'Brand is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.specifications.trim()) newErrors.specifications = 'Specifications are required';
        if (!formData.source.trim()) newErrors.source = 'Source is required';
        if (!formData.date_arrival) newErrors.date_arrival = 'Arrival date is required';

        if (formData.product_picture && formData.product_picture.size > 5 * 1024 * 1024) newErrors.product_picture = 'Image size exceeds 5MB';
        if (formData.product_picture && !formData.product_picture.type.startsWith('image/')) newErrors.product_picture = 'Invalid image format. Only images are allowed.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            // Convert numeric strings to numbers
            const processedData = {
                ...formData,
                price: parseFloat(formData.price),
                quantity: parseInt(formData.quantity),
                quantity_alert: parseInt(formData.quantity_alert),
                product_picture: uploadedImagePath || null,
            };
            try {
                if (product) {
                    // For existing products, use the uploaded image path if available
                    processedData.product_picture = uploadedImagePath;
                    onSubmit(processedData);
                } else {
                    // For new products, just pass the selected file to the parent
                    // and let it handle the image upload after product creation
                    // Don't trigger uploadProductImage from here
                    onSubmit({
                        ...processedData,
                        selectedImageFile: selectedImageFile
                    });
                }
            } catch (error) {
                console.error("Error during form submission:", error);
                setIsUploading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Product Name</span>
                </label>
                <input
                    type="text"
                    name="name"
                    className={`input input-bordered w-full ${errors.name ? 'input-error' : ''} focus:outline-none`}
                    value={formData.name}
                    onChange={handleChange}
                />
                {errors.name && <span className="text-error text-xs mt-1">{errors.name}</span>}
            </div>

            <div className="form-control">
                <label className="label">
                    <span className="label-text">Category</span>
                </label>
                <select
                    name="category_id"
                    className={`select select-bordered w-full ${errors.category_id ? 'select-error' : ''} focus:outline-none`}
                    value={formData.category_id}
                    onChange={handleChange}
                >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                {errors.category_id && <span className="text-error text-xs mt-1">{errors.category_id}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Brand</span>
                    </label>
                    <input
                        type="text"
                        name="brand"
                        className={`input input-bordered w-full ${errors.brand ? 'input-error' : ''} focus:outline-none`}
                        value={formData.brand}
                        onChange={handleChange}
                    />
                    {errors.brand && <span className="text-error text-xs mt-1">{errors.brand}</span>}
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Source</span>
                    </label>
                    <input
                        type="text"
                        name="source"
                        className={`input input-bordered w-full ${errors.source ? 'input-error' : ''} focus:outline-none`}
                        value={formData.source}
                        onChange={handleChange}
                    />
                    {errors.source && <span className="text-error text-xs mt-1">{errors.source}</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Price</span>
                    </label>
                    <input
                        type="number"
                        name="price"
                        className={`input input-bordered w-full ${errors.price ? 'input-error' : ''} focus:outline-none`}
                        value={formData.price}
                        onChange={handleChange}
                    />
                    {errors.price && <span className="text-error text-xs mt-1">{errors.price}</span>}
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Quantity</span>
                    </label>
                    <input
                        type="number"
                        name="quantity"
                        className={`input input-bordered w-full ${errors.quantity ? 'input-error' : ''} focus:outline-none`}
                        value={formData.quantity}
                        onChange={handleChange}
                    />
                    {errors.quantity && <span className="text-error text-xs mt-1">{errors.quantity}</span>}
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Minimum Quantity</span>
                    </label>
                    <input
                        type="number"
                        name="quantity_alert"
                        className={`input input-bordered w-full ${errors.quantity_alert ? 'input-error' : ''} focus:outline-none`}
                        value={formData.quantity_alert}
                        onChange={handleChange}
                    />
                    {errors.quantity_alert && <span className="text-error text-xs mt-1">{errors.quantity_alert}</span>}
                </div>
            </div>

            <div className="form-control">
                <label className="label">
                    <span className="label-text">Date of Arrival</span>
                </label>
                <input
                    type="date"
                    name="date_arrival"
                    className={`input input-bordered w-full ${errors.date_arrival ? 'input-error' : ''} focus:outline-none`}
                    value={formData.date_arrival}
                    onChange={handleChange}
                />
                {errors.date_arrival && <span className="text-error text-xs mt-1">{errors.date_arrival}</span>}
            </div>

            <div className="form-control">
                <label className="label">
                    <div className="label-text">Description</div>
                </label>
                <textarea
                    name="description"
                    className={`textarea textarea-bordered w-full h-24 ${errors.description ? 'textarea-error' : ''} focus:outline-none`}
                    value={formData.description}
                    onChange={handleChange}
                ></textarea>
                {errors.description && <span className="text-error text-xs mt-1">{errors.description}</span>}
            </div>

            <div className="form-control">
                <label className="label">
                    <span className="label-text">Specifications</span>
                </label>
                <textarea
                    name="specifications"
                    className={`textarea textarea-bordered w-full h-24 ${errors.specifications ? 'textarea-error' : ''} focus:outline-none`}
                    value={formData.specifications}
                    onChange={handleChange}
                    placeholder="Enter specifications, e.g.: Weight: 120g, Dimensions: 10x5x2cm"
                ></textarea>
                {errors.specifications && <span className="text-error text-xs mt-1">{errors.specifications}</span>}
            </div>
            <div className="form-control">
                <label className="label">
                    <span className='label-text'>Upload Image</span>
                </label>
                <input
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered w-full focus:outline-none"
                    onChange={handleChange}
                    name='product_picture'
                    disabled={isUploading}
                />
                {isUploading && (
                    <div className="mt-2">
                        <span className="loading loading-spinner loading-sm text-primary mr-2"></span>
                        <span className="text-sm">Uploading image...</span>
                    </div>
                )}
                {errors.product_picture && <span className="text-error text-xs mt-1">{errors.product_picture}</span>}
                {imagePreview && (
                    <div className="mt-4">
                        <div className="aspect-w-16 aspect-h-9 w-full rounded-lg overflow-hidden border-2 border-base-300">
                            <img
                                src={imagePreview}
                                alt="Product preview"
                                className="object-contain w-full h-48"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                    <input
                        type="checkbox"
                        name="is_rentable"
                        className="checkbox"
                        checked={formData.is_rentable}
                        onChange={handleChange}
                    />
                    <span className="label-text">Available for rent</span>
                </label>
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onCancel}
                    disabled={isUploading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isUploading}
                >
                    {product ? 'Update Product' : 'Add Product'}
                </button>
            </div>
        </form>
    );
}

export default ProductForm;