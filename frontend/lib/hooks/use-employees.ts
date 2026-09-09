import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Department, Page, User } from "@/lib/types";

export interface EmployeeFilters {
  page?: number;
  page_size?: number;
  search?: string;
  department_id?: number;
  role?: string;
}

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: () => api.get<Page<User>>("/employees", filters as Record<string, string | number>),
  });
}

export function useEmployee(id: number | undefined) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => api.get<User>(`/employees/${id}`),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<User>("/employees", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch<User>(`/employees/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<Department[]>("/departments"),
    staleTime: 60_000,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Department>("/departments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}
