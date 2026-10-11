import { MigrationInterface,QueryRunner,Table,TableForeignKey,TableIndex } from 'typeorm';
export class Mangas1791530000000 implements MigrationInterface {
 async up(q:QueryRunner){
  const s=(name:string,length='36',isNullable=false)=>({name,type:'varchar',length,isNullable}),i=(name:string)=>({name,type:'integer'}),d=(name:string)=>({name,type:'double'}),t=(name:string)=>({name,type:'text'}),id={...s('id'),isPrimary:true},pk=(name:string)=>({...s(name),isPrimary:true});
  const tables:Record<string,any[]>={
   mangas:[id,s('ownerId'),s('title','160'),t('description'),s('category','12'),t('links'),s('coverId','36',true),i('revision'),d('createdAt'),d('updatedAt')],
   manga_volumes:[id,s('mangaId'),s('title','120'),i('position')],
   manga_chapters:[id,s('mangaId'),s('volumeId','36',true),s('title','120'),i('position'),s('kind','8'),t('assets'),t('links'),d('updatedAt')],
   manga_assets:[id,s('mangaId'),s('kind','8'),s('filename','255'),d('bytes'),i('pages'),i('width'),i('height'),d('createdAt')],
   manga_preferences:[pk('mangaId'),pk('userId'),s('status','12')],
   manga_progress:[pk('chapterId'),pk('userId'),s('mangaId'),s('assetId','36',true),i('page'),d('offset'),d('updatedAt')],
   manga_notes:[id,s('userId'),s('mangaId','36',true),s('title','120'),t('body'),i('revision'),d('updatedAt')]
  };
  for(const [name,columns]of Object.entries(tables))if(!await q.hasTable(name))await q.createTable(new Table({name,columns}));
  const fks=[['mangas','ownerId','users','CASCADE'],...['manga_volumes','manga_chapters','manga_assets','manga_preferences','manga_progress','manga_notes'].map(t=>[t,'mangaId','mangas','CASCADE']),...['manga_preferences','manga_progress','manga_notes'].map(t=>[t,'userId','users','CASCADE']),['manga_progress','chapterId','manga_chapters','CASCADE'],['manga_chapters','volumeId','manga_volumes','SET NULL']];
  for(const [table,col,target,onDelete]of fks)if(!(await q.getTable(table))!.foreignKeys.some(f=>f.columnNames.includes(col)))await q.createForeignKey(table,new TableForeignKey({columnNames:[col],referencedTableName:target,referencedColumnNames:['id'],onDelete}));
  for(const [table,name,cols]of [['manga_chapters','ix_manga_chapter_order',['mangaId','position']],['manga_assets','ix_manga_asset_age',['createdAt']],['manga_progress','ix_manga_progress_user',['userId','updatedAt']],['manga_notes','ix_manga_note_user',['userId','mangaId']]] as [string,string,string[]][])if(!(await q.getTable(table))!.indices.some(i=>i.name===name))await q.createIndex(table,new TableIndex({name,columnNames:cols}));
 }
 async down(){throw new Error('No se borran mangas automáticamente. Desactiva la bandera o vuelve al código anterior conservando las tablas.');}
}
