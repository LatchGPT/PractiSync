import type { Row } from './contracts';

/** Older posts retain their original program until explicitly edited. */
export function recruitmentCourseIds(job: Row): string[] {
 let ids: unknown = [];
 try { ids = JSON.parse(String(job.requiredCoursesJson || '[]')); } catch { /* Legacy single-program post. */ }
 return [...new Set([String(job.courseId || ''), ...(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && !!id) : [])].filter(Boolean))];
}

export function emailApplicantHref(email: string, position: string): string | undefined {
 if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n?&#]/.test(email)) return undefined;
 return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Internship application: ${position}`)}`;
}
