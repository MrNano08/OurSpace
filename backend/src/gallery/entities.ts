import { Entity,PrimaryColumn,Column,Index } from 'typeorm';
@Entity('photos')
@Index('ix_photo_page',['deletedAt','createdAt','id'])
@Index('ix_photo_release',['announced','deletedAt','unlockAt'])
export class Photo {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:36}) targetId!:string;
  @Column('text') description!:string;
  @Column('varchar',{length:200}) location!:string;
  @Column('varchar',{length:80}) album!:string;
  @Index('ix_photo_album') @Column('varchar',{length:36,nullable:true}) albumId!:string|null;
  @Column('simple-json') tags!:string[];
  @Column('varchar',{length:19,nullable:true}) capturedAt!:string|null;
  @Column('varchar',{length:6,nullable:true}) captureOffset!:string|null;
  @Column('varchar',{length:12}) dateSource!:string;
  @Column('varchar',{length:19,nullable:true}) exifCapturedAt!:string|null;
  @Column('varchar',{length:6,nullable:true}) exifOffset!:string|null;
  @Column('varchar',{length:12}) format!:string;
  @Column('integer') width!:number;
  @Column('integer') height!:number;
  @Column('double') bytes!:number;
  @Column('varchar',{length:250,nullable:true}) passwordHash!:string|null;
  @Column('double',{nullable:true}) unlockAt!:number|null;
  @Column('boolean',{default:false}) announced!:boolean;
  @Column('double',{nullable:true}) deletedAt!:number|null;
  @Column('double') createdAt!:number;
}
@Entity('photo_access')
export class PhotoAccess {
  @PrimaryColumn('varchar',{length:36}) photoId!:string;
  @PrimaryColumn('varchar',{length:36}) userId!:string;
  @Column('boolean',{default:false}) unlocked!:boolean;
  @Column('integer',{default:0}) attempts!:number;
  @Column('double',{default:0}) lockedUntil!:number;
}
