import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Reservation, ReservationStatus } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { useEmployee } from './UserProvider';
import { toast } from 'sonner';

interface ReservationContextType {
  reservations: Reservation[];
  loading: boolean;
  createReservation: (data: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateReservationStatus: (id: string, status: ReservationStatus, reason?: string, approver?: string) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  blockStation: (office: string, station: number, date: string) => Promise<void>;
}

const ReservationContext = createContext<ReservationContextType>({
  reservations: [],
  loading: true,
  createReservation: async () => {},
  updateReservationStatus: async () => {},
  cancelReservation: async () => {},
  blockStation: async () => {}
});

export const useReservations = () => useContext(ReservationContext);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee, loading: authLoading } = useEmployee();

  useEffect(() => {
    if (authLoading || !employee) {
      setReservations([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString(),
        approvedAt: doc.data().approvedAt ? (doc.data().approvedAt as Timestamp).toDate().toISOString() : undefined,
        cancelledAt: doc.data().cancelledAt ? (doc.data().cancelledAt as Timestamp).toDate().toISOString() : undefined
      })) as Reservation[];
      setReservations(resData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reservations');
    });

    return () => unsubscribe();
  }, [authLoading, employee]);

  const createReservation = async (data: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => {
    try {
      // Auto-approve for Manager, Assistant Manager, or Admin
      const isAutoApproved = employee?.role === 'Admin' || employee?.role === 'Manager' || employee?.role === 'Assistant Manager';
      const status = isAutoApproved ? 'confirmed' : 'pending';

      const reservationData: any = {
        ...data,
        status,
        createdAt: Timestamp.now(),
      };

      if (status === 'confirmed') {
        reservationData.approvedBy = employee?.employeeId;
        reservationData.approvedAt = Timestamp.now();
      }

      await addDoc(collection(db, 'reservations'), reservationData);
      toast.success(status === 'confirmed' ? 'Reservation confirmed!' : 'Reservation submitted for approval');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
    }
  };

  const updateReservationStatus = async (id: string, status: ReservationStatus, reason?: string, approver?: string) => {
    try {
      const updateData: any = { status };
      if (reason) updateData.rejectionReason = reason;
      if (approver) {
        updateData.approvedBy = approver;
        updateData.approvedAt = Timestamp.now();
      }
      await updateDoc(doc(db, 'reservations', id), updateData);
      toast.success(`Reservation ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const cancelReservation = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reservations', id), {
        status: 'cancelled',
        cancelledBy: employee?.employeeId || 'unknown',
        cancelledAt: Timestamp.now(),
      });
      toast.info('Reservation cancelled');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const blockStation = async (office: string, station: number, date: string) => {
    try {
      await addDoc(collection(db, 'reservations'), {
        office,
        station,
        date,
        type: 'block',
        status: 'blocked',
        lobOrDepartment: 'SYSTEM',
        requestedBy: employee?.employeeId,
        notifyEmail: 'ithelpdesk@globalvirtuoso.com',
        start: '00:00',
        end: '23:59',
        createdAt: Timestamp.now()
      });
      toast.success('Station blocked');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
    }
  };

  return (
    <ReservationContext.Provider value={{ reservations, loading, createReservation, updateReservationStatus, cancelReservation, blockStation }}>
      {children}
    </ReservationContext.Provider>
  );
};
