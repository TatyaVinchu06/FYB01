import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  setDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB34YaQuuBPJGjIUqomoXOimXtyirVlsiE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fyb-funds.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fyb-funds",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fyb-funds.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "595012950872",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:595012950872:web:21a34fa8824af5410fa32d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Log configuration status
console.log('🔥 Firebase Config:', {
  projectId: firebaseConfig.projectId,
  usingEnvVars: !!import.meta.env.VITE_FIREBASE_PROJECT_ID
});

// Types
export interface Member {
  id: string;
  name: string;
  contribution: number;
  hasPaid: boolean;
  joinDate: string;
  order: number; // For drag-and-drop reordering
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export interface Order {
  id: string;
  memberId: string;
  memberName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  orderDate: string;
}

export interface GangFund {
  id: string;
  baseAmount: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  memberId: string;
  memberName: string;
  hasPaid: boolean;
  contribution: number;
  paymentDate?: string;
  createdAt: string;
}

export interface WeeklyPaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  contribution: number;
  hasPaid: boolean;
  paymentDate?: string;
  markedBy: string; // Admin who marked the payment
  markedAt: string;
  notes?: string; // Optional notes about the payment
}

// Firestore service
export const firestoreService = {
  // Members
  subscribeToMembers: (callback: (members: Member[]) => void) => {
    try {
      const q = query(collection(db, 'members'), orderBy('order', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const members = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Member[];
        callback(members);
      }, (error) => {
        console.error('Error subscribing to members:', error);
        callback([]); // Return empty array on error to stop loading state
      });
    } catch (error) {
      console.error('Error setting up members subscription:', error);
      callback([]);
      return () => {}; // Return no-op unsubscribe function
    }
  },

  addMember: async (member: Omit<Member, 'id'>) => {
    try {
      return await addDoc(collection(db, 'members'), member);
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  },

  updateMember: async (id: string, updates: Partial<Member>) => {
    try {
      return await updateDoc(doc(db, 'members', id), updates);
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  batchUpdateMembers: async (updates: { id: string; updates: Partial<Member> }[]) => {
    try {
      const batch = writeBatch(db);
      updates.forEach(({ id, updates: memberUpdates }) => {
        const memberRef = doc(db, 'members', id);
        batch.update(memberRef, memberUpdates);
      });
      return await batch.commit();
    } catch (error) {
      console.error('Error batch updating members:', error);
      throw error;
    }
  },

  deleteMember: async (id: string) => {
    try {
      return await deleteDoc(doc(db, 'members', id));
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  },

  // Transactions
  subscribeToTransactions: (callback: (transactions: Transaction[]) => void) => {
    try {
      const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        callback(transactions);
      }, (error) => {
        console.error('Error subscribing to transactions:', error);
        callback([]); // Return empty array on error to stop loading state
      });
    } catch (error) {
      console.error('Error setting up transactions subscription:', error);
      callback([]);
      return () => {};
    }
  },

  addTransaction: async (transaction: Omit<Transaction, 'id'>) => {
    try {
      return await addDoc(collection(db, 'transactions'), transaction);
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      return await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  // Items
  subscribeToItems: (callback: (items: Item[]) => void) => {
    try {
      const q = query(collection(db, 'items'), orderBy('name'));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Item[];
        callback(items);
      }, (error) => {
        console.error('Error subscribing to items:', error);
        callback([]); // Return empty array on error to stop loading state
      });
    } catch (error) {
      console.error('Error setting up items subscription:', error);
      callback([]);
      return () => {};
    }
  },

  addItem: async (item: Omit<Item, 'id'>) => {
    try {
      return await addDoc(collection(db, 'items'), item);
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  updateItem: async (id: string, updates: Partial<Item>) => {
    try {
      return await updateDoc(doc(db, 'items', id), updates);
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  deleteItem: async (id: string) => {
    try {
      return await deleteDoc(doc(db, 'items', id));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  // Orders
  subscribeToOrders: (callback: (orders: Order[]) => void) => {
    try {
      const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        callback(orders);
      }, (error) => {
        console.error('Error subscribing to orders:', error);
        callback([]); // Return empty array on error to stop loading state
      });
    } catch (error) {
      console.error('Error setting up orders subscription:', error);
      callback([]);
      return () => {};
    }
  },

  addOrder: async (order: Omit<Order, 'id'>) => {
    try {
      return await addDoc(collection(db, 'orders'), order);
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  },

  updateOrder: async (id: string, updates: Partial<Order>) => {
    try {
      return await updateDoc(doc(db, 'orders', id), updates);
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  // Gang Fund
  subscribeToGangFund: (callback: (fund: GangFund | null) => void) => {
    try {
      return onSnapshot(doc(db, 'gangfund', 'main'), (snapshot) => {
        if (snapshot.exists()) {
          const fund = { id: snapshot.id, ...snapshot.data() } as GangFund;
          callback(fund);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error subscribing to gang fund:', error);
        callback(null); // Return null on error to stop loading state
      });
    } catch (error) {
      console.error('Error setting up gang fund subscription:', error);
      callback(null);
      return () => {};
    }
  },

  updateGangFund: async (baseAmount: number, updatedBy: string) => {
    try {
      const fundData = {
        baseAmount,
        lastUpdated: new Date().toISOString(),
        updatedBy
      };
      return await setDoc(doc(db, 'gangfund', 'main'), fundData);
    } catch (error) {
      console.error('Error updating gang fund:', error);
      throw error;
    }
  },

  // Audit Logs
  subscribeToAuditLogs: (callback: (auditLogs: AuditLog[]) => void) => {
    try {
      const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const auditLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AuditLog[];
        callback(auditLogs);
      }, (error) => {
        console.error('Error subscribing to audit logs:', error);
        callback([]); // Return empty array on error to stop loading state
      });
    } catch (error) {
      console.error('Error setting up audit logs subscription:', error);
      callback([]);
      return () => {};
    }
  },

  addAuditLog: async (auditLog: Omit<AuditLog, 'id'>) => {
    try {
      return await addDoc(collection(db, 'auditLogs'), auditLog);
    } catch (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
  },

  updateAuditLog: async (id: string, updates: Partial<AuditLog>) => {
    try {
      return await updateDoc(doc(db, 'auditLogs', id), updates);
    } catch (error) {
      console.error('Error updating audit log:', error);
      throw error;
    }
  },

  deleteAuditLog: async (id: string) => {
    try {
      return await deleteDoc(doc(db, 'auditLogs', id));
    } catch (error) {
      console.error('Error deleting audit log:', error);
      throw error;
    }
  },

  // Weekly Payment Records
  subscribeToWeeklyPaymentRecords: (callback: (records: WeeklyPaymentRecord[]) => void) => {
    try {
      const q = query(collection(db, 'weeklyPaymentRecords'), orderBy('weekNumber', 'desc'), orderBy('markedAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WeeklyPaymentRecord[];
        callback(records);
      }, (error) => {
        console.error('Error subscribing to weekly payment records:', error);
        callback([]); // Return empty array on error to stop loading state
      });
    } catch (error) {
      console.error('Error setting up weekly payment records subscription:', error);
      callback([]);
      return () => {};
    }
  },

  addWeeklyPaymentRecord: async (record: Omit<WeeklyPaymentRecord, 'id'>) => {
    try {
      return await addDoc(collection(db, 'weeklyPaymentRecords'), record);
    } catch (error) {
      console.error('Error adding weekly payment record:', error);
      throw error;
    }
  },

  // Find existing weekly payment record for a specific member and week
  findWeeklyPaymentRecord: async (memberId: string, weekNumber: number): Promise<WeeklyPaymentRecord | null> => {
    try {
      const q = query(
        collection(db, 'weeklyPaymentRecords'), 
        orderBy('markedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WeeklyPaymentRecord[];
      
      // Find the most recent record for this member and week
      const existingRecord = records.find(record => 
        record.memberId === memberId && record.weekNumber === weekNumber
      );
      
      return existingRecord || null;
    } catch (error) {
      console.error('Error finding weekly payment record:', error);
      return null;
    }
  },

  // Create or update weekly payment record
  upsertWeeklyPaymentRecord: async (record: Omit<WeeklyPaymentRecord, 'id'>): Promise<void> => {
    try {
      const existingRecord = await firestoreService.findWeeklyPaymentRecord(record.memberId, record.weekNumber);
      
      if (existingRecord) {
        // Update existing record
        await firestoreService.updateWeeklyPaymentRecord(existingRecord.id, {
          hasPaid: record.hasPaid,
          paymentDate: record.paymentDate,
          markedBy: record.markedBy,
          markedAt: record.markedAt,
          contribution: record.contribution // Update contribution too in case it changed
        });
        console.log('✅ Updated existing weekly payment record');
      } else {
        // Create new record
        await firestoreService.addWeeklyPaymentRecord(record);
        console.log('✅ Created new weekly payment record');
      }
    } catch (error) {
      console.error('Error upserting weekly payment record:', error);
      throw error;
    }
  },

  updateWeeklyPaymentRecord: async (id: string, updates: Partial<WeeklyPaymentRecord>) => {
    try {
      return await updateDoc(doc(db, 'weeklyPaymentRecords', id), updates);
    } catch (error) {
      console.error('Error updating weekly payment record:', error);
      throw error;
    }
  },

  deleteWeeklyPaymentRecord: async (id: string) => {
    try {
      return await deleteDoc(doc(db, 'weeklyPaymentRecords', id));
    } catch (error) {
      console.error('Error deleting weekly payment record:', error);
      throw error;
    }
  },

  batchUpdateWeeklyPaymentRecords: async (updates: { id: string; updates: Partial<WeeklyPaymentRecord> }[]) => {
    try {
      const batch = writeBatch(db);
      updates.forEach(({ id, updates: recordUpdates }) => {
        const recordRef = doc(db, 'weeklyPaymentRecords', id);
        batch.update(recordRef, recordUpdates);
      });
      return await batch.commit();
    } catch (error) {
      console.error('Error batch updating weekly payment records:', error);
      throw error;
    }
  },

  // Initialize default data
  initializeDefaultItems: async () => {
    try {
      const itemsSnapshot = await getDocs(collection(db, 'items'));
      if (itemsSnapshot.empty) {
        console.log('🎯 Initializing default items...');
        
        const defaultItems = [
          { name: "AK-47", price: 2500, category: "weapon", description: "Classic assault rifle" },
          { name: "Bulletproof Vest", price: 800, category: "armor", description: "Level IIIA protection" },
          { name: "Night Vision Goggles", price: 1200, category: "equipment", description: "See in the dark" },
          { name: "Encrypted Radio", price: 300, category: "communication", description: "Secure comms" },
          { name: "Smoke Grenades", price: 150, category: "tactical", description: "Pack of 3" }
        ];

        for (const item of defaultItems) {
          await addDoc(collection(db, 'items'), item);
        }
        console.log('✅ Default items initialized');
      }

      // Initialize gang fund if it doesn't exist
      const fundDoc = await getDoc(doc(db, 'gangfund', 'main'));
      if (!fundDoc.exists()) {
        console.log('💰 Initializing gang fund...');
        await setDoc(doc(db, 'gangfund', 'main'), {
          baseAmount: 20000,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'system'
        });
        console.log('✅ Gang fund initialized with $20,000');
      }
    } catch (error) {
      console.error('❌ Error initializing default data:', error);
    }
  }
};