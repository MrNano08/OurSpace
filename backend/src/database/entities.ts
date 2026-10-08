import { VideoCatalog,VideoFolder,Video,VideoProgress,VideoFavorite,VideoUpload } from '../videos/entities';
import { Entity,PrimaryColumn,Column,Index } from 'typeorm';
import { CalendarEvent,Reminder,MailJob } from '../agenda/entities';
import { Photo,PhotoAccess } from '../gallery/entities';
import { Album,PhotoFavorite,DailyMemory,PrivateAsset,Wish } from '../plans/entities';
import { Message,Petition } from '../together/entities';

@Entity('users')
export class User {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:16,unique:true}) slug!:string;
  @Column('varchar',{length:50}) name!:string;
  @Column('varchar',{length:254,unique:true}) email!:string;
  @Column('varchar',{length:36,nullable:true}) avatarId!:string|null;
  @Column('varchar',{length:250}) passwordHash!:string;
  @Column('boolean',{default:true}) mustChangePassword!:boolean;
  @Column('varchar',{length:16,default:'rose'}) accent!:string;
  @Column('integer',{default:0}) failedLogins!:number;
  @Column('double',{default:0}) lockedUntil!:number;
  @Column('double') createdAt!:number;
}
@Entity('sessions')
export class Session {
  @PrimaryColumn('varchar',{length:64}) tokenHash!:string;
  @Index() @Column('varchar',{length:36}) userId!:string;
  @Index() @Column('double') expiresAt!:number;
}
@Entity('password_resets')
export class PasswordReset {
  @PrimaryColumn('varchar',{length:36}) userId!:string;
  @Column('varchar',{length:64}) codeHash!:string;
  @Column('double') expiresAt!:number;
  @Column('integer',{default:0}) attempts!:number;
  @Column('double') createdAt!:number;
}
@Entity('auth_throttles')
export class AuthThrottle {
  @PrimaryColumn('varchar',{length:100}) key!:string;
  @Column('integer') count!:number;
  @Column('double') expiresAt!:number;
}
@Entity('tasks') @Index('ix_tasks_owner_due',['ownerId','completed','dueAt'])
export class Task {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:120}) title!:string;
  @Column('text') notes!:string;
  @Column('integer') priority!:number;
  @Column('double',{nullable:true}) dueAt!:number|null;
  @Column('boolean',{default:false}) completed!:boolean;
  @Column('boolean',{default:false}) dueNotified!:boolean;
  @Column('varchar',{length:12,default:'none'}) recurrence!:string;
  @Column('double',{nullable:true}) recurrenceUntil!:number|null;
  @Column('double',{nullable:true}) recurrenceAnchor!:number|null;
  @Column('varchar',{length:36,nullable:true}) nextTaskId!:string|null;
  @Column('boolean',{default:false}) email!:boolean;
  @Column('double') createdAt!:number;
  @Column('double') updatedAt!:number;
}
@Entity('counters')
export class Counter {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Index() @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:36}) targetId!:string;
  @Column('varchar',{length:80}) label!:string;
  @Column('varchar',{length:16}) emoji!:string;
  @Column('integer',{default:0}) value!:number;
  @Column('double') createdAt!:number;
}
@Entity('counter_changes') @Index('ix_change_counter_time',['counterId','createdAt'])
export class CounterChange {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) counterId!:string;
  @Column('varchar',{length:36}) actorId!:string;
  @Column('integer') delta!:number;
  @Column('integer') valueAfter!:number;
  @Column('double') createdAt!:number;
}
@Entity('notifications') @Index('ix_notification_user_time',['userId','createdAt'])
export class Notification {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) userId!:string;
  @Column('varchar',{length:180}) text!:string;
  @Column('varchar',{length:16}) kind!:string;
  @Column('varchar',{length:36,nullable:true}) resourceId!:string|null;
  @Column('boolean',{default:false}) dismissed!:boolean;
  @Column('double') createdAt!:number;
}
export const entities=[VideoCatalog,VideoFolder,Video,VideoProgress,VideoFavorite,VideoUpload,User,Session,PasswordReset,AuthThrottle,Task,Counter,CounterChange,Notification,CalendarEvent,Reminder,MailJob,Message,Petition,Photo,PhotoAccess,Album,PhotoFavorite,DailyMemory,PrivateAsset,Wish];
