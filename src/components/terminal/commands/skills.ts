import type { Command, TerminalLine } from '../types';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `skills-${counter++}`;

export const skillsCommand: Command = {
  name: 'skills',
  description: 'Show tech skills by category',
  handler: (): TerminalLine[] => {
    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
    ];

    for (const [category, skills] of Object.entries(personalInfo.skills)) {
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      const pad = ' '.repeat(Math.max(0, 12 - label.length));
      lines.push({
        id: id(),
        type: 'output',
        content: `  ${label}${pad} ${(skills as string[]).join(', ')}`,
      });
    }

    lines.push({ id: id(), type: 'output', content: '' });

    return lines;
  },
};
