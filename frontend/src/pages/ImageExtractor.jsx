import React, { useState, useEffect } from 'react';
import { pdfService } from '../services/api';
import FolderTree from '../components/FolderTree';
import {
    PhotoIcon,
    PlayIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    HomeIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const ImageExtractor = () => {
    const [loading, setLoading] = useState(true);
    const [rawImagesStructure, setRawImagesStructure] = useState(null);
    const [selectedRawNode, setSelectedRawNode] = useState(null);
    const [extractionStatus, setExtractionStatus] = useState({ loading: false, message: '', results: null });

    const navigate = useNavigate();

    useEffect(() => {
        fetchRawImages();
    }, []);

    const fetchRawImages = async () => {
        setLoading(true);
        try {
            const data = await pdfService.getRawImagesStructure();
            // Wrap in root node for FolderTree
            setRawImagesStructure({
                name: "Raw Images",
                type: "directory",
                path: "",
                children: data
            });
        } catch (error) {
            console.error("Failed to fetch raw images", error);
        }
        setLoading(false);
    };

    const handleRawNodeSelect = (node) => {
        setSelectedRawNode(node);
        setExtractionStatus({ loading: false, message: '', results: null }); // Reset status
    };

    const handleExtractSingle = async () => {
        if (!selectedRawNode || selectedRawNode.type !== 'file') return;

        setExtractionStatus({ loading: true, message: 'Extracting...', results: null });
        try {
            const result = await pdfService.extractFromImage(selectedRawNode.path);
            setExtractionStatus({
                loading: false,
                message: 'Extraction Complete',
                results: result
            });
        } catch (error) {
            setExtractionStatus({ loading: false, message: `Error: ${error.message}`, results: null });
        }
    };

    const collectImagePaths = (node) => {
        let paths = [];
        if (node.type === 'file') {
            // Check extension
            if (node.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) {
                paths.push(node.path);
            }
        } else if (node.children) {
            node.children.forEach(child => {
                paths = paths.concat(collectImagePaths(child));
            });
        }
        return paths;
    };

    const handleExtractBatch = async () => {
        if (!selectedRawNode) return;

        const paths = collectImagePaths(selectedRawNode);
        if (paths.length === 0) {
            alert("No images found in this folder.");
            return;
        }

        if (!window.confirm(`Found ${paths.length} images. Start batch extraction? This may take time.`)) return;

        setExtractionStatus({ loading: true, message: `Starting batch extraction for ${paths.length} images...`, results: null });

        try {
            const result = await pdfService.extractBatch(paths);
            setExtractionStatus({
                loading: false,
                message: `Batch complete: ${result.summary}`,
                results: result
            });
        } catch (error) {
            setExtractionStatus({ loading: false, message: `Batch Error: ${error.message}`, results: null });
        }
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/home')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <HomeIcon className="w-6 h-6 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Raw Image Extraction</h1>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-1/3 min-w-[300px] border-r bg-white flex flex-col">
                    {/* Tree Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {loading ? (
                            <div className="text-center p-10 text-gray-400">Loading...</div>
                        ) : (
                            <div className="h-full">
                                <FolderTree
                                    data={rawImagesStructure}
                                    title="Raw Image Folder"
                                    onSelect={handleRawNodeSelect}
                                    selectedPath={selectedRawNode?.path}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-gray-50 overflow-y-auto p-6 relative">
                    {selectedRawNode ? (
                        <div className="bg-white shadow-sm rounded-xl p-6 min-h-full flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 break-all">{selectedRawNode.name}</h2>
                                    <p className="text-sm text-gray-500 mt-1 font-mono break-all">{selectedRawNode.path}</p>
                                </div>
                                <div className="flex space-x-3">
                                    {selectedRawNode.type === 'file' ? (
                                        <button
                                            onClick={handleExtractSingle}
                                            disabled={extractionStatus.loading}
                                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm text-white ${extractionStatus.loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                        >
                                            {extractionStatus.loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
                                            <span>Extract Data</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleExtractBatch}
                                            disabled={extractionStatus.loading}
                                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm text-white ${extractionStatus.loading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                                        >
                                            {extractionStatus.loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
                                            <span>Process Folder (Batch)</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedRawNode.type === 'file' && (
                                <div className="mb-6 bg-gray-100 rounded-lg p-4 flex justify-center border border-dashed border-gray-300">
                                    <img
                                        src={pdfService.getRawImageUrl(selectedRawNode.path)}
                                        alt={selectedRawNode.name}
                                        className="max-h-[500px] object-contain shadow-md rounded"
                                    />
                                </div>
                            )}

                            {/* Extraction Results Area */}
                            {(extractionStatus.loading || extractionStatus.message || extractionStatus.results) && (
                                <div className={`rounded-lg p-4 border ${extractionStatus.loading ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center mb-2">
                                        {extractionStatus.loading && <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />}
                                        {!extractionStatus.loading && extractionStatus.results && <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />}
                                        <span className="font-medium">{extractionStatus.message}</span>
                                    </div>

                                    {extractionStatus.results && (
                                        <div className="mt-4">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Extraction Result</h4>
                                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[400px]">
                                                {JSON.stringify(extractionStatus.results, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <PhotoIcon className="w-16 h-16 mb-4 opacity-50" />
                            <p>Select an image or folder to view actions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageExtractor;
