/**
 * Export utility functions for CSV and PDF generation
 */

import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions [{key, label}]
 * @param {String} filename - Output filename
 */
export const exportToCSV = (data, columns, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Map data to CSV format
  const csvData = data.map(item => {
    const row = {};
    columns.forEach(col => {
      row[col.label] = item[col.key] || '';
    });
    return row;
  });

  // Convert to CSV
  const csv = Papa.unparse(csvData);
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to PDF
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions [{key, label}]
 * @param {String} title - PDF title
 * @param {String} filename - Output filename
 */
export const exportToPDF = (data, columns, title = 'Report', filename = 'export.pdf') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Prepare table data
  const tableData = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );

  const tableColumns = columns.map(col => col.label);

  // Add table
  doc.autoTable({
    head: [tableColumns],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Save PDF
  doc.save(filename);
};

/**
 * Export employees to CSV
 */
export const exportEmployeesToCSV = (employees) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'salary', label: 'Salary' },
    { key: 'dateJoined', label: 'Date Joined' },
  ];
  
  exportToCSV(employees, columns, `employees_${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Export employees to PDF
 */
export const exportEmployeesToPDF = (employees) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'salary', label: 'Salary' },
    { key: 'dateJoined', label: 'Date Joined' },
  ];
  
  exportToPDF(employees, columns, 'Employee Report', `employees_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export feedback to CSV
 */
export const exportFeedbackToCSV = (feedback) => {
  const columns = [
    { key: 'employee.name', label: 'Employee' },
    { key: 'employee.department', label: 'Department' },
    { key: 'category', label: 'Category' },
    { key: 'message', label: 'Message' },
    { key: 'dateSubmitted', label: 'Date Submitted' },
  ];
  
  // Flatten nested employee data
  const flattenedData = feedback.map(item => ({
    'employee.name': item.employee?.name || '',
    'employee.department': item.employee?.department || '',
    category: item.category,
    message: item.message,
    dateSubmitted: item.dateSubmitted,
  }));
  
  exportToCSV(flattenedData, columns, `feedback_${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Export feedback to PDF
 */
export const exportFeedbackToPDF = (feedback) => {
  const columns = [
    { key: 'employee.name', label: 'Employee' },
    { key: 'employee.department', label: 'Department' },
    { key: 'category', label: 'Category' },
    { key: 'message', label: 'Message' },
    { key: 'dateSubmitted', label: 'Date Submitted' },
  ];
  
  // Flatten nested employee data
  const flattenedData = feedback.map(item => ({
    'employee.name': item.employee?.name || '',
    'employee.department': item.employee?.department || '',
    category: item.category,
    message: item.message,
    dateSubmitted: item.dateSubmitted,
  }));
  
  exportToPDF(flattenedData, columns, 'Feedback Report', `feedback_${new Date().toISOString().split('T')[0]}.pdf`);
};

