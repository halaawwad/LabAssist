import {config} from 'dotenv';
import {resolve} from 'node:path';
// Works from both src/ and dist/; shell-provided test variables take precedence.
config({path:resolve(__dirname,'../../../.env'),quiet:true});
