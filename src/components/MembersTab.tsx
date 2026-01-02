import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon,
  PlusIcon
} from "@radix-ui/react-icons";
import { supabaseService as firestoreService, Transaction, Member, GangFund, Order, WeeklyPaymentRecord } from "@/lib/supabaseService";

// Define the type for the props
interface MembersTabProps {
  members: Member[];
  setMembers: (members: Member[]) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  gangFund: GangFund | null;
  setGangFund: (fund: GangFund) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  weeklyPaymentRecords: WeeklyPaymentRecord[];
  setWeeklyPaymentRecords: (records: WeeklyPaymentRecord[]) => void;
}

export default function MembersTab({
  members,
  setMembers,
  transactions,
  setTransactions,
  gangFund,
  setGangFund,
  orders,
  setOrders,
  weeklyPaymentRecords,
  setWeeklyPaymentRecords
}: MembersTabProps) {
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberContribution, setNewMemberContribution] = useState(100);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editContribution, setEditContribution] = useState(100);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Calculate total members and total paid
  const totalMembers = members.length;
  const totalPaid = members.filter(m => m.hasPaid).length;
  const totalWeeklyAmount = members.reduce((sum, member) => sum + member.contribution, 0);

  // Function to add a new member
  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;

    try {
      const newMemberData = {
        name: newMemberName.trim(),
        contribution: newMemberContribution,
        hasPaid: false,
        joinDate: new Date().toISOString().split('T')[0],
        order: members.length // Set order to current length to add at the end
      };

      const newMember = await firestoreService.addMember(newMemberData);
      setMembers([...members, newMember]);
      
      // Reset form
      setNewMemberName("");
      setNewMemberContribution(100);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member. Please try again.");
    }
  };

  // Function to update a member
  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      await firestoreService.updateMember(editingMember.id, {
        name: editName.trim(),
        contribution: editContribution
      });

      setMembers(members.map(m => 
        m.id === editingMember.id 
          ? { ...m, name: editName.trim(), contribution: editContribution } 
          : m
      ));
      
      setEditingMember(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member. Please try again.");
    }
  };

  // Function to delete a member
  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete member "${name}"?`)) return;

    try {
      await firestoreService.deleteMember(id);
      setMembers(members.filter(m => m.id !== id));
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    }
  };

  // Function to update payment status
  const handlePaymentStatusChange = async (id: string, hasPaid: boolean) => {
    try {
      await firestoreService.updateMember(id, { hasPaid });
      setMembers(members.map(m => 
        m.id === id ? { ...m, hasPaid } : m
      ));
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Failed to update payment status. Please try again.");
    }
  };

  // Function to move a member up in the list
  const moveMemberUp = async (index: number) => {
    if (index <= 0) return;

    const newMembers = [...members];
    [newMembers[index], newMembers[index - 1]] = [newMembers[index - 1], newMembers[index]];
    
    // Update the order field in the database
    try {
      await firestoreService.batchUpdateMembers([
        { id: newMembers[index].id, updates: { order: index } },
        { id: newMembers[index - 1].id, updates: { order: index - 1 } }
      ]);
      
      setMembers(newMembers);
    } catch (error) {
      console.error("Error moving member up:", error);
      alert("Failed to move member. Please try again.");
    }
  };

  // Function to move a member down in the list
  const moveMemberDown = async (index: number) => {
    if (index >= members.length - 1) return;

    const newMembers = [...members];
    [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    
    // Update the order field in the database
    try {
      await firestoreService.batchUpdateMembers([
        { id: newMembers[index].id, updates: { order: index } },
        { id: newMembers[index + 1].id, updates: { order: index + 1 } }
      ]);
      
      setMembers(newMembers);
    } catch (error) {
      console.error("Error moving member down:", error);
      alert("Failed to move member. Please try again.");
    }
  };

  // Function to open edit dialog
  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditContribution(member.contribution);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground">
            Manage your gang members and their payment status
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="memberName">Member Name</Label>
                <Input
                  id="memberName"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter member name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contribution">Weekly Contribution ($)</Label>
                <Input
                  id="contribution"
                  type="number"
                  value={newMemberContribution}
                  onChange={(e) => setNewMemberContribution(Number(e.target.value))}
                  placeholder="Enter contribution amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddMember}>Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">All crew members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaid}</div>
            <p className="text-xs text-muted-foreground">Members who paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weekly Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalWeeklyAmount}</div>
            <p className="text-xs text-muted-foreground">Total contribution</p>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {members.map((member, index) => (
          <Card key={member.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <span className="font-medium">{member.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${member.contribution}/week
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={member.hasPaid ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {member.hasPaid ? "Paid" : "Unpaid"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePaymentStatusChange(member.id, !member.hasPaid)}
                    >
                      {member.hasPaid ? "Mark Unpaid" : "Mark Paid"}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveMemberUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUpIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveMemberDown(index)}
                    disabled={index === members.length - 1}
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <DotsVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(member)}>
                      <Pencil1Icon className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="text-destructive"
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <div className="text-sm text-muted-foreground">
              <span>Joined: {member.joinDate}</span>
            </div>
          </Card>
        ))}
        
        {members.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No members yet. Add your first member to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Member Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter member name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editContribution">Weekly Contribution ($)</Label>
              <Input
                id="editContribution"
                type="number"
                value={editContribution}
                onChange={(e) => setEditContribution(Number(e.target.value))}
                placeholder="Enter contribution amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateMember}>Update Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
