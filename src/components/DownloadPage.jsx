import React, { useEffect, useState } from 'react';

const DownloadPage = () => {
  // Extract fileId from URL path
  const getFileIdFromPath = () => {
    const path = window.location.pathname;
    const match = path.match(/\/download\/(.+)$/);
    return match ? match[1] : null;
  };

  const [fileId] = useState(getFileIdFromPath());
  const [downloadStatus, setDownloadStatus] = useState('loading'); // loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    if (!fileId) {
      setDownloadStatus('error');
      setErrorMessage('No file ID provided');
      return;
    }

    const downloadFile = async () => {
      try {
        setDownloadStatus('loading');
        
        // Make GET request to the backend
        const response = await fetch(`https://upload-qodp.onrender.com/download/${fileId}`, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        // Get file info from headers if available
        const contentDisposition = response.headers.get('content-disposition');
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        let filename = 'download';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }

        // Convert response to blob
        const blob = await response.blob();
        
        // Create download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setFileInfo({
          filename,
          size: contentLength ? parseInt(contentLength) : blob.size,
          type: contentType || 'application/octet-stream'
        });
        setDownloadStatus('success');

      } catch (error) {
        console.error('Download error:', error);
        setDownloadStatus('error');
        setErrorMessage(error.message || 'Failed to download file');
      }
    };

    downloadFile();
  }, [fileId]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const retryDownload = () => {
    window.location.reload();
  };

  const goToUpload = () => {
    window.location.href = '/';
  };

  if (downloadStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-purple-600 flex items-center justify-center p-5">
        <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl max-w-md w-full text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-2xl font-light text-gray-800 mb-4">Preparing Download</h2>
          <p className="text-gray-600 mb-4">Please wait while we fetch your file...</p>
          <div className="text-sm text-gray-500">File ID: {fileId}</div>
        </div>
      </div>
    );
  }

  if (downloadStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-red-600 flex items-center justify-center p-5">
        <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl max-w-md w-full text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-light text-gray-800 mb-4">Download Failed</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <button
              onClick={retryDownload}
              className="w-full bg-gradient-to-r from-red-400 to-red-500 text-white px-6 py-3 rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              🔄 Try Again
            </button>
            <button
              onClick={goToUpload}
              className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white px-6 py-3 rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              📁 Upload New Files
            </button>
          </div>
          {fileId && (
            <div className="mt-6 p-3 bg-gray-100 rounded-lg">
              <div className="text-xs text-gray-500">File ID: {fileId}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (downloadStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 flex items-center justify-center p-5">
        <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl max-w-md w-full text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-light text-gray-800 mb-4">Download Complete!</h2>
          <p className="text-gray-600 mb-6">Your file has been downloaded successfully.</p>
          
          {fileInfo && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <div className="text-sm text-gray-600 mb-2">File Details:</div>
              <div className="font-medium text-gray-800">{fileInfo.filename}</div>
              <div className="text-sm text-gray-500">{formatFileSize(fileInfo.size)}</div>
              <div className="text-xs text-gray-400">{fileInfo.type}</div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={retryDownload}
              className="w-full bg-gradient-to-r from-teal-400 to-blue-500 text-white px-6 py-3 rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              📥 Download Again
            </button>
            <button
              onClick={goToUpload}
              className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white px-6 py-3 rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              📁 Upload New Files
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Files are automatically deleted after 24 hours
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DownloadPage;