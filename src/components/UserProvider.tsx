import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Employee } from '../types';

interface UserContextType {
  employee: Employee | null;
  loading: boolean;
  login: (employeeId: string, token: string) => Promise<void>;
  loginWithId: (employeeId: string) => Promise<void>;
  logout: () => void;
}

const SESSION_KEY = 'spark_v3_session';

const UserContext = createContext<UserContextType>({
  employee: null,
  loading: true,
  login: async () => {},
  loginWithId: async () => {},
  logout: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore and re-validate session from localStorage
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const parsed: Employee = JSON.parse(stored);
          const snap = await getDoc(doc(db, 'employees', parsed.id));
          if (snap.exists()) {
            const data = snap.data();
            if (!data.isActive) {
              localStorage.removeItem(SESSION_KEY);
              setLoading(false);
              return;
            }
            // User role: no token check needed
            if (data.role === 'User') {
              setEmployee({ id: snap.id, ...data } as Employee);
              setLoading(false);
              return;
            }
            // Privileged roles: validate token
            if (
              data.token === parsed.token &&
              data.tokenExpiresAt &&
              new Date(data.tokenExpiresAt).getTime() > Date.now()
            ) {
              setEmployee({ id: snap.id, ...data } as Employee);
              setLoading(false);
              return;
            }
          }
        } catch {}
        localStorage.removeItem(SESSION_KEY);
      }
      setLoading(false);
    })();
  }, []);

  // Privileged login: EMP# + Token (Supervisor / Asst Manager / Manager / Admin)
  const login = async (employeeId: string, token: string) => {
    const q = query(collection(db, 'employees'), where('employeeId', '==', employeeId.trim()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Employee not found. Please contact your IT/Admin.');

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (!data.isActive) throw new Error('Account is inactive. Please contact your IT/Admin.');
    if (data.role === 'User') throw new Error('General access accounts use Staff Access. Please use the Staff Access tab.');
    if (!data.token) throw new Error('No token issued. Please contact your IT/Admin.');
    if (data.token !== token.trim()) throw new Error('Invalid token. Please contact your IT/Admin.');
    if (!data.tokenExpiresAt || new Date(data.tokenExpiresAt).getTime() <= Date.now()) {
      throw new Error('Token expired. Please contact your IT/Admin.');
    }

    const emp: Employee = { id: docSnap.id, ...data } as Employee;
    localStorage.setItem(SESSION_KEY, JSON.stringify(emp));
    setEmployee(emp);
  };

  // General access login: EMP# only (User role)
  const loginWithId = async (employeeId: string) => {
    const q = query(collection(db, 'employees'), where('employeeId', '==', employeeId.trim()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Employee number not found. Please contact your IT/Admin.');

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (!data.isActive) throw new Error('Account is inactive. Please contact your IT/Admin.');
    if (data.role !== 'User') {
      throw new Error('This account requires a token. Please use the Privileged Access tab.');
    }

    const emp: Employee = { id: docSnap.id, ...data } as Employee;
    localStorage.setItem(SESSION_KEY, JSON.stringify(emp));
    setEmployee(emp);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setEmployee(null);
  };

  return (
    <UserContext.Provider value={{ employee, loading, login, loginWithId, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useEmployee() {
  return useContext(UserContext);
}
