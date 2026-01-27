import type { Command, TerminalLine } from '../types';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `proj-${counter++}`;

export const projectsCommand: Command = {
  name: 'projects',
  description: 'List projects',
  handler: (): TerminalLine[] => {
    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
    ];

    for (const project of personalInfo.projects) {
      const urlPart = project.url ? `  ->  ${project.url}` : '';
      lines.push(
        { id: id(), type: 'output', content: `  ${project.name}${urlPart}`, color: '#ffffff' },
        { id: id(), type: 'output', content: `  ${project.desc}` },
        { id: id(), type: 'output', content: `  [${project.tags.join(', ')}]` },
        { id: id(), type: 'output', content: '' },
      );
    }

    return lines;
  },
};
