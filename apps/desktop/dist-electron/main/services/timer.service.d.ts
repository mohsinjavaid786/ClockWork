interface StoredUser {
    id: string;
    name: string;
    email: string;
    role: string;
}
interface TimerState {
    running: boolean;
    entryId?: string;
    startedAt?: string;
    projectId?: string;
    description?: string;
}
export declare function saveToken(token: string): void;
export declare function getToken(): string | null;
export declare function clearToken(): void;
export declare function saveUser(user: StoredUser): void;
export declare function getUser(): StoredUser | null;
export declare function clearUser(): void;
export declare function saveTimerState(state: TimerState): void;
export declare function getTimerState(): TimerState;
export declare function clearTimerState(): void;
export {};
//# sourceMappingURL=timer.service.d.ts.map