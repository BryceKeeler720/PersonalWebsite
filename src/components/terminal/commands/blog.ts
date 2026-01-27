import type { Command, TerminalLine } from '../types';

let counter = 0;
const id = () => `blog-${counter++}`;

const blogPosts = [
  { title: 'Building a Regime-Adaptive Algorithmic Trading Bot', date: 'Jan 27, 2026', slug: '/blog/trading-bot' },
  { title: 'Building a Real-Time Home Lab Dashboard on a Serverless Stack', date: 'Jan 27, 2026', slug: '/blog/homelab-dashboard' },
  { title: 'Strategies to Reduce Your Screen Time', date: 'Jan 15, 2026', slug: '/blog/phone-bricking' },
];

export const blogCommand: Command = {
  name: 'blog',
  description: 'Show recent blog posts',
  handler: (): TerminalLine[] => {
    const lines: TerminalLine[] = [
      { id: id(), type: 'output', content: '' },
      { id: id(), type: 'output', content: '  Recent blog posts:' },
      { id: id(), type: 'output', content: '' },
    ];

    for (const post of blogPosts) {
      lines.push(
        { id: id(), type: 'output', content: `  ${post.date}  ${post.title}` },
        { id: id(), type: 'output', content: `              ${post.slug}` },
      );
    }

    lines.push(
      { id: id(), type: 'output', content: '' },
      { id: id(), type: 'output', content: '  Visit /blog for all posts.' },
      { id: id(), type: 'output', content: '' },
    );

    return lines;
  },
};
