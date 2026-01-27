import type { Command, TerminalLine } from '../types';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `about-${counter++}`;

export const aboutCommand: Command = {
  name: 'about',
  description: 'Display information about Bryce',
  handler: (): TerminalLine[] => [
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'output', content: `  ${personalInfo.name}`, color: '#ffffff' },
    { id: id(), type: 'output', content: `  ${personalInfo.title}` },
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'output', content: `  Currently: ${personalInfo.role} at ${personalInfo.company}` },
    { id: id(), type: 'output', content: `  Education: ${personalInfo.education[0].degree}` },
    { id: id(), type: 'output', content: `             ${personalInfo.education[0].school} (${personalInfo.education[0].year})` },
    { id: id(), type: 'output', content: `  Studying:  ${personalInfo.education[1].degree} - ${personalInfo.education[1].school}` },
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'output', content: '  Type "experience" for work history, "skills" for tech stack, "projects" for projects.' },
    { id: id(), type: 'output', content: '' },
  ],
};
