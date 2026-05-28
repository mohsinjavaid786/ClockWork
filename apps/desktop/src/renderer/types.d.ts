interface TimerStatus {
  running: boolean;
  entryId?: string;
  startedAt?: string;
  projectId?: string;
  description?: string;
}

interface CwUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CwProject {
  id: string;
  name: string;
  color: string;
}

interface Window {
  clockwork: {
    auth: {
      login: (email: string, password: string) => Promise<CwUser>;
      logout: () => Promise<{ success: boolean }>;
      getToken: () => Promise<string | null>;
      getUser: () => Promise<CwUser | null>;
    };
    timer: {
      start: (projectId?: string, description?: string) => Promise<TimerStatus>;
      stop: () => Promise<TimerStatus>;
      getStatus: () => Promise<TimerStatus>;
    };
    activity: {
      get: () => Promise<number>;
    };
    config: {
      get: () => Promise<{ screenshotIntervalMinutes: number; companyName: string; timezone: string }>;
    };
    projects: {
      list: () => Promise<CwProject[]>;
    };
    app: {
      version: () => Promise<string>;
    };
  };
}
