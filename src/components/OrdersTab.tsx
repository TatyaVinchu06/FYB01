import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Package, Clock, CheckCircle, AlertTriangle, Plus, Edit, Trash2, Save } from "lucide-react";
import { firestoreService, Transaction } from "@/lib/firestore";

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

  // Only admin can access
  const isAllowed = mode === "admin";
  if (!isAllowed) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p>You do not have permission to view this content.</p>
        <p className="mt-2">Please contact an administrator for access.</p>
      </div>
    );
  }


  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeItems = firestoreService.subscribeToItems((newItems) => {
      setAvailableItems(newItems);
      if (newItems.length > 0 && !newOrder.selectedItemId) {
        setNewOrder(prev => ({ ...prev, selectedItemId: newItems[0].id }));
      }
    });

    const unsubscribeOrders = firestoreService.subscribeToOrders((newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    });

    // Initialize default items if none exist
    firestoreService.initializeDefaultItems();

    return () => {
      unsubscribeItems();
      unsubscribeOrders();
    };
  }, [newOrder.selectedItemId]);
  const placeOrder = async () => {
    if (newOrder.memberName.trim() && newOrder.selectedItemId) {
      const selectedItem = availableItems.find(item => item.id === newOrder.selectedItemId);
      if (selectedItem) {
        const order = {
          memberId: "temp-member-id", // This would normally come from user auth
          memberName: newOrder.memberName.trim(),
          items: [{
            itemId: selectedItem.id,
            itemName: selectedItem.name,
            quantity: newOrder.quantity,
            price: selectedItem.price
          }],
          totalAmount: selectedItem.price * newOrder.quantity,
          status: 'pending' as const,
          orderDate: new Date().toISOString().split('T')[0]
        };
        try {
          await firestoreService.addOrder(order);
          setNewOrder({ memberName: "", selectedItemId: availableItems[0]?.id || "", quantity: 1 });
        } catch (error) {
          console.error('Error placing order:', error);
        }
      }
    }
  };

  const addItem = async () => {
    if (newItem.name.trim() && newItem.price && newItem.description) {
      const item = {
        name: newItem.name.trim(),
        price: parseFloat(newItem.price),
        category: 'other' as const,
        description: newItem.description.trim()
      };
      try {
        await firestoreService.addItem(item);
        setNewItem({ name: "", price: "", description: "" });
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  };

  const updateItem = async (itemId: string, updates: Partial<Item>) => {
    try {
      await firestoreService.updateItem(itemId, updates);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await firestoreService.deleteItem(itemId);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await firestoreService.updateOrder(orderId, { status: newStatus });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const styles = {
      pending: { class: "bg-warning text-gang-dark", icon: Clock },
      approved: { class: "bg-gang-purple text-gang-dark", icon: Package },
      completed: { class: "bg-success", icon: CheckCircle },
      cancelled: { class: "bg-destructive", icon: AlertTriangle }
    };
    
    const { class: className, icon: Icon } = styles[status];
    return (
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders and items...</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

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
                key={item.id}
                className="p-4 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingItem === item.id ? (
                      <EditItemForm 
                        item={item}
                        onSave={(updates) => updateItem(item.id, updates)}
                        onCancel={() => setEditingItem(null)}
                      />
                    ) : (
                      <>
                        <h3 className="font-rajdhani font-bold text-lg flex items-center gap-2">
                          <span className="text-2xl">📦</span>
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingItem !== item.id && (
                      <div className="text-xl font-orbitron font-bold text-success">
                        ${item.price}
                      </div>
                    )}
                    {editingItem !== item.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingItem(item.id)}
                          className="btn-gang-outline"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteItem(item.id)}
                          className="bg-destructive hover:bg-destructive/80"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Add New Item (Admin Only) */}
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
                <option key={item.id} value={item.id}>
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
            orders.map(order => (
              <div
                key={order.id}
                className="p-4 border border-border rounded-lg bg-muted/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                  <div className="font-bold font-rajdhani text-lg text-success">
                    {order.memberName}
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>
                <div className="mb-2">
                  <ul className="list-disc list-inside">
                    {order.items.map(item => (
                      <li key={item.itemId} className="font-rajdhani font-medium">
                        {item.itemName} × {item.quantity} (${(item.price * item.quantity).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right font-orbitron font-bold text-lg text-gang-glow">
                  Total: ${order.totalAmount.toFixed(2)}
                </div>

                {/* Controls to update status */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {order.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-gang-outline"
                        onClick={() => updateOrderStatus(order.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateOrderStatus(order.id, "cancelled")}
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {order.status === "approved" && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => updateOrderStatus(order.id, "completed")}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};


