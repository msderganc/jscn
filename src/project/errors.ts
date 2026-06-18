type ProjectDiscoveryErrorCode = "PATH_OUTSIDE_ROOT" | "FILE_TOO_LARGE" | "INPUT_NOT_FOUND";

export class ProjectDiscoveryError extends Error {
  readonly code: ProjectDiscoveryErrorCode;
  readonly path: string;

  constructor(code: ProjectDiscoveryErrorCode, path: string, message: string) {
    super(message);
    this.name = "ProjectDiscoveryError";
    this.code = code;
    this.path = path;
  }
}
