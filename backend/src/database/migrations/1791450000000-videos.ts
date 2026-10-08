import { MigrationInterface,QueryRunner,Table,TableForeignKey,TableIndex } from 'typeorm';
export class Videos1791450000000 implements MigrationInterface {
  async up(q:QueryRunner){
    const id={name:'id',type:'varchar',length:'36',isPrimary:true};
    const str=(name:string,length='36',isNullable=false)=>({name,type:'varchar',length,isNullable});
    const num=(name:string)=>({name,type:'double'});
    const tables:Record<string,any[]>={
      video_catalog:[{name:'id',type:'integer',isPrimary:true},{name:'revision',type:'integer'}],
      video_folders:[id,str('name','120'),{name:'description',type:'text'},str('coverId','36',true),{name:'position',type:'integer'},num('createdAt'),num('updatedAt')],
      videos:[id,str('folderId','36',true),str('title','120'),{name:'description',type:'text'},str('thumbnailId','36',true),{name:'position',type:'integer'},num('duration'),num('bytes'),str('sha256','64'),num('createdAt'),num('updatedAt')],
      video_progress:[{...str('videoId'),isPrimary:true},{...str('userId'),isPrimary:true},num('seconds'),num('percent'),{name:'completed',type:'boolean'},num('updatedAt')],
      video_favorites:[{...str('videoId'),isPrimary:true},{...str('userId'),isPrimary:true},num('createdAt')],
      video_uploads:[id,str('userId'),str('folderId','36',true),str('title','120'),{name:'description',type:'text'},str('filename','255'),num('lastModified'),str('fingerprint','64'),num('bytes'),num('received'),num('updatedAt')]
    };
    for(const [name,columns] of Object.entries(tables))if(!await q.hasTable(name))await q.createTable(new Table({name,columns}));
    for(const [table,col,target,action] of [
      ['videos','folderId','video_folders','SET NULL'],['video_uploads','folderId','video_folders','SET NULL'],['video_uploads','userId','users','CASCADE'],
      ['video_progress','videoId','videos','CASCADE'],['video_progress','userId','users','CASCADE'],['video_favorites','videoId','videos','CASCADE'],['video_favorites','userId','users','CASCADE']
    ]){const t=await q.getTable(table);if(!t!.foreignKeys.some(f=>f.columnNames.includes(col)))await q.createForeignKey(table,new TableForeignKey({columnNames:[col],referencedTableName:target,referencedColumnNames:['id'],onDelete:action}));}
    for(const [table,name,columns,unique] of [['videos','ix_video_folder_position',['folderId','position'],false],['videos','uq_video_sha256',['sha256'],true],['video_uploads','ix_video_upload_time',['updatedAt'],false]] as [string,string,string[],boolean][]){
      if(!(await q.getTable(table))!.indices.some(i=>i.name===name))await q.createIndex(table,new TableIndex({name,columnNames:columns,isUnique:unique}));
    }
    if(!(await q.query('SELECT id FROM video_catalog WHERE id = 1')).length)await q.manager.insert('video_catalog',{id:1,revision:1});
  }
  async down(q:QueryRunner){for(const table of ['video_favorites','video_progress','video_uploads','videos','video_folders','video_catalog'])if(await q.hasTable(table))await q.dropTable(table,true,true,true);}
}
