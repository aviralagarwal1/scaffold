export interface RegisterRequest {
  email: string;
  password: string;
  editorName: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  editorName: string;
}
