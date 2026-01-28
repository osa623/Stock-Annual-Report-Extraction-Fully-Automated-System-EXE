const BASE_URL = import.meta.env.VITE_APP_URL || "http://localhost:5001/api";

export const API_ENDPOINTS = {
    BASE_URL,
    LOGIN: `${BASE_URL}/admin/login`,
    REGISTER: `${BASE_URL}/admin/register`,
    GET_ADMIN: `${BASE_URL}/admin/:id`,
    SETUP_MFA: `${BASE_URL}/auth/setup`,
    VERIFY_MFA: `${BASE_URL}/auth/login`
};
