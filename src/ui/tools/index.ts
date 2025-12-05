import { getDocumentContent } from "./getDocumentContent";
import { setDocumentContent } from "./setDocumentContent";
import { getSelection } from "./getSelection";
import { webFetch } from "./webFetch";

export const wordTools = [
  getDocumentContent,
  setDocumentContent,
  getSelection,
  webFetch,
];
