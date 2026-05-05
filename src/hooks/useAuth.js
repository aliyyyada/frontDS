import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem('role');
    const id = localStorage.getItem('user_id');
    return role ? { role, id } : null;
  });

  const login = useCallback((tokens, role) => {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('role', role || tokens.role);
    if (tokens.first_name) localStorage.setItem('user_first_name', tokens.first_name);
    if (tokens.last_name)  localStorage.setItem('user_last_name',  tokens.last_name);
    setUser({ role: role || tokens.role });
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
