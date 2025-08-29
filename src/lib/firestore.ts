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
  getDoc
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

// Firestore service
export const firestoreService = {
  // Members
  subscribeToMembers: (callback: (members: Member[]) => void) => {
    const q = query(collection(db, 'members'), orderBy('joinDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      callback(members);
    });
  },

  addMember: async (member: Omit<Member, 'id'>) => {
    return await addDoc(collection(db, 'members'), member);
  },

  updateMember: async (id: string, updates: Partial<Member>) => {
    return await updateDoc(doc(db, 'members', id), updates);
  },

  deleteMember: async (id: string) => {
    return await deleteDoc(doc(db, 'members', id));
  },

  // Transactions
  subscribeToTransactions: (callback: (transactions: Transaction[]) => void) => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      callback(transactions);
    });
  },

  addTransaction: async (transaction: Omit<Transaction, 'id'>) => {
    return await addDoc(collection(db, 'transactions'), transaction);
  },

  deleteTransaction: async (id: string) => {
    return await deleteDoc(doc(db, 'transactions', id));
  },

  // Items
  subscribeToItems: (callback: (items: Item[]) => void) => {
    const q = query(collection(db, 'items'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];
      callback(items);
    });
  },

  addItem: async (item: Omit<Item, 'id'>) => {
    return await addDoc(collection(db, 'items'), item);
  },

  updateItem: async (id: string, updates: Partial<Item>) => {
    return await updateDoc(doc(db, 'items', id), updates);
  },

  deleteItem: async (id: string) => {
    return await deleteDoc(doc(db, 'items', id));
  },

  // Orders
  subscribeToOrders: (callback: (orders: Order[]) => void) => {
    const q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    });
  },

  addOrder: async (order: Omit<Order, 'id'>) => {
    return await addDoc(collection(db, 'orders'), order);
  },

  updateOrder: async (id: string, updates: Partial<Order>) => {
    return await updateDoc(doc(db, 'orders', id), updates);
  },

  // Gang Fund
  subscribeToGangFund: (callback: (fund: GangFund | null) => void) => {
    return onSnapshot(doc(db, 'gangfund', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        const fund = { id: snapshot.id, ...snapshot.data() } as GangFund;
        callback(fund);
      } else {
        callback(null);
      }
    });
  },

  updateGangFund: async (baseAmount: number, updatedBy: string) => {
    const fundData = {
      baseAmount,
      lastUpdated: new Date().toISOString(),
      updatedBy
    };
    return await setDoc(doc(db, 'gangfund', 'main'), fundData);
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