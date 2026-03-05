import { useState, useCallback } from 'react';

export default function useModalClose(onClose, duration = 300) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, duration);
  }, [onClose, duration, isClosing]);

  return { isClosing, handleClose };
}
