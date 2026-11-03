export interface AdminAccessStore {
  isAdmin(actorUserId: string): Promise<boolean>;
  recordRead(actorUserId: string, route: string, requestId: string, targetId?: string): Promise<void>;
}
