import axios, { AxiosError, type AxiosInstance } from "axios";

const fallbackErrorMessage = "Erro inesperado";

function readErrorMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const maybeData = data as Record<string, unknown>;
  const detail = maybeData.detail;
  const message = maybeData.message;

  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return null;
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return readErrorMessage(error.response?.data) ?? error.message ?? fallbackErrorMessage;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackErrorMessage;
}

export const client: AxiosInstance = axios.create({
baseURL: import.meta.env.VITE_API_URL ?? "https://projeto-bom-production.up.railway.app",

  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = extractErrorMessage(error);
    const normalizedError = Object.assign(error, {
      message,
    });

    return Promise.reject(normalizedError);
  },
);
