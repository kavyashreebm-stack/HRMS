import React from "react";
import { House, CircleUserRound, FileUser, User, GraduationCap, Briefcase, Users, HeartPulse, FileCheck,LogOut, Bell } from "lucide-react";


export const HomeIcon = (p) => <House {...p} />;
export const UserIcon = (p) => <CircleUserRound {...p} />;
export const FileIcon = (p) => <FileUser {...p} />;
export const PersonalIcon = (props) => <User {...props} />;
export const EducationIcon = (props) => <GraduationCap {...props} />;
export const EmploymentIcon = (props) => <Briefcase {...props} />;
export const ReferencesIcon = (props) => <Users {...props} />;
export const FamilyIcon = (props) => <Users {...props} />;
export const MedicalIcon = (props) => <HeartPulse {...props} />;
export const DeclarationIcon = (props) => <FileCheck {...props} />;
export const LogoutIcon = (props) => <LogOut {...props} />;
export const NotificationIcon = (props) => <Bell {...props} />;

