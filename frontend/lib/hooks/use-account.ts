import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => api.post("/auth/change-password", data),
  });
}
