import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingDown, DollarSign, Calendar, TrendingUp, Save, Trash2, Edit } from "lucide-react";
import { supabaseService as firestoreService, Transaction } from "@/lib/supabaseService";


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

  // Subscribe to real-time updates
  useEffect(() => {
    // Set a timeout to stop loading state if data doesn't load within 10 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, 10000);
    
    const unsubscribe = firestoreService.subscribeToTransactions((newTransactions) => {
      setTransactions(newTransactions);
      setLoading(false);
      setLoadError(false); // Clear error when data loads
      clearTimeout(timeoutId); // Clear timeout when data is received
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
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
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      await firestoreService.deleteTransaction(transactionId);
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
            <p className="text-destructive mt-2">Error loading data. Please check your Firebase connection.</p>
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                placeholder="Transaction description"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                className="bg-input md:col-span-2"
              />
              <Input
                type="number"
                placeholder="Amount ($)"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                className="bg-input"
              />
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as Transaction['type']})}
                className="px-3 py-2 bg-input border border-border rounded-md text-foreground"
              >
                <option value="expense">💸 Expense</option>
                <option value="income">💰 Income</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <select
                value={newTransaction.category}
                onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-foreground"
              >
                <option value="operation">🏠 Operations</option>
                <option value="equipment">🔫 Equipment</option>
                <option value="maintenance">🔧 Maintenance</option>
                <option value="contribution">💵 Contribution</option>
                <option value="other">📋 Other</option>
              </select>
              
              <Button onClick={addTransaction} className="btn-gang">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions List */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow">
            💰 Gang Fund Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {transaction.type === 'income' ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <h3 className="font-rajdhani font-bold">{transaction.description}</h3>
                    </div>
                    {getCategoryBadge(transaction.category)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-xl font-orbitron font-bold flex items-center ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}>
                      <DollarSign className="w-4 h-4" />
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString()}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTransaction(transaction.id)}
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

          {transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No transactions recorded yet. Clean books! 📚</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
