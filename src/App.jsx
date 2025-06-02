import React, { useState, useRef, useEffect } from 'react';

// Simple Router Component
const Router = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  return React.Children.map(children, child => 
    React.cloneElement(child, { currentPath, navigate })
  );
};

const Route = ({ path, component: Component, currentPath, navigate, exact = false }) => {
  const isMatch = exact ? currentPath === path : currentPath.startsWith(path);
  return isMatch ? <Component navigate={navigate} /> : null;
};

// File Upload Service Component
const FileUploadService = ({ navigate }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef(null);
  const uploadAreaRef = useRef(null);

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setResult(null);
  };

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    uploadAreaRef.current?.classList.add('dragover');
  };

  const handleDragLeave = () => {
    uploadAreaRef.current?.classList.remove('dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    uploadAreaRef.current?.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              resolve(xhr.responseText);
            }
          } else {
            reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed - Network error'));
        xhr.open('POST', 'https://upload-qodp.onrender.com/upload');
        xhr.send(formData);
      });

      // Handle successful upload - convert backend download URL to frontend URL
      const backendDownloadLink = response.downloadLink || response.url || response.link;
      let frontendDownloadUrl = '';
      
      if (backendDownloadLink) {
        // Extract file ID from backend URL (e.g., /download/80e17ee-d1c8-4df2-b18c-bcfd842866d9)
        const fileIdMatch = backendDownloadLink.match(/\/download\/(.+)$/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          // Convert to frontend URL
          frontendDownloadUrl = `${window.location.origin}/download/${fileId}`;
        } else {
          // Fallback to original URL if pattern doesn't match
          frontendDownloadUrl = backendDownloadLink.startsWith('http') 
            ? backendDownloadLink 
            : `https://upload-qodp.onrender.com${backendDownloadLink}`;
        }
      }

      setResult({
        type: 'success',
        downloadUrl: frontendDownloadUrl,
        backendUrl: backendDownloadLink,
        files: response.files || selectedFiles.map(f => ({ name: f.name })),
        response: response
      });

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      setResult({
        type: 'error',
        message: error.message || 'Upload failed'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const toggleQR = async (url) => {
    if (!showQR) {
      setQrLoading(true);
      setShowQR(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setQrLoading(false);
    } else {
      setShowQR(false);
      setQrLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-purple-600 flex items-center justify-center p-5">
      <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl max-w-2xl w-full text-center">
        <h1 className="text-4xl font-light text-gray-800 mb-8">📁 File Share</h1>
        <p className="text-gray-600 mb-8">Upload your files and get a shareable download link</p>

        <div
          ref={uploadAreaRef}
          className="border-3 border-dashed border-blue-400 rounded-2xl p-10 mb-8 transition-all duration-300 cursor-pointer bg-gradient-to-br from-blue-50 to-purple-50 hover:border-purple-500 hover:bg-gradient-to-br hover:from-blue-100 hover:to-purple-100 hover:-translate-y-1"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-5xl text-blue-400 mb-4">☁️</div>
          <div className="text-lg text-gray-600 mb-2">Click to upload files or drag & drop</div>
          <div className="text-sm text-gray-400">Maximum 10 files, 50MB per file</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {selectedFiles.length > 0 && (
          <div className="mb-6 text-left">
            {selectedFiles.map((file, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg mb-2 flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-800">{file.name}</div>
                  <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="mb-6">
            <button
              onClick={uploadFiles}
              disabled={isUploading}
              className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-8 py-3 rounded-full text-lg mr-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </button>
            <button
              onClick={clearFiles}
              className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-3 rounded-full text-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              Clear Files
            </button>
          </div>
        )}

        {result && (
          <div className={`p-6 rounded-2xl ${
            result.type === 'success' 
              ? 'bg-gradient-to-r from-teal-400 to-green-500 text-white' 
              : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
          }`}>
            {result.type === 'success' ? (
              <>
                <h3 className="text-xl font-semibold mb-3">✅ Upload Successful!</h3>
                <p className="mb-3">Your files have been uploaded successfully.</p>
                <p className="mb-6">
                  <strong>Files:</strong> {result.files.map(f => f.name).join(', ')}
                </p>
                
                <a
                  href={result.downloadUrl}
                  className="inline-block bg-white bg-opacity-20 text-white px-6 py-3 rounded-full mb-6 hover:bg-opacity-30 hover:-translate-y-1 transition-all duration-300 font-medium"
                >
                  📥 Download Files
                </a>

                <div className="bg-white bg-opacity-10 p-6 rounded-2xl border border-white border-opacity-20">
                  <h4 className="text-lg mb-4">📤 Share this link</h4>
                  
                  <div className="flex gap-3 mb-4 flex-wrap">
                    <input
                      type="text"
                      value={result.downloadUrl}
                      readOnly
                      className="flex-1 px-4 py-3 rounded-full bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70 border border-white border-opacity-30 focus:outline-none focus:border-opacity-50 focus:bg-opacity-30 min-w-48"
                    />
                    <button
                      onClick={() => copyToClipboard(result.downloadUrl)}
                      className={`px-6 py-3 rounded-full transition-all duration-300 ${
                        copySuccess 
                          ? 'bg-teal-400 text-white' 
                          : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                      }`}
                    >
                      {copySuccess ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => toggleQR(result.downloadUrl)}
                      disabled={qrLoading}
                      className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-2xl text-sm hover:bg-opacity-30 transition-all duration-300 disabled:opacity-60"
                    >
                      {qrLoading ? '⏳ Generating...' : showQR ? '🔼 Hide QR Code' : '📱 Show QR Code'}
                    </button>
                    
                    {showQR && (
                      <div className="mt-4 inline-block">
                        {qrLoading ? (
                          <div className="bg-white p-5 rounded-lg shadow-lg">
                            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-lg shadow-lg">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.downloadUrl)}`}
                              alt="QR Code"
                              className="max-w-48 h-auto block mx-auto"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-xs opacity-80">
                  Files will be deleted after 24 hours.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-3">❌ Upload Failed</h3>
                <p>{result.message}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Download Page Component  
const DownloadPage = ({ navigate }) => {
  const getFileIdFromPath = () => {
    const path = window.location.pathname;
    const match = path.match(/\/download\/(.+)$/);
    return match ? match[1] : null;
  };

  const [fileId] = useState(getFileIdFromPath());
  const [downloadStatus, setDownloadStatus] = useState('loading');
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
        
        const response = await fetch(`https://upload-qodp.onrender.com/download/${fileId}`, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

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

        const blob = await response.blob();
        
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
    navigate('/');
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
        </div>
      </div>
    );
  }

  return null;
};

// Main App Component with Routing
const App = () => {
  return (
    <Router>
      <Route path="/" component={FileUploadService} exact />
      <Route path="/download/" component={DownloadPage} />
    </Router>
  );
};

export default App;