import { api } from "./api";

/**
 * Axios-based API helper for Redux Toolkit async thunks.
 * Provides cleaner API calls with automatic error handling.
 */

/**
 * GET request helper
 * @param {string} url - API endpoint
 * @param {object} config - Optional axios config
 * @returns {Promise} - Response data
 */
export const apiGet = async (url, config = {}) => {
    const response = await api.get(url, config);
    return response.data;
};

/**
 * POST request helper
 * @param {string} url - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Optional axios config
 * @returns {Promise} - Response data
 */
export const apiPost = async (url, data = {}, config = {}) => {
    const response = await api.post(url, data, config);
    return response.data;
};

/**
 * PUT request helper
 * @param {string} url - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Optional axios config
 * @returns {Promise} - Response data
 */
export const apiPut = async (url, data = {}, config = {}) => {
    const response = await api.put(url, data, config);
    return response.data;
};

/**
 * PATCH request helper
 * @param {string} url - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Optional axios config
 * @returns {Promise} - Response data
 */
export const apiPatch = async (url, data = {}, config = {}) => {
    const response = await api.patch(url, data, config);
    return response.data;
};

/**
 * DELETE request helper
 * @param {string} url - API endpoint
 * @param {object} config - Optional axios config
 * @returns {Promise} - Response data
 */
export const apiDelete = async (url, config = {}) => {
    const response = await api.delete(url, config);
    return response.data;
};

export default api;