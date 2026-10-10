import { createContext, useContext, useState, type ReactNode } from "react";
import defaultAvatar from "@/assets/student-avatar.jpg";
export type StudentProfile = { name: string; university: string; major: string; year: string; birthYear: string; phone: string; studentNumber: string; email: string; github: string; photo: string };
type PersonalTask = { id: string; text: string; done: boolean };
type Reminder = { id: string; text: string; when: string };
function useProfileState() {
 const [profile, updateProfile] = useState<StudentProfile>({ name: "NOOR OWASSI", university: "", major: "", year: "", birthYear: "", phone: "", studentNumber: "", email: "", github: "https://github.com/NOOROWAISSI", photo: defaultAvatar });
 const [note,setNote]=useState(""); const [tasks,setTasks]=useState<PersonalTask[]>([]); const [reminders,setReminders]=useState<Reminder[]>([]);
 return {profile,updateProfile,note,setNote,tasks,setTasks,reminders,setReminders};
}
const ProfileContext=createContext<ReturnType<typeof useProfileState>|null>(null);
export function StudentProfileProvider({children}:{children:ReactNode}) { const state=useProfileState(); return <ProfileContext.Provider value={state}>{children}</ProfileContext.Provider>; }
export function useStudentProfile(){ const context=useContext(ProfileContext); if(!context)throw new Error("StudentProfileProvider is required");return context; }
export function safeProfileLink(value:string){try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:"?url.href:null;}catch{return null;}}
