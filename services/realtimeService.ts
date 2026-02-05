
import { Room, FileContent, ChatMessage } from '../types';

// Use BroadcastChannel to sync state between tabs (simulates a real-time backend)
const channel = new BroadcastChannel('studdy_space_sync');

type SyncEvent = 
  | { type: 'FILE_UPDATE', roomId: string, file: FileContent }
  | { type: 'MESSAGE_SENT', roomId: string, message: ChatMessage }
  | { type: 'MEMBER_JOINED', roomId: string, userId: string };

export const syncUpdate = (event: SyncEvent) => {
  channel.postMessage(event);
};

export const subscribeToSync = (callback: (event: SyncEvent) => void) => {
  const handler = (event: MessageEvent<SyncEvent>) => {
    callback(event.data);
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
};
