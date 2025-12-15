// components/custom/modals/ImagePreviewModal.tsx
import React from 'react';
import { FaTimes, FaDownload, FaExpand } from 'react-icons/fa';
import { baseURL } from '../../libs/apiConfig';

interface ImagePreviewModalProps {
  imageUrl: string;
  title: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  title,
  onClose
}) => {

  const handleFullscreen = () => {
    const image = new Image();
    image.src = imageUrl;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                background: #f5f5f5; 
              }
              img { 
                max-width: 100%; 
                max-height: 95vh; 
                object-fit: contain; 
                border-radius: 8px; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <img src="${baseURL}${imageUrl}" alt="${title}" />
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center gap-2">
            {/* <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download Image"
            >
              <FaDownload className="w-4 h-4" />
            </button> */}
            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in Fullscreen"
            >
              <FaExpand className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto">
          <div className="flex justify-center">
            <img
              src={baseURL + imageUrl}
              alt={title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;