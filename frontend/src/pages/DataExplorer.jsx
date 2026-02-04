import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { pdfService } from '../services/api';
import {
    FolderIcon,
    DocumentTextIcon,
    TrashIcon,
    PencilSquareIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    HomeIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const DataExplorer = () => {
    const [structure, setStructure] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSectors, setExpandedSectors] = useState({});
    const [expandedCompanies, setExpandedCompanies] = useState({});
    const [expandedYears, setExpandedYears] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        fetchStructure();
    }, []);

    const fetchStructure = async () => {
        setLoading(true);
        try {
            const data = await dataService.getStructure();
            setStructure(data);
        } catch (error) {
            console.error("Failed to fetch structure", error);
        }
        setLoading(false);
    };

    // --- Repository Actions ---

    const toggleSector = (sector) => {
        setExpandedSectors(prev => ({ ...prev, [sector]: !prev[sector] }));
    };

    const toggleCompany = (company) => {
        setExpandedCompanies(prev => ({ ...prev, [company]: !prev[company] }));
    };

    const toggleYear = (yearId) => {
        setExpandedYears(prev => ({ ...prev, [yearId]: !prev[yearId] }));
    };

    const handleFileClick = async (fileId) => {
        try {
            const data = await dataService.getDataById(fileId);
            setSelectedFile(data);
            setViewMode('detail');
        } catch (error) {
            console.error("Failed to load file", error);
        }
    };

    const handleEdit = () => {
        if (selectedFile && selectedFile.data) {
            setEditContent(JSON.stringify(selectedFile.data, null, 2));
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        try {
            const parsedData = JSON.parse(editContent);

            if (!selectedFile.pdfId) {
                alert("Cannot update: Missing PDF ID in record");
                return;
            }

            await pdfService.updateExtractedData(selectedFile.pdfId, {
                statements: parsedData
            });

            alert("Data updated successfully!");
            setIsEditing(false);
            await handleFileClick(selectedFile._id);

        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update data. Check console for details.");
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditContent('');
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this record?")) {
            try {
                await dataService.deleteData(id);
                setSelectedFile(null);
                setViewMode('list');
                fetchStructure();
            } catch (error) {
                alert("Failed to delete");
            }
        }
    };

    if (loading) return <div className="p-10 text-center">Loading data structure...</div>;

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/home')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <HomeIcon className="w-6 h-6 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Data Repository</h1>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar / File Tree */}
                <div className={`bg-white border-r w-1/3 min-w-[300px] overflow-y-auto p-4 custom-scrollbar ${viewMode === 'detail' ? 'hidden md:block' : 'w-full'}`}>
                    {structure.length === 0 && <p className="text-gray-500 text-sm p-4">No data found in repository.</p>}

                    {structure.map((sectorGroup) => (
                        <div key={sectorGroup._id} className="mb-2">
                            {/* Sector Node */}
                            <div
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded text-sm"
                                onClick={() => toggleSector(sectorGroup._id)}
                            >
                                {expandedSectors[sectorGroup._id] ? <ChevronDownIcon className="w-4 h-4 text-gray-500" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                                <FolderIcon className="w-5 h-5 text-blue-500" />
                                <span className="font-semibold text-gray-700">{sectorGroup._id}</span>
                            </div>

                            {/* Companies */}
                            {expandedSectors[sectorGroup._id] && (
                                <div className="ml-5 border-l-2 border-gray-100 pl-1">
                                    {sectorGroup.companies.map((companyGroup) => (
                                        <div key={companyGroup.company}>
                                            <div
                                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded text-sm"
                                                onClick={() => toggleCompany(companyGroup.company)}
                                            >
                                                {expandedCompanies[companyGroup.company] ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                                                <FolderIcon className="w-5 h-5 text-green-500" />
                                                <span className="text-gray-700">{companyGroup.company}</span>
                                            </div>

                                            {/* Years */}
                                            {expandedCompanies[companyGroup.company] && (
                                                <div className="ml-5 border-l-2 border-gray-100 pl-1">
                                                    {companyGroup.years.map((yearGroup) => (
                                                        <div key={yearGroup.year}>
                                                            <div
                                                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded text-sm"
                                                                onClick={() => toggleYear(companyGroup.company + yearGroup.year)}
                                                            >
                                                                {expandedYears[companyGroup.company + yearGroup.year] ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                                                                <FolderIcon className="w-5 h-5 text-yellow-500" />
                                                                <span className="text-gray-600">{yearGroup.year}</span>
                                                            </div>

                                                            {/* Files */}
                                                            {expandedYears[companyGroup.company + yearGroup.year] && (
                                                                <div className="ml-6">
                                                                    {yearGroup.files.map((file) => (
                                                                        <div
                                                                            key={file.id}
                                                                            className={`flex items-center space-x-2 cursor-pointer p-2 rounded text-sm ${selectedFile?._id === file.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
                                                                            onClick={() => handleFileClick(file.id)}
                                                                        >
                                                                            <DocumentTextIcon className="w-4 h-4 opacity-75" />
                                                                            <span className="truncate">{file.type}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Detail View */}
                <div className={`flex-1 bg-gray-50 overflow-y-auto p-6 relative ${viewMode === 'list' ? 'hidden md:block' : 'w-full'}`}>
                    {selectedFile ? (
                        <div className="bg-white shadow-sm rounded-xl p-6 min-h-full">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedFile.company}</h2>
                                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedFile.year}</span>
                                        <span>•</span>
                                        <span>{selectedFile.type}</span>
                                    </div>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => setViewMode('list')} // On mobile go back
                                        className="md:hidden px-3 py-2 bg-gray-200 rounded"
                                    >
                                        Back
                                    </button>

                                    {!isEditing ? (
                                        <>
                                            <button onClick={handleEdit} className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                                <PencilSquareIcon className="w-4 h-4" />
                                                <span>Edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(selectedFile._id)} className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                                <span>Delete</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={handleCancel} className="px-4 py-2 text-gray-600 hover:text-gray-900">Cancel</button>
                                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">Save Changes</button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="relative">
                                {isEditing ? (
                                    <textarea
                                        className="w-full h-[600px] p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                    />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                                        {JSON.stringify(selectedFile.data, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <DocumentTextIcon className="w-16 h-16 mb-4 opacity-50" />
                            <p>Select a file from the repository to view content</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataExplorer;
