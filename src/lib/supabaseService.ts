import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nrrskptkdlxflxhlqfng.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_u1frutv4azCie6IvJYKOxg_KbpmxrX7';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Member {
  id?: string;
  name: string;
  contribution: number;
  hasPaid: boolean;
  joinDate: string;
  order: number; // For drag-and-drop reordering
}

export interface Transaction {
  id?: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
}

export interface Item {
  id?: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export interface Order {
  id?: string;
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
  id?: string;
  baseAmount: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface AuditLog {
  id?: string;
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
  id?: string;
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

// Supabase service
export const supabaseService = {
  // Members
  async getMembers(): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  },

  async addMember(member: Omit<Member, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([member])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  },

  async updateMember(id: string, updates: Partial<Member>) {
    try {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  async deleteMember(id: string) {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  },

  async batchUpdateMembers(updates: { id: string; updates: Partial<Member> }[]) {
    try {
      const promises = updates.map(({ id, updates: memberUpdates }) =>
        supabase
          .from('members')
          .update(memberUpdates)
          .eq('id', id)
      );
      
      const results = await Promise.all(promises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} members`);
      }
    } catch (error) {
      console.error('Error batch updating members:', error);
      throw error;
    }
  },

  subscribeToMembers(callback: (members: Member[]) => void) {
    const channel = supabase
      .channel('members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members'
        },
        (payload) => {
          // Fetch updated data
          supabaseService.getMembers().then(callback);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },

  async addTransaction(transaction: Omit<Transaction, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  },

  async deleteTransaction(id: string) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  subscribeToTransactions(callback: (transactions: Transaction[]) => void) {
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          // Fetch updated data
          supabaseService.getTransactions().then(callback);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Items
  async getItems(): Promise<Item[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  },

  async addItem(item: Omit<Item, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  async updateItem(id: string, updates: Partial<Item>) {
    try {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  async deleteItem(id: string) {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  subscribeToItems(callback: (items: Item[]) => void) {
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        (payload) => {
          // Fetch updated data
          supabaseService.getItems().then(callback);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('orderDate', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  async addOrder(order: Omit<Order, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([order])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  },

  async updateOrder(id: string, updates: Partial<Order>) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  subscribeToOrders(callback: (orders: Order[]) => void) {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Fetch updated data
          supabaseService.getOrders().then(callback);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Gang Fund
  async getGangFund(): Promise<GangFund | null> {
    try {
      const { data, error } = await supabase
        .from('gangfund')
        .select('*')
        .eq('id', 'main')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data || null;
    } catch (error) {
      console.error('Error fetching gang fund:', error);
      return null;
    }
  },

  async updateGangFund(baseAmount: number, updatedBy: string) {
    try {
      const { data, error } = await supabase
        .from('gangfund')
        .upsert({
          id: 'main',
          baseAmount,
          lastUpdated: new Date().toISOString(),
          updatedBy
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating gang fund:', error);
      throw error;
    }
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('auditlogs')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  },

  async addAuditLog(auditLog: Omit<AuditLog, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('auditlogs')
        .insert([auditLog])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
  },

  async updateAuditLog(id: string, updates: Partial<AuditLog>) {
    try {
      const { data, error } = await supabase
        .from('auditlogs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating audit log:', error);
      throw error;
    }
  },

  async deleteAuditLog(id: string) {
    try {
      const { error } = await supabase
        .from('auditlogs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting audit log:', error);
      throw error;
    }
  },

  subscribeToAuditLogs(callback: (auditLogs: AuditLog[]) => void) {
    const channel = supabase
      .channel('auditlogs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auditlogs'
        },
        (payload) => {
          // Fetch updated data
          supabaseService.getAuditLogs().then(callback);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Weekly Payment Records
  async getWeeklyPaymentRecords(): Promise<WeeklyPaymentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('weeklypaymentrecords')
        .select('*')
        .order('weekNumber', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching weekly payment records:', error);
      return [];
    }
  },

  async addWeeklyPaymentRecord(record: Omit<WeeklyPaymentRecord, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('weeklypaymentrecords')
        .insert([record])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding weekly payment record:', error);
      throw error;
    }
  },

  async findWeeklyPaymentRecord(memberId: string, weekNumber: number): Promise<WeeklyPaymentRecord | null> {
    try {
      const { data, error } = await supabase
        .from('weeklypaymentrecords')
        .select('*')
        .eq('memberId', memberId)
        .eq('weekNumber', weekNumber)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data || null;
    } catch (error) {
      console.error('Error finding weekly payment record:', error);
      return null;
    }
  },

  async upsertWeeklyPaymentRecord(record: Omit<WeeklyPaymentRecord, 'id'>): Promise<void> {
    try {
      const existingRecord = await supabaseService.findWeeklyPaymentRecord(record.memberId, record.weekNumber);
      
      if (existingRecord) {
        // Update existing record
        await supabaseService.updateWeeklyPaymentRecord(existingRecord.id!, {
          hasPaid: record.hasPaid,
          paymentDate: record.paymentDate,
          markedBy: record.markedBy,
          markedAt: record.markedAt,
          contribution: record.contribution
        });
        console.log('✅ Updated existing weekly payment record');
      } else {
        // Create new record
        await supabaseService.addWeeklyPaymentRecord(record);
        console.log('✅ Created new weekly payment record');
      }
    } catch (error) {
      console.error('Error upserting weekly payment record:', error);
      throw error;
    }
  },

  async updateWeeklyPaymentRecord(id: string, updates: Partial<WeeklyPaymentRecord>) {
    try {
      const { data, error } = await supabase
        .from('weeklypaymentrecords')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating weekly payment record:', error);
      throw error;
    }
  },

  async deleteWeeklyPaymentRecord(id: string) {
    try {
      const { error } = await supabase
        .from('weeklypaymentrecords')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting weekly payment record:', error);
      throw error;
    }
  },

  subscribeToWeeklyPaymentRecords(callback: (records: WeeklyPaymentRecord[]) => void) {
    const channel = supabase
      .channel('weeklypaymentrecords-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weeklypaymentrecords'
        },
        (payload) => {
          // Fetch updated data
          supabaseService.getWeeklyPaymentRecords().then(callback);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Initialize default data
  async initializeDefaultItems() {
    try {
      // Check if items collection is empty
      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });
      
      if (count === 0) {
        console.log('🎯 Initializing default items...');
        
        const defaultItems = [
          { name: "AK-47", price: 2500, category: "weapon", description: "Classic assault rifle" },
          { name: "Bulletproof Vest", price: 800, category: "armor", description: "Level IIIA protection" },
          { name: "Night Vision Goggles", price: 1200, category: "equipment", description: "See in the dark" },
          { name: "Encrypted Radio", price: 300, category: "communication", description: "Secure comms" },
          { name: "Smoke Grenades", price: 150, category: "tactical", description: "Pack of 3" }
        ];

        const { error } = await supabase
          .from('items')
          .insert(defaultItems);
        
        if (error) throw error;
        console.log('✅ Default items initialized');
      }

      // Check if gang fund exists
      const fund = await supabaseService.getGangFund();
      
      if (!fund) {
        console.log('💰 Initializing gang fund...');
        await supabaseService.updateGangFund(20000, 'system');
        console.log('✅ Gang fund initialized with $20,000');
      }
    } catch (error) {
      console.error('❌ Error initializing default data:', error);
    }
  }
};