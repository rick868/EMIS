/**
 * Data Migration Script
 * Links existing employees to departments and feedback to categories via foreign keys
 * 
 * Run with: node prisma/migrate-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  console.log('🔄 Starting data migration...\n');

  try {
    // Step 1: Create missing departments from employee data
    console.log('📋 Step 1: Creating missing departments...');
    const employees = await prisma.employee.findMany();
    const uniqueDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))];
    
    let createdDepartments = 0;
    for (const deptName of uniqueDepartments) {
      const existing = await prisma.department.findFirst({
        where: { name: deptName },
      });

      if (!existing) {
        await prisma.department.create({
          data: { name: deptName },
        });
        createdDepartments++;
        console.log(`  ✓ Created department "${deptName}"`);
      }
    }

    console.log(`\n✅ Created ${createdDepartments} new departments\n`);

    // Step 2: Link employees to departments
    console.log('📋 Step 2: Linking employees to departments...');
    const employeesToLink = await prisma.employee.findMany({
      where: { departmentId: null },
    });

    let linkedEmployees = 0;
    for (const employee of employeesToLink) {
      if (!employee.department) {
        console.log(`  ⚠️  Employee "${employee.name}" has no department`);
        continue;
      }

      const department = await prisma.department.findFirst({
        where: { name: employee.department },
      });

      if (department) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { departmentId: department.id },
        });
        linkedEmployees++;
        console.log(`  ✓ Linked employee "${employee.name}" to department "${department.name}"`);
      } else {
        console.log(`  ⚠️  Department "${employee.department}" not found for employee "${employee.name}"`);
      }
    }

    console.log(`\n✅ Linked ${linkedEmployees} employees to departments\n`);

    // Step 3: Create missing categories from feedback data
    console.log('📋 Step 3: Creating missing feedback categories...');
    const feedbacks = await prisma.feedback.findMany();
    const uniqueCategories = [...new Set(feedbacks.map(f => f.category).filter(Boolean))];
    
    let createdCategories = 0;
    for (const catName of uniqueCategories) {
      const existing = await prisma.feedbackCategory.findFirst({
        where: { name: catName },
      });

      if (!existing) {
        await prisma.feedbackCategory.create({
          data: { name: catName },
        });
        createdCategories++;
        console.log(`  ✓ Created category "${catName}"`);
      }
    }

    console.log(`\n✅ Created ${createdCategories} new categories\n`);

    // Step 4: Link feedback to categories
    console.log('📋 Step 4: Linking feedback to categories...');
    const feedbacksToLink = await prisma.feedback.findMany({
      where: { categoryId: null },
    });

    let linkedFeedback = 0;
    for (const feedback of feedbacksToLink) {
      if (!feedback.category) {
        console.log(`  ⚠️  Feedback #${feedback.id} has no category`);
        continue;
      }

      const category = await prisma.feedbackCategory.findFirst({
        where: { name: feedback.category },
      });

      if (category) {
        await prisma.feedback.update({
          where: { id: feedback.id },
          data: { categoryId: category.id },
        });
        linkedFeedback++;
        console.log(`  ✓ Linked feedback #${feedback.id} to category "${category.name}"`);
      } else {
        console.log(`  ⚠️  Category "${feedback.category}" not found for feedback #${feedback.id}`);
      }
    }

    console.log(`\n✅ Linked ${linkedFeedback} feedback entries to categories\n`);

    // Step 5: Summary
    const totalDepartments = await prisma.department.count();
    const totalCategories = await prisma.feedbackCategory.count();
    const totalEmployees = await prisma.employee.count();
    const employeesWithDept = await prisma.employee.count({
      where: { departmentId: { not: null } },
    });
    const totalFeedback = await prisma.feedback.count();
    const feedbackWithCategory = await prisma.feedback.count({
      where: { categoryId: { not: null } },
    });

    console.log('📊 Migration Summary:');
    console.log(`  Departments: ${totalDepartments} total (${createdDepartments} created)`);
    console.log(`  Categories: ${totalCategories} total (${createdCategories} created)`);
    console.log(`  Employees: ${employeesWithDept}/${totalEmployees} linked to departments`);
    console.log(`  Feedback: ${feedbackWithCategory}/${totalFeedback} linked to categories`);
    console.log('\n✅ Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateData()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

