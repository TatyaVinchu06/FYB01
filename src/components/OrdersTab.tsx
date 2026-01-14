import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Package, Clock, CheckCircle, AlertTriangle, Plus, Edit, Trash2, Save } from "lucide-react";
import { mongoService as firestoreService, Transaction, Item, Order } from "@/lib/mongoService";

// EditItemForm component to handle item editing safely
interface EditItemFormProps {
  item: Item;
  onSave: (updates: Partial<Item>) => void;
  onCancel: () => void;
}

const EditItemForm = ({ item, onSave, onCancel }: EditItemFormProps) => {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [price, setPrice] = useState(item.price.toString());

  const handleSave = () => {
    const updates: Partial<Item> = {};
    if (name !== item.name) updates.name = name;
    if (description !== item.description) updates.description = description;
    if (parseFloat(price) !== item.price) updates.price = parseFloat(price) || 0;
    
    onSave(updates);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-input"
          placeholder="Item name"
        />
      </div>
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-input"
        placeholder="Description"
      />
      <div className="flex gap-2">
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24 bg-input"
          placeholder="Price"
        />
        <Button size="sm" onClick={handleSave} className="btn-gang">
          <Save className="w-3 h-3 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

type UserMode = "admin" | "gangmember" | "viewer2";

interface OrdersTabProps {
  userMode?: UserMode | null;
}

function readRoleFallback(): UserMode | null {
  try {
    // 1) prop missing? try localStorage
    const ls = typeof window !== "undefined" ? localStorage.getItem("app.role") : null;
    if (typeof ls === "string") {
      const v = ls.trim().toLowerCase();
      if (v === "admin" || v === "gangmember" || v === "viewer2") return v as UserMode;
    }
    // 2) try query string ?role=admin
    if (typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search);
      const q = qs.get("role");
      if (typeof q === "string") {
        const v = q.trim().toLowerCase();
        if (v === "admin" || v === "gangmember" || v === "viewer2") return v as UserMode;
      }
    }
  } catch {}
  return null;
}

export const OrdersTab = (props: OrdersTabProps) => {
  const raw = props?.userMode ?? null;
  const normalizedFromProp =
    typeof raw === "string" ? (raw.trim().toLowerCase() as UserMode) : null;
  const fallback = normalizedFromProp ?? readRoleFallback();

  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("[OrdersTab] mode prop =", raw, "normalized =", normalizedFromProp, "fallback =", fallback);
  }

  const mode: UserMode | null = fallback;

  // Allow both admin (Leader) and gangmember (Gang Member) to access orders
  const isAllowed = mode === "admin" || mode === "gangmember";
  if (!isAllowed) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p>You do not have permission to view this content.</p>
        <p className="mt-2">Only Leaders and Gang Members can access Arsenal Orders.</p>
      </div>
    );
  }

  // Check if user is admin for edit permissions
  const isAdmin = mode === "admin";

  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: ""
  });
  
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const [newOrder, setNewOrder] = useState({
    memberName: "",
    selectedItemId: "",
    quantity: 1
  });

  // Fetch data from MongoDB
  useEffect(() => {
    let isCancelled = false;
    
    const fetchData = async () => {
      try {
        const [itemsData, ordersData] = await Promise.all([
          firestoreService.getItems(),
          firestoreService.getOrders()
        ]);
        
        if (!isCancelled) {
          setAvailableItems(itemsData);
          setOrders(ordersData);
          
          if (itemsData.length > 0 && !newOrder.selectedItemId) {
            setNewOrder(prev => ({ ...prev, selectedItemId: itemsData[0]._id || '' }));
          }
          
          setLoading(false);
          setLoadError(false); // Clear error when data loads
          clearTimeout(timeoutId); // Clear timeout when data is received
        }
      } catch (error) {
        console.error('Error fetching data:', error);
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

  const placeOrder = async () => {
    if (newOrder.memberName.trim() && newOrder.selectedItemId) {
      const selectedItem = availableItems.find(item => item._id === newOrder.selectedItemId);
      if (selectedItem) {
        const order = {
          memberId: '', // Will be set by backend
          memberName: newOrder.memberName.trim(),
          items: [{
            itemId: selectedItem._id || '',
            itemName: selectedItem.name,
            quantity: newOrder.quantity,
            price: selectedItem.price
          }],
          totalAmount: selectedItem.price * newOrder.quantity,
          status: 'pending' as const,
          orderDate: new Date().toISOString()
        };
        
        try {
          await firestoreService.addOrder(order);
          setNewOrder({ memberName: "", selectedItemId: availableItems[0]?._id || "", quantity: 1 });
          // Refresh data after adding order
          const [updatedItems, updatedOrders] = await Promise.all([
            firestoreService.getItems(),
            firestoreService.getOrders()
          ]);
          setAvailableItems(updatedItems);
          setOrders(updatedOrders);
        } catch (error) {
          console.error('Error placing order:', error);
        }
      }
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await firestoreService.updateOrder(orderId, { status });
      // Refresh data after updating
      const updatedOrders = await firestoreService.getOrders();
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await firestoreService.updateOrder(orderId, { status: 'cancelled' });
      // Refresh data after deleting
      const updatedOrders = await firestoreService.getOrders();
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const addItem = async () => {
    if (newItem.name.trim() && newItem.price) {
      const item = {
        name: newItem.name.trim(),
        price: parseFloat(newItem.price),
        description: newItem.description.trim(),
        category: 'other'
      };
      
      try {
        await firestoreService.addItem(item);
        setNewItem({ name: "", price: "", description: "" });
        // Refresh data after adding item
        const updatedItems = await firestoreService.getItems();
        setAvailableItems(updatedItems);
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  };

  const updateItem = async (itemId: string, updates: Partial<Item>) => {
    try {
      await firestoreService.updateItem(itemId, updates);
      setEditingItem(null);
      // Refresh data after updating
      const updatedItems = await firestoreService.getItems();
      setAvailableItems(updatedItems);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await firestoreService.deleteItem(itemId);
      // Refresh data after deleting
      const updatedItems = await firestoreService.getItems();
      setAvailableItems(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders and items...</p>
          {loadError && (
            <p className="text-destructive mt-2">Error loading data. Please check your Firebase connection.</p>
          )}
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalValue = orders
    .filter(o => o.status !== 'cancelled') // Exclude cancelled orders from total
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-glow">
              {orders.length}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-warning">
              {pendingOrders}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-neon">
              ${totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Items */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow">
            🛒 Gang Arsenal - Available Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No items available yet. Add some gear to the arsenal! 🔫</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableItems.map((item) => (
              <div
                key={item._id}
                className="p-4 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingItem === item._id && isAdmin ? (
                      <EditItemForm 
                        item={item}
                        onSave={(updates) => updateItem(item._id!, updates)}
                        onCancel={() => setEditingItem(null)}
                      />
                    ) : (
                      <>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingItem !== item._id && (
                      <div className="text-xl font-orbitron font-bold text-success">
                        ${item.price}
                      </div>
                    )}
                    {isAdmin && editingItem !== item._id && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item._id!)}
                          className="hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(item._id!)}
                          className="hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Item (Admin Only) */}
          {isAdmin && (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="p-4">
                <h4 className="font-rajdhani font-bold mb-3 text-gang-glow">Add New Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Item name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="bg-input"
                  />
                  <Input
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="bg-input"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                      className="bg-input flex-1"
                    />
                    <Button onClick={addItem} className="btn-gang">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Place New Order */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow">
            🎯 Place New Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Member name"
              value={newOrder.memberName}
              onChange={(e) => setNewOrder({...newOrder, memberName: e.target.value})}
              className="bg-input"
            />
            
            <select
              value={newOrder.selectedItemId}
              onChange={(e) => setNewOrder({...newOrder, selectedItemId: e.target.value})}
              className="px-3 py-2 bg-input border border-border rounded-md text-foreground"
            >
              {availableItems.map(item => (
                <option key={item._id} value={item._id}>
                  {item.name} (${item.price})
                </option>
              ))}
            </select>

            <Input
              type="number"
              min={1}
              placeholder="Quantity"
              value={newOrder.quantity}
              onChange={(e) => setNewOrder({...newOrder, quantity: Number(e.target.value) || 1})}
              className="bg-input"
            />

            <Button onClick={placeOrder} className="btn-gang">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Place Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow">Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center">No orders placed yet.</p>
          ) : (
            orders.map((order) => (
              <div key={order._id} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{order.memberName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge 
                    className={
                      order.status === 'pending' ? 'bg-warning text-warning-foreground' :
                      order.status === 'approved' ? 'bg-info text-info-foreground' :
                      order.status === 'completed' ? 'bg-success text-success-foreground' :
                      'bg-destructive text-destructive-foreground'
                    }
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="space-y-1 mb-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.itemName}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-orbitron font-bold text-success">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
                
                {isAdmin && (
                  <div className="flex gap-2 mt-3">
                    {order.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order._id!, 'approved')}
                          className="bg-info hover:bg-info/80"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteOrder(order._id!)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {order.status === 'approved' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateOrderStatus(order._id!, 'completed')}
                        className="bg-success hover:bg-success/80"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))

          )}
        </CardContent>
      </Card>
    </div>
  );
};

