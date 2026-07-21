import React, { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    closeModal: () => void;
    children: React.ReactNode;
}

const Modal = ({ isOpen, closeModal, children }: ModalProps) => {
    useEffect(() => {
        // The <html> element has overflow-x-hidden, which forces its computed
        // overflow-y to auto — making it the actual scrolling element. Locking
        // only document.body has no effect, so both must be locked here.
        if (isOpen) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }

        // Cleanup function
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-4">
                    <div className="fixed inset-0 transition-opacity">
                        <div
                            className="absolute inset-0 bg-black opacity-50"
                            onClick={closeModal}
                        ></div>
                    </div>
                    <div className="relative z-50 max-h-[90dvh] max-w-full overflow-hidden bg-surface p-2 shadow-2xl">
                        {children}
                    </div>
                </div>
            )}
        </>
    );
};

export default Modal;
