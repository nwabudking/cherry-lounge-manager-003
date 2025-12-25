import apiClient from './client';

export interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffData {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

export interface UpdateStaffData {
  email?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => {
    const response = await apiClient.get<StaffMember[]>('/staff');
    return response.data;
  },

  getActiveStaff: async (): Promise<StaffMember[]> => {
    const response = await apiClient.get<StaffMember[]>('/staff', {
      params: { active: true },
    });
    return response.data;
  },

  getStaffMember: async (id: string): Promise<StaffMember> => {
    const response = await apiClient.get<StaffMember>(`/staff/${id}`);
    return response.data;
  },

  createStaff: async (data: CreateStaffData): Promise<StaffMember> => {
    const response = await apiClient.post<StaffMember>('/staff', data);
    return response.data;
  },

  updateStaff: async (id: string, data: UpdateStaffData): Promise<StaffMember> => {
    const response = await apiClient.put<StaffMember>(`/staff/${id}`, data);
    return response.data;
  },

  deleteStaff: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/${id}`);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    await apiClient.post(`/staff/${id}/reset-password`, { newPassword });
  },

  updateRole: async (id: string, role: string): Promise<StaffMember> => {
    const response = await apiClient.patch<StaffMember>(`/staff/${id}/role`, { role });
    return response.data;
  },

  getProfiles: async (): Promise<{ id: string; full_name: string | null; email: string | null }[]> => {
    const response = await apiClient.get('/profiles');
    return response.data;
  },
};
