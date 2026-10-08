import { Entity,PrimaryColumn,Column,Index } from 'typeorm';
@Entity('albums') @Index('ux_album_owner_name',['ownerId','name'],{unique:true})
export class Album {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:80}) name!:string;
  @Column('double') createdAt!:number;
}
@Entity('photo_favorites')
export class PhotoFavorite {
  @PrimaryColumn('varchar',{length:36}) photoId!:string;
  @PrimaryColumn('varchar',{length:36}) userId!:string;
  @Column('double') createdAt!:number;
}
@Entity('daily_memories')
export class DailyMemory {
  @PrimaryColumn('varchar',{length:10}) day!:string;
  @Column('varchar',{length:36,nullable:true}) photoId!:string|null;
}
@Entity('private_assets')
export class PrivateAsset {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:36}) targetId!:string;
  @Column('varchar',{length:10}) kind!:string;
  @Column('double',{nullable:true}) deletedAt!:number|null;
  @Column('double') createdAt!:number;
}
@Entity('wishes') @Index('ix_wish_list',['kind','completed','createdAt'])
export class Wish {
  @PrimaryColumn('varchar',{length:36}) id!:string;
  @Column('varchar',{length:36}) ownerId!:string;
  @Column('varchar',{length:36}) targetId!:string;
  @Column('varchar',{length:12}) kind!:string;
  @Column('varchar',{length:120}) title!:string;
  @Column('text') notes!:string;
  @Column('varchar',{length:2000}) url!:string;
  @Column('double',{nullable:true}) priceCents!:number|null;
  @Column('varchar',{length:3}) currency!:string;
  @Column('boolean',{default:false}) completed!:boolean;
  @Column('integer',{default:1}) revision!:number;
  @Column('varchar',{length:36,nullable:true}) assetId!:string|null;
  @Column('double') createdAt!:number;
  @Column('double') updatedAt!:number;
}
