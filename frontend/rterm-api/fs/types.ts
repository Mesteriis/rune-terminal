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
