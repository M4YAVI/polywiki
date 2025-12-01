import React, { useEffect, useState } from 'react';

interface Favorite {
    id: string;
    label: string;
    content: string;
    type: string;
    createdAt: string;
}

interface FavoritesModalProps {
    onClose: () => void;
    onSelect: (favorite: Favorite) => void;
}

const FavoritesModal: React.FC<FavoritesModalProps> = ({ onClose, onSelect }) => {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFavorites = favorites.filter(fav =>
        fav.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        fetch('/api/favorites')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setFavorites(data);
                } else {
                    console.error('Unexpected response format:', data);
                    setFavorites([]);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch favorites', err);
                setFavorites([]);
                setIsLoading(false);
            });
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
            setFavorites(prev => prev.filter(f => f.id !== id));
        } catch (err) {
            console.error('Failed to delete favorite', err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                maxWidth: '600px',
                width: '90%',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div className="modal-header" style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        color: '#fff',
                        textTransform: 'uppercase'
                    }}>FAVOURITES DATABASE</h2>
                    <button onClick={onClose} className="close-button" style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        lineHeight: 1,
                        transition: 'color 0.2s'
                    }}>×</button>
                </div>

                {!isLoading && favorites.length > 0 && (
                    <div style={{ padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <input
                            type="text"
                            placeholder="Search favorites..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                color: 'white',
                                outline: 'none',
                                fontSize: '1rem',
                                transition: 'all 0.2s'
                            }}
                            className="search-input"
                        />
                    </div>
                )}

                <div className="modal-body" style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {isLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontStyle: 'italic' }}>Accessing Neural Archives...</div>
                    ) : favorites.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>♡</div>
                            <p>No favorites saved yet.</p>
                        </div>
                    ) : filteredFavorites.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                            <p>No matches found for "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {filteredFavorites.map(fav => (
                                <div
                                    key={fav.id}
                                    onClick={() => { onSelect(fav); onClose(); }}
                                    className="favorite-item"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1.2rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>{fav.label}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>{fav.type} • {new Date(fav.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, fav.id)}
                                        className="delete-btn"
                                        style={{
                                            background: 'rgba(255, 68, 68, 0.1)',
                                            border: '1px solid rgba(255, 68, 68, 0.2)',
                                            color: '#ff4444',
                                            cursor: 'pointer',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            transition: 'all 0.2s'
                                        }}
                                        title="Remove from database"
                                    >
                                        DELETE
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .search-input:focus {
                    background: rgba(255,255,255,0.05) !important;
                    border-color: rgba(255,255,255,0.3) !important;
                }
                .favorite-item:hover {
                    background: rgba(255,255,255,0.08) !important;
                    border-color: rgba(255,255,255,0.2) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .close-button:hover { color: #fff !important; }
                .delete-btn:hover {
                    background: rgba(255, 68, 68, 0.2) !important;
                    border-color: rgba(255, 68, 68, 0.4) !important;
                }
                /* Custom Scrollbar */
                .modal-body::-webkit-scrollbar { width: 6px; }
                .modal-body::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
                .modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
                .modal-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
};

export default FavoritesModal;
