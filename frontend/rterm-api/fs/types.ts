export interface FSNode {
  name: string;
  type: "file" | "directory" | (string & {});
  size?: number;
  modified_time?: number;
}

export interface FSListResponse {
  path: string;
  directories: FSNode[];
  files: FSNode[];
}

export interface FSReadResponse {
  path: string;
  preview: string;
  preview_available: boolean;
  truncated: boolean;
}
