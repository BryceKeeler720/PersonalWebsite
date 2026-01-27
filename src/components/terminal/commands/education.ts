import type { Command, TerminalLine } from '../types';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `edu-${counter++}`;

export const educationCommand: Command = {
  name: 'education',
  description: 'Show education details',
  handler: (): TerminalLine[] => {
    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
    ];

    for (const edu of personalInfo.education) {
      lines.push(
        { id: id(), type: 'output', content: `  ${edu.degree}`, color: '#ffffff' },
        { id: id(), type: 'output', content: `  ${edu.school} (${edu.year})` },
      );
      for (const note of edu.notes) {
        lines.push(
          { id: id(), type: 'output', content: `    - ${note}` },
        );
      }
      lines.push({ id: id(), type: 'output', content: '' });
    }

    lines.push(
      { id: id(), type: 'output', content: `  Certifications: ${personalInfo.certifications.join(', ')}` },
      { id: id(), type: 'output', content: '' },
    );

    return lines;
  },
};
