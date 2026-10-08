import { Entity,PrimaryColumn,Column,Index } from 'typeorm';
@Entity('calendar_events') @Index('ix_event_owner_start',['ownerId','startsAt'])
export class CalendarEvent {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:120}) title!:string;
  @Column('text') notes!:string;
  @Column('varchar',{length:200}) location!:string;
  @Column('double') startsAt!:number;
  @Column('double') endsAt!:number;
  @Column('varchar',{length:12,default:'none'}) recurrence!:string;
  @Column('double',{nullable:true}) recurrenceUntil!:number|null;
  @Column('integer',{nullable:true}) alertMinutes!:number|null;
  @Column('boolean',{default:false}) email!:boolean;
  @Index('ix_event_next_alert') @Column('double',{nullable:true}) nextAlertAt!:number|null;
  @Column('double',{nullable:true}) alertOccurrenceAt!:number|null;
  @Column('double') createdAt!:number;
  @Column('double') updatedAt!:number;
}
@Entity('reminders') @Index('ix_reminder_target_date',['targetId','remindAt'])
export class Reminder {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:36}) targetId!:string;
  @Column('varchar',{length:120}) title!:string;
  @Column('text') notes!:string;
  @Column('double') remindAt!:number;
  @Column('boolean',{default:false}) email!:boolean;
  @Column('double',{nullable:true}) deliveredAt!:number|null;
  @Column('double',{nullable:true}) completedAt!:number|null;
  @Column('double') createdAt!:number;
}
@Entity('mail_jobs') @Index('ix_mail_due',['status','nextAttemptAt'])
export class MailJob {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) userId!:string;
  @Column('varchar',{length:36}) resourceId!:string;
  @Column('varchar',{length:16}) kind!:string;
  @Column('varchar',{length:200}) subject!:string;
  @Column('text') body!:string;
  @Column('varchar',{length:12,default:'pending'}) status!:string;
  @Column('integer',{default:0}) attempts!:number;
  @Column('double') nextAttemptAt!:number;
  @Column('double',{nullable:true}) lockedUntil!:number|null;
  @Column('varchar',{length:36,nullable:true}) leaseToken!:string|null;
  @Column('double') createdAt!:number;
}
