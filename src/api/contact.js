import { apiRequest } from './client';

export async function submitContactQuery({ name, email, subject }) {
  return apiRequest('/api/contact-us/', {
    method: 'POST',
    body: { name, email, subject },
  });
}
