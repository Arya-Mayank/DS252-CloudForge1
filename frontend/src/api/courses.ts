import apiClient from './client';
import { Course } from '../types';

export const coursesAPI = {
  getAll: async (): Promise<Course[]> => {
    const response = await apiClient.get<{ courses: Course[] }>('/courses');
    return response.data.courses;
  },

  getAllCourses: async (): Promise<Course[]> => {
    const response = await apiClient.get<{ courses: Course[] }>('/courses/all');
    return response.data.courses;
  },

  getById: async (id: string): Promise<Course> => {
    const response = await apiClient.get<{ course: Course }>(`/courses/${id}`);
    return response.data.course;
  },

  create: async (title: string, description?: string): Promise<Course> => {
    const response = await apiClient.post<{ course: Course }>('/courses', {
      title,
      description,
    });
    return response.data.course;
  },

  update: async (id: string, data: Partial<Course>): Promise<Course> => {
    const response = await apiClient.put<{ course: Course }>(`/courses/${id}`, data);
    return response.data.course;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/courses/${id}`);
  },

  uploadMaterial: async (id: string, file: File): Promise<Course> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<{ course: Course }>(`/courses/${id}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.course;
  },

  enroll: async (id: string): Promise<void> => {
    await apiClient.post(`/courses/${id}/enroll`);
  },

  unenroll: async (id: string): Promise<void> => {
    await apiClient.delete(`/courses/${id}/enroll`);
  },

  deleteFile: async (courseId: string, fileName: string): Promise<any> => {
    const response = await apiClient.delete(`/courses/${courseId}/files/${fileName}`);
    return response.data;
  },

  getFiles: async (courseId: string): Promise<any[]> => {
    const response = await apiClient.get<{ files: any[] }>(`/courses/${courseId}/files`);
    return response.data.files;
  },

  publish: async (courseId: string): Promise<Course> => {
    const response = await apiClient.put<{ course: Course }>(`/courses/${courseId}/publish`);
    return response.data.course;
  },

  unpublish: async (courseId: string): Promise<Course> => {
    const response = await apiClient.put<{ course: Course }>(`/courses/${courseId}/unpublish`);
    return response.data.course;
  },
};

