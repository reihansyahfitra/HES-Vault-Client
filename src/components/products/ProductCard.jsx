import { Link } from 'react-router-dom';
import imageService from '../../services/imageService';

function ProductCard({ product, isAdmin, onEdit, onDelete }) {
    // Calculate stock status
    const getStockStatus = () => {
        if (product.quantity <= 0) {
            return { color: 'bg-error text-white', text: 'Out of Stock' };
        }
        if (product.quantity <= product.quantity_alert) {
            return { color: 'bg-warning text-white', text: 'Low Stock' };
        }
        return { color: 'bg-success text-white', text: 'In Stock' };
    };

    const stockStatus = getStockStatus();

    return (
        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <figure className="relative h-48 overflow-hidden">
                {product.product_picture ? (
                    <img
                        src={imageService.getImageUrl(product.product_picture)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder.webp';
                        }}
                    />
                ) : (
                    <div className="bg-base-300 w-full h-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                <span className={`absolute top-2 right-2 badge ${stockStatus.color}`}>
                    {stockStatus.text}
                </span>
            </figure>
            <div className="card-body p-4">
                <h2 className="card-title text-lg">{product.name}</h2>
                <p className="text-sm text-gray-500">{product.brand}</p>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-primary font-bold flex items-baseline">
                        Rp{product.price.toLocaleString('id-ID')}
                        <span className="text-xs font-normal text-gray-500 ml-1">/ week</span>
                    </span>
                    <span className="text-sm">
                        Stock: {product.quantity}
                    </span>
                </div>
                <div className="card-actions justify-between mt-3">
                    <Link to={`/products/${product.id}`} className="btn btn-primary">
                        View Details
                    </Link>
                    {isAdmin && (
                        <div className="flex gap-1">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={onEdit}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                className="btn btn-ghost btn-sm text-error"
                                onClick={onDelete}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductCard;