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
  const [loadError, setLoadError] = useState(false);
  const [markingPayment, setMarkingPayment] = useState<string | null>(null);
  const [weeksToShow, setWeeksToShow] = useState(12); // Start with 3 months
  const [loadingMore, setLoadingMore] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    // Set a timeout to stop loading state if data doesn't load within 10 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, 10000);
    
    const unsubscribeMembers = firestoreService.subscribeToMembers((newMembers) => {
      setMembers(newMembers);
    });

    const unsubscribeOrders = firestoreService.subscribeToOrders((newOrders) => {
      setOrders(newOrders);
    });

    const unsubscribePaymentRecords = firestoreService.subscribeToWeeklyPaymentRecords((newRecords) => {
      console.log('📊 Weekly payment records updated:', newRecords.length);
      setWeeklyPaymentRecords(newRecords);
      // Clear loading state when we get the first set of data
      setLoading(false);
      setLoadError(false); // Clear error when data loads
      clearTimeout(timeoutId); // Clear timeout when data is received
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribeMembers();
      unsubscribeOrders();
      unsubscribePaymentRecords();
    };
  }, []);

  // Generate audit logs for the specified number of weeks
  useEffect(() => {
    if (members.length > 0) {
      generateAuditLogs();
    }
  }, [members, orders, weeklyPaymentRecords, weeksToShow]);

  const generateAuditLogs = () => {
    console.log('🔄 Generating audit logs with:', {
      membersCount: members.length,
      paymentRecordsCount: weeklyPaymentRecords.length,
      weeksToShow
    });
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
        // If multiple records exist, use the most recent one (highest markedAt)
        const memberWeekRecords = weeklyPaymentRecords.filter(record => 
          record.memberId === member.id && record.weekNumber === weekNumber
        );
        
        let paymentRecord = null;
        if (memberWeekRecords.length > 0) {
          // Sort by markedAt descending and take the most recent
          paymentRecord = memberWeekRecords.sort((a, b) => 
            new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
          )[0];
        }
        
        if (paymentRecord) {
          return {
            memberId: member.id,
            memberName: member.name,
            hasPaid: paymentRecord.hasPaid,
            contribution: paymentRecord.contribution,
            paymentDate: paymentRecord.paymentDate
          };
        }
        
        // Fallback to pending if no record exists (don't use member.hasPaid)
        return {
          memberId: member.id,
          memberName: member.name,
          hasPaid: false, // Default to pending for historical weeks
          contribution: member.contribution,
          paymentDate: undefined
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

    // For admin users, show the same styled button as Members tab
    return (
      <div className="flex gap-2">
        <Button
          variant={hasPaid ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (isProcessing) return;
            console.log('🔄 Toggle clicked:', { memberId, weekNumber, currentStatus: hasPaid });
            if (hasPaid) {
              markPaymentAsPending(memberId, weekNumber);
            } else {
              markPaymentAsPaid(memberId, weekNumber);
            }
          }}
          disabled={isProcessing}
          className={hasPaid ? 
            "bg-success hover:bg-success/80 text-white border-success" : 
            "btn-gang-outline hover:bg-success/10 hover:border-success hover:text-success transition-colors"
          }
        >
          {isProcessing ? (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </div>
          ) : (
            hasPaid ? "✅ Mark Unpaid" : "💰 Mark Paid"
          )}
        </Button>
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
      console.error('❌ Member not found:', memberId);
      return;
    }

    const paymentKey = `${memberId}-${weekNumber}`;
    setMarkingPayment(paymentKey);

    console.log('✅ Marking as PAID:', { member: member.name, week: weekNumber });

    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * (weekNumber - 1)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Use upsert to create or update the record
      await firestoreService.upsertWeeklyPaymentRecord({
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

      console.log('✅ Successfully marked as PAID!');
      
      // Update member's current payment status ONLY if this is the current week (week 1)
      if (weekNumber === 1) {
        await firestoreService.updateMember(memberId, { hasPaid: true });
        console.log('💰 Updated current member status for funds calculation');
      }
      
      // Force refresh of audit logs
      setTimeout(() => {
        generateAuditLogs();
      }, 500);
    } catch (error) {
      console.error('❌ Error marking as paid:', error);
    } finally {
      setMarkingPayment(null);
    }
  };

  const markPaymentAsPending = async (memberId: string, weekNumber: number) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      console.error('❌ Member not found:', memberId);
      return;
    }

    const paymentKey = `${memberId}-${weekNumber}`;
    setMarkingPayment(paymentKey);

    console.log('🔄 Marking as PENDING:', { member: member.name, week: weekNumber });

    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * (weekNumber - 1)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Use upsert to create or update the record
      await firestoreService.upsertWeeklyPaymentRecord({
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

      console.log('✅ Successfully marked as PENDING!');
      
      // Update member's current payment status ONLY if this is the current week (week 1)
      if (weekNumber === 1) {
        await firestoreService.updateMember(memberId, { hasPaid: false });
        console.log('💰 Updated current member status for funds calculation');
      }
      
      // Force refresh of audit logs
      setTimeout(() => {
        generateAuditLogs();
      }, 500);
    } catch (error) {
      console.error('❌ Error marking as pending:', error);
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
          {loadError && (
            <p className="text-destructive mt-2">Error loading data. Please check your Firebase connection.</p>
          )}
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
            Legend & Payment Controls
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
                  <p>• <strong>Payment Status Buttons</strong> - Same as Members tab: Green "✅ Mark Unpaid" or Blue "💰 Mark Paid"</p>
                  <p>• <strong>Click to Toggle</strong> - Click the button to change payment status for that specific week</p>
                  <p>• <strong>Visual Feedback</strong> - Button style matches current status (Paid = Green, Pending = Blue outline)</p>
                  <p>• <strong>Current Week Sync</strong> - Week 1 changes also update Members tab and funds</p>
                  <p>• <strong>Historical Tracking</strong> - Historical weeks (2+) are tracked independently</p>
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
