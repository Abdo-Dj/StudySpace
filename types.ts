
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface FileContent {
  id: string;
  name: string;
  type: string; // 'text/plain', 'image/png', 'application/pdf', 'whiteboard'
  content: string; // Text string, Base64 for images/PDFs/Whiteboard state
  lastModified: number;
  authorId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  files: FileContent[];
  messages: ChatMessage[];
  members: string[];
}

export enum AppState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  ROOM = 'ROOM'
}
