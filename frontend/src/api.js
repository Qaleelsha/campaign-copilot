import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const getCustomers    = ()         => api.get('/customers');
export const getCampaigns    = ()         => api.get('/campaigns');
export const getSegments     = ()         => api.get('/segments');
export const getCampaign     = (id)       => api.get(`/campaigns/${id}`);
export const sendChat        = (messages) => api.post('/chat', { messages });
export const confirmCampaign = (plan)     => api.post('/chat/confirm', { plan });