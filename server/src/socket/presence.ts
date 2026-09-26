/**
 * In-memory presence tracker for active WebSocket connections.
 * Maps userId -> Set of socket IDs (a user may have multiple tabs open).
 */
class PresenceTracker {
  private userSockets = new Map<string, Set<string>>();

  addConnection(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  removeConnection(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}

export const presenceTracker = new PresenceTracker();
