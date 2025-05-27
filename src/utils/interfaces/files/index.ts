export interface IFile {
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  public: boolean;
  user_id: number;
  entity_type: string;
  entity_id: number | string;
}
