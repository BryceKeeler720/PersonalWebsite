export interface TerminalLineSegment {
  text: string;
  color: string;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system' | 'ascii';
  content: string;
  color?: string;
  segments?: TerminalLineSegment[];
}

export interface CommandContext {
  history: string[];
  currentDir: string;
  setCurrentDir: (dir: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export type CommandHandler = (args: string[], ctx: CommandContext) => TerminalLine[];

export interface Command {
  name: string;
  description: string;
  usage?: string;
  handler: CommandHandler;
}

export interface Theme {
  name: string;
  background: string;
  foreground: string;
  prompt: string;
  accent: string;
  error: string;
  muted: string;
}
