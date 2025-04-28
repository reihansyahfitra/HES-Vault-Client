import { useState } from 'react';

function ProductFilters({ categories, selectedCategory, onApply, onClose }) {
    const [categoryFilter, setCategoryFilter] = useState(selectedCategory);
    const [showLowStock, setShowLowStock] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onApply({
            category: categoryFilter,
            lowStock: showLowStock
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Grey overlay - making sure it's behind the modal content */}
            <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true" onClick={onClose}>
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal content - explicitly higher z-index than the overlay */}
                <div className="inline-block align-bottom bg-base-100 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50">
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium">
                                    Filter Products
                                </h3>
                                <div className="mt-4">
                                    <form onSubmit={handleSubmit}>
                                        <div className="form-control w-full mb-4">
                                            <label className="label mb-1">
                                                <span className="label-text">Category</span>
                                            </label>
                                            <select
                                                className="select select-bordered w-full"
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                            >
                                                <option value="all">All Categories</option>
                                                {categories.map(category => (
                                                    <option key={category.id} value={category.slug}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-control w-full mb-4">
                                            <label className="label cursor-pointer">
                                                <span className="label-text">Show Low Stock Items Only</span>
                                                <input
                                                    type="checkbox"
                                                    className="toggle toggle-warning"
                                                    checked={showLowStock}
                                                    onChange={() => setShowLowStock(!showLowStock)}
                                                />
                                            </label>
                                            {showLowStock && (
                                                <div className="text-xs text-warning mt-1">
                                                    Shows items where quantity is at or below minimum threshold
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={onClose}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                            >
                                                Apply Filters
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductFilters;