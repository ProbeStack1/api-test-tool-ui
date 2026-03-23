import { supportApi } from '../lib/apiClient'; 

const TICKETS_BASE = '/api/v1/support/tickets';
const KNOWLEDGE_BASE_BASE = '/api/v1/support/knowledge-base';

/**
 * Submit a support ticket (multipart/form-data)
 * 
 * @param {Object} data
 * @param {string} data.fullName - Full name of the user
 * @param {string} data.email - Email address
 * @param {string} data.productArea - Affected product area (e.g., "api", "ui")
 * @param {string} data.subject - Ticket subject
 * @param {string} data.description - Detailed description
 * @param {File[]} [data.attachments] - Optional list of files to attach
 * @returns {Promise<TicketCreatedResponse>} { id, status, estimatedResponseTime, createdAt }
 */
export const submitTicket = (data) => {
  const formData = new FormData();
  formData.append('fullName', data.fullName);
  formData.append('email', data.email);
  formData.append('productArea', data.productArea);
  formData.append('subject', data.subject);
  formData.append('description', data.description);

  if (data.attachments && data.attachments.length) {
    data.attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }

  return supportApi.post(TICKETS_BASE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Search knowledge base articles
 * 
 * @param {Object} params - Query parameters
 * @param {string} [params.q] - Search term
 * @param {number} [params.limit=10] - Number of results per page (max 50)
 * @param {number} [params.offset=0] - Pagination offset
 * @returns {Promise<KnowledgeBaseSearchResponse>} { total, items: Array<{ id, title, snippet, category, url }> }
 */
export const searchKnowledgeBase = (params = {}) => {
  const { q, limit = 10, offset = 0 } = params;

  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (q?.trim()) {
    query.append('q', q.trim());
  }

  const url = `${KNOWLEDGE_BASE_BASE}?${query.toString()}`;
  return supportApi.get(url);
};