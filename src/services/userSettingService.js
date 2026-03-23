import { userSettingApi } from '../lib/apiClient';

const BASE = '/api/v1/settings';

/**
 * GET /api/v1/settings
 * Fetch general and certification settings for the current user.
 * @returns {Promise<{ general: GeneralSettings, certification: CertificationSettings }>}
 */
export const fetchSettings = () => userSettingApi.get(BASE);

/**
 * PUT /api/v1/settings/general
 * Update general settings (language, theme, notifications, etc.)
 * @param {Object} data - GeneralSettingsUpdate payload
 * @returns {Promise<GeneralSettings>}
 */
export const updateGeneralSettings = (data) =>
  userSettingApi.put(`${BASE}/general`, data);

/**
 * PUT /api/v1/settings/certification
 * Update certification/SSL settings.
 * @param {Object} data - CertificationSettingsUpdate payload
 * @returns {Promise<CertificationSettings>}
 */
export const updateCertificationSettings = (data) =>
  userSettingApi.put(`${BASE}/certification`, data);