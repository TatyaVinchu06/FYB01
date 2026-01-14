import { MongoClient, Db } from 'mongodb';

// MongoDB connection
const mongoUri = 'mongodb+srv://vinchu.t28mry5.mongodb.net/';
const username = 'ombhamare06_db_user';
const password = 'iLqeS0QdCd5O5clJ';
const dbName = 'fyb_gang_system';

// Create MongoDB client
const client = new MongoClient(mongoUri, {
  auth: {
    username,
    password
  }
});

let db: Db | null = null;

// Connect to MongoDB
async function connectToDatabase() {
  if (db) return db;
  
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Types
export interface Member {
  _id?: string;
  name: string;
  contribution: number;
  hasPaid: boolean;
  joinDate: string;
  order: number; // For drag-and-drop reordering
}

export interface Transaction {
  _id?: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
}

export interface Item {
  _id?: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export interface Order {
  _id?: string;
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
  _id?: string;
  baseAmount: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface AuditLog {
  _id?: string;
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
  _id?: string;
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

// MongoDB service
export const mongoService = {
  // Members
  async getMembers(): Promise<Member[]> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Member>('members');
      const members = await collection.find({}).sort({ order: 1 }).toArray();
      return members.map(member => ({
        ...member,
        _id: member._id?.toString()
      }));
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  },

  async addMember(member: Omit<Member, '_id'>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Member>('members');
      const result = await collection.insertOne({
        ...member,
        _id: undefined // Let MongoDB generate the ID
      });
      return { ...member, _id: result.insertedId.toString() };
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  },

  async updateMember(id: string, updates: Partial<Member>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Member>('members');
      await collection.updateOne(
        { _id: { $oid: id } },
        { $set: updates }
      );
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  async deleteMember(id: string) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Member>('members');
      await collection.deleteOne({ _id: { $oid: id } });
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  },

  async batchUpdateMembers(updates: { id: string; updates: Partial<Member> }[]) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Member>('members');
      
      const bulkOps = updates.map(({ id, updates: memberUpdates }) => ({
        updateOne: {
          filter: { _id: { $oid: id } },
          update: { $set: memberUpdates }
        }
      }));
      
      await collection.bulkWrite(bulkOps);
    } catch (error) {
      console.error('Error batch updating members:', error);
      throw error;
    }
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Transaction>('transactions');
      const transactions = await collection.find({}).sort({ date: -1 }).toArray();
      return transactions.map(transaction => ({
        ...transaction,
        _id: transaction._id?.toString()
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },

  async addTransaction(transaction: Omit<Transaction, '_id'>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Transaction>('transactions');
      const result = await collection.insertOne({
        ...transaction,
        _id: undefined
      });
      return { ...transaction, _id: result.insertedId.toString() };
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  },

  async deleteTransaction(id: string) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Transaction>('transactions');
      await collection.deleteOne({ _id: { $oid: id } });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  // Items
  async getItems(): Promise<Item[]> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Item>('items');
      const items = await collection.find({}).sort({ name: 1 }).toArray();
      return items.map(item => ({
        ...item,
        _id: item._id?.toString()
      }));
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  },

  async addItem(item: Omit<Item, '_id'>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Item>('items');
      const result = await collection.insertOne({
        ...item,
        _id: undefined
      });
      return { ...item, _id: result.insertedId.toString() };
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  async updateItem(id: string, updates: Partial<Item>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Item>('items');
      await collection.updateOne(
        { _id: { $oid: id } },
        { $set: updates }
      );
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  async deleteItem(id: string) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Item>('items');
      await collection.deleteOne({ _id: { $oid: id } });
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Order>('orders');
      const orders = await collection.find({}).sort({ orderDate: -1 }).toArray();
      return orders.map(order => ({
        ...order,
        _id: order._id?.toString()
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  async addOrder(order: Omit<Order, '_id'>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Order>('orders');
      const result = await collection.insertOne({
        ...order,
        _id: undefined
      });
      return { ...order, _id: result.insertedId.toString() };
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  },

  async updateOrder(id: string, updates: Partial<Order>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<Order>('orders');
      await collection.updateOne(
        { _id: { $oid: id } },
        { $set: updates }
      );
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  // Gang Fund
  async getGangFund(): Promise<GangFund | null> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<GangFund>('gangfund');
      const fund = await collection.findOne({ _id: 'main' });
      return fund ? { ...fund, _id: fund._id?.toString() } : null;
    } catch (error) {
      console.error('Error fetching gang fund:', error);
      return null;
    }
  },

  async updateGangFund(baseAmount: number, updatedBy: string) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<GangFund>('gangfund');
      
      const fundData = {
        _id: 'main',
        baseAmount,
        lastUpdated: new Date().toISOString(),
        updatedBy
      };

      await collection.replaceOne(
        { _id: 'main' },
        fundData,
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating gang fund:', error);
      throw error;
    }
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<AuditLog>('auditlogs');
      const auditLogs = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return auditLogs.map(log => ({
        ...log,
        _id: log._id?.toString()
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  },

  async addAuditLog(auditLog: Omit<AuditLog, '_id'>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<AuditLog>('auditlogs');
      const result = await collection.insertOne({
        ...auditLog,
        _id: undefined
      });
      return { ...auditLog, _id: result.insertedId.toString() };
    } catch (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
  },

  async updateAuditLog(id: string, updates: Partial<AuditLog>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<AuditLog>('auditlogs');
      await collection.updateOne(
        { _id: { $oid: id } },
        { $set: updates }
      );
    } catch (error) {
      console.error('Error updating audit log:', error);
      throw error;
    }
  },

  async deleteAuditLog(id: string) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<AuditLog>('auditlogs');
      await collection.deleteOne({ _id: { $oid: id } });
    } catch (error) {
      console.error('Error deleting audit log:', error);
      throw error;
    }
  },

  // Weekly Payment Records
  async getWeeklyPaymentRecords(): Promise<WeeklyPaymentRecord[]> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<WeeklyPaymentRecord>('weeklypaymentrecords');
      const records = await collection.find({}).sort({ weekNumber: -1 }).toArray();
      return records.map(record => ({
        ...record,
        _id: record._id?.toString()
      }));
    } catch (error) {
      console.error('Error fetching weekly payment records:', error);
      return [];
    }
  },

  async addWeeklyPaymentRecord(record: Omit<WeeklyPaymentRecord, '_id'>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<WeeklyPaymentRecord>('weeklypaymentrecords');
      const result = await collection.insertOne({
        ...record,
        _id: undefined
      });
      return { ...record, _id: result.insertedId.toString() };
    } catch (error) {
      console.error('Error adding weekly payment record:', error);
      throw error;
    }
  },

  async findWeeklyPaymentRecord(memberId: string, weekNumber: number): Promise<WeeklyPaymentRecord | null> {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<WeeklyPaymentRecord>('weeklypaymentrecords');
      const record = await collection.findOne({
        memberId,
        weekNumber
      });
      return record ? { ...record, _id: record._id?.toString() } : null;
    } catch (error) {
      console.error('Error finding weekly payment record:', error);
      return null;
    }
  },

  async upsertWeeklyPaymentRecord(record: Omit<WeeklyPaymentRecord, '_id'>): Promise<void> {
    try {
      const existingRecord = await mongoService.findWeeklyPaymentRecord(record.memberId, record.weekNumber);
      
      if (existingRecord) {
        // Update existing record
        await mongoService.updateWeeklyPaymentRecord(existingRecord._id!, {
          hasPaid: record.hasPaid,
          paymentDate: record.paymentDate,
          markedBy: record.markedBy,
          markedAt: record.markedAt,
          contribution: record.contribution
        });
        console.log('✅ Updated existing weekly payment record');
      } else {
        // Create new record
        await mongoService.addWeeklyPaymentRecord(record);
        console.log('✅ Created new weekly payment record');
      }
    } catch (error) {
      console.error('Error upserting weekly payment record:', error);
      throw error;
    }
  },

  async updateWeeklyPaymentRecord(id: string, updates: Partial<WeeklyPaymentRecord>) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<WeeklyPaymentRecord>('weeklypaymentrecords');
      await collection.updateOne(
        { _id: { $oid: id } },
        { $set: updates }
      );
    } catch (error) {
      console.error('Error updating weekly payment record:', error);
      throw error;
    }
  },

  async deleteWeeklyPaymentRecord(id: string) {
    try {
      const database = await connectToDatabase();
      const collection = database.collection<WeeklyPaymentRecord>('weeklypaymentrecords');
      await collection.deleteOne({ _id: { $oid: id } });
    } catch (error) {
      console.error('Error deleting weekly payment record:', error);
      throw error;
    }
  },

  // Initialize default data
  async initializeDefaultItems() {
    try {
      const database = await connectToDatabase();
      
      // Check if items collection is empty
      const itemsCollection = database.collection<Item>('items');
      const itemCount = await itemsCollection.countDocuments();
      
      if (itemCount === 0) {
        console.log('🎯 Initializing default items...');
        
        const defaultItems = [
          { name: "AK-47", price: 2500, category: "weapon", description: "Classic assault rifle" },
          { name: "Bulletproof Vest", price: 800, category: "armor", description: "Level IIIA protection" },
          { name: "Night Vision Goggles", price: 1200, category: "equipment", description: "See in the dark" },
          { name: "Encrypted Radio", price: 300, category: "communication", description: "Secure comms" },
          { name: "Smoke Grenades", price: 150, category: "tactical", description: "Pack of 3" }
        ];

        await itemsCollection.insertMany(defaultItems);
        console.log('✅ Default items initialized');
      }

      // Check if gang fund exists
      const gangFundCollection = database.collection<GangFund>('gangfund');
      const fundExists = await gangFundCollection.findOne({ _id: 'main' });
      
      if (!fundExists) {
        console.log('💰 Initializing gang fund...');
        const fundRecord = {
          _id: 'main',
          baseAmount: 20000,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'system'
        };
        
        await gangFundCollection.insertOne(fundRecord);
        console.log('✅ Gang fund initialized with $20,000');
      }
    } catch (error) {
      console.error('❌ Error initializing default data:', error);
    }
  }
};