
import React from 'react';

type Props = {
    contactType: 'normal' | 'favorite';
    onAddToFavorites: () => void;
    onRemoveFromFavorites: () => void;
    editContacts: () => void;
    deleteContact: () => void;
    position: { x: number, y: number };
  };

const MiniPopup: React.FC<Props> = ({ contactType, onAddToFavorites, onRemoveFromFavorites, editContacts, deleteContact, position }) => {
  return (
    <div className="mini-popup" style={{ top: `${position.y}px`, left: `${position.x}px` }}>
      {contactType === 'normal' ? (
        <button onClick={onAddToFavorites}>Add to favorites</button>
      ) : (
        <button onClick={onRemoveFromFavorites}>Remove from favorites</button>
      )}
      <button onClick={editContacts}>Edit</button>
      <button onClick={deleteContact}>Delete</button>
    </div>
  );
};

export default MiniPopup;
