import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TerminalLine, Theme, CommandContext } from './types';
import { commandRegistry, commandNames } from './commands';
import { defaultTheme } from './data/themes';
import { HOME_DIR } from './data/filesystem';
import { fastfetchCommand } from './commands/utils';
import './Terminal.css';

let lineCounter = 0;
const makeId = () => `line-${lineCounter++}`;

function getInitialLines(): TerminalLine[] {
  const ctx = {
    history: [],
    currentDir: HOME_DIR,
    setCurrentDir: () => {},
    theme: defaultTheme,
    setTheme: () => {},
  };
  return fastfetchCommand.handler([], ctx);
}

const Terminal: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>(getInitialLines);
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDir, setCurrentDir] = useState(HOME_DIR);
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const executeCommand = useCallback((input: string) => {
    const trimmed = input.trim();

    const promptDir = currentDir === HOME_DIR
      ? '~'
      : currentDir.startsWith(HOME_DIR)
        ? '~' + currentDir.slice(HOME_DIR.length)
        : currentDir;

    const inputLine: TerminalLine = {
      id: makeId(),
      type: 'input',
      content: `${promptDir} $ ${trimmed}`,
    };

    if (!trimmed) {
      setLines(prev => [...prev, inputLine]);
      return;
    }

    const parts = trimmed.split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Special: clear wipes everything
    if (cmdName === 'clear') {
      setLines([]);
      return;
    }

    const command = commandRegistry[cmdName];

    if (!command) {
      setLines(prev => [
        ...prev,
        inputLine,
        {
          id: makeId(),
          type: 'error',
          content: `  Command not found: ${cmdName}. Type "help" for available commands.`,
        },
      ]);
      return;
    }

    const ctx: CommandContext = {
      history: [...commandHistory, trimmed],
      currentDir,
      setCurrentDir,
      theme,
      setTheme,
    };

    const result = command.handler(args, ctx);
    setLines(prev => [...prev, inputLine, ...result]);
  }, [commandHistory, currentDir, theme]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setLines([]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInputValue('');
        } else {
          setHistoryIndex(newIndex);
          setInputValue(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = inputValue.trim().toLowerCase();
      if (current) {
        const matches = commandNames.filter(name => name.startsWith(current));
        if (matches.length === 1) {
          setInputValue(matches[0]);
        } else if (matches.length > 1) {
          setLines(prev => [
            ...prev,
            { id: makeId(), type: 'system', content: '  ' + matches.join('  ') },
          ]);
        }
      }
    }
  }, [commandHistory, historyIndex, inputValue]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(inputValue);
    setInputValue('');
  }, [inputValue, executeCommand]);

  const promptDir = currentDir === HOME_DIR
    ? '~'
    : currentDir.startsWith(HOME_DIR)
      ? '~' + currentDir.slice(HOME_DIR.length)
      : currentDir;

  return (
    <div
      className="terminal-container"
      style={{
        backgroundColor: theme.background,
        color: theme.foreground,
      }}
      onClick={handleContainerClick}
    >
      <div className="terminal-header" style={{ borderBottomColor: theme.muted }}>
        <a href="/" className="terminal-back-link" style={{ color: theme.muted }}>
          &larr; Home
        </a>
        <span className="terminal-title" style={{ color: theme.muted }}>
          visitor@bryce: {promptDir}
        </span>
        <div className="terminal-header-spacer" />
      </div>

      <div className="terminal-output" ref={outputRef}>
        {lines.map(line => (
          <div
            key={line.id}
            className={`terminal-line terminal-line-${line.type}`}
            style={{
              color: line.type === 'error'
                ? theme.error
                : line.type === 'ascii'
                  ? theme.accent
                  : line.type === 'system'
                    ? theme.muted
                    : line.color || theme.foreground,
            }}
          >
            {line.type === 'ascii' ? (
              <pre className="ascii-line">{line.content}</pre>
            ) : (
              <span>{line.content}</span>
            )}
          </div>
        ))}

        <form onSubmit={handleSubmit} className="terminal-input-line">
          <span className="terminal-prompt">
            <span style={{ color: theme.prompt }}>visitor</span>
            <span style={{ color: theme.foreground }}>@</span>
            <span style={{ color: theme.prompt }}>bryce</span>
            <span style={{ color: theme.foreground }}>:</span>
            <span style={{ color: theme.accent }}>{promptDir}</span>
            <span style={{ color: theme.foreground }}>$ </span>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="terminal-input"
            style={{ color: theme.foreground, caretColor: theme.accent }}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-label="Terminal input"
          />
        </form>
      </div>
    </div>
  );
};

export default Terminal;
