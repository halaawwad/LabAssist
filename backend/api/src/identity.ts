import {BadRequestException} from '@nestjs/common';
import {createHash,randomBytes} from 'node:crypto';
export enum Role{STUDENT='STUDENT',SUPERVISOR='SUPERVISOR',WORKSHOP_MANAGER='WORKSHOP_MANAGER',DEPARTMENT_HEAD='DEPARTMENT_HEAD'}
export type Actor={id:string;role:Role;fullName:string;email:string;universityNumber:string|null;employeeNumber:string|null;status:string};
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const secret=()=>randomBytes(32).toString('base64url');
export const safeColumns='id,role,full_name,email,university_number,employee_number,status';
export function actor(row:any):Actor{return {id:row.id,role:row.role,fullName:row.full_name,email:row.email,universityNumber:row.university_number,employeeNumber:row.employee_number,status:row.status};}
export function identity(input:{role:Role;fullName:string;email?:string;universityNumber?:string;employeeNumber?:string}){
 const fullName=input.fullName.trim();if(!fullName||fullName.length>160)throw new BadRequestException('Enter a full name.');
 if(input.role===Role.STUDENT){if(!/^\d{8}$/.test(input.universityNumber??'')||input.employeeNumber)throw new BadRequestException('Student number must contain eight digits.');const email=`s${input.universityNumber}@stu.najah.edu`;if(input.email&&input.email.toLowerCase().trim()!==email)throw new BadRequestException('Student email must match the university number.');return {...input,fullName,email};}
 if(input.role===Role.DEPARTMENT_HEAD||input.universityNumber||!new RegExp(input.role===Role.SUPERVISOR?'^\\d{4}$':'^\\d{5}$').test(input.employeeNumber??''))throw new BadRequestException('Enter the correct staff university number.');
 const email=input.email?.trim().toLowerCase();if(!email||!/^[a-z0-9][a-z0-9._%+-]*@najah\.edu$/.test(email))throw new BadRequestException('Staff require a university email ending @najah.edu.');return {...input,fullName,email};
}
