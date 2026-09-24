import { useEffect, useState } from 'react';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface RoomGalleryModalProps {
  roomNickname: string;
  photos: string[];
  onClose: () => void;
}

export function RoomGalleryModal({ roomNickname, photos, onClose }: RoomGalleryModalProps) {
  const { ref, titleId } = useDialogA11y<HTMLDivElement>(onClose);
  const [index, setIndex] = useState(0);

  function goPrev() {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function goNext() {
    setIndex((i) => (i + 1) % photos.length);
  }

  // Arrow-key navigation on the same element useDialogA11y already traps
  // focus and Escape on — both listeners fire independently, no conflict.
  useEffect(() => {
    const node = ref.current;
    if (!node || photos.length < 2) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
      if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
    }

    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, [ref, photos.length]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="modal-content gallery-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gallery-header">
          <h2 id={titleId}>{roomNickname}</h2>
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="gallery-viewport">
          {photos.length > 1 && (
            <button type="button" className="gallery-nav gallery-nav-prev" aria-label="Previous photo" onClick={goPrev}>
              ‹
            </button>
          )}
          <img
            key={index}
            src={photos[index]}
            alt={`Photo ${index + 1} of ${photos.length} of ${roomNickname}`}
            className="gallery-image"
          />
          {photos.length > 1 && (
            <button type="button" className="gallery-nav gallery-nav-next" aria-label="Next photo" onClick={goNext}>
              ›
            </button>
          )}
        </div>

        {photos.length > 1 && (
          <p className="gallery-counter">
            {index + 1} / {photos.length}
          </p>
        )}
      </div>
    </div>
  );
}
