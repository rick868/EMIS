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
    // Step 1: Link employees to departments
    console.log('📋 Step 1: Linking employees to departments...');
    const employees = await prisma.employee.findMany({
      where: { departmentId: null },
    });

    let linkedEmployees = 0;
    for (const employee of employees) {
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

    // Step 2: Link feedback to categories
    console.log('📋 Step 2: Linking feedback to categories...');
    const feedbacks = await prisma.feedback.findMany({
      where: { categoryId: null },
    });

    let linkedFeedback = 0;
    for (const feedback of feedbacks) {
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

    // Step 3: Summary
    const totalEmployees = await prisma.employee.count();
    const employeesWithDept = await prisma.employee.count({
      where: { departmentId: { not: null } },
    });
    const totalFeedback = await prisma.feedback.count();
    const feedbackWithCategory = await prisma.feedback.count({
      where: { categoryId: { not: null } },
    });

    console.log('📊 Migration Summary:');
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

