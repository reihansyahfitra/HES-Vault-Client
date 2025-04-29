import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

function CategoriesPage() {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editCategoryName, setEditCategoryName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const isAdmin = user?.team?.slug === 'administrator';

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await api.getCategories();
            if (response.ok) {
                setCategories(response.data);
            } else {
                setError('Failed to fetch categories. Please try again later.');
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Failed to fetch categories. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            setSubmitting(true);
            const response = await api.createCategory({ name: newCategoryName });

            if (response.ok) {
                setCategories([...categories, response.data]);
                setNewCategoryName('');
                setShowAddModal(false);
                toast.success('Category added successfully');
            } else {
                toast.error(response.data?.message || 'Failed to add category');
            }
        } catch (err) {
            console.error('Error adding category:', err);
            toast.error('Failed to add category. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditCategory = async (e) => {
        e.preventDefault();
        if (!editCategoryName.trim() || !selectedCategory) return;

        try {
            setSubmitting(true);
            const response = await api.updateCategory(selectedCategory.id, { name: editCategoryName });

            if (response.ok) {
                setCategories(categories.map(cat =>
                    cat.id === selectedCategory.id ? response.data : cat
                ));
                setShowEditModal(false);
                setSelectedCategory(null);
                toast.success('Category updated successfully');
            } else {
                toast.error(response.data?.message || 'Failed to update category');
            }
        } catch (err) {
            console.error('Error updating category:', err);
            toast.error('Failed to update category. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (category) => {
        if (!window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
            return;
        }

        try {
            const response = await api.deleteCategory(category.id);

            if (response.ok) {
                setCategories(categories.filter(cat => cat.id !== category.id));
                toast.success('Category deleted successfully');
            } else {
                if (response.data?.productCounts > 0) {
                    toast.error(`Cannot delete category that contains ${response.data.productCounts} products`);
                } else {
                    toast.error(response.data?.message || 'Failed to delete category');
                }
            }
        } catch (err) {
            console.error('Error deleting category:', err);
            toast.error('Failed to delete category. Please try again.');
        }
    };

    const openEditModal = (category) => {
        setSelectedCategory(category);
        setEditCategoryName(category.name);
        setShowEditModal(true);
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAdmin) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Access denied. Administrator privileges required.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-primary">Categories</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Add New Category</span>
                    <span className="sm:hidden">Add New</span>
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="form-control">
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Search categories..."
                            className="input input-bordered w-full focus:outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="alert alert-error mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div className="flex justify-center items-center min-h-[300px]">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            ) : (
                <div className="overflow-x-auto bg-base-100 rounded-lg shadow-lg">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th className="hidden md:table-cell">Slug</th>
                                <th className="text-center">Products</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map(category => (
                                    <tr key={category.id}>
                                        <td className="font-medium">{category.name}</td>
                                        {/* Hide slug column on mobile */}
                                        <td className="hidden md:table-cell text-slate-500">{category.slug}</td>
                                        <td className="text-center">
                                            <div className="badge badge-primary">{category._count?.product || 0}</div>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    className="btn btn-sm btn-warning"
                                                    onClick={() => openEditModal(category)}
                                                >
                                                    <span className="hidden sm:inline">Edit</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-error"
                                                    onClick={() => handleDeleteCategory(category)}
                                                    disabled={category._count?.product > 0}
                                                >
                                                    <span className="hidden sm:inline">Delete</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-10">
                                        <div className="flex flex-col items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                            <p className="text-xl text-gray-500">No categories found</p>
                                            <button
                                                onClick={() => setShowAddModal(true)}
                                                className="btn btn-primary btn-sm mt-4"
                                            >
                                                Add Your First Category
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Category Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true" onClick={() => setShowAddModal(false)}>
                        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                    </div>
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-base-100 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50">
                            <div className="bg-base-100 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium">
                                            Add New Category
                                        </h3>
                                        <div className="mt-2">
                                            <form onSubmit={handleAddCategory}>
                                                <div className="form-control w-full">
                                                    <label className="label">
                                                        <span className="label-text">Category Name</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter category name"
                                                        className="input input-bordered w-full focus:outline-none"
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div className="mt-5 sm:mt-6 flex justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => setShowAddModal(false)}
                                                        disabled={submitting}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        disabled={!newCategoryName.trim() || submitting}
                                                    >
                                                        {submitting ? (
                                                            <>
                                                                <span className="loading loading-spinner loading-xs"></span>
                                                                Adding...
                                                            </>
                                                        ) : (
                                                            'Add Category'
                                                        )}
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
            )}

            {/* Edit Category Modal */}
            {showEditModal && selectedCategory && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true" onClick={() => setShowEditModal(false)}>
                        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                    </div>
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-base-100 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50">
                            <div className="bg-base-100 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium">
                                            Edit Category
                                        </h3>
                                        <div className="mt-2">
                                            <form onSubmit={handleEditCategory}>
                                                <div className="form-control w-full">
                                                    <label className="label">
                                                        <span className="label-text">Category Name</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter category name"
                                                        className="input input-bordered w-full"
                                                        value={editCategoryName}
                                                        onChange={(e) => setEditCategoryName(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div className="mt-5 sm:mt-6 flex justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => setShowEditModal(false)}
                                                        disabled={submitting}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        disabled={!editCategoryName.trim() || submitting}
                                                    >
                                                        {submitting ? (
                                                            <>
                                                                <span className="loading loading-spinner loading-xs"></span>
                                                                Updating...
                                                            </>
                                                        ) : (
                                                            'Update Category'
                                                        )}
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
            )}
        </div>
    );
}

export default CategoriesPage;