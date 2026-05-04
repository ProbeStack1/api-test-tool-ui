/**
 * Support service — Knowledge Base + Tickets HTTP layer.
 * Backend: forgeq-support-mgmt-svc on port 8094.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('support');
const BASE = '/api/v1/support';

export interface KbArticle {
  id: string;
  title: string;
  snippet: string;
  content?: string;
  category?: string;
  url?: string | null;
  tags?: string[];
  updatedAt?: string;
}

export interface KbSearchResponse {
  total: number;
  items: KbArticle[];
}

export interface CreateTicketBody {
  fullName: string;
  email: string;
  productArea: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  subject: string;
  description: string;
}

export interface TicketView {
  ticketId: string;
  userId: string;
  fullName: string;
  email: string;
  productArea: string;
  priority?: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketsPage {
  total: number;
  items: TicketView[];
  page: number;
  size: number;
}

export const searchKb = (q: string, limit = 20, offset = 0) =>
  http.get<KbSearchResponse>(`${BASE}/knowledge-base`, { params: { q, limit, offset } }).then((r) => r.data);

export const getKbArticle = (id: string) =>
  http.get<KbArticle>(`${BASE}/knowledge-base/${id}`).then((r) => r.data);

export const createTicket = (userId: string, body: CreateTicketBody) =>
  http.post<TicketView>(`${BASE}/tickets`, body, { headers: { 'X-User-Id': userId } }).then((r) => r.data);

export const listTickets = (userId: string, page = 0, size = 20) =>
  http.get<TicketsPage>(`${BASE}/tickets`, { params: { page, size }, headers: { 'X-User-Id': userId } })
    .then((r) => r.data);

export const getTicket = (ticketId: string) =>
  http.get<TicketView>(`${BASE}/tickets/${ticketId}`).then((r) => r.data);
