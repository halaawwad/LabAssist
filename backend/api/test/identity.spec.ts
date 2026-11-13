import {identity,Role} from '../src/identity';
describe('Account identity rules',()=>{
 it('derives the exact student email from eight digits',()=>expect(identity({role:Role.STUDENT,fullName:' Noor ',universityNumber:'12345678'})).toMatchObject({email:'s12345678@stu.najah.edu',fullName:'Noor'}));
 it.each(['1234567','123456789','abcdefgh','1234 678'])('rejects invalid student number %s',number=>expect(()=>identity({role:Role.STUDENT,fullName:'Noor',universityNumber:number})).toThrow());
 it('rejects a mismatching student email',()=>expect(()=>identity({role:Role.STUDENT,fullName:'Noor',universityNumber:'12345678',email:'s11111111@stu.najah.edu'})).toThrow());
 it.each([[Role.SUPERVISOR,'12345'],[Role.WORKSHOP_MANAGER,'1234']])('enforces staff number length for %s',(role,number)=>expect(()=>identity({role,fullName:'Staff',employeeNumber:number,email:'staff@najah.edu'})).toThrow());
 it.each([Role.SUPERVISOR,Role.WORKSHOP_MANAGER])('requires staff university email for %s',role=>expect(()=>identity({role,fullName:'Staff',employeeNumber:role===Role.SUPERVISOR?'1234':'12345',email:'staff@gmail.com'})).toThrow());
 it('normalizes staff email',()=>expect(identity({role:Role.SUPERVISOR,fullName:'Staff',employeeNumber:'1234',email:' Staff@Najah.edu '})).toMatchObject({email:'staff@najah.edu'}));
 it('never provisions another department head through the staff endpoint',()=>expect(()=>identity({role:Role.DEPARTMENT_HEAD,fullName:'Other',email:'head@najah.edu'})).toThrow());
});
