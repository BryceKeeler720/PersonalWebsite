import type { Command, TerminalLine } from '../types';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `socials-${counter++}`;

export const socialsCommand: Command = {
  name: 'socials',
  description: 'Show social links',
  handler: (): TerminalLine[] => [
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'output', content: `  GitHub:   ${personalInfo.githubUrl}` },
    { id: id(), type: 'output', content: `  LinkedIn: ${personalInfo.linkedinUrl}` },
    { id: id(), type: 'output', content: `  Website:  https://${personalInfo.website}` },
    { id: id(), type: 'output', content: '' },
  ],
};
