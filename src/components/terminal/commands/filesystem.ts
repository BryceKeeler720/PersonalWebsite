import type { Command, TerminalLine } from '../types';
import { resolvePath, getNode, HOME_DIR } from '../data/filesystem';

let counter = 0;
const id = () => `fs-${counter++}`;

export const pwdCommand: Command = {
  name: 'pwd',
  description: 'Print working directory',
  handler: (_args, ctx): TerminalLine[] => [
    { id: id(), type: 'output', content: `  ${ctx.currentDir}` },
  ],
};

export const lsCommand: Command = {
  name: 'ls',
  description: 'List directory contents',
  handler: (args, ctx): TerminalLine[] => {
    const targetPath = args[0]
      ? resolvePath(ctx.currentDir, args[0])
      : ctx.currentDir;

    const node = getNode(targetPath);

    if (!node) {
      return [
        { id: id(), type: 'error', content: `  ls: cannot access '${args[0] || targetPath}': No such file or directory` },
      ];
    }

    if (node.type === 'file') {
      const name = targetPath.split('/').pop() || targetPath;
      return [
        { id: id(), type: 'output', content: `  ${name}` },
      ];
    }

    if (!node.children || Object.keys(node.children).length === 0) {
      return [{ id: id(), type: 'output', content: '' }];
    }

    const entries = Object.entries(node.children);
    const lines: TerminalLine[] = [];

    const items: string[] = [];
    for (const [name, child] of entries) {
      items.push(child.type === 'dir' ? `${name}/` : name);
    }

    lines.push({
      id: id(),
      type: 'output',
      content: '  ' + items.join('  '),
    });

    return lines;
  },
};

export const cdCommand: Command = {
  name: 'cd',
  description: 'Change directory',
  usage: 'cd <directory>',
  handler: (args, ctx): TerminalLine[] => {
    if (args.length === 0 || args[0] === '~') {
      ctx.setCurrentDir(HOME_DIR);
      return [];
    }

    const target = args[0].replace(/^~/, HOME_DIR);
    const newPath = resolvePath(ctx.currentDir, target);
    const node = getNode(newPath);

    if (!node) {
      return [
        { id: id(), type: 'error', content: `  cd: no such file or directory: ${args[0]}` },
      ];
    }

    if (node.type !== 'dir') {
      return [
        { id: id(), type: 'error', content: `  cd: not a directory: ${args[0]}` },
      ];
    }

    ctx.setCurrentDir(newPath);
    return [];
  },
};

export const catCommand: Command = {
  name: 'cat',
  description: 'Display file contents',
  usage: 'cat <file>',
  handler: (args, ctx): TerminalLine[] => {
    if (args.length === 0) {
      return [
        { id: id(), type: 'error', content: '  cat: missing file operand' },
      ];
    }

    const targetPath = resolvePath(ctx.currentDir, args[0]);
    const node = getNode(targetPath);

    if (!node) {
      return [
        { id: id(), type: 'error', content: `  cat: ${args[0]}: No such file or directory` },
      ];
    }

    if (node.type === 'dir') {
      return [
        { id: id(), type: 'error', content: `  cat: ${args[0]}: Is a directory` },
      ];
    }

    const contentLines = (node.content || '').split('\n');
    return contentLines.map(line => ({
      id: id(),
      type: 'output' as const,
      content: `  ${line}`,
    }));
  },
};
