export const personalInfo = {
  name: 'Bryce Keeler',
  tagline: 'consultant \u00b7 developer',
  title: 'Software Engineer & Data Scientist',
  company: 'Huron Consulting Group',
  role: 'Analyst - Digital Consulting',
  email: 'Bryce@BryceKeeler.com',
  github: 'github.com/BryceKeeler720',
  githubUrl: 'https://github.com/BryceKeeler720',
  linkedin: 'linkedin.com/in/bryce-keeler720',
  linkedinUrl: 'https://www.linkedin.com/in/bryce-keeler720/',
  website: 'brycekeeler.com',

  education: [
    {
      degree: 'B.S. Computer Information Systems',
      school: 'University of Texas at Dallas',
      year: 'Dec 2024',
      notes: ['EY Scholarship recipient'],
    },
    {
      degree: 'MicroMasters in Statistics and Data Science',
      school: 'MIT',
      year: 'In Progress',
      notes: [
        'Currently taking: Probability, Fundamentals of Statistics',
        'Goal: Transition from consulting to ML engineering',
      ],
    },
  ],

  experience: [
    { role: 'Analyst', company: 'Huron Consulting Group', period: 'Jan 2025 - Present', desc: 'Workday Extend apps, Studio integrations, orchestrations' },
    { role: 'Intern', company: 'Huron Consulting Group', period: 'Summer 2024', desc: 'Student scheduling app, university integrations' },
    { role: 'Intern', company: 'PwC', period: 'Summer 2023', desc: 'Tableau/PowerBI dashboards, ETL pipelines' },
    { role: 'Intern', company: 'EY', period: 'Summer 2022', desc: 'Nonprofit consulting, data visualization' },
  ],

  skills: {
    languages: ['Python', 'TypeScript', 'JavaScript', 'Java', 'SQL', 'HTML/CSS'],
    frontend: ['React', 'Astro', 'Tailwind CSS', 'WebSockets'],
    backend: ['FastAPI', 'Django', 'Flask', 'Node.js', 'REST APIs'],
    databases: ['PostgreSQL', 'TimescaleDB', 'SQL Server', 'Supabase', 'Redis'],
    'ai/ml': ['PyTorch', 'YOLOv8', 'OpenCV', 'LSTM', 'Random Forest'],
    devops: ['Docker', 'Proxmox', 'LXC', 'Linux', 'Git', 'Bash', 'Vercel'],
    enterprise: ['Workday Extend', 'Workday Studio', 'ServiceNow', 'Power Automate'],
  },

  projects: [
    { name: 'Algorithmic Trading Bot', desc: 'Self-learning regime-adaptive trading system, scans 6,000+ assets', url: '/TradingBot', tags: ['React', 'TypeScript', 'Alpaca', 'Redis'] },
    { name: 'NutriOne', desc: 'Nutrition tracking with YOLOv8 food recognition', tags: ['FastAPI', 'PostgreSQL', 'YOLOv8'] },
    { name: 'Plant Monitor', desc: 'IoT + LSTM pipeline with ESP32 sensors', tags: ['ESP32', 'PyTorch', 'TimescaleDB'] },
    { name: 'Workday Time Tracker', desc: 'Enterprise app on Workday Marketplace', tags: ['Workday Extend'] },
    { name: 'LLM Reports', desc: 'Automated report generation with Claude API', tags: ['Power Automate', 'Smartsheet'] },
    { name: 'Scheduling App', desc: 'University course scheduling with constraint satisfaction', tags: ['Workday Extend'] },
    { name: 'Home Lab', desc: 'Proxmox server with 15+ containers, self-hosted infra', url: '/HomeLab', tags: ['Proxmox', 'Docker'] },
  ],

  certifications: ['Workday Integrations', 'Workday Extend', 'Workday Orchestrations'],
};
