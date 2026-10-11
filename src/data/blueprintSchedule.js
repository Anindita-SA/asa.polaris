// Ground-Truth Reality Blueprint Data (Oct 11 - Oct 22, 2026)
// Strict constraint: Single primary focus per day cap active

export const BLUEPRINT_COUNTDOWNS = [
  { label: 'Robotics CT', date: '2026-10-13', type: 'exam' },
  { label: 'BMS CT', date: '2026-10-15', type: 'exam' },
  { label: 'Sweden Portal & Puja', date: '2026-10-16', type: 'festival' },
  { label: 'NPTEL IoT Exam', date: '2026-10-17', type: 'exam' },
  { label: 'Econ CT2', date: '2026-10-22', type: 'exam' },
];

export const BLUEPRINT_SCHEDULE = [
  {
    id: '2026-10-11',
    date: 'Sun Oct 11',
    isToday: true,
    tag: 'TODAY',
    tagColor: 'amber',
    reality: 'Domestic rest, mental reset, cold email review',
    primaryFocus: 'Review Robotics CT syllabus & key topics (60-90 min)',
    secondaryFocus: 'Sort cupboard papers, dispatch top 3 cold emails, early sleep',
    exam: null,
  },
  {
    id: '2026-10-12',
    date: 'Mon Oct 12',
    isToday: false,
    tag: 'STUDY DAY',
    tagColor: 'sky',
    reality: 'Pre-CT Study Day',
    primaryFocus: 'Robotics CT Revision: Kinematics, sensors, control loops (2-3 focused hours)',
    secondaryFocus: 'Rest, nutritious food, early night',
    exam: null,
  },
  {
    id: '2026-10-13',
    date: 'Tue Oct 13',
    isToday: false,
    tag: 'EXAM DAY',
    tagColor: 'rose',
    reality: 'ROBOTICS CT DAY',
    primaryFocus: 'Sit Robotics CT (Department Hall)',
    secondaryFocus: 'Complete post-exam mental decompress, light walk',
    exam: 'Robotics CT',
  },
  {
    id: '2026-10-14',
    date: 'Wed Oct 14',
    isToday: false,
    tag: 'STUDY DAY',
    tagColor: 'sky',
    reality: 'Pre-CT Study Day',
    primaryFocus: 'BMS CT Revision: Battery models, state of charge, protection & pack architectures (2-3 focused hours)',
    secondaryFocus: 'Rest, light dinner, early sleep',
    exam: null,
  },
  {
    id: '2026-10-15',
    date: 'Thu Oct 15',
    isToday: false,
    tag: 'EXAM DAY',
    tagColor: 'rose',
    reality: 'BMS CT DAY',
    primaryFocus: 'Sit BMS CT',
    secondaryFocus: 'Post-exam break; celebrate clearing both CTs',
    exam: 'BMS CT',
  },
  {
    id: '2026-10-16',
    date: 'Fri Oct 16',
    isToday: false,
    tag: 'FESTIVAL',
    tagColor: 'emerald',
    reality: 'Durga Puja Begins + Sweden Portal Opens',
    primaryFocus: 'Bookmark Swedish programs on portal (15 min); skim NPTEL quiz',
    secondaryFocus: 'Durga Puja festivities & rest',
    exam: null,
  },
  {
    id: '2026-10-17',
    date: 'Sat Oct 17',
    isToday: false,
    tag: 'EXAM DAY',
    tagColor: 'rose',
    reality: 'NPTEL EXAM DAY',
    primaryFocus: 'Sit NPTEL Introduction to IoT Exam',
    secondaryFocus: 'Durga Puja celebrations & festive dinner',
    exam: 'NPTEL IoT',
  },
  {
    id: '2026-10-18',
    date: 'Sun Oct 18',
    isToday: false,
    tag: 'RECOVERY',
    tagColor: 'purple',
    reality: 'DURGA PUJA',
    primaryFocus: 'Sacred Downtime & Festive Recovery Buffer (Zero heavy academic/portfolio tasks)',
    secondaryFocus: 'Family, festive food, rest',
    exam: null,
  },
  {
    id: '2026-10-19',
    date: 'Mon Oct 19',
    isToday: false,
    tag: 'STUDY DAY',
    tagColor: 'sky',
    reality: 'Econ CT2 Prep Day 1',
    primaryFocus: 'Econ CT2 Focus: Module 1 & 2 review, cash flow / capital recovery / cost analysis',
    secondaryFocus: 'Light walk, early night',
    exam: null,
  },
  {
    id: '2026-10-20',
    date: 'Tue Oct 20',
    isToday: false,
    tag: 'STUDY DAY',
    tagColor: 'sky',
    reality: 'Econ CT2 Prep Day 2',
    primaryFocus: 'Econ CT2 Focus: Depreciation models, project evaluation metrics, numerical practice',
    secondaryFocus: 'Good nutrition, sleep',
    exam: null,
  },
  {
    id: '2026-10-21',
    date: 'Wed Oct 21',
    isToday: false,
    tag: 'STUDY DAY',
    tagColor: 'sky',
    reality: 'Econ CT2 Final Review',
    primaryFocus: 'Econ CT2 Focus: Formula sheet drill, mock problems, past papers',
    secondaryFocus: 'Early night before exam',
    exam: null,
  },
  {
    id: '2026-10-22',
    date: 'Thu Oct 22',
    isToday: false,
    tag: 'EXAM DAY',
    tagColor: 'rose',
    reality: 'ECON CT2 DAY',
    primaryFocus: 'Sit Econ CT2 & pull up your weight (CT1 score was 8.25)',
    secondaryFocus: 'Complete post-exam freedom',
    exam: 'Econ CT2',
  },
];

export function calculateDaysRemaining(targetDateStr, baseDateStr = null) {
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const target = new Date(Date.UTC(tY, tM - 1, tD));

  let base;
  if (baseDateStr) {
    const [bY, bM, bD] = baseDateStr.split('-').map(Number);
    base = new Date(Date.UTC(bY, bM - 1, bD));
  } else {
    const now = new Date();
    // Default base date anchor for blueprint is 2026-10-11 if current time is outside blueprint window
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [nY, nM, nD] = (nowStr >= '2026-10-11' && nowStr <= '2026-10-22' ? nowStr : '2026-10-11').split('-').map(Number);
    base = new Date(Date.UTC(nY, nM - 1, nD));
  }

  const diffDays = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
}
