import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { pdfService } from '../services/api'; // Import pdfService
import {
    FolderIcon,
    DocumentTextIcon,
    TrashIcon,
    PencilSquareIcon,
    ChevronRightIcon,
    ChevronDownIcon
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
            console.log("Fetched structure:", data);
            setStructure(data);
        } catch (error) {
            console.error("Failed to fetch structure", error);
        }
        setLoading(false);
    };

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
            console.log("Saving data for:", selectedFile.pdfId || selectedFile._id); // Try pdfId first

            // Use pdfService to update Backend (Local File) + DB
            // Note: selectedFile.pdfId should be available from the DB record
            if (!selectedFile.pdfId) {
                alert("Cannot update: Missing PDF ID in record");
                return;
            }

            await pdfService.updateExtractedData(selectedFile.pdfId, {
                statements: parsedData
            });

            alert("Data updated successfully!");
            setIsEditing(false);

            // Refresh the current view
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
                fetchStructure(); // Refresh list
            } catch (error) {
                alert("Failed to delete");
            }
        }
    };

    if (loading) return <div className="p-10 text-center">Loading data structure...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar / File Tree */}
            <div className={`bg-white border-r w-1/3 overflow-y-auto p-4 ${viewMode === 'detail' ? 'hidden md:block' : 'w-full'}`}>
                <h2 className="text-xl font-bold mb-4 text-gray-800">Data Repository</h2>
                {structure.length === 0 && <p className="text-gray-500">No data found.</p>}

                {structure.map((sectorGroup) => (
                    <div key={sectorGroup._id} className="mb-2">
                        {/* Sector Node */}
                        <div
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                            onClick={() => toggleSector(sectorGroup._id)}
                        >
                            {expandedSectors[sectorGroup._id] ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                            <FolderIcon className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold">{sectorGroup._id}</span>
                        </div>

                        {/* Companies */}
                        {expandedSectors[sectorGroup._id] && (
                            <div className="ml-6 border-l-2 border-gray-100 pl-2">
                                {sectorGroup.companies.map((companyGroup) => (
                                    <div key={companyGroup.company}>
                                        <div
                                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                                            onClick={() => toggleCompany(companyGroup.company)}
                                        >
                                            {expandedCompanies[companyGroup.company] ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                            <FolderIcon className="w-5 h-5 text-green-500" />
                                            <span>{companyGroup.company}</span>
                                        </div>

                                        {/* Years */}
                                        {expandedCompanies[companyGroup.company] && (
                                            <div className="ml-6 border-l-2 border-gray-100 pl-2">
                                                {companyGroup.years.map((yearGroup) => (
                                                    <div key={yearGroup.year}>
                                                        <div
                                                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                                                            onClick={() => toggleYear(companyGroup.company + yearGroup.year)}
                                                        >
                                                            {expandedYears[companyGroup.company + yearGroup.year] ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                            <FolderIcon className="w-5 h-5 text-yellow-500" />
                                                            <span>{yearGroup.year}</span>
                                                        </div>

                                                        {/* Files */}
                                                        {expandedYears[companyGroup.company + yearGroup.year] && (
                                                            <div className="ml-6">
                                                                {yearGroup.files.map((file) => (
                                                                    <div
                                                                        key={file.id}
                                                                        className={`flex items-center space-x-2 cursor-pointer p-2 rounded ${selectedFile?._id === file.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                                                                        onClick={() => handleFileClick(file.id)}
                                                                    >
                                                                        <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                                                                        <span className="text-sm">{file.type}</span>
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
            {(viewMode === 'detail' && selectedFile) && (
                <div className="w-full md:w-2/3 p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{selectedFile.company} - {selectedFile.year}</h1>
                            <p className="text-gray-500">{selectedFile.type}</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleDelete(selectedFile._id)}
                                className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                                <TrashIcon className="w-4 h-4" />
                                <span>Delete</span>
                            </button>
                            {!isEditing ? (
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    <span>Edit</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSave}
                                        className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setViewMode('list')} // On mobile go back
                                className="md:hidden px-3 py-2 bg-gray-200 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 overflow-x-auto">
                            {isEditing ? (
                                <textarea
                                    className="w-full h-screen p-2 border rounded font-mono text-sm"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                            ) : (
                                JSON.stringify(selectedFile.data, null, 2)
                            )}
                        </pre>
                    </div>
                </div>
            )}

            {(viewMode === 'detail' && !selectedFile) && (
                <div className="w-2/3 flex items-center justify-center text-gray-400">
                    Select a file to view content
                </div>
            )}
        </div>
    );
};

export default DataExplorer;
