import type { Command, TerminalLine } from '../types';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `exp-${counter++}`;

export const experienceCommand: Command = {
  name: 'experience',
  description: 'Show work experience',
  handler: (): TerminalLine[] => {
    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
    ];

    for (const exp of personalInfo.experience) {
      lines.push(
        { id: id(), type: 'output', content: `  ${exp.role} @ ${exp.company}`, color: '#ffffff' },
        { id: id(), type: 'output', content: `  ${exp.period}` },
        { id: id(), type: 'output', content: `  ${exp.desc}` },
        { id: id(), type: 'output', content: '' },
      );
    }

    return lines;
  },
};
