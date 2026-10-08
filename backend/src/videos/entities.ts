import { Entity,PrimaryColumn,Column,Index } from 'typeorm';
@Entity('video_catalog')
export class VideoCatalog { @PrimaryColumn('integer') id!:number; @Column('integer') revision!:number; }
@Entity('video_folders')
export class VideoFolder {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:120}) name!:string;
  @Column('text') description!:string;
  @Column('varchar',{length:36,nullable:true}) coverId!:string|null;
  @Column('integer') position!:number;
  @Column('double') createdAt!:number;
  @Column('double') updatedAt!:number;
}
@Entity('videos') @Index('ix_video_folder_position',['folderId','position'])
export class Video {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36,nullable:true}) folderId!:string|null;
  @Column('varchar',{length:120}) title!:string;
  @Column('text') description!:string;
  @Column('varchar',{length:36,nullable:true}) thumbnailId!:string|null;
  @Column('integer') position!:number;
  @Column('double') duration!:number;
  @Column('double') bytes!:number;
  @Column('varchar',{length:64,unique:true}) sha256!:string;
  @Column('double') createdAt!:number;
  @Column('double') updatedAt!:number;
}
@Entity('video_progress')
export class VideoProgress {
  @PrimaryColumn('varchar',{length:36}) videoId!:string;
  @PrimaryColumn('varchar',{length:36}) userId!:string;
  @Column('double') seconds!:number;
  @Column('double') percent!:number;
  @Column('boolean') completed!:boolean;
  @Column('double') updatedAt!:number;
}
@Entity('video_favorites')
export class VideoFavorite {
  @PrimaryColumn('varchar',{length:36}) videoId!:string;
  @PrimaryColumn('varchar',{length:36}) userId!:string;
  @Column('double') createdAt!:number;
}
@Entity('video_uploads')
export class VideoUpload {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) userId!:string;
  @Column('varchar',{length:36,nullable:true}) folderId!:string|null;
  @Column('varchar',{length:120}) title!:string;
  @Column('text') description!:string;
  @Column('varchar',{length:255}) filename!:string;
  @Column('double') lastModified!:number;
  @Column('varchar',{length:64}) fingerprint!:string;
  @Column('double') bytes!:number;
  @Column('double') received!:number;
  @Column('double') updatedAt!:number;
}
