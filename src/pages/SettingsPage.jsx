import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiFetch, formatDateTime } from '@/lib/utils';
import { Plus, Shield, Activity, User, Building2, Tag, Edit, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';

export default function SettingsPage({ user }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddDeptDialogOpen, setIsAddDeptDialogOpen] = useState(false);
  const [isEditDeptDialogOpen, setIsEditDeptDialogOpen] = useState(false);
  const [isAddCatDialogOpen, setIsAddCatDialogOpen] = useState(false);
  const [isEditCatDialogOpen, setIsEditCatDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
  });
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    description: '',
  });
  const [catFormData, setCatFormData] = useState({
    name: '',
    description: '',
  });

  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadLogs();
      loadDepartments();
      loadCategories();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const data = await apiFetch('/api/users');
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await apiFetch('/api/logs?limit=50');
      setLogs(data.logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsAddUserDialogOpen(false);
      resetForm();
      loadUsers();
      loadLogs();
      toast.success('User created successfully!');
    } catch (error) {
      toast.error('Failed to create user: ' + (error.message || 'Unknown error'));
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await apiFetch('/api/departments');
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/api/feedback-categories');
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/departments', {
        method: 'POST',
        body: JSON.stringify(deptFormData),
      });
      setIsAddDeptDialogOpen(false);
      resetDeptForm();
      loadDepartments();
      loadLogs();
      toast.success('Department created successfully!');
    } catch (error) {
      toast.error('Failed to create department: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEditDepartment = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/departments/${selectedDept.id}`, {
        method: 'PUT',
        body: JSON.stringify(deptFormData),
      });
      setIsEditDeptDialogOpen(false);
      setSelectedDept(null);
      resetDeptForm();
      loadDepartments();
      loadLogs();
      toast.success('Department updated successfully!');
    } catch (error) {
      toast.error('Failed to update department: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) {
      return;
    }
    try {
      await apiFetch(`/api/departments/${id}`, {
        method: 'DELETE',
      });
      loadDepartments();
      loadLogs();
      toast.success('Department deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete department: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/feedback-categories', {
        method: 'POST',
        body: JSON.stringify(catFormData),
      });
      setIsAddCatDialogOpen(false);
      resetCatForm();
      loadCategories();
      loadLogs();
      toast.success('Feedback category created successfully!');
    } catch (error) {
      toast.error('Failed to create category: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/feedback-categories/${selectedCat.id}`, {
        method: 'PUT',
        body: JSON.stringify(catFormData),
      });
      setIsEditCatDialogOpen(false);
      setSelectedCat(null);
      resetCatForm();
      loadCategories();
      loadLogs();
      toast.success('Feedback category updated successfully!');
    } catch (error) {
      toast.error('Failed to update category: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }
    try {
      await apiFetch(`/api/feedback-categories/${id}`, {
        method: 'DELETE',
      });
      loadCategories();
      loadLogs();
      toast.success('Feedback category deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete category: ' + (error.message || 'Unknown error'));
    }
  };

  const openEditDeptDialog = (dept) => {
    setSelectedDept(dept);
    setDeptFormData({
      name: dept.name,
      description: dept.description || '',
    });
    setIsEditDeptDialogOpen(true);
  };

  const openEditCatDialog = (cat) => {
    setSelectedCat(cat);
    setCatFormData({
      name: cat.name,
      description: cat.description || '',
    });
    setIsEditCatDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
    });
  };

  const resetDeptForm = () => {
    setDeptFormData({
      name: '',
      description: '',
    });
  };

  const resetCatForm = () => {
    setCatFormData({
      name: '',
      description: '',
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700';
      case 'HR':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionColor = (action) => {
    if (action.includes('DELETE')) return 'text-red-600';
    if (action.includes('ADDED') || action.includes('CREATED')) return 'text-green-600';
    if (action.includes('UPDATE')) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Manage system configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="departments">
                <Building2 className="w-4 h-4 mr-2" />
                Departments
              </TabsTrigger>
              <TabsTrigger value="categories">
                <Tag className="w-4 h-4 mr-2" />
                Feedback Categories
              </TabsTrigger>
              <TabsTrigger value="users">
                <Shield className="w-4 h-4 mr-2" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="logs">
                <Activity className="w-4 h-4 mr-2" />
                System Logs
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Username</Label>
                  <p className="font-semibold">{user.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-semibold">{user.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Role</Label>
                  <p className="font-semibold">{user.role}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Created</Label>
                  <p className="font-semibold">{formatDateTime(user.createdAt)}</p>
                </div>
              </div>

              {user.employee && (
                <>
                  <hr className="my-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-semibold">{user.employee.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Department</Label>
                      <p className="font-semibold">{user.employee.department}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Position</Label>
                      <p className="font-semibold">{user.employee.position}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date Joined</Label>
                      <p className="font-semibold">{formatDateTime(user.employee.dateJoined)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle dark/light theme using the moon/sun icon in the header
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Email notifications for important updates
                  </p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        {isAdmin && (
          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Department Management</CardTitle>
                  <CardDescription>Manage organizational departments</CardDescription>
                </div>
                <Button onClick={() => setIsAddDeptDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </Button>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No departments found. Add your first department.</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-semibold">Name</th>
                            <th className="text-left p-4 font-semibold">Description</th>
                            <th className="text-left p-4 font-semibold">Created</th>
                            <th className="text-left p-4 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departments.map((dept) => (
                            <tr key={dept.id} className="border-b hover:bg-accent/50 transition-colors">
                              <td className="p-4 font-medium">{dept.name}</td>
                              <td className="p-4 text-muted-foreground">{dept.description || '-'}</td>
                              <td className="p-4">{formatDateTime(dept.createdAt)}</td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDeptDialog(dept)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteDepartment(dept.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {departments.map((dept) => (
                        <Card key={dept.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-semibold text-lg">{dept.name}</h3>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDeptDialog(dept)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDepartment(dept.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Description: </span>
                                <span>{dept.description || '-'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Created: </span>
                                <span>{formatDateTime(dept.createdAt)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Feedback Categories Tab */}
        {isAdmin && (
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Feedback Category Management</CardTitle>
                  <CardDescription>Manage feedback submission categories</CardDescription>
                </div>
                <Button onClick={() => setIsAddCatDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No categories found. Add your first category.</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-semibold">Name</th>
                            <th className="text-left p-4 font-semibold">Description</th>
                            <th className="text-left p-4 font-semibold">Created</th>
                            <th className="text-left p-4 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((cat) => (
                            <tr key={cat.id} className="border-b hover:bg-accent/50 transition-colors">
                              <td className="p-4 font-medium">{cat.name}</td>
                              <td className="p-4 text-muted-foreground">{cat.description || '-'}</td>
                              <td className="p-4">{formatDateTime(cat.createdAt)}</td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditCatDialog(cat)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {categories.map((cat) => (
                        <Card key={cat.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-semibold text-lg">{cat.name}</h3>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditCatDialog(cat)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Description: </span>
                                <span>{cat.description || '-'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Created: </span>
                                <span>{formatDateTime(cat.createdAt)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* User Management Tab */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage system users and roles</CardDescription>
                </div>
                <Button onClick={() => setIsAddUserDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading users...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-semibold">Username</th>
                          <th className="text-left p-4 font-semibold">Email</th>
                          <th className="text-left p-4 font-semibold">Role</th>
                          <th className="text-left p-4 font-semibold">Created</th>
                          <th className="text-left p-4 font-semibold">Employee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b hover:bg-accent/50 transition-colors">
                            <td className="p-4 font-medium">{u.username}</td>
                            <td className="p-4">{u.email}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">{formatDateTime(u.createdAt)}</td>
                            <td className="p-4">
                              {u.employee ? u.employee.name : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* System Logs Tab */}
        {isAdmin && (
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Activity Logs</CardTitle>
                <CardDescription>Recent system activities and changes</CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No logs available</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              • User ID: {log.userId}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new system user account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddUserDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={isAddDeptDialogOpen} onOpenChange={setIsAddDeptDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>Create a new organizational department</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDepartment}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Department Name</Label>
                <Input
                  id="dept-name"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-desc">Description (Optional)</Label>
                <Textarea
                  id="dept-desc"
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddDeptDialogOpen(false);
                resetDeptForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Create Department</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDeptDialogOpen} onOpenChange={setIsEditDeptDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditDepartment}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dept-name">Department Name</Label>
                <Input
                  id="edit-dept-name"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dept-desc">Description (Optional)</Label>
                <Textarea
                  id="edit-dept-desc"
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDeptDialogOpen(false);
                setSelectedDept(null);
                resetDeptForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCatDialogOpen} onOpenChange={setIsAddCatDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Feedback Category</DialogTitle>
            <DialogDescription>Create a new feedback category</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description (Optional)</Label>
                <Textarea
                  id="cat-desc"
                  value={catFormData.description}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddCatDialogOpen(false);
                resetCatForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Create Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCatDialogOpen} onOpenChange={setIsEditCatDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feedback Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCategory}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cat-name">Category Name</Label>
                <Input
                  id="edit-cat-name"
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cat-desc">Description (Optional)</Label>
                <Textarea
                  id="edit-cat-desc"
                  value={catFormData.description}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditCatDialogOpen(false);
                setSelectedCat(null);
                resetCatForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
