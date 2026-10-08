import { MigrationInterface,QueryRunner,Table,TableForeignKey,TableIndex } from 'typeorm';
export class Gallery1791430000000 implements MigrationInterface {
  async up(q:QueryRunner):Promise<void>{
    if(!await q.hasTable('photos'))await q.createTable(new Table({name:'photos',columns:[
      {name:'id',type:'varchar',length:'36',isPrimary:true},{name:'ownerId',type:'varchar',length:'36'},{name:'targetId',type:'varchar',length:'36'},
      {name:'description',type:'text'},{name:'location',type:'varchar',length:'200'},{name:'album',type:'varchar',length:'80'},{name:'tags',type:'text'},
      {name:'capturedAt',type:'varchar',length:'19',isNullable:true},{name:'captureOffset',type:'varchar',length:'6',isNullable:true},{name:'dateSource',type:'varchar',length:'12'},
      {name:'exifCapturedAt',type:'varchar',length:'19',isNullable:true},{name:'exifOffset',type:'varchar',length:'6',isNullable:true},
      {name:'format',type:'varchar',length:'12'},{name:'width',type:'integer'},{name:'height',type:'integer'},{name:'bytes',type:'double'},
      {name:'passwordHash',type:'varchar',length:'250',isNullable:true},{name:'unlockAt',type:'double',isNullable:true},{name:'announced',type:'boolean',default:false},
      {name:'deletedAt',type:'double',isNullable:true},{name:'createdAt',type:'double'}
    ]}));
    if(!await q.hasTable('photo_access'))await q.createTable(new Table({name:'photo_access',columns:[
      {name:'photoId',type:'varchar',length:'36',isPrimary:true},{name:'userId',type:'varchar',length:'36',isPrimary:true},
      {name:'unlocked',type:'boolean',default:false},{name:'attempts',type:'integer',default:0},{name:'lockedUntil',type:'double',default:0}
    ]}));
    const fks:[string,string,string][]=[['photos','ownerId','users'],['photos','targetId','users'],['photo_access','photoId','photos'],['photo_access','userId','users']];
    for(const [table,col,target] of fks){const t=await q.getTable(table);if(!t!.foreignKeys.some(f=>f.columnNames.includes(col)))await q.createForeignKey(table,new TableForeignKey({columnNames:[col],referencedTableName:target,referencedColumnNames:['id'],onDelete:'CASCADE'}));}
    const indices:[string,string,string[]][]=[['photos','ix_photo_page',['deletedAt','createdAt','id']],['photos','ix_photo_release',['announced','deletedAt','unlockAt']]];
    for(const [table,name,columnNames] of indices){const t=await q.getTable(table);if(!t!.indices.some(i=>i.name===name))await q.createIndex(table,new TableIndex({name,columnNames}));}
  }
  async down(q:QueryRunner):Promise<void>{
    await q.query("DELETE FROM notifications WHERE kind = 'photo'");
    for(const t of ['photo_access','photos'])if(await q.hasTable(t))await q.dropTable(t,true,true,true);
    // File storage must be restored/cleaned separately; never silently delete originals on rollback.
  }
}
