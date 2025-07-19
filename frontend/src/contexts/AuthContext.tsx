import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role_type: string;
}

interface UserPermissions {
  user_id: number;
  role: string;
  role_info: {
    value: string;
    label: string;
    description: string;
  };
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  permissions: UserPermissions | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Verify token by getting user profile and permissions
      Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/users/profile`),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/permissions/my-permissions`)
      ])
        .then(([userResponse, permissionsResponse]) => {
          setUser(userResponse.data);
          setPermissions(permissionsResponse.data);
        })
        .catch(() => {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Create URL-encoded form data for OAuth2 password flow
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      // Get user profile and permissions
      const [userResponse, permissionsResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/users/profile`),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/permissions/my-permissions`)
      ]);
      setUser(userResponse.data);
      setPermissions(permissionsResponse.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (email: string, username: string, password: string, fullName?: string) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/register`, {
        email,
        username,
        password,
        full_name: fullName
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setPermissions(null);
  };

  const hasPermission = (permission: string): boolean => {
    return permissions?.permissions.includes(permission) || false;
  };

  const value: AuthContextType = {
    user,
    permissions,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loading,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
