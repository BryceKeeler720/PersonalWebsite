import type { Command, TerminalLine } from '../types';
import { asciiArt, welcomeMessage } from '../data/ascii';

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
      ['fastfetch', 'System info card'],
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

export const fastfetchCommand: Command = {
  name: 'fastfetch',
  description: 'System info card',
  handler: (): TerminalLine[] => {
    const red = '#C34043';
    const green = '#76946A';
    const yellow = '#C0A36E';
    const blue = '#7E9CD8';
    const magenta = '#957FB8';
    const cyan = '#6A9589';
    const white = '#DCD7BA';
    const muted = '#727169';
    const border = '#727169';

    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
    ];

    // ASCII art logo
    const art = [
      ' ____                        ',
      '| __ ) _ __ _   _  ___ ___  ',
      '|  _ \\| \'__| | | |/ __/ _ \\ ',
      '| |_) | |  | |_| | (_|  __/ ',
      '|____/|_|   \\__, |\\___\\___| ',
      '            |___/            ',
    ];

    for (const line of art) {
      lines.push({ id: id(), type: 'ascii', content: line });
    }

    lines.push({ id: id(), type: 'output', content: '' });

    // System info box
    lines.push({ id: id(), type: 'output', content: '  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510', color: border });
    lines.push({ id: id(), type: 'output', content: '    Chassis   : Desktop (MSI)', color: red });
    lines.push({ id: id(), type: 'output', content: '    OS        : Arch Linux x86_64', color: red });
    lines.push({ id: id(), type: 'output', content: '    Kernel    : 6.18.5-zen1-1-zen', color: yellow });
    lines.push({ id: id(), type: 'output', content: '    Packages  : 1315 (pacman), 34 (flatpak)', color: yellow });
    lines.push({ id: id(), type: 'output', content: '    Display   : 1920x1080 @ 120Hz', color: green });
    lines.push({ id: id(), type: 'output', content: '    Display   : 1920x1080 @ 144Hz', color: green });
    lines.push({ id: id(), type: 'output', content: '    Terminal  : kitty 0.45.0', color: cyan });
    lines.push({ id: id(), type: 'output', content: '    WM        : Hyprland', color: cyan });
    lines.push({ id: id(), type: 'output', content: '  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518', color: border });

    lines.push({ id: id(), type: 'output', content: '' });

    // Title line
    lines.push({ id: id(), type: 'output', content: '    bryce @ arch', color: white });

    // Hardware info box
    lines.push({ id: id(), type: 'output', content: '  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510', color: border });
    lines.push({ id: id(), type: 'output', content: '    CPU       : AMD Ryzen 5 5600G @ 4.46 GHz', color: blue });
    lines.push({ id: id(), type: 'output', content: '    GPU       : AMD Radeon Vega Series', color: blue });
    lines.push({ id: id(), type: 'output', content: '    GPU       : Intel Arc B580', color: magenta });
    lines.push({ id: id(), type: 'output', content: '    Driver    : amdgpu', color: magenta });
    lines.push({ id: id(), type: 'output', content: '    Driver    : xe', color: cyan });
    lines.push({ id: id(), type: 'output', content: '    Memory    : 8.37 GiB / 27.29 GiB', color: cyan });
    lines.push({ id: id(), type: 'output', content: '    OS Age    : 74 days', color: green });
    lines.push({ id: id(), type: 'output', content: '    Uptime    : 7 hours, 31 mins', color: green });
    lines.push({ id: id(), type: 'output', content: '  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518', color: border });

    // Color palette circles
    lines.push({ id: id(), type: 'output', content: '' });
    lines.push({ id: id(), type: 'output', content: `    ${'\u25CF'} ${'\u25CF'} ${'\u25CF'} ${'\u25CF'} ${'\u25CF'} ${'\u25CF'} ${'\u25CF'} ${'\u25CF'}`, color: muted });

    lines.push({ id: id(), type: 'output', content: '' });
    lines.push({ id: id(), type: 'output', content: '  Type "help" to see available commands.' });
    lines.push({ id: id(), type: 'output', content: '' });

    return lines;
  },
};

export const exitCommand: Command = {
  name: 'exit',
  description: 'Go back to the main site',
  handler: (): TerminalLine[] => {
    if (typeof window !== 'undefined') {
      window.location.href = '/traditional';
    }
    return [
      { id: id(), type: 'output', content: '  Redirecting to home...' },
    ];
  },
};
