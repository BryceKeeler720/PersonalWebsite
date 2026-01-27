import type { Command, TerminalLine } from '../types';
import { themes } from '../data/themes';

let counter = 0;
const id = () => `theme-${counter++}`;

export const themesCommand: Command = {
  name: 'themes',
  description: 'List or switch terminal themes',
  usage: 'themes [set <name>]',
  handler: (args, ctx): TerminalLine[] => {
    if (args.length === 0) {
      const lines: TerminalLine[] = [
        { id: id(), type: 'output', content: '' },
        { id: id(), type: 'output', content: '  Available themes:' },
        { id: id(), type: 'output', content: '' },
      ];

      for (const name of Object.keys(themes)) {
        const marker = name === ctx.theme.name ? ' (active)' : '';
        lines.push({
          id: id(),
          type: 'output',
          content: `    ${name}${marker}`,
        });
      }

      lines.push(
        { id: id(), type: 'output', content: '' },
        { id: id(), type: 'output', content: '  Usage: themes set <name>' },
        { id: id(), type: 'output', content: '' },
      );

      return lines;
    }

    if (args[0] === 'set' && args[1]) {
      const themeName = args[1].toLowerCase();
      const theme = themes[themeName];

      if (!theme) {
        return [
          { id: id(), type: 'error', content: `  Theme "${args[1]}" not found. Type "themes" to see available themes.` },
        ];
      }

      ctx.setTheme(theme);
      return [
        { id: id(), type: 'output', content: `  Theme changed to "${themeName}".` },
      ];
    }

    return [
      { id: id(), type: 'output', content: '  Usage: themes set <name>' },
    ];
  },
};
