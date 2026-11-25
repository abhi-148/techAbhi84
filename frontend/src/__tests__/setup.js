import { configure } from '@testing-library/react';
// Routes are code-split, so the first render of a page loads its chunk; allow for that.
configure({ asyncUtilTimeout: 8000 });
import { vi } from 'vitest';
window.scrollTo = vi.fn(); window.alert = vi.fn(); window.confirm = vi.fn(() => true); window.prompt = vi.fn(() => 'reason');
URL.createObjectURL = vi.fn(() => 'blob:x');
