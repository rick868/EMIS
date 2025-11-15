import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch, formatDateTime, validators } from '@/lib/utils';
import { Plus, MessageSquare, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function FeedbackPage({ user }) {
  const toast = useToast();
  const [feedback, setFeedback] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: user.employee?.id || '',
    category: '',
    message: '',
  });

  const canViewAllFeedback = user.role === 'ADMIN' || user.role === 'HR';

  useEffect(() => {
    loadCategories();
    if (canViewAllFeedback) {
      loadFeedback();
      loadEmployees();
    }
  }, [category]);

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/api/feedback-categories');
      setCategories(data);
      // Set default category if available
      if (data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const validationError = validators.categoryName(newCategoryName);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch('/api/feedback-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      setIsAddCategoryDialogOpen(false);
      setNewCategoryName('');
      loadCategories();
      toast.success('Feedback category added successfully!');
    } catch (error) {
      toast.error('Failed to add category: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setIsSubmitting(true);
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
      toast.success('Feedback submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit feedback: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: user.employee?.id || '',
      category: categories.length > 0 ? categories[0].name : '',
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {canViewAllFeedback
              ? 'Review and manage employee feedback'
              : 'Share your thoughts and suggestions'}
          </p>
        </div>
        <Button onClick={() => setIsSubmitDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Submit Feedback
        </Button>
      </div>

      {canViewAllFeedback ? (
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">All Feedback</TabsTrigger>
              <TabsTrigger value="by-category" className="flex-1 sm:flex-none">By Category</TabsTrigger>
            </TabsList>
            
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
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
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Category</Label>
                  {canViewAllFeedback && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddCategoryDialogOpen(true)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add New
                    </Button>
                  )}
                </div>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Feedback Category</DialogTitle>
            <DialogDescription>
              Create a new category for feedback submissions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Work Environment, Technology"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddCategoryDialogOpen(false);
                setNewCategoryName('');
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
