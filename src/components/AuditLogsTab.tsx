import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
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
  const [markingPayment, setMarkingPayment] = useState<string | null>(null);
  const [weeksToShow, setWeeksToShow] = useState(12); // Start with 3 months
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Generate audit logs for the specified number of weeks
  useEffect(() => {
    if (members.length > 0) {
      generateAuditLogs();
      setLoading(false);
    }
  }, [members, orders, weeklyPaymentRecords, weeksToShow]);

  const generateAuditLogs = () => {
    const logs: WeeklyAuditLog[] = [];
    const today = new Date();
    
    // Generate logs for the specified number of weeks
    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * i)); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekNumber = i + 1;
      
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
          console.log('📋 Using payment record:', { memberId: member.id, weekNumber, paymentRecord: paymentRecord.hasPaid });
          return {
            memberId: member.id,
            memberName: member.name,
            hasPaid: paymentRecord.hasPaid,
            contribution: paymentRecord.contribution,
            paymentDate: paymentRecord.paymentDate
          };
        }
        
        // Fallback to current payment status if no record exists
        console.log('📋 Using member fallback:', { memberId: member.id, weekNumber, memberHasPaid: member.hasPaid });
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

      // Only add week if there were active members or payment records
      if (activeMembers.length > 0 || weeklyPaymentRecords.some(record => record.weekNumber === weekNumber)) {
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
    }

    setAuditLogs(logs);
  };

  const loadMoreWeeks = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setWeeksToShow(prev => prev + 12); // Load 3 more months
      setLoadingMore(false);
    }, 500);
  };

  const getStatusIcon = (hasPaid: boolean) => {
    return hasPaid ? (
      <CheckCircle className="w-4 h-4 text-success" />
    ) : (
      <XCircle className="w-4 h-4 text-destructive" />
    );
  };

  const getStatusBadge = (hasPaid: boolean, memberId: string, weekNumber: number) => {
    const paymentKey = `${memberId}-${weekNumber}`;
    const isProcessing = markingPayment === paymentKey;
    
    console.log('🎯 getStatusBadge called:', { hasPaid, memberId, weekNumber, isProcessing, paymentKey });

    if (!isAdmin) {
      // For non-admin users, just show the status
      return hasPaid ? (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }

    // For admin users, show toggle buttons
    return (
      <div className="flex gap-1">
        <Badge 
          className={`${hasPaid ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground hover:bg-success/80'} ${isProcessing ? 'opacity-50' : 'cursor-pointer'} transition-colors`}
          onClick={!hasPaid && !isProcessing ? () => {
            console.log('🖱️ Paid button clicked!', { memberId, weekNumber, hasPaid, isProcessing });
            markPaymentAsPaid(memberId, weekNumber);
          } : undefined}
          title={!hasPaid ? (isProcessing ? "Processing..." : "Click to mark as paid") : "Already paid"}
        >
          {isProcessing && !hasPaid ? (
            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CheckCircle className="w-3 h-3 mr-1" />
          )}
          {isProcessing && !hasPaid ? "Processing..." : "Paid"}
        </Badge>
        
        <Badge 
          className={`${!hasPaid ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-destructive/80'} ${isProcessing ? 'opacity-50' : 'cursor-pointer'} transition-colors`}
          onClick={hasPaid && !isProcessing ? () => {
            console.log('🖱️ Pending button clicked!', { memberId, weekNumber, hasPaid, isProcessing });
            markPaymentAsPending(memberId, weekNumber);
          } : undefined}
          title={hasPaid ? (isProcessing ? "Processing..." : "Click to mark as pending") : "Already pending"}
        >
          {isProcessing && hasPaid ? (
            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <XCircle className="w-3 h-3 mr-1" />
          )}
          {isProcessing && hasPaid ? "Processing..." : "Pending"}
        </Badge>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const markPaymentAsPaid = async (memberId: string, weekNumber: number) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      console.error('Member not found:', memberId);
      return;
    }

    const paymentKey = `${memberId}-${weekNumber}`;
    setMarkingPayment(paymentKey);

    console.log('✅ Marking payment as PAID for member:', member.name, 'week:', weekNumber);
    console.log('📊 Current member hasPaid status:', member.hasPaid);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * (weekNumber - 1)));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    try {
      // Check if record already exists
      const existingRecord = weeklyPaymentRecords.find(record => 
        record.memberId === memberId && record.weekNumber === weekNumber
      );

      if (existingRecord) {
        // Update existing record
        await firestoreService.updateWeeklyPaymentRecord(existingRecord.id, {
          hasPaid: true,
          paymentDate: new Date().toISOString().split('T')[0],
          markedBy: 'admin',
          markedAt: new Date().toISOString()
        });
        console.log('Updated existing payment record');
      } else {
        // Create new record
        await firestoreService.addWeeklyPaymentRecord({
          memberId,
          memberName: member.name,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          weekNumber,
          contribution: member.contribution,
          hasPaid: true,
          paymentDate: new Date().toISOString().split('T')[0],
          markedBy: 'admin',
          markedAt: new Date().toISOString()
        });
        console.log('Created new payment record');
      }

      // Update member's payment status in the main members collection
      await firestoreService.updateMember(memberId, {
        hasPaid: true
      });

      console.log('✅ Payment marked as PAID successfully!');
      console.log('📊 Updated member hasPaid to:', true);
    } catch (error) {
      console.error('Error marking payment as paid:', error);
    } finally {
      setMarkingPayment(null);
    }
  };

  const markPaymentAsPending = async (memberId: string, weekNumber: number) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      console.error('Member not found:', memberId);
      return;
    }

    const paymentKey = `${memberId}-${weekNumber}`;
    setMarkingPayment(paymentKey);

    console.log('🔄 Marking payment as PENDING for member:', member.name, 'week:', weekNumber);
    console.log('📊 Current member hasPaid status:', member.hasPaid);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * (weekNumber - 1)));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    try {
      // Check if record already exists
      const existingRecord = weeklyPaymentRecords.find(record => 
        record.memberId === memberId && record.weekNumber === weekNumber
      );

      if (existingRecord) {
        // Update existing record
        await firestoreService.updateWeeklyPaymentRecord(existingRecord.id, {
          hasPaid: false,
          paymentDate: undefined,
          markedBy: 'admin',
          markedAt: new Date().toISOString()
        });
        console.log('Updated existing payment record to pending');
      } else {
        // Create new record
        await firestoreService.addWeeklyPaymentRecord({
          memberId,
          memberName: member.name,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          weekNumber,
          contribution: member.contribution,
          hasPaid: false,
          paymentDate: undefined,
          markedBy: 'admin',
          markedAt: new Date().toISOString()
        });
        console.log('Created new payment record as pending');
      }

      // Update member's payment status in the main members collection
      await firestoreService.updateMember(memberId, {
        hasPaid: false
      });

      console.log('🔄 Payment marked as PENDING successfully!');
      console.log('📊 Updated member hasPaid to:', false);
    } catch (error) {
      console.error('Error marking payment as pending:', error);
    } finally {
      setMarkingPayment(null);
    }
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
          Weekly payment tracking - Showing {auditLogs.length} weeks of history
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
                      {getStatusBadge(member.hasPaid, member.memberId, log.weekNumber)}
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

      {/* Load More Button */}
      <div className="flex justify-center">
        <Button
          onClick={loadMoreWeeks}
          disabled={loadingMore}
          className="btn-gang-outline"
        >
          {loadingMore ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading More...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Load More Weeks (3 months)
            </>
          )}
        </Button>
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
                <h4 className="font-rajdhani font-bold text-gang-glow mb-2">Leader Controls:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>Toggle Buttons</strong> - Click "Paid" or "Pending" buttons to change status</p>
                  <p>• <strong>Easy Correction</strong> - Click the opposite button to undo a mistake</p>
                  <p>• <strong>Visual Feedback</strong> - Active status is highlighted, inactive is muted</p>
                  <p>• <strong>Perfect for</strong> - Members who pay multiple weeks at once or make delayed payments</p>
                  <p>• <strong>Real-time Updates</strong> - Changes sync immediately across all users</p>
                  <p>• <strong>Admin Tracking</strong> - All changes are recorded with admin info and timestamp</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
