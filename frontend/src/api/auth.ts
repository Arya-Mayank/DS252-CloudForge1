import apiClient from './client';
import { AuthResponse, User } from '../types';

export const authAPI = {
  register: async (email: string, password: string, role: 'instructor' | 'student', firstName?: string, lastName?: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      role,
      first_name: firstName,
      last_name: lastName,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data;
  },

  updateProfile: async (firstName: string, lastName: string): Promise<{ user: User }> => {
    const response = await apiClient.put<{ user: User }>('/auth/profile', {
      first_name: firstName,
      last_name: lastName,
    });
    return response.data;
  },
};

