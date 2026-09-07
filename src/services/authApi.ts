import apiClient from './api';
import type { AuthResponse, LoginCredentials, SignupCredentials, User } from '../types/auth';

export async function signup(credentials: SignupCredentials): Promise<User> {
  const response = await apiClient.post<User>('/auth/signup', credentials);
  return response.data;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
}
