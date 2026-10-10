/**
 * PdfViewer story (P2-38) — both the "nothing selected" state (which is what
 * a user sees before picking a report) and the embedded document state.
 */
import React from 'react';
import { PdfViewer } from './System';

export default {
  title: 'System/PdfViewer',
  component: PdfViewer,
  tags: ['autodocs'],
};

export const Empty = {
  name: 'Nothing selected',
  args: { src: '' },
};

export const DocumentLoaded = {
  name: 'Document loaded',
  args: { src: 'about:blank', height: 320 },
};
