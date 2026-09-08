import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  balance: number;
  loading: boolean;
  refresh: () => Promise<void>;
  register: (input: { email: string; password: string; firstName: string; lastName: string; phone: string; birthdate: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: User; balance: number }>("/auth/me");
      setUser(data.user);
      setBalance(data.balance);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setBalance(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register: AuthState["register"] = useCallback(async (input) => {
    const data = await api.post<{ user: User; balance: number }>("/auth/register", input);
    setUser(data.user);
    setBalance(data.balance);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User; balance: number }>("/auth/login", { email, password });
    setUser(data.user);
    setBalance(data.balance);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    setBalance(0);
  }, []);

  return <AuthContext.Provider value={{ user, balance, loading, refresh, register, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
