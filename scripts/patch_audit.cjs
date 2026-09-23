const fs = require('fs');
const filePath = 'e:\\Academic files\\Competiton and Project files\\Polaris\\asa.polaris\\scripts\\weekly_audit.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change insertTasks to return the inserted tasks array instead of just the count
content = content.replace(
  '  return insertData.length;\n}',
  '  return insertData;\n}'
);
content = content.replace(
  '  if (filteredTasks.length === 0) return 0;',
  '  if (filteredTasks.length === 0) return [];'
);
content = content.replace(
  '  if (!Array.isArray(newTasks) || newTasks.length === 0) return 0;',
  '  if (!Array.isArray(newTasks) || newTasks.length === 0) return [];'
);

// 2. Add fs and path imports at the top
if (!content.includes('import fs')) {
  content = content.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport fs from 'fs';\nimport path from 'path';"
  );
}

// 3. Update runAudit() to generate docs/task_audit_report.md
const auditReportCode = `
  const insertedTasks = await insertTasks(supabase, userId, parsedTasks);
  const insertedCount = insertedTasks.length;
  console.log(\`Successfully inserted \${insertedCount} tasks into the inbox.\`);

  // Generate Audit Report
  const reportPath = path.join(process.cwd(), 'docs', 'task_audit_report.md');
  let reportMd = \`# Task Audit Report\\n\\n**Run Date:** \${new Date().toLocaleString()}\\n\\n\`;
  reportMd += \`## Summary\\n\`;
  reportMd += \`- **Milestones Analyzed:** \${milestones.length}\\n\`;
  reportMd += \`- **Meals Analyzed:** \${meals.length}\\n\`;
  reportMd += \`- **New Audit Tasks Created:** \${insertedCount}\\n\\n\`;
  
  if (insertedCount > 0) {
    reportMd += \`## New Tasks\\n\`;
    for (const t of insertedTasks) {
      reportMd += \`- **\${t.title}**\\n  > \${t.notes || 'No notes'}\\n\\n\`;
    }
  } else {
    reportMd += \`*No new actionable tasks were generated in this audit run.*\\n\`;
  }
  
  fs.writeFileSync(reportPath, reportMd, 'utf8');
  console.log('Wrote Audit Report to task_audit_report.md');
}
`;

content = content.replace(
  /  const insertedCount = await insertTasks\(supabase, userId, parsedTasks\);\r?\n  console\.log\(`Successfully inserted \$\{insertedCount\} tasks into the inbox\.`\);\r?\n}/,
  auditReportCode
);

fs.writeFileSync(filePath, content);
console.log('Patch complete.');
