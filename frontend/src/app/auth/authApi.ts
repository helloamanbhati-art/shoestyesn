import { ApiError, apiRequest } from '../api/client.ts';

type UnknownRecord = Record<string, unknown>;
export interface AuthCustomer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isVerified: boolean;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null;
}
function nullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  throw new ApiError(502, 'INVALID_RESPONSE', 'The server returned an invalid response.');
}
export async function getCurrentCustomer(): Promise<AuthCustomer> {
  const data = asRecord(await apiRequest<unknown>('/api/v1/auth/me'));
  const customer = asRecord(data?.customer);
  if (!customer || typeof customer.id !== 'string' || typeof customer.isVerified !== 'boolean') {
    throw new ApiError(502, 'INVALID_RESPONSE', 'The server returned an invalid response.');
  }
  return {
    id: customer.id,
    firstName: nullableString(customer.firstName),
    lastName: nullableString(customer.lastName),
    email: nullableString(customer.email),
    phone: nullableString(customer.phone),
    isVerified: customer.isVerified,
  };
}
