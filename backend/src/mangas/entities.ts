import { Entity,Column,PrimaryColumn } from 'typeorm';
@Entity('mangas')
export class Manga {
 @PrimaryColumn('varchar',{length:36}) id!:string;
 @Column('varchar',{length:36}) ownerId!:string;
 @Column('varchar',{length:160}) title!:string;
 @Column('text') description!:string;
 @Column('varchar',{length:12}) category!:string;
 @Column('text') links!:string;
 @Column('varchar',{length:36,nullable:true}) coverId!:string|null;
 @Column('integer') revision!:number;
 @Column('double') createdAt!:number;
 @Column('double') updatedAt!:number;
}
@Entity('manga_volumes')
export class MangaVolume {
 @PrimaryColumn('varchar',{length:36}) id!:string;
 @Column('varchar',{length:36}) mangaId!:string;
 @Column('varchar',{length:120}) title!:string;
 @Column('integer') position!:number;
}
@Entity('manga_chapters')
export class MangaChapter {
 @PrimaryColumn('varchar',{length:36}) id!:string;
 @Column('varchar',{length:36}) mangaId!:string;
 @Column('varchar',{length:36,nullable:true}) volumeId!:string|null;
 @Column('varchar',{length:120}) title!:string;
 @Column('integer') position!:number;
 @Column('varchar',{length:8}) kind!:string;
 @Column('text') assets!:string;
 @Column('text') links!:string;
 @Column('double') updatedAt!:number;
}
@Entity('manga_assets')
export class MangaAsset {
 @PrimaryColumn('varchar',{length:36}) id!:string;
 @Column('varchar',{length:36}) mangaId!:string;
 @Column('varchar',{length:8}) kind!:string;
 @Column('varchar',{length:255}) filename!:string;
 @Column('double') bytes!:number;
 @Column('integer') pages!:number;
 @Column('integer') width!:number;
 @Column('integer') height!:number;
 @Column('double') createdAt!:number;
}
@Entity('manga_preferences')
export class MangaPreference {
 @PrimaryColumn('varchar',{length:36}) mangaId!:string;
 @PrimaryColumn('varchar',{length:36}) userId!:string;
 @Column('varchar',{length:12}) status!:string;
}
@Entity('manga_progress')
export class MangaProgress {
 @PrimaryColumn('varchar',{length:36}) chapterId!:string;
 @PrimaryColumn('varchar',{length:36}) userId!:string;
 @Column('varchar',{length:36}) mangaId!:string;
 @Column('varchar',{length:36,nullable:true}) assetId!:string|null;
 @Column('integer') page!:number;
 @Column('double') offset!:number;
 @Column('double') updatedAt!:number;
}
@Entity('manga_notes')
export class MangaNote {
 @PrimaryColumn('varchar',{length:36}) id!:string;
 @Column('varchar',{length:36}) userId!:string;
 @Column('varchar',{length:36,nullable:true}) mangaId!:string|null;
 @Column('varchar',{length:120}) title!:string;
 @Column('text') body!:string;
 @Column('integer') revision!:number;
 @Column('double') updatedAt!:number;
}
