import { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Notification } from '../database/entities';
import { MailJob } from './entities';
export async function createAlert(em:EntityManager,userId:string,kind:string,resourceId:string,text:string,email:boolean,body=text){
  await em.save(Notification,{id:randomUUID(),userId,kind,resourceId,text:text.slice(0,180),dismissed:false,createdAt:Date.now()});
  if(email)await em.save(MailJob,{id:randomUUID(),userId,resourceId,kind,subject:text.slice(0,180),body,status:'pending',attempts:0,nextAttemptAt:Date.now(),lockedUntil:null,leaseToken:null,createdAt:Date.now()});
}
