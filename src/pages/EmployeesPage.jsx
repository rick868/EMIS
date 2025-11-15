import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiFetch, formatCurrency, formatDate, validators, useDebounce } from '@/lib/utils';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function EmployeesPage({ user }) {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [isAddDeptDialogOpen, setIsAddDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    salary: '',
  });

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [debouncedSearch, department, page]);

  const loadDepartments = async () => {
    try {
      const data = await apiFetch('/api/departments');
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    const validationError = validators.departmentName(newDeptName);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ name: newDeptName.trim() }),
      });
      setIsAddDeptDialogOpen(false);
      setNewDeptName('');
      loadDepartments();
      toast.success('Department added successfully!');
    } catch (error) {
      toast.error('Failed to add department: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(department !== 'all' && { department }),
      });

      const data = await apiFetch(`/api/employees?${params}`);
      setEmployees(data.employees);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    const nameError = validators.employeeName(formData.name);
    if (nameError) {
      toast.error(nameError);
      return;
    }
    const salaryError = validators.salary(formData.salary);
    if (salaryError) {
      toast.error(salaryError);
      return;
    }
    if (!formData.department) {
      toast.error('Please select a department');
      return;
    }
    if (!formData.position || formData.position.trim().length === 0) {
      toast.error('Position is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find department ID
      const selectedDept = departments.find(d => d.name === formData.department);
      const departmentId = selectedDept ? selectedDept.id : null;

      await apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          department: formData.department,
          departmentId: departmentId,
          position: formData.position.trim(),
          salary: parseFloat(formData.salary),
        }),
      });
      setIsAddDialogOpen(false);
      resetForm();
      loadEmployees();
      toast.success('Employee added successfully!');
    } catch (error) {
      toast.error('Failed to add employee: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    const nameError = validators.employeeName(formData.name);
    if (nameError) {
      toast.error(nameError);
      return;
    }
    const salaryError = validators.salary(formData.salary);
    if (salaryError) {
      toast.error(salaryError);
      return;
    }
    if (!formData.department) {
      toast.error('Please select a department');
      return;
    }
    if (!formData.position || formData.position.trim().length === 0) {
      toast.error('Position is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find department ID
      const selectedDept = departments.find(d => d.name === formData.department);
      const departmentId = selectedDept ? selectedDept.id : null;

      await apiFetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name.trim(),
          department: formData.department,
          departmentId: departmentId,
          position: formData.position.trim(),
          salary: parseFloat(formData.salary),
        }),
      });
      setIsEditDialogOpen(false);
      resetForm();
      loadEmployees();
      toast.success('Employee updated successfully!');
    } catch (error) {
      toast.error('Failed to update employee: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
      });
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
      toast.success('Employee deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete employee: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', department: '', position: '', salary: '' });
    setSelectedEmployee(null);
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      department: employee.department,
      position: employee.position,
      salary: employee.salary.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage your organization's workforce
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                aria-label="Search employees by name or position"
              />
            </div>
            <Select
              value={department}
              onValueChange={(value) => {
                setDepartment(value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter by department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Name</th>
                      <th className="text-left p-4 font-semibold">Department</th>
                      <th className="text-left p-4 font-semibold">Position</th>
                      <th className="text-left p-4 font-semibold">Salary</th>
                      <th className="text-left p-4 font-semibold">Date Joined</th>
                      {isAdmin && <th className="text-left p-4 font-semibold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-medium">{employee.name}</td>
                        <td className="p-4">{employee.department}</td>
                        <td className="p-4">{employee.position}</td>
                        <td className="p-4">{formatCurrency(employee.salary)}</td>
                        <td className="p-4">{formatDate(employee.dateJoined)}</td>
                        {isAdmin && (
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(employee)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(employee)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{employee.name}</h3>
                            <p className="text-sm text-muted-foreground">{employee.position}</p>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(employee)}
                                aria-label={`Edit ${employee.name}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(employee)}
                                aria-label={`Delete ${employee.name}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Department:</span>
                            <p className="font-medium">{employee.department}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Salary:</span>
                            <p className="font-medium">{formatCurrency(employee.salary)}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Date Joined:</span>
                            <p className="font-medium">{formatDate(employee.dateJoined)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} employees
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="flex items-center px-2 sm:px-4 text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Enter the employee details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  aria-label="Employee name"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="department">Department</Label>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddDeptDialogOpen(true)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add New
                    </Button>
                  )}
                </div>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger aria-label="Select department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                  aria-label="Employee position"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                  aria-label="Employee salary"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-department">Department</Label>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddDeptDialogOpen(true)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add New
                    </Button>
                  )}
                </div>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary</Label>
                <Input
                  id="edit-salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedEmployee(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={isAddDeptDialogOpen} onOpenChange={setIsAddDeptDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department for your organization
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDepartment}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Department Name</Label>
                <Input
                  id="dept-name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g., Engineering, Marketing"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddDeptDialogOpen(false);
                setNewDeptName('');
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
