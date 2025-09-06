import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, UserCheck, UserX, DollarSign, Trash2, Save, Edit, Settings, GripVertical } from "lucide-react";
import { firestoreService, Transaction, Member, GangFund, Order } from "@/lib/firestore";



interface MembersTabProps {
  isAdmin: boolean;
}

interface SortableMemberItemProps {
  member: Member;
  index: number;
  isAdmin: boolean;
  editingContribution: { [key: string]: string };
  setEditingContribution: (value: { [key: string]: string }) => void;
  updateMemberContribution: (memberId: string) => void;
  startEditingContribution: (memberId: string, currentAmount: number) => void;
  togglePayment: (memberId: string) => void;
  deleteMember: (memberId: string) => void;
  safeFormatDate: (value: string) => string;
  onDragStart: (e: React.DragEvent, memberId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, memberId: string) => void;
  isDragging: boolean;
}

const SortableMemberItem = ({
  member,
  index,
  isAdmin,
  editingContribution,
  setEditingContribution,
  updateMemberContribution,
  startEditingContribution,
  togglePayment,
  deleteMember,
  safeFormatDate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: SortableMemberItemProps) => {
  return (
    <div
      draggable={isAdmin}
      onDragStart={(e) => onDragStart(e, member.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, member.id)}
      className={`flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-move ${
        isDragging ? 'opacity-50 shadow-lg border-2 border-primary' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle (Admin Only) */}
        {isAdmin && (
          <div
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        
        <div className="w-10 h-10 bg-gang-purple/20 rounded-full flex items-center justify-center">
          {member.hasPaid ? (
            <UserCheck className="w-5 h-5 text-success" />
          ) : (
            <UserX className="w-5 h-5 text-destructive" />
          )}
        </div>
        <div>
          <h3 className="font-rajdhani font-bold">{member.name}</h3>
          <p className="text-sm text-muted-foreground">
            Joined: {safeFormatDate(member.joinDate)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Contribution Amount - Editable for Admin */}
        <div className="flex flex-col items-end">
          {isAdmin && editingContribution[member.id] ? (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={editingContribution[member.id]}
                onChange={(e) => setEditingContribution({
                  ...editingContribution, 
                  [member.id]: e.target.value
                })}
                className="w-24 h-8 text-sm bg-input"
                placeholder="Amount"
              />
              <Button
                onClick={() => updateMemberContribution(member.id)}
                size="sm"
                className="h-8 px-2 btn-gang"
              >
                <Save className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => setEditingContribution({ 
                  ...editingContribution, 
                  [member.id]: "" 
                })}
                variant="outline"
                size="sm"
                className="h-8 px-2"
              >
                ×
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-orbitron font-bold">
                ${member.contribution}
              </span>
              {isAdmin && (
                <Button
                  onClick={() => startEditingContribution(member.id, member.contribution)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <Edit className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        <Badge
          variant={member.hasPaid ? "default" : "destructive"}
          className={member.hasPaid ? "bg-success hover:bg-success/80" : ""}
        >
          {member.hasPaid ? "✅ Paid" : "❌ Pending"}
        </Badge>
        
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant={member.hasPaid ? "default" : "outline"}
              size="sm"
              onClick={() => togglePayment(member.id)}
              className={member.hasPaid ? 
                "bg-success hover:bg-success/80 text-white border-success" : 
                "btn-gang-outline hover:bg-success/10 hover:border-success hover:text-success transition-colors"
              }
            >
              {member.hasPaid ? "✅ Mark Unpaid" : "💰 Mark Paid"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMember(member.id)}
              className="bg-destructive hover:bg-destructive/80"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const MembersTab = ({ isAdmin }: MembersTabProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState("");
  const [gangFund, setGangFund] = useState<GangFund | null>(null);
  const [isEditingFunds, setIsEditingFunds] = useState(false);
  const [editFundAmount, setEditFundAmount] = useState("");
  const [editingContribution, setEditingContribution] = useState<{ [key: string]: string }>({});
  const [creatingTestData, setCreatingTestData] = useState(false);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);

  const safeFormatDate = (value: string) => {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value || 'Unknown';
      return d.toLocaleDateString();
    } catch {
      return value || 'Unknown';
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeMembers = firestoreService.subscribeToMembers((newMembers) => {
      console.log('📥 Received members data:', newMembers);
      
      // Validate that we have an array
      if (!Array.isArray(newMembers)) {
        console.error('❌ Expected array of members, got:', typeof newMembers, newMembers);
        setMembers([]);
        setLoading(false);
        return;
      }
      
      // Validate each member object
      const validMembers = newMembers.filter(member => {
        const isValid = member && 
          typeof member === 'object' && 
          typeof member.id === 'string' && 
          typeof member.name === 'string' && 
          typeof member.contribution === 'number' && 
          typeof member.hasPaid === 'boolean' && 
          typeof member.joinDate === 'string';
        
        if (!isValid) {
          console.error('❌ Invalid member data:', member);
        }
        
        return isValid;
      });
      
      setMembers(validMembers);
      setLoading(false);
    });

    const unsubscribeOrders = firestoreService.subscribeToOrders((newOrders) => {
      setOrders(newOrders);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeOrders();
    };
  }, []);

  // Subscribe to gang fund updates
  useEffect(() => {
    const unsubscribe = firestoreService.subscribeToGangFund((fundData) => {
      setGangFund(fundData);
      if (fundData && !editFundAmount) {
        setEditFundAmount(fundData.baseAmount.toString());
      }
    });

    return () => unsubscribe();
  }, [editFundAmount]);

  const addMember = async () => {
    if (newMemberName.trim()) {
      const newMember = {
        name: newMemberName.trim(),
        contribution: 500,
        hasPaid: false,
        joinDate: new Date().toISOString().split('T')[0],
        order: members.length // Set order as the next position
      };
      try {
        await firestoreService.addMember(newMember);
        setNewMemberName("");
      } catch (error) {
        console.error('Error adding member:', error);
      }
    }
  };

  const togglePayment = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      // Optimistic update - update local state immediately
      const updatedMembers = members.map(m => 
        m.id === memberId ? { ...m, hasPaid: !m.hasPaid } : m
      );
      setMembers(updatedMembers);

      try {
        await firestoreService.updateMember(memberId, { hasPaid: !member.hasPaid });
      } catch (error) {
        console.error('Error updating member:', error);
        // Revert optimistic update on error
        const revertedMembers = members.map(m => 
          m.id === memberId ? { ...m, hasPaid: member.hasPaid } : m
        );
        setMembers(revertedMembers);
      }
    }
  };

  const deleteMember = async (memberId: string) => {
    try {
      await firestoreService.deleteMember(memberId);
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const updateGangFund = async () => {
    if (editFundAmount.trim()) {
      try {
        await firestoreService.updateGangFund(parseFloat(editFundAmount), 'admin');
        setIsEditingFunds(false);
      } catch (error) {
        console.error('Error updating gang fund:', error);
      }
    }
  };

  const updateMemberContribution = async (memberId: string) => {
    const newAmount = editingContribution[memberId];
    if (newAmount && !isNaN(parseFloat(newAmount))) {
      try {
        await firestoreService.updateMember(memberId, { contribution: parseFloat(newAmount) });
        setEditingContribution({ ...editingContribution, [memberId]: "" });
      } catch (error) {
        console.error('Error updating contribution:', error);
      }
    }
  };

  const startEditingContribution = (memberId: string, currentAmount: number) => {
    setEditingContribution({ ...editingContribution, [memberId]: currentAmount.toString() });
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    setDraggedMemberId(memberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetMemberId: string) => {
    e.preventDefault();
    
    if (!draggedMemberId || draggedMemberId === targetMemberId) {
      setDraggedMemberId(null);
      return;
    }

    const sortedMembers = [...members].sort((a, b) => (a.order || 0) - (b.order || 0));
    const draggedIndex = sortedMembers.findIndex(member => member.id === draggedMemberId);
    const targetIndex = sortedMembers.findIndex(member => member.id === targetMemberId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMemberId(null);
      return;
    }

    // Create new array with reordered members
    const reorderedMembers = [...sortedMembers];
    const [draggedMember] = reorderedMembers.splice(draggedIndex, 1);
    reorderedMembers.splice(targetIndex, 0, draggedMember);

    // Update orders in Firestore
    try {
      const updatePromises = reorderedMembers.map((member, index) => 
        firestoreService.updateMember(member.id, { order: index })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error reordering members:', error);
    }

    setDraggedMemberId(null);
  };

  const createTestData = async () => {
    setCreatingTestData(true);
    try {
      console.log('🎯 Creating test members...');
      
      // Create test members with gang-themed names
      const testMembers = [
        {
          name: "Big Mike",
          contribution: 500,
          hasPaid: true,
          joinDate: "2024-01-15",
          order: members.length
        },
        {
          name: "Lil Tony",
          contribution: 300,
          hasPaid: false,
          joinDate: "2024-02-10",
          order: members.length + 1
        },
        {
          name: "Purple Reign",
          contribution: 750,
          hasPaid: true,
          joinDate: "2024-01-05",
          order: members.length + 2
        }
      ];
      
      for (const member of testMembers) {
        await firestoreService.addMember(member);
        console.log('✅ Added member:', member.name);
      }
      
      console.log('✅ All test members recruited!');
    } catch (error) {
      console.error('❌ Error recruiting members:', error);
    } finally {
      setCreatingTestData(false);
    }
  };

  const paidMembers = members.filter(m => m.hasPaid);
  const totalContributions = paidMembers.reduce((sum, member) => sum + member.contribution, 0);
  const baseAmount = gangFund?.baseAmount || 20000;
  
  // Add approved orders to collected funds
  const approvedOrdersTotal = orders
    .filter(order => order.status === 'approved' || order.status === 'completed')
    .reduce((sum, order) => sum + order.totalAmount, 0);
  
  const totalFunds = baseAmount + totalContributions + approvedOrdersTotal;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading gang members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-glow">
              {members.length}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Paid This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-success">
              {paidMembers.length}/{members.length}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Collected Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-neon">
              ${totalFunds.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gang Fund Management (Admin Only) */}
      {isAdmin && (
        <Card className="card-gang">
          <CardHeader>
            <CardTitle className="font-orbitron text-gang-glow flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Gang Fund Management 💰
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm font-rajdhani text-muted-foreground">Base Gang Fund Amount</label>
                {isEditingFunds ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      value={editFundAmount}
                      onChange={(e) => setEditFundAmount(e.target.value)}
                      className="bg-input"
                      placeholder="Enter base amount"
                    />
                    <Button onClick={updateGangFund} size="sm" className="btn-gang">
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsEditingFunds(false);
                        setEditFundAmount(gangFund?.baseAmount.toString() || "20000");
                      }} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-lg font-orbitron font-bold text-gang-neon">
                      ${baseAmount.toLocaleString()}
                    </div>
                    <Button 
                      onClick={() => setIsEditingFunds(true)} 
                      variant="outline" 
                      size="sm"
                      className="btn-gang-outline"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {gangFund?.lastUpdated ? new Date(gangFund.lastUpdated).toLocaleString() : 'Never'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Member (Admin Only) */}
      {isAdmin && (
        <Card className="card-gang">
          <CardHeader>
            <CardTitle className="font-orbitron text-gang-glow">
              Add New Gang Member 👥
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter member name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 bg-input"
                onKeyPress={(e) => e.key === 'Enter' && addMember()}
              />
              <Button onClick={addMember} className="btn-gang">
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow">
            Gang Members & Weekly Contributions 💜
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members && Array.isArray(members) && members.length > 0 ? (
              [...members]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((member, index) => {
                  // Additional safety check for each member
                  if (!member || typeof member !== 'object' || !member.id) {
                    console.error('❌ Skipping invalid member:', member);
                    return null;
                  }
                  
                  return (
                    <SortableMemberItem
                      key={member.id}
                      member={member}
                      index={index}
                      isAdmin={isAdmin}
                      editingContribution={editingContribution}
                      setEditingContribution={setEditingContribution}
                      updateMemberContribution={updateMemberContribution}
                      startEditingContribution={startEditingContribution}
                      togglePayment={togglePayment}
                      deleteMember={deleteMember}
                      safeFormatDate={safeFormatDate}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      isDragging={draggedMemberId === member.id}
                    />
                  );
                })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="mb-4">No gang members yet. Time to recruit! 🎯</p>
                {isAdmin && (
                  <div className="mt-4">
                    <p className="text-sm text-gang-glow mb-3">
                      Quick recruit some members to get started:
                    </p>
                    <Button 
                      onClick={createTestData} 
                      disabled={creatingTestData}
                      className="btn-gang"
                    >
                      {creatingTestData ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Recruiting...
                        </div>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Recruit Gang Members 👥
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

      </Card>
    </div>
  );
};
