import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingDown, DollarSign, Calendar, TrendingUp, Save, Trash2, Edit } from "lucide-react";
import { mongoService as firestoreService, Transaction } from "@/lib/mongoService";


interface ExpendituresTabProps {
  isAdmin: boolean;
}

export const ExpendituresTab = ({ isAdmin }: ExpendituresTabProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    type: "expense" as Transaction['type'],
    category: "operation"
  });

  // Fetch data from MongoDB
  useEffect(() => {
    let isCancelled = false;
    
    const fetchData = async () => {
      try {
        const transactionsData = await firestoreService.getTransactions();
        
        if (!isCancelled) {
          setTransactions(transactionsData);
          setLoading(false);
          setLoadError(false); // Clear error when data loads
          clearTimeout(timeoutId); // Clear timeout when data is received
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        if (!isCancelled) {
          setLoading(false);
          setLoadError(true);
        }
      }
    };
    
    // Set a timeout to stop loading state if data doesn't load within 10 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, 10000);
    
    fetchData();
    
    // Poll for updates every 30 seconds since MongoDB doesn't have real-time subscriptions
    const intervalId = setInterval(fetchData, 30000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  const addTransaction = async () => {
    if (newTransaction.description.trim() && newTransaction.amount) {
      const transaction = {
        description: newTransaction.description.trim(),
        amount: parseFloat(newTransaction.amount),
        date: new Date().toISOString().split('T')[0],
        type: newTransaction.type as 'income' | 'expense',
        category: newTransaction.category
      };
      try {
        await firestoreService.addTransaction(transaction);
        setNewTransaction({ description: "", amount: "", type: "expense", category: "operation" });
        // Refresh data after adding
        const updatedTransactions = await firestoreService.getTransactions();
        setTransactions(updatedTransactions);
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      await firestoreService.deleteTransaction(transactionId);
      // Refresh data after deleting
      const updatedTransactions = await firestoreService.getTransactions();
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, inc) => sum + inc.amount, 0);
  const netAmount = totalIncome - totalSpent;
  
  const getCategoryBadge = (category: string) => {
    const styles = {
      operation: "bg-gang-purple text-gang-dark",
      equipment: "bg-destructive",
      maintenance: "bg-warning text-gang-dark",
      contribution: "bg-success",
      other: "bg-muted-foreground"
    };
    
    const labels = {
      operation: "🏠 Operations",
      equipment: "🔫 Equipment",
      maintenance: "🔧 Maintenance",
      contribution: "💵 Contribution",
      other: "📋 Other"
    };

    return (
      <Badge className={styles[category as keyof typeof styles] || styles.other}>
        {labels[category as keyof typeof labels] || labels.other}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transactions...</p>
          {loadError && (
            <p className="text-destructive mt-2">Error loading data. Please check your MongoDB connection.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground flex items-center">
              <TrendingDown className="w-4 h-4 mr-2" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-destructive">
              ${totalSpent.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-success">
              ${totalIncome.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-orbitron font-bold ${netAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${netAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-glow">
              {transactions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Transaction (Admin Only) */}
      {isAdmin && (
        <Card className="card-gang">
          <CardHeader>
            <CardTitle className="font-orbitron text-gang-glow">
              💰 Record New Transaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  placeholder="What was this transaction for?"
                  className="bg-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Amount ($)</label>
                <Input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  placeholder="0.00"
                  className="bg-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as any})}
                  className="w-full p-2 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="expense">💸 Expense</option>
                  <option value="income">💰 Income</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                  className="w-full p-2 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="operation">🏠 Operations</option>
                  <option value="equipment">🔫 Equipment</option>
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="contribution">💵 Contribution</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
            </div>
            
            <Button 
              onClick={addTransaction}
              className="mt-4 btn-gang"
              disabled={!newTransaction.description.trim() || !newTransaction.amount}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions recorded yet</p>
              <p className="text-sm mt-2">Add your first transaction above</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'income' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                      }`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </span>
                          {getCategoryBadge(transaction.category)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`text-right font-orbitron font-bold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </div>
                    
                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTransaction(transaction._id!)}
                        className="bg-destructive hover:bg-destructive/80"
                        title="Delete this transaction (if it was added by mistake)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};