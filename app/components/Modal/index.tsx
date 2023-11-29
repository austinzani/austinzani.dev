import React, { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    closeModal: () => void;
    children: React.ReactNode;
}

const Modal = ({ isOpen, closeModal, children }: ModalProps) => {
    useEffect(() => {
        // Prevent scrolling on the body when the modal is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto">
                    <div className="fixed inset-0 transition-opacity">
                        <div
                            className="absolute inset-0 bg-black opacity-50"
                            onClick={closeModal}
                        ></div>
                    </div>
                    <div className="relative z-50 bg-white border-1 border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 p-4 rounded-lg shadow-lg max-w-[95%] max-h-[95%]">
                        {children}
                    </div>
                </div>
            )}
        </>
    );
};

export default Modal;
