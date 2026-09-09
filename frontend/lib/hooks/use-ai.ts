import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export function useAskAi() {
  return useMutation({
    mutationFn: (question: string) => api.post<{ answer: string }>("/ai/ask", { question }),
  });
}
