import { Entity,PrimaryColumn,Column,Index } from 'typeorm';

@Entity('messages')
@Index('ix_message_due',['releasedAt','deliverAt'])
@Index('ix_message_owner',['ownerId','deliverAt'])
@Index('ix_message_target',['targetId','deliverAt'])
export class Message {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:36}) targetId!:string;
  @Column('text') body!:string;
  @Column('double') deliverAt!:number;
  @Column('double',{nullable:true}) releasedAt!:number|null;
  @Column('boolean',{default:false}) ownerHidden!:boolean;
  @Column('boolean',{default:false}) targetHidden!:boolean;
  @Column('double') createdAt!:number;
}

export const petitionStatuses=['pending','accepted','rejected','chance','maybe'] as const;
export type PetitionStatus=typeof petitionStatuses[number];
export const petitionLabels:Record<PetitionStatus,string>={pending:'Pendiente',accepted:'Aceptada',rejected:'Rechazada',chance:'Dame un chance',maybe:'Tal vez'};

@Entity('petitions')
@Index('ix_petition_owner',['ownerId','createdAt'])
@Index('ix_petition_target',['targetId','createdAt'])
export class Petition {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:36}) targetId!:string;
  @Column('varchar',{length:120}) title!:string;
  @Column('text') details!:string;
  @Column('varchar',{length:12,default:'pending'}) status!:PetitionStatus;
  @Column('text') responseNote!:string;
  @Column('double') createdAt!:number;
  @Column('double') updatedAt!:number;
}
