import type { Command } from '../types';
import { aboutCommand } from './about';
import { projectsCommand } from './projects';
import { blogCommand } from './blog';
import { resumeCommand } from './resume';
import { contactCommand } from './contact';
import { socialsCommand } from './socials';
import { educationCommand } from './education';
import { experienceCommand } from './experience';
import { skillsCommand } from './skills';
import { themesCommand } from './themes';
import {
  helpCommand,
  clearCommand,
  historyCommand,
  echoCommand,
  dateCommand,
  welcomeCommand,
  whoamiCommand,
  fastfetchCommand,
  exitCommand,
} from './utils';
import { lsCommand, cdCommand, catCommand, pwdCommand } from './filesystem';

export const commandRegistry: Record<string, Command> = {
  help: helpCommand,
  about: aboutCommand,
  projects: projectsCommand,
  blog: blogCommand,
  resume: resumeCommand,
  contact: contactCommand,
  socials: socialsCommand,
  education: educationCommand,
  experience: experienceCommand,
  skills: skillsCommand,
  themes: themesCommand,
  whoami: whoamiCommand,
  fastfetch: fastfetchCommand,
  clear: clearCommand,
  history: historyCommand,
  echo: echoCommand,
  date: dateCommand,
  welcome: welcomeCommand,
  exit: exitCommand,
  ls: lsCommand,
  cd: cdCommand,
  cat: catCommand,
  pwd: pwdCommand,
};

export const commandNames = Object.keys(commandRegistry);
