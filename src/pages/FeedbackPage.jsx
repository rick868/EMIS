import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch, formatDateTime } from '@/lib/utils';
import { Plus, MessageSquare, Filter } from 'lucide-react';

export default function FeedbackPage({ user }) {
  const [feedback, setFeedback] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [formData, setFormData] = useState({
    employeeId: user.employee?.id || '',
    category: 'Work Environment',
    message: '',
  });

  const categories = [
    'All',
    'Work Environment',
    'Team Collaboration',
    'Technology',
    'Training',
    'Benefits',
    'Management',
    'Other',
  ];

  const canViewAllFeedback = user.role === 'ADMIN' || user.role === 'HR';

  useEffect(() => {
    if (canViewAllFeedback) {
      loadFeedback();
      loadEmployees();
    }
  }, [category]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(category !== 'all' && { category }),
      });
      const data = await apiFetch(`/api/feedback?${params}`);
      setFeedback(data.feedback);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await apiFetch('/api/employees?limit=1000');
      setEmployees(data.employees);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsSubmitDialogOpen(false);
      resetForm();
      if (canViewAllFeedback) {
        loadFeedback();
      }
      alert('Feedback submitted successfully!');
    } catch (error) {
      alert('Failed to submit feedback: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: user.employee?.id || '',
      category: 'Work Environment',
      message: '',
    });
  };

  const groupedFeedback = feedback.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground mt-1">
            {canViewAllFeedback
              ? 'Review and manage employee feedback'
              : 'Share your thoughts and suggestions'}
          </p>
        </div>
        <Button onClick={() => setIsSubmitDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Submit Feedback
        </Button>
      </div>

      {canViewAllFeedback ? (
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Feedback</TabsTrigger>
              <TabsTrigger value="by-category">By Category</TabsTrigger>
            </TabsList>
            
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat.toLowerCase().replace(' ', '-')}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading feedback...</p>
              </div>
            ) : feedback.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No feedback submissions yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {feedback.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{item.employee.name}</CardTitle>
                          <CardDescription>
                            {item.employee.department} • {formatDateTime(item.dateSubmitted)}
                          </CardDescription>
                        </div>
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                          {item.category}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground">{item.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="by-category" className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading feedback...</p>
              </div>
            ) : Object.keys(groupedFeedback).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No feedback submissions yet</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedFeedback).map(([cat, items]) => (
                <Card key={cat}>
                  <CardHeader>
                    <CardTitle>{cat}</CardTitle>
                    <CardDescription>{items.length} feedback submission(s)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="border-l-2 border-primary pl-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{item.employee.name}</p>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(item.dateSubmitted)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{item.message}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit Your Feedback</CardTitle>
            <CardDescription>
              Your feedback helps us improve the workplace
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-16 h-16 text-primary mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              Click the "Submit Feedback" button above to share your thoughts,<br />
              suggestions, or concerns with the management team.
            </p>
            <Button onClick={() => setIsSubmitDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submit Feedback Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
            <DialogDescription>
              Share your thoughts, suggestions, or concerns
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {!user.employee && canViewAllFeedback && (
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee</Label>
                  <Select
                    value={formData.employeeId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name} - {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== 'All').map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Share your feedback here..."
                  rows={6}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsSubmitDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Submit Feedback</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
