import { createContext, useCallback, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/authClient";
import { trpc } from "@/lib/trpc";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export class AuthApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
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
  const session = authClient.useSession();

  const sessionUser = session.data?.user as ({ id: string; email: string; firstName: string; lastName: string } & Record<string, unknown>) | undefined;
  const user: User | null = sessionUser
    ? { id: sessionUser.id, email: sessionUser.email, firstName: sessionUser.firstName, lastName: sessionUser.lastName }
    : null;

  const utils = trpc.useUtils();
  const balanceQuery = trpc.wallet.balance.useQuery(undefined, { enabled: !!user, refetchOnWindowFocus: false });
  const balance = balanceQuery.data?.balance ?? 0;

  const refresh = useCallback(async () => {
    await utils.wallet.balance.invalidate();
  }, [utils]);

  const register: AuthState["register"] = useCallback(async (input) => {
    const { error } = await authClient.signUp.email({
      email: input.email,
      password: input.password,
      name: `${input.firstName} ${input.lastName}`,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      birthdate: input.birthdate,
    } as Parameters<typeof authClient.signUp.email>[0]);
    if (error) throw new AuthApiError(error.code ?? "REGISTER_FAILED");
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) throw new AuthApiError(error.code ?? "LOGIN_FAILED");
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
    await utils.invalidate();
  }, [utils]);

  return (
    <AuthContext.Provider value={{ user, balance, loading: session.isPending, refresh, register, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
