import type { Command } from "commander";

import { commandNames } from "../metadata.js";
import { UnsupportedCommandError } from "../errors.js";

const supportedShells = ["bash", "fish", "powershell", "zsh"] as const;

type SupportedShell = (typeof supportedShells)[number];

export function registerCompletionCommand(program: Command): void {
  program
    .command("completion")
    .argument("<shell>", "Shell to generate completion for")
    .description("Generate the autocompletion script for the specified shell")
    .action((shell: string) => {
      if (!isSupportedShell(shell)) {
        process.stderr.write(`Unsupported shell: ${shell}. Expected one of: ${supportedShells.join(", ")}\n`);
        process.exitCode = 2;
        throw new UnsupportedCommandError("completion");
      }

      process.stdout.write(renderCompletion(shell, commandNames()));
    });
}

function isSupportedShell(value: string): value is SupportedShell {
  return supportedShells.includes(value as SupportedShell);
}

function renderCompletion(shell: SupportedShell, commandList: string[]): string {
  const commands = commandList.join(" ");
  switch (shell) {
    case "bash":
      return [
        "# bash completion for jscn",
        "_jscn_complete() {",
        "  local current_word",
        "  current_word=\"${COMP_WORDS[COMP_CWORD]}\"",
        `  COMPREPLY=( $(compgen -W "${commands}" -- "$current_word") )`,
        "}",
        "complete -F _jscn_complete jscn",
        ""
      ].join("\n");
    case "fish":
      return [
        "# fish completion for jscn",
        ...commands.split(" ").map((command) => `complete -c jscn -f -a ${command}`),
        ""
      ].join("\n");
    case "powershell":
      return [
        "# powershell completion for jscn",
        `Register-ArgumentCompleter -Native -CommandName jscn -ScriptBlock { param($wordToComplete) "${commands}".Split(" ") | Where-Object { $_ -like "$wordToComplete*" } }`,
        ""
      ].join("\n");
    case "zsh":
      return [
        "#compdef jscn",
        "_jscn() {",
        `  _arguments '1:command:(${commands})'`,
        "}",
        "_jscn \"$@\"",
        ""
      ].join("\n");
  }
}
