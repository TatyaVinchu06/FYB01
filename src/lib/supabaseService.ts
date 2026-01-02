import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase configuration is incomplete. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseKey!);

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

// Supabase service
export const supabaseService = {
  // Members
  subscribeToMembers: (callback: (members: Member[]) => void) => {
    // Real-time subscription to members table
    const subscription = supabase
      .channel('members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
        },
        (payload) => {
          // Refresh all members when any change occurs
          supabase
            .from('members')
            .select('*')
            .order('order', { ascending: true })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching members:', error);
              } else {
                callback(data as Member[]);
              }
            });
        }
      )
      .subscribe();

    // Initial load
    supabase
      .from('members')
      .select('*')
      .order('order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching members:', error);
        } else {
          callback(data as Member[]);
        }
      });

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  },

  getMembers: async (): Promise<Member[]> => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) {
      console.error('Error fetching members:', error);
      return [];
    }
    return data as Member[];
  },

  addMember: async (member: Omit<Member, 'id'>) => {
    const { data, error } = await supabase
      .from('members')
      .insert([member])
      .select();
    
    if (error) {
      console.error('Error adding member:', error);
      throw error;
    }
    return data[0];
  },

  updateMember: async (id: string, updates: Partial<Member>) => {
    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  deleteMember: async (id: string) => {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  },

  // Transactions
  subscribeToTransactions: (callback: (transactions: Transaction[]) => void) => {
    const subscription = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching transactions:', error);
              } else {
                callback(data as Transaction[]);
              }
            });
        }
      )
      .subscribe();

    // Initial load
    supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching transactions:', error);
        } else {
          callback(data as Transaction[]);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  getTransactions: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return data as Transaction[];
  },

  addTransaction: async (transaction: Omit<Transaction, 'id'>) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select();
    
    if (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
    return data[0];
  },

  deleteTransaction: async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  // Items
  subscribeToItems: (callback: (items: Item[]) => void) => {
    const subscription = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        (payload) => {
          supabase
            .from('items')
            .select('*')
            .order('name', { ascending: true })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching items:', error);
              } else {
                callback(data as Item[]);
              }
            });
        }
      )
      .subscribe();

    // Initial load
    supabase
      .from('items')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching items:', error);
        } else {
          callback(data as Item[]);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  getItems: async (): Promise<Item[]> => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching items:', error);
      return [];
    }
    return data as Item[];
  },

  addItem: async (item: Omit<Item, 'id'>) => {
    const { data, error } = await supabase
      .from('items')
      .insert([item])
      .select();
    
    if (error) {
      console.error('Error adding item:', error);
      throw error;
    }
    return data[0];
  },

  updateItem: async (id: string, updates: Partial<Item>) => {
    const { error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  deleteItem: async (id: string) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  // Orders
  subscribeToOrders: (callback: (orders: Order[]) => void) => {
    const subscription = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          supabase
            .from('orders')
            .select('*')
            .order('orderDate', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching orders:', error);
              } else {
                callback(data as Order[]);
              }
            });
        }
      )
      .subscribe();

    // Initial load
    supabase
      .from('orders')
      .select('*')
      .order('orderDate', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching orders:', error);
        } else {
          callback(data as Order[]);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  getOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('orderDate', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    return data as Order[];
  },

  addOrder: async (order: Omit<Order, 'id'>) => {
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select();
    
    if (error) {
      console.error('Error adding order:', error);
      throw error;
    }
    return data[0];
  },

  updateOrder: async (id: string, updates: Partial<Order>) => {
    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  // Gang Fund
  subscribeToGangFund: (callback: (fund: GangFund | null) => void) => {
    // For gang fund, we just get the single record with id 'main'
    supabase
      .from('gangfund')
      .select('*')
      .eq('id', 'main')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching gang fund:', error);
          callback(null);
        } else if (data && data.length > 0) {
          callback(data[0] as GangFund);
        } else {
          callback(null);
        }
      });

    // Set up real-time subscription
    const subscription = supabase
      .channel('gangfund-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gangfund',
          filter: 'id=eq.main'
        },
        (payload) => {
          callback(payload.new as GangFund);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  getGangFund: async (): Promise<GangFund | null> => {
    const { data, error } = await supabase
      .from('gangfund')
      .select('*')
      .eq('id', 'main')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Record not found
        return null;
      }
      console.error('Error fetching gang fund:', error);
      return null;
    }
    return data as GangFund;
  },

  updateGangFund: async (baseAmount: number, updatedBy: string) => {
    const fundData = {
      id: 'main',
      baseAmount,
      lastUpdated: new Date().toISOString(),
      updatedBy
    };

    const { error } = await supabase
      .from('gangfund')
      .upsert([fundData]);
    
    if (error) {
      console.error('Error updating gang fund:', error);
      throw error;
    }
  },

  // Audit Logs
  subscribeToAuditLogs: (callback: (auditLogs: AuditLog[]) => void) => {
    const subscription = supabase
      .channel('auditlogs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auditlogs',
        },
        (payload) => {
          supabase
            .from('auditlogs')
            .select('*')
            .order('createdAt', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching audit logs:', error);
              } else {
                callback(data as AuditLog[]);
              }
            });
        }
      )
      .subscribe();

    // Initial load
    supabase
      .from('auditlogs')
      .select('*')
      .order('createdAt', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching audit logs:', error);
        } else {
          callback(data as AuditLog[]);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('auditlogs')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    return data as AuditLog[];
  },

  addAuditLog: async (auditLog: Omit<AuditLog, 'id'>) => {
    const { data, error } = await supabase
      .from('auditlogs')
      .insert([auditLog])
      .select();
    
    if (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
    return data[0];
  },

  updateAuditLog: async (id: string, updates: Partial<AuditLog>) => {
    const { error } = await supabase
      .from('auditlogs')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating audit log:', error);
      throw error;
    }
  },

  deleteAuditLog: async (id: string) => {
    const { error } = await supabase
      .from('auditlogs')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting audit log:', error);
      throw error;
    }
  },

  // Weekly Payment Records
  subscribeToWeeklyPaymentRecords: (callback: (records: WeeklyPaymentRecord[]) => void) => {
    const subscription = supabase
      .channel('weeklypaymentrecords-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weeklypaymentrecords',
        },
        (payload) => {
          supabase
            .from('weeklypaymentrecords')
            .select('*')
            .order('weekNumber', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching weekly payment records:', error);
              } else {
                callback(data as WeeklyPaymentRecord[]);
              }
            });
        }
      )
      .subscribe();

    // Initial load
    supabase
      .from('weeklypaymentrecords')
      .select('*')
      .order('weekNumber', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching weekly payment records:', error);
        } else {
          callback(data as WeeklyPaymentRecord[]);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  getWeeklyPaymentRecords: async (): Promise<WeeklyPaymentRecord[]> => {
    const { data, error } = await supabase
      .from('weeklypaymentrecords')
      .select('*')
      .order('weekNumber', { ascending: false });
    
    if (error) {
      console.error('Error fetching weekly payment records:', error);
      return [];
    }
    return data as WeeklyPaymentRecord[];
  },

  addWeeklyPaymentRecord: async (record: Omit<WeeklyPaymentRecord, 'id'>) => {
    const { data, error } = await supabase
      .from('weeklypaymentrecords')
      .insert([record])
      .select();
    
    if (error) {
      console.error('Error adding weekly payment record:', error);
      throw error;
    }
    return data[0];
  },

  // Find existing weekly payment record for a specific member and week
  findWeeklyPaymentRecord: async (memberId: string, weekNumber: number): Promise<WeeklyPaymentRecord | null> => {
    try {
      const { data, error } = await supabase
        .from('weeklypaymentrecords')
        .select('*')
        .eq('memberId', memberId)
        .eq('weekNumber', weekNumber)
        .order('markedAt', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error finding weekly payment record:', error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] as WeeklyPaymentRecord : null;
    } catch (error) {
      console.error('Error finding weekly payment record:', error);
      return null;
    }
  },

  // Create or update weekly payment record (upsert)
  upsertWeeklyPaymentRecord: async (record: Omit<WeeklyPaymentRecord, 'id'>): Promise<void> => {
    try {
      const existingRecord = await supabaseService.findWeeklyPaymentRecord(record.memberId, record.weekNumber);
      
      if (existingRecord) {
        // Update existing record
        await supabaseService.updateWeeklyPaymentRecord(existingRecord.id, {
          hasPaid: record.hasPaid,
          paymentDate: record.paymentDate,
          markedBy: record.markedBy,
          markedAt: record.markedAt,
          contribution: record.contribution // Update contribution too in case it changed
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

  updateWeeklyPaymentRecord: async (id: string, updates: Partial<WeeklyPaymentRecord>) => {
    const { error } = await supabase
      .from('weeklypaymentrecords')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating weekly payment record:', error);
      throw error;
    }
  },

  deleteWeeklyPaymentRecord: async (id: string) => {
    const { error } = await supabase
      .from('weeklypaymentrecords')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting weekly payment record:', error);
      throw error;
    }
  },

  // Initialize default data
  initializeDefaultItems: async () => {
    try {
      // Check if items table is empty
      const { count, error: countError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error checking items count:', countError);
        return;
      }

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
        
        if (error) {
          console.error('Error adding default items:', error);
        } else {
          console.log('✅ Default items initialized');
        }
      }

      // Check if gang fund exists
      const { data: fundData, error: fundError } = await supabase
        .from('gangfund')
        .select('*')
        .eq('id', 'main')
        .single();
      
      if (fundError && fundError.code === 'PGRST116') { // Record not found
        console.log('💰 Initializing gang fund...');
        const fundRecord = {
          id: 'main',
          baseAmount: 20000,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'system'
        };
        
        const { error } = await supabase
          .from('gangfund')
          .insert([fundRecord]);
        
        if (error) {
          console.error('Error initializing gang fund:', error);
        } else {
          console.log('✅ Gang fund initialized with $20,000');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing default data:', error);
    }
  }
};
