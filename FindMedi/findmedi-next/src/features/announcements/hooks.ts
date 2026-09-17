/** Announcements feature — hooks. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAnnouncements, createAnnouncement } from './api';
import type { AnnouncementForm } from './types';
export function useAnnouncements() { return useQuery({ queryKey: ['admin-announcements'], queryFn: getAnnouncements, staleTime: 30_000 }); }
export function useCreateAnnouncement() { const qc=useQueryClient(); return useMutation({ mutationFn: (body: AnnouncementForm)=>createAnnouncement(body), onSuccess: ()=>qc.invalidateQueries({queryKey:['admin-announcements']}) }); }
