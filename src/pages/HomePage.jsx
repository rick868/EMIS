import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, TrendingUp, Activity } from 'lucide-react';
import { apiFetch } from '@/lib/utils';

export default function HomePage({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      if (user.role === 'ADMIN' || user.role === 'HR') {
        const data = await apiFetch('/api/analytics');
        setStats(data.totals);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Employees',
      value: stats?.employees || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Feedback',
      value: stats?.feedback || 0,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'System Users',
      value: stats?.users || 0,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user.username}!</h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening in your organization today.
        </p>
      </div>

      {(user.role === 'ADMIN' || user.role === 'HR') && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Access frequently used features</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="#/dashboard/employees"
            className="p-4 border rounded-lg hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-1">View Employees</h3>
            <p className="text-sm text-muted-foreground">
              Browse and manage employee records
            </p>
          </a>
          <a
            href="#/dashboard/feedback"
            className="p-4 border rounded-lg hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold mb-1">Submit Feedback</h3>
            <p className="text-sm text-muted-foreground">
              Share your thoughts and suggestions
            </p>
          </a>
          {(user.role === 'ADMIN' || user.role === 'HR') && (
            <a
              href="#/dashboard/analytics"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold mb-1">View Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Check performance metrics and insights
              </p>
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Role:</span>
            <span className="font-semibold">{user.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-semibold">{user.email}</span>
          </div>
          {user.employee && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-semibold">{user.employee.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-semibold">{user.employee.position}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
