import React from 'react';
import toast from 'react-hot-toast';

export default function FloatingExtensionButton() {
  const handleClick = (e) => {
    e.preventDefault();
    const link = document.createElement('a');
    link.href = '/careerpilot-extension.zip';
    link.download = 'careerpilot-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Extension downloaded! Extract the ZIP and load it via chrome://extensions', { 
      duration: 5000,
      position: 'top-center'
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <span className="animate-bounce whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-md border border-gray-200">
        Download your extension here 👇
      </span>
      <button
        onClick={handleClick}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Download Chrome Extension"
        title="Download Chrome Extension"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M19.07 4.93a10 10 0 0 0-14.14 0c-1.5 1.5-2.29 3.61-2.24 5.76.04 1.83.67 3.63 1.94 5L7 18.07l2.83-2.83 2.83 2.83 2.83-2.83 2.83 2.83 4.24-4.24c1.27-1.37 1.9-3.17 1.94-5 .05-2.15-.74-4.26-2.24-5.76a10 10 0 0 0-3.19-2.14" />
        </svg>
      </button>
    </div>
  );
}
