import React, { useCallback, useState } from 'react';
import { CloudArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline';

const Dropzone = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect?.(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
        isDragging
          ? 'border-slate-400 bg-slate-50'
          : selectedFile
          ? 'border-slate-400 bg-slate-50'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      {selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
            <DocumentIcon className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={() => { setSelectedFile(null); }}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <CloudArrowUpIcon className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Drop your PDF here, or{' '}
              <label className="text-slate-900 underline cursor-pointer hover:text-black">
                browse
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF files only, up to 50MB</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropzone;
