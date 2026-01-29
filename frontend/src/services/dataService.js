import { API_ENDPOINTS } from '../api/endpoints';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const dataService = {
    // Save extracted data to MongoDB
    saveData: async (payload) => {
        try {
            const res = await fetch(API_ENDPOINTS.DATA.SAVE, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (error) {
            console.error("Save Data Error:", error);
            throw error;
        }
    },

    // Get hierarchical folder structure
    getStructure: async () => {
        try {
            const res = await fetch(API_ENDPOINTS.DATA.STRUCTURE, {
                headers: getHeaders()
            });
            return await res.json();
        } catch (error) {
            console.error("Get Structure Error:", error);
            throw error;
        }
    },

    // Get specific record
    getDataById: async (id) => {
        try {
            const res = await fetch(`${API_ENDPOINTS.DATA.BASE}/${id}`, {
                headers: getHeaders()
            });
            return await res.json();
        } catch (error) {
            console.error("Get Data Error:", error);
            throw error;
        }
    },

    // Update specific record
    updateData: async (id, data) => {
        try {
            const res = await fetch(`${API_ENDPOINTS.DATA.BASE}/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ data })
            });
            return await res.json();
        } catch (error) {
            console.error("Update Data Error:", error);
            throw error;
        }
    },

    // Delete specific record
    deleteData: async (id) => {
        try {
            const res = await fetch(`${API_ENDPOINTS.DATA.BASE}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            return await res.json();
        } catch (error) {
            console.error("Delete Data Error:", error);
            throw error;
        }
    }
};
