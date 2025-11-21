"use client";

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";

interface ConversionMetadata {
  usd_amount: number;
  crypto_amount: number;
  exchange_rate: number;
  converted_at: string;
}

interface DashboardStats {
  cards: {
    total_payouts: {
      count: number;
      change_percent: number;
      change_label: string;
    };
    pending: { count: number; amount: number };
    processing: { count: number; amount: number };
    completed: { count: number; amount: number };
  };
  recent_payouts: RecentPayout[];
}

interface RecentPayout {
  id: number;
  username: string;
  email: string;
  initials: string;
  payment_method: string;
  amount: number;
  status: string;
  requested_at: string;
  metadata?: {
    conversion?: ConversionMetadata;
  };
}

interface Withdrawal {
  id: number;
  user_id: number;
  username: string;
  email: string;
  amount: number;
  currency: string;
  payment_method: string;
  wallet_address: string;
  status: string;
  admin_notes?: string;
  rejection_reason?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  metadata?: {
    conversion?: ConversionMetadata;
  };
}

interface PaginatedResponse {
  success: boolean;
  data: Withdrawal[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

async function fetchDashboard(): Promise<DashboardStats> {
  const response = await apiClient.request<DashboardStats>({
    method: "GET",
    url: "/api/withdrawals/admin/dashboard",
  });
  if (!response.data) {
    throw new Error("Failed to fetch dashboard data");
  }
  return response.data;
}

async function fetchWithdrawals(
  status?: string,
  limit = 20,
  offset = 0,
): Promise<PaginatedResponse> {
  const params = new URLSearchParams();
  if (status && status !== "all") params.append("status", status);
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());

  const response = await apiClient.request<{
    data: Withdrawal[];
    pagination: PaginatedResponse["pagination"];
  }>({
    method: "GET",
    url: `/api/withdrawals/admin/all?${params.toString()}`,
  });

  return {
    success: response.success,
    data: response.data?.data || [],
    pagination: response.data?.pagination || {
      total: 0,
      limit,
      offset,
      has_more: false,
    },
  };
}

async function approveWithdrawal(id: number, notes?: string) {
  return apiClient.request({
    method: "POST",
    url: `/api/withdrawals/admin/${id}/approve`,
    data: { admin_notes: notes },
  });
}

async function rejectWithdrawal(id: number, reason: string) {
  return apiClient.request({
    method: "POST",
    url: `/api/withdrawals/admin/${id}/reject`,
    data: { reason },
  });
}

async function processWithdrawal(id: number) {
  return apiClient.request({
    method: "POST",
    url: `/api/withdrawals/admin/${id}/process`,
  });
}

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["withdrawals-dashboard"],
    queryFn: fetchDashboard,
  });

  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["withdrawals", statusFilter, currentPage],
    queryFn: () => fetchWithdrawals(statusFilter, 20, currentPage * 20),
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ["withdrawals", "pending", 0],
    queryFn: () => fetchWithdrawals("pending", 50, 0),
  });

  const { data: completedData, isLoading: completedLoading } = useQuery({
    queryKey: ["withdrawals", "completed", 0],
    queryFn: () => fetchWithdrawals("completed", 50, 0),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      approveWithdrawal(id, notes),
    onSuccess: (response, variables) => {
      // Refresh all withdrawal queries to get updated conversion data
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals-dashboard"] });

      toast.success("Withdrawal approved successfully", {
        description: "Crypto conversion completed. Ready to process.",
      });

      setApproveDialogOpen(false);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast.error("Failed to approve withdrawal", {
        description: error.message || "An error occurred",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectWithdrawal(id, reason),
    onSuccess: () => {
      toast.success("Withdrawal rejected");
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals-dashboard"] });
      setRejectDialogOpen(false);
      setRejectReason("");
    },
  });

  const processMutation = useMutation({
    mutationFn: (id: number) => processWithdrawal(id),
    onSuccess: () => {
      toast.success("Withdrawal processed - Crypto sent via Oxapay");
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals-dashboard"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            <Activity className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCryptoAmount = (amount: number, currency: string) => {
    let decimals = 8; // Default for most crypto
    if (amount >= 1000) {
      decimals = 2;
    } else if (amount >= 1) {
      decimals = 4;
    }
    return `${amount.toFixed(decimals)} ${currency}`;
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      USDT: "bg-green-100 text-green-800",
      BTC: "bg-orange-100 text-orange-800",
      ETH: "bg-blue-100 text-blue-800",
      LTC: "bg-gray-100 text-gray-800",
      TRX: "bg-red-100 text-red-800",
      SOL: "bg-purple-100 text-purple-800",
      DOGE: "bg-yellow-100 text-yellow-800",
    };
    return (
      <Badge className={colors[method] || "bg-gray-100 text-gray-800"}>
        {method}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const filteredWithdrawals =
    withdrawalsData?.data?.filter((w) => {
      const matchesSearch =
        w.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.id.toString().includes(searchTerm);
      return matchesSearch;
    }) || [];

  const handleApprove = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setApproveDialogOpen(true);
  };

  const handleReject = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRejectDialogOpen(true);
  };

  const handleView = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setViewDialogOpen(true);
  };

  const handleProcess = (withdrawal: Withdrawal) => {
    processMutation.mutate(withdrawal.id);
  };

  const renderWithdrawalsTable = (
    data: Withdrawal[],
    loading: boolean,
    showActions = true,
  ) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No withdrawals found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Requested</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((withdrawal) => (
            <TableRow key={withdrawal.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {withdrawal.username?.slice(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{withdrawal.username}</p>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {getPaymentMethodBadge(withdrawal.payment_method)}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {formatAmount(withdrawal.amount)}
                  </p>
                  {withdrawal.metadata?.conversion && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                      <ArrowRightLeft className="h-3 w-3" />
                      {formatCryptoAmount(
                        withdrawal.metadata.conversion.crypto_amount,
                        withdrawal.payment_method,
                      )}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
              <TableCell>
                <p className="font-mono text-sm">#{withdrawal.id}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {withdrawal.wallet_address}
                </p>
              </TableCell>
              <TableCell>
                <p className="text-sm">{formatDate(withdrawal.requested_at)}</p>
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(withdrawal)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {withdrawal.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(withdrawal)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(withdrawal)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                    {withdrawal.status === "approved" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProcess(withdrawal)}
                        disabled={processMutation.isPending}
                      >
                        <Send className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const stats = dashboard?.cards;
  const totalPayouts = stats?.total_payouts.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Withdrawal Management
          </h1>
          <p className="text-muted-foreground">
            Process and track user withdrawal requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
              queryClient.invalidateQueries({
                queryKey: ["withdrawals-dashboard"],
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.total_payouts.count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total_payouts.change_label}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.pending.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatAmount(stats?.pending.amount || 0)} pending
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.processing.count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatAmount(stats?.processing.amount || 0)} processing
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.completed.count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatAmount(stats?.completed.amount || 0)} completed
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="pending">Pending Queue</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Payout Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          Pending
                        </span>
                        <span className="font-semibold">
                          {stats?.pending.count}
                        </span>
                      </div>
                      <Progress
                        value={
                          totalPayouts > 0
                            ? ((stats?.pending.count || 0) / totalPayouts) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500" />
                          Processing
                        </span>
                        <span className="font-semibold">
                          {stats?.processing.count}
                        </span>
                      </div>
                      <Progress
                        value={
                          totalPayouts > 0
                            ? ((stats?.processing.count || 0) / totalPayouts) *
                              100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Completed
                        </span>
                        <span className="font-semibold">
                          {stats?.completed.count}
                        </span>
                      </div>
                      <Progress
                        value={
                          totalPayouts > 0
                            ? ((stats?.completed.count || 0) / totalPayouts) *
                              100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboard?.recent_payouts?.slice(0, 5).map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{payout.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {payout.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payout.payment_method}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatAmount(payout.amount)}
                          </p>
                          {getStatusBadge(payout.status)}
                        </div>
                      </div>
                    ))}
                    {(!dashboard?.recent_payouts ||
                      dashboard.recent_payouts.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">
                        No recent payouts
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Withdrawals</CardTitle>
              <CardDescription>
                View and manage all withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {renderWithdrawalsTable(filteredWithdrawals, withdrawalsLoading)}

              {withdrawalsData?.pagination && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredWithdrawals.length} of{" "}
                    {withdrawalsData.pagination.total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!withdrawalsData.pagination.has_more}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Withdrawals</CardTitle>
              <CardDescription>
                Review and approve pending withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderWithdrawalsTable(pendingData?.data || [], pendingLoading)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Withdrawals</CardTitle>
              <CardDescription>
                View all completed withdrawal transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderWithdrawalsTable(
                completedData?.data || [],
                completedLoading,
                false,
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Approve this withdrawal request for {selectedWithdrawal?.username}.
              Crypto conversion will be calculated at current rates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Amount (USD)</p>
                <p className="font-semibold">
                  {formatAmount(selectedWithdrawal?.amount || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Method</p>
                <p className="font-semibold">
                  {selectedWithdrawal?.payment_method}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-xs break-all">
                  {selectedWithdrawal?.wallet_address}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Admin Notes (optional)
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
            {approveMutation.isPending && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Converting USD to crypto at current exchange rate...
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedWithdrawal &&
                approveMutation.mutate({
                  id: selectedWithdrawal.id,
                  notes: adminNotes,
                })
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Approve & Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Reject this withdrawal request. The funds will be refunded to the
              user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">User</p>
                <p className="font-semibold">{selectedWithdrawal?.username}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold">
                  {formatAmount(selectedWithdrawal?.amount || 0)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rejection Reason (required)
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedWithdrawal &&
                rejectMutation.mutate({
                  id: selectedWithdrawal.id,
                  reason: rejectReason,
                })
              }
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Withdrawal Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Reference ID</p>
                <p className="font-mono">#{selectedWithdrawal?.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                {selectedWithdrawal &&
                  getStatusBadge(selectedWithdrawal.status)}
              </div>
              <div>
                <p className="text-muted-foreground">User</p>
                <p className="font-semibold">{selectedWithdrawal?.username}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="text-sm">{selectedWithdrawal?.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold">
                  {formatAmount(selectedWithdrawal?.amount || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method</p>
                {selectedWithdrawal &&
                  getPaymentMethodBadge(selectedWithdrawal.payment_method)}
              </div>
            </div>
            {selectedWithdrawal?.metadata?.conversion && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Currency Conversion
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      USD Amount
                    </p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {formatAmount(
                        selectedWithdrawal.metadata.conversion.usd_amount,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      Crypto Amount
                    </p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {formatCryptoAmount(
                        selectedWithdrawal.metadata.conversion.crypto_amount,
                        selectedWithdrawal.payment_method,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      Exchange Rate
                    </p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {formatAmount(
                        selectedWithdrawal.metadata.conversion.exchange_rate,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      Converted At
                    </p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {new Date(
                        selectedWithdrawal.metadata.conversion.converted_at,
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 text-center">
                  Conversion locked at approval - Rate guaranteed
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                  {selectedWithdrawal?.wallet_address}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Requested</p>
                <p className="text-sm">
                  {selectedWithdrawal?.requested_at &&
                    formatDate(selectedWithdrawal.requested_at)}
                </p>
              </div>
              {selectedWithdrawal?.completed_at && (
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="text-sm">
                    {formatDate(selectedWithdrawal.completed_at)}
                  </p>
                </div>
              )}
              {selectedWithdrawal?.admin_notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Admin Notes</p>
                  <p className="text-sm">{selectedWithdrawal.admin_notes}</p>
                </div>
              )}
              {selectedWithdrawal?.rejection_reason && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Rejection Reason</p>
                  <p className="text-sm text-red-600">
                    {selectedWithdrawal.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedWithdrawal?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleReject(selectedWithdrawal);
                  }}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleApprove(selectedWithdrawal);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
            {selectedWithdrawal?.status === "approved" && (
              <Button
                onClick={() => {
                  setViewDialogOpen(false);
                  handleProcess(selectedWithdrawal);
                }}
                disabled={processMutation.isPending}
              >
                {processMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Process Payout
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
