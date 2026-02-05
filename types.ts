
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface FileContent {
  id: string;
  name: string;
  type: string;
  content: string; // Base64 for images/binary, text for documents
  lastModified: number;
  authorId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  files: FileContent[];
  messages: ChatMessage[];
  members: string[]; // User IDs
}

export enum AppState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  ROOM = 'ROOM'
}
