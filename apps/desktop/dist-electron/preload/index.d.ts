export type TimerStatus = {
    running: boolean;
    entryId?: string;
    startedAt?: string;
    projectId?: string;
    description?: string;
};
export type AuthState = {
    token: string | null;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    } | null;
};
//# sourceMappingURL=index.d.ts.map