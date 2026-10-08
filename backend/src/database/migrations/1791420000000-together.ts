import { MigrationInterface,QueryRunner,Table,TableForeignKey,TableIndex } from 'typeorm';

export class Together1791420000000 implements MigrationInterface {
  async up(q:QueryRunner):Promise<void>{
    // Resume safely if MariaDB committed some DDL before an interrupted migration.
    if(!await q.hasTable('messages'))await q.createTable(new Table({name:'messages',columns:[
      {name:'id',type:'varchar',length:'36',isPrimary:true},
      {name:'ownerId',type:'varchar',length:'36'},{name:'targetId',type:'varchar',length:'36'},
      {name:'body',type:'text'},{name:'deliverAt',type:'double'},{name:'releasedAt',type:'double',isNullable:true},
      {name:'ownerHidden',type:'boolean',default:false},{name:'targetHidden',type:'boolean',default:false},{name:'createdAt',type:'double'}
    ]}));
    if(!await q.hasTable('petitions'))await q.createTable(new Table({name:'petitions',columns:[
      {name:'id',type:'varchar',length:'36',isPrimary:true},
      {name:'ownerId',type:'varchar',length:'36'},{name:'targetId',type:'varchar',length:'36'},
      {name:'title',type:'varchar',length:'120'},{name:'details',type:'text'},
      {name:'status',type:'varchar',length:'12',default:"'pending'"},{name:'responseNote',type:'text'},
      {name:'createdAt',type:'double'},{name:'updatedAt',type:'double'}
    ]}));
    for(const table of ['messages','petitions'])for(const column of ['ownerId','targetId']){
      const t=await q.getTable(table);
      if(!t!.foreignKeys.some(f=>f.columnNames.includes(column)))await q.createForeignKey(table,new TableForeignKey({columnNames:[column],referencedTableName:'users',referencedColumnNames:['id'],onDelete:'CASCADE'}));
    }
    const indexes:[string,string,string[]][]=[
      ['messages','ix_message_due',['releasedAt','deliverAt']],['messages','ix_message_owner',['ownerId','deliverAt']],['messages','ix_message_target',['targetId','deliverAt']],
      ['petitions','ix_petition_owner',['ownerId','createdAt']],['petitions','ix_petition_target',['targetId','createdAt']]
    ];
    for(const [table,name,columnNames] of indexes){const t=await q.getTable(table);if(!t!.indices.some(i=>i.name===name))await q.createIndex(table,new TableIndex({name,columnNames}));}
  }
  async down(q:QueryRunner):Promise<void>{
    await q.query("DELETE FROM notifications WHERE kind IN ('message','petition')");
    for(const table of ['petitions','messages'])if(await q.hasTable(table))await q.dropTable(table,true,true,true);
  }
}
