import { MigrationInterface,QueryRunner,Table,TableColumn,TableForeignKey,TableIndex } from 'typeorm';
import { randomUUID } from 'node:crypto';
export class Finishing1791440000000 implements MigrationInterface {
  async up(q:QueryRunner):Promise<void>{
    const id={name:'id',type:'varchar',length:'36',isPrimary:true};
    const member=(name:string)=>({name,type:'varchar',length:'36'});
    const tables=new Map<string,any[]>([
      ['albums',[id,member('ownerId'),{name:'name',type:'varchar',length:'80'},{name:'createdAt',type:'double'}]],
      ['photo_favorites',[{...member('photoId'),isPrimary:true},{...member('userId'),isPrimary:true},{name:'createdAt',type:'double'}]],
      ['daily_memories',[{name:'day',type:'varchar',length:'10',isPrimary:true},{...member('photoId'),isNullable:true}]],
      ['private_assets',[id,member('ownerId'),member('targetId'),{name:'kind',type:'varchar',length:'10'},{name:'deletedAt',type:'double',isNullable:true},{name:'createdAt',type:'double'}]],
      ['wishes',[id,member('ownerId'),member('targetId'),{name:'kind',type:'varchar',length:'12'},{name:'title',type:'varchar',length:'120'},
        {name:'notes',type:'text'},{name:'url',type:'varchar',length:'2000'},{name:'priceCents',type:'double',isNullable:true},{name:'currency',type:'varchar',length:'3'},
        {name:'completed',type:'boolean',default:false},{name:'revision',type:'integer',default:1},{...member('assetId'),isNullable:true},{name:'createdAt',type:'double'},{name:'updatedAt',type:'double'}]]
    ]);
    for(const [name,columns] of tables)if(!await q.hasTable(name))await q.createTable(new Table({name,columns}));
    for(const [table,column] of [['users','avatarId'],['photos','albumId']])if(!await q.hasColumn(table,column))await q.addColumn(table,new TableColumn({...member(column),isNullable:true}));
    // Backfill legacy album labels without deleting or modifying photo contents.
    const legacy=await q.query("SELECT DISTINCT ownerId,album FROM photos WHERE album <> '' AND albumId IS NULL");
    for(const row of legacy){
      const existing=await q.query('SELECT id FROM albums WHERE ownerId = ? AND name = ?',[row.ownerId,row.album]);
      const albumId=existing[0]?.id||randomUUID();
      if(!existing.length)await q.query('INSERT INTO albums (id,ownerId,name,createdAt) VALUES (?,?,?,?)',[albumId,row.ownerId,row.album,Date.now()]);
      await q.query('UPDATE photos SET albumId = ? WHERE ownerId = ? AND album = ? AND albumId IS NULL',[albumId,row.ownerId,row.album]);
    }
    const refs:[string,string,string,string][]=[['albums','ownerId','users','CASCADE'],['photo_favorites','photoId','photos','CASCADE'],['photo_favorites','userId','users','CASCADE'],['daily_memories','photoId','photos','SET NULL'],['private_assets','ownerId','users','CASCADE'],['private_assets','targetId','users','CASCADE'],['wishes','ownerId','users','CASCADE'],['wishes','targetId','users','CASCADE'],['wishes','assetId','private_assets','SET NULL'],['users','avatarId','private_assets','SET NULL'],['photos','albumId','albums','SET NULL']];
    for(const [table,column,target,onDelete] of refs){const t=await q.getTable(table);if(!t!.foreignKeys.some(f=>f.columnNames.includes(column)))await q.createForeignKey(table,new TableForeignKey({columnNames:[column],referencedTableName:target,referencedColumnNames:['id'],onDelete}));}
    const indices:[string,string,string[],boolean][]=[['albums','ux_album_owner_name',['ownerId','name'],true],['wishes','ix_wish_list',['kind','completed','createdAt'],false],['photos','ix_photo_album',['albumId'],false]];
    for(const [table,name,columnNames,isUnique] of indices){const t=await q.getTable(table);if(!t!.indices.some(i=>i.name===name))await q.createIndex(table,new TableIndex({name,columnNames,isUnique}));}
  }
  async down(q:QueryRunner):Promise<void>{
    await q.query("DELETE FROM notifications WHERE kind = 'wish'");
    for(const [table,column] of [['users','avatarId'],['photos','albumId']])if(await q.hasColumn(table,column)){const t=await q.getTable(table);for(const f of t!.foreignKeys.filter(f=>f.columnNames.includes(column)))await q.dropForeignKey(table,f);await q.dropColumn(table,column);}
    for(const table of ['wishes','photo_favorites','daily_memories','albums','private_assets'])if(await q.hasTable(table))await q.dropTable(table,true,true,true);
  }
}
