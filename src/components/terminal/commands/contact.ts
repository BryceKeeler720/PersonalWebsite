import type { Command, TerminalLine } from '../types';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `contact-${counter++}`;

export const contactCommand: Command = {
  name: 'contact',
  description: 'Display contact information',
  handler: (): TerminalLine[] => [
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'output', content: `  Email:    ${personalInfo.email}` },
    { id: id(), type: 'output', content: `  GitHub:   ${personalInfo.github}` },
    { id: id(), type: 'output', content: `  LinkedIn: ${personalInfo.linkedin}` },
    { id: id(), type: 'output', content: `  Website:  ${personalInfo.website}` },
    { id: id(), type: 'output', content: '' },
  ],
};
