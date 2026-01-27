import type { Command, TerminalLine } from '../types';
import { asciiArt, welcomeMessage } from '../data/ascii';
import { personalInfo } from '../data/personalInfo';

let counter = 0;
const id = () => `util-${counter++}`;

export const helpCommand: Command = {
  name: 'help',
  description: 'List all available commands',
  handler: (_args, _ctx): TerminalLine[] => {
    const commands = [
      ['about', 'Display information about Bryce'],
      ['projects', 'List projects'],
      ['blog', 'Show recent blog posts'],
      ['resume', 'Show resume info and download links'],
      ['contact', 'Display contact information'],
      ['socials', 'Show social links'],
      ['education', 'Show education details'],
      ['experience', 'Show work experience'],
      ['skills', 'Show tech skills by category'],
      ['', ''],
      ['themes', 'List or switch terminal themes'],
      ['whoami', 'Display current user'],
      ['neofetch', 'System info card'],
      ['clear', 'Clear the terminal'],
      ['history', 'Show command history'],
      ['echo', 'Echo text back'],
      ['date', 'Show current date and time'],
      ['welcome', 'Show welcome message'],
      ['exit', 'Go back to the main site'],
      ['', ''],
      ['ls', 'List directory contents'],
      ['cd', 'Change directory'],
      ['cat', 'Display file contents'],
      ['pwd', 'Print working directory'],
    ];

    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
      { id: id(), type: 'output', content: '  Available commands:' },
      { id: id(), type: 'output', content: '' },
    ];

    for (const [name, desc] of commands) {
      if (name === '') {
        lines.push({ id: id(), type: 'output', content: '' });
      } else {
        const pad = ' '.repeat(Math.max(0, 14 - name.length));
        lines.push({
          id: id(),
          type: 'output',
          content: `  ${name}${pad}${desc}`,
        });
      }
    }

    lines.push(
      { id: id(), type: 'output', content: '' },
      { id: id(), type: 'output', content: '  Tab: autocomplete  |  Up/Down: command history' },
      { id: id(), type: 'output', content: '' },
    );

    return lines;
  },
};

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clear the terminal',
  handler: (): TerminalLine[] => [],
};

export const historyCommand: Command = {
  name: 'history',
  description: 'Show command history',
  handler: (_args, ctx): TerminalLine[] => {
    if (ctx.history.length === 0) {
      return [{ id: id(), type: 'output', content: '  No commands in history.' }];
    }

    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
    ];

    ctx.history.forEach((cmd, i) => {
      const num = String(i + 1).padStart(4, ' ');
      lines.push({
        id: id(),
        type: 'output',
        content: `  ${num}  ${cmd}`,
      });
    });

    lines.push({ id: id(), type: 'output', content: '' });

    return lines;
  },
};

export const echoCommand: Command = {
  name: 'echo',
  description: 'Echo text back',
  handler: (args): TerminalLine[] => [
    { id: id(), type: 'output', content: args.join(' ') },
  ],
};

export const dateCommand: Command = {
  name: 'date',
  description: 'Show current date and time',
  handler: (): TerminalLine[] => [
    { id: id(), type: 'output', content: `  ${new Date().toString()}` },
  ],
};

export const welcomeCommand: Command = {
  name: 'welcome',
  description: 'Show welcome message',
  handler: (): TerminalLine[] => {
    const lines: TerminalLine[] = [];

    for (const line of asciiArt) {
      lines.push({ id: id(), type: 'ascii', content: line });
    }

    for (const line of welcomeMessage) {
      lines.push({ id: id(), type: 'output', content: line });
    }

    return lines;
  },
};

export const whoamiCommand: Command = {
  name: 'whoami',
  description: 'Display current user',
  handler: (): TerminalLine[] => [
    { id: id(), type: 'output', content: '  visitor' },
  ],
};

export const neofetchCommand: Command = {
  name: 'neofetch',
  description: 'System info card',
  handler: (): TerminalLine[] => {
    const art = [
      ' ____                        ',
      '| __ ) _ __ _   _  ___ ___  ',
      '|  _ \\| \'__| | | |/ __/ _ \\ ',
      '| |_) | |  | |_| | (_|  __/ ',
      '|____/|_|   \\__, |\\___\\___| ',
      '            |___/            ',
    ];

    const info = [
      `${personalInfo.name}`,
      '------------------------------',
      `OS:        Arch Linux (btw)`,
      `Host:      brycekeeler.com`,
      `Uptime:    since Jan 2025`,
      `Shell:     zsh`,
    ];

    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
    ];

    const maxLines = Math.max(art.length, info.length);

    for (let i = 0; i < maxLines; i++) {
      const artLine = art[i] || ' '.repeat(30);
      const infoLine = info[i] || '';
      lines.push({
        id: id(),
        type: i < art.length ? 'ascii' : 'output',
        content: `${artLine}   ${infoLine}`,
      });
    }

    lines.push({ id: id(), type: 'output', content: '' });

    return lines;
  },
};

export const exitCommand: Command = {
  name: 'exit',
  description: 'Go back to the main site',
  handler: (): TerminalLine[] => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return [
      { id: id(), type: 'output', content: '  Redirecting to home...' },
    ];
  },
};
