import {createFileRoute} from '@tanstack/react-router';
import {LabPreview} from '@/components/lab-preview/LabPreview';
export const Route=createFileRoute('/lab-preview')({ssr:false,head:()=>({meta:[{title:'Lab Playground · HardwareMate'}]}),component:LabPreview});
