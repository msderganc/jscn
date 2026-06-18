export class UnsupportedCommandError extends Error {
  constructor(command: string) {
    super(`Unsupported command: ${command}`);
    this.name = "UnsupportedCommandError";
  }
}
