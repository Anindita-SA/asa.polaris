export const DEFAULT_MILESTONES = [
  { title: 'Deploy concrete speaker to portfolio', deadline: '2026-05-15', status: 'done', xp_reward: 150 },
  { title: 'DAB survey paper submitted', deadline: '2026-06-30', status: 'upcoming', xp_reward: 200 },
  { title: 'CHAARG PCB complete + documented', deadline: '2026-08-31', status: 'upcoming', xp_reward: 200 },
  { title: 'Cold email TU Delft / TU/e faculty', deadline: '2026-08-31', status: 'upcoming', xp_reward: 100 },
  { title: 'MOI certificate from NIT Trichy', deadline: '2026-09-30', status: 'upcoming', xp_reward: 75 },
  { title: 'IELTS retake', deadline: '2026-09-30', status: 'upcoming', xp_reward: 150 },
  { title: 'Portfolio fully populated', deadline: '2026-10-31', status: 'upcoming', xp_reward: 175 },
  { title: 'Applications open', deadline: '2026-11-01', status: 'upcoming', xp_reward: 50 },
  { title: 'Submit all applications', deadline: '2027-01-31', status: 'upcoming', xp_reward: 300 },
]

export const DEFAULT_NODES = [
  { type: 'root', title: 'POLARIS', description: 'Your north star', x_pos: 0.5, y_pos: 0.5 },
  { type: 'career', title: 'Career', description: 'Engineering identity, portfolio, applications', x_pos: 0.25, y_pos: 0.3 },
  { type: 'academic', title: 'Academics', description: 'DAB project, survey paper, coursework', x_pos: 0.75, y_pos: 0.3 },
  { type: 'self', title: 'Self', description: 'Health, fitness, creative work, financial clarity', x_pos: 0.5, y_pos: 0.75 },
]

export const DEFAULT_SUBNODES = [
  // Career
  { type: 'career', title: 'Portfolio', description: 'anindita-sa.github.io — projects, case studies', x_pos: 0.1, y_pos: 0.15, parentTitle: 'Career' },
  { type: 'career', title: 'MSc Applications', description: 'TU Delft IPD, TU/e — 36-program tracker', x_pos: 0.2, y_pos: 0.12, parentTitle: 'Career' },
  { type: 'career', title: 'CHAARG', description: 'LiPo mod board PCB project', x_pos: 0.3, y_pos: 0.1, parentTitle: 'Career' },
  // Academic
  { type: 'academic', title: 'DAB Converter', description: 'Research under Dr. Vignesh Kumar', x_pos: 0.7, y_pos: 0.12, parentTitle: 'Academics' },
  { type: 'academic', title: 'Survey Paper', description: 'DAB control strategies — IEEE Access / Energies', x_pos: 0.82, y_pos: 0.15, parentTitle: 'Academics' },
  { type: 'academic', title: 'Coursework', description: 'PSPS, MPMC, EEE core', x_pos: 0.88, y_pos: 0.25, parentTitle: 'Academics' },
  // Self
  { type: 'self', title: 'Fitness', description: 'Greek Commoner Workout — Athena physique', x_pos: 0.35, y_pos: 0.88, parentTitle: 'Self' },
  { type: 'self', title: 'Creative', description: 'Substack, conservation art, Deskimon', x_pos: 0.5, y_pos: 0.92, parentTitle: 'Self' },
  { type: 'self', title: 'Financial', description: 'FI roadmap — entrepreneurship within 7-10yr', x_pos: 0.65, y_pos: 0.88, parentTitle: 'Self' },
]

export const LEVEL_NAMES = [
  { level: 1, name: 'Stargazer', minXp: 0 },
  { level: 2, name: 'Apprentice Inventor', minXp: 200 },
  { level: 3, name: 'Circuit Weaver', minXp: 500 },
  { level: 4, name: 'Signal Architect', minXp: 1000 },
  { level: 5, name: 'Renaissance Engineer', minXp: 2000 },
  { level: 6, name: 'Polaris Navigator', minXp: 3500 },
  { level: 7, name: 'Constellation Maker', minXp: 5500 },
  { level: 8, name: 'Da Vinci Inheritor', minXp: 8000 },
]

export const getLevelInfo = (xp) => {
  let current = LEVEL_NAMES[0]
  let next = LEVEL_NAMES[1]
  for (let i = LEVEL_NAMES.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_NAMES[i].minXp) {
      current = LEVEL_NAMES[i]
      next = LEVEL_NAMES[i + 1] || null
      break
    }
  }
  const progress = next
    ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100
    : 100
  return { current, next, progress }
}
