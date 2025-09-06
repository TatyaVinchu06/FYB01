import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, CheckCircle, XCircle, Clock, DollarSign, Edit, Save, X } from "lucide-react";
import { firestoreService, Member, Order, WeeklyPaymentRecord } from "@/lib/firestore";

interface AuditLogsTabProps {
  isAdmin: boolean;
}

interface WeeklyAuditLog {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  members: {
    memberId: string;
    memberName: string;
    hasPaid: boolean;
    contribution: number;
    paymentDate?: string;
  }[];
  totalExpected: number;
  totalCollected: number;
  collectionRate: number;
}

export const AuditLogsTab = ({ isAdmin }: AuditLogsTabProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [weeklyPaymentRecords, setWeeklyPaymentRecords] = useState<WeeklyPaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<WeeklyAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<{ memberId: string; weekNumber: number } | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeMembers = firestoreService.subscribeToMembers((newMembers) => {
      setMembers(newMembers);
    });

    const unsubscribeOrders = firestoreService.subscribeToOrders((newOrders) => {
      setOrders(newOrders);
    });

    const unsubscribePaymentRecords = firestoreService.subscribeToWeeklyPaymentRecords((newRecords) => {
      setWeeklyPaymentRecords(newRecords);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeOrders();
      unsubscribePaymentRecords();
    };
  }, []);

  // Generate audit logs for the last 4 weeks
  useEffect(() => {
    if (members.length > 0) {
      generateAuditLogs();
      setLoading(false);
    }
  }, [members, orders, weeklyPaymentRecords]);

  const generateAuditLogs = () => {
    const logs: WeeklyAuditLog[] = [];
    const today = new Date();
    
    // Generate logs for the last 4 weeks
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * i)); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekNumber = 4 - i;
      
      // Get members who were active during this week
      const activeMembers = members.filter(member => {
        const joinDate = new Date(member.joinDate);
        return joinDate <= weekEnd;
      });

      // Calculate payment status for this week using weekly payment records
      const memberLogs = activeMembers.map(member => {
        // Check if there's a payment record for this member and week
        const paymentRecord = weeklyPaymentRecords.find(record => 
          record.memberId === member.id && record.weekNumber === weekNumber
        );
        
        if (paymentRecord) {
          return {
            memberId: member.id,
            memberName: member.name,
            hasPaid: paymentRecord.hasPaid,
            contribution: paymentRecord.contribution,
            paymentDate: paymentRecord.paymentDate
          };
        }
        
        // Fallback to current payment status if no record exists
        return {
          memberId: member.id,
          memberName: member.name,
          hasPaid: member.hasPaid,
          contribution: member.contribution,
          paymentDate: member.hasPaid ? weekStart.toISOString().split('T')[0] : undefined
        };
      });

      const totalExpected = memberLogs.reduce((sum, member) => sum + member.contribution, 0);
      const totalCollected = memberLogs
        .filter(member => member.hasPaid)
        .reduce((sum, member) => sum + member.contribution, 0);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

      logs.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        weekNumber,
        members: memberLogs,
        totalExpected,
        totalCollected,
        collectionRate
      });
    }

    setAuditLogs(logs);
  };

  const getStatusIcon = (hasPaid: boolean) => {
    return hasPaid ? (
      <CheckCircle className="w-4 h-4 text-success" />
    ) : (
      <XCircle className="w-4 h-4 text-destructive" />
    );
  };

  const getStatusBadge = (hasPaid: boolean) => {
    return hasPaid ? (
      <Badge className="bg-success hover:bg-success/80">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const markPayment = async (memberId: string, weekNumber: number, hasPaid: boolean, notes?: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * (4 - weekNumber)));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Check if record already exists
    const existingRecord = weeklyPaymentRecords.find(record => 
      record.memberId === memberId && record.weekNumber === weekNumber
    );

    if (existingRecord) {
      // Update existing record
      await firestoreService.updateWeeklyPaymentRecord(existingRecord.id, {
        hasPaid,
        paymentDate: hasPaid ? new Date().toISOString().split('T')[0] : undefined,
        markedBy: 'admin',
        markedAt: new Date().toISOString(),
        notes: notes || existingRecord.notes
      });
    } else {
      // Create new record
      await firestoreService.addWeeklyPaymentRecord({
        memberId,
        memberName: member.name,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        weekNumber,
        contribution: member.contribution,
        hasPaid,
        paymentDate: hasPaid ? new Date().toISOString().split('T')[0] : undefined,
        markedBy: 'admin',
        markedAt: new Date().toISOString(),
        notes
      });
    }

    setEditingPayment(null);
    setPaymentNotes("");
  };

  const startEditingPayment = (memberId: string, weekNumber: number) => {
    setEditingPayment({ memberId, weekNumber });
    setPaymentNotes("");
  };

  const cancelEditingPayment = () => {
    setEditingPayment(null);
    setPaymentNotes("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-orbitron font-bold text-gang-glow mb-2">
          <FileText className="w-8 h-8 inline mr-3" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground">
          Weekly payment tracking for the last 4 weeks
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">
              <Calendar className="w-4 h-4 inline mr-1" />
              Weeks Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-glow">
              {auditLogs.length}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Total Expected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-neon">
              ${auditLogs.reduce((sum, log) => sum + log.totalExpected, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-success">
              ${auditLogs.reduce((sum, log) => sum + log.totalCollected, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Audit Logs */}
      <div className="space-y-6">
        {auditLogs.map((log) => (
          <Card key={log.weekNumber} className="card-gang">
            <CardHeader>
              <CardTitle className="font-orbitron text-gang-glow flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5" />
                  Week {log.weekNumber} - {formatDate(log.weekStart)} to {formatDate(log.weekEnd)}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-success">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {log.totalCollected.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">
                    / {log.totalExpected.toLocaleString()}
                  </div>
                  <Badge 
                    variant={log.collectionRate >= 80 ? "default" : "destructive"}
                    className={log.collectionRate >= 80 ? "bg-success" : ""}
                  >
                    {log.collectionRate.toFixed(1)}%
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {log.members.map((member) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(member.hasPaid)}
                      <div>
                        <h4 className="font-rajdhani font-bold">{member.memberName}</h4>
                        {member.paymentDate && (
                          <p className="text-sm text-muted-foreground">
                            Paid on: {formatDate(member.paymentDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-orbitron font-bold text-gang-glow">
                          ${member.contribution}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expected
                        </div>
                      </div>
                      {getStatusBadge(member.hasPaid)}
                      
                      {/* Admin Controls for Manual Payment Marking */}
                      {isAdmin && (
                        <div className="flex gap-2">
                          {editingPayment?.memberId === member.memberId && editingPayment?.weekNumber === log.weekNumber ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                placeholder="Notes (optional)"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                className="w-32 h-8 text-xs bg-input"
                              />
                              <Button
                                size="sm"
                                onClick={() => markPayment(member.memberId, log.weekNumber, true, paymentNotes)}
                                className="h-8 px-2 bg-success hover:bg-success/80"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => markPayment(member.memberId, log.weekNumber, false, paymentNotes)}
                                className="h-8 px-2 bg-destructive hover:bg-destructive/80"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={cancelEditingPayment}
                                variant="outline"
                                className="h-8 px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => startEditingPayment(member.memberId, log.weekNumber)}
                              className="h-8 px-2 btn-gang-outline"
                              title="Mark payment manually"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {log.members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No members active during this week</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow text-sm">
            Legend & Manual Payment Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Paid - Member has contributed this week</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span>Pending - Member has not contributed this week</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-success">80%+</Badge>
                <span>Good collection rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">&lt;80%</Badge>
                <span>Needs attention</span>
              </div>
            </div>
            
            {isAdmin && (
              <div className="border-t border-border pt-4">
                <h4 className="font-rajdhani font-bold text-gang-glow mb-2">Admin Controls:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>Edit Button</strong> - Click to manually mark/unmark payments for specific weeks</p>
                  <p>• <strong>Notes Field</strong> - Add optional notes about the payment (e.g., "Paid 3 weeks at once")</p>
                  <p>• <strong>Green Check</strong> - Mark as paid for this week</p>
                  <p>• <strong>Red X</strong> - Mark as unpaid for this week</p>
                  <p>• <strong>Use Case</strong> - Perfect for members who pay multiple weeks at once or make delayed payments</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
