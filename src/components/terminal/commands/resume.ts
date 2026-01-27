import type { Command, TerminalLine } from '../types';

let counter = 0;
const id = () => `resume-${counter++}`;

export const resumeCommand: Command = {
  name: 'resume',
  description: 'Show resume info and download links',
  handler: (): TerminalLine[] => [
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'output', content: '  Resume' },
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'output', content: '  View online:   /resume' },
    { id: id(), type: 'output', content: '  Download SWE:  /Bryce_Keeler_Resume_2026_SWE.pdf' },
    { id: id(), type: 'output', content: '  Download DS:   /Bryce_Keeler_Resume_2026_DS.pdf' },
    { id: id(), type: 'output', content: '' },
  ],
};
