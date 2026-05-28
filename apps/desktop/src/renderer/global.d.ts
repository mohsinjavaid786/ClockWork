import type { TrackdeskAPI } from '../preload/preload';

declare global {
  interface Window {
    trackdesk: TrackdeskAPI;
  }
}
