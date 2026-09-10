import type { Command, TerminalLine } from '../types';

let counter = 0;
const id = () => `donut-${counter++}`;

export const donutCommand: Command = {
  name: 'donut',
  description: 'Spin a 3D ASCII torus',
  handler: (): TerminalLine[] => [
    { id: id(), type: 'output', content: '' },
    { id: id(), type: 'donut', content: '' },
    { id: id(), type: 'system', content: '  donut.c — a z-buffered torus shaded in ASCII. Type "clear" to stop.' },
    { id: id(), type: 'output', content: '' },
  ],
};
