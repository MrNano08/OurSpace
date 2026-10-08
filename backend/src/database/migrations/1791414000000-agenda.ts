import { MigrationInterface,QueryRunner,Table,TableColumn,TableForeignKey,TableIndex } from 'typeorm';
export class Agenda1791414000000 implements MigrationInterface {
  async up(q:QueryRunner):Promise<void>{
    // Idempotent guards let operators resume after MariaDB auto-committed DDL.
    const taskColumns=[
      {name:'recurrence',type:'varchar',length:'12',default:"'none'"},
      {name:'recurrenceUntil',type:'double',isNullable:true},
      {name:'recurrenceAnchor',type:'double',isNullable:true},
      {name:'nextTaskId',type:'varchar',length:'36',isNullable:true},
      {name:'email',type:'boolean',default:false}
    ];
    for(const c of taskColumns)if(!await q.hasColumn('tasks',c.name))await q.addColumn('tasks',new TableColumn(c));
    if(!await q.hasTable('calendar_events'))await q.createTable(new Table({name:'calendar_events',columns:[
      {name:'id',type:'varchar',length:'36',isPrimary:true},{name:'ownerId',type:'varchar',length:'36'},
      {name:'title',type:'varchar',length:'120'},{name:'notes',type:'text'},{name:'location',type:'varchar',length:'200'},
      {name:'startsAt',type:'double'},{name:'endsAt',type:'double'},{name:'recurrence',type:'varchar',length:'12',default:"'none'"},
      {name:'recurrenceUntil',type:'double',isNullable:true},{name:'alertMinutes',type:'integer',isNullable:true},{name:'email',type:'boolean',default:false},
      {name:'nextAlertAt',type:'double',isNullable:true},{name:'alertOccurrenceAt',type:'double',isNullable:true},{name:'createdAt',type:'double'},{name:'updatedAt',type:'double'}
    ]}));
    if(!await q.hasTable('reminders'))await q.createTable(new Table({name:'reminders',columns:[
      {name:'id',type:'varchar',length:'36',isPrimary:true},{name:'ownerId',type:'varchar',length:'36'},{name:'targetId',type:'varchar',length:'36'},
      {name:'title',type:'varchar',length:'120'},{name:'notes',type:'text'},{name:'remindAt',type:'double'},{name:'email',type:'boolean',default:false},
      {name:'deliveredAt',type:'double',isNullable:true},{name:'completedAt',type:'double',isNullable:true},{name:'createdAt',type:'double'}
    ]}));
    if(!await q.hasTable('mail_jobs'))await q.createTable(new Table({name:'mail_jobs',columns:[
      {name:'id',type:'varchar',length:'36',isPrimary:true},{name:'userId',type:'varchar',length:'36'},{name:'resourceId',type:'varchar',length:'36'},
      {name:'kind',type:'varchar',length:'16'},{name:'subject',type:'varchar',length:'200'},{name:'body',type:'text'},
      {name:'status',type:'varchar',length:'12',default:"'pending'"},{name:'attempts',type:'integer',default:0},
      {name:'nextAttemptAt',type:'double'},{name:'lockedUntil',type:'double',isNullable:true},{name:'leaseToken',type:'varchar',length:'36',isNullable:true},{name:'createdAt',type:'double'}
    ]}));
    for(const [table,column] of [['calendar_events','ownerId'],['reminders','ownerId'],['reminders','targetId'],['mail_jobs','userId']]){
      const t=await q.getTable(table);if(!t!.foreignKeys.some(f=>f.columnNames.includes(column)))await q.createForeignKey(table,new TableForeignKey({columnNames:[column],referencedTableName:'users',referencedColumnNames:['id'],onDelete:'CASCADE'}));
    }
    const indices:[string,string,string[]][]=[['calendar_events','ix_event_owner_start',['ownerId','startsAt']],['calendar_events','ix_event_next_alert',['nextAlertAt']],['reminders','ix_reminder_target_date',['targetId','remindAt']],['mail_jobs','ix_mail_due',['status','nextAttemptAt']]];
    for(const [table,name,columnNames] of indices){const t=await q.getTable(table);if(!t!.indices.some(i=>i.name===name))await q.createIndex(table,new TableIndex({name,columnNames}));}
  }
  async down(q:QueryRunner):Promise<void>{
    for(const table of ['mail_jobs','reminders','calendar_events'])if(await q.hasTable(table))await q.dropTable(table,true,true,true);
    for(const name of ['recurrence','recurrenceUntil','recurrenceAnchor','nextTaskId','email'])if(await q.hasColumn('tasks',name))await q.dropColumn('tasks',name);
  }
}
