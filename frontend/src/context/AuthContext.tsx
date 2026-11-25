import React, { createContext, useContext, useState } from "react";
import { User, UserDetail, getCurrentUser } from "../lib/api";

interface AuthContextType {
  token: string | null;
  user: UserDetail | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Access token is kept strictly in application memory per Phase 3 security guidelines.
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);

  const fetchFullUser = async (authToken: string) => {
    try {
      const fullUser = await getCurrentUser(authToken);
      setUser(fullUser);
    } catch {
      // If fetching fails, clear invalid session
      setToken(null);
      setUser(null);
    }
  };

  const login = async (newToken: string, basicUser: User) => {
    setToken(newToken);
    // Initialize with basic user and then load full profile
    setUser({ ...basicUser, skills: [] });
    await fetchFullUser(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchFullUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
