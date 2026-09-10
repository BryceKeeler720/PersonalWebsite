export const personalInfo = {
  name: 'Bryce Keeler',
  tagline: 'machine learning \u00b7 systems',
  title: 'Machine Learning Engineer',
  company: 'Huron Consulting Group',
  role: 'Machine Learning Engineer',
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
    { role: 'Machine Learning Engineer', company: 'Huron Consulting Group', period: 'Jan 2025 - Present', desc: 'ML models for ad yield + predictive maintenance, GenAI reporting systems' },
    { role: 'Intern', company: 'Huron Consulting Group', period: 'Summer 2024', desc: 'Student scheduling app, university integrations' },
    { role: 'Intern', company: 'PwC', period: 'Summer 2023', desc: 'Tableau/PowerBI dashboards, ETL pipelines' },
    { role: 'Intern', company: 'EY', period: 'Summer 2022', desc: 'Nonprofit consulting, data visualization' },
  ],

  skills: {
    languages: ['Python', 'TypeScript', 'JavaScript', 'SQL', 'Java'],
    'machine learning': ['PyTorch', 'TensorFlow', 'scikit-learn', 'YOLOv8', 'LSTM', 'Random Forest', 'OpenCV', 'walk-forward validation'],
    'generative ai': ['Anthropic & OpenAI APIs', 'LLM-as-judge evaluation', 'agent tracing', 'LangChain', 'LlamaIndex', 'CrewAI'],
    platforms: ['AWS', 'Databricks', 'Docker', 'PostgreSQL', 'TimescaleDB', 'Redis', 'n8n', 'Proxmox', 'Vercel'],
    backend: ['FastAPI', 'Next.js', 'Node.js', 'Django', 'Flask', 'WebSockets'],
    visualization: ['D3.js', 'React', 'Streamlit', 'Tableau', 'Power BI'],
  },

  projects: [
    { name: '2Signal', desc: 'AI agent evaluation & reliability platform', url: 'https://2signal.dev', tags: ['TypeScript', 'Python', 'Next.js', 'PostgreSQL', 'Redis'] },
    { name: 'Trading Bot', desc: 'Self-learning regime-adaptive trading system, scans 6,000+ assets', url: '/TradingBot', tags: ['TypeScript', 'Alpaca', 'Redis', 'D3'] },
    { name: 'Home Lab', desc: 'Proxmox server with 15+ containers, self-hosted infra', url: '/HomeLab', tags: ['Proxmox', 'Docker'] },
    { name: 'NutriOne', desc: 'Nutrition tracking with on-device YOLOv8 food recognition', url: '/projects/nutrione', tags: ['FastAPI', 'PostgreSQL', 'YOLOv8'] },
    { name: 'Plant Monitor', desc: 'IoT + LSTM watering predictions on ESP32 sensors', url: '/projects/plant-monitor', tags: ['ESP32', 'PyTorch', 'TimescaleDB'] },
  ],

  certifications: ['Workday Integrations', 'Workday Extend', 'Workday Orchestrations'],
};
