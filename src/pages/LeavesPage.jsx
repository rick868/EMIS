import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiFetch, formatDate, formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { CalendarPlus, Loader2 } from 'lucide-react';

const LEAVE_TYPE_OPTIONS = [
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-900 dark:bg-rose-900/20 dark:text-rose-200',
};

export default function LeavesPage({ user }) {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'ANNUAL',
    reason: '',
  });

  const isAdminOrHR = user.role === 'ADMIN' || user.role === 'HR';
  const hasEmployeeProfile = Boolean(user.employee);

  useEffect(() => {
    loadLeaves();
  }, [statusFilter]);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const query = isAdminOrHR && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await apiFetch(`/api/leaves${query}`);
      setLeaves(data);
    } catch (error) {
      toast.error(error.message || 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leaveId, nextStatus) => {
    const actionText = nextStatus === 'APPROVED' ? 'approve' : 'decline';

    const confirmed = window.confirm(`Are you sure you want to ${actionText} this leave request?`);
    if (!confirmed) return;

    try {
      setActionLoadingId(leaveId);
      await apiFetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`Leave ${actionText}d successfully`);
      loadLeaves();
    } catch (error) {
      toast.error(error.message || `Failed to ${actionText} leave`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      return toast.error('Please select start and end dates');
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      return toast.error('End date must be after start date');
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/api/leaves', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success('Leave request submitted');
      setIsDialogOpen(false);
      setFormData({
        startDate: '',
        endDate: '',
        type: 'ANNUAL',
        reason: '',
      });
      loadLeaves();
    } catch (error) {
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => (
    <Badge className={STATUS_STYLES[status] || ''}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );

  const headerDescription = useMemo(() => {
    if (isAdminOrHR) {
      return 'Review company-wide leave requests';
    }
    if (hasEmployeeProfile) {
      return 'Submit and track your leave requests';
    }
    return 'Leaves overview';
  }, [isAdminOrHR, hasEmployeeProfile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {headerDescription}
          </p>
        </div>
        {hasEmployeeProfile && (
          <Button onClick={() => setIsDialogOpen(true)}>
            <CalendarPlus className="w-4 h-4 mr-2" />
            Apply for Leave
          </Button>
        )}
      </div>

      {isAdminOrHR && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Fine-tune the leave overview</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                id="status-filter"
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            {loading
              ? 'Fetching latest leave activity...'
              : `${leaves.length} request${leaves.length === 1 ? '' : 's'} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {hasEmployeeProfile
                ? 'You have not submitted any leave requests yet.'
                : 'No leave requests available.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {isAdminOrHR && <th className="py-3 px-4">Employee</th>}
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Applied</th>
                    {isAdminOrHR && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="border-b last:border-0">
                      {isAdminOrHR && (
                        <td className="py-3 px-4">
                          <div className="font-medium">{leave.employee?.name || 'N/A'}</div>
                          <p className="text-xs text-muted-foreground">
                            {leave.employee?.department}
                          </p>
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium">
                        {LEAVE_TYPE_OPTIONS.find((opt) => opt.value === leave.type)?.label ||
                          leave.type}
                      </td>
                      <td className="py-3 px-4">
                        <div>{formatDate(leave.startDate)}</div>
                        <div className="text-xs text-muted-foreground">
                          to {formatDate(leave.endDate)}
                        </div>
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(leave.status)}</td>
                      <td className="py-3 px-4 max-w-xs">
                        {leave.reason ? (
                          <p className="line-clamp-2">{leave.reason}</p>
                        ) : (
                          <span className="text-muted-foreground text-xs">No reason provided</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {formatDateTime(leave.createdAt)}
                      </td>
                      {isAdminOrHR && (
                        <td className="py-3 px-4">
                          {leave.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoadingId === leave.id}
                                onClick={() => handleStatusChange(leave.id, 'REJECTED')}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                disabled={actionLoadingId === leave.id}
                                onClick={() => handleStatusChange(leave.id, 'APPROVED')}
                              >
                                {actionLoadingId === leave.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : null}
                                Approve
                              </Button>
                            </div>
                          ) : (
                            <div className="text-right text-xs text-muted-foreground">
                              Updated {formatDateTime(leave.updatedAt || leave.createdAt)}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Provide the leave duration and reason for your request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select
                  id="leave-type"
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="leave-reason">Reason (optional)</Label>
                <Textarea
                  id="leave-reason"
                  rows={4}
                  value={formData.reason}
                  maxLength={500}
                  placeholder="Provide additional context for your request"
                  onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.reason.length}/500 characters
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

